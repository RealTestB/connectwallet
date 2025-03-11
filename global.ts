// Essential polyfills for React Native
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import process from 'process';

// Initialize gesture handler
import 'react-native-gesture-handler';

declare global {
  var Buffer: typeof Buffer;
  var process: typeof process;
  function btoa(str: string): string;
  function atob(str: string): string;
  var crypto: Crypto;
}

// Set up Buffer global
global.Buffer = Buffer;

// Set up process global
global.process = process;

// Initialize other required globals
global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');

// Crypto polyfills
if (typeof global.crypto === 'undefined') {
  global.crypto = require('crypto-browserify');
} 