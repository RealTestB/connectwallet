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
    
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.timeout = 5000; // 5 second timeout

      xhr.addEventListener('readystatechange', () => {
        if (xhr.readyState !== 4) return;

        // Handle network errors
        if (xhr.status === 0) {
          console.warn('[Connectivity] Network connectivity test failed: No response');
          resolve(false);
          return;
        }

        // Check if we got a successful response
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('[Connectivity] Network connectivity verified');
          resolve(true);
        } else {
          console.warn('[Connectivity] Network connectivity test failed: Bad status', xhr.status);
          resolve(false);
        }
      });

      xhr.addEventListener('error', () => {
        console.warn('[Connectivity] Network connectivity test failed: Request error');
        resolve(false);
      });

      xhr.addEventListener('timeout', () => {
        console.warn('[Connectivity] Network connectivity test failed: Timeout');
        resolve(false);
      });

      xhr.open('HEAD', 'https://google.com');
      xhr.send();
    });
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