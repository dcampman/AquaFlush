import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import ValveControlScreen from '../screens/ValveControlScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HeaderMenu from './HeaderMenu';

// Define the root stack's param list for type safety in navigation
export type RootStackParamList = {
  ValveControl: {deviceName: string | null};
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootStack = ({
  initialRouteName,
}: {
  initialRouteName: keyof RootStackParamList;
}) => {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerTitle: 'AquaFlush',
        headerTitleAlign: 'center',
        headerRight: () => <HeaderMenu />,
      }}>
      <Stack.Screen
        name="ValveControl"
        component={ValveControlScreen}
        options={{
          headerBackVisible: false, // Hide the back arrow
        }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export default RootStack;
