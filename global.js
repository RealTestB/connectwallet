// Essential polyfills for React Native
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import process from 'process';

// Initialize gesture handler
import 'react-native-gesture-handler';

// Set up Buffer global
global.Buffer = Buffer;

// Set up process global
global.process = process;

// Handle require gracefully
if (typeof global.require === 'undefined') {
  global.require = (moduleName) => {
    throw new Error(`Dynamic require calls are not supported. Failed to require: ${moduleName}`);
  };
}

// Initialize other required globals
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');

// Crypto polyfills
if (typeof global.crypto === 'undefined') {
  global.crypto = require('crypto-browserify');
} 