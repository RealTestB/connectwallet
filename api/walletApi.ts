import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";
import config from "./config";
import { WalletKit } from "@reown/walletkit";
import { Platform } from "react-native";

// Define supported chains based on the Reown SDK documentation
const CHAINS = {
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${config.alchemy.mainnetKey}`,
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
    try {
      // Log all configuration values
      console.log('[WalletKit] Configuration check:', {
        projectId: config.projectIds.reown,
        metadata: config.wallet.smart.metadata,
        redirectNative: config.wallet.smart.metadata.redirect.native,
        redirectUniversal: config.wallet.smart.metadata.redirect.universal,
        url: config.wallet.smart.metadata.url
      });

      // Validate configuration
      if (!config.projectIds.reown) {
        throw new Error('Missing Reown project ID');
      }

      if (!config.wallet.smart.metadata.redirect.native || !config.wallet.smart.metadata.redirect.universal) {
        throw new Error('Missing redirect URLs');
      }

      if (!config.wallet.smart.metadata.url) {
        throw new Error('Missing metadata URL');
      }

      // Initialize WalletKit
      console.debug('[WalletKit] Starting initialization...');

      // Get platform-specific scheme
      const scheme = Platform.select({
        ios: 'com.concordianova.connectwallet',
        android: 'com.concordianova.connectwallet',
        default: 'com.concordianova.connectwallet'
      });

      const walletKitConfig = {
        projectId: config.projectIds.reown,
        metadata: {
          name: config.wallet.smart.metadata.name,
          description: config.wallet.smart.metadata.description,
          url: config.wallet.smart.metadata.url,
          icons: config.wallet.smart.metadata.icons,
          redirect: {
            native: `${scheme}://`,
            universal: config.wallet.smart.metadata.url
          }
        }
      };
      
      console.debug('[WalletKit] Initializing with config:', walletKitConfig);
      const instance = await WalletKit.init(walletKitConfig);

      walletKitInstance = instance;
      
      console.log('[WalletKit] Successfully initialized');
    } catch (error) {
      console.error('[WalletKit] Initialization failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        config: {
          projectId: config.projectIds.reown ? 'Set' : 'Missing',
          metadata: config.wallet.smart.metadata ? 'Set' : 'Missing',
          redirectNative: config.wallet.smart.metadata.redirect.native ? 'Set' : 'Missing',
          redirectUniversal: config.wallet.smart.metadata.redirect.universal ? 'Set' : 'Missing'
        }
      });
      throw new Error('Failed to initialize WalletKit: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  if (!walletKitInstance) {
    throw new Error('WalletKit initialization failed');
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
    console.log('[SmartWallet] Starting wallet creation process...');
    
    // Validate required configuration
    if (!config.projectIds.reown) {
      console.error('[SmartWallet] Missing Reown project ID');
      throw new Error('Missing Reown project ID');
    }

    if (!config.wallet.smart.metadata.redirect.native || !config.wallet.smart.metadata.redirect.universal) {
      console.error('[SmartWallet] Missing redirect URLs');
      throw new Error('Missing redirect URLs');
    }

    if (!config.alchemy.mainnetKey) {
      console.error('[SmartWallet] Missing Alchemy API key');
      throw new Error('Missing Alchemy API key');
    }
    
    // Check if we already have a wallet address stored
    const existingAddress = await SecureStore.getItemAsync('walletAddress');
    const existingType = await SecureStore.getItemAsync('walletType');
    
    if (existingAddress && existingType === 'smart') {
      console.log('[SmartWallet] Found existing smart wallet:', existingAddress);
      return {
        address: existingAddress,
        type: 'smart',
        chainId: CHAINS.mainnet.chainId,
        features: {
          verify: true,
          notifications: true,
          oneClickAuth: true
        }
      };
    }

    console.log('[SmartWallet] Initializing WalletKit with config:', {
      projectId: config.projectIds.reown,
      metadata: config.wallet.smart.metadata
    });
    
    const walletKit = await getWalletKit();
    
    console.log('[SmartWallet] Creating smart account with chain config:', CHAINS.mainnet);
    const account = await walletKit.createAccount({
      config: {
        chainConfig: {
          defaultChain: CHAINS.mainnet,
          supportedChains: [CHAINS.mainnet]
        }
      }
    });

    console.log('[SmartWallet] Account created successfully:', {
      address: account.address,
      chainId: CHAINS.mainnet.chainId
    });

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

    const walletData = {
      address: account.address,
      type: 'smart' as const,
      chainId: CHAINS.mainnet.chainId,
      features
    };

    console.log('[SmartWallet] Wallet creation completed:', walletData);
    return walletData;
  } catch (error) {
    console.error('[SmartWallet] Creation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to create smart wallet: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}; 