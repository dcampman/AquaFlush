import React from 'react';
import {View, Button, StyleSheet} from 'react-native';

type AddDeviceProps = {
  onAddDevice: () => void;
};

const AddDeviceComponent = ({onAddDevice}: AddDeviceProps) => {
  return (
    <View style={styles.container}>
      <Button title="Add New Device" onPress={onAddDevice} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
});

export default AddDeviceComponent;
