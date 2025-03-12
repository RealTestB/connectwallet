import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";
import config from "./config";
import { WalletKit } from "@reown/walletkit";

// Define supported chains based on the Reown SDK documentation
const CHAINS = {
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
    blockExplorerUrl: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  }
};

// Global WalletKit instance
let walletKitInstance: WalletKit | null = null;

const getWalletKit = async (): Promise<WalletKit> => {
  if (!walletKitInstance) {
    walletKitInstance = await WalletKit.init({
      projectId: config.projectIds.reown,
      metadata: {
        name: config.wallet.smart.metadata.name,
        description: config.wallet.smart.metadata.description,
        url: config.wallet.smart.metadata.url,
        icons: config.wallet.smart.metadata.icons,
        redirect: {
          native: config.wallet.smart.metadata.redirect.native,
          universal: config.wallet.smart.metadata.url
        }
      }
    });
  }
  return walletKitInstance;
};

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
    console.log('Initializing WalletKit...');
    const walletKit = await getWalletKit();
    
    console.log('Creating smart account...');
    const account = await walletKit.createAccount({
      config: {
        chainConfig: {
          defaultChain: CHAINS.mainnet,
          supportedChains: [CHAINS.mainnet]
        }
      }
    });

    console.log('Smart account created:', account);

    // Store the account information securely
    await SecureStore.setItemAsync('walletAddress', account.address);
    await SecureStore.setItemAsync('walletType', 'smart');
    await SecureStore.setItemAsync('chainId', CHAINS.mainnet.chainId.toString());

    // Create default features object
    const features = {
      verify: true,
      notifications: true,
      oneClickAuth: true
    };

    return {
      address: account.address,
      type: 'smart',
      chainId: CHAINS.mainnet.chainId,
      features
    };
  } catch (error) {
    console.error('Failed to create smart wallet:', error);
    throw new Error('Failed to create smart wallet. Please try again.');
  }
}; 