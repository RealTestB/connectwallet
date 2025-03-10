// Essential polyfills for React Native
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import process from 'process';

// Set up Buffer global
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

// Set up process global
if (typeof global.process === 'undefined') {
  global.process = process;
}

// Handle require gracefully
if (typeof global.require === 'undefined') {
  global.require = (moduleName) => {
    throw new Error(`Dynamic require calls are not supported. Failed to require: ${moduleName}`);
  };
} 