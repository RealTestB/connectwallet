import { Platform, Alert } from 'react-native';

/**
 * Check if the device is connected to the internet
 * Simple implementation that doesn't depend on NetInfo
 * @returns Promise<boolean> - True if connected, false otherwise
 */
export const checkConnectivity = async (): Promise<boolean> => {
  // Skip on web
  if (Platform.OS === 'web') {
    return true;
  }
  
  try {
    console.log('[Connectivity] Checking network connectivity...');
    
    // Try a basic fetch to verify internet connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch('https://google.com', { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      console.log('[Connectivity] Network connectivity verified');
      return true;
    } catch (error) {
      console.warn('[Connectivity] Network connectivity test failed:', error);
      return false;
    }
  } catch (error) {
    console.error('[Connectivity] Failed to check connectivity:', error);
    return false;
  }
};

/**
 * Check connectivity with user alert
 * Shows an alert to the user if the device is offline
 * @returns Promise<boolean> - True if connected, false otherwise
 */
export const checkConnectivityWithAlert = async (): Promise<boolean> => {
  const isConnected = await checkConnectivity();
  
  if (!isConnected) {
    Alert.alert(
      'Connection Issue',
      'Please check your internet connection and try again.',
      [{ text: 'OK' }]
    );
  }
  
  return isConnected;
};