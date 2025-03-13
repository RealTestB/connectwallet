// Required crypto polyfills
import 'react-native-get-random-values';
import './src/crypto-polyfill';
import '@walletconnect/react-native-compat';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import ErrorBoundary from './components/ErrorBoundary';
import { ExpoRoot } from 'expo-router';

declare global {
  interface NodeRequire {
    context: (path: string, deep?: boolean, filter?: RegExp) => any;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ExpoRoot context={require.context('./app')} />
    </ErrorBoundary>
  );
}
