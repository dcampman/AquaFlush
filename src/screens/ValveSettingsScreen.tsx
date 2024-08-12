import React, {useState} from 'react';
import {View, Text, TextInput, Button, StyleSheet} from 'react-native';
import {Picker} from '@react-native-picker/picker';

const ValveSettingsScreen = () => {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'latching' | 'momentary'>('latching');
  const [duration, setDuration] = useState(0);
  const [valveIndex, setValveIndex] = useState('valve1');

  // Hardcoded ESP32 valve names for the dropdown list
  const esp32Valves = [
    {id: 'valve1', name: 'Engine 1'},
    {id: 'valve2', name: 'Engine 2'},
    {id: 'valve3', name: 'Engine 3'},
    {id: 'valve4', name: 'Engine 4'},
  ];

  const handleSave = () => {
    // Logic to save valve settings (placeholder for now)
    console.log('Saved Settings:', {
      name,
      mode,
      duration,
      valveIndex,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Valve Settings</Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Valve Name"
      />

      <Picker
        selectedValue={mode}
        style={styles.picker}
        onValueChange={itemValue =>
          setMode(itemValue as 'latching' | 'momentary')
        }>
        <Picker.Item label="Latching" value="latching" />
        <Picker.Item label="Momentary" value="momentary" />
      </Picker>

      {mode === 'momentary' && (
        <TextInput
          style={styles.input}
          value={duration.toString()}
          onChangeText={text => setDuration(parseInt(text, 10) || 0)}
          placeholder="Duration (seconds)"
          keyboardType="numeric"
        />
      )}

      <Picker
        selectedValue={valveIndex}
        style={styles.picker}
        onValueChange={itemValue => setValveIndex(itemValue)}>
        {esp32Valves.map(valve => (
          <Picker.Item key={valve.id} label={valve.name} value={valve.id} />
        ))}
      </Picker>

      <Button title="Save Settings" onPress={handleSave} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingLeft: 10,
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 20,
  },
});

export default ValveSettingsScreen;
