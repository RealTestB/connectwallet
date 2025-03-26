import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import cryptoBrowserify from 'crypto-browserify';

declare global {
  var Buffer: typeof Buffer;
}

export const initializeCrypto = async (): Promise<boolean> => {
  try {
    // Ensure Buffer is available globally
    if (typeof global.Buffer === 'undefined') {
      global.Buffer = Buffer;
    }

    // Initialize crypto-related globals
    if (typeof global.crypto === 'undefined') {
      // @ts-ignore
      global.crypto = cryptoBrowserify;
    }

    // Verify initialization
    const testBuffer = Buffer.from('test');
    if (!testBuffer) throw new Error('Buffer not initialized');

    return true;
  } catch (error) {
    console.error('Failed to initialize crypto:', error);
    return false;
  }
}; 