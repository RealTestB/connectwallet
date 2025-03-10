import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";
import config from "./config";
import { getAuthToken } from "./authApi";

// Export supabase URL if needed elsewhere
export const SUPABASE_URL = config.supabase.url;

/**
 * ✅ Get Transaction History
 * Fetches transaction history for classic wallets
 */
export const getTransactionHistory = async (walletAddress) => {
    try {
        return await fetchClassicTransactions(walletAddress);
    } catch (error) {
        console.error("Failed to fetch transaction history:", error);
        return { success: false, error: "Failed to fetch transaction history." };
    }
};

/**
 * ✅ Send Transaction
 * Sends a transaction from a classic wallet
 */
export const sendTransaction = async (to, amount) => {
    try {
        return await sendClassicWalletTransaction(to, amount);
    } catch (error) {
        console.error("Failed to send transaction:", error);
        return { success: false, error: "Failed to send transaction." };
    }
};

/**
 * ✅ Fetch Transactions for Classic Wallets (Ethers.js)
 */
const fetchClassicTransactions = async (walletAddress) => {
    try {
        const provider = new ethers.JsonRpcProvider(config.alchemy.rpcUrl());
        
        const history = await provider.getHistory(walletAddress);
        return { 
            success: true, 
            transactions: history.map(tx => ({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value.toString(),
                timestamp: tx.timestamp
            }))
        };
    } catch (error) {
        console.error("Failed to fetch classic wallet transactions:", error);
        return { success: false, error: "Failed to fetch classic wallet transactions." };
    }
};

/**
 * ✅ Send Transaction from Classic Wallet
 */
const sendClassicWalletTransaction = async (to, amount) => {
    try {
        const privateKey = await SecureStore.getItemAsync("walletPrivateKey");
        if (!privateKey) {
            throw new Error("Private key not found");
        }

        const provider = new ethers.JsonRpcProvider(config.alchemy.rpcUrl());
        
        const wallet = new ethers.Wallet(privateKey, provider);
        const tx = await wallet.sendTransaction({
            to,
            value: ethers.parseEther(amount)
        });

        return { success: true, hash: tx.hash };
    } catch (error) {
        console.error("Failed to send classic wallet transaction:", error);
        return { success: false, error: "Failed to send classic wallet transaction." };
    }
};

/**
 * ✅ Store New Transaction (Classic Wallets Only)
 */
export const addTransaction = async (walletAddress, txData) => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${config.supabase.url}/transactions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                wallet_address: walletAddress,
                ...txData
            })
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            console.error("Supabase transaction store error:", errorResponse);
            return { success: false, error: errorResponse };
        }

        return { success: true, data: await response.json() };
    } catch (error) {
        console.error("Failed to store transaction:", error);
        return { success: false, error: "Unexpected error occurred." };
    }
};

