import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TextInput } from 'react-native';
import { useWallet } from '../contexts/WalletProvider';
import { SessionTypes, ProposalTypes, SignClientTypes } from '@walletconnect/types';

export const WalletTest: React.FC = () => {
  const { 
    walletKit,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    approveSession,
    rejectSession,
    respondToRequest
  } = useWallet();

  const [uri, setUri] = useState('');
  const [activeProposal, setActiveProposal] = useState<ProposalTypes.Struct | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (walletKit) {
      const handleSessionProposal = (args: SignClientTypes.EventArguments['session_proposal']) => {
        setActiveProposal(args.params);
        setPublicKey(args.params.proposer.publicKey);
      };

      walletKit.on("session_proposal", handleSessionProposal);

      return () => {
        walletKit.off("session_proposal", handleSessionProposal);
      };
    }
  }, [walletKit]);

  const handleConnect = async () => {
    try {
      await connect(uri);
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const handleApproveSession = async () => {
    if (!activeProposal) return;

    try {
      const namespaces: SessionTypes.Namespaces = {
        eip155: {
          chains: ['eip155:1'], // Ethereum mainnet
          methods: ['eth_sendTransaction', 'eth_sign', 'personal_sign'],
          events: ['chainChanged', 'accountsChanged'],
          accounts: publicKey ? [`eip155:1:${publicKey}`] : [],
        },
      };
      await approveSession(activeProposal.id, namespaces);
    } catch (err) {
      console.error('Failed to approve session:', err);
    }
  };

  const handleRejectSession = async () => {
    if (!activeProposal) return;

    try {
      await rejectSession(activeProposal.id);
    } catch (err) {
      console.error('Failed to reject session:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WalletConnect Test</Text>
      
      <Text style={styles.status}>
        Status: {isConnected ? 'Connected' : 'Disconnected'}
      </Text>
      
      {error && (
        <Text style={styles.error}>Error: {error}</Text>
      )}
      
      {publicKey && (
        <View style={styles.walletInfo}>
          <Text>Wallet Public Key: {publicKey}</Text>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter WalletConnect URI"
          value={uri}
          onChangeText={setUri}
          editable={!isConnected}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Connect"
          onPress={handleConnect}
          disabled={isLoading || isConnected || !uri}
        />
        
        <Button
          title="Disconnect"
          onPress={handleDisconnect}
          disabled={isLoading || !isConnected}
        />

        {activeProposal && (
          <>
            <Button
              title="Approve Session"
              onPress={handleApproveSession}
              disabled={isLoading || isConnected}
            />
            
            <Button
              title="Reject Session"
              onPress={handleRejectSession}
              disabled={isLoading || isConnected}
            />
          </>
        )}
      </View>
      
      {isLoading && (
        <Text style={styles.loading}>Loading...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  walletInfo: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  buttonContainer: {
    gap: 10,
  },
  loading: {
    marginTop: 10,
    fontStyle: 'italic',
  },
}); 