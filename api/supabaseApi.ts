import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import config from './config';

// Validate Supabase configuration
if (!config.supabase?.url || !config.supabase?.anonKey) {
  console.error('Supabase configuration is missing:', {
    url: config.supabase?.url ? 'Set' : 'Missing',
    anonKey: config.supabase?.anonKey ? 'Set' : 'Missing'
  });
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  preferences?: {
    theme?: 'light' | 'dark';
    currency?: string;
    language?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      transactions?: boolean;
      security?: boolean;
    };
  };
}

export interface WalletData {
  id: string;
  user_id: string;
  address: string;
  chain_id: number;
  created_at: string;
  updated_at: string;
  is_primary: boolean;
  name?: string;
  ens_name?: string;
  avatar_url?: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  address: string;
  ens_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  is_favorite: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_address: string;
  hash: string;
  type: 'send' | 'receive' | 'swap' | 'approve' | 'other';
  status: 'pending' | 'confirmed' | 'failed';
  value: string;
  token_address?: string;
  token_symbol?: string;
  token_decimals?: number;
  to_address: string;
  from_address: string;
  gas_price: string;
  gas_used?: string;
  timestamp: string;
  block_number?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get user profile
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return null;
  }
};

/**
 * Get user wallets
 */
export const getUserWallets = async (userId: string): Promise<WalletData[]> => {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user wallets:', error);
    return [];
  }
};

/**
 * Add wallet
 */
export const addWallet = async (wallet: Omit<WalletData, 'id' | 'created_at' | 'updated_at'>): Promise<WalletData | null> => {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .insert([wallet])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding wallet:', error);
    return null;
  }
};

/**
 * Update wallet
 */
export const updateWallet = async (
  walletId: string,
  updates: Partial<WalletData>
): Promise<WalletData | null> => {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .update(updates)
      .eq('id', walletId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating wallet:', error);
    return null;
  }
};

/**
 * Get user contacts
 */
export const getUserContacts = async (userId: string): Promise<Contact[]> => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user contacts:', error);
    return [];
  }
};

/**
 * Add contact
 */
export const addContact = async (contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact | null> => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .insert([contact])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding contact:', error);
    return null;
  }
};

/**
 * Update contact
 */
export const updateContact = async (
  contactId: string,
  updates: Partial<Contact>
): Promise<Contact | null> => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', contactId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating contact:', error);
    return null;
  }
};

/**
 * Delete contact
 */
export const deleteContact = async (contactId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting contact:', error);
    return false;
  }
};

/**
 * Get user transactions
 */
export const getUserTransactions = async (
  userId: string,
  walletAddress?: string,
  limit: number = 50,
  offset: number = 0
): Promise<Transaction[]> => {
  try {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (walletAddress) {
      query = query.eq('wallet_address', walletAddress);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    return [];
  }
};

/**
 * Add transaction
 */
export const addTransaction = async (
  transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
): Promise<Transaction | null> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding transaction:', error);
    return null;
  }
};

/**
 * Update transaction
 */
export const updateTransaction = async (
  transactionId: string,
  updates: Partial<Transaction>
): Promise<Transaction | null> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating transaction:', error);
    return null;
  }
};

/**
 * Check if required tables exist
 */
export const checkRequiredTables = async (): Promise<boolean> => {
  try {
    console.log('Checking required tables...');
    
    // Try to select one row from each table
    const tables = ['profiles', 'wallets', 'contacts', 'transactions'];
    const results = await Promise.all(
      tables.map(async (table) => {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
          
        if (error) {
          if (error.code === 'PGRST116') {
            console.error(`Table ${table} does not exist`);
            return false;
          }
          // Other errors might be permission related, which is fine
          return true;
        }
        console.log(`Table ${table} exists`);
        return true;
      })
    );
    
    return results.every(exists => exists);
  } catch (error) {
    console.error('Error checking tables:', error);
    return false;
  }
};

/**
 * Create an anonymous user
 */
export const createAnonymousUser = async (): Promise<UserProfile | null> => {
  try {
    console.log('Starting anonymous user creation...');
    
    // Check if tables exist first
    const tablesExist = await checkRequiredTables();
    if (!tablesExist) {
      throw new Error('Required database tables are missing');
    }
    
    // Check if Supabase is properly configured
    if (!config.supabase?.url || !config.supabase?.anonKey) {
      throw new Error('Supabase configuration is missing');
    }
    console.log('Supabase configuration validated');
    
    // Generate a random email and password for the anonymous user
    const randomId = Math.random().toString(36).substring(2, 15);
    const anonymousEmail = `anon_${randomId}@temp.wallet`;
    const anonymousPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    console.log('Generated anonymous credentials');

    // Check current auth state
    const { data: currentSession } = await supabase.auth.getSession();
    console.log('Current session state:', currentSession ? 'Exists' : 'None');

    // Sign up the user using Supabase Auth
    console.log('Attempting to create user with Supabase Auth...');
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: anonymousEmail,
        password: anonymousPassword,
        options: {
          emailRedirectTo: null as any // Disable email confirmation
        }
      });

      console.log('Sign up response received');

      if (signUpError) {
        console.error('Supabase Auth error:', JSON.stringify(signUpError, null, 2));
        throw signUpError;
      }

      if (!authData.user) {
        console.error('No user data in response:', JSON.stringify(authData, null, 2));
        throw new Error('No user data returned from sign up');
      }

      console.log('Successfully created user with Auth:', authData.user.id);

      // Store the session if we have one
      if (authData.session) {
        console.log('Attempting to store session...');
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        });

        if (sessionError) {
          console.error('Error storing session:', JSON.stringify(sessionError, null, 2));
        } else {
          console.log('Session stored successfully');
        }
      } else {
        console.log('No session data received from sign up');
      }

      // Wait a moment for the RLS policies to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // The profile is automatically created by Supabase's Row Level Security policies
      // But we can update it with additional information if needed
      console.log('Attempting to fetch/update profile...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', authData.user.id)
        .select()
        .single();

      if (profileError) {
        console.error('Error updating profile:', JSON.stringify(profileError, null, 2));
        // Try to fetch the profile instead
        const { data: fetchedProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();
          
        if (fetchError) {
          console.error('Error fetching profile:', JSON.stringify(fetchError, null, 2));
        } else if (fetchedProfile) {
          console.log('Successfully fetched profile');
          return fetchedProfile;
        }
      }

      return profileData || {
        id: authData.user.id,
        email: authData.user.email!,
        created_at: authData.user.created_at,
        updated_at: new Date().toISOString(),
      };
    } catch (signUpError) {
      console.error('Error during sign up process:', signUpError);
      if (signUpError instanceof Error) {
        console.error('Sign up error details:', signUpError.message);
        console.error('Sign up error stack:', signUpError.stack);
      }
      throw signUpError;
    }
  } catch (error) {
    console.error('Error in createAnonymousUser:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}; 