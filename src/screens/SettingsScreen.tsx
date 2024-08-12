import React, {useState, useEffect} from 'react';
import {View, StyleSheet, Alert, Text, Switch} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceListComponent from '../components/DeviceListComponent';
import AddDeviceComponent from '../components/AddDeviceComponent';
import {
  BleManager,
  Device,
  Service,
  Characteristic,
  Subscription,
  Descriptor,
  BleError,
} from 'react-native-ble-plx';
import {setupMockBLE, mockBLEDevice} from '../utils/ble/setupMockBLE';

const bleManager = new BleManager();

const SettingsScreen = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);

  useEffect(() => {
    loadSavedDevices();
    return () => {
      bleManager.stopDeviceScan();
      bleManager.destroy();
    };
  }, []);

  const loadSavedDevices = async () => {
    try {
      const savedDevices = await AsyncStorage.getItem('connectedDevices');
      if (savedDevices) {
        setDevices(JSON.parse(savedDevices));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load saved devices');
    }
  };

  const saveDevice = async (device: Device) => {
    try {
      const newDevices = [...devices, device];
      setDevices(newDevices);
      await AsyncStorage.setItem(
        'connectedDevices',
        JSON.stringify(newDevices),
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save device');
    }
  };

  const removeDevice = async (deviceId: string) => {
    try {
      const newDevices = devices.filter(device => device.id !== deviceId);
      setDevices(newDevices);
      await AsyncStorage.setItem(
        'connectedDevices',
        JSON.stringify(newDevices),
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to remove device');
    }
  };

  const connectToDevice = async (device: Device) => {
    if (isDebugMode) {
      console.log(`Simulating connection to ${device.name}`);
      Alert.alert('Debug Mode', `Simulating connection to ${device.name}`);
      return;
    }

    try {
      console.log(`Attempting to connect to device: ${device.name}`);
      bleManager.stopDeviceScan();

      const connectedDevice = await device.connect();
      console.log(`Connected to device: ${connectedDevice.name}`);

      await connectedDevice.discoverAllServicesAndCharacteristics();
      console.log(`Discovered services for device: ${connectedDevice.name}`);

      Alert.alert('Connected', `Connected to ${connectedDevice.name}`);
    } catch (error) {
      console.error('Connection Error:', error);
      Alert.alert('Connection Error', 'Failed to connect to device');
    }
  };

  const disconnectFromDevice = async (device: Device) => {
    try {
      console.log(`Simulating disconnection from ${device.name}`);
      await device.cancelConnection();
      Alert.alert('Disconnected', `Disconnected from ${device.name}`);
    } catch (error) {
      Alert.alert('Disconnection Error', 'Failed to disconnect from device');
    }
  };

  const addNewDevice = () => {
    if (isDebugMode) {
      // Use mock BLE to simulate adding a device
      setupMockBLE();
      let baseName = 'Mock AquaFlush Device';
      let mockDeviceName = baseName;
      let suffix = 1;

      while (devices.some(device => device.name === mockDeviceName)) {
        suffix++;
        mockDeviceName = `${baseName}-${suffix}`;
      }

      const mockDevice: Device = {
        id: `mock-device-id-${suffix}`,
        name: mockDeviceName,
        rssi: null,
        mtu: 0,
        manufacturerData: null,
        rawScanRecord: '',
        serviceData: null,
        serviceUUIDs: null,
        localName: null,
        txPowerLevel: null,
        solicitedServiceUUIDs: null,
        isConnectable: null,
        overflowServiceUUIDs: null,
        connect: async function (): Promise<Device> {
          console.log(`Simulating connection to ${this.name}`);
          return this; // Simulate a successful connection
        },
        cancelConnection: async function (): Promise<Device> {
          console.log(`Simulating disconnection from ${this.name}`);
          return this; // Simulate a successful disconnection
        },
        isConnected: async function (): Promise<boolean> {
          return true; // Mock return value indicating the device is connected
        },
        onDisconnected: function (
          listener: (error: BleError | null, device: Device) => void,
        ): Subscription {
          return {
            remove: () => {},
          }; // Mock subscription removal
        },
        discoverAllServicesAndCharacteristics:
          async function (): Promise<Device> {
            return this; // Mock return value for discovering services and characteristics
          },
        services: async function (): Promise<Service[]> {
          return []; // Mock return value for services
        },
        characteristicsForService: async function (): Promise<
          Characteristic[]
        > {
          return []; // Mock return value for characteristics
        },
        readRSSI: async function (): Promise<Device> {
          return this; // Mock return value for RSSI
        },
        requestMTU: async function (): Promise<Device> {
          return this; // Mock return value for MTU request
        },
        requestConnectionPriority: async function (): Promise<Device> {
          return this; // Mock return value for connection priority request
        },
        monitorCharacteristicForService: function (): Subscription {
          return {
            remove: () => {},
          }; // Mock subscription removal
        },
        readCharacteristicForService:
          async function (): Promise<Characteristic> {
            return {} as Characteristic; // Mock return value for reading a characteristic
          },
        writeCharacteristicWithResponseForService:
          async function (): Promise<Characteristic> {
            return {} as Characteristic; // Mock return value for writing with response
          },
        writeCharacteristicWithoutResponseForService:
          async function (): Promise<Characteristic> {
            return {} as Characteristic; // Mock return value for writing without response
          },
        readDescriptorForService: async function (): Promise<Descriptor> {
          return {} as Descriptor; // Mock return value for reading a descriptor
        },
        writeDescriptorForService: async function (): Promise<Descriptor> {
          return {} as Descriptor; // Mock return value for writing a descriptor
        },
        descriptorsForService: async function (): Promise<Descriptor[]> {
          return []; // Mock return value for descriptors
        },
      };

      saveDevice(mockDevice);
      Alert.alert('Device Added', `Added ${mockDevice.name}`);
      return;
    }

    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (device && device.name && !devices.some(d => d.id === device.id)) {
        saveDevice(device);
        bleManager.stopDeviceScan();
        Alert.alert('Device Added', `Added ${device.name}`);
      }
    });

    setTimeout(() => bleManager.stopDeviceScan(), 10000);
  };

  const toggleAdminMode = () => {
    setIsAdminMode(prevState => !prevState);
    if (!isAdminMode) {
      console.log('Admin mode enabled');
      // Additional logic for Admin mode can be added here
    } else {
      console.log('Admin mode disabled');
      // Additional logic for disabling Admin mode can be added here
    }
  };

  const toggleDebugMode = () => {
    setIsDebugMode(prevState => !prevState);
    if (!isDebugMode) {
      console.log('Debug mode enabled - using mock device');
    } else {
      console.log('Debug mode disabled - using real device');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.settingItem}>
        <Text style={styles.settingText}>Admin Mode</Text>
        <Switch value={isAdminMode} onValueChange={toggleAdminMode} />
      </View>
      <View style={styles.settingItem}>
        <Text style={styles.settingText}>Debug Mode</Text>
        <Switch value={isDebugMode} onValueChange={toggleDebugMode} />
      </View>
      <AddDeviceComponent onAddDevice={addNewDevice} />
      <DeviceListComponent
        devices={devices}
        onConnect={connectToDevice}
        onDisconnect={disconnectFromDevice}
        onRemove={removeDevice}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  settingText: {
    fontSize: 18,
  },
});

export default SettingsScreen;
