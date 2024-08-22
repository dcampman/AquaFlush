import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  Button,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export interface Valve {
  id: number;
  name: string;
  duration: number;
  isActive: boolean;
}

interface ValveComponentProps {
  valve: Valve;
  onNameChange: (name: string) => void;
  onDurationChange: (duration: number) => void;
  device: any; // Adjust based on the actual type of your BLE device
}

export default function ValveComponent({
  valve,
  onNameChange,
  onDurationChange,
  device,
}: ValveComponentProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [currentDuration, setCurrentDuration] = useState(valve.duration);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setCurrentDuration(valve.duration);

    const subscribeToTimer = async () => {
      try {
        const timerCharacteristicUUID = '42345678-1234-5678-1234-56789abcdef4'; // Timer Update Characteristic UUID
        const serviceUUID = '12345678-1234-5678-1234-56789abcdef0'; // Service UUID

        device.monitorCharacteristicForService(
          serviceUUID,
          timerCharacteristicUUID,
          (error: any, characteristic: any) => {
            if (error) {
              console.error(error);
              return;
            }

            const timerData = JSON.parse(characteristic.value);
            if (timerData[valve.id] !== undefined) {
              setCurrentDuration(timerData[valve.id]);
            }
          },
        );
      } catch (error) {
        console.error('Failed to subscribe to timer characteristic:', error);
      }
    };

    subscribeToTimer();
  }, [device, valve.id]);

  const handleEditName = (name: string) => {
    onNameChange(name);
    setIsEditingName(false);
  };

  const handleEditDuration = (duration: number) => {
    onDurationChange(Number(duration)); // Make sure duration is converted to a number
    setIsEditingDuration(false);
  };

  const handleDurationChange = (text: string) => {
    const duration = Number(text); // Convert the text (string) to a number
    setCurrentDuration(duration); // This expects a number
  };

  const handlePlay = async () => {
    try {
      const valveCharacteristicUUID = '12345678-1234-5678-1234-56789abcdef1'; // Valve Control Characteristic UUID
      const serviceUUID = '12345678-1234-5678-1234-56789abcdef0'; // Service UUID
      const command = JSON.stringify({
        valve: valve.id,
        action: 'ON',
        duration: currentDuration,
      });

      await device.writeCharacteristicWithResponseForService(
        serviceUUID,
        valveCharacteristicUUID,
        command,
      );
      setIsRunning(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to send command to valve');
      console.error(error);
    }
  };

  const handleStop = async () => {
    try {
      const valveCharacteristicUUID = '12345678-1234-5678-1234-56789abcdef1'; // Valve Control Characteristic UUID
      const serviceUUID = '12345678-1234-5678-1234-56789abcdef0'; // Service UUID
      const command = JSON.stringify({
        valve: valve.id,
        action: 'OFF',
      });

      await device.writeCharacteristicWithResponseForService(
        serviceUUID,
        valveCharacteristicUUID,
        command,
      );
      setIsRunning(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to send stop command to valve');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setIsEditingName(true)}>
        <Text style={styles.valveName}>{valve.name}</Text>
      </TouchableOpacity>

      <View style={styles.durationContainer}>
        <TouchableOpacity onPress={() => setIsEditingDuration(true)}>
          <Text style={styles.durationText}>{currentDuration}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={handlePlay} disabled={isRunning}>
          <Icon name={isRunning ? 'pause' : 'play'} size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleStop}>
          <Icon name="stop" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <Modal visible={isEditingName} transparent={true}>
        <View style={styles.modalContainer}>
          <TextInput
            value={valve.name}
            onChangeText={handleEditName}
            placeholder="Enter Valve Name"
            style={styles.input}
          />
          <Button title="Save" onPress={() => handleEditName(valve.name)} />
        </View>
      </Modal>

      <Modal visible={isEditingDuration} transparent={true}>
        <View style={styles.modalContainer}>
          <TextInput
            value={String(currentDuration)} // Display the current duration as a string
            onChangeText={handleDurationChange} // Handle the input change
            placeholder="Enter Duration (seconds)"
            keyboardType="numeric"
            style={styles.input}
          />
          <Button
            title="Save"
            onPress={() => handleEditDuration(currentDuration)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  valveName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 16,
    marginHorizontal: 10,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  input: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    width: '80%',
  },
});
