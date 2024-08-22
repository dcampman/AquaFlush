import React, {useState, useEffect} from 'react';
import {View, StyleSheet, Alert, Text, Switch} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceListComponent from '../components/Device/DeviceListComponent';
import AddDeviceComponent from '../components/Device/AddDeviceComponent';
import {BleManager, Device} from 'react-native-ble-plx';
import MockBleManager from '../utils/mock-ble/MockBleManager';
import {MockDevice} from '../utils/mock-ble/MockDevice';
import {DEBUG_MODE} from '../utils/config/debugConfig';

const SettingsScreen = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isDebugMode, setIsDebugMode] = useState(DEBUG_MODE);
  const [bleManager, setBleManager] = useState<BleManager | MockBleManager>(
    isDebugMode ? new MockBleManager() : new BleManager(),
  );

  useEffect(() => {
    loadSavedDevices();
    return () => {
      bleManager.stopDeviceScan();
      bleManager.destroy();
    };
  }, [bleManager]);

  const loadSavedDevices = async () => {
    try {
      const savedDevices = await AsyncStorage.getItem(
        'previousConnectedDevices',
      );
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
        'previousConnectedDevices',
        JSON.stringify(newDevices),
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save device');
    }
  };

  const removeDevice = async (device: Device) => {
    try {
      const newDevices = devices.filter(d => d.id !== device.id);
      setDevices(newDevices);
      await AsyncStorage.setItem(
        'previousConnectedDevices',
        JSON.stringify(newDevices),
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to remove device');
    }
  };

  const connectToDevice = async (device: Device | MockDevice) => {
    try {
      console.log(`Attempting to connect to device: ${device.name}`);

      if (!isDebugMode && 'stopDeviceScan' in bleManager) {
        bleManager.stopDeviceScan();
      }

      // Use type narrowing to handle the mock or real device
      if (device instanceof MockDevice) {
        // Handle mock device connection logic
        const connectedDevice = await device.connect();
        await connectedDevice.discoverAllServicesAndCharacteristics();
      } else {
        // Handle real device connection logic
        const connectedDevice = await (device as Device).connect();
        await connectedDevice.discoverAllServicesAndCharacteristics();
      }

      saveDevice(device); // Save the device after connection
      Alert.alert('Connected', `Connected to ${device.name}`);
    } catch (error) {
      console.error('Connection Error:', error);
      Alert.alert('Connection Error', 'Failed to connect to device');
    }
  };

  const disconnectFromDevice = async (device: Device) => {
    try {
      await device.cancelConnection();
      Alert.alert('Disconnected', `Disconnected from ${device.name}`);
    } catch (error) {
      Alert.alert('Disconnection Error', 'Failed to disconnect from device');
    }
  };

  const addNewDevice = () => {
    if (isDebugMode) {
      // Type guard to ensure bleManager.devices is an array of MockDevices
      if (Array.isArray(bleManager.devices) && bleManager.devices.length > 0) {
        const mockDevice = bleManager.devices[0]; // Access the first mock device
        if (mockDevice && !devices.some(d => d.id === mockDevice.id)) {
          Alert.alert(
            'Device Added',
            `Connected to mock device: ${mockDevice.name}`,
          );
          connectToDevice(mockDevice);
        } else {
          Alert.alert(
            'Device Already Added',
            'The mock BLE device is already connected.',
          );
        }
      } else {
        Alert.alert('No Mock Devices', 'No mock BLE devices available.');
      }
    } else {
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          Alert.alert('Error', error.message);
          return;
        }

        if (device && device.name && !devices.some(d => d.id === device.id)) {
          connectToDevice(device);
          bleManager.stopDeviceScan();
        }
      });

      setTimeout(() => bleManager.stopDeviceScan(), 10000);
    }
  };

  const toggleDebugMode = async () => {
    const newDebugMode = !isDebugMode;
    setIsDebugMode(newDebugMode);

    await AsyncStorage.setItem('DEBUG_MODE', newDebugMode.toString());

    // Switch between mock and real BLE managers
    setBleManager(newDebugMode ? new MockBleManager() : new BleManager());

    console.log(
      newDebugMode
        ? 'Debug mode enabled - using mock device'
        : 'Debug mode disabled - using real device',
    );
  };

  return (
    <View style={styles.container}>
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
