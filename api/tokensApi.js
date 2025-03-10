import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";
import config from './config';

/**
 * ✅ Get Token Balances
 * Fetches token balances for classic wallets
 */
export const getTokenBalances = async (address) => {
  try {
    const provider = new ethers.JsonRpcProvider(config.alchemy.rpcUrl());
    return await fetchClassicTokenBalances(address, provider);
  } catch (error) {
    console.error("Failed to fetch token balances:", error);
    return { success: false, error: "Failed to fetch token balances." };
  }
};

/**
 * ✅ Fetch Token Balances for Classic Wallets (Ethers.js)
 */
const fetchClassicTokenBalances = async (walletAddress, provider) => {
  try {
    // ERC20 Token ABI for balanceOf function
    const minABI = [
      {
        constant: true,
        inputs: [{ name: "_owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "balance", type: "uint256" }],
        type: "function",
      },
    ];

    // Get list of token contracts for the address
    const response = await fetch(
      `https://eth-mainnet.g.alchemy.com/v2/${config.alchemy.key}/getTokenBalances/?address=${walletAddress}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch token list");
    }

    const data = await response.json();
    const tokenBalances = [];

    // Fetch balance for each token
    for (const token of data.tokenBalances || []) {
      const contract = new ethers.Contract(token.contractAddress, minABI, provider);
      const balance = await contract.balanceOf(walletAddress);
      tokenBalances.push({
        ...token,
        balance: balance.toString()
      });
    }

    return { success: true, tokenBalances };
  } catch (error) {
    console.error("Failed to fetch classic wallet token balances:", error);
    return { success: false, error: "Failed to fetch classic wallet token balances." };
  }
};

/**
 * ✅ Update Token Balance (Classic Wallets Only)
 */
export const updateTokenBalance = async (walletAddress, tokenAddress, balance, usdValue) => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${SUPABASE_URL}/token_balances`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                wallet_address: walletAddress,
                token_address: tokenAddress,
                balance,
                usd_value: usdValue
            })
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            console.error("Supabase update error:", errorResponse);
            return { success: false, error: errorResponse };
        }

        return { success: true, data: await response.json() };
    } catch (error) {
        console.error("Failed to update token balance:", error);
        return { success: false, error: "Unexpected error occurred." };
    }
};

