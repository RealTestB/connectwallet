import { createClient } from "@supabase/supabase-js";
import config from './config';

// Create Supabase client
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

/**
 * AUTHENTICATION SERVICES
 */

// Sign Up New User
export const signUpUser = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
            console.error("Sign-up error:", error.message);
            return { success: false, error: error.message };
        }
        return { success: true, data };
    } catch (err) {
        console.error("Unexpected error in signUpUser:", err);
        return { success: false, error: "Unexpected error occurred." };
    }
};

// Sign In Existing User
export const signInUser = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error("Sign-in error:", error.message);
            return { success: false, error: error.message };
        }
        return { success: true, data };
    } catch (err) {
        console.error("Unexpected error in signInUser:", err);
        return { success: false, error: "Unexpected error occurred." };
    }
};

// Get Currently Logged-in User
export const getCurrentUser = async () => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
            console.error("Error fetching user:", error.message);
            return { success: false, error: error.message };
        }
        return { success: true, data: user };
    } catch (err) {
        console.error("Unexpected error in getCurrentUser:", err);
        return { success: false, error: "Unexpected error occurred." };
    }
};

/**
 * WALLET MANAGEMENT
 */

// Get Wallet by User ID
export const getUserWallet = async (userId) => {
    try {
        const { data, error } = await supabase
            .from("wallets")
            .select("*")
            .eq("user_id", userId)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error("Error fetching wallet:", error.message);
        return { success: false, error: error.message };
    }
};

// Create New Wallet
export const createWallet = async (userId, walletName, publicAddress) => {
    try {
        const { data, error } = await supabase.rpc("create_wallet", {
            user_id: userId,
            name: walletName,
            public_address: publicAddress
        });

        if (error) {
            console.error("Error creating wallet:", error.message);
            return { success: false, error: error.message };
        }
        return { success: true, data };
    } catch (err) {
        console.error("Unexpected error in createWallet:", err);
        return { success: false, error: "Unexpected error occurred." };
    }
};

/**
 * TRANSACTION SERVICES
 */

// Fetch Transactions by Wallet ID with Pagination
export const getTransactions = async (walletId, page = 1, pageSize = 20) => {
    try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
            .from("transactions")
            .select("hash, from_address, to_address, value, status, network_id, gas_price, gas_used, timestamp")
            .eq("wallet_id", walletId)
            .order("timestamp", { ascending: false })
            .range(from, to);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error("Error fetching transactions:", error.message);
        return { success: false, error: error.message };
    }
};

// Add New Transaction
export const addTransaction = async (walletId, hash, from, to, value, status, networkId, gasPrice, gasUsed) => {
    try {
        const { data, error } = await supabase.rpc("add_transaction", {
            wallet_id: walletId,
            hash,
            from_address: from,
            to_address: to,
            value,
            status,
            network_id: networkId,
            gas_price: gasPrice,
            gas_used: gasUsed
        });

        if (error) {
            console.error("Error adding transaction:", error.message);
            return { success: false, error: error.message };
        }
        return { success: true, data };
    } catch (err) {
        console.error("Unexpected error in addTransaction:", err);
        return { success: false, error: "Unexpected error occurred." };
    }
};

/**
 * TOKEN BALANCE SERVICES
 */

// Fetch Token Balances
export const getTokenBalances = async (walletId) => {
    try {
        const { data, error } = await supabase
            .from("token_balances")
            .select("token_address, balance, usd_value")
            .eq("wallet_id", walletId)
            .order("timestamp", { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error("Error fetching token balances:", error.message);
        return { success: false, error: error.message };
    }
};

// Update Token Balance
export const updateTokenBalance = async (walletId, tokenAddress, balance, usdValue) => {
    try {
        const { data, error } = await supabase.rpc("update_token_balance", {
            wallet_id: walletId,
            token_address: tokenAddress,
            balance,
            usd_value: usdValue
        });

        if (error) {
            console.error("Error updating token balance:", error.message);
            return { success: false, error: error.message };
        }
        return { success: true, data };
    } catch (err) {
        console.error("Unexpected error in updateTokenBalance:", err);
        return { success: false, error: "Unexpected error occurred." };
    }
};

export default supabase;


