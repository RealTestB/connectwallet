import NetInfo from '@react-native-community/netinfo';
import { Platform, Alert } from 'react-native';

export const checkConnectivity = async (): Promise<boolean> => {
  // Skip on web
  if (Platform.OS === 'web') {
    return true;
  }
  
  try {
    console.log('Checking network connectivity...');
    
    const netInfo = await NetInfo.fetch();
    
    if (!netInfo.isConnected) {
      console.warn('Device is not connected to the internet');
      Alert.alert(
        'Connection Error',
        'Your device appears to be offline. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    // Try a basic fetch to verify real internet connectivity
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://google.com', { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      console.log('Network connectivity verified');
      return true;
    } catch (error) {
      console.warn('Network connectivity test failed:', error);
      Alert.alert(
        'Connection Issue',
        'Unable to connect to the internet. You may be connected to a network with limited connectivity.',
        [{ text: 'OK' }]
      );
      return false;
    }
  } catch (error) {
    console.error('Failed to check connectivity:', error);
    return false;
  }
};