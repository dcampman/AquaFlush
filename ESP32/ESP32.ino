#include <EEPROM.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <Preferences.h>
#include <ArduinoJson.h>

Preferences preferences;

// GPIO pins assigned to each valve
const int valvePins[] = { 2, 4, 5, 16 };  // Define the pins here

// Variables to store the start time and duration for each valve
struct ValveState {
    int valveNum;
    String action;
    unsigned long duration;
    unsigned long startTime;
    bool active;
};

// Dynamically determine the number of valves based on the number of pins
#define NUM_VALVES (sizeof(valvePins) / sizeof(valvePins[0]))

// BLE UUIDs for service and characteristics
#define SERVICE_UUID "12345678-1234-5678-1234-56789abcdef0"
#define VALVE_CHARACTERISTIC_UUID "12345678-1234-5678-1234-56789abcdef1"   // Valve Control Characteristic
#define CONFIG_CHARACTERISTIC_UUID "22345678-1234-5678-1234-56789abcdef2"  // Configuration Characteristic
#define TIMER_CHARACTERISTIC_UUID "42345678-1234-5678-1234-56789abcdef4"   // Timer Update Characteristic
#define ALERT_CHARACTERISTIC_UUID "52345678-1234-5678-1234-56789abcdef5"   // Alert Characteristic

// BLE related variables
BLEServer *pServer = NULL;
BLECharacteristic *pValveCharacteristic = NULL;
BLECharacteristic *pConfigCharacteristic = NULL;
BLECharacteristic *pTimerCharacteristic = NULL;
BLECharacteristic *pAlertCharacteristic = NULL;
bool deviceConnected = false;         // Flag to indicate whether a device is connected
bool lastDeviceState = false;         // Last known device connection state  
bool sequenceRunning = false;         // Flag for running sequence mode
int currentValveIndex = -1;           // Index of the currently active valve in the sequence
unsigned long sequenceStartTime = 0;  // Time when the current sequence step started
ValveState valveSequence[NUM_VALVES]; // Array to store the valve sequence

// Function to initialize valve pins
void initValves() {
  for (int i = 0; i < NUM_VALVES; i++) {
    pinMode(valvePins[i], OUTPUT);
    digitalWrite(valvePins[i], LOW);  // Ensure all relays are off initially
  }
}

// BLE callbacks for connecting and disconnecting
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) {
    deviceConnected = true;
  };

  void onDisconnect(BLEServer *pServer) {
    deviceConnected = false;
  }
};

// BLE characteristic callbacks for Valve Control
class MyCharacteristicCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String command = pCharacteristic->getValue().c_str();
    Serial.println("Valve Command received: " + command);
    handleValveCommand(command);  // Process the command
  }
};

// Utility function to check if a string is a valid unsigned long integer
bool isValidNumber(const String &str) {
  for (unsigned int i = 0; i < str.length(); i++) {
    if (!isDigit(str[i]))
      return false;
  }
  return true;
}

// Function to handle BLE commands for configuration
void handleConfigCommand() {
  // Create a JSON document
  StaticJsonDocument<256> doc;

  // Add values to the JSON document
  doc["VALVES"] = NUM_VALVES;
  JsonArray pins = doc.createNestedArray("PINS");
  for (int i = 0; i < NUM_VALVES; i++) {
    pins.add(valvePins[i]);
  }

  // Serialize JSON document to a string
  String configData;
  serializeJson(doc, configData);

  // Set the characteristic value and notify
  pConfigCharacteristic->setValue(configData.c_str());
  pConfigCharacteristic->notify();
}

// Function to send timer updates to the app
void sendTimerUpdates() {
    StaticJsonDocument<256> doc;
    JsonObject timers = doc.createNestedObject("TIMERS");

    for (int i = 0; i < NUM_VALVES; i++) {
        if (valveSequence[i].duration > 0) {
            unsigned long remainingTime = (valveSequence[i].duration - (millis() - valveSequence[i].startTime));
            if (remainingTime > 0) {
                timers[String(valveSequence[i].valveNum)] = remainingTime / 1000;  // Remaining time in seconds
            }
        }
    }

    String timerUpdate;
    serializeJson(doc, timerUpdate);

    pTimerCharacteristic->setValue(timerUpdate.c_str());
    pTimerCharacteristic->notify();
}



// Function to send alerts to the app
void sendAlert(String alertMessage) {
  pAlertCharacteristic->setValue(alertMessage.c_str());
  pAlertCharacteristic->notify();
}

// Handle valve commands from JSON input
void handleValveCommand(String command) {
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, command);

    // Check if the JSON was parsed correctly
    if (error) {
        sendAlert("Invalid JSON format");
        return;
    }

    // Process the JSON array of valves
    JsonArray valveArray = doc.as<JsonArray>();

    // Update the current sequence based on the new JSON data
    for (JsonObject valveData : valveArray) {
        int valveNum = valveData["valve"].as<int>();
        String action = valveData["action"].as<String>();
        unsigned long durationInSeconds = valveData["duration"].as<unsigned long>();
        unsigned long duration = durationInSeconds * 1000;  // Convert to milliseconds

        if (valveNum > 0 && valveNum <= NUM_VALVES) {
            bool valveUpdated = false;

            // Update the existing sequence
            for (int i = 0; i < NUM_VALVES; i++) {
                if (valveSequence[i].valveNum == valveNum) {
                    valveSequence[i].action = action;
                    valveSequence[i].duration = duration;
                    
                    // If the action is "OFF", immediately turn off the valve
                    if (action == "OFF") {
                        digitalWrite(valvePins[valveNum - 1], LOW);
                        valveSequence[i].active = false;
                    } else {
                        // If the valve is already running and the new duration is less, adjust the timing
                        if (valveSequence[i].active && currentValveIndex == i) {
                            unsigned long elapsedTime = millis() - valveSequence[i].startTime;
                            if (elapsedTime > duration) {
                                // If the new duration is less than the time already elapsed, move to the next valve
                                digitalWrite(valvePins[valveNum - 1], LOW);
                                valveSequence[i].active = false;
                                currentValveIndex++;
                            } else {
                                valveSequence[i].duration = duration - elapsedTime;
                            }
                        } else {
                            valveSequence[i].startTime = millis();
                            valveSequence[i].active = true;
                        }
                    }

                    valveUpdated = true;
                    break;
                }
            }

            // If the valve is new to the sequence, add it
            if (!valveUpdated) {
                for (int i = 0; i < NUM_VALVES; i++) {
                    if (!valveSequence[i].active) {
                        valveSequence[i].valveNum = valveNum;
                        valveSequence[i].action = action;
                        valveSequence[i].duration = duration;
                        valveSequence[i].startTime = 0;
                        valveSequence[i].active = true;

                        if (action == "OFF") {
                            digitalWrite(valvePins[valveNum - 1], LOW);
                            valveSequence[i].active = false;
                        }

                        break;
                    }
                }
            }
        } else {
            sendAlert("Invalid valve number in command");
        }
    }

    // If the sequence is not running and we have valves to run, start the sequence
    if (!sequenceRunning && currentValveIndex < 0) {
        for (int i = 0; i < NUM_VALVES; i++) {
            if (valveSequence[i].active) {
                currentValveIndex = i;
                sequenceRunning = true;
                valveSequence[currentValveIndex].startTime = millis();
                if (valveSequence[currentValveIndex].action == "ON") {
                    digitalWrite(valvePins[valveSequence[currentValveIndex].valveNum - 1], HIGH);
                }
                break;
            }
        }
    }
}

// Setup function
void setup() {
  Serial.begin(115200);

  // Initialize NVS
  preferences.begin("wifi-config", false);

  // Read Wi-Fi credentials
  String ssid = preferences.getString("wifi_ssid", "default-SSID");
  String password = preferences.getString("wifi_password", "default-PASSWORD");

  // Connect to Wi-Fi
  WiFi.begin(ssid.c_str(), password.c_str());

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Connected to WiFi");

  preferences.end();

  // Set up OTA
  ArduinoOTA.begin();

  // Your existing setup code
  BLEDevice::init("AquaFlush");

  // Create BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create BLE Characteristics
  pValveCharacteristic = pService->createCharacteristic(
    VALVE_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE);

  pConfigCharacteristic = pService->createCharacteristic(
    CONFIG_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);

  pTimerCharacteristic = pService->createCharacteristic(
    TIMER_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);

  pAlertCharacteristic = pService->createCharacteristic(
    ALERT_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);

  // Set characteristic callbacks
  pValveCharacteristic->setCallbacks(new MyCharacteristicCallbacks());

  // Start the service
  pService->start();

  // Start advertising
  pServer->getAdvertising()->start();

  // Initialize valves
  initValves();

  // Load and send initial configuration data
  handleConfigCommand();
}

// Main loop function to manage valve sequence
void loop() {
    // Handle OTA
    ArduinoOTA.handle();

    // Handle BLE disconnection/reconnection logic
    if (!deviceConnected && lastDeviceState) {
        delay(500);                   // give the bluetooth stack the chance to get things ready
        pServer->startAdvertising();  // restart advertising
        Serial.println("start advertising");
        lastDeviceState = deviceConnected;
    }

    // If the device connected status changed, update the old status
    if (deviceConnected && !lastDeviceState) {
        lastDeviceState = deviceConnected;
    }

    // Manage the running sequence of valves
    if (sequenceRunning && currentValveIndex >= 0) {
        ValveState &currentValve = valveSequence[currentValveIndex];
        unsigned long currentTime = millis();

        if (currentValve.active) {
            // Check if the current valve's duration has passed
            if (currentTime - currentValve.startTime >= currentValve.duration) {
                // Turn off the current valve
                digitalWrite(valvePins[currentValve.valveNum - 1], LOW);
                currentValve.active = false;

                // Move to the next valve in the sequence
                currentValveIndex++;
                while (currentValveIndex < NUM_VALVES && !valveSequence[currentValveIndex].active) {
                    currentValveIndex++;
                }

                if (currentValveIndex < NUM_VALVES && valveSequence[currentValveIndex].active) {
                    valveSequence[currentValveIndex].startTime = currentTime;
                    if (valveSequence[currentValveIndex].action == "ON") {
                        digitalWrite(valvePins[valveSequence[currentValveIndex].valveNum - 1], HIGH);
                    }
                } else {
                    // Sequence is complete
                    sequenceRunning = false;
                    currentValveIndex = -1;
                }
            }
        }
    }

    // Send timer updates (this would include latched valves, though they wouldn't decrement)
    sendTimerUpdates();
    delay(1000);  // Update every second
}
