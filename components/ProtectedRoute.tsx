import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, hasWallet } = useAuth();
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
    }
    // If the user has a wallet but tries to access public screens (except SignIn)
    else if (hasWallet && isPublicScreen && pathname !== '/SignInScreen') {
      router.replace('/portfolio');
    }
    // If the user has a wallet and is on the root path, redirect to portfolio
    else if (hasWallet && pathname === '/') {
      router.replace('/portfolio');
    }
  }, [isLoading, hasWallet, pathname]);

  return <>{children}</>;
} 