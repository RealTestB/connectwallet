// Required crypto polyfills
import 'react-native-get-random-values';
import './src/crypto-polyfill';
import '@walletconnect/react-native-compat';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <Stack />
    </>
  );
}
