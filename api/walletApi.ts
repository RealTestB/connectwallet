import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";
import config from "./config";
import { createWallet } from "./supabaseApi";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { getTokenBalances } from "./tokensApi";
import { supabaseAdmin } from "../lib/supabase";
import { encryptSeedPhrase } from "./securityApi";
import { clearSupabaseStorage } from "../lib/supabase";

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
    const wallet = new ethers.Wallet(privateKey);
    const address = await wallet.getAddress();

    // Store wallet data as a single object for auth
    const walletData = {
      address,
      privateKey: wallet.privateKey,
      lastActive: Date.now().toString()
    };
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, JSON.stringify(walletData));

    // Get user ID from SecureStore
    const userId = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
    if (!userId) {
      throw new Error("No user ID found");
    }

    // Store wallet in database with imported flag
    const walletId = await createWallet({
      user_id: userId,
      public_address: address,
      chain_name: "ethereum",
      imported: true
    });

    // Fetch token balances
    const tokenBalances = await getTokenBalances(address, 1); // Use Ethereum mainnet for initial import
    if (!Array.isArray(tokenBalances)) {
      throw new Error("Failed to fetch token balances");
    }

    // Store token balances in database
    const balancesToInsert = tokenBalances.map(token => ({
      wallet_id: walletId,
      token_address: token.contractAddress,
      chain_id: 1, // Ethereum mainnet
      symbol: token.metadata?.symbol || "UNKNOWN",
      name: token.metadata?.name || "Unknown Token",
      decimals: token.metadata?.decimals || 18,
      balance: token.formattedBalance,
      timestamp: new Date().toISOString()
    }));

    if (balancesToInsert.length > 0) {
      const { error } = await supabaseAdmin
        .from("token_balances")
        .insert(balancesToInsert);

      if (error) {
        console.error("Failed to store token balances:", error);
      }
    }

    return { 
      address, 
      type: "classic"
    };
  } catch (error) {
    console.error("Failed to import wallet from private key:", error);
    throw error;
  }
};

/**
 * ✅ Import Classic Wallet from Seed Phrase
 */
export const importClassicWalletFromSeedPhrase = async (seedPhrase: string): Promise<WalletData> => {
  try {
    const wallet = ethers.Wallet.fromPhrase(seedPhrase);
    const address = await wallet.getAddress();

    // Store wallet data as a single object for auth
    const walletData = {
      address,
      privateKey: wallet.privateKey,
      lastActive: Date.now().toString()
    };
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, JSON.stringify(walletData));

    // Store seed phrase securely
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_SEED_PHRASE, seedPhrase);
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_PRIVATE_KEY, wallet.privateKey);

    // Get user ID from SecureStore
    const userId = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
    if (!userId) {
      throw new Error("No user ID found");
    }

    // Store wallet in database (NOT as imported since it's from seed phrase)
    const walletId = await createWallet({
      user_id: userId,
      public_address: address,
      chain_name: "ethereum",
      imported: false // Changed from true to false since seed phrase wallets aren't "imported"
    });

    // Fetch token balances
    const tokenBalances = await getTokenBalances(address, 1); // Use Ethereum mainnet for initial import
    if (!Array.isArray(tokenBalances)) {
      throw new Error("Failed to fetch token balances");
    }

    // Store token balances in database
    const balancesToInsert = tokenBalances.map(token => ({
      wallet_id: walletId,
      token_address: token.contractAddress,
      chain_id: 1, // Ethereum mainnet
      symbol: token.metadata?.symbol || "UNKNOWN",
      name: token.metadata?.name || "Unknown Token",
      decimals: token.metadata?.decimals || 18,
      balance: token.formattedBalance,
      timestamp: new Date().toISOString()
    }));

    if (balancesToInsert.length > 0) {
      const { error } = await supabaseAdmin
        .from("token_balances")
        .insert(balancesToInsert);

      if (error) {
        console.error("Failed to store token balances:", error);
      }
    }

    return { 
      address, 
      type: "classic"
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
    await SecureStore.setItemAsync(STORAGE_KEYS.TEMP_SEED_PHRASE, seedPhrase);

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
  try {
    const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    if (!walletDataStr) return null;

    const walletData = JSON.parse(walletDataStr);
    return {
      address: walletData.address,
      type: "classic"
    };
  } catch (error) {
    console.error("Failed to get stored wallet:", error);
    throw error;
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
    const tempSeedPhrase = await SecureStore.getItemAsync(STORAGE_KEYS.TEMP_SEED_PHRASE);
    const password = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PASSWORD);
    const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    
    if (!tempSeedPhrase || !password || !walletDataStr) {
      throw new Error('Missing temporary setup data, password, or wallet data');
    }

    // 2. Use existing wallet data
    const walletData = JSON.parse(walletDataStr);

    console.log('[WalletApi] Storing wallet data and clearing setup state...');

    // 3. Encrypt and store the seed phrase permanently
    const encryptedSeedPhrase = await encryptSeedPhrase(tempSeedPhrase, password);
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_SEED_PHRASE, encryptedSeedPhrase);
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_PRIVATE_KEY, walletData.privateKey);

    // 4. Set setup state to complete
    await SecureStore.setItemAsync(STORAGE_KEYS.SETUP_STATE, STORAGE_KEYS.SETUP_STEPS.COMPLETE);

    // 5. Clear temporary setup data
    await SecureStore.deleteItemAsync(STORAGE_KEYS.TEMP_SEED_PHRASE);

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