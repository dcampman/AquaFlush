import React from 'react';
import {FlatList} from 'react-native';
import DeviceComponent from './DeviceComponent';
import {Device} from 'react-native-ble-plx';

type DeviceListProps = {
  devices: Device[];
  onConnect: (device: Device) => Promise<void>;
  onDisconnect: (device: Device) => Promise<void>;
  onRemove: (device: Device) => Promise<void>;
};

const DeviceListComponent: React.FC<DeviceListProps> = ({
  devices,
  onConnect,
  onDisconnect,
  onRemove,
}) => {
  return (
    <FlatList
      data={devices}
      renderItem={({item}) => (
        <DeviceComponent
          device={item}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          onRemove={onRemove}
        />
      )}
      keyExtractor={item => item.id}
    />
  );
};

export default DeviceListComponent;
