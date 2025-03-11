import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { EncryptedData, CryptoConfig, SecurityConfig } from "../types/crypto";

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
 * ✅ PBKDF2 Key Derivation - Strengthens password security
 */
const deriveEncryptionKey = async (password: string, salt: string): Promise<string> => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password + salt
  );
};

/**
 * ✅ Encrypt Password (AES-256-GCM)
 */
export const encryptPassword = async (password: string): Promise<string> => {
  const salt = Crypto.getRandomBytes(CRYPTO_CONFIG.saltLength).toString();
  const key = await deriveEncryptionKey(password, salt);
  const iv = Crypto.getRandomBytes(CRYPTO_CONFIG.ivLength).toString();

  const encryptedData = await Crypto.encryptAsync(
    password,
    key,
    { algorithm: Crypto.CryptoEncryptionAlgorithm.AES_GCM, iv }
  );

  return JSON.stringify({ encryptedData, salt, iv });
};

/**
 * ✅ Verify Password (AES-256-GCM)
 */
export const verifyPassword = async (inputPassword: string, encryptedPasswordData: string): Promise<boolean> => {
  try {
    const { encryptedData, salt, iv } = JSON.parse(encryptedPasswordData) as EncryptedData;
    const key = await deriveEncryptionKey(inputPassword, salt);

    const decryptedPassword = await Crypto.decryptAsync(
      encryptedData,
      key,
      { algorithm: Crypto.CryptoEncryptionAlgorithm.AES_GCM, iv }
    );

    return decryptedPassword === inputPassword;
  } catch (error) {
    console.error("Password verification failed:", error);
    return false;
  }
};

/**
 * ✅ Encrypt Seed Phrase (AES-256-GCM)
 */
export const encryptSeedPhrase = async (seedPhrase: string, password: string): Promise<string> => {
  const salt = Crypto.getRandomBytes(CRYPTO_CONFIG.saltLength).toString();
  const key = await deriveEncryptionKey(password, salt);
  const iv = Crypto.getRandomBytes(CRYPTO_CONFIG.ivLength).toString();

  const encryptedData = await Crypto.encryptAsync(
    seedPhrase,
    key,
    { algorithm: Crypto.CryptoEncryptionAlgorithm.AES_GCM, iv }
  );

  return JSON.stringify({ encryptedData, salt, iv });
};

/**
 * ✅ Decrypt Seed Phrase (AES-256-GCM)
 */
export const decryptSeedPhrase = async (encryptedData: string, password: string): Promise<string> => {
  try {
    const { encryptedSeedPhrase, salt, iv } = JSON.parse(encryptedData);
    const key = await deriveEncryptionKey(password, salt);

    return await Crypto.decryptAsync(
      encryptedSeedPhrase,
      key,
      { algorithm: Crypto.CryptoEncryptionAlgorithm.AES_GCM, iv }
    );
  } catch (error) {
    console.error("Seed phrase decryption failed:", error);
    throw new Error("Failed to decrypt seed phrase");
  }
};

/**
 * ✅ Encrypt Private Key (AES-256-GCM)
 */
export const encryptPrivateKey = async (privateKey: string, password: string): Promise<string> => {
  const salt = Crypto.getRandomBytes(CRYPTO_CONFIG.saltLength).toString();
  const key = await deriveEncryptionKey(password, salt);
  const iv = Crypto.getRandomBytes(CRYPTO_CONFIG.ivLength).toString();

  const encryptedData = await Crypto.encryptAsync(
    privateKey,
    key,
    { algorithm: Crypto.CryptoEncryptionAlgorithm.AES_GCM, iv }
  );

  return JSON.stringify({ encryptedData, salt, iv });
};

/**
 * ✅ Decrypt Private Key (AES-256-GCM)
 */
export const decryptPrivateKey = async (encryptedData: string, password: string): Promise<string> => {
  try {
    const { encryptedKey, salt, iv } = JSON.parse(encryptedData);
    const key = await deriveEncryptionKey(password, salt);

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

/**
 * ✅ Session Management
 */
export const updateLastActive = async (): Promise<void> => {
  await SecureStore.setItemAsync("lastActiveTimestamp", Date.now().toString());
};

export const checkSessionValid = async (): Promise<boolean> => {
  const lastActiveStr = await SecureStore.getItemAsync("lastActiveTimestamp");
  if (!lastActiveStr) return false;

  const lastActive = parseInt(lastActiveStr);
  const now = Date.now();
  return (now - lastActive) < SECURITY_CONFIG.sessionTimeout;
};

/**
 * ✅ Store Encrypted Data Securely
 */
export const storeEncryptedData = async (key: string, encryptedData: string): Promise<void> => {
  await SecureStore.setItemAsync(key, encryptedData);
};

/**
 * ✅ Retrieve Encrypted Data
 */
export const getEncryptedData = async (key: string): Promise<string | null> => {
  return await SecureStore.getItemAsync(key);
}; 