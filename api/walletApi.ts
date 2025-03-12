import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";
import config from "./config";
import { SUPPORTED_CHAINS } from "./config";
import { WalletKit } from "@reown/walletkit";

export interface WalletData {
  address: string;
  type: "classic" | "smart";
  chainId?: number;
  features?: {
    verify: boolean;
    notifications: boolean;
    oneClickAuth: boolean;
  };
}

/**
 * ✅ Import Classic Wallet from Private Key
 */
export const importClassicWalletFromPrivateKey = async (privateKey: string): Promise<WalletData> => {
  try {
    const wallet = new ethers.Wallet(privateKey);
    const address = await wallet.getAddress();

    // Store the private key securely
    await SecureStore.setItemAsync("walletPrivateKey", privateKey);
    await SecureStore.setItemAsync("walletAddress", address);

    return { address, type: "classic" };
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

    // Store the private key securely
    await SecureStore.setItemAsync("walletPrivateKey", privateKey);
    await SecureStore.setItemAsync("walletAddress", address);

    return { address, type: "classic" };
  } catch (error) {
    console.error("Classic Wallet import from seed phrase failed:", error);
    throw error;
  }
};

/**
 * ✅ Retrieve Encrypted Private Key (For Classic Wallets)
 */
export const getStoredPrivateKey = async (password: string): Promise<string> => {
  try {
    const encryptedKey = await SecureStore.getItemAsync("walletPrivateKey");
    if (!encryptedKey) throw new Error("No wallet found.");
    return encryptedKey;
  } catch (error) {
    console.error("Failed to retrieve private key:", error);
    throw error;
  }
};

/**
 * ✅ Create a new Smart Wallet using Reown WalletKit
 */
export const createSmartWallet = async (): Promise<WalletData> => {
  try {
    // Initialize WalletKit with Reown configuration
    const kit = await WalletKit.init({
      projectId: config.projectIds.reown,
      metadata: {
        name: "NewWallet",
        description: "A modern wallet application",
        url: "https://newwallet.app",
        icons: [],
        redirect: {
          native: "com.concordianova.connectwallet://",
          universal: "https://newwallet.app"
        }
      }
    });

    // Create a new smart account with advanced configuration
    const account = await kit.createAccount({
      config: {
        enableBatchTransactions: true,
        enablePaymaster: true,
        chainConfig: {
          defaultChain: SUPPORTED_CHAINS.mainnet,
          supportedChains: Object.values(SUPPORTED_CHAINS)
        }
      }
    });

    if (!account || !account.address) {
      throw new Error('Failed to create smart wallet: Invalid account data');
    }

    // Store account information securely
    await SecureStore.setItemAsync("walletAddress", account.address);
    await SecureStore.setItemAsync("walletType", "smart");
    
    // Create default features object
    const features = {
      verify: true,
      notifications: true,
      oneClickAuth: true
    };

    // Store account configuration
    await SecureStore.setItemAsync("accountConfig", JSON.stringify({
      chainId: SUPPORTED_CHAINS.mainnet.chainId,
      features,
      recoveryEnabled: true
    }));
    
    return {
      address: account.address,
      type: "smart",
      chainId: SUPPORTED_CHAINS.mainnet.chainId,
      features
    };
  } catch (error) {
    console.error("Smart Wallet creation failed:", error);
    throw error;
  }
}; 