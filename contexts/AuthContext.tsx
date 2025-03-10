import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { authenticateUser } from '../api/authApi';
import { updateLastActive } from '../utils/activity';
import { initializeCrypto } from '../utils/crypto';

type AuthContextType = {
  isLoading: boolean;
  hasWallet: boolean;
  cryptoInitialized: boolean;
  updateActivity: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);
  const [cryptoInitialized, setCryptoInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('[AuthProvider] Starting initialization...');
        // Initialize crypto first
        console.log('[AuthProvider] Initializing crypto...');
        const cryptoSuccess = await initializeCrypto();
        if (!cryptoSuccess) {
          console.error('[AuthProvider] Crypto initialization failed');
          Alert.alert(
            "Initialization Error",
            "Failed to initialize crypto libraries. Please restart the app."
          );
          return;
        }
        console.log('[AuthProvider] Crypto initialized successfully');
        setCryptoInitialized(true);

        // Then check wallet status
        console.log('[AuthProvider] Checking wallet status...');
        const authData = await authenticateUser();
        console.log('[AuthProvider] Auth data:', authData);
        setHasWallet(!!authData?.hasSmartWallet || !!authData?.hasClassicWallet);
        console.log('[AuthProvider] Wallet status set:', !!authData?.hasSmartWallet || !!authData?.hasClassicWallet);
      } catch (error) {
        console.error('[AuthProvider] Error during initialization:', error);
        setHasWallet(false);
      } finally {
        console.log('[AuthProvider] Initialization complete');
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const updateActivity = async () => {
    await updateLastActive();
  };

  if (isLoading || !cryptoInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ isLoading, hasWallet, cryptoInitialized, updateActivity }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 