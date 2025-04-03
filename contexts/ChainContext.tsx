import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { CHAINS } from '../constants/chains';

interface ChainContextType {
  currentChainId: number;
  setChainId: (chainId: number) => Promise<void>;
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

export function ChainProvider({ children }: { children: React.ReactNode }) {
  const [currentChainId, setCurrentChainId] = useState<number>(1); // Default to Ethereum mainnet

  // Load initial chain ID from storage
  useEffect(() => {
    const loadInitialChain = async () => {
      try {
        // First try to get from wallet data
        const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
        if (walletDataStr) {
          const walletData = JSON.parse(walletDataStr);
          if (walletData.chainId) {
            console.log('[ChainContext] Loading chain ID from wallet data:', walletData.chainId);
            setCurrentChainId(walletData.chainId);
            return;
          }
        }

        // If not in wallet data, try settings
        const lastUsedNetwork = await SecureStore.getItemAsync(STORAGE_KEYS.SETTINGS.LAST_USED_NETWORK);
        if (lastUsedNetwork && CHAINS[lastUsedNetwork]) {
          console.log('[ChainContext] Loading chain ID from settings:', CHAINS[lastUsedNetwork].chainId);
          setCurrentChainId(CHAINS[lastUsedNetwork].chainId);
          return;
        }

        // Default to Ethereum mainnet if nothing found
        console.log('[ChainContext] No stored chain ID found, defaulting to Ethereum mainnet');
        setCurrentChainId(1);
      } catch (error) {
        console.error('[ChainContext] Error loading initial chain ID:', error);
        setCurrentChainId(1); // Default to Ethereum mainnet on error
      }
    };

    loadInitialChain();
  }, []);

  // Function to update chain ID across all storage locations
  const setChainId = useCallback(async (chainId: number) => {
    try {
      console.log('[ChainContext] Setting chain ID:', chainId);
      
      // Update state
      setCurrentChainId(chainId);

      // Update wallet data
      const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      if (walletDataStr) {
        const walletData = JSON.parse(walletDataStr);
        walletData.chainId = chainId;
        await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, JSON.stringify(walletData));
      }

      // Update settings with network key
      const networkKey = Object.keys(CHAINS).find(key => 
        CHAINS[key].chainId === chainId
      ) || 'ethereum';
      await SecureStore.setItemAsync(STORAGE_KEYS.SETTINGS.LAST_USED_NETWORK, networkKey);

      console.log('[ChainContext] Chain ID updated successfully');
    } catch (error) {
      console.error('[ChainContext] Error updating chain ID:', error);
      throw error;
    }
  }, []);

  return (
    <ChainContext.Provider value={{ currentChainId, setChainId }}>
      {children}
    </ChainContext.Provider>
  );
}

export function useChain() {
  const context = useContext(ChainContext);
  if (context === undefined) {
    throw new Error('useChain must be used within a ChainProvider');
  }
  return context;
} 