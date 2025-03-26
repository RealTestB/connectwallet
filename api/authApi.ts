import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import config from './config';
import { WalletData } from './walletApi';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { verifyPassword } from './securityApi';

export interface AuthData {
  isAuthenticated: boolean;
  wallet: WalletData | null;
}

/**
 * Check authentication status
 */
export const checkAuth = async (): Promise<AuthData> => {
  console.log('[AuthApi] Checking authentication status');
  try {
    const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    if (!walletDataStr) {
      console.log('[AuthApi] No wallet data found');
      return {
        isAuthenticated: false,
        wallet: null
      };
    }

    const walletData = JSON.parse(walletDataStr);
    const hasWallet = !!(walletData.address && walletData.privateKey);

    console.log('[AuthApi] Auth check result:', {
      hasWallet,
      walletAddress: walletData.address || null
    });

    return {
      isAuthenticated: hasWallet,
      wallet: hasWallet ? {
        address: walletData.address,
        type: 'classic',
        chainId: config.chain.chainId,
        hasPassword: true
      } : null
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
 * Sign in to an existing wallet
 */
export const signIn = async (password: string): Promise<AuthData> => {
  console.log('[AuthApi] Signing in');
  try {
    // Verify password
    const storedPassword = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PASSWORD);
    if (!storedPassword || storedPassword !== password) {
      console.error('[AuthApi] Invalid password');
      throw new Error('Invalid password');
    }

    // Get wallet data
    const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    if (!walletDataStr) {
      console.error('[AuthApi] Wallet data not found');
      throw new Error('Wallet data not found');
    }

    const walletData = JSON.parse(walletDataStr);
    if (!walletData.address || !walletData.privateKey) {
      console.error('[AuthApi] Invalid wallet data');
      throw new Error('Invalid wallet data');
    }

    // Update lastActive
    walletData.lastActive = Date.now().toString();
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, JSON.stringify(walletData));

    console.log('[AuthApi] Sign in successful');
    return {
      isAuthenticated: true,
      wallet: {
        address: walletData.address,
        type: 'classic',
        chainId: config.chain.chainId,
        hasPassword: true
      }
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
      SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_PRIVATE_KEY),
      SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_ADDRESS)
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

export const verifyWalletPassword = async (password: string): Promise<boolean> => {
  try {
    const storedPassword = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PASSWORD);
    if (!storedPassword) return false;
    return await verifyPassword(password, storedPassword);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}; 