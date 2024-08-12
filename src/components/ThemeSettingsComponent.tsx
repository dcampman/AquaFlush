import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Picker} from '@react-native-picker/picker';

const ThemeSettingsComponent = () => {
  const [selectedTheme, setSelectedTheme] = useState('light');

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Theme Settings</Text>
      <Picker
        selectedValue={selectedTheme}
        style={styles.picker}
        onValueChange={itemValue => setSelectedTheme(itemValue)}>
        <Picker.Item label="Light" value="light" />
        <Picker.Item label="Dark" value="dark" />
        <Picker.Item label="System Default" value="system" />
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  picker: {
    height: 50,
    width: '100%',
  },
});

export default ThemeSettingsComponent;
