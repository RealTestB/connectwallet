import { Alchemy, Network, TokenBalance as AlchemyTokenBalance, TokenMetadata as AlchemyTokenMetadata } from 'alchemy-sdk';
import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import config from './config';
import { getProvider } from './provider';

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

export interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  rawBalance: string;
  metadata: {
    decimals: number;
    logo?: string;
    name?: string;
    symbol: string;
  };
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
  isSpam?: boolean;
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
}

let alchemyInstance: Alchemy | null = null;

function initializeAlchemy(network: Network = Network.ETH_MAINNET): Alchemy {
  if (!alchemyInstance) {
    alchemyInstance = new Alchemy({
      apiKey: config.alchemy.mainnetKey,
      network
    });
  }
  return alchemyInstance;
}

/**
 * Get token balances for an address
 */
export const getTokenBalances = async (address: string): Promise<Token[]> => {
  try {
    const alchemy = initializeAlchemy();
    const balances = await alchemy.core.getTokenBalances(address);
    const nonZeroBalances = balances.tokenBalances.filter(
      (token: AlchemyTokenBalance) => token.tokenBalance !== '0'
    );

    const tokens: Token[] = await Promise.all(
      nonZeroBalances.map(async (balance: AlchemyTokenBalance) => {
        try {
          const metadata = await alchemy.core.getTokenMetadata(balance.contractAddress);
          const formattedBalance = ethers.formatUnits(
            balance.tokenBalance,
            metadata.decimals
          );

          return {
            address: balance.contractAddress,
            name: metadata.name || 'Unknown Token',
            symbol: metadata.symbol || '???',
            decimals: metadata.decimals,
            logo: metadata.logo,
            balance: formattedBalance,
            isSpam: metadata.isSpam
          };
        } catch (error) {
          console.error('Failed to fetch token metadata:', {
            tokenAddress: balance.contractAddress,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          // Return a basic token object if metadata fetch fails
          return {
            address: balance.contractAddress,
            name: 'Unknown Token',
            symbol: '???',
            decimals: 18,
            balance: ethers.formatUnits(balance.tokenBalance, 18)
          };
        }
      })
    );

    return tokens;
  } catch (error) {
    console.error('Failed to fetch token balances:', {
      address,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

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

/**
 * Get token price from CoinMarketCap
 */
export const getTokenPrice = async (
  address: string,
  network: Network = Network.ETH_MAINNET
): Promise<TokenPrice | null> => {
  try {
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?address=${address}&chain=${network === Network.ETH_MAINNET ? 'ETH' : 'MATIC'}`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': config.apiKeys.cmcKey
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch token price');
    }

    const data = await response.json();
    const tokenData = Object.values(data.data)[0] as any;

    if (!tokenData) {
      return null;
    }

    return {
      price: tokenData.quote.USD.price,
      change24h: tokenData.quote.USD.percent_change_24h,
      marketCap: tokenData.quote.USD.market_cap,
      volume24h: tokenData.quote.USD.volume_24h
    };
  } catch (error) {
    console.error('Failed to fetch token price:', error);
    return null;
  }
};

/**
 * Get native token (ETH/MATIC) balance
 */
export const getNativeBalance = async (
  address: string,
  network: Network = Network.ETH_MAINNET
): Promise<Token> => {
  try {
    const alchemy = initializeAlchemy(network);
    const balance = await alchemy.core.getBalance(address);
    const formattedBalance = ethers.formatEther(balance);

    const nativeToken: Token = {
      address: '0x0000000000000000000000000000000000000000',
      name: network === Network.ETH_MAINNET ? 'Ethereum' : 'Polygon',
      symbol: network === Network.ETH_MAINNET ? 'ETH' : 'MATIC',
      decimals: 18,
      balance: formattedBalance
    };

    // Get price data
    const price = await getTokenPrice(nativeToken.address, network);
    if (price) {
      nativeToken.price = price.price;
      nativeToken.priceChange24h = price.change24h;
      nativeToken.balanceUSD = parseFloat(formattedBalance) * price.price;
    }

    return nativeToken;
  } catch (error) {
    console.error('Failed to fetch native balance:', error);
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
) => {
  try {
    const provider = getProvider();
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function transfer(address to, uint256 amount)'],
      provider
    );

    const gasEstimate = await tokenContract.transfer.estimateGas(
      toAddress,
      amount
    );

    return gasEstimate;
  } catch (error) {
    console.error('Failed to estimate token transfer gas:', {
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
 * Transfer tokens
 */
export const transferToken = async (params: TokenTransferParams): Promise<string> => {
  console.log('[TokensApi] Starting token transfer:', params);
  const provider = getProvider();
  
  try {
    const privateKey = await SecureStore.getItemAsync(config.wallet.classic.storageKeys.privateKey);
    if (!privateKey) {
      console.error('[TokensApi] Private key not found in secure storage');
      throw new Error('Private key not found');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('[TokensApi] Created wallet instance for address:', wallet.address);

    const contract = new ethers.Contract(params.contractAddress, ERC20_ABI, wallet);
    const amountInWei = ethers.parseUnits(params.amount, params.decimals);
    
    console.log('[TokensApi] Sending token transfer transaction');
    const tx = await contract.transfer(params.toAddress, amountInWei);
    console.log('[TokensApi] Transfer transaction sent:', tx.hash);
    
    return tx.hash;
  } catch (error) {
    console.error('[TokensApi] Transfer error:', {
      params,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to transfer tokens');
  }
};

/**
 * Get token balance
 */
export const getTokenBalance = async (contractAddress: string, ownerAddress: string): Promise<string> => {
  console.log('[TokensApi] Getting token balance:', { contractAddress, ownerAddress });
  const provider = getProvider();
  
  try {
    const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(ownerAddress),
      contract.decimals()
    ]);
    
    const formattedBalance = ethers.formatUnits(balance, decimals);
    console.log('[TokensApi] Token balance:', formattedBalance);
    return formattedBalance;
  } catch (error) {
    console.error('[TokensApi] Error getting token balance:', {
      contractAddress,
      ownerAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to get token balance');
  }
}; 