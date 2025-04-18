import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Wallet, ethers } from 'ethers';
import config from '../api/config';
import { STORAGE_KEYS } from '../constants/storageKeys';

interface WalletContextType {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  account: string | null;
  createWallet: () => Promise<string>;
  importWallet: (privateKey: string) => Promise<string>;
  importFromSeedPhrase: (seedPhrase: string) => Promise<string>;
  signTransaction: (transaction: ethers.Transaction) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);

  // Initialize wallet
  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      setIsLoading(true);
      
      // Load stored account if exists
      const address = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_ADDRESS);
      if (address) {
        setAccount(address);
      }
      
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize wallet:', err);
      setError('Failed to initialize wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const createWallet = async () => {
    try {
      const wallet = ethers.Wallet.createRandom();
      if (!wallet.mnemonic?.phrase) {
        throw new Error('Failed to generate seed phrase');
      }

      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_SEED_PHRASE, wallet.mnemonic.phrase);
      return wallet.address;
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  };

  const importWallet = async (privateKey: string) => {
    try {
      setIsLoading(true);
      // Create wallet instance from private key
      const wallet = new ethers.Wallet(privateKey);
      
      // Store the private key securely
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_PRIVATE_KEY, wallet.privateKey);
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_ADDRESS, wallet.address);
      
      setAccount(wallet.address);
      return wallet.address;
    } catch (err) {
      console.error('Failed to import wallet:', err);
      setError('Failed to import wallet');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const importFromSeedPhrase = async (seedPhrase: string) => {
    try {
      const wallet = ethers.Wallet.fromPhrase(seedPhrase);
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_SEED_PHRASE, seedPhrase);
      return wallet.address;
    } catch (error) {
      console.error('Error importing from seed phrase:', error);
      throw error;
    }
  };

  const signTransaction = async (transaction: ethers.Transaction) => {
    try {
      const privateKey = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PRIVATE_KEY);
      if (!privateKey) throw new Error('No private key found');
      
      const wallet = new ethers.Wallet(privateKey);
      const signedTx = await wallet.signTransaction(transaction);
      return signedTx;
    } catch (err) {
      console.error('Failed to sign transaction:', err);
      setError('Failed to sign transaction');
      throw err;
    }
  };

  const signMessage = async (message: string) => {
    try {
      const privateKey = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PRIVATE_KEY);
      if (!privateKey) throw new Error('No private key found');
      
      const wallet = new ethers.Wallet(privateKey);
      const signature = await wallet.signMessage(message);
      return signature;
    } catch (err) {
      console.error('Failed to sign message:', err);
      setError('Failed to sign message');
      throw err;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        isInitialized,
        isLoading,
        error,
        account,
        createWallet,
        importWallet,
        importFromSeedPhrase,
        signTransaction,
        signMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}; 