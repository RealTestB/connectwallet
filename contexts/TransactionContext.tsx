import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface Transaction {
  hash: string;
  type: 'NFT_TRANSFER' | 'TOKEN_TRANSFER' | 'ETH_TRANSFER';
  status: TransactionStatus;
  from: string;
  to: string;
  timestamp: string;
  // NFT specific fields
  tokenId?: string;
  contractAddress?: string;
  nftName?: string;
  nftImage?: string;
  // Token specific fields
  amount?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
  // Gas info
  gasPrice?: string;
  gasLimit?: string;
  // Error info
  error?: string;
}

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (hash: string, updates: Partial<Transaction>) => void;
  getTransaction: (hash: string) => Transaction | undefined;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load transactions from storage on mount
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEYS.TRANSACTIONS);
        if (stored) {
          const parsedTransactions = JSON.parse(stored);
          console.log('[TransactionContext] Loaded stored transactions:', parsedTransactions.length);
          setTransactions(parsedTransactions);
        }
      } catch (error) {
        console.error('[TransactionContext] Error loading transactions:', error);
      }
    };
    loadTransactions();
  }, []);

  // Save transactions whenever they change
  useEffect(() => {
    const saveTransactions = async () => {
      try {
        await SecureStore.setItemAsync(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
        console.log('[TransactionContext] Saved transactions:', transactions.length);
      } catch (error) {
        console.error('[TransactionContext] Error saving transactions:', error);
      }
    };
    saveTransactions();
  }, [transactions]);

  const addTransaction = useCallback((transaction: Transaction) => {
    console.log('[TransactionContext] Adding transaction:', transaction.hash);
    setTransactions(prev => [transaction, ...prev]);
  }, []);

  const updateTransaction = useCallback((hash: string, updates: Partial<Transaction>) => {
    console.log('[TransactionContext] Updating transaction:', { hash, updates });
    setTransactions(prev => 
      prev.map(tx => 
        tx.hash === hash ? { ...tx, ...updates } : tx
      )
    );
  }, []);

  const getTransaction = useCallback((hash: string) => {
    return transactions.find(tx => tx.hash === hash);
  }, [transactions]);

  return (
    <TransactionContext.Provider value={{
      transactions,
      addTransaction,
      updateTransaction,
      getTransaction,
    }}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}; 