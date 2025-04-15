import { Network } from 'alchemy-sdk';
import { ChainId } from '../constants/chains';

// Map chain IDs to network keys
export const CHAIN_TO_NETWORK: { [chainId: number]: string } = {
  1: 'ethereum',
  137: 'polygon',
  42161: 'arbitrum',
  10: 'optimism',
  56: 'bsc',
  43114: 'avalanche',
  8453: 'base'
};

// Map chain IDs to Alchemy network types
export const CHAIN_TO_ALCHEMY: Record<ChainId, Network> = {
  1: Network.ETH_MAINNET,
  137: Network.MATIC_MAINNET,
  42161: Network.ARB_MAINNET,
  10: Network.OPT_MAINNET,
  56: Network.BNB_MAINNET,
  43114: Network.AVALANCHE_MAINNET,
  8453: Network.BASE_MAINNET
}; 