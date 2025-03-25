// utils/httpClient.js
import { Platform } from 'react-native';

// This function will be called before the app makes any HTTP requests
export const configureHttpClient = () => {
  console.log('[HTTP] Configuring global HTTP client');
  
  // Configure global fetch timeout
  const originalFetch = global.fetch;
  
  global.fetch = (url, options = {}) => {
    const timeoutDuration = 30000; // 30 seconds
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
    
    const enhancedOptions = {
      ...options,
      signal: options.signal || controller.signal,
    };
    
    return originalFetch(url, enhancedOptions)
      .finally(() => clearTimeout(timeoutId));
  };
  
  console.log('[HTTP] Global fetch configured with timeout');
};