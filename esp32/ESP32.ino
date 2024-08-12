#include <EEPROM.h>
#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// Define constants for relay GPIO pins (assuming GPIOs 2, 4, 5, 16 for the NCD board)
#define MAX_VALVES 16  // Maximum number of relays supported

// BLE UUIDs for service and characteristics
#define SERVICE_UUID                 "12345678-1234-5678-1234-56789abcdef0"
#define CHARACTERISTIC_UUID          "12345678-1234-5678-1234-56789abcdef1"  // Valve Control Characteristic
#define CONFIG_CHARACTERISTIC_UUID   "22345678-1234-5678-1234-56789abcdef2"  // Configuration Characteristic
#define ADMIN_CHARACTERISTIC_UUID    "32345678-1234-5678-1234-56789abcdef3"  // Admin Control Characteristic
#define TIMER_CHARACTERISTIC_UUID    "42345678-1234-5678-1234-56789abcdef4"  // Timer Update Characteristic
#define ALERT_CHARACTERISTIC_UUID    "52345678-1234-5678-1234-56789abcdef5"  // Alert Characteristic

// Admin authentication secret (this should be securely stored and handled)
const std::string adminSecret = "YOUR_SECRET_UUID";

// BLE related variables
BLEServer *pServer = NULL;
BLECharacteristic *pValveCharacteristic = NULL;
BLECharacteristic *pConfigCharacteristic = NULL;
BLECharacteristic *pAdminCharacteristic = NULL;
BLECharacteristic *pTimerCharacteristic = NULL;
BLECharacteristic *pAlertCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;
uint8_t maxSupportedValves = 0;   // Max valves the device hardware supports
uint8_t configuredValves = 0;     // Number of valves configured by the user
bool adminMode = false;           // Admin mode flag
int valvePins[MAX_VALVES];        // Array to store GPIO pins for valves
bool followMeMode = false;        // Flag for follow me mode
unsigned long startTime[MAX_VALVES];  // Array to store start times for timers
unsigned long duration[MAX_VALVES];   // Array to store durations for timers

// Function to load configuration from EEPROM
void loadConfiguration() {
    EEPROM.begin(512);
    maxSupportedValves = EEPROM.read(0);  // Read the maximum supported valves from EEPROM
    configuredValves = EEPROM.read(1);    // Read the number of valves configured by the user
    adminMode = EEPROM.read(2);           // Read the admin mode status

    // Assign pins based on maxSupportedValves
    for (int i = 0; i < maxSupportedValves; i++) {
        valvePins[i] = i + 2;  // Assign GPIO pins starting from pin 2
        pinMode(valvePins[i], OUTPUT);
        digitalWrite(valvePins[i], LOW);  // Ensure all relays are off initially
    }
}

// Function to save configuration to EEPROM
void saveConfiguration(uint8_t maxValves, uint8_t configValves, bool admin) {
    EEPROM.write(0, maxValves);
    EEPROM.write(1, configValves);
    EEPROM.write(2, admin ? 1 : 0);
    EEPROM.commit();
}

// BLE callbacks for connecting and disconnecting
class MyServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        deviceConnected = true;
    };

    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
    }
};

// Utility function to check if a string is a valid unsigned long integer
bool isValidNumber(const std::string& str) {
    for (char const &c : str) {
        if (std::isdigit(c) == 0) return false;
    }
    return true;
}

// Function to parse and handle valve commands with support for latched mode
void handleValveCommand(std::string command) {
    if (command.find("FOLLOW:") == 0) {
        // Parse follow me command, e.g., "FOLLOW:1:150,2:0" (0 seconds for latched mode)
        followMeMode = true;
        size_t pos = 7; // Start after "FOLLOW:"
        int valveIdx = 0;
        while (pos < command.length() && valveIdx < MAX_VALVES) {
            int valveNum = command[pos] - '0';
            size_t colonPos = command.find(':', pos);
            size_t commaPos = command.find(',', pos);

            if (colonPos != std::string::npos && isValidNumber(command.substr(colonPos + 1, commaPos - colonPos - 1))) {
                unsigned long dur = std::stoul(command.substr(colonPos + 1, commaPos - colonPos - 1)) * 1000;  // Convert to milliseconds
                duration[valveIdx] = dur;
                startTime[valveIdx] = millis();
                if (dur > 0) {
                    // Momentary mode
                    digitalWrite(valvePins[valveNum - 1], HIGH);
                } else {
                    // Latched mode
                    digitalWrite(valvePins[valveNum - 1], HIGH);
                }
                valveIdx++;
                pos = commaPos + 1;
            } else {
                sendAlert("Invalid duration format in FOLLOW command");
                return;
            }
        }
    } else {
        // Regular valve command, e.g., "VALVE:1:ON:0" for latched mode
        int valveNum = command[6] - '0';  // Extract valve number (assuming 1 digit for simplicity)
        std::string action = command.substr(8, 2);  // Extract action (ON/OFF)
        unsigned long durationInSeconds = 0;

        if (command.length() > 10 && isValidNumber(command.substr(11))) {
            durationInSeconds = std::stoul(command.substr(11));  // Extract duration in seconds
        } else if (command.length() > 10) {
            sendAlert("Invalid duration format in valve command");
            return;
        }

        unsigned long duration = durationInSeconds * 1000;  // Convert to milliseconds

        if (valveNum <= configuredValves) {
            if (action == "ON") {
                digitalWrite(valvePins[valveNum - 1], HIGH);
                if (duration > 0) {
                    // Momentary mode
                    startTime[valveNum - 1] = millis();
                    ::duration[valveNum - 1] = duration;
                } else {
                    // Latched mode (no auto-off)
                    ::duration[valveNum - 1] = 0;  // Ensure duration is 0
                }
            } else if (action == "OFF") {
                digitalWrite(valvePins[valveNum - 1], LOW);
                ::duration[valveNum - 1] = 0;  // Clear duration
            }
        } else {
            sendAlert("Valve number exceeds configured valves");
        }
    }
}

// Function to handle BLE commands for configuration
void handleConfigCommand(std::string command) {
    if (adminMode && command.find("CONFIG:") == 0) {
        std::string configValueStr = command.substr(7);
        if (isValidNumber(configValueStr)) {
            int newConfig = std::stoi(configValueStr);  // Extract new configuration number
            if (newConfig <= maxSupportedValves) {
                configuredValves = newConfig;
                saveConfiguration(maxSupportedValves, configuredValves, adminMode);
                Serial.println("Configuration updated: " + String(configuredValves) + " valves");
            } else {
                sendAlert("Invalid configuration: Exceeds max supported valves");
            }
        } else {
            sendAlert("Invalid configuration format");
        }
    } else {
        sendAlert("Config update failed: Admin mode required");
    }
}

// Function to handle BLE commands for admin mode with authentication
void handleAdminCommand(std::string command) {
    if (command.find("ADMIN:ENABLE:") == 0) {
        std::string receivedSecret = command.substr(13);  // Extract the secret/UUID

        if (receivedSecret == adminSecret) {
            adminMode = true;
            saveConfiguration(maxSupportedValves, configuredValves, adminMode);
            Serial.println("Admin mode enabled");
        } else {
            sendAlert("Admin mode enable failed: Invalid secret");
        }
    } else if (command == "ADMIN:DISABLE") {
        adminMode = false;
        saveConfiguration(maxSupportedValves, configuredValves, adminMode);
        Serial.println("Admin mode disabled");
    } else {
        sendAlert("Unknown admin command");
    }
}

// Function to send timer updates to the app
void sendTimerUpdates() {
    std::string timerUpdate = "TIMERS:";
    for (int i = 0; i < configuredValves; i++) {
        if (duration[i] > 0) {
            unsigned long remainingTime = (duration[i] - (millis() - startTime[i]));
            if (remainingTime > 0) {
                timerUpdate += std::to_string(i + 1) + ":" + std::to_string(remainingTime / 1000) + ",";  // Send remaining time in seconds
            } else {
                digitalWrite(valvePins[i], LOW);  // Turn off the valve when time runs out
                duration[i] = 0;  // Reset the duration
            }
        }
    }
    pTimerCharacteristic->setValue(timerUpdate);
    pTimerCharacteristic->notify();
}

// Function to send alerts to the app
void sendAlert(std::string alertMessage) {
    pAlertCharacteristic->setValue(alertMessage);
    pAlertCharacteristic->notify();
}

// Setup function
void setup() {
    // Initialize serial communication and BLE
    Serial.begin(115200);
    BLEDevice::init("AquaFlush");

    // Create BLE Server
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());

    // Create BLE Service
    BLEService *pService = pServer->createService(SERVICE_UUID);

    // Create BLE Characteristics
    pValveCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID,
                        BLECharacteristic::PROPERTY_READ |
                        BLECharacteristic::PROPERTY_WRITE
                      );

    pConfigCharacteristic = pService->createCharacteristic(
                        CONFIG_CHARACTERISTIC_UUID,
                        BLECharacteristic::PROPERTY_READ |
                        BLECharacteristic::PROPERTY_WRITE
                      );

    pAdminCharacteristic = pService->createCharacteristic(
                        ADMIN_CHARACTERISTIC_UUID,
                        BLECharacteristic::PROPERTY_READ |
                        BLECharacteristic::PROPERTY_WRITE
                      );

    pTimerCharacteristic = pService->createCharacteristic(
                        TIMER_CHARACTERISTIC_UUID,
                        BLECharacteristic::PROPERTY_READ |
                        BLECharacteristic::PROPERTY_NOTIFY
                      );

    pAlertCharacteristic = pService->createCharacteristic(
                        ALERT_CHARACTERISTIC_UUID,
                        BLECharacteristic::PROPERTY_READ |
                        BLECharacteristic::PROPERTY_NOTIFY
                      );

    // Set characteristic callbacks
    pValveCharacteristic->setCallbacks(new MyCharacteristicCallbacks());
    pConfigCharacteristic->setCallbacks(new MyConfigCharacteristicCallbacks());
    pAdminCharacteristic->setCallbacks(new MyAdminCharacteristicCallbacks());

    // Start the service
    pService->start();

    // Start advertising
    pServer->getAdvertising()->start();

    // Load configuration
    loadConfiguration();
}

// Main loop function
void loop() {
    // Handle BLE disconnection/reconnection logic
    if (!deviceConnected && oldDeviceConnected) {
        delay(500); // give the bluetooth stack the chance to get things ready
        pServer->startAdvertising(); // restart advertising
        Serial.println("start advertising");
        oldDeviceConnected = deviceConnected;
    }

    // If the device connected status changed, update the old status
    if (deviceConnected && !oldDeviceConnected) {
        oldDeviceConnected = deviceConnected;
    }

    // Handle Follow Me mode
    if (followMeMode) {
        for (int i = 0; i < configuredValves; i++) {
            if (duration[i] > 0 && millis() - startTime[i] >= duration[i]) {
                digitalWrite(valvePins[i], LOW);  // Turn off the valve after duration expires
                duration[i] = 0;  // Reset the duration for momentary mode
            }
        }
    }

    // Send timer updates (this would include latched valves, though they wouldn't decrement)
    sendTimerUpdates();

    delay(1000);  // Update every second
}

// BLE characteristic callbacks for Valve Control
class MyCharacteristicCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        std::string command = pCharacteristic->getValue();
        Serial.println("Valve Command received: " + command);
        handleValveCommand(command);  // Process the command
    }
};

// BLE characteristic callbacks for Configuration Control
class MyConfigCharacteristicCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        std::string command = pCharacteristic->getValue();
        Serial.println("Configuration Command received: " + command);
        handleConfigCommand(command);  // Process the command
    }
};

// BLE characteristic callbacks for Admin Control
class MyAdminCharacteristicCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        std::string command = pCharacteristic->getValue();
        Serial.println("Admin Command received: " + command);
        handleAdminCommand(command);  // Process the command
    }
};
