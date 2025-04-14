import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';
import config from '../api/config';
import { useAuth } from './AuthContext';
import { getStoredWallet } from '../api/walletApi';

interface WalletAccount {
  id: string;
  address: string;
  name?: string;
  chainId?: number;
}

interface WalletAccountsContextType {
  accounts: WalletAccount[];
  currentAccount: WalletAccount | null;
  isLoading: boolean;
  error: string | null;
  loadAccounts: () => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
  refreshAccounts: () => Promise<void>;
}

const WalletAccountsContext = createContext<WalletAccountsContextType | undefined>(undefined);

export const useWalletAccounts = () => {
  const context = useContext(WalletAccountsContext);
  if (context === undefined) {
    throw new Error('useWalletAccounts must be used within a WalletAccountsProvider');
  }
  return context;
};

export function WalletAccountsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<WalletAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cache for wallet data
  const [walletDataCache, setWalletDataCache] = useState<WalletAccount[] | null>(null);

  // Load accounts when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAccounts();
    }
  }, [isAuthenticated]);

  const refreshAccounts = useCallback(async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      await loadAccounts(true); // Force refresh
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  const loadAccounts = useCallback(async (forceRefresh = false) => {
    console.log('[WalletAccounts] Starting loadAccounts', { forceRefresh });
    
    // If we have cached data and it's not too old, use it
    const now = Date.now();
    if (!forceRefresh && walletDataCache && (now - lastLoadTime) < 30000) {
      console.log('[WalletAccounts] Using cached data');
      setAccounts(walletDataCache);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get wallet data from SecureStore first
      console.log('[WalletAccounts] Getting stored wallet data');
      const walletData = await getStoredWallet();
      if (!walletData) {
        console.log('[WalletAccounts] No wallet data found');
        setAccounts([]);
        setCurrentAccount(null);
        setIsLoading(false);
        return;
      }

      const userId = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
      if (!userId) {
        console.log('[WalletAccounts] No user ID found');
        setAccounts([]);
        setCurrentAccount(null);
        setIsLoading(false);
        return;
      }

      console.log('[WalletAccounts] Making API request for wallets');
      // Make API request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        // Replace fetch with XMLHttpRequest
        const loadWallets = () => new Promise<any[]>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', `${config.supabase.url}/rest/v1/wallets?user_id=eq.${userId}&order=created_at.asc`);
          
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('apikey', config.supabase.serviceRoleKey);
          xhr.setRequestHeader('Prefer', 'return=representation');

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                if (Array.isArray(response)) {
                  resolve(response);
                } else {
                  reject(new Error('Invalid response format'));
                }
              } catch (error) {
                reject(new Error('Failed to parse response'));
              }
            } else {
              reject(new Error(`Failed to load accounts: ${xhr.statusText}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Network error occurred'));
          });

          xhr.addEventListener('timeout', () => {
            xhr.abort();
            reject(new Error('Request timed out'));
          });

          xhr.timeout = 10000; // 10 second timeout
          xhr.send();
        });

        const walletAccounts = await loadWallets();
        console.log('[WalletAccounts] Loaded accounts:', walletAccounts.length);

        // If no accounts found, create one from the stored wallet
        if (walletAccounts.length === 0 && walletData.address) {
          console.log('[WalletAccounts] No accounts found, using stored wallet');
          const singleAccount: WalletAccount = {
            id: '1',
            address: walletData.address,
            chainId: walletData.chainId
          };
          setAccounts([singleAccount]);
          setCurrentAccount(singleAccount);
          setWalletDataCache([singleAccount]);
          setLastLoadTime(now);
          setIsLoading(false);
          return;
        }

        const loadedAccounts = walletAccounts.map((wallet: any) => ({
          id: wallet.id,
          address: wallet.public_address,
          name: wallet.name,
          chainId: walletData.chainId
        }));

        console.log('[WalletAccounts] Processed accounts:', loadedAccounts.length);

        // Update cache
        setWalletDataCache(loadedAccounts);
        setLastLoadTime(now);

        // Batch state updates
        setAccounts(loadedAccounts);
        
        if (loadedAccounts.length > 0) {
          const currentAccountId = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_ADDRESS);
          const existingAccount = loadedAccounts.find((acc: WalletAccount) => acc.address === currentAccountId);
          setCurrentAccount(existingAccount || loadedAccounts[0]);
        } else {
          setCurrentAccount(null);
        }
      } catch (error: any) {
        console.error('[WalletAccounts] Error loading accounts:', error);
        throw error;
      }
    } catch (error) {
      console.error('[WalletAccounts] Error in loadAccounts:', error);
      setError('Failed to load accounts');
      
      // If we have a stored wallet, use it as fallback
      const walletData = await getStoredWallet();
      if (walletData?.address) {
        console.log('[WalletAccounts] Using stored wallet as fallback');
        const fallbackAccount: WalletAccount = {
          id: '1',
          address: walletData.address,
          chainId: walletData.chainId
        };
        setAccounts([fallbackAccount]);
        setCurrentAccount(fallbackAccount);
      }
    } finally {
      console.log('[WalletAccounts] Finished loading accounts');
      setIsLoading(false);
    }
  }, [lastLoadTime, walletDataCache]);

  const switchAccount = useCallback(async (accountId: string) => {
    try {
      const account = accounts.find(acc => acc.id === accountId);
      if (account) {
        setCurrentAccount(account);
        await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_ADDRESS, account.address);
      }
    } catch (error) {
      console.error('[WalletAccounts] Error in switchAccount:', error);
    }
  }, [accounts]);

  const value = {
    accounts,
    currentAccount,
    isLoading,
    error,
    loadAccounts,
    switchAccount,
    refreshAccounts
  };

  return (
    <WalletAccountsContext.Provider value={value}>
      {children}
    </WalletAccountsContext.Provider>
  );
} 