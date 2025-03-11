import { Alchemy, Network, TokenBalance as AlchemyTokenBalance, TokenMetadata as AlchemyTokenMetadata } from 'alchemy-sdk';
import { ethers } from 'ethers';
import { WalletKit } from '@reown/walletkit';
import { Core } from '@walletconnect/core';
import * as SecureStore from 'expo-secure-store';
import { getAlchemyInstance, getProvider } from './alchemyApi';
import config from './config';

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
  to: string;
  from: string;
  tokenAddress: string;
  amount: string;
  walletType: 'classic' | 'smart';
}

export interface TokenTransfer {
  tokenAddress: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
}

let walletKitInstance: Awaited<ReturnType<typeof WalletKit.init>> | null = null;

const getWalletKit = async () => {
  if (!walletKitInstance) {
    try {
      const core = new Core({
        projectId: config.projectIds.reown
      });

      walletKitInstance = await WalletKit.init({
        core,
        metadata: config.wallet.smart.metadata
      });
    } catch (error) {
      console.error('Failed to initialize WalletKit:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error('Failed to initialize WalletKit');
    }
  }
  return walletKitInstance;
};

/**
 * Get token balances for an address
 */
export const getTokenBalances = async (address: string): Promise<Token[]> => {
  try {
    const alchemy = getAlchemyInstance();
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
export const getTokenMetadata = async (address: string): Promise<TokenMetadata> => {
  try {
    const alchemy = getAlchemyInstance();
    const metadata = await alchemy.core.getTokenMetadata(address);
    return {
      name: metadata.name || 'Unknown Token',
      symbol: metadata.symbol || '???',
      decimals: metadata.decimals,
      logo: metadata.logo,
      isSpam: metadata.isSpam
    };
  } catch (error) {
    console.error('Failed to fetch token metadata:', {
      address,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
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
    const alchemy = getAlchemyInstance(network);
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
    const alchemy = getAlchemyInstance();
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
  amount: string,
  walletType: 'classic' | 'smart'
) => {
  try {
    if (walletType === 'smart') {
      const walletKit = await getWalletKit();
      // Smart wallet gas estimation logic here
      throw new Error('Smart wallet gas estimation not implemented yet');
    } else {
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
    }
  } catch (error) {
    console.error('Failed to estimate token transfer gas:', {
      tokenAddress,
      fromAddress,
      toAddress,
      amount,
      walletType,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Transfer tokens
 */
export const transferToken = async (request: TokenTransferRequest): Promise<string> => {
  try {
    if (request.walletType === 'classic') {
      return await transferTokenClassicWallet(request);
    } else {
      return await transferTokenSmartWallet(request);
    }
  } catch (error) {
    console.error('Failed to transfer token:', error);
    throw error;
  }
};

/**
 * Transfer tokens using classic wallet
 */
const transferTokenClassicWallet = async (request: TokenTransferRequest): Promise<string> => {
  try {
    const provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${config.alchemy.mainnetKey}`);
    const privateKey = await SecureStore.getItemAsync('walletPrivateKey');
    if (!privateKey) throw new Error('Private key not found');

    const wallet = new ethers.Wallet(privateKey, provider);
    const tokenContract = new ethers.Contract(
      request.tokenAddress,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      wallet
    );

    const tx = await tokenContract.transfer(request.to, request.amount);
    return tx.hash;
  } catch (error) {
    console.error('Failed to transfer token with classic wallet:', error);
    throw error;
  }
};

/**
 * Transfer tokens using smart wallet
 */
const transferTokenSmartWallet = async (request: TokenTransferRequest): Promise<string> => {
  try {
    const walletKit = await getWalletKit();
    const session = await getActiveSession(request.from);
    const provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${config.alchemy.mainnetKey}`);

    // Create token transfer data
    const tokenContract = new ethers.Contract(
      request.tokenAddress,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      provider
    );
    const data = tokenContract.interface.encodeFunctionData('transfer', [
      request.to,
      request.amount
    ]);

    const txHash = await new Promise<string>((resolve, reject) => {
      walletKit.on('session_request', async (event) => {
        const { topic, params, id } = event;
        const { request: req } = params;

        if (req.method === 'eth_sendTransaction') {
          try {
            const hash = await req.params[0];
            await walletKit.respondSessionRequest({
              topic,
              response: {
                id,
                result: hash,
                jsonrpc: '2.0'
              }
            });
            resolve(hash);
          } catch (error) {
            reject(error);
          }
        }
      });

      // Send transaction through WalletKit
      walletKit.respondSessionRequest({
        topic: session.topic,
        response: {
          id: Date.now(),
          result: {
            to: request.tokenAddress,
            data,
            from: request.from
          },
          jsonrpc: '2.0'
        }
      });
    });

    return txHash;
  } catch (error) {
    console.error('Failed to transfer token with smart wallet:', error);
    throw error;
  }
};

// Helper function to get active session for an address
const getActiveSession = async (address: string) => {
  const walletKit = await getWalletKit();
  const sessions = walletKit.getActiveSessions();
  const session = Object.values(sessions).find((s) => 
    s.namespaces.eip155.accounts.some((account: string) => 
      account.toLowerCase().includes(address.toLowerCase())
    )
  );
  
  if (!session) {
    throw new Error('No active session found for address');
  }
  
  return session;
}; 