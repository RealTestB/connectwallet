import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import cryptoBrowserify from 'crypto-browserify';
import * as Crypto from 'expo-crypto';

declare global {
  var Buffer: typeof Buffer;
}

export const initializeCrypto = async (): Promise<boolean> => {
  try {
    // Ensure Buffer is available globally
    if (typeof global.Buffer === 'undefined') {
      global.Buffer = Buffer;
    }

    // Initialize crypto-related globals
    if (typeof global.crypto === 'undefined') {
      // @ts-ignore
      global.crypto = cryptoBrowserify;
    }

    // Verify initialization
    const testBuffer = Buffer.from('test');
    if (!testBuffer) throw new Error('Buffer not initialized');

    return true;
  } catch (error) {
    console.error('Failed to initialize crypto:', error);
    return false;
  }
};

const generateSalt = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytes(16);
  return Buffer.from(randomBytes).toString('hex');
};

export const encryptPassword = async (password: string): Promise<string> => {
  try {
    // Generate a random salt
    const salt = await generateSalt();

    // Create SHA-256 hash of the password + salt
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + salt
    );

    // Return the password hash object in the expected format
    return JSON.stringify({
      hash: digest,
      salt: salt
    });
  } catch (error) {
    console.error('[Crypto] Error encrypting password:', error);
    throw error;
  }
};

export const verifyPassword = async (password: string, storedPasswordStr: string): Promise<boolean> => {
  try {
    const storedPassword = JSON.parse(storedPasswordStr);
    const { hash, salt } = storedPassword;

    // Hash the provided password with the stored salt
    const testHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + salt
    );

    return testHash === hash;
  } catch (error) {
    console.error('[Crypto] Error verifying password:', error);
    return false;
  }
}; 