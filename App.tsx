// Required crypto polyfills
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { authenticateUser } from './api/authApi';
import { updateLastActive } from './api/securityService';
import { withSession } from './components/withSession';
import WelcomeScreen from './app/WelcomeScreen';
import SignInScreen from './app/SignInScreen';
import CreatePasswordScreen from './app/CreatePasswordScreen';
import SeedPhraseScreen from './app/SeedPhraseScreen';
import ConfirmSeedPhraseScreen from './app/ConfirmSeedPhraseScreen';
import SecureWalletScreen from './app/SecureWalletScreen';
import WalletCreatedScreen from './app/WalletCreatedScreen';
import ImportWalletScreen from './app/ImportWalletScreen';
import ImportSeedPhraseScreen from './app/ImportSeedPhraseScreen';
import ImportPrivateKeyScreen from './app/ImportPrivateKeyScreen';
import ImportSuccessScreen from './app/ImportSuccessScreen';
import portfolio from './app/portfolio';
import { SettingsProvider } from './contexts/SettingsContext';
import ImportWalletSuccessScreen from './app/ImportWalletSuccessScreen';
import NFTDetailsScreen from './app/NFTDetailsScreen';
import nft from './app/nft';
import pay from './app/pay';
import receive from './app/receive';
import settings from './app/settings';
import SwapScreen from './app/SwapScreen';
import TransactionDetailsScreen from './app/TransactionDetailsScreen';
import TransactionHistoryScreen from './app/TransactionHistoryScreen';

// Define the type for the navigation stack parameters
export type RootStackParamList = {
  // Entry points
  Welcome: undefined;
  SignIn: undefined;
  
  // Main app screens
  Portfolio: { walletAddress: string; walletType: 'smart' | 'classic' };
  
  // New wallet creation flow
  CreatePassword: { 
    mode: 'new' | 'import';
    type?: 'seed-phrase' | 'private-key';
    walletType: 'smart' | 'classic';  // Added to distinguish between smart and classic wallet flows
  };
  // These screens are only for classic wallet flow
  SeedPhrase: { walletType: 'classic' };
  ConfirmSeedPhrase: { seedPhrase: string; walletType: 'classic' };
  SecureWallet: { walletType: 'classic' };
  WalletCreated: { walletAddress: string; walletType: 'classic' };
  
  // Import wallet flow
  ImportWallet: undefined;
  ImportSeedPhrase: { password: string };
  ImportPrivateKey: { password: string };
  ImportSuccess: { 
    walletAddress: string;
    walletType: 'smart' | 'classic';
  };
  ImportWalletSuccess: {
    walletAddress: string;
    walletType: 'smart' | 'classic';
  };

  // Transaction screens
  Pay: undefined;
  Receive: undefined;
  Swap: undefined;
  TransactionDetails: { txHash: string };
  TransactionHistory: undefined;

  // Other screens
  NFTDetails: { tokenId: string };
  Settings: undefined;
  NFT: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Create protected versions of all screens except entry points
const ProtectedPortfolioScreen = withSession(portfolio);
const ProtectedCreatePasswordScreen = withSession(CreatePasswordScreen);
const ProtectedSeedPhraseScreen = withSession(SeedPhraseScreen);
const ProtectedConfirmSeedPhraseScreen = withSession(ConfirmSeedPhraseScreen);
const ProtectedSecureWalletScreen = withSession(SecureWalletScreen);
const ProtectedWalletCreatedScreen = withSession(WalletCreatedScreen);
const ProtectedImportWalletScreen = withSession(ImportWalletScreen);
const ProtectedImportSeedPhraseScreen = withSession(ImportSeedPhraseScreen);
const ProtectedImportPrivateKeyScreen = withSession(ImportPrivateKeyScreen);
const ProtectedImportSuccessScreen = withSession(ImportSuccessScreen);
const ProtectedImportWalletSuccessScreen = withSession(ImportWalletSuccessScreen);
const ProtectedNFTDetailsScreen = withSession(NFTDetailsScreen);
const ProtectedPayScreen = withSession(pay);
const ProtectedReceiveScreen = withSession(receive);
const ProtectedSettingsScreen = withSession(settings);
const ProtectedSwapScreen = withSession(SwapScreen);
const ProtectedTransactionDetailsScreen = withSession(TransactionDetailsScreen);
const ProtectedTransactionHistoryScreen = withSession(TransactionHistoryScreen);
const ProtectedNFTScreen = withSession(nft);

// Error boundary for crypto operations
const initializeCrypto = async () => {
  try {
    // Ensure crypto polyfills are working
    const testBuffer = Buffer.from('test');
    if (!testBuffer) throw new Error('Buffer not initialized');
    return true;
  } catch (error) {
    console.error('Crypto initialization failed:', error);
    return false;
  }
};

function AuthenticationWrapper() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);
  const [cryptoInitialized, setCryptoInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('[AuthWrapper] Starting initialization...');
        // Initialize crypto first
        console.log('[AuthWrapper] Initializing crypto...');
        const cryptoSuccess = await initializeCrypto();
        if (!cryptoSuccess) {
          console.error('[AuthWrapper] Crypto initialization failed');
          Alert.alert(
            "Initialization Error",
            "Failed to initialize crypto libraries. Please restart the app."
          );
          return;
        }
        console.log('[AuthWrapper] Crypto initialized successfully');
        setCryptoInitialized(true);

        // Then check wallet status
        console.log('[AuthWrapper] Checking wallet status...');
        const authData = await authenticateUser();
        console.log('[AuthWrapper] Auth data:', authData);
        setHasWallet(!!authData?.hasSmartWallet || !!authData?.hasClassicWallet);
        console.log('[AuthWrapper] Wallet status set:', !!authData?.hasSmartWallet || !!authData?.hasClassicWallet);
      } catch (error) {
        console.error('[AuthWrapper] Error during initialization:', error);
        setHasWallet(false);
      } finally {
        console.log('[AuthWrapper] Initialization complete');
        setIsLoading(false);
      }
    };
    init();
  }, []);

  if (isLoading || !cryptoInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={hasWallet ? "SignIn" : "Welcome"}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Entry Points - Not Protected */}
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      
      {/* Main App Screens - Protected */}
      <Stack.Screen name="Portfolio" component={ProtectedPortfolioScreen} />
      
      {/* New Wallet Creation Flow - Protected */}
      <Stack.Screen name="CreatePassword" component={ProtectedCreatePasswordScreen} />
      <Stack.Screen name="SeedPhrase" component={ProtectedSeedPhraseScreen} />
      <Stack.Screen name="ConfirmSeedPhrase" component={ProtectedConfirmSeedPhraseScreen} />
      <Stack.Screen name="SecureWallet" component={ProtectedSecureWalletScreen} />
      <Stack.Screen name="WalletCreated" component={ProtectedWalletCreatedScreen} />
      
      {/* Import Wallet Flow - Protected */}
      <Stack.Screen name="ImportWallet" component={ProtectedImportWalletScreen} />
      <Stack.Screen name="ImportSeedPhrase" component={ProtectedImportSeedPhraseScreen} />
      <Stack.Screen name="ImportPrivateKey" component={ProtectedImportPrivateKeyScreen} />
      <Stack.Screen name="ImportSuccess" component={ProtectedImportSuccessScreen} />
      <Stack.Screen name="ImportWalletSuccess" component={ProtectedImportWalletSuccessScreen} />

      {/* Transaction Screens - Protected */}
      <Stack.Screen name="Pay" component={ProtectedPayScreen} />
      <Stack.Screen name="Receive" component={ProtectedReceiveScreen} />
      <Stack.Screen name="Swap" component={ProtectedSwapScreen} />
      <Stack.Screen name="TransactionDetails" component={ProtectedTransactionDetailsScreen} />
      <Stack.Screen name="TransactionHistory" component={ProtectedTransactionHistoryScreen} />

      {/* Other Screens - Protected */}
      <Stack.Screen name="NFTDetails" component={ProtectedNFTDetailsScreen} />
      <Stack.Screen name="Settings" component={ProtectedSettingsScreen} />
      <Stack.Screen name="NFT" component={ProtectedNFTScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  // Update last active timestamp when app is focused
  useEffect(() => {
    const updateActivity = async () => {
      await updateLastActive();
    };
    updateActivity();
  }, []);

  return (
    <NavigationContainer
      onStateChange={() => {
        // Update last active timestamp on navigation
        updateLastActive();
      }}
    >
      <SettingsProvider>
        <StatusBar style="light" />
        <AuthenticationWrapper />
      </SettingsProvider>
    </NavigationContainer>
  );
}
