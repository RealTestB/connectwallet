import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";
import config from "./config";
import { createWallet, createImportedWallet } from "./supabaseApi";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { getTokenBalances } from "./tokensApi";
import { supabaseAdmin } from "../lib/supabase";
import { encryptSeedPhrase } from "./securityApi";
import { clearSupabaseStorage } from "../lib/supabase";
import crypto from "crypto";

export interface WalletData {
  address: string;
  type: "classic";
  chainId?: number;
  hasPassword?: boolean;
}

/**
 * ✅ Import Classic Wallet from Private Key
 */
export const importClassicWalletFromPrivateKey = async (privateKey: string): Promise<WalletData> => {
  try {
    console.log("🔄 Importing wallet from private key...");
    
    const wallet = new ethers.Wallet(privateKey);
    const address = await wallet.getAddress();
    console.log(`✅ Wallet created with address: ${address}`);

    // Get user ID from SecureStore
    const userId = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
    if (!userId) {
      throw new Error("No user ID found");
    }
    console.log(`✅ Found user ID: ${userId}`);

    // Store wallet in database with imported flag using the new function
    console.log("📡 Creating wallet in database...");
    const walletId = await createImportedWallet({
      user_id: userId,
      public_address: address,
      chain_name: "ethereum",
      name: "Imported Wallet"
    });
    console.log(`✅ Wallet created in database with ID: ${walletId}`);

    // Fetch token balances
    console.log("📡 Fetching token balances...");
    const tokenBalances = await getTokenBalances(address, 1); // Use Ethereum mainnet for initial import
    if (!Array.isArray(tokenBalances)) {
      console.warn("⚠️ Failed to fetch token balances, continuing without them");
    } else {
      console.log(`✅ Found ${tokenBalances.length} token balances`);
      
      // Store token balances in database
      if (tokenBalances.length > 0) {
        try {
          const balancesToStore = tokenBalances.map(token => ({
            wallet_id: walletId,
            token_address: token.contractAddress,
            chain_id: 1, // Ethereum mainnet
            symbol: token.metadata?.symbol || "UNKNOWN",
            name: token.metadata?.name || "Unknown Token",
            decimals: token.metadata?.decimals || 18,
            balance: token.formattedBalance,
            usd_value: '0', // Default to '0' to satisfy not-null constraint
            timestamp: new Date().toISOString()
          }));

          const { error: storeError } = await supabaseAdmin
            .from("token_balances")
            .insert(balancesToStore);

          if (storeError) {
            console.warn("⚠️ Failed to store token balances:", storeError);
            // Don't throw - allow process to continue
          } else {
            console.log("✅ Token balances stored successfully");
          }
        } catch (error) {
          console.warn("⚠️ Error storing token balances:", error);
          // Don't throw - allow process to continue
        }
      }
    }

    // Store wallet data in SecureStore for authentication
    const walletData = {
      address: String(address),
      privateKey: String(wallet.privateKey),
      lastActive: Date.now().toString()
    };
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, JSON.stringify(walletData));
    console.log("✅ Stored wallet data in SecureStore");

    return { 
      address, 
      type: "classic"
    };
  } catch (error) {
    console.error("❌ Failed to import wallet from private key:", error);
    throw error;
  }
};

/**
 * Create an anonymous user for wallet import
 */
const createAnonymousUserForImport = async (): Promise<string> => {
  try {
    console.log("🔄 Creating anonymous user for import...");
    
    // Create a new anonymous user in Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
      email: `${Date.now()}@wallet.local`,
      password: `${Date.now()}`,
      email_confirm: true
    });

    if (error) {
      console.error("❌ Failed to create anonymous user:", error);
      throw error;
    }

    if (!user) {
      throw new Error("No user returned from createUser");
    }

    console.log(`✅ Created anonymous user with ID: ${user.id}`);
    return user.id;
  } catch (error) {
    console.error("❌ Failed to create anonymous user:", error);
    throw error;
  }
};

/**
 * ✅ Import Classic Wallet from Seed Phrase
 */
export const importClassicWalletFromSeedPhrase = async (seedPhrase: string): Promise<WalletData> => {
  try {
    console.log("🔄 Importing wallet from seed phrase...");
    
    // Validate seed phrase with ethers first
    try {
      ethers.Wallet.fromPhrase(seedPhrase);
    } catch (error) {
      console.error("❌ Invalid seed phrase:", error);
      throw new Error("Invalid seed phrase. Please check your words and try again.");
    }
    
    // Create wallet from seed phrase
    const wallet = ethers.Wallet.fromPhrase(seedPhrase);
    const address = await wallet.getAddress();
    console.log(`✅ Wallet created with address: ${address}`);

    // Check if wallet exists in database
    console.log("📡 Checking if wallet exists in database...");
    const { data: existingWallets, error: searchError } = await supabaseAdmin
      .from('wallets')
      .select('id, user_id')
      .eq('public_address', address.toLowerCase())
      .eq('chain_name', 'ethereum');

    if (searchError) {
      console.error("❌ Error searching for existing wallet:", searchError);
      throw new Error("Failed to check for existing wallet");
    }

    let userId: string;
    let walletId: string;

    if (existingWallets && existingWallets.length > 0) {
      // Use existing wallet's user ID
      const existingWallet = existingWallets[0];
      userId = existingWallet.user_id;
      walletId = existingWallet.id;
      console.log(`✅ Found existing wallet with user ID: ${userId}`);
    } else {
      // Create new user for the wallet
      userId = await createAnonymousUserForImport();
      console.log(`✅ Created new user with ID: ${userId}`);

      // Create new wallet in database
      console.log("📡 Creating new wallet in database...");
      walletId = await createImportedWallet({
        user_id: userId,
        public_address: address,
        chain_name: "ethereum",
        name: "Imported Wallet"
      });
      console.log(`✅ Wallet created in database with ID: ${walletId}`);
    }

    // Store wallet data in SecureStore for authentication
    const walletData = {
      address: String(address),
      privateKey: String(wallet.privateKey),
      lastActive: Date.now().toString()
    };
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, JSON.stringify(walletData));
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_SEED_PHRASE, String(seedPhrase));
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_ADDRESS, String(address));
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_ID, String(userId));

    // Get user's email and password hash from database
    const { data: userData, error: userError } = await supabaseAdmin
      .from('auth_users')
      .select('email, password_hash')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error("❌ Error getting user data:", userError);
      throw new Error("Failed to get user data");
    }

    if (!userData) {
      console.error("❌ No user data found");
      throw new Error("No user data found");
    }

    // Store user's email and password hash
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_EMAIL, String(userData.email));
    
    // Handle password hash
    try {
      // Create a default password hash structure if none exists
      const defaultPasswordData = {
        hash: crypto.randomBytes(32).toString('hex'),
        salt: crypto.randomBytes(16).toString('hex')
      };

      // Use default if password_hash is undefined or null
      const passwordHash = userData.password_hash 
        ? (typeof userData.password_hash === 'string' 
          ? JSON.parse(userData.password_hash) 
          : userData.password_hash)
        : defaultPasswordData;

      if (passwordHash && typeof passwordHash === 'object') {
        const passwordData = {
          hash: String(passwordHash.hash || defaultPasswordData.hash),
          salt: String(passwordHash.salt || defaultPasswordData.salt)
        };
        console.log('Storing password data:', JSON.stringify(passwordData));
        await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_PASSWORD, JSON.stringify(passwordData));
      } else {
        console.log('Using default password data');
        await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_PASSWORD, JSON.stringify(defaultPasswordData));
      }
    } catch (error) {
      console.error("❌ Error processing password hash:", error);
      throw new Error("Failed to process password hash");
    }

    return { 
      address, 
      type: "classic",
      chainId: 1
    };
  } catch (error) {
    console.error("Failed to import wallet from seed phrase:", error);
    throw error;
  }
};

/**
 * ✅ Create a new Classic Wallet
 * @param password Optional password for wallet encryption
 */
export const createClassicWallet = async (password?: string): Promise<WalletData> => {
  try {
    // Generate a new random wallet
    const wallet = ethers.Wallet.createRandom();
    if (!wallet.mnemonic?.phrase) {
      throw new Error("Failed to generate seed phrase");
    }

    const address = await wallet.getAddress();
    const seedPhrase = wallet.mnemonic.phrase;

    // Store wallet data as a single object for auth
    const walletData = {
      address,
      privateKey: wallet.privateKey,
      lastActive: Date.now().toString()
    };
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, JSON.stringify(walletData));

    // Store seed phrase temporarily for setup
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_SEED_PHRASE, seedPhrase);

    // Store password if provided
    if (password) {
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_PASSWORD, password);
    }

    // Get user ID from SecureStore
    const userId = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
    if (!userId) {
      throw new Error("No user ID found");
    }

    // Store wallet in database
    await createWallet({
      user_id: userId,
      public_address: address,
      chain_name: "ethereum"
    });

    return { 
      address, 
      type: "classic",
      hasPassword: !!password
    };
  } catch (error) {
    console.error("Failed to create classic wallet:", error);
    throw error;
  }
};

/**
 * ✅ Get stored wallet data
 */
export const getStoredWallet = async (): Promise<WalletData | null> => {
  console.log('[WalletApi] Starting getStoredWallet');
  try {
    console.log('[WalletApi] Retrieving wallet data from SecureStore');
    const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    console.log('[WalletApi] Retrieved wallet data:', walletDataStr ? 'exists' : 'null');
    
    if (!walletDataStr) {
      console.log('[WalletApi] No wallet data found in SecureStore');
      return null;
    }

    console.log('[WalletApi] Parsing wallet data');
    const walletData = JSON.parse(walletDataStr);
    console.log('[WalletApi] Parsed wallet data:', {
      hasAddress: !!walletData.address,
      hasType: !!walletData.type,
      hasChainId: !!walletData.chainId,
      hasPassword: !!walletData.hasPassword
    });

    return {
      address: walletData.address,
      type: walletData.type || 'classic',
      chainId: walletData.chainId,
      hasPassword: walletData.hasPassword
    };
  } catch (error) {
    console.error('[WalletApi] Error in getStoredWallet:', error);
    return null;
  }
};

/**
 * ✅ Sign a transaction
 */
export const signTransaction = async (transaction: ethers.Transaction): Promise<string> => {
  try {
    const privateKey = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PRIVATE_KEY);
    if (!privateKey) throw new Error("No private key found");

    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signTransaction(transaction);
  } catch (error) {
    console.error("Failed to sign transaction:", error);
    throw error;
  }
};

/**
 * ✅ Sign a message
 */
export const signMessage = async (message: string): Promise<string> => {
  try {
    const privateKey = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PRIVATE_KEY);
    if (!privateKey) throw new Error("No private key found");

    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signMessage(message);
  } catch (error) {
    console.error("Failed to sign message:", error);
    throw error;
  }
};

/**
 * Complete wallet setup
 */
export const completeWalletSetup = async (): Promise<boolean> => {
  try {
    console.log('[WalletApi] Starting wallet setup completion...');
    
    // 1. Read from SecureStore
    const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    const password = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PASSWORD);
    
    if (!walletDataStr || !password) {
      throw new Error('Missing wallet data or password');
    }

    // 2. Parse wallet data
    const walletData = JSON.parse(walletDataStr);
    if (!walletData.seedPhrase) {
      throw new Error('Missing seed phrase in wallet data');
    }

    console.log('[WalletApi] Storing wallet data...');

    // 3. Encrypt and store the seed phrase permanently
    const encryptedSeedPhrase = await encryptSeedPhrase(walletData.seedPhrase, password);
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_SEED_PHRASE, encryptedSeedPhrase);
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_PRIVATE_KEY, walletData.privateKey);

    // 4. Clean up temporary data
    delete walletData.seedPhrase;
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, JSON.stringify(walletData));

    console.log('[WalletApi] Wallet setup completed successfully');
    return true;
  } catch (error) {
    console.error('[WalletApi] Error completing wallet setup:', error);
    throw error;
  }
};

export const clearWalletStorage = async () => {
  try {
    console.log('🧹 [WalletApi] Clearing wallet storage...');
    
    // Clear SecureStore wallet data
    await SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_DATA);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_ADDRESS);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_PRIVATE_KEY);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_SEED_PHRASE);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_PASSWORD);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE);
    
    // Clear Supabase storage
    await clearSupabaseStorage();
    
    console.log('✅ [WalletApi] Successfully cleared wallet storage');
  } catch (error) {
    console.error('❌ [WalletApi] Failed to clear wallet storage:', error);
    throw error;
  }
};

export const importWallet = async (privateKey: string): Promise<string> => {
  console.log('[WalletApi] Starting importWallet');
  try {
    console.log('[WalletApi] Creating wallet from private key');
    const wallet = new ethers.Wallet(privateKey);
    console.log('[WalletApi] Wallet created, address:', wallet.address);

    console.log('[WalletApi] Storing wallet data in SecureStore');
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, JSON.stringify({
      address: wallet.address,
      privateKey: wallet.privateKey,
      type: 'classic',
      chainId: 1
    }));
    console.log('[WalletApi] Wallet data stored successfully');

    return wallet.address;
  } catch (error) {
    console.error('[WalletApi] Error in importWallet:', error);
    throw error;
  }
};

export const createLocalWallet = async (): Promise<string> => {
  console.log('[WalletApi] Starting createWallet');
  try {
    console.log('[WalletApi] Creating random wallet');
    const wallet = ethers.Wallet.createRandom();
    console.log('[WalletApi] Wallet created, address:', wallet.address);

    if (!wallet.mnemonic?.phrase) {
      console.error('[WalletApi] No mnemonic phrase generated');
      throw new Error('Failed to generate seed phrase');
    }

    console.log('[WalletApi] Storing wallet data in SecureStore');
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, JSON.stringify({
      address: wallet.address,
      privateKey: wallet.privateKey,
      type: 'classic',
      chainId: 1
    }));
    console.log('[WalletApi] Wallet data stored successfully');

    return wallet.address;
  } catch (error) {
    console.error('[WalletApi] Error in createWallet:', error);
    throw error;
  }
}; 