import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {Device} from 'react-native-ble-plx';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/RootStack';

type DeviceItemProps = {
  device: Device;
  onConnect: (device: Device) => Promise<void>;
  onDisconnect: (device: Device) => Promise<void>;
  onRemove: (deviceId: string) => void;
};

const DeviceItemComponent: React.FC<DeviceItemProps> = ({
  device,
  onConnect,
  onDisconnect,
  onRemove,
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      const connected = await device.isConnected();
      setIsConnected(connected);
    };
    checkConnection();
  }, [device]);

  const handleConnectDisconnect = async () => {
    try {
      if (isConnected) {
        await onDisconnect(device);
        setIsConnected(false);
      } else {
        await onConnect(device);
        setIsConnected(true);
        navigation.navigate('ValveControl', {deviceName: device.name});
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect/disconnect to the device.');
    }
  };

  const handlePress = async () => {
    try {
      if (isConnected) {
        navigation.navigate('ValveControl', {deviceName: device.name});
      } else {
        await onConnect(device);
        navigation.navigate('ValveControl', {deviceName: device.name});
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to the device.');
    }
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Device',
      `Are you sure you want to remove ${device.name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemove(device.id),
        },
      ],
    );
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.deviceContainer}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceText}>{device.name}</Text>
      </View>
      <View style={styles.iconContainer}>
        <TouchableOpacity onPress={handleConnectDisconnect} style={styles.icon}>
          <Icon
            name="bluetooth" // Wi-Fi or Bluetooth icon
            size={20}
            color={isConnected ? '#007AFF' : '#FF3B30'} // Blue if connected, Red if disconnected
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRemove} style={styles.icon}>
          <Icon
            name="trash-2"
            size={24}
            color="#FF3B30" // Red trash icon
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  deviceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  deviceInfo: {
    flex: 1, // This makes the device info take up the remaining space
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceText: {
    fontSize: 18,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginLeft: 10,
  },
});

export default DeviceItemComponent;
