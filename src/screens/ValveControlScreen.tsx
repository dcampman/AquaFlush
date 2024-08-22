import React, {useState, useEffect} from 'react';
import {View, Button, Alert} from 'react-native';
import ValveListComponent from '../components/Valve/ValveListComponent';
import {BleManager, Device} from 'react-native-ble-plx';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/RootStack';
import {Valve} from '../components/Valve/ValveComponent'; // Import the Valve interface

type ValveControlScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ValveControl'
>;

export default function ValveControlScreen({
  route,
  navigation,
}: ValveControlScreenProps) {
  const {deviceName} = route.params;
  const [device, setDevice] = useState<Device | null>(null);
  const [valves, setValves] = useState<Valve[]>([]); // Explicitly type the state with Valve[]
  const manager = new BleManager();

  useEffect(() => {
    if (!deviceName) {
      Alert.alert('Error', 'Device name is required');
      navigation.navigate('Settings'); // Navigate to Settings if no deviceName
      return;
    }

    const connectToDevice = async () => {
      try {
        const devices = await manager.devices([deviceName as string]); // Type guard ensures deviceName is a string
        if (devices && devices.length > 0) {
          setDevice(devices[0]);
        } else {
          Alert.alert('Error', 'Device not found');
          navigation.navigate('Settings'); // Navigate to Settings if the device is not found
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to connect to device');
        console.error(error);
      }
    };

    connectToDevice();
  }, [deviceName]);

  useEffect(() => {
    if (!device) return;

    const fetchConfiguration = async () => {
      try {
        const configCharacteristicUUID = '22345678-1234-5678-1234-56789abcdef2'; // Configuration Characteristic UUID
        const serviceUUID = '12345678-1234-5678-1234-56789abcdef0'; // Service UUID

        const characteristic = await device.readCharacteristicForService(
          serviceUUID,
          configCharacteristicUUID,
        );

        if (characteristic.value) {
          // Decode the Base64 encoded value to a UTF-8 string
          const decodedValue = Buffer.from(
            characteristic.value,
            'base64',
          ).toString('utf-8');

          try {
            // Parse the JSON string
            const configData = JSON.parse(decodedValue);

            // Assuming configData has the structure: { "VALVES": number, "PINS": number[] }
            setValves(
              Array.from({length: configData.VALVES}, (_, i) => ({
                id: i + 1,
                name: `Valve ${i + 1}`,
                duration: 0,
                isActive: false,
              })),
            );
          } catch (jsonError) {
            console.error(
              'Failed to parse JSON from characteristic value:',
              jsonError,
            );
            Alert.alert('Error', 'Invalid configuration data received.');
          }
        } else {
          console.error('Characteristic value is null or undefined');
          Alert.alert('Error', 'No configuration data available.');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch configuration data');
        console.error('Error reading characteristic:', error);
      }
    };

    fetchConfiguration();
  }, [device]);

  const handleRunSequence = async () => {
    if (!device) return;

    const sequenceValves = valves.filter(valve => valve.isActive);
    if (sequenceValves.length === 0) {
      Alert.alert('Error', 'No valves selected for the sequence.');
      return;
    }

    try {
      const valveCharacteristicUUID = '12345678-1234-5678-1234-56789abcdef1'; // Valve Control Characteristic UUID
      const serviceUUID = '12345678-1234-5678-1234-56789abcdef0'; // Service UUID

      const commands = sequenceValves.map(valve => ({
        valve: valve.id,
        action: 'ON',
        duration: valve.duration,
      }));

      await device.writeCharacteristicWithResponseForService(
        serviceUUID,
        valveCharacteristicUUID,
        JSON.stringify({valves: commands}),
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send sequence to valves');
      console.error(error);
    }
  };

  return (
    <View style={{flex: 1, padding: 20}}>
      {/* Directly pass the valves array to ValveListComponent */}
      <ValveListComponent
        valves={valves} // Pass the entire array of valves
        onUpdate={updatedValves => setValves(updatedValves)}
        device={device} // Pass the BLE device to the valve component
      />
      <Button title="Run Sequence" onPress={handleRunSequence} />
    </View>
  );
}
