// Import console polyfill first
import './console-polyfill';

/**
 * Enhanced crypto polyfill with better error handling and fallbacks
 */
const setupCryptoPolyfill = () => {
  try {
    console.log('Setting up crypto polyfills...');
    
    // Import required libraries
    const importExpoRandomValues = () => {
      try {
        return require('expo-crypto').getRandomValues;
      } catch (error) {
        console.warn('Failed to import expo-crypto getRandomValues, will try fallback:', error);
        return null;
      }
    };
    
    const importReactNativeRandomValues = () => {
      try {
        return require('react-native-get-random-values').getRandomValues;
      } catch (error) {
        console.warn('Failed to import react-native-get-random-values, will try fallback:', error);
        return null;
      }
    };
    
    // Try to import random values functions
    const expoCryptoGetRandomValues = importExpoRandomValues();
    const reactNativeGetRandomValues = importReactNativeRandomValues();
    
    // Import ethers shims
    try {
      require('@ethersproject/shims');
    } catch (error) {
      console.warn('Failed to import ethersproject shims:', error);
    }
    
    // Import buffer
    const Buffer = require('buffer').Buffer;
    
    // Import process
    const process = require('process');
    
    // Try to import WalletConnect compat
    try {
      require('@walletconnect/react-native-compat');
    } catch (error) {
      console.warn('Failed to import WalletConnect compat:', error);
    }
    
    // Set up crypto polyfill
    if (typeof global.crypto === 'undefined' || !global.crypto.getRandomValues) {
      const getRandomValues = (buffer) => {
        // Try expo-crypto first
        if (expoCryptoGetRandomValues) {
          try {
            const bytes = expoCryptoGetRandomValues(new Uint8Array(buffer.length));
            buffer.set(bytes);
            return buffer;
          } catch (error) {
            console.warn('expo-crypto getRandomValues failed:', error);
          }
        }
        
        // Try react-native-get-random-values as backup
        if (reactNativeGetRandomValues) {
          try {
            return reactNativeGetRandomValues(buffer);
          } catch (error) {
            console.warn('react-native-get-random-values failed:', error);
          }
        }
        
        // Last resort fallback (not cryptographically secure)
        console.warn('Using fallback for getRandomValues (not secure)');
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = Math.floor(Math.random() * 256);
        }
        return buffer;
      };
      
      const webCrypto = {
        getRandomValues,
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
    
    console.log('Crypto polyfills initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to set up crypto polyfills:', error);
    return false;
  }
};

// Run the setup
setupCryptoPolyfill();