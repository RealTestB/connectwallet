import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import { encryptSeedPhrase, decryptSeedPhrase } from './securityApi';
import { STORAGE_KEYS } from '../constants/storageKeys';

export interface SeedPhraseData {
  phrase: string;
  path: string;
  locale: string;
}

/**
 * Generate a new seed phrase
 */
export const generateSeedPhrase = (
  wordCount: 12 | 15 | 18 | 21 | 24 = 12,
  locale: string = 'en'
): SeedPhraseData => {
  try {
    // Generate entropy based on word count
    const entropyBytes = Math.floor(wordCount * 4 / 3);
    const entropy = ethers.randomBytes(entropyBytes);
    
    // Generate mnemonic from entropy
    const phrase = ethers.Wallet.createRandom().mnemonic?.phrase || '';
    
    return {
      phrase,
      path: ethers.defaultPath,
      locale
    };
  } catch (error) {
    console.error('Error generating seed phrase:', error);
    throw error;
  }
};

/**
 * Validate a seed phrase
 */
export const validateSeedPhrase = (phrase: string, locale: string = 'en'): boolean => {
  try {
    return ethers.Wallet.fromPhrase(phrase) !== null;
  } catch (error) {
    console.error('Error validating seed phrase:', error);
    return false;
  }
};

/**
 * Store encrypted seed phrase
 */
export const storeSeedPhrase = async (
  phrase: string,
  password: string
): Promise<void> => {
  try {
    const encryptedPhrase = await encryptSeedPhrase(phrase, password);
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_SEED_PHRASE, encryptedPhrase);
  } catch (error) {
    console.error('Error storing seed phrase:', error);
    throw error;
  }
};

/**
 * Retrieve and decrypt seed phrase
 */
export const getSeedPhrase = async (password: string): Promise<string> => {
  try {
    const encryptedPhrase = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_SEED_PHRASE);
    if (!encryptedPhrase) {
      throw new Error('No seed phrase found');
    }
    return await decryptSeedPhrase(encryptedPhrase, password);
  } catch (error) {
    console.error('Error getting seed phrase:', error);
    throw error;
  }
};

/**
 * Delete stored seed phrase
 */
export const deleteSeedPhrase = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_SEED_PHRASE);
  } catch (error) {
    console.error('Error deleting seed phrase:', error);
    throw error;
  }
}; 