import React, {useState, useEffect} from 'react';
import {View, StyleSheet, Alert, Text, Switch} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceListComponent from '../components/Device/DeviceListComponent';
import AddDeviceComponent from '../components/Device/AddDeviceComponent';
import {BleManager, Device} from 'react-native-ble-plx';
import {DEBUG_MODE} from '../utils/config/debugConfig';

const bleManager = new BleManager();

const SettingsScreen = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isDebugMode, setIsDebugMode] = useState(false);

  useEffect(() => {
    loadSavedDevices();
    return () => {
      bleManager.stopDeviceScan();
      bleManager.destroy();
    };
  });

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
      const newDevices = devices.filter(d => d.id !== device.id); // Use the device.id to filter
      setDevices(newDevices);
      await AsyncStorage.setItem(
        'previousConnectedDevices',
        JSON.stringify(newDevices),
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to remove device');
    }
  };

  const connectToDevice = async (device: Device) => {
    try {
      console.log(`Attempting to connect to device: ${device.name}`);
      if (!DEBUG_MODE) {
        bleManager.stopDeviceScan();
      }

      const connectedDevice = await device.connect();
      console.log(`Connected to device: ${connectedDevice.name}`);

      await connectedDevice.discoverAllServicesAndCharacteristics();
      console.log(`Discovered services for device: ${connectedDevice.name}`);

      saveDevice(connectedDevice); // Save the device after connection
      Alert.alert('Connected', `Connected to ${connectedDevice.name}`);
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
      Alert.alert('Device Added', 'Added mock BLE device');
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
