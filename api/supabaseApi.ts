import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseAdmin } from '../lib/supabase';
import config from './config';
import * as SecureStore from 'expo-secure-store';

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
  id?: string;
  user_id?: string;
  temp_user_id: string;
  public_address: string;
  chain_name?: string;
  created_at?: string;
  updated_at?: string;
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
    // Update tables to match our actual schema
    const tables = ['auth_users', 'wallets', 'transactions', 'networks'];
    const results = await Promise.all(
      tables.map(async (table) => {
        try {
          console.log(`Checking table: ${table}...`);
          const { data, error } = await supabase
            .from(table)
            .select('id')
            .limit(1);
          
          // Don't throw on error, just log it
          if (error) {
            console.warn(`Table ${table} check failed:`, error.message);
            return false;
          }
          return true;
        } catch (err) {
          console.warn(`Error checking table ${table}:`, err);
          return false;
        }
      })
    );

    // We absolutely need auth_users and wallets tables
    const requiredTables = ['auth_users', 'wallets'];
    const missingRequired = requiredTables.filter((table, index) => {
      const tableIndex = tables.indexOf(table);
      return tableIndex !== -1 && !results[tableIndex];
    });

    if (missingRequired.length > 0) {
      console.error('Missing required tables:', missingRequired);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking required tables:', error);
    return false;
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create an anonymous user with password hash
 */
export const createAnonymousUser = (hashObj: { hash: string; salt: string }): Promise<string> => {
  console.log("🛠️ Creating anonymous user in Supabase...");

  // Create a unique identifier that we'll use to find this user later
  const timestamp = Date.now();
  const uniqueIdentifier = `${timestamp}_${Math.random().toString(36).substring(2)}`;
  const tempUserId = `temp_${uniqueIdentifier}`;
  const uniqueEmail = `anonymous_${uniqueIdentifier}@temp.wallet`;
  
  // Send insert request without blocking
  (async () => {
    try {
      const { status, error } = await supabaseAdmin
        .from("auth_users")
        .insert([
          {
            email: uniqueEmail,
            temp_user_id: tempUserId,
            setup_completed: false,
            password_hash: hashObj,
            setup_step: "password_created",
          },
        ]);

      console.log("✅ User insert request sent. Status:", status);
      if (error || status !== 201) {
        console.error("❌ Insert failed:", error);
        return;
      }
      console.log("✅ Insert confirmed.");
    } catch (error) {
      console.error("❌ Insert error:", error);
    }
  })();

  console.log("✅ Function execution continues while waiting for insert.");
  
  // Return a promise with a definite resolution time
  return new Promise((resolve) => {
    // Set a hard deadline of 4 seconds
    setTimeout(() => {
      console.log("⏰ Deadline reached, resolving with temporary ID");
      resolve(tempUserId);
    }, 4000);
    
    // Try to fetch earlier if possible
    setTimeout(async () => {
      try {
        console.log("⏰ 3 second delay completed, starting fetch...");
        const { data, error } = await supabaseAdmin
          .from("auth_users")
          .select("id")
          .eq("temp_user_id", tempUserId)
          .limit(1);

        if (error) {
          console.error("❌ Fetch error:", error);
        } else if (data && data.length > 0) {
          console.log("✅ Found user ID:", data[0].id);
          resolve(tempUserId);
          return;
        }
        
        // If no result, we'll wait for the 4-second deadline
      } catch (error: unknown) {
        console.error("❌ Error in fetch:", error);
        // We'll wait for the 4-second deadline
      }
    }, 3000);
  });
};

// fetchUserByCredentials with improved logging
export const fetchUserByCredentials = async (
  hashObj: { hash: string; salt: string },
  uniqueEmail?: string
) => {
  try {
    // Only use the email approach since it's the most reliable
    if (!uniqueEmail) {
      console.log("❌ No email provided to fetch by");
      return null;
    }
    
    console.log("🔍 Fetching user by email:", uniqueEmail);
    
    const { data, error } = await supabaseAdmin
      .from("auth_users")
      .select("id")
      .eq("email", uniqueEmail)
      .limit(1);
    
    if (error) {
      console.error("❌ Email query error:", error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log("❌ No user found with email:", uniqueEmail);
      return null;
    }
    
    console.log("✅ User fetched by email with ID:", data[0].id);
    return data[0].id;
  } catch (error) {
    console.error("❌ Fetch failed with error:", error);
    return null;
  } finally {
    console.log("✅ fetchUserByCredentials completed");
  }
};

/**
 * Resolve a temporary user ID to a real user ID
 */
export const resolveTempUserId = async (tempUserId: string): Promise<string | null> => {
  try {
    console.log("➡️ resolveTempUserId called with:", tempUserId);
    
    // Call the helper function to get user by temp_user_id
    const { data, error } = await supabaseAdmin
      .from('auth_users')
      .select('id')
      .eq('temp_user_id', tempUserId)
      .single();

    if (error) {
      console.error("❌ Error resolving temp user ID:", error);
      return null;
    }

    if (!data?.id) {
      console.log("⚠️ No user found with temp_user_id:", tempUserId);
      return null;
    }

    console.log("✅ Successfully resolved user ID:", data.id);
    return data.id;
  } catch (error: unknown) {
    console.error("❌ Exception in resolveTempUserId:", error);
    return null;
  }
};

/**
 * Create a wallet using proper Supabase query builder
 */
export const createWallet = async (params: {
  public_address: string;
  temp_user_id: string;
  name?: string;
  chain_name?: string;
}): Promise<string> => {
  console.log("🛠️ Creating wallet in Supabase...");
  console.log("📝 Wallet data:", {
    public_address: params.public_address,
    temp_user_id: params.temp_user_id,
    name: params.name || 'My Wallet',
    chain_name: params.chain_name || 'ethereum'
  });
  
  // Send insert request without blocking
  (async () => {
    try {
      const { status, error } = await supabaseAdmin
        .from("wallets")
        .insert([{
          public_address: params.public_address,
          temp_user_id: params.temp_user_id,
          name: params.name || 'My Wallet',
          chain_name: params.chain_name || 'ethereum',
          is_primary: true
        }]);

      console.log("✅ Wallet insert request sent. Status:", status);
      if (error || status !== 201) {
        console.error("❌ Insert failed:", error);
        return;
      }
      console.log("✅ Insert confirmed.");
    } catch (error) {
      console.error("❌ Insert error:", error);
    }
  })();

  // Return success immediately
  return Promise.resolve("success");
};