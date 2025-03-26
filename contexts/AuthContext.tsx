import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert, AppState, AppStateStatus } from 'react-native';
import { initializeCrypto } from '../utils/crypto';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { getStoredWallet } from '../api/walletApi';
import { STORAGE_KEYS } from '../constants/storageKeys';

// Keep splash screen visible
SplashScreen.preventAutoHideAsync();

// Constants
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

interface AuthContextType {
  isAuthenticated: boolean;
  hasWallet: boolean;
  loading: boolean;
  error: string | null;
  cryptoInitialized: boolean;
  checkAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  updateLastActive: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cryptoInitialized, setCryptoInitialized] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);

  // Check for inactivity when app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      await checkInactivity();
    }
  };

  const checkInactivity = async () => {
    try {
      const lastActiveStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE);
      if (!lastActiveStr) {
        await signOut();
        return;
      }

      const lastActive = parseInt(lastActiveStr, 10);
      const now = Date.now();
      const timeDiff = now - lastActive;

      if (timeDiff > INACTIVITY_TIMEOUT) {
        console.log('[AuthProvider] Session expired due to inactivity');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('[AuthProvider] Error checking inactivity:', error);
      setIsAuthenticated(false);
    }
  };

  const updateLastActive = async () => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE, Date.now().toString());
    } catch (error) {
      console.error('[AuthProvider] Failed to update last active timestamp:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        console.log('[AuthProvider] Starting initialization...');
        
        // Initialize crypto first
        console.log('[AuthProvider] Initializing crypto...');
        const cryptoSuccess = await initializeCrypto();
        if (!cryptoSuccess) {
          console.error('[AuthProvider] Crypto initialization failed');
          setError('Failed to initialize crypto libraries');
          Alert.alert(
            "Initialization Error",
            "Failed to initialize crypto libraries. Please restart the app."
          );
          return;
        }
        console.log('[AuthProvider] Crypto initialized successfully');
        setCryptoInitialized(true);

        // Check auth status and inactivity
        await checkAuth();
        await checkInactivity();
        
        console.log('[AuthProvider] Initialization complete');
      } catch (error) {
        console.error('[AuthProvider] Error during initialization:', error);
        setHasWallet(false);
        setIsAuthenticated(false);
        setError('Initialization failed');
      } finally {
        console.log('[AuthProvider] Setting ready state');
        setLoading(false);
        setAppIsReady(true);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      // Hide splash screen once everything is ready
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  const checkAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[AuthProvider] Starting auth check...');

      // Get wallet data
      const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      if (!walletDataStr) {
        console.log('[AuthProvider] No wallet data found');
        setHasWallet(false);
        setIsAuthenticated(false);
        return;
      }

      const walletData = JSON.parse(walletDataStr);
      const hasWalletData = !!(walletData.address && walletData.privateKey);

      console.log('[AuthProvider] Checking wallet status:', {
        hasWalletData,
        hasAddress: !!walletData.address,
        hasPrivateKey: !!walletData.privateKey,
        hasLastActive: !!walletData.lastActive
      });

      // Set hasWallet based on essential wallet data presence
      setHasWallet(hasWalletData);
      
      // Only set authenticated if we have a wallet and are within activity timeout
      if (hasWalletData) {
        // Get the latest lastActive timestamp from storage
        const lastActiveStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE);
        
        if (!lastActiveStr) {
          const now = Date.now().toString();
          await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE, now);
          setIsAuthenticated(true);
          console.log('[AuthProvider] No last active timestamp found, setting now:', now);
          return;
        }

        const lastActive = parseInt(lastActiveStr, 10);
        const now = Date.now();
        const timeDiff = now - lastActive;
        const isActive = timeDiff <= INACTIVITY_TIMEOUT;
        
        console.log('[AuthProvider] Checking activity status:', {
          lastActive: new Date(lastActive).toISOString(),
          isActive,
          timeDiff,
          timeout: INACTIVITY_TIMEOUT
        });

        setIsAuthenticated(isActive);
        
        if (isActive) {
          await updateLastActive();
          console.log('[AuthProvider] Updated last active timestamp');
        } else {
          console.log('[AuthProvider] Session expired due to inactivity');
        }
      } else {
        setIsAuthenticated(false);
        console.log('[AuthProvider] No wallet found, setting authenticated to false');
      }
    } catch (err) {
      console.error('[AuthProvider] Auth check failed:', err);
      setError('Failed to check authentication status');
      setIsAuthenticated(false);
      setHasWallet(false);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      // Clear activity timestamp
      await SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE);
      
      // Don't clear wallet data, just set authenticated to false
      setIsAuthenticated(false);
    } catch (err) {
      console.error('[AuthProvider] Sign out failed:', err);
      setError('Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !cryptoInitialized || !appIsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A2F6C' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        hasWallet,
        loading,
        error,
        cryptoInitialized,
        checkAuth,
        signOut,
        updateLastActive
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 