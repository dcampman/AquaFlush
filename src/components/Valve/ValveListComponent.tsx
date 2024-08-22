import React from 'react';
import {View, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {FlatList} from 'react-native';
import ValveComponent, {Valve} from './ValveComponent';

interface ValveListComponentProps {
  valves: Valve[]; // Updated to handle an array of Valve objects
  onUpdate: (valves: Valve[]) => void; // Callback to update the list of valves
  device: any; // Adjust based on the actual type of your BLE device
}

export default function ValveListComponent({
  valves,
  onUpdate,
  device,
}: ValveListComponentProps) {
  const handleNameChange = (id: number, newName: string) => {
    onUpdate(
      valves.map(valve =>
        valve.id === id ? {...valve, name: newName} : valve,
      ),
    );
  };

  const handleDurationChange = (id: number, newDuration: number) => {
    onUpdate(
      valves.map(valve =>
        valve.id === id ? {...valve, duration: newDuration} : valve,
      ),
    );
  };

  const handleToggleActive = (id: number) => {
    onUpdate(
      valves.map(valve =>
        valve.id === id ? {...valve, isActive: !valve.isActive} : valve,
      ),
    );
  };

  return (
    <FlatList
      data={valves}
      renderItem={({item}) => (
        <View style={{marginVertical: 10}}>
          <TouchableOpacity>
            <ValveComponent
              valve={item}
              onNameChange={newName => handleNameChange(item.id, newName)}
              onDurationChange={newDuration =>
                handleDurationChange(item.id, newDuration)
              }
              device={device} // Pass the BLE device to each ValveComponent
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleToggleActive(item.id)}>
            <Icon
              name="list"
              size={24}
              color={item.isActive ? 'blue' : 'gray'}
            />
          </TouchableOpacity>
        </View>
      )}
      keyExtractor={item => item.id.toString()}
    />
  );
}
