import { Alchemy, Network, AlchemySettings } from 'alchemy-sdk';
import { ethers } from 'ethers';
import config from './config';

interface AlchemyInstances {
  [key: string]: Alchemy;
}

let alchemyInstances: AlchemyInstances = {};
let provider: ethers.JsonRpcProvider | null = null;

/**
 * Get or create Alchemy instance
 */
export const getAlchemyInstance = (network: Network = Network.ETH_MAINNET): Alchemy => {
  const networkKey = network.toString();
  if (!alchemyInstances[networkKey]) {
    try {
      const settings: AlchemySettings = {
        apiKey: config.alchemy.mainnetKey,
        network: network
      };
      alchemyInstances[networkKey] = new Alchemy(settings);
    } catch (error) {
      console.error('Failed to create Alchemy instance:', error);
      throw new Error('Failed to initialize Alchemy SDK');
    }
  }
  return alchemyInstances[networkKey];
};

/**
 * Get or create ethers provider instance
 */
export const getProvider = (): ethers.JsonRpcProvider => {
  if (!provider) {
    try {
      provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${config.alchemy.mainnetKey}`);
    } catch (error) {
      console.error('Failed to create provider:', error);
      throw new Error('Failed to initialize Ethereum provider');
    }
  }
  return provider;
};

/**
 * Check if address is a contract
 */
export const isContract = async (address: string): Promise<boolean> => {
  try {
    const provider = getProvider();
    const code = await provider.getCode(address);
    return code !== '0x';
  } catch (error) {
    console.error('Error checking contract status:', {
      address,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Get NFTs owned by address
 */
export const getNFTsForOwner = async (ownerAddress: string) => {
  try {
    const alchemy = getAlchemyInstance();
    return await alchemy.nft.getNftsForOwner(ownerAddress);
  } catch (error) {
    console.error('Error getting NFTs for owner:', {
      ownerAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Get NFT metadata
 */
export const getNFTMetadata = async (contractAddress: string, tokenId: string) => {
  try {
    const alchemy = getAlchemyInstance();
    return await alchemy.nft.getNftMetadata(contractAddress, tokenId);
  } catch (error) {
    console.error('Error getting NFT metadata:', {
      contractAddress,
      tokenId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Get token balances for address
 */
export const getTokenBalances = async (address: string) => {
  try {
    const alchemy = getAlchemyInstance();
    return await alchemy.core.getTokenBalances(address);
  } catch (error) {
    console.error('Error getting token balances:', {
      address,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Get ETH balance for address
 */
export const getEthBalance = async (address: string) => {
  try {
    const alchemy = getAlchemyInstance();
    return await alchemy.core.getBalance(address);
  } catch (error) {
    console.error('Error getting ETH balance:', {
      address,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

// Reset instances (useful for testing or when changing networks)
export const resetInstances = () => {
  alchemyInstances = {};
  provider = null;
}; 