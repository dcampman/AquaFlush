import React, {useEffect, useState} from 'react';
import 'react-native-gesture-handler';
import {enableScreens} from 'react-native-screens';
import {NavigationContainer} from '@react-navigation/native';
import RootStack from '../navigation/RootStack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {BleManager, Device} from 'react-native-ble-plx';

enableScreens();

const bleManager = new BleManager();

const App = () => {
  const [initialRoute, setInitialRoute] = useState<'Settings' | 'ValveControl'>(
    'Settings',
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await checkStoredDevices();
      setIsReady(true);
    };
    initialize();
  }, []);

  const checkStoredDevices = async () => {
    try {
      // Fetch the stored list of connected devices
      const savedDevices = await AsyncStorage.getItem('connectedDevices');

      // If no devices are stored, route to Settings screen
      if (!savedDevices) {
        setInitialRoute('Settings');
        return;
      }

      const devices: Device[] = JSON.parse(savedDevices);

      // If the array of devices is empty, route to Settings screen
      if (devices.length === 0) {
        setInitialRoute('Settings');
        return;
      }

      // Fetch the last connected device's ID
      const lastDeviceId = await AsyncStorage.getItem('lastConnectedDevice');

      // If no last connected device ID is found, route to Settings screen
      if (!lastDeviceId) {
        setInitialRoute('Settings');
        return;
      }

      // Attempt to connect to the last connected device
      const connectedDevice = await connectToDevice(lastDeviceId);

      // If the connection is successful, route to ValveControl screen
      if (connectedDevice) {
        setInitialRoute('ValveControl');
      } else {
        // If connection fails, route to Settings screen
        setInitialRoute('Settings');
      }
    } catch (error) {
      console.log('Error checking stored devices:', error);
      setInitialRoute('Settings'); // Default to Settings in case of error
    }
  };

  const connectToDevice = async (deviceId: string): Promise<Device | null> => {
    try {
      const devices = await bleManager.devices([deviceId]);
      if (devices.length > 0) {
        const device = devices[0];
        await device.connect();
        await device.discoverAllServicesAndCharacteristics();
        return device;
      }
    } catch (error) {
      console.log('Failed to connect to device:', error);
    }
    return null;
  };

  if (!isReady) {
    // Optionally, you could return a loading screen here.
    return null; // Or a loading spinner
  }

  return (
    <NavigationContainer>
      <RootStack initialRouteName={initialRoute} />
    </NavigationContainer>
  );
};

export default App;
