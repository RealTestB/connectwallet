import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";
import config from "./config";
import { createWallet } from "./supabaseApi";
import { STORAGE_KEYS } from "../constants/storageKeys";

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

    // Get temp_user_id from SecureStore
    const tempUserId = await SecureStore.getItemAsync(STORAGE_KEYS.TEMP_USER_ID);
    if (!tempUserId) {
      throw new Error("No temp_user_id found");
    }

    // Store wallet in database
    await createWallet({
      public_address: address,
      temp_user_id: tempUserId,
      chain_name: "ethereum"
    });

    return { 
      address, 
      type: "classic",
      chainId: config.chain.chainId
    };
  } catch (error) {
    console.error("Classic Wallet import failed:", error);
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

    // Store seed phrase separately
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_SEED_PHRASE, seedPhrase);

    // Get temp_user_id from SecureStore
    const tempUserId = await SecureStore.getItemAsync(STORAGE_KEYS.TEMP_USER_ID);
    if (!tempUserId) {
      throw new Error("No temp_user_id found");
    }

    // Store wallet in database
    await createWallet({
      public_address: address,
      temp_user_id: tempUserId,
      chain_name: "ethereum"
    });

    return { 
      address, 
      type: "classic",
      chainId: config.chain.chainId
    };
  } catch (error) {
    console.error("Classic Wallet import from seed phrase failed:", error);
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

    // Get temp_user_id from SecureStore
    const tempUserId = await SecureStore.getItemAsync(STORAGE_KEYS.TEMP_USER_ID);
    if (!tempUserId) {
      throw new Error("No temp_user_id found");
    }

    // Store wallet in database
    await createWallet({
      public_address: address,
      temp_user_id: tempUserId,
      chain_name: "ethereum"
    });

    return { 
      address, 
      type: "classic",
      chainId: config.chain.chainId,
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
      type: "classic",
      chainId: config.chain.chainId
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
    const tempUserId = await SecureStore.getItemAsync(STORAGE_KEYS.TEMP_USER_ID);
    
    if (!tempSeedPhrase || !tempUserId) {
      throw new Error('Missing temporary setup data');
    }

    // 2. Create wallet from seed phrase
    const wallet = ethers.Wallet.fromPhrase(tempSeedPhrase);

    // 3. Store only essential wallet data
    const walletData = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      lastActive: Date.now().toString()
    };

    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, JSON.stringify(walletData));
    await SecureStore.setItemAsync(STORAGE_KEYS.SETUP_STATE, STORAGE_KEYS.SETUP_STEPS.COMPLETE);

    // 4. Clear temp data from SecureStore
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.TEMP_SEED_PHRASE),
      SecureStore.deleteItemAsync(STORAGE_KEYS.TEMP_USER_ID)
    ]);

    return true;
  } catch (error) {
    console.error('[WalletApi] Error completing wallet setup:', error);
    throw error;
  }
}; 