// Essential polyfills for React Native
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import process from 'process';
import cryptoBrowserify from 'crypto-browserify';

// Initialize gesture handler
import 'react-native-gesture-handler';

declare global {
  // Use a more specific type for Buffer to avoid circular reference
  var Buffer: {
    from(data: string | ArrayBuffer | SharedArrayBuffer | Buffer | Array<any>, encoding?: string): Buffer;
    alloc(size: number): Buffer;
    allocUnsafe(size: number): Buffer;
    isBuffer(obj: any): boolean;
  };
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
  // @ts-ignore - crypto-browserify doesn't match the exact Crypto interface but provides the necessary functionality
  global.crypto = cryptoBrowserify;
} 