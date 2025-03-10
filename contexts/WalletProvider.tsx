import React, { createContext, useContext, useState, useEffect } from 'react';
import { WalletKit } from '@reown/walletkit';
import type { SignClientTypes } from '@walletconnect/types';
import { Core } from '@walletconnect/core';
import { SessionTypes, ProposalTypes } from '@walletconnect/types';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import config from '../api/config';

// Initialize WalletConnect Core
const core = new Core({
  projectId: config.projectIds.walletConnect,
  relayUrl: 'wss://relay.walletconnect.com',
});

type WalletKitInstance = InstanceType<typeof WalletKit>;

interface WalletContextType {
  walletKit: WalletKitInstance | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  account: {
    address: string;
    chainId: number;
    features: any;
  } | null;
  connect: (uri: string) => Promise<void>;
  disconnect: () => Promise<void>;
  approveSession: (proposalId: number, namespaces: SessionTypes.Namespaces) => Promise<void>;
  rejectSession: (proposalId: number) => Promise<void>;
  respondToRequest: (topic: string, response: any) => Promise<void>;
  executeTransaction: (transaction: any) => Promise<string>;
  batchTransactions: (transactions: any[]) => Promise<string[]>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

// Add type definitions
interface TransactionResponse {
  hash?: string;
  result?: any;
}

interface WalletKitResponse {
  topic: string;
  response: {
    id: number;
    jsonrpc: string;
    result: any;
  };
}

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [walletKit, setWalletKit] = useState<WalletKitInstance | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<WalletContextType['account']>(null);
  const [activeProposal, setActiveProposal] = useState<ProposalTypes.Struct | null>(null);

  useEffect(() => {
    initializeWalletKit();
    loadStoredAccount();
  }, []);

  const loadStoredAccount = async () => {
    try {
      const storedConfig = await SecureStore.getItemAsync("accountConfig");
      const address = await SecureStore.getItemAsync("walletAddress");
      
      if (storedConfig && address) {
        const config = JSON.parse(storedConfig);
        setAccount({
          address,
          chainId: config.chainId,
          features: config.features
        });
      }
    } catch (error) {
      console.error("Failed to load stored account:", error);
    }
  };

  const initializeWalletKit = async () => {
    try {
      console.log('[WalletProvider] Starting WalletKit initialization...');
      setIsLoading(true);
      setError(null);

      const kit = await WalletKit.init({
        core,
        metadata: {
          name: "NewWallet",
          description: "A modern wallet application",
          url: "https://newwallet.app",
          icons: [],
          redirect: {
            native: "com.concordianova.connectwallet://",
            universal: "https://newwallet.app"
          }
        }
      });

      kit.on("session_proposal", handleSessionProposal);
      kit.on("session_request", handleSessionRequest);
      kit.on("session_delete", handleSessionDelete);

      setWalletKit(kit);
      console.log('[WalletProvider] WalletKit initialization complete');
    } catch (err) {
      console.error('[WalletProvider] Error initializing wallet:', err);
      setError('Failed to initialize wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionProposal = async (args: SignClientTypes.EventArguments['session_proposal']) => {
    setActiveProposal(args.params);
  };

  const handleSessionRequest = async ({ topic, params, id }: SignClientTypes.EventArguments['session_request']) => {
    if (!walletKit || !account) {
      console.error('WalletKit not initialized or no account');
      return;
    }

    try {
      const { request } = params;
      console.log('Session request received:', request);

      // Here you would implement your actual request handling logic
      // For now, we'll just respond with a success message
      await walletKit.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: '2.0',
          result: 'Request approved' // This should be replaced with actual handling logic
        }
      });
    } catch (error) {
      console.error('Error handling session request:', error);
      await walletKit.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: '2.0',
          error: {
            code: 5000,
            message: error instanceof Error ? error.message : 'User rejected.'
          }
        }
      });
    }
  };

  const handleSessionDelete = async (session: any) => {
    // Handle session deletion
    console.log('Session deleted:', session);
    setIsConnected(false);
  };

  const handleTransactionVerified = async (transaction: any) => {
    console.log('Transaction verified:', transaction);
    // Add any custom transaction verification logic here
  };

  const connect = async (uri: string) => {
    if (!walletKit) {
      setError('Wallet not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await walletKit.pair({ uri });
    } catch (err) {
      setError('Failed to connect wallet');
      console.error('Error connecting wallet:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    if (!walletKit) {
      setError('Wallet not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const sessions = await walletKit.getActiveSessions();
      for (const [topic, session] of Object.entries(sessions)) {
        await walletKit.disconnectSession({
          topic,
          reason: { code: 6000, message: 'User disconnected' },
        });
      }
      setIsConnected(false);
    } catch (err) {
      setError('Failed to disconnect wallet');
      console.error('Error disconnecting wallet:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const approveSession = async (proposalId: number, namespaces: SessionTypes.Namespaces) => {
    if (!walletKit) {
      setError('Wallet not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await walletKit.approveSession({
        id: proposalId,
        namespaces,
      });
      setIsConnected(true);
    } catch (err) {
      setError('Failed to approve session');
      console.error('Error approving session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const rejectSession = async (proposalId: number) => {
    if (!walletKit) {
      setError('Wallet not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await walletKit.rejectSession({
        id: proposalId,
        reason: { code: 6000, message: 'User rejected' },
      });
    } catch (err) {
      setError('Failed to reject session');
      console.error('Error rejecting session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const respondToRequest = async (topic: string, response: any) => {
    if (!walletKit) {
      setError('Wallet not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await walletKit.respondSessionRequest({
        topic,
        response,
      });
    } catch (err) {
      setError('Failed to respond to request');
      console.error('Error responding to request:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const executeTransaction = async (transaction: any): Promise<string> => {
    if (!walletKit || !account) {
      throw new Error('Wallet not initialized or no account');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Verify the transaction first
      await handleTransactionVerified(transaction);

      // Execute the transaction
      const response = {
        id: transaction.id,
        jsonrpc: '2.0',
        result: transaction.params
      };

      await walletKit.respondSessionRequest({
        topic: transaction.topic,
        response
      });

      return response.result?.hash || response.result || '';
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Transaction failed';
      setError(error);
      throw new Error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const batchTransactions = async (transactions: any[]): Promise<string[]> => {
    if (!walletKit || !account) {
      throw new Error('Wallet not initialized or no account');
    }

    try {
      setIsLoading(true);
      setError(null);

      const results = await Promise.all(
        transactions.map(async (tx) => {
          // Verify each transaction
          await handleTransactionVerified(tx);

          // Execute the transaction
          const response = {
            id: tx.id,
            jsonrpc: '2.0',
            result: tx.params
          };

          await walletKit.respondSessionRequest({
            topic: tx.topic,
            response
          });

          return response.result?.hash || response.result || '';
        })
      );

      return results;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Batch transaction failed';
      setError(error);
      throw new Error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        walletKit,
        isConnected,
        isLoading,
        error,
        account,
        connect,
        disconnect,
        approveSession,
        rejectSession,
        respondToRequest,
        executeTransaction,
        batchTransactions,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}; 