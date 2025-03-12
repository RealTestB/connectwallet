// Apply only with Expo SDK 48
import { getRandomValues as expoCryptoGetRandomValues } from 'expo-crypto';

class Crypto {
  getRandomValues = expoCryptoGetRandomValues;
}

// Create a crypto object if it doesn't exist
const webCrypto = typeof crypto !== 'undefined' ? crypto : new Crypto();

// In React Native, we need to attach to global instead of window
if (typeof crypto === 'undefined') {
  if (typeof global !== 'undefined') {
    global.crypto = webCrypto;
  } else if (typeof window !== 'undefined') {
    window.crypto = webCrypto;
  }
} 