import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert, AppState, AppStateStatus } from 'react-native';
import { initializeCrypto } from '../utils/crypto';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { getStoredWallet } from '../api/walletApi';
import config from '../api/config';

// Keep splash screen visible
SplashScreen.preventAutoHideAsync();

// Constants
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const LAST_ACTIVE_KEY = 'lastActiveTimestamp';

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
      const lastActiveStr = await SecureStore.getItemAsync(LAST_ACTIVE_KEY);
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
        // Don't navigate here, let ProtectedRoute handle it
      }
    } catch (error) {
      console.error('[AuthProvider] Error checking inactivity:', error);
      setIsAuthenticated(false);
    }
  };

  const updateLastActive = async () => {
    try {
      await SecureStore.setItemAsync(LAST_ACTIVE_KEY, Date.now().toString());
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

        // Then check wallet status and inactivity
        await Promise.all([checkAuth(), checkInactivity()]);
      } catch (error) {
        console.error('[AuthProvider] Error during initialization:', error);
        setHasWallet(false);
        setIsAuthenticated(false);
        setError('Initialization failed');
      } finally {
        console.log('[AuthProvider] Initialization complete');
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

      // Check if we have a stored wallet
      const wallet = await getStoredWallet();
      const hasClassicWallet = !!wallet;

      console.log('[AuthProvider] Checking wallet status:', {
        hasWallet: hasClassicWallet,
        walletAddress: wallet?.address
      });

      setHasWallet(hasClassicWallet);
      
      // Only set authenticated if we have a wallet and are within activity timeout
      if (hasClassicWallet) {
        const lastActiveStr = await SecureStore.getItemAsync(LAST_ACTIVE_KEY);
        const isActive = lastActiveStr ? (Date.now() - parseInt(lastActiveStr, 10)) <= INACTIVITY_TIMEOUT : false;
        
        console.log('[AuthProvider] Checking activity status:', {
          lastActive: lastActiveStr ? new Date(parseInt(lastActiveStr, 10)).toISOString() : null,
          isActive,
          timeDiff: lastActiveStr ? Date.now() - parseInt(lastActiveStr, 10) : null
        });

        setIsAuthenticated(isActive);
        
        if (isActive) {
          await updateLastActive();
          console.log('[AuthProvider] Updated last active timestamp');
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
      await SecureStore.deleteItemAsync(LAST_ACTIVE_KEY);
      
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