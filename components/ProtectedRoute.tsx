import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../styles/shared';

interface ProtectedRouteProps {
  children: React.ReactNode;
  routeType: 'public' | 'protected' | 'auth';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, routeType }) => {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('[ProtectedRoute] State:', { routeType, isAuthenticated, loading });
    
    if (!loading) {
      if (routeType === 'protected' && !isAuthenticated) {
        console.log('[ProtectedRoute] Redirecting to signin (protected route, not authenticated)');
        router.replace('/signin');
      } else if (routeType === 'auth' && isAuthenticated) {
        console.log('[ProtectedRoute] Redirecting to portfolio (auth route, authenticated)');
        router.replace('/portfolio');
      } else if (routeType === 'public' && isAuthenticated) {
        console.log('[ProtectedRoute] Redirecting to portfolio (public route, authenticated)');
        router.replace('/portfolio');
      } else if (routeType === 'public' && !isAuthenticated) {
        console.log('[ProtectedRoute] Redirecting to signin (public route, not authenticated)');
        router.replace('/signin');
      }
    }
  }, [routeType, isAuthenticated, loading]);

  // Show loading state while checking authentication
  if (loading) {
    console.log('[ProtectedRoute] Rendering loading state');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // For public routes, show content while redirecting
  if (routeType === 'public') {
    return <>{children}</>;
  }

  // For protected routes, only show content if authenticated
  if (routeType === 'protected' && isAuthenticated) {
    return <>{children}</>;
  }

  // For auth routes, only show content if not authenticated
  if (routeType === 'auth' && !isAuthenticated) {
    return <>{children}</>;
  }

  // Show loading while redirecting
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}; 