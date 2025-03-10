import Constants from "expo-constants";
import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";
import { http } from "viem";
import { mainnet, goerli, sepolia } from "viem/chains";

// Define supported networks for classic wallets
const SUPPORTED_CHAINS = {
  mainnet,
  goerli,
  sepolia
};

// Helper function to save the last used network
const saveLastUsedNetwork = async (network) => {
  try {
    await SecureStore.setItemAsync('lastUsedNetwork', network);
  } catch (error) {
    console.error('Failed to save network:', error);
  }
};

/**
 * ✅ Create a new Classic Wallet
 */
export const createClassicWallet = async () => {
  try {
    const wallet = ethers.Wallet.createRandom();
    const address = await wallet.getAddress();
    const privateKey = wallet.privateKey;

    // Store the private key securely
    await SecureStore.setItemAsync("walletPrivateKey", privateKey);
    await SecureStore.setItemAsync("walletAddress", address);

    return { address, type: "classic" };
  } catch (error) {
    console.error("Classic Wallet creation failed:", error);
    throw error;
  }
};

/**
 * ✅ Import Classic Wallet from Private Key
 */
export const importClassicWalletFromPrivateKey = async (privateKey) => {
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
export const importClassicWalletFromSeedPhrase = async (seedPhrase) => {
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
 * ✅ Get Wallet Type and Address
 */
export const getWalletInfo = async () => {
  try {
    const classicWalletAddress = await SecureStore.getItemAsync("walletAddress");
    const chain = await SecureStore.getItemAsync("lastUsedNetwork") || "mainnet";

    if (classicWalletAddress) {
      return { address: classicWalletAddress, type: "classic", chain };
    }
    return null;
  } catch (error) {
    console.error("Failed to get wallet info:", error);
    throw error;
  }
};

/**
 * ✅ Retrieve Encrypted Private Key (For Classic Wallets)
 */
export const getStoredPrivateKey = async (password) => {
    try {
        const encryptedKey = await SecureStore.getItemAsync("walletPrivateKey");
        if (!encryptedKey) throw new Error("No wallet found.");
        return await decryptPrivateKey(encryptedKey, password);
    } catch (error) {
        console.error("Failed to retrieve private key:", error);
        throw error;
    }
};

/**
 * ✅ Logout & Clear Wallet Data
 */
export const logoutUser = async () => {
    await SecureStore.deleteItemAsync("walletPrivateKey");
    await SecureStore.deleteItemAsync("walletAddress");
    await SecureStore.deleteItemAsync("authToken");
    await SecureStore.deleteItemAsync("lastUsedNetwork");
};



