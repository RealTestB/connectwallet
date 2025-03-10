import { createClient } from '@supabase/supabase-js';

// Supabase credentials
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@env";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * AUTHENTICATION SERVICES
 */

export const signUpUser = async (email, password) => {
    const { user, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return user;
};

export const signInUser = async (email, password) => {
    const { user, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return user;
};

export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

/**
 * WALLET SERVICES
 */

export const getUserWallet = async (userId) => {
    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();
    
    if (error) throw error;
    return data;
};

export const createWallet = async (userId, walletName, publicAddress) => {
    const { data, error } = await supabase
        .from('wallets')
        .insert([{ user_id: userId, name: walletName, public_address: publicAddress }]);
    
    if (error) throw error;
    return data;
};

/**
 * TRANSACTION SERVICES
 */

export const getTransactions = async (walletId) => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
};

export const addTransaction = async (walletId, hash, from, to, value, status, networkId, gasPrice, gasUsed) => {
    const { data, error } = await supabase
        .from('transactions')
        .insert([{ wallet_id: walletId, hash, from_address: from, to_address: to, value, status, network_id: networkId, gas_price: gasPrice, gas_used: gasUsed }]);
    
    if (error) throw error;
    return data;
};

/**
 * TOKEN BALANCES SERVICES
 */

export const getTokenBalances = async (walletId) => {
    const { data, error } = await supabase
        .from('token_balances')
        .select('*')
        .eq('wallet_id', walletId)
        .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
};

export const updateTokenBalance = async (walletId, tokenAddress, balance, usdValue) => {
    const { data, error } = await supabase
        .from('token_balances')
        .upsert([{ wallet_id: walletId, token_address: tokenAddress, balance, usd_value: usdValue }]);
    
    if (error) throw error;
    return data;
};

export default supabase;