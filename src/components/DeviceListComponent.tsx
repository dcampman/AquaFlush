import React from 'react';
import {FlatList} from 'react-native';
import DeviceItemComponent from './DeviceItemComponent';
import {Device} from 'react-native-ble-plx';

type DeviceListProps = {
  devices: Device[];
  onConnect: (device: Device) => Promise<void>;
  onDisconnect: (device: Device) => Promise<void>;
  onRemove: (deviceId: string) => void;
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
        <DeviceItemComponent
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
