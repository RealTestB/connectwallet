import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";
import config from "./config";

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

    // Store the private key securely
    await SecureStore.setItemAsync(config.wallet.classic.storageKeys.privateKey, privateKey);
    await SecureStore.setItemAsync(config.wallet.classic.storageKeys.addresses, address);

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
    const privateKey = wallet.privateKey;

    // Store the private key and seed phrase securely
    await SecureStore.setItemAsync(config.wallet.classic.storageKeys.privateKey, privateKey);
    await SecureStore.setItemAsync(config.wallet.classic.storageKeys.seedPhrase, seedPhrase);
    await SecureStore.setItemAsync(config.wallet.classic.storageKeys.addresses, address);

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
    const privateKey = wallet.privateKey;
    const seedPhrase = wallet.mnemonic.phrase;

    // Store wallet data securely
    await SecureStore.setItemAsync(config.wallet.classic.storageKeys.privateKey, privateKey);
    await SecureStore.setItemAsync(config.wallet.classic.storageKeys.seedPhrase, seedPhrase);
    await SecureStore.setItemAsync(config.wallet.classic.storageKeys.addresses, address);

    // Store password if provided
    if (password) {
      await SecureStore.setItemAsync('walletPassword', password);
    }

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
    const address = await SecureStore.getItemAsync(config.wallet.classic.storageKeys.addresses);
    if (!address) return null;

    return {
      address,
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
    const privateKey = await SecureStore.getItemAsync(config.wallet.classic.storageKeys.privateKey);
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
    const privateKey = await SecureStore.getItemAsync(config.wallet.classic.storageKeys.privateKey);
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
export const completeWalletSetup = async (): Promise<void> => {
  try {
    console.log('[WalletApi] Completing wallet setup');
    const wallet = await getStoredWallet();
    if (!wallet) {
      throw new Error('No wallet found');
    }
    console.log('[WalletApi] Wallet setup completed successfully');
  } catch (error) {
    console.error('[WalletApi] Error completing wallet setup:', error);
    throw error;
  }
}; 