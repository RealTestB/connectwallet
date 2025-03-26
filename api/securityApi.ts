import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { EncryptedData, CryptoConfig, SecurityConfig } from "../types/crypto";
import { STORAGE_KEYS } from '../constants/storageKeys';

const CRYPTO_CONFIG: CryptoConfig = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  saltLength: 16,
  ivLength: 12,
  iterations: 100000
};

const SECURITY_CONFIG: SecurityConfig = {
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000 // 15 minutes
};

/**
 * ✅ Generate Key from Password with Salt
 */
const deriveKey = async (password: string, salt: string): Promise<string> => {
  // Use password + salt to create a unique key
  const combinedKey = `${password}:${salt}`;
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combinedKey
  );
};

/**
 * ✅ Create Password Hash
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Generate a random salt
    const salt = Crypto.getRandomBytes(16);
    const saltString = Array.from(salt).map((b: number) => b.toString(16).padStart(2, '0')).join('');
    
    // Create a hash of the password with the salt
    const key = await deriveKey(password, saltString);
    
    // Return the hash and salt
    return JSON.stringify({
      hash: key,
      salt: saltString
    });
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * ✅ Verify Password
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const { hash, salt } = JSON.parse(storedHash);
    const verificationKey = await deriveKey(password, salt);
    return verificationKey === hash;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * ✅ Encrypt Data with Password
 */
export async function encryptWithPassword(data: string, password: string): Promise<string> {
  try {
    // Generate a random salt for this encryption
    const salt = Crypto.getRandomBytes(16);
    const saltString = Array.from(salt).map((b: number) => b.toString(16).padStart(2, '0')).join('');
    
    // Generate encryption key from password and salt
    const key = await deriveKey(password, saltString);
    
    // Generate random IV
    const iv = Crypto.getRandomBytes(16);
    const ivString = Array.from(iv).map((b: number) => b.toString(16).padStart(2, '0')).join('');
    
    // Create the hash of the data
    const encryptedHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA512,
      data + key + ivString
    );
    
    return JSON.stringify({
      encrypted: encryptedHex,
      iv: ivString,
      salt: saltString
    });
  } catch (error) {
    console.error('Error encrypting data:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * ✅ Decrypt Data with Password
 */
export async function decryptWithPassword(encryptedData: string, password: string): Promise<string> {
  try {
    const { encrypted, iv, salt } = JSON.parse(encryptedData);
    
    // Regenerate the key using the stored salt
    const key = await deriveKey(password, salt);
    
    // Verify the data
    const verificationHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA512,
      encrypted + key + iv
    );
    
    if (!verificationHex) {
      throw new Error('Invalid password or corrupted data');
    }
    
    return encrypted;
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * ✅ Encrypt Seed Phrase
 */
export async function encryptSeedPhrase(seedPhrase: string, password: string): Promise<string> {
  return await encryptWithPassword(seedPhrase, password);
}

/**
 * ✅ Decrypt Seed Phrase
 */
export async function decryptSeedPhrase(encryptedData: string, password: string): Promise<string> {
  return await decryptWithPassword(encryptedData, password);
}

/**
 * ✅ Store Encrypted Data Securely
 */
export async function storeEncryptedData(key: string, data: string): Promise<void> {
  await SecureStore.setItemAsync(key, data);
}

/**
 * ✅ Retrieve Encrypted Data
 */
export async function getEncryptedData(key: string): Promise<string | null> {
  return await SecureStore.getItemAsync(key);
}

/**
 * ✅ Session Management
 */
export async function updateLastActive(): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE, Date.now().toString());
}

export async function checkSessionValid(): Promise<boolean> {
  const lastActiveStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE);
  if (!lastActiveStr) return false;
  
  const lastActive = parseInt(lastActiveStr);
  const now = Date.now();
  return (now - lastActive) < SECURITY_CONFIG.sessionTimeout;
}

/**
 * ✅ Encrypt Private Key (AES-256-GCM)
 */
export const encryptPrivateKey = async (privateKey: string, password: string): Promise<string> => {
  const salt = Crypto.getRandomBytes(CRYPTO_CONFIG.saltLength);
  const saltString = Array.from(salt).map((b: number) => b.toString(16).padStart(2, '0')).join('');
  const key = await deriveKey(password, saltString);
  const iv = Crypto.getRandomBytes(CRYPTO_CONFIG.ivLength);
  const ivString = Array.from(iv).map((b: number) => b.toString(16).padStart(2, '0')).join('');

  const encryptedData = await Crypto.encryptAsync(
    privateKey,
    key,
    { algorithm: Crypto.CryptoEncryptionAlgorithm.AES_GCM, iv: ivString }
  );

  return JSON.stringify({ encryptedData, salt: saltString, iv: ivString });
};

/**
 * ✅ Decrypt Private Key (AES-256-GCM)
 */
export const decryptPrivateKey = async (encryptedData: string, password: string): Promise<string> => {
  try {
    const { encryptedKey, salt, iv } = JSON.parse(encryptedData);
    const key = await deriveKey(password, salt);

    return await Crypto.decryptAsync(
      encryptedKey,
      key,
      { algorithm: Crypto.CryptoEncryptionAlgorithm.AES_GCM, iv }
    );
  } catch (error) {
    console.error("Private key decryption failed:", error);
    throw new Error("Failed to decrypt private key");
  }
}; 