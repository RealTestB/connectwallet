import { createClient, User, AuthResponse, Provider, Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import config from './config';
import { checkLastActive } from '../utils/activity';

export interface AuthState {
  user: User | null;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  } | null;
}

export interface SignUpData {
  email: string;
  password: string;
  username?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  password: string;
}

export interface OAuthProvider {
  provider: Provider;
  options?: {
    redirectTo?: string;
    scopes?: string;
  };
}

const supabase = createClient(config.supabase.url, config.supabase.anonKey);

/**
 * Initialize auth state from storage
 */
export const initializeAuth = async (): Promise<AuthState> => {
  try {
    const session = await SecureStore.getItemAsync('session');
    const user = await SecureStore.getItemAsync('user');

    return {
      session: session ? JSON.parse(session) : null,
      user: user ? JSON.parse(user) : null
    };
  } catch (error) {
    console.error('Error initializing auth:', error);
    return { user: null, session: null };
  }
};

/**
 * Sign up with email and password
 */
export const signUp = async (data: SignUpData): Promise<AuthResponse> => {
  try {
    const { email, password, username } = data;
    const response = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    });

    if (response.error) throw response.error;

    if (response.data.user && response.data.session) {
      await Promise.all([
        SecureStore.setItemAsync('user', JSON.stringify(response.data.user)),
        SecureStore.setItemAsync('session', JSON.stringify(response.data.session))
      ]);
    }

    return response;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

/**
 * Sign in with email and password
 */
export const signIn = async (data: SignInData): Promise<AuthResponse> => {
  try {
    const { email, password } = data;
    const response = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (response.error) throw response.error;

    if (response.data.user && response.data.session) {
      await Promise.all([
        SecureStore.setItemAsync('user', JSON.stringify(response.data.user)),
        SecureStore.setItemAsync('session', JSON.stringify(response.data.session))
      ]);
    }

    return response;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

/**
 * Sign in with OAuth provider
 */
export const signInWithOAuth = async (data: OAuthProvider): Promise<{ data: { provider: Provider; url: string }; error: null } | { data: { provider: Provider; url: string }; error: Error }> => {
  try {
    const response = await supabase.auth.signInWithOAuth({
      provider: data.provider,
      options: data.options
    });

    if (response.error) throw response.error;

    // Note: OAuth sign-in is handled by the browser/native auth flow
    // The user and session will be set after the OAuth redirect
    return response;
  } catch (error) {
    console.error('Error signing in with OAuth:', error);
    throw error;
  }
};

/**
 * Sign out
 */
export const signOut = async (): Promise<void> => {
  try {
    const response = await supabase.auth.signOut();
    if (response.error) throw response.error;

    await Promise.all([
      SecureStore.deleteItemAsync('user'),
      SecureStore.deleteItemAsync('session')
    ]);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Reset password
 */
export const resetPassword = async (data: ResetPasswordData): Promise<void> => {
  try {
    const response = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: 'com.concordianova.connectwallet://reset-password'
    });

    if (response.error) throw response.error;
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
};

/**
 * Update password
 */
export const updatePassword = async (data: UpdatePasswordData): Promise<void> => {
  try {
    const response = await supabase.auth.updateUser({
      password: data.password
    });

    if (response.error) throw response.error;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

/**
 * Get current session
 */
export const getSession = async (): Promise<AuthState['session']> => {
  try {
    const session = await SecureStore.getItemAsync('session');
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

/**
 * Get current user
 */
export const getUser = async (): Promise<AuthState['user']> => {
  try {
    const user = await SecureStore.getItemAsync('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

/**
 * Refresh session
 */
export const refreshSession = async (): Promise<AuthResponse> => {
  try {
    const session = await getSession();
    if (!session?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await supabase.auth.refreshSession({
      refresh_token: session.refresh_token
    });

    if (response.error) throw response.error;

    if (response.data.user && response.data.session) {
      await Promise.all([
        SecureStore.setItemAsync('user', JSON.stringify(response.data.user)),
        SecureStore.setItemAsync('session', JSON.stringify(response.data.session))
      ]);
    }

    return response;
  } catch (error) {
    console.error('Error refreshing session:', error);
    throw error;
  }
};

/**
 * Check if user has a wallet and is recently active
 */
export const authenticateUser = async (): Promise<{ 
  hasSmartWallet: boolean; 
  hasClassicWallet: boolean;
  isRecentlyActive: boolean;
}> => {
  try {
    // Check for wallet address and type
    const walletAddress = await SecureStore.getItemAsync('walletAddress');
    const walletType = await SecureStore.getItemAsync('walletType');
    const privateKey = await SecureStore.getItemAsync('walletPrivateKey');
    const accountConfig = await SecureStore.getItemAsync('accountConfig');

    // Check if user was active in last 30 minutes
    const isRecentlyActive = await checkLastActive(30);

    return {
      hasSmartWallet: !!(walletAddress && walletType === 'smart' && accountConfig),
      hasClassicWallet: !!(walletAddress && (walletType === 'classic' || privateKey)),
      isRecentlyActive
    };
  } catch (error) {
    console.error('Error checking wallet status:', error);
    return { 
      hasSmartWallet: false, 
      hasClassicWallet: false,
      isRecentlyActive: false
    };
  }
}; 