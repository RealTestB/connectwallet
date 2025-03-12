import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { authenticateUser } from '../api/authApi';
import { updateLastActive } from '../utils/activity';
import { initializeCrypto } from '../utils/crypto';
import * as SplashScreen from 'expo-splash-screen';

// Keep splash screen visible
SplashScreen.preventAutoHideAsync();

type AuthContextType = {
  isLoading: boolean;
  hasWallet: boolean;
  isRecentlyActive: boolean;
  cryptoInitialized: boolean;
  updateActivity: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);
  const [isRecentlyActive, setIsRecentlyActive] = useState(false);
  const [cryptoInitialized, setCryptoInitialized] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);

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
        try {
          const authData = await authenticateUser();
          console.log('[AuthProvider] Auth data:', authData);
          
          setHasWallet(!!authData?.hasSmartWallet || !!authData?.hasClassicWallet);
          setIsRecentlyActive(!!authData?.isRecentlyActive);
          
          console.log('[AuthProvider] Wallet status set:', !!authData?.hasSmartWallet || !!authData?.hasClassicWallet);
          console.log('[AuthProvider] Recent activity status:', !!authData?.isRecentlyActive);

          // Update last active time only after successful initialization
          try {
            await updateLastActive();
          } catch (activityError) {
            console.warn('[AuthProvider] Failed to update activity:', activityError);
            // Continue even if activity update fails
          }
        } catch (authError) {
          console.error('[AuthProvider] Auth check failed:', authError);
          setHasWallet(false);
          setIsRecentlyActive(false);
        }
      } catch (error) {
        console.error('[AuthProvider] Error during initialization:', error);
        setHasWallet(false);
        setIsRecentlyActive(false);
      } finally {
        console.log('[AuthProvider] Initialization complete');
        setIsLoading(false);
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

  const updateActivity = async () => {
    try {
      await updateLastActive();
      setIsRecentlyActive(true);
    } catch (error) {
      console.warn('[AuthProvider] Failed to update activity:', error);
    }
  };

  if (isLoading || !cryptoInitialized || !appIsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      isLoading, 
      hasWallet, 
      isRecentlyActive,
      cryptoInitialized, 
      updateActivity 
    }}>
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