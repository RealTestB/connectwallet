export interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  error?: string;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
  totalSupply?: string;
} 