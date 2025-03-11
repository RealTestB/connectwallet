import { createClient } from '@supabase/supabase-js';
import config from './config';

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
  type: 'classic' | 'smart';
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

const supabase = createClient(config.supabase.url, config.supabase.anonKey);

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