// Configure global HTTP client settings for React Native
import { Platform } from 'react-native';

// This function will be called before the app makes any HTTP requests
export const configureHttpClient = () => {
  if (Platform.OS === 'android') {
    try {
      // Configure OkHttp client (for Android)
      const OkHttpClient = require('okhttp');
      if (OkHttpClient && OkHttpClient.Builder) {
        const builder = new OkHttpClient.Builder()
          .connectTimeout(30, TimeUnit.SECONDS)
          .readTimeout(30, TimeUnit.SECONDS)
          .writeTimeout(30, TimeUnit.SECONDS)
          .retryOnConnectionFailure(true);
          
        // Set as default client
        OkHttpClient.setClient(builder.build());
        console.log('[HTTP] Custom OkHttp client configured');
      }
    } catch (error) {
      console.warn('[HTTP] Unable to configure custom OkHttp client:', error);
    }
  }
  
  // Configure global fetch timeout
  const originalFetch = global.fetch;
  
  global.fetch = (url, options = {}) => {
    const timeoutDuration = 30000; // 30 seconds
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
    
    const enhancedOptions = {
      ...options,
      signal: controller.signal,
    };
    
    return originalFetch(url, enhancedOptions)
      .finally(() => clearTimeout(timeoutId));
  };
  
  console.log('[HTTP] Global fetch configured with timeout');
};