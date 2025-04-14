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
    console.log('[AuthProvider] App state changed:', {
      previousState: AppState.currentState,
      newState: nextAppState,
      currentAuthState: {
        isAuthenticated,
        hasWallet,
        loading
      }
    });
    
    if (nextAppState === 'active') {
      console.log('[AuthProvider] App became active, checking inactivity...');
      await checkInactivity();
    }
  };

  const checkInactivity = async () => {
    try {
      console.log('[AuthProvider] Starting inactivity check...');
      const lastActiveStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE);
      console.log('[AuthProvider] Last active timestamp from storage:', lastActiveStr);
      
      if (!lastActiveStr) {
        console.log('[AuthProvider] No last active timestamp found, signing out');
        await signOut();
        return;
      }

      const lastActive = parseInt(lastActiveStr, 10);
      const now = Date.now();
      const timeDiff = now - lastActive;

      console.log('[AuthProvider] Inactivity check details:', {
        lastActive: new Date(lastActive).toISOString(),
        now: new Date(now).toISOString(),
        timeDiff,
        timeout: INACTIVITY_TIMEOUT,
        isExpired: timeDiff > INACTIVITY_TIMEOUT
      });

      if (timeDiff > INACTIVITY_TIMEOUT) {
        console.log('[AuthProvider] Session expired due to inactivity');
        setIsAuthenticated(false);
      } else {
        // Session is still valid, update last active and keep authenticated
        console.log('[AuthProvider] Session still active, updating timestamp');
        await updateLastActive();
        setIsAuthenticated(true);
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
        hasLastActive: !!walletData.lastActive,
        currentAuthState: {
          isAuthenticated,
          hasWallet,
          loading
        }
      });

      // Set hasWallet based on essential wallet data presence
      setHasWallet(hasWalletData);

      // Check last active timestamp
      const lastActiveStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE);
      const lastActive = lastActiveStr ? new Date(parseInt(lastActiveStr, 10)) : null;
      const now = new Date();
      const timeDiff = lastActive ? now.getTime() - lastActive.getTime() : Infinity;
      const isActive = timeDiff < INACTIVITY_TIMEOUT;

      console.log('[AuthProvider] Checking activity status:', {
        lastActive: lastActive?.toISOString(),
        isActive,
        timeDiff,
        timeout: INACTIVITY_TIMEOUT,
        currentAuthState: {
          isAuthenticated,
          hasWallet,
          loading
        }
      });

      // Set authenticated if we have wallet data and session is active
      if (hasWalletData && isActive) {
        console.log('[AuthProvider] Setting authenticated state: true');
        setIsAuthenticated(true);
        await updateLastActive();
      } else {
        console.log('[AuthProvider] Setting authenticated state: false');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('[AuthProvider] Error checking auth:', error);
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