import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import config from './config';
import { WalletData } from './walletApi';

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
    const [privateKey, walletAddress, walletPassword] = await Promise.all([
      SecureStore.getItemAsync(config.wallet.classic.storageKeys.privateKey),
      SecureStore.getItemAsync(config.wallet.classic.storageKeys.addresses),
      SecureStore.getItemAsync('walletPassword')
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
      wallet: hasWallet ? {
        address: walletAddress!,
        type: 'classic',
        chainId: config.chain.chainId,
        hasPassword: !!walletPassword
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
    const storedPassword = await SecureStore.getItemAsync('walletPassword');
    if (!storedPassword || storedPassword !== password) {
      console.error('[AuthApi] Invalid password');
      throw new Error('Invalid password');
    }

    const [privateKey, walletAddress] = await Promise.all([
      SecureStore.getItemAsync(config.wallet.classic.storageKeys.privateKey),
      SecureStore.getItemAsync(config.wallet.classic.storageKeys.addresses)
    ]);

    if (!privateKey || !walletAddress) {
      console.error('[AuthApi] Wallet credentials not found');
      throw new Error('Wallet credentials not found');
    }

    console.log('[AuthApi] Sign in successful');
    return {
      isAuthenticated: true,
      wallet: {
        address: walletAddress,
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
      SecureStore.deleteItemAsync(config.wallet.classic.storageKeys.privateKey),
      SecureStore.deleteItemAsync(config.wallet.classic.storageKeys.addresses),
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