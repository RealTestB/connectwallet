import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseAdmin } from '../lib/supabase';
import config from './config';
import * as SecureStore from 'expo-secure-store';
import { ethers } from "ethers";
import { getTokenBalances } from "./tokensApi";
import { encryptSeedPhrase } from "./securityApi";
import { clearSupabaseStorage } from "../lib/supabase";
import Constants from 'expo-constants';

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

export interface TokenBalance {
  id?: string;
  wallet_id: string;
  token_address: string;
  chain_id: number;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  timestamp: string;
  metadata?: {
    logo_url?: string;
    verified?: boolean;
  };
}

export interface NetworkConfig {
  id?: string;
  name: string;
  chain_id: number;
  rpc_url: string;
  explorer_url: string;
  symbol: string;
  decimals: number;
  is_testnet: boolean;
  icon_url?: string;
  created_at?: string;
  updated_at?: string;
  is_enabled: boolean;
  gas_token_symbol: string;
}

export interface UserSettings {
  id?: string;
  user_id: string;
  theme: 'light' | 'dark';
  language: string;
  selected_currency: string;
  notifications: {
    email: boolean;
    push: boolean;
    transactions: boolean;
    security: boolean;
  };
  default_network?: string;
  auto_lock_timeout?: number;
  created_at?: string;
  updated_at?: string;
}

export interface WalletData {
  id?: string;
  user_id: string;
  public_address: string;
  chain_name?: string;
  created_at?: string;
  updated_at?: string;
  is_primary: boolean;
  name?: string;
  ens_name?: string;
  avatar_url?: string;
  imported?: boolean;
  account_index?: number;
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
}

interface CreateWalletParams {
  user_id: string;
  public_address: string;
  name?: string;
  imported?: boolean;
  chain_name?: string;
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
  transaction: Omit<Transaction, 'id'>
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
export const createAnonymousUser = async (hashObj: { hash: string; salt: string }, skipWalletCreation: boolean = false): Promise<string> => {
  console.log("🛠️ Creating anonymous user in Supabase...");

  // Create a unique identifier for the email that's more email-like
  const uniqueIdentifier = Math.random().toString(36).substring(2, 10);
  const uniqueEmail = `anon_${uniqueIdentifier}@connectwallet.app`;
  
  try {
    console.log(`📡 Creating new user...`);
    
    // Create user directly in auth_users table using admin client
    const { data: userData, error: userError } = await supabaseAdmin
      .from('auth_users')
      .insert([{
        email: uniqueEmail,
        password_hash: hashObj,
        setup_completed: false,
        setup_step: "password_created"
      }])
      .select('id');

    if (userError) {
      throw userError;
    }

    // Handle array response
    const userDataArray = Array.isArray(userData) ? userData : [userData];
    if (!userDataArray?.[0]?.id) {
      console.error("❌ User creation response:", userData);
      throw new Error('Failed to get user ID after creation');
    }

    const userId = userDataArray[0].id;
    console.log("✅ User created successfully with ID:", userId);

    // We no longer create an initial wallet with empty address
    // The wallet will be created later with the actual address
    console.log("📝 Wallet will be created when address is available");

    return userId;
  } catch (error: any) {
    console.error("❌ Failed to create user:", {
      error: error?.message || error,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    });
    throw new Error(`Failed to create user: ${error?.message || 'Unknown error'}`);
  }
};

/**
 * Create an anonymous user for wallet import (no initial wallet creation)
 */
export const createAnonymousUserForImport = async (hashObj: { hash: string; salt: string }): Promise<string> => {
  console.log("🛠️ Creating anonymous user for import in Supabase...");

  // Create a unique identifier for the email
  const uniqueIdentifier = Math.random().toString(36).substring(2, 10);
  const uniqueEmail = `import_${uniqueIdentifier}@connectwallet.app`;
  
  try {
    console.log(`📡 Creating new user for import...`);
    
    // Create user directly in auth_users table using admin client
    const { data: userData, error: userError } = await supabaseAdmin
      .from('auth_users')
      .insert([{
        email: uniqueEmail,
        password_hash: hashObj,
        setup_completed: false,
        setup_step: "password_created"
      }])
      .select('id');

    if (userError) {
      throw userError;
    }

    // Handle array response
    const userDataArray = Array.isArray(userData) ? userData : [userData];
    if (!userDataArray?.[0]?.id) {
      console.error("❌ User creation response:", userData);
      throw new Error('Failed to get user ID after creation');
    }

    const userId = userDataArray[0].id;
    console.log("✅ User created successfully for import with ID:", userId);

    return userId;
  } catch (error: any) {
    console.error("❌ Failed to create user for import:", {
      error: error?.message || error,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    });
    throw new Error(`Failed to create user for import: ${error?.message || 'Unknown error'}`);
  }
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
 * Create a new wallet in the database
 */
export const createWallet = async (params: CreateWalletParams): Promise<string> => {
  try {
    console.log("📡 Creating wallet in database...");
    
    // Validate required fields
    if (!params.public_address || params.public_address.trim().length === 0) {
      throw new Error("Public address is required to create a wallet");
    }

    if (!params.user_id) {
      throw new Error("User ID is required to create a wallet");
    }

    // Create wallet entry with required fields
    const walletEntry = {
      user_id: params.user_id,
      public_address: params.public_address.toLowerCase(),
      name: params.name || 'My Wallet',
      is_primary: true,
      imported: params.imported || false,
      chain_name: params.chain_name || 'ethereum'
    };

    // Insert wallet entry
    const { data, error } = await supabaseAdmin
      .from("wallets")
      .insert([walletEntry])
      .select('id');

    if (error) {
      console.error('❌ Error creating wallet:', error);
      throw error;
    }

    // Handle both array and single object responses
    const walletData = Array.isArray(data) ? data[0] : data;
    if (!walletData?.id) {
      console.error("❌ Wallet creation response:", data);
      throw new Error('No wallet ID returned from creation');
    }

    console.log("✅ Wallet created successfully:", walletData.id);
    return walletData.id;
  } catch (error) {
    console.error("❌ Failed to create wallet:", error);
    throw error;
  }
};

/**
 * Create a new wallet in the database specifically for import flow
 * This function is designed to handle wallet creation during the import process
 */
export async function createImportedWallet(params: {
  public_address: string;
  user_id: string;
  name?: string;
  chain_name?: string;
}): Promise<string> {
  try {
    // Validate required fields
    if (!params.public_address || !params.user_id) {
      throw new Error("Missing required fields for wallet creation");
    }

    // First, check if any wallets exist with this address (just for our information)
    const { data: existingWallets, error: checkError } = await supabaseAdmin
      .from("wallets")
      .select('*')
      .eq('public_address', params.public_address.toLowerCase());

    if (checkError) {
      console.error("Error checking for existing wallets:", checkError);
      throw checkError;
    }

    // Log what we found for debugging
    if (existingWallets && existingWallets.length > 0) {
      console.log(`Found ${existingWallets.length} existing wallets for address ${params.public_address}`);
      // If we have multiple wallets, note the Ethereum one
      const ethereumWallet = existingWallets.find(w => w.chain_name === 'ethereum');
      if (ethereumWallet) {
        console.log("Found existing Ethereum wallet:", ethereumWallet);
      }
    }

    // ALWAYS create wallet entry to trigger DB functions
    const walletEntry = {
      user_id: params.user_id,
      public_address: params.public_address.toLowerCase(),
      name: params.name || 'Imported Wallet',
      is_primary: true,
      imported: true,
      chain_name: params.chain_name || 'ethereum'
    };

    // Insert wallet entry - this will trigger DB functions that handle:
    // - Duplicate wallet checks
    // - User management (merging/deleting)
    // - All other complex logic
    const { data: newWallets, error } = await supabaseAdmin
      .from("wallets")
      .insert([walletEntry])
      .select();

    if (error) {
      console.error("Error in wallet creation:", error);
      throw error;
    }

    if (!newWallets || newWallets.length === 0) {
      // If we got no response, try to fetch the wallet that should have been created/merged
      const { data: checkWallets, error: fetchError } = await supabaseAdmin
        .from("wallets")
        .select('*')
        .eq('public_address', params.public_address.toLowerCase())
        .eq('chain_name', 'ethereum');

      if (fetchError) throw fetchError;
      if (!checkWallets || checkWallets.length === 0) {
        // Try one more time without the chain_name filter
        const { data: finalCheck, error: finalError } = await supabaseAdmin
          .from("wallets")
          .select('*')
          .eq('public_address', params.public_address.toLowerCase());

        if (finalError) throw finalError;
        if (!finalCheck || finalCheck.length === 0) {
          throw new Error("No wallet ID returned from database");
        }

        // Return the Ethereum wallet if exists, otherwise first wallet
        const ethWallet = finalCheck.find((w: WalletData) => w.chain_name === 'ethereum');
        return ethWallet ? ethWallet.id : finalCheck[0].id;
      }

      // Return the Ethereum wallet ID
      return checkWallets[0].id;
    }

    // If we got wallets back, prefer the Ethereum one
    const ethereumWallet = newWallets.find((w: WalletData) => w.chain_name === 'ethereum');
    const walletToUse = ethereumWallet || newWallets[0];

    console.log("✅ Wallet creation completed:", walletToUse);
    return walletToUse.id;
  } catch (error) {
    console.error("Error in createImportedWallet:", error);
    throw error;
  }
}

/**
 * Get token balances for a wallet
 */
export const getWalletTokenBalances = async (publicAddress: string) => {
  try {
    if (!publicAddress) {
      throw new Error("No wallet address provided");
    }
    console.log("Fetching token balances for wallet:", publicAddress);

    // Get the wallet first to get the wallet ID
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("id")
      .eq("public_address", publicAddress)
      .single();

    if (walletError) {
      console.error("❌ Failed to fetch wallet:", walletError);
      throw walletError;
    }

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // Get token balances
    const { data, error } = await supabaseAdmin
      .from("token_balances")
      .select("*")
      .eq("wallet_id", wallet.id)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("❌ Failed to fetch token balances:", error);
      throw error;
    }

    console.log("✅ Found token balances:", data?.length || 0);
    return data || [];
  } catch (error) {
    console.error("❌ Failed to fetch token balances:", error);
    throw error;
  }
};

/**
 * Verify wallet ownership and clean up orphaned wallets
 */
export const verifyWalletOwnership = async (userId: string, walletId: string): Promise<boolean> => {
  try {
    console.log(`🔍 Verifying wallet ownership for user ${userId} and wallet ${walletId}`);
    
    // Check if wallet exists and belongs to user
    const { data: wallet, error } = await supabaseAdmin
      .from('wallets')
      .select('id, user_id')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Error verifying wallet ownership:', error);
      return false;
    }

    if (!wallet) {
      console.log('⚠️ Wallet not found or does not belong to user');
      return false;
    }

    console.log('✅ Wallet ownership verified');
    return true;
  } catch (error) {
    console.error('❌ Exception in verifyWalletOwnership:', error);
    return false;
  }
};

/**
 * Clean up orphaned wallets (wallets without a valid user)
 */
export const cleanupOrphanedWallets = async (): Promise<void> => {
  try {
    console.log('🧹 Starting orphaned wallet cleanup...');
    
    // Find wallets where user_id doesn't exist in auth_users
    const { data: orphanedWallets, error: findError } = await supabaseAdmin
      .from('wallets')
      .select('id, user_id')
      .not('user_id', 'in', (
        supabaseAdmin
          .from('auth_users')
          .select('id')
      ));

    if (findError) {
      console.error('❌ Error finding orphaned wallets:', findError);
      return;
    }

    if (!orphanedWallets || orphanedWallets.length === 0) {
      console.log('✅ No orphaned wallets found');
      return;
    }

    console.log(`Found ${orphanedWallets.length} orphaned wallets`);

    // Delete orphaned wallets
    const { error: deleteError } = await supabaseAdmin
      .from('wallets')
      .delete()
      .in('id', orphanedWallets.map(w => w.id));

    if (deleteError) {
      console.error('❌ Error deleting orphaned wallets:', deleteError);
      return;
    }

    console.log('✅ Successfully cleaned up orphaned wallets');
  } catch (error) {
    console.error('❌ Exception in cleanupOrphanedWallets:', error);
  }
};

/**
 * Store a new transaction in the database
 */
export const storeTransaction = async (transaction: {
  wallet_id: string;
  hash: string;
  from_address: string;
  to_address: string;
  value: string;
  token_address?: string;
  token_symbol?: string;
  token_decimals?: number;
  status: 'pending' | 'confirmed' | 'failed';
  network_id: number;
  gas_price?: string;
  gas_used?: string;
}) => {
  try {
    // Call the add_transaction function directly
    const { error } = await supabase.rpc('add_transaction', {
      wallet_id: transaction.wallet_id,
      hash: transaction.hash,
      from_address: transaction.from_address,
      to_address: transaction.to_address,
      value: transaction.value, // Already in base units (wei)
      status: transaction.status,
      network_id: transaction.network_id,
      gas_price: transaction.gas_price || '0',
      gas_used: transaction.gas_used || '0'
    });

    if (error) throw error;
    console.log('[SupabaseApi] Stored transaction:', transaction.hash);

    // If this is a token transfer, store token information in a separate call
    if (transaction.token_address && transaction.token_symbol) {
      const { error: tokenError } = await supabase
        .from('token_transactions')
        .insert({
          transaction_hash: transaction.hash,
          token_address: transaction.token_address,
          token_symbol: transaction.token_symbol,
          token_decimals: transaction.token_decimals
        });

      if (tokenError) {
        console.error('[SupabaseApi] Error storing token transaction info:', tokenError);
        // Don't throw here as the main transaction was stored successfully
      }
    }
  } catch (error) {
    console.error('[SupabaseApi] Error storing transaction:', error);
    throw error;
  }
};