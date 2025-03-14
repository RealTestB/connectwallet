import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import config from './config';

export interface AuthData {
  isAuthenticated: boolean;
  hasWallet: boolean;
  walletAddress: string | null;
}

/**
 * Check authentication status
 */
export const checkAuth = async (): Promise<AuthData> => {
  console.log('[AuthApi] Checking authentication status');
  try {
    const [privateKey, walletAddress] = await Promise.all([
      SecureStore.getItemAsync('privateKey'),
      SecureStore.getItemAsync('walletAddress')
    ]);

    const hasWallet = !!(privateKey && walletAddress);
    const isAuthenticated = hasWallet;

    console.log('[AuthApi] Auth check result:', {
      isAuthenticated,
      hasWallet,
      walletAddress: walletAddress || null
    });

    return {
      isAuthenticated,
      hasWallet,
      walletAddress: walletAddress || null
    };
  } catch (error) {
    console.error('[AuthApi] Error checking auth:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to check authentication status');
  }
};

/**
 * Create a new wallet
 */
export const createWallet = async (password: string): Promise<string> => {
  console.log('[AuthApi] Creating new wallet');
  try {
    const wallet = ethers.Wallet.createRandom();
    console.log('[AuthApi] Generated new wallet address:', wallet.address);

    await Promise.all([
      SecureStore.setItemAsync('privateKey', wallet.privateKey),
      SecureStore.setItemAsync('walletAddress', wallet.address),
      SecureStore.setItemAsync('walletPassword', password)
    ]);

    console.log('[AuthApi] Wallet credentials stored securely');
    return wallet.address;
  } catch (error) {
    console.error('[AuthApi] Error creating wallet:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to create wallet');
  }
};

/**
 * Import an existing wallet
 */
export const importWallet = async (privateKey: string, password: string): Promise<string> => {
  console.log('[AuthApi] Importing wallet');
  try {
    const wallet = new ethers.Wallet(privateKey);
    console.log('[AuthApi] Imported wallet address:', wallet.address);

    await Promise.all([
      SecureStore.setItemAsync('privateKey', wallet.privateKey),
      SecureStore.setItemAsync('walletAddress', wallet.address),
      SecureStore.setItemAsync('walletPassword', password)
    ]);

    console.log('[AuthApi] Wallet credentials stored securely');
    return wallet.address;
  } catch (error) {
    console.error('[AuthApi] Error importing wallet:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to import wallet');
  }
};

/**
 * Sign in to an existing wallet
 */
export const signIn = async (password: string): Promise<AuthData> => {
  console.log('[AuthApi] Signing in');
  try {
    const storedPassword = await SecureStore.getItemAsync('walletPassword');
    if (!storedPassword || storedPassword !== password) {
      console.error('[AuthApi] Invalid password');
      throw new Error('Invalid password');
    }

    const [privateKey, walletAddress] = await Promise.all([
      SecureStore.getItemAsync('privateKey'),
      SecureStore.getItemAsync('walletAddress')
    ]);

    if (!privateKey || !walletAddress) {
      console.error('[AuthApi] Wallet credentials not found');
      throw new Error('Wallet credentials not found');
    }

    console.log('[AuthApi] Sign in successful');
    return {
      isAuthenticated: true,
      hasWallet: true,
      walletAddress
    };
  } catch (error) {
    console.error('[AuthApi] Error signing in:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Sign out
 */
export const signOut = async (): Promise<void> => {
  console.log('[AuthApi] Signing out');
  try {
    await Promise.all([
      SecureStore.deleteItemAsync('privateKey'),
      SecureStore.deleteItemAsync('walletAddress'),
      SecureStore.deleteItemAsync('walletPassword')
    ]);
    console.log('[AuthApi] Sign out successful');
  } catch (error) {
    console.error('[AuthApi] Error signing out:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to sign out');
  }
}; 