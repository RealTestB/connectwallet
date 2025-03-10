import 'react-native-get-random-values';
import { Buffer } from 'buffer';

export const initializeCrypto = async () => {
  try {
    // Ensure Buffer is available globally
    if (typeof global.Buffer === 'undefined') {
      global.Buffer = Buffer;
    }

    // Initialize other crypto-related globals if needed
    if (typeof global.crypto === 'undefined') {
      const cryptoBrowserify = require('crypto-browserify');
      global.crypto = cryptoBrowserify;
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize crypto:', error);
    return false;
  }
}; 