// Import console polyfill first
import './console-polyfill';

// Apply only with Expo SDK 48
import { getRandomValues } from 'expo-crypto';
import '@ethersproject/shims';
import { Buffer } from 'buffer';
import process from 'process';
import '@walletconnect/react-native-compat';

// Set up crypto polyfill using expo-crypto (SDK 48+)
if (typeof crypto === 'undefined') {
  const webCrypto = {
    getRandomValues,
    // Add other Web Crypto API methods if needed
    subtle: {} // Placeholder for SubtleCrypto
  };

  if (typeof global !== 'undefined') {
    global.crypto = webCrypto;
  } else if (typeof window !== 'undefined') {
    window.crypto = webCrypto;
  }
}

// Ensure global Buffer is available
global.Buffer = Buffer;
global.process = process;

// Add any missing Web3 dependencies
if (typeof global.btoa === 'undefined') {
  global.btoa = function (str) {
    return Buffer.from(str, 'binary').toString('base64');
  };
}

if (typeof global.atob === 'undefined') {
  global.atob = function (b64Encoded) {
    return Buffer.from(b64Encoded, 'base64').toString('binary');
  };
} 