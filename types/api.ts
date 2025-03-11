export interface Token {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  chainId: number;
  balance: string;
  price: number;
  change24h?: number;
  logoURI?: string;
}

export interface NFT {
  tokenId: string;
  name: string;
  description?: string;
  collection?: string;
  image: string;
  owner: string;
  chain: string;
  traits?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  explorerUrl?: string;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'approve';
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
  from: string;
  to: string;
  value: string;
  token: string;
  gasPrice?: string;
  gasUsed?: string;
  hash: string;
  chainId: number;
  explorer?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: number;
    message: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  nextCursor?: string;
  hasMore: boolean;
}

export interface TokenBalance {
  token: Token;
  balance: string;
  usdValue: number;
}

export interface Portfolio {
  totalValue: number;
  tokens: TokenBalance[];
  change24h: number;
} 