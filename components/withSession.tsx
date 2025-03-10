import { checkSessionValid, updateLastActive, verifyPassword, getEncryptedData } from '../api/securityService';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';

export function withSession<T extends object>(WrappedComponent: React.ComponentType<T>) {
  return function WithSessionComponent(props: T) {
    const [isLocked, setIsLocked] = useState(true);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isChecking, setIsChecking] = useState(true);
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();

    useEffect(() => {
      checkSession();
      const interval = setInterval(checkSession, 60000); // Check every minute
      return () => clearInterval(interval);
    }, []);

    const checkSession = async () => {
      const isValid = await checkSessionValid();
      setIsLocked(!isValid);
      setIsChecking(false);
    };

    const handleUnlock = async () => {
      try {
        // Get stored encrypted password
        const encryptedPassword = await getEncryptedData('encryptedPassword');
        if (!encryptedPassword) {
          setError('No password found. Please log in again.');
          navigation.navigate('SignIn');
          return;
        }

        // Verify password
        const isValid = await verifyPassword(password, encryptedPassword);
        if (!isValid) {
          setError('Incorrect password');
          return;
        }

        // Update session timestamp and unlock
        await updateLastActive();
        setIsLocked(false);
        setPassword('');
        setError('');
      } catch (err) {
        console.error('Error unlocking session:', err);
        setError('Failed to unlock. Please try again.');
      }
    };

    if (isChecking) {
      return (
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#6A9EFF" />
        </View>
      );
    }

    if (isLocked) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Session Expired</Text>
          <Text style={styles.subtitle}>Please enter your password to continue</Text>
          
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor="#6A9EFF"
          />
          
          {error ? <Text style={styles.error}>{error}</Text> : null}
          
          <TouchableOpacity 
            style={styles.button}
            onPress={handleUnlock}
          >
            <Text style={styles.buttonText}>Unlock</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return <WrappedComponent {...props} />;
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1B3F',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6A9EFF',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: 'white',
    fontSize: 16,
    marginBottom: 16,
  },
  error: {
    color: '#FF4D4D',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6A9EFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 