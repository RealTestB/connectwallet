import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { ethers } from 'ethers';
import { STORAGE_KEYS } from '../constants/storageKeys';
import config from '../api/config';
import { decryptSeedPhrase } from '../api/securityApi';
import { useAuth } from './AuthContext';
import Constants from 'expo-constants';

interface WalletAccount {
  id: string;
  name: string;
  address: string;
  accountIndex: number;
  isPrimary: boolean;
}

interface WalletAccountsContextType {
  accounts: WalletAccount[];
  currentAccount: WalletAccount | null;
  isLoading: boolean;
  error: string | null;
  loadAccounts: () => Promise<void>;
  setCurrentAccount: (account: WalletAccount) => void;
  addAccount: (name?: string) => Promise<void>;
  importPrivateKey: (privateKey: string, name?: string) => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
  renameAccount: (accountId: string, newName: string) => Promise<void>;
  setPrimaryAccount: (accountId: string) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  updateAccount: (id: string, updates: Partial<WalletAccount>) => void;
  deleteAccount: (id: string) => void;
}

const WalletAccountsContext = createContext<WalletAccountsContextType | undefined>(undefined);

// Helper function to make Supabase requests
const makeSupabaseRequest = (url: string, method: string, body?: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 30000;

    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState !== 4) return;

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const responseText = xhr.status === 201 && !xhr.responseText ? '[]' : xhr.responseText;
          const data = responseText ? JSON.parse(responseText) : null;
          resolve(data);
        } catch (error) {
          console.error('Failed to parse response:', error);
          reject(new Error('Failed to parse response'));
        }
      } else {
        let errorMessage = `Request failed with status ${xhr.status}`;
        try {
          if (xhr.responseText) {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          }
        } catch (e) {
          // Ignore JSON parse error
        }
        reject(new Error(errorMessage));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network request failed'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Request timed out'));
    });

    xhr.open(method, `${config.supabase.url}${url}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('apikey', config.supabase.serviceRoleKey);
    xhr.setRequestHeader('Prefer', 'return=representation');

    xhr.send(body ? JSON.stringify(body) : null);
  });
};

export const useWalletAccounts = () => {
  const context = useContext(WalletAccountsContext);
  if (context === undefined) {
    throw new Error('useWalletAccounts must be used within a WalletAccountsProvider');
  }
  return context;
};

export function WalletAccountsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasWallet } = useAuth();
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<WalletAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only load accounts when authenticated and has wallet
  useEffect(() => {
    if (isAuthenticated && hasWallet) {
      loadAccounts();
    }
  }, [isAuthenticated, hasWallet]);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First check if we have wallet data
      const walletData = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      if (!walletData) {
        console.log('[WalletAccounts] No wallet data found');
        setAccounts([]);
        setCurrentAccount(null);
        return;
      }

      const userId = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
      if (!userId) {
        console.log('[WalletAccounts] No user ID found');
        setAccounts([]);
        setCurrentAccount(null);
        return;
      }

      // Load all wallet accounts for this user
      const walletAccounts = await makeSupabaseRequest(
        `/rest/v1/wallets?user_id=eq.${userId}&order=created_at.asc`,
        'GET'
      );

      const loadedAccounts = walletAccounts.map((wallet: any, index: number) => ({
        id: wallet.id,
        name: wallet.name || `Account ${index + 1}`,
        address: wallet.public_address,
        accountIndex: wallet.account_index ?? index,
        isPrimary: wallet.is_primary
      }));

      setAccounts(loadedAccounts);
      
      // Set current account to primary or first account
      const primaryAccount = loadedAccounts.find((acc: WalletAccount) => acc.isPrimary) || loadedAccounts[0];
      if (primaryAccount) {
        setCurrentAccount(primaryAccount);
      }
    } catch (error) {
      console.error('[WalletAccounts] Error loading accounts:', error);
      setError('Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const deriveNewAccount = async () => {
    try {
      // Get the encrypted seed phrase and password
      const encryptedSeedPhrase = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_SEED_PHRASE);
      const password = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PASSWORD);
      
      if (!encryptedSeedPhrase || !password) {
        throw new Error('No seed phrase or password found');
      }

      // Decrypt the seed phrase
      const seedPhrase = await decryptSeedPhrase(encryptedSeedPhrase, password);

      // Get the next account index
      const nextIndex = accounts.length;

      // Derive the new account
      const hdNode = ethers.HDNodeWallet.fromPhrase(seedPhrase);
      const path = `m/44'/60'/0'/0/${nextIndex}`;
      const account = hdNode.derivePath(path);

      return {
        privateKey: account.privateKey,
        address: account.address,
        accountIndex: nextIndex
      };
    } catch (error) {
      console.error('Error deriving new account:', error);
      throw error;
    }
  };

  const addAccount = async (name?: string) => {
    try {
      setIsLoading(true);
      const { privateKey, address, accountIndex } = await deriveNewAccount();
      
      const userId = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
      if (!userId) throw new Error('No user ID found');

      const newWallet = await makeSupabaseRequest(
        '/rest/v1/wallets',
        'POST',
        {
          user_id: userId,
          name: name || `Account ${accountIndex + 1}`,
          public_address: address,
          encrypted_private_key: privateKey,
          account_index: accountIndex,
          is_primary: accounts.length === 0
        }
      );

      const account: WalletAccount = {
        id: newWallet[0].id,
        name: newWallet[0].name,
        address: newWallet[0].public_address,
        accountIndex: newWallet[0].account_index,
        isPrimary: newWallet[0].is_primary
      };

      setAccounts(prev => [...prev, account]);
      if (accounts.length === 0) {
        setCurrentAccount(account);
      }
    } catch (error) {
      console.error('[WalletAccounts] Error adding account:', error);
      setError('Failed to add account');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const importPrivateKey = async (privateKey: string, name?: string) => {
    try {
      setIsLoading(true);
      const wallet = new ethers.Wallet(privateKey);
      const userId = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
      if (!userId) throw new Error('No user ID found');

      const newWallet = await makeSupabaseRequest(
        '/rest/v1/wallets',
        'POST',
        {
          user_id: userId,
          name: name || `Imported Account ${accounts.length + 1}`,
          public_address: wallet.address,
          encrypted_private_key: privateKey,
          account_index: -1,
          is_primary: accounts.length === 0,
          imported: true
        }
      );

      const account: WalletAccount = {
        id: newWallet[0].id,
        name: newWallet[0].name,
        address: newWallet[0].public_address,
        accountIndex: -1,
        isPrimary: newWallet[0].is_primary
      };

      setAccounts(prev => [...prev, account]);
      if (accounts.length === 0) {
        setCurrentAccount(account);
      }
    } catch (error) {
      console.error('[WalletAccounts] Error importing account:', error);
      setError('Failed to import account');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const switchAccount = async (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      setCurrentAccount(account);
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_ADDRESS, account.address);
    }
  };

  const renameAccount = async (accountId: string, newName: string) => {
    try {
      await makeSupabaseRequest(
        `/rest/v1/wallets?id=eq.${accountId}`,
        'PATCH',
        { name: newName }
      );

      setAccounts(prev => prev.map(acc => 
        acc.id === accountId ? { ...acc, name: newName } : acc
      ));
    } catch (error) {
      console.error('[WalletAccounts] Error renaming account:', error);
      setError('Failed to rename account');
      throw error;
    }
  };

  const setPrimaryAccount = async (accountId: string) => {
    try {
      await makeSupabaseRequest(
        '/rest/v1/wallets',
        'PATCH',
        { is_primary: false }
      );

      await makeSupabaseRequest(
        `/rest/v1/wallets?id=eq.${accountId}`,
        'PATCH',
        { is_primary: true }
      );

      setAccounts(prev => prev.map(acc => ({
        ...acc,
        isPrimary: acc.id === accountId
      })));

      const newPrimary = accounts.find(acc => acc.id === accountId);
      if (newPrimary) {
        setCurrentAccount(newPrimary);
        await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_ADDRESS, newPrimary.address);
      }
    } catch (error) {
      console.error('[WalletAccounts] Error setting primary account:', error);
      setError('Failed to set primary account');
      throw error;
    }
  };

  const removeAccount = async (accountId: string) => {
    try {
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) return;

      if (accounts.length === 1) {
        throw new Error('Cannot remove the last account');
      }

      if (account.isPrimary) {
        throw new Error('Cannot remove the primary account');
      }

      // Remove address from Alchemy webhook
      try {
        const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Missing Supabase configuration');
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/manage-webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            action: 'remove',
            address: account.address
          })
        });

        if (!response.ok) {
          console.error('❌ Failed to remove address from webhook:', await response.text());
        } else {
          console.log('✅ Removed address from Alchemy webhook');
        }
      } catch (webhookError) {
        console.error('❌ Error removing address from webhook:', webhookError);
        // Don't throw here - we still want to remove the account even if webhook fails
      }

      await makeSupabaseRequest(
        `/rest/v1/wallets?id=eq.${accountId}`,
        'DELETE'
      );

      setAccounts(prev => prev.filter(acc => acc.id !== accountId));
    } catch (error) {
      console.error('[WalletAccounts] Error removing account:', error);
      setError('Failed to remove account');
      throw error;
    }
  };

  const updateAccount = async (id: string, updates: Partial<WalletAccount>) => {
    try {
      setAccounts(prev => prev.map(acc => 
        acc.id === id ? { ...acc, ...updates } : acc
      ));
      
      if (currentAccount?.id === id) {
        setCurrentAccount(prev => prev ? { ...prev, ...updates } : prev);
      }
    } catch (error) {
      console.error('[WalletAccounts] Error updating account:', error);
      setError('Failed to update account');
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      if (currentAccount?.id === id) {
        const remainingAccounts = accounts.filter(acc => acc.id !== id);
        setCurrentAccount(remainingAccounts[0] || null);
      }
    } catch (error) {
      console.error('[WalletAccounts] Error deleting account:', error);
      setError('Failed to delete account');
    }
  };

  const value = {
    accounts,
    currentAccount,
    isLoading,
    error,
    loadAccounts,
    setCurrentAccount,
    addAccount,
    importPrivateKey,
    switchAccount,
    renameAccount,
    setPrimaryAccount,
    removeAccount,
    updateAccount,
    deleteAccount
  };

  return (
    <WalletAccountsContext.Provider value={value}>
      {children}
    </WalletAccountsContext.Provider>
  );
} 