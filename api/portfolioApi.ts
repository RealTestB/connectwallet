import { Network } from 'alchemy-sdk';
import { getTokenBalances, getNativeBalance } from './tokensApi';
import { getNFTs } from './nftsApi';

export interface PortfolioData {
  tokens: {
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
  }[];
  nfts: {
    id: string;
    contract: {
      address: string;
      name?: string;
      symbol?: string;
      totalSupply?: string;
      tokenType: string;
    };
    tokenId: string;
    title: string;
    description: string;
    metadata: {
      name: string;
      description: string;
      image: string;
      attributes?: Array<{
        trait_type: string;
        value: string | number;
      }>;
      external_url?: string;
      animation_url?: string;
    };
  }[];
  totalBalanceUSD: number;
}

/**
 * Get portfolio data for an address
 */
export const getPortfolioData = async (
  address: string,
  network: Network = Network.ETH_MAINNET
): Promise<PortfolioData> => {
  try {
    // Fetch tokens and NFTs in parallel
    const [tokens, nativeToken, nftsResponse] = await Promise.all([
      getTokenBalances(address, network),
      getNativeBalance(address, network),
      getNFTs(address, undefined, 100, network)
    ]);

    // Calculate total balance in USD
    const totalBalanceUSD = [nativeToken, ...tokens].reduce((total, token) => {
      return total + (token.balanceUSD || 0);
    }, 0);

    return {
      tokens: [nativeToken, ...tokens],
      nfts: nftsResponse.ownedNfts,
      totalBalanceUSD
    };
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    throw error;
  }
}; 