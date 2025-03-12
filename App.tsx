// Required crypto polyfills
import 'react-native-get-random-values';
import './src/crypto-polyfill';
import '@walletconnect/react-native-compat';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { updateLastActive } from './api/securityApi';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    const init = async () => {
      try {
        await updateLastActive();
      } catch (e) {
        console.error('Initialization failed:', e);
      } finally {
        // Hide splash screen once all resources are loaded
        await SplashScreen.hideAsync();
      }
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
