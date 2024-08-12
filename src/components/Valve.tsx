import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {AnimatedCircularProgress} from 'react-native-circular-progress';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/RootStack';

type ValveProps = {
  index: number;
  onStart: (index: number) => void;
  onStop: (index: number) => void;
};

const Valve = ({index, onStart, onStop}: ValveProps) => {
  const [name, setName] = useState(`Valve ${index + 1}`);
  const [mode, setMode] = useState<'latching' | 'momentary'>('latching');
  const [duration, setDuration] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timeRemaining === 0 && interval) {
      clearInterval(interval);
      setIsRunning(false);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, timeRemaining]);

  const handleStart = () => {
    if (mode === 'momentary' && duration > 0) {
      setTimeRemaining(duration);
      setIsRunning(true);
    }
    onStart(index);
  };

  const handleStop = () => {
    setIsRunning(false);
    setTimeRemaining(0);
    onStop(index);
  };

  const handleSettingsPress = () => {
    navigation.navigate('ValveSettings');
  };

  return (
    <View style={styles.valveContainer}>
      <Text style={styles.valveText}>{name}</Text>
      <Text>Index: {index + 1}</Text>

      <TouchableOpacity
        onPress={handleSettingsPress}
        style={styles.settingsButton}>
        <Text style={styles.settingsButtonText}>Edit Settings</Text>
      </TouchableOpacity>

      <AnimatedCircularProgress
        size={100}
        width={10}
        fill={(timeRemaining / duration) * 100}
        tintColor="#00e0ff"
        backgroundColor="#3d5875"
        style={styles.gauge}>
        {() => (
          <Text style={styles.timerText}>
            {isRunning ? timeRemaining : duration}s
          </Text>
        )}
      </AnimatedCircularProgress>

      <Button title="Start" onPress={handleStart} />
      <Button title="Stop" onPress={handleStop} />
    </View>
  );
};

const styles = StyleSheet.create({
  valveContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  valveText: {
    fontSize: 18,
    marginBottom: 10,
  },
  settingsButton: {
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginBottom: 15,
  },
  settingsButtonText: {
    fontSize: 16,
    color: '#007bff',
    textAlign: 'center',
  },
  gauge: {
    alignSelf: 'center',
    marginBottom: 15,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Valve;
