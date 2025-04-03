import { 
  getTokens,
  getToken,
  getTokenBalance,
  getTokenBalances,
  getTokenBalancesByChain,
  getTokenAllowance,
  getTokenAllowanceMulticall,
  setTokenAllowance,
  revokeTokenApproval,
  type TokensRequest,
  type Token as LiFiToken,
  type TokenAmount,
  ChainType
} from '@lifi/sdk';
import { WalletClient } from 'viem';
import { Token } from '../types/api';

// Define BaseToken type for LiFi SDK compatibility
export interface BaseToken {
  address: `0x${string}`;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  priceUSD?: number;
}

/**
 * Get all available tokens on specified chains
 */
export async function getAllTokens(chainTypes?: ChainType[]) {
  try {
    const tokenRequest: TokensRequest = {
      chainTypes: chainTypes || [ChainType.EVM],
    };
    return await getTokens(tokenRequest);
  } catch (error) {
    console.error('[TokenManagement] Error getting all tokens:', error);
    throw error;
  }
}

/**
 * Get specific token details
 */
export async function getTokenDetails(chainId: number, tokenAddress: `0x${string}`): Promise<Token> {
  try {
    const token = await getToken(chainId, tokenAddress);
    return {
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      address: token.address,
      chainId: token.chainId,
      balance: '0', // Initial balance will be fetched separately
      price: typeof token.priceUSD === 'number' ? token.priceUSD : 0,
      logoURI: token.logoURI
    };
  } catch (error) {
    console.error('[TokenManagement] Error getting token details:', error);
    throw error;
  }
}

/**
 * Get single token balance
 */
export async function getSingleTokenBalance(walletAddress: `0x${string}`, token: Token): Promise<string> {
  try {
    const baseToken: BaseToken = {
      address: token.address as `0x${string}`,
      chainId: token.chainId,
      decimals: token.decimals,
      name: token.name,
      symbol: token.symbol,
      priceUSD: Number(token.price)
    };
    const balance = await getTokenBalance(walletAddress, baseToken as unknown as LiFiToken);
    return balance?.amount?.toString() || '0';
  } catch (error) {
    console.error('[TokenManagement] Error getting token balance:', error);
    throw error;
  }
}

/**
 * Get multiple token balances
 */
export async function getMultipleTokenBalances(walletAddress: `0x${string}`, tokens: Token[]): Promise<{ [key: string]: string }> {
  try {
    const baseTokens: BaseToken[] = tokens.map(token => ({
      address: token.address as `0x${string}`,
      chainId: token.chainId,
      decimals: token.decimals,
      name: token.name,
      symbol: token.symbol,
      priceUSD: Number(token.price)
    }));
    const balances = await getTokenBalances(walletAddress, baseTokens as unknown as LiFiToken[]);
    return balances.reduce((acc, balance) => {
      acc[balance.address] = balance.amount?.toString() || '0';
      return acc;
    }, {} as { [key: string]: string });
  } catch (error) {
    console.error('[TokenManagement] Error getting multiple token balances:', error);
    throw error;
  }
}

/**
 * Get token balances by chain
 */
export async function getTokenBalancesByChainId(walletAddress: `0x${string}`, tokensByChain: { [chainId: number]: Token[] }): Promise<{ [chainId: number]: { [key: string]: string } }> {
  try {
    const baseTokensByChain: { [chainId: number]: BaseToken[] } = Object.entries(tokensByChain).reduce((acc, [chainId, tokens]) => {
      acc[Number(chainId)] = tokens.map(token => ({
        address: token.address as `0x${string}`,
        chainId: token.chainId,
        decimals: token.decimals,
        name: token.name,
        symbol: token.symbol,
        priceUSD: Number(token.price)
      }));
      return acc;
    }, {} as { [chainId: number]: BaseToken[] });
    const balances = await getTokenBalancesByChain(walletAddress, baseTokensByChain as unknown as { [chainId: number]: LiFiToken[] });
    return Object.entries(balances).reduce((acc, [chainId, chainBalances]) => {
      acc[Number(chainId)] = chainBalances.reduce((chainAcc, balance) => {
        chainAcc[balance.address] = balance.amount?.toString() || '0';
        return chainAcc;
      }, {} as { [key: string]: string });
      return acc;
    }, {} as { [chainId: number]: { [key: string]: string } });
  } catch (error) {
    console.error('[TokenManagement] Error getting token balances by chain:', error);
    throw error;
  }
}

/**
 * Check token allowance
 */
export async function checkTokenAllowance(token: BaseToken, ownerAddress: `0x${string}`, spenderAddress: `0x${string}`): Promise<bigint> {
  try {
    const allowance = await getTokenAllowance(token as unknown as LiFiToken, ownerAddress, spenderAddress);
    return allowance || BigInt(0);
  } catch (error) {
    console.error('[TokenManagement] Error checking token allowance:', error);
    throw error;
  }
}

/**
 * Check multiple token allowances
 */
export async function checkMultipleTokenAllowances(ownerAddress: `0x${string}`, tokens: Token[]): Promise<{ [key: string]: bigint }> {
  try {
    const tokenSpenders = tokens.map(token => ({
      token: {
        address: token.address as `0x${string}`,
        chainId: token.chainId,
        decimals: token.decimals,
        name: token.name,
        symbol: token.symbol,
        priceUSD: Number(token.price)
      } as unknown as LiFiToken,
      spenderAddress: ownerAddress
    }));
    const allowances = await getTokenAllowanceMulticall(ownerAddress, tokenSpenders);
    return allowances.reduce((acc, allowance) => {
      acc[allowance.token.address] = allowance.allowance || BigInt(0);
      return acc;
    }, {} as { [key: string]: bigint });
  } catch (error) {
    console.error('[TokenManagement] Error checking multiple token allowances:', error);
    throw error;
  }
}

/**
 * Set token allowance
 */
export async function approveToken(walletClient: WalletClient, token: BaseToken, spenderAddress: `0x${string}`, amount: bigint): Promise<`0x${string}`> {
  try {
    const txHash = await setTokenAllowance({
      walletClient,
      token: token as unknown as LiFiToken,
      spenderAddress,
      amount
    });
    return txHash as `0x${string}`;
  } catch (error) {
    console.error('[TokenManagement] Error setting token allowance:', error);
    throw error;
  }
}

/**
 * Revoke token approval
 */
export async function revokeToken(walletClient: WalletClient, token: BaseToken, spenderAddress: `0x${string}`): Promise<`0x${string}`> {
  try {
    const txHash = await revokeTokenApproval({
      walletClient,
      token: token as unknown as LiFiToken,
      spenderAddress
    });
    return txHash as `0x${string}`;
  } catch (error) {
    console.error('[TokenManagement] Error revoking token approval:', error);
    throw error;
  }
} 