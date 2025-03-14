// Required crypto polyfills
import './src/crypto-polyfill';
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
