import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, hasWallet, isRecentlyActive } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const publicScreens = [
      'WelcomeScreen',
      'SignInScreen',
      'CreatePasswordScreen',
      'ImportWalletScreen',
      'ImportSeedPhraseScreen',
      'ImportPrivateKeyScreen',
      'ImportSuccessScreen',
      'ImportWalletSuccessScreen'
    ];
    const isPublicScreen = publicScreens.includes(pathname.replace('/', ''));

    // If the user has no wallet, they can only access public screens
    if (!hasWallet && !isPublicScreen) {
      router.replace('/WelcomeScreen');
      return;
    }

    // If user has a wallet but hasn't been active recently, redirect to SignIn
    // unless they're already on SignIn or trying to import/create a new wallet
    if (hasWallet && !isRecentlyActive && pathname !== '/SignInScreen' && !isPublicScreen) {
      router.replace('/SignInScreen');
      return;
    }

    // If user has a wallet and is recently active but tries to access public screens
    if (hasWallet && isRecentlyActive && isPublicScreen) {
      router.replace('/portfolio');
      return;
    }

    // If user has a wallet and is on the root path
    if (hasWallet && pathname === '/') {
      if (isRecentlyActive) {
        router.replace('/portfolio');
      } else {
        router.replace('/SignInScreen');
      }
    }
  }, [isLoading, hasWallet, isRecentlyActive, pathname]);

  return <>{children}</>;
} 