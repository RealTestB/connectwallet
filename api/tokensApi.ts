import { Alchemy, Network, TokenBalancesResponse } from 'alchemy-sdk';
import { getProvider } from '../lib/provider';
import { NETWORKS } from './config';
import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import config from './config';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { supabaseAdmin } from '../lib/supabase';
import { makeHttpRequest } from '../utils/httpClient';

// Map Alchemy networks to our network keys
const ALCHEMY_NETWORKS = {
  'ethereum': Network.ETH_MAINNET,
  'polygon': Network.MATIC_MAINNET,
  'arbitrum': Network.ARB_MAINNET,
  'optimism': Network.OPT_MAINNET
} as const;

export interface TokenMetadata {
  decimals: number;
  logo?: string;
  name?: string;
  symbol?: string;
}

export interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
  error?: string | null;
  metadata?: TokenMetadata;
  formattedBalance?: string;
}

export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
  balance: string;
  balanceUSD?: number;
  price?: number;
  priceChange24h?: number;
  isSpam?: boolean;
}

type NetworkKey = keyof typeof ALCHEMY_NETWORKS;

export interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  rawBalance?: string;
  metadata?: TokenMetadata;
}

export interface TokenPrice {
  price: number;
  change24h?: number;
  marketCap?: number;
  volume24h?: number;
}

export interface TokenTransferRequest {
  tokenAddress: string;
  to: string;
  amount: string;
}

export interface TokenTransfer {
  tokenAddress: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
}

export interface TokenTransferParams {
  contractAddress: string;
  toAddress: string;
  amount: string;
  decimals: number;
  gasPrice?: string;
  gasLimit?: string;
}

export interface TokenBalanceResult {
  contractAddress: string;
  tokenBalance: string;
  formattedBalance: string;
  metadata?: {
    decimals: number;
    logo?: string;
    name?: string;
    symbol: string;
  };
  error?: string;
}

let alchemyInstance: Alchemy | null = null;

export function initializeAlchemy(networkKey: NetworkKey | string = 'ethereum'): Alchemy {
  try {
    if (alchemyInstance) {
      return alchemyInstance;
    }

    const network = networkKey in ALCHEMY_NETWORKS 
      ? ALCHEMY_NETWORKS[networkKey as NetworkKey]
      : Network.ETH_MAINNET;

    console.log('[TokensApi] Initializing Alchemy with settings:', {
      network,
      hasApiKey: !!NETWORKS.ethereum.rpcUrl.split('/').pop(),
      timeout: 5000,
      maxRetries: 5
    });

    const settings = {
      apiKey: NETWORKS.ethereum.rpcUrl.split('/').pop() || '',
      network,
      maxRetries: 5,
      requestTimeout: 5000,
      batchRequests: false
    };

    alchemyInstance = new Alchemy(settings);
    console.log('[TokensApi] Alchemy instance created successfully');
    return alchemyInstance;
  } catch (error) {
    console.error('[TokensApi] Error initializing Alchemy:', error);
    throw new Error('Failed to initialize Alchemy SDK');
  }
}

const MAX_RETRIES = 3;
const INITIAL_TIMEOUT = 30000; // 30 seconds

async function formatTokenBalance(balance: TokenBalance): Promise<TokenBalanceResult> {
  try {
    if (!balance.tokenBalance) {
      return {
        contractAddress: balance.contractAddress,
        tokenBalance: '0',
        formattedBalance: '0',
        error: 'No balance data'
      };
    }

    // Get token metadata
    const metadata = balance.metadata;
    const decimals = metadata?.decimals || 18;
    
    // Format the balance
    const rawBalance = BigInt(balance.tokenBalance);
    const divisor = BigInt(10 ** decimals);
    const formattedBalance = Number(rawBalance) / Number(divisor);

    return {
      contractAddress: balance.contractAddress,
      tokenBalance: balance.tokenBalance,
      formattedBalance: formattedBalance.toString(),
      metadata: {
        decimals: metadata?.decimals || 18,
        logo: metadata?.logo,
        name: metadata?.name,
        symbol: metadata?.symbol || 'Unknown'
      }
    };
  } catch (error) {
    console.error('[TokensApi] Error formatting token balance:', error);
    return {
      contractAddress: balance.contractAddress,
      tokenBalance: '0',
      formattedBalance: '0',
      error: 'Failed to format balance'
    };
  }
}

/**
 * Get token balances for an address
 */
export async function getTokenBalances(address: string, networkKey: string = 'ethereum'): Promise<TokenBalanceResult[] | { error: string }> {
  try {
    console.log('[TokensApi] Fetching token balances:', {
      address,
      networkKey
    });

    // Initialize or get Alchemy instance
    const alchemy = alchemyInstance || initializeAlchemy(networkKey);

    console.log('[TokensApi] Alchemy initialized, fetching balances...');
    
    // Get token balances
    const balances = await alchemy.core.getTokenBalances(address);

    // Remove tokens with zero balance
    const nonZeroBalances = balances.tokenBalances.filter((token) => {
      return token.tokenBalance !== "0";
    });

    console.log(`[TokensApi] Found ${nonZeroBalances.length} tokens with non-zero balance`);

    // Format the balances and fetch metadata
    const formattedBalances = await Promise.all(
      nonZeroBalances.map(async (token) => {
        try {
          // Get metadata of token
          const metadata = await alchemy.core.getTokenMetadata(token.contractAddress);

          // Compute token balance in human-readable format
          const balance = token.tokenBalance ? 
            (Number(token.tokenBalance) / Math.pow(10, metadata.decimals)).toFixed(4) : 
            "0";

          return {
            contractAddress: token.contractAddress,
            tokenBalance: token.tokenBalance || "0",
            formattedBalance: balance,
            metadata: {
              decimals: metadata.decimals,
              logo: metadata.logo || undefined,
              name: metadata.name || "Unknown",
              symbol: metadata.symbol || "Unknown"
            }
          };
        } catch (error) {
          console.error('[TokensApi] Error processing token:', token.contractAddress, error);
          return {
            contractAddress: token.contractAddress,
            tokenBalance: token.tokenBalance || "0",
            formattedBalance: "0",
            metadata: {
              decimals: 18,
              name: "Unknown Token",
              symbol: "UNKNOWN"
            }
          };
        }
      })
    );

    console.log('[TokensApi] Successfully formatted balances:', {
      count: formattedBalances.length
    });

    return formattedBalances;
  } catch (error) {
    console.error('[TokensApi] Error fetching token balances:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return { error: 'Failed to fetch token balances' };
  }
}

/**
 * Get token metadata
 */
export const getTokenMetadata = async (contractAddress: string): Promise<any> => {
  console.log('[TokensApi] Getting token metadata:', contractAddress);
  try {
    const alchemy = initializeAlchemy();
    const metadata = await alchemy.core.getTokenMetadata(contractAddress);
    console.log('[TokensApi] Token metadata:', metadata);
    return metadata;
  } catch (error) {
    console.error('[TokensApi] Error getting token metadata:', {
      contractAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to get token metadata');
  }
};

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = 'CG-VCXZAmb9rowc8iR9nmbeMvkE';

// Add retry logic for API calls
const fetchWithRetry = async (url: string, retries = 3): Promise<Response> => {
  try {
    // Add API key as query parameter
    const urlWithKey = `${url}${url.includes('?') ? '&' : '?'}x_cg_demo_api_key=${COINGECKO_API_KEY}`;
    
    return makeHttpRequest(urlWithKey, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
};

/**
 * Get historical token prices for charting from CoinGecko
 * @param address Token contract address
 * @param days Number of days of history to fetch
 * @returns Array of [timestamp, price] tuples
 */

export const makeAlchemyRequest = (method: string, params: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 5000; // 5 second timeout

    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000),
      method,
      params
    });

    console.log('[TokensApi] Making Alchemy request:', { method, params });

    xhr.addEventListener('loadstart', () => {
      console.log('📡 [Alchemy] Request started');
    });

    xhr.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        console.log(`📡 [Alchemy] Progress: ${Math.round((event.loaded / event.total) * 100)}%`);
      }
    });

    xhr.addEventListener('readystatechange', () => {
      console.log(`📡 [Alchemy] Ready state: ${xhr.readyState}`);
      
      if (xhr.readyState !== 4) return;
      
      console.log('[Alchemy] Response received:', {
        status: xhr.status,
        statusText: xhr.statusText,
        hasResponse: !!xhr.responseText,
        responseText: xhr.responseText
      });
      
      if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
        try {
          const response = JSON.parse(xhr.responseText);
          console.log('[Alchemy] Parsed response:', {
            response,
            result: response.result,
            resultType: typeof response.result
          });
          if (response.error) {
            console.error('[Alchemy] JSON-RPC error:', response.error);
            reject(new Error(response.error.message));
            return;
          }
          resolve(response.result);
        } catch (error) {
          console.error('[Alchemy] Failed to parse response:', error);
          reject(new Error('Failed to parse response'));
        }
      } else {
        const errorMsg = `Request failed with status ${xhr.status}`;
        console.error('[Alchemy]', errorMsg, {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText
        });
        reject(new Error(errorMsg));
      }
    });

    xhr.addEventListener('error', (event) => {
      console.error('❌ [Alchemy] Network error:', event);
      reject(new Error('Network request failed'));
    });

    xhr.addEventListener('timeout', () => {
      console.error('⏰ [Alchemy] Request timed out');
      reject(new Error('Request timed out'));
    });

    xhr.addEventListener('abort', () => {
      console.error('🚫 [Alchemy] Request aborted');
      reject(new Error('Request was aborted'));
    });

    try {
      xhr.open('POST', `https://eth-mainnet.g.alchemy.com/v2/${config.alchemy.mainnetKey}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(body);
    } catch (error) {
      console.error('[Alchemy] Failed to send request:', error);
      reject(new Error('Failed to send request'));
    }
  });
};

export const getNativeBalance = async (address: string): Promise<string> => {
  try {
    console.log('[TokensApi] Fetching native balance for address:', address);
    
    const balance = await makeAlchemyRequest('eth_getBalance', [address, 'latest']);
    console.log('[TokensApi] Received balance:', balance);
    
    return balance;
  } catch (error) {
    console.error('[TokensApi] Failed to fetch native balance:', error);
    throw error;
  }
};

/**
 * Get token transfers for an address
 */
export const getTokenTransfers = async (
  address: string,
  tokenAddress?: string
): Promise<TokenTransfer[]> => {
  try {
    const alchemy = initializeAlchemy();
    const transfers = await alchemy.core.getAssetTransfers({
      fromAddress: address,
      category: ['erc20' as const],
      withMetadata: true,
      contractAddresses: tokenAddress ? [tokenAddress] : undefined
    });

    return transfers.transfers.map(transfer => ({
      tokenAddress: transfer.asset || '',
      from: transfer.from,
      to: transfer.to,
      value: transfer.value?.toString() || '0',
      timestamp: 0 // Timestamp not available in transfer data
    }));
  } catch (error) {
    console.error('Failed to fetch token transfers:', {
      address,
      tokenAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Estimate gas for token transfer
 */
export const estimateTokenTransferGas = async (
  tokenAddress: string,
  fromAddress: string,
  toAddress: string,
  amount: string
): Promise<string> => {
  try {
    console.log('[TokensApi] Estimating gas for token transfer:', {
      tokenAddress,
      fromAddress,
      toAddress,
      amount
    });

    // Validate inputs
    if (!tokenAddress || !fromAddress || !toAddress || amount === undefined || amount === null) {
      throw new Error('Missing required parameters for gas estimation');
    }

    // Validate amount is a valid number
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      throw new Error('Invalid amount format');
    }

    // Initialize provider
    const provider = await getProvider();

    // For native ETH transfers
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      const response = await makeAlchemyRequest('eth_estimateGas', [{
        from: fromAddress,
        to: toAddress,
        value: ethers.toQuantity(ethers.parseEther(amount))
      }]);

      console.log('[TokensApi] Response received:', response);

      if (response.error) {
        console.log('[TokensApi] JSON-RPC error:', response.error);
        
        // Handle insufficient funds error
        if (response.error.code === -32003) {
          const balance = await makeAlchemyRequest('eth_getBalance', [fromAddress, 'latest']);
          const balanceInEth = ethers.formatEther(balance);
          throw new Error(`Insufficient funds. Your balance is ${parseFloat(balanceInEth).toFixed(6)} ETH. Please reduce the amount or add more funds to your wallet.`);
        }
        throw new Error(response.error.message);
      }

      return response;
    }

    // For ERC20 token transfers
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const decimals = await contract.decimals();
    const amountInWei = ethers.parseUnits(amount, decimals);
    
    const response = await makeAlchemyRequest('eth_estimateGas', [{
      from: fromAddress,
      to: tokenAddress,
      data: contract.interface.encodeFunctionData('transfer', [toAddress, amountInWei])
    }]);

    console.log('[TokensApi] Response received:', response);

    if (response.error) {
      console.log('[TokensApi] JSON-RPC error:', response.error);
      throw new Error(response.error.message);
    }

    return response;
  } catch (error) {
    console.error('[TokensApi] Error in gas estimation:', {
      tokenAddress,
      fromAddress,
      toAddress,
      amount,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

/**
 * Transfer ETH or tokens
 */
export const transferToken = async ({
  contractAddress,
  toAddress,
  amount,
  decimals = 18,
  gasPrice,
  gasLimit
}: TokenTransferParams): Promise<string> => {
  try {
    console.log('[TokensApi] Starting transfer:', {
      contractAddress,
      toAddress,
      amount,
      decimals,
      gasPrice,
      gasLimit
    });

    // Get wallet data from secure storage
    const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    if (!walletDataStr) {
      throw new Error('No wallet data found');
    }

    const walletData = JSON.parse(walletDataStr);
    if (!walletData.privateKey) {
      throw new Error('No private key found in wallet data');
    }

    // Create provider and wallet instance
    const provider = await getProvider();
    console.log('[TokensApi] Provider initialized');

    const wallet = new ethers.Wallet(walletData.privateKey, provider);
    console.log('[TokensApi] Wallet instance created for address:', wallet.address);

    // For native ETH transfer
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      console.log('[TokensApi] Sending native ETH transfer');
      
      if (!gasPrice) {
        throw new Error('Gas price is required for transfer');
      }

      // Convert gas price to Wei
      const gasPriceInWei = ethers.parseUnits(
        Math.floor(parseFloat(gasPrice)).toString(),
        'wei'
      );
      console.log('[TokensApi] Gas price in Wei:', gasPriceInWei.toString());

      // Get current nonce
      const nonce = await makeAlchemyRequest('eth_getTransactionCount', [wallet.address, 'latest']);
      
      // Create transaction object with proper string values
      const tx = {
        to: toAddress,
        value: ethers.parseEther(amount).toString(),
        gasLimit: (gasLimit || '21000').toString(),
        gasPrice: gasPriceInWei.toString(),
        chainId: 1,
        nonce: nonce
      };

      console.log('[TokensApi] Transaction object created:', tx);
      console.log('[TokensApi] Sending transaction...');

      // Sign the transaction
      console.log('[TokensApi] Signing transaction...');
      const signedTx = await wallet.signTransaction(tx);
      
      // Send the raw transaction
      console.log('[TokensApi] Sending raw transaction...');
      const txHash = await makeAlchemyRequest('eth_sendRawTransaction', [signedTx]);
      
      if (!txHash) {
        throw new Error('Failed to get transaction hash');
      }

      console.log('[TokensApi] Transaction hash received:', txHash);
      return txHash;
    } else {
      // For ERC20 token transfer
      console.log('[TokensApi] Sending ERC20 token transfer');
      
      if (!gasPrice) {
        throw new Error('Gas price is required for transfer');
      }

      const contract = new ethers.Contract(contractAddress, ERC20_ABI, wallet);
      const amountInWei = ethers.parseUnits(amount, decimals);
      const gasPriceInWei = ethers.parseUnits(
        Math.floor(parseFloat(gasPrice)).toString(),
        'wei'
      );

      try {
        console.log('[TokensApi] Sending token transfer transaction...');
        const nonce = await makeAlchemyRequest('eth_getTransactionCount', [wallet.address, 'latest']);
        
        // Create transaction object with all values as strings
        const tx = {
          to: contractAddress,
          data: contract.interface.encodeFunctionData('transfer', [toAddress, amountInWei.toString()]),
          gasLimit: (gasLimit || '200000').toString(),
          gasPrice: gasPriceInWei.toString(),
          chainId: 1,
          nonce: nonce
        };

        console.log('[TokensApi] Transaction object created:', tx);
        console.log('[TokensApi] Signing transaction...');
        const signedTx = await wallet.signTransaction(tx);
        
        console.log('[TokensApi] Sending raw transaction...');
        const txHash = await makeAlchemyRequest('eth_sendRawTransaction', [signedTx]);
        
        if (!txHash) {
          throw new Error('Failed to get transaction hash');
        }

        console.log('[TokensApi] Transaction hash received:', txHash);
        return txHash;
      } catch (txError) {
        console.error('[TokensApi] Token transfer failed:', txError);
        if (txError instanceof Error) {
          if (txError.message.includes('insufficient funds')) {
            throw new Error('Insufficient balance to cover gas fees');
          } else if (txError.message.includes('insufficient token balance')) {
            throw new Error('Insufficient token balance for transfer');
          } else if (txError.message.includes('nonce')) {
            throw new Error('Transaction nonce error. Please try again');
          } else if (txError.message.includes('gas required exceeds allowance')) {
            throw new Error('Gas estimation failed. The transaction may not succeed');
          } else if (txError.message.includes('1015')) {
            throw new Error('Network request blocked. Please check your internet connection');
          }
        }
        throw txError;
      }
    }
  } catch (error) {
    console.error('[TokensApi] Transfer failed:', error);
    throw error;
  }
};

/**
 * Get token balance
 */
export const getTokenBalance = async (contractAddress: string, ownerAddress: string): Promise<string> => {
  console.log('[TokensApi] Getting token balance:', { contractAddress, ownerAddress });
  try {
    // For native ETH, use eth_getBalance
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      const hexBalance = await makeAlchemyRequest('eth_getBalance', [ownerAddress, 'latest']);
      console.log('[TokensApi] Raw ETH balance (hex):', hexBalance);
      
      // Convert hex balance to BigInt, then format to ETH
      const balanceWei = BigInt(hexBalance);
      const formattedBalance = ethers.formatEther(balanceWei);
      
      console.log('[TokensApi] ETH balance:', {
        ownerAddress,
        hexBalance,
        balanceWei: balanceWei.toString(),
        formattedBalance
      });
      return formattedBalance;
    }

    // For other tokens, use alchemy_getTokenBalances
    const [metadata, data] = await Promise.all([
      makeAlchemyRequest('alchemy_getTokenMetadata', [contractAddress])
        .catch(error => {
          console.error('[TokensApi] Error getting token metadata:', {
            contractAddress,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Return default decimals of 18 if metadata fetch fails
          return { decimals: 18 };
        }),
      makeAlchemyRequest('alchemy_getTokenBalances', [ownerAddress, [contractAddress]])
        .catch(error => {
          console.error('[TokensApi] Error getting token balance:', {
            contractAddress,
            ownerAddress,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Return empty balance if balance fetch fails
          return { tokenBalances: [{ tokenBalance: '0x0' }] };
        })
    ]);
    
    if (!data.tokenBalances[0] || !data.tokenBalances[0].tokenBalance) {
      console.log('[TokensApi] No balance found, returning 0');
      return '0';
    }
    
    const rawBalance = data.tokenBalances[0].tokenBalance;
    const formattedBalance = ethers.formatUnits(rawBalance, metadata.decimals);
    
    console.log('[TokensApi] Token balance:', {
      contractAddress,
      ownerAddress,
      rawBalance,
      formattedBalance,
      decimals: metadata.decimals
    });
    return formattedBalance;
  } catch (error) {
    console.error('[TokensApi] Error getting token balance:', {
      contractAddress,
      ownerAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    // Return 0 for any errors to avoid breaking the UI
    return '0';
  }
};

/**
 * Store token balances in SecureStore
 */
export const storeTokenBalances = async (balances: TokenBalanceResult[]): Promise<void> => {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN_BALANCES, JSON.stringify(balances));
  } catch (error) {
    console.error('Error storing token balances:', error);
    throw error;
  }
};

/**
 * Get stored token balances from SecureStore
 */
export const getStoredTokenBalances = async (): Promise<TokenBalanceResult[] | null> => {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN_BALANCES);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error getting stored token balances:', error);
    return null;
  }
};

/**
 * Update stored balance for a specific token
 */
export const updateStoredTokenBalance = async (
  walletAddress: string,
  tokenAddress: string,
  newBalance: string
): Promise<void> => {
  try {
    const currentBalances = await getStoredTokenBalances();
    if (currentBalances) {
      const updatedBalances = currentBalances.map(balance =>
        balance.contractAddress === tokenAddress ? {
          ...balance,
          tokenBalance: newBalance
        } : balance
      );
      await storeTokenBalances(updatedBalances);
    }
    console.log('[TokensApi] Updated balance for token:', tokenAddress);
  } catch (error) {
    console.error('[TokensApi] Error updating token balance:', error);
    throw error;
  }
};

interface PendingTransaction {
  hash: string;
  to?: string;
  from: string;
  value: string;
}

/**
 * Set up transaction monitoring for a wallet
 */
export const setupTransactionMonitoring = async (
  walletAddress: string,
  networkKey: string = 'ethereum'
): Promise<void> => {
  try {
    const alchemy = initializeAlchemy(networkKey);
    const provider = await getProvider();
    
    interface TransferLog {
      transactionHash: string;
      address: string;
      topics: string[];
    }
    
    // Monitor for ETH transfers
    provider.on(
      {
        address: walletAddress,
        topics: [
          ethers.id("Transfer(address,address,uint256)")
        ]
      },
      async (log: TransferLog) => {
        console.log('[TokensApi] New transaction detected:', log.transactionHash);
        
        // Update ETH balance
        const newBalance = await alchemy.core.getBalance(walletAddress);
        await updateStoredTokenBalance(
          walletAddress,
          '0x0000000000000000000000000000000000000000',
          ethers.formatEther(newBalance)
        );
      }
    );

    // Monitor for token transfers
    provider.on(
      {
        address: walletAddress,
        topics: [
          ethers.id("Transfer(address,address,uint256)")
        ]
      },
      async (log: TransferLog) => {
        if (!log.address) return;
        
        // Get new token balance
        const contract = new ethers.Contract(log.address, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          contract.balanceOf(walletAddress),
          contract.decimals()
        ]);
        
        await updateStoredTokenBalance(
          walletAddress,
          log.address.toLowerCase(),
          ethers.formatUnits(balance, decimals)
        );
      }
    );

    console.log('[TokensApi] Transaction monitoring set up for:', walletAddress);
  } catch (error) {
    console.error('[TokensApi] Error setting up transaction monitoring:', error);
    throw error;
  }
};

/**
 * Get token balances for a wallet
 */
export const getWalletTokenBalances = async (walletId: string) => {
  try {
    if (!walletId) {
      throw new Error("No wallet ID provided");
    }
    console.log("[TokensApi] Fetching token balances for wallet ID:", walletId);

    // Get token balances for the wallet
    const { data: existingTokens, error: tokenError } = await supabaseAdmin
      .from("token_balances")
      .select("*")
      .eq("wallet_id", walletId)
      .order("timestamp", { ascending: false });

    if (tokenError) {
      console.error("[TokensApi] Failed to fetch token balances:", tokenError);
      throw tokenError;
    }

    console.log("[TokensApi] Found token balances:", existingTokens?.length || 0);
    return existingTokens || [];
  } catch (error) {
    console.error("[TokensApi] Failed to fetch token balances:", error);
    throw error;
  }
}; 