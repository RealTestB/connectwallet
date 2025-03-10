import React, { createContext, useContext, useState, useEffect } from 'react';
import { WalletKit } from '@reown/walletkit';
import { Core } from '@walletconnect/core';
import { SessionTypes, ProposalTypes, SignClientTypes } from '@walletconnect/types';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Initialize WalletConnect Core
const core = new Core({
  projectId: Constants.expoConfig?.extra?.WALLETCONNECT_PROJECT_ID || '',
  relayUrl: 'wss://relay.walletconnect.com',
});

type WalletKitInstance = InstanceType<typeof WalletKit>;

interface WalletContextType {
  walletKit: WalletKitInstance | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connect: (uri: string) => Promise<void>;
  disconnect: () => Promise<void>;
  approveSession: (proposalId: number, namespaces: SessionTypes.Namespaces) => Promise<void>;
  rejectSession: (proposalId: number) => Promise<void>;
  respondToRequest: (topic: string, response: any) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [walletKit, setWalletKit] = useState<WalletKitInstance | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeProposal, setActiveProposal] = useState<ProposalTypes.Struct | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    initializeWalletKit();
  }, []);

  const initializeWalletKit = async () => {
    try {
      console.log('[WalletProvider] Starting WalletKit initialization...');
      setIsLoading(true);
      setError(null);

      console.log('[WalletProvider] Creating WalletKit instance...');
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
        },
      });
      console.log('[WalletProvider] WalletKit instance created successfully');

      // Set up event listeners
      console.log('[WalletProvider] Setting up event listeners...');
      kit.on("session_proposal", handleSessionProposal);
      kit.on("session_request", handleSessionRequest);
      kit.on("session_delete", handleSessionDelete);
      console.log('[WalletProvider] Event listeners set up successfully');

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
    setPublicKey(args.params.proposer.publicKey);
  };

  const handleSessionRequest = async (request: any) => {
    // Handle session request
    console.log('Session request received:', request);
  };

  const handleSessionDelete = async (session: any) => {
    // Handle session deletion
    console.log('Session deleted:', session);
    setIsConnected(false);
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

  return (
    <WalletContext.Provider
      value={{
        walletKit,
        isConnected,
        isLoading,
        error,
        connect,
        disconnect,
        approveSession,
        rejectSession,
        respondToRequest,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}; 