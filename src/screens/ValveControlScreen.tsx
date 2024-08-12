import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, StyleSheet} from 'react-native';
import Valve from '../components/Valve';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/RootStack'; // Adjust the import path as necessary
import {setupMockBLE, mockBLEDevice} from '../utils/ble/setupMockBLE';

type Props = NativeStackScreenProps<RootStackParamList, 'ValveControl'>;

const ValveControlScreen: React.FC<Props> = ({route}) => {
  const {deviceName} = route.params;

  const [timers, setTimers] = useState([0, 0, 0, 0]); // Initialize timers for 4 valves

  // Run the mock BLE setup when the component mounts
  useEffect(() => {
    setupMockBLE();

    // Example: Read initial valve configurations (optional)
    const valveService = mockBLEDevice.getService('AquaFlush_Service_UUID');
    if (valveService) {
      for (let i = 0; i < timers.length; i++) {
        const valveUUID = `Valve${i + 1}_UUID`;
        const characteristic = valveService.getCharacteristic(valveUUID);
        if (characteristic) {
          console.log(
            `Valve ${i + 1} initial config: ${characteristic.read()}`,
          );
        }
      }
    }
  }, []);

  const handleStartValve = (index: number) => {
    // Logic to start the valve via mock BLE
    console.log(`Start valve ${index + 1}`);

    // Simulate starting the valve by updating the BLE characteristic
    const valveService = mockBLEDevice.getService('AquaFlush_Service_UUID');
    if (valveService) {
      const valveUUID = `Valve${index + 1}_UUID`;
      const characteristic = valveService.getCharacteristic(valveUUID);
      if (characteristic) {
        characteristic.write('Started'); // Simulate the action
        characteristic.notify(); // Notify any listeners (like the UI or log)
      }
    }
  };

  const handleStopValve = (index: number) => {
    // Logic to stop the valve via mock BLE
    console.log(`Stop valve ${index + 1}`);

    // Simulate stopping the valve by updating the BLE characteristic
    const valveService = mockBLEDevice.getService('AquaFlush_Service_UUID');
    if (valveService) {
      const valveUUID = `Valve${index + 1}_UUID`;
      const characteristic = valveService.getCharacteristic(valveUUID);
      if (characteristic) {
        characteristic.write('Stopped'); // Simulate the action
        characteristic.notify(); // Notify any listeners
      }
    }
  };

  const renderValve = ({item, index}: {item: number; index: number}) => (
    <Valve index={index} onStart={handleStartValve} onStop={handleStopValve} />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.deviceNameText}>{deviceName}</Text>
      <FlatList
        data={timers}
        renderItem={renderValve}
        keyExtractor={(item, index) => index.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  deviceNameText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default ValveControlScreen;
