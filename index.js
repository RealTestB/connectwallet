// Import and initialize all polyfills
import './global';

// Initialize React Native features
import 'react-native-gesture-handler';
import { LogBox } from 'react-native';

// Ignore specific warnings that might interfere with development
LogBox.ignoreLogs([
  'Require cycle:',
  'Non-serializable values were found in the navigation state',
]);

// Initialize any services that need to be ready before navigation
import { initializeCrypto } from './utils/crypto';
import { updateLastActive } from './utils/activity';

// Run initialization
Promise.all([
  initializeCrypto(),
  updateLastActive()
]).catch(error => {
  console.warn('Initialization error:', error);
});

// Initialize Expo Router
import 'expo-router/entry';
