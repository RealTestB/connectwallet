import { ChainId } from './chains';

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
  address: string;
  chainId: ChainId;
  isSpam?: boolean;
}

export interface TokenBalance {
  token: TokenMetadata;
  balance: string;
  balanceUSD: string;
  priceUSD: string;
  priceChange24h: number;
  lastUpdate: string;
  isNative: boolean;
}

export interface TokenPriceData {
  price: string;
  change24h: number;
  volume24h: string;
  marketCap: string;
}

export interface TokenPriceHistory {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface TokenWithPrice extends TokenBalance {
  priceHistory: TokenPriceHistory;
}

export interface TokenBalanceResult {
  contractAddress: string;
  tokenBalance: string;
  formattedBalance: string;
  metadata?: TokenMetadata;
  error?: string;
}

export interface TokenListResponse {
  tokens: TokenMetadata[];
  totalCount: number;
  error?: string;
}

export interface TokenPriceResponse {
  data: TokenPriceData;
  error?: string;
}

export interface TokenPriceHistoryResponse {
  data: TokenPriceHistory;
  error?: string;
}

export interface TokenBalanceResponse {
  data: TokenBalance;
  error?: string;
}

export interface TokenBalancesResponse {
  data: TokenBalance[];
  totalValue: string;
  error?: string;
} 