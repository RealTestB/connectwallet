import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { createSmartWallet } from "./walletService"; // Import the Smart Wallet creation function

// ✅ Fetch environment variables from expo-constants
const { ALCHEMY_ACCOUNT_KIT_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } = Constants.expoConfig.extra;

// ✅ Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * ✅ Sign Up New User
 */
export const signUpUser = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            console.error("Sign-up error:", error.message);
            return { success: false, error: error.message };
        }

        if (data.session) {
            await SecureStore.setItemAsync("authToken", data.session.access_token);
            await SecureStore.setItemAsync("refreshToken", data.session.refresh_token);
        }

        return { success: true, user: data.user, session: data.session };
    } catch (err) {
        console.error("Unexpected sign-up error:", err);
        return { success: false, error: "An unexpected error occurred." };
    }
};

/**
 * ✅ Sign In User
 */
export const signInUser = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            console.error("Sign-in error:", error.message);
            return { success: false, error: error.message };
        }

        if (data.session) {
            await SecureStore.setItemAsync("authToken", data.session.access_token);
            await SecureStore.setItemAsync("refreshToken", data.session.refresh_token);
        }

        // After successful sign-in, check wallet type
        const walletInfo = await checkWalletType();
        
        return { 
            success: true, 
            user: data.user, 
            session: data.session,
            ...walletInfo 
        };
    } catch (err) {
        console.error("Unexpected sign-in error:", err);
        return { success: false, error: "An unexpected error occurred." };
    }
};

/**
 * ✅ Check Wallet Type
 * Helper function to determine what type of wallet the user has
 */
export const checkWalletType = async () => {
    try {
        console.log('[AuthAPI] Starting wallet type check...');
        // Check for Classic Wallet
        const classicWalletKey = await SecureStore.getItemAsync("walletPrivateKey");
        console.log('[AuthAPI] Classic wallet check:', classicWalletKey !== null);
        const hasClassicWallet = classicWalletKey !== null;
        
        // Check for Smart Wallet
        const smartWalletAddress = await SecureStore.getItemAsync("smartWalletAddress");
        console.log('[AuthAPI] Smart wallet check:', smartWalletAddress !== null);
        const hasSmartWallet = smartWalletAddress !== null;

        const result = {
            hasClassicWallet,
            hasSmartWallet,
            walletAddress: hasSmartWallet ? smartWalletAddress : null,
            walletType: hasSmartWallet ? 'smart' : (hasClassicWallet ? 'classic' : null)
        };
        console.log('[AuthAPI] Wallet type check result:', result);
        return result;
    } catch (error) {
        console.error('[AuthAPI] Error checking wallet type:', error);
        return {
            hasClassicWallet: false,
            hasSmartWallet: false,
            walletAddress: null,
            walletType: null
        };
    }
};

/**
 * ✅ Authenticate User & Check Wallet Type
 */
export const authenticateUser = async () => {
    try {
        console.log('[AuthAPI] Starting authentication check...');
        // First check if user has any type of wallet
        console.log('[AuthAPI] Checking wallet type...');
        const walletInfo = await checkWalletType();
        console.log('[AuthAPI] Wallet info:', walletInfo);
        
        // If they have a wallet, check if they're authenticated
        if (walletInfo.hasClassicWallet || walletInfo.hasSmartWallet) {
            console.log('[AuthAPI] Wallet found, checking user authentication...');
            const userResponse = await getCurrentUser();
            console.log('[AuthAPI] User response:', userResponse);
            if (!userResponse.success) {
                console.log('[AuthAPI] User not authenticated');
                return {
                    isAuthenticated: false,
                    ...walletInfo
                };
            }
            
            console.log('[AuthAPI] User authenticated successfully');
            return {
                isAuthenticated: true,
                user: userResponse.data,
                ...walletInfo
            };
        }
        
        console.log('[AuthAPI] No wallet found');
        // If no wallet exists, return appropriate response
        return {
            isAuthenticated: false,
            hasClassicWallet: false,
            hasSmartWallet: false,
            walletAddress: null,
            walletType: null
        };
    } catch (error) {
        console.error('[AuthAPI] Authentication check failed:', error);
        return null;
    }
};

/**
 * ✅ Refresh User Session (Auto Refresh Token)
 */
export const refreshSession = async () => {
    try {
        const refreshToken = await SecureStore.getItemAsync("refreshToken");

        if (!refreshToken) {
            console.warn("No refresh token found, user must log in again.");
            return { success: false, error: "Session expired, please log in again." };
        }

        const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

        if (error) {
            console.error("Session refresh error:", error.message);
            return { success: false, error: error.message };
        }

        await SecureStore.setItemAsync("authToken", data.session.access_token);
        await SecureStore.setItemAsync("refreshToken", data.session.refresh_token);

        return { success: true, user: data.user, session: data.session };
    } catch (err) {
        console.error("Unexpected session refresh error:", err);
        return { success: false, error: "An unexpected error occurred." };
    }
};

/**
 * ✅ Get Current User (Auto Refresh If Needed)
 */
export const getCurrentUser = async () => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
            console.warn("User session expired, attempting to refresh...");
            const refreshedSession = await refreshSession();

            if (!refreshedSession.success) {
                console.error("Session refresh failed:", refreshedSession.error);
                return { success: false, error: "Session expired, please log in again." };
            }

            return { success: true, data: refreshedSession.user };
        }

        return { success: true, data: user };
    } catch (err) {
        console.error("Unexpected error in getCurrentUser:", err);
        return { success: false, error: "Unexpected error occurred." };
    }
};

export default supabase;


