#include <EEPROM.h>
#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// Hard-coded valve configuration
#define NUM_VALVES 4                             // Number of valves
const int valvePins[NUM_VALVES] = {2, 4, 5, 16}; // GPIO pins assigned to each valve

// BLE UUIDs for service and characteristics
#define SERVICE_UUID "12345678-1234-5678-1234-56789abcdef0"
#define VALVE_CHARACTERISTIC_UUID "12345678-1234-5678-1234-56789abcdef1"  // Valve Control Characteristic
#define CONFIG_CHARACTERISTIC_UUID "22345678-1234-5678-1234-56789abcdef2" // Configuration Characteristic
#define TIMER_CHARACTERISTIC_UUID "42345678-1234-5678-1234-56789abcdef4"  // Timer Update Characteristic
#define ALERT_CHARACTERISTIC_UUID "52345678-1234-5678-1234-56789abcdef5"  // Alert Characteristic

// BLE related variables
BLEServer *pServer = NULL;
BLECharacteristic *pValveCharacteristic = NULL;
BLECharacteristic *pConfigCharacteristic = NULL;
BLECharacteristic *pTimerCharacteristic = NULL;
BLECharacteristic *pAlertCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;
bool followMeMode = false;           // Flag for follow me mode
unsigned long startTime[NUM_VALVES]; // Array to store start times for timers
unsigned long duration[NUM_VALVES];  // Array to store durations for timers

// Function to initialize valve pins
void initValves()
{
    for (int i = 0; i < NUM_VALVES; i++)
    {
        pinMode(valvePins[i], OUTPUT);
        digitalWrite(valvePins[i], LOW); // Ensure all relays are off initially
    }
}

// BLE callbacks for connecting and disconnecting
class MyServerCallbacks : public BLEServerCallbacks
{
    void onConnect(BLEServer *pServer)
    {
        deviceConnected = true;
    };

    void onDisconnect(BLEServer *pServer)
    {
        deviceConnected = false;
    }
};

// Utility function to check if a string is a valid unsigned long integer
bool isValidNumber(const std::string &str)
{
    for (char const &c : str)
    {
        if (std::isdigit(c) == 0)
            return false;
    }
    return true;
}

// Function to parse and handle valve commands with support for latched mode
void handleValveCommand(std::string command)
{
    if (command.find("FOLLOW:") == 0)
    {
        // Parse follow me command, e.g., "FOLLOW:1:150,2:0" (0 seconds for latched mode)
        followMeMode = true;
        size_t pos = 7; // Start after "FOLLOW:"
        int valveIdx = 0;
        while (pos < command.length() && valveIdx < NUM_VALVES)
        {
            int valveNum = command[pos] - '0';
            size_t colonPos = command.find(':', pos);
            size_t commaPos = command.find(',', pos);

            if (colonPos != std::string::npos && isValidNumber(command.substr(colonPos + 1, commaPos - colonPos - 1)))
            {
                unsigned long dur = std::stoul(command.substr(colonPos + 1, commaPos - colonPos - 1)) * 1000; // Convert to milliseconds
                duration[valveIdx] = dur;
                startTime[valveIdx] = millis();
                if (dur > 0)
                {
                    // Momentary mode
                    digitalWrite(valvePins[valveNum - 1], HIGH);
                }
                else
                {
                    // Latched mode
                    digitalWrite(valvePins[valveNum - 1], HIGH);
                }
                valveIdx++;
                pos = commaPos + 1;
            }
            else
            {
                sendAlert("Invalid duration format in FOLLOW command");
                return;
            }
        }
    }
    else
    {
        // Regular valve command, e.g., "VALVE:1:ON:0" for latched mode
        int valveNum = command[6] - '0';           // Extract valve number (assuming 1 digit for simplicity)
        std::string action = command.substr(8, 2); // Extract action (ON/OFF)
        unsigned long durationInSeconds = 0;

        if (command.length() > 10 && isValidNumber(command.substr(11)))
        {
            durationInSeconds = std::stoul(command.substr(11)); // Extract duration in seconds
        }
        else if (command.length() > 10)
        {
            sendAlert("Invalid duration format in valve command");
            return;
        }

        unsigned long duration = durationInSeconds * 1000; // Convert to milliseconds

        if (valveNum <= NUM_VALVES)
        {
            if (action == "ON")
            {
                digitalWrite(valvePins[valveNum - 1], HIGH);
                if (duration > 0)
                {
                    // Momentary mode
                    startTime[valveNum - 1] = millis();
                    ::duration[valveNum - 1] = duration;
                }
                else
                {
                    // Latched mode (no auto-off)
                    ::duration[valveNum - 1] = 0; // Ensure duration is 0
                }
            }
            else if (action == "OFF")
            {
                digitalWrite(valvePins[valveNum - 1], LOW);
                ::duration[valveNum - 1] = 0; // Clear duration
            }
        }
        else
        {
            sendAlert("Valve number exceeds available valves");
        }
    }
}

// Function to handle BLE commands for configuration
void handleConfigCommand()
{
    // Create a string to send the valve configuration data
    std::string configData = "VALVES:" + std::to_string(NUM_VALVES) + ";PINS:";
    for (int i = 0; i < NUM_VALVES; i++)
    {
        configData += std::to_string(valvePins[i]);
        if (i < NUM_VALVES - 1)
        {
            configData += ",";
        }
    }
    pConfigCharacteristic->setValue(configData);
    pConfigCharacteristic->notify();
}

// Function to send timer updates to the app
void sendTimerUpdates()
{
    std::string timerUpdate = "TIMERS:";
    for (int i = 0; i < NUM_VALVES; i++)
    {
        if (duration[i] > 0)
        {
            unsigned long remainingTime = (duration[i] - (millis() - startTime[i]));
            if (remainingTime > 0)
            {
                timerUpdate += std::to_string(i + 1) + ":" + std::to_string(remainingTime / 1000) + ","; // Send remaining time in seconds
            }
            else
            {
                digitalWrite(valvePins[i], LOW); // Turn off the valve when time runs out
                duration[i] = 0;                 // Reset the duration
            }
        }
    }
    pTimerCharacteristic->setValue(timerUpdate);
    pTimerCharacteristic->notify();
}

// Function to send alerts to the app
void sendAlert(std::string alertMessage)
{
    pAlertCharacteristic->setValue(alertMessage);
    pAlertCharacteristic->notify();
}

// Setup function
void setup()
{
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
        VALVE_CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_READ |
            BLECharacteristic::PROPERTY_WRITE);

    pConfigCharacteristic = pService->createCharacteristic(
        CONFIG_CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_READ |
            BLECharacteristic::PROPERTY_NOTIFY);

    pTimerCharacteristic = pService->createCharacteristic(
        TIMER_CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_READ |
            BLECharacteristic::PROPERTY_NOTIFY);

    pAlertCharacteristic = pService->createCharacteristic(
        ALERT_CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_READ |
            BLECharacteristic::PROPERTY_NOTIFY);

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

// Main loop function
void loop()
{
    // Handle BLE disconnection/reconnection logic
    if (!deviceConnected && oldDeviceConnected)
    {
        delay(500);                  // give the bluetooth stack the chance to get things ready
        pServer->startAdvertising(); // restart advertising
        Serial.println("start advertising");
        oldDeviceConnected = deviceConnected;
    }

    // If the device connected status changed, update the old status
    if (deviceConnected && !oldDeviceConnected)
    {
        oldDeviceConnected = deviceConnected;
    }

    // Handle Follow Me mode
    if (followMeMode)
    {
        for (int i = 0; i < NUM_VALVES; i++)
        {
            if (duration[i] > 0 && millis() - startTime[i] >= duration[i])
            {
                digitalWrite(valvePins[i], LOW); // Turn off the valve after duration expires
                duration[i] = 0;                 // Reset the duration for momentary mode
            }
        }
    }

    // Send timer updates (this would include latched valves, though they wouldn't decrement)
    sendTimerUpdates();

    delay(1000); // Update every second
}

// BLE characteristic callbacks for Valve Control
class MyCharacteristicCallbacks : public BLECharacteristicCallbacks
{
    void onWrite(BLECharacteristic *pCharacteristic)
    {
        std::string command = pCharacteristic->getValue();
        Serial.println("Valve Command received: " + command);
        handleValveCommand(command); // Process the command
    }
};
