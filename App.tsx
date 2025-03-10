// Required crypto polyfills
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { updateLastActive } from './api/securityService';
import { Stack } from 'expo-router';

// Error boundary for crypto operations
const initializeCrypto = async () => {
  try {
    // Ensure crypto polyfills are working
    const testBuffer = Buffer.from('test');
    if (!testBuffer) throw new Error('Buffer not initialized');
    return true;
  } catch (error) {
    console.error('Crypto initialization failed:', error);
    return false;
  }
};

export default function App() {
  useEffect(() => {
    const init = async () => {
      await initializeCrypto();
      await updateLastActive();
    };
    init();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack />
    </>
  );
}
