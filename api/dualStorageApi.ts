import * as SecureStore from 'expo-secure-store';
import { supabaseAdmin } from '../lib/supabase';
import config from './config';

// Storage keys for SecureStore
export const STORAGE_KEYS = {
  USER_DATA: 'userData',
  WALLET_DATA: 'walletData',
  SETUP_STATE: 'walletSetupState',
  TEMP_USER_ID: 'tempUserId',
  PASSWORD_HASH: 'passwordHash'
};

interface UserData {
  temp_user_id: string;
  email: string;
  setup_completed: boolean;
  setup_step: string;
  password_hash: {
    hash: string;
    salt: string;
  };
}

interface WalletData {
  temp_user_id: string;
  public_address: string;
  name: string;
  chain_name: string;
}

/**
 * Create a new user with dual storage
 */
export const createUser = async (hashObj: { hash: string; salt: string }): Promise<string> => {
  console.log("🛠️ Creating user with dual storage...");

  // Generate unique identifiers
  const timestamp = Date.now();
  const uniqueIdentifier = `${timestamp}_${Math.random().toString(36).substring(2)}`;
  const tempUserId = `temp_${uniqueIdentifier}`;
  const uniqueEmail = `anonymous_${uniqueIdentifier}@temp.wallet`;

  // Create user data
  const userData: UserData = {
    temp_user_id: tempUserId,
    email: uniqueEmail,
    setup_completed: false,
    setup_step: "password_created",
    password_hash: hashObj
  };

  // Store in SecureStore immediately
  await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  await SecureStore.setItemAsync(STORAGE_KEYS.TEMP_USER_ID, tempUserId);

  // Store in Supabase synchronously
  try {
    const { status, error } = await supabaseAdmin
      .from("auth_users")
      .insert([{
        email: uniqueEmail,
        temp_user_id: tempUserId,
        setup_completed: false,
        password_hash: hashObj,
        setup_step: "password_created",
      }]);

    if (error || status !== 201) {
      console.error("❌ Supabase insert failed:", error);
      throw error || new Error("Failed to create user in database");
    }
    console.log("✅ Supabase insert confirmed");
  } catch (error) {
    console.error("❌ Supabase insert error:", error);
    throw error;
  }

  return tempUserId;
};

/**
 * Create a new wallet with dual storage
 */
export const createWallet = async (walletData: Omit<WalletData, 'temp_user_id'>): Promise<void> => {
  console.log("🛠️ Creating wallet with dual storage...");

  // Get temp_user_id from SecureStore
  const tempUserId = await SecureStore.getItemAsync(STORAGE_KEYS.TEMP_USER_ID);
  if (!tempUserId) {
    throw new Error("No temp_user_id found. User must be created first.");
  }

  // Create complete wallet data
  const completeWalletData: WalletData = {
    ...walletData,
    temp_user_id: tempUserId
  };

  // Store in SecureStore immediately
  await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, JSON.stringify(completeWalletData));

  // Also store in classic wallet storage for compatibility
  await SecureStore.setItemAsync(config.wallet.classic.storageKeys.addresses, completeWalletData.public_address);

  // Initialize token balances in SecureStore
  const initialBalances = {
    '0x0000000000000000000000000000000000000000': {
      balance: '0',
      chain_id: completeWalletData.chain_name === 'ethereum' ? 1 : 
               completeWalletData.chain_name === 'polygon' ? 137 :
               completeWalletData.chain_name === 'arbitrum' ? 42161 :
               completeWalletData.chain_name === 'optimism' ? 10 : 1
    },
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': {
      balance: '0',
      chain_id: 1  // WETH is on Ethereum mainnet
    }
  };
  const tokenBalancesKey = `token_balances_${completeWalletData.public_address.toLowerCase()}`;
  await SecureStore.setItemAsync(tokenBalancesKey, JSON.stringify(initialBalances));

  // Store in Supabase asynchronously (fire-and-forget)
  // We don't await these operations to keep the UX flow moving
  (async () => {
    try {
      // Check if user has any existing wallets
      const { data: existingWallets, error: checkError } = await supabaseAdmin
        .from("wallets")
        .select('id')
        .eq('temp_user_id', tempUserId);

      if (checkError) {
        console.error("❌ Error checking existing wallets:", checkError);
        return;
      }

      // Set is_primary to true if this is the first wallet or if it's an Ethereum wallet
      const isPrimary = !existingWallets?.length || 
        (completeWalletData.chain_name === 'ethereum' || !completeWalletData.chain_name);

      // If making this wallet primary, update any existing primary wallets
      if (isPrimary && existingWallets?.length) {
        const { error: updateError } = await supabaseAdmin
          .from("wallets")
          .update({ is_primary: false })
          .eq('temp_user_id', tempUserId)
          .eq('is_primary', true);

        if (updateError) {
          console.warn("⚠️ Failed to update existing primary wallets:", updateError);
        }
      }

      // Create the wallet
      const { data: walletData, error: walletError } = await supabaseAdmin
        .from("wallets")
        .insert([{
          ...completeWalletData,
          is_primary: isPrimary
        }])
        .select('id')
        .single();

      if (walletError || !walletData) {
        console.error("❌ Supabase wallet insert failed:", walletError);
        return;
      }

      console.log("✅ Wallet created in database successfully");

      // Get chain ID based on chain name
      const chainId = completeWalletData.chain_name === 'ethereum' ? 1 : 
                     completeWalletData.chain_name === 'polygon' ? 137 :
                     completeWalletData.chain_name === 'arbitrum' ? 42161 :
                     completeWalletData.chain_name === 'optimism' ? 10 : 1;

      // Initialize token balances
      const { error: tokenError } = await supabaseAdmin
        .from("token_balances")
        .insert([
          {
            wallet_id: walletData.id,
            token_address: "0x0000000000000000000000000000000000000000", // ETH
            balance: "0",
            usd_value: "0",
            chain_id: chainId,
            timestamp: new Date().toISOString()
          },
          {
            wallet_id: walletData.id,
            token_address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
            balance: "0",
            usd_value: "0",
            chain_id: 1, // WETH is on Ethereum mainnet
            timestamp: new Date().toISOString()
          }
        ]);

      if (tokenError) {
        console.error("❌ Token balances insert failed:", tokenError);
      } else {
        console.log("✅ Token balances initialized in database");
      }
    } catch (error) {
      console.error("❌ Database operations failed:", error);
    }
  })();

  console.log("✅ Wallet created in SecureStore successfully");
};

/**
 * Get user data (tries SecureStore first, falls back to Supabase)
 */
export const getUserData = async (): Promise<UserData | null> => {
  try {
    // Try SecureStore first
    const storedData = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
    if (storedData) {
      return JSON.parse(storedData);
    }

    // If not in SecureStore, try Supabase
    const tempUserId = await SecureStore.getItemAsync(STORAGE_KEYS.TEMP_USER_ID);
    if (!tempUserId) {
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from("auth_users")
      .select("*")
      .eq("temp_user_id", tempUserId)
      .single();

    if (error || !data) {
      return null;
    }

    // Cache in SecureStore for future use
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
};

/**
 * Get wallet data (tries SecureStore first, falls back to Supabase)
 */
export const getWalletData = async (): Promise<WalletData | null> => {
  try {
    // Try SecureStore first
    const storedData = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    if (storedData) {
      return JSON.parse(storedData);
    }

    // Try classic wallet storage
    const classicAddress = await SecureStore.getItemAsync(config.wallet.classic.storageKeys.addresses);
    if (classicAddress) {
      const tempUserId = await SecureStore.getItemAsync(STORAGE_KEYS.TEMP_USER_ID);
      if (!tempUserId) {
        return null;
      }

      const walletData: WalletData = {
        temp_user_id: tempUserId,
        public_address: classicAddress,
        name: 'My Wallet',
        chain_name: 'ethereum'
      };

      // Cache in dual storage for future use
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, JSON.stringify(walletData));
      return walletData;
    }

    // If not in SecureStore, try Supabase
    const tempUserId = await SecureStore.getItemAsync(STORAGE_KEYS.TEMP_USER_ID);
    if (!tempUserId) {
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("temp_user_id", tempUserId)
      .single();

    if (error || !data) {
      return null;
    }

    // Cache in both storage systems for future use
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, JSON.stringify(data));
    await SecureStore.setItemAsync(config.wallet.classic.storageKeys.addresses, data.public_address);
    return data;
  } catch (error) {
    console.error("Error getting wallet data:", error);
    return null;
  }
};

/**
 * Update setup state with dual storage
 */
export const updateSetupState = async (state: string): Promise<void> => {
  // Store in SecureStore immediately
  await SecureStore.setItemAsync(STORAGE_KEYS.SETUP_STATE, state);

  // Update in Supabase synchronously
  try {
    const tempUserId = await SecureStore.getItemAsync(STORAGE_KEYS.TEMP_USER_ID);
    if (!tempUserId) {
      throw new Error("No temp_user_id found");
    }

    const { error } = await supabaseAdmin
      .from("auth_users")
      .update({ setup_step: state })
      .eq("temp_user_id", tempUserId);

    if (error) {
      console.error("❌ Supabase setup state update failed:", error);
      throw error;
    }
    console.log("✅ Supabase setup state updated");
  } catch (error) {
    console.error("❌ Supabase setup state update error:", error);
    throw error;
  }
};

/**
 * Complete wallet setup with dual storage
 */
export const completeWalletSetup = async (): Promise<void> => {
  // Update SecureStore immediately
  const userData = await getUserData();
  if (userData) {
    userData.setup_completed = true;
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  }

  // Update in Supabase synchronously
  try {
    const tempUserId = await SecureStore.getItemAsync(STORAGE_KEYS.TEMP_USER_ID);
    if (!tempUserId) {
      throw new Error("No temp_user_id found");
    }

    const { error } = await supabaseAdmin
      .from("auth_users")
      .update({ setup_completed: true })
      .eq("temp_user_id", tempUserId);

    if (error) {
      console.error("❌ Supabase setup completion failed:", error);
      throw error;
    }
    console.log("✅ Supabase setup completed");
  } catch (error) {
    console.error("❌ Supabase setup completion error:", error);
    throw error;
  }
}; 