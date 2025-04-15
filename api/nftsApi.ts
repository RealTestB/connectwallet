import { supabase } from '../lib/supabase';
import { Alchemy, Network, GetNftsForOwnerResponse } from 'alchemy-sdk';
import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import { makeAlchemyRequest, makeAlchemyNFTRequest } from './alchemyApi';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { ERC721_ABI, ERC1155_ABI } from '../constants/abis';
import { getProvider } from '../lib/provider';
import { NETWORKS } from './config';
import { estimateGas, TransactionType } from '../utils/gasUtils';
import { ChainId } from '../types/chains';

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  rarity?: number;  // Percentage of NFTs with this trait
  count?: number;   // Number of NFTs with this trait
}

export interface NFTContract {
  address: string;
  name?: string;
  symbol?: string;
  totalSupply?: string;
  tokenType: string;
}

export interface NFTMedia {
  raw: string;
  gateway: string;
  thumbnail?: string;
  format: string;
}

export interface NFT {
  id?: string;
  wallet_id?: string;
  contract: NFTContract;
  tokenId: string;
  tokenType: string;
  title: string;
  description: string;
  media: NFTMedia[];
  timeLastUpdated: string;
  attributes?: NFTAttribute[];
  rarity?: {
    rank?: number;
    score?: number;
    total?: number;
  };
  metadata?: any;
  network_id?: number;
  last_updated?: Date;
}

export interface NFTResponse {
  ownedNfts: NFT[];
  totalCount: number;
  pageKey?: string;
}

interface AlchemyNFTImage {
  cachedUrl?: string;
  thumbnailUrl?: string;
  pngUrl?: string;
  contentType?: string;
  originalUrl?: string;
}

interface AlchemyNFTContract {
  address: string;
  name?: string;
  symbol?: string;
  totalSupply?: string;
  tokenType: string;
}

interface AlchemyNFTRaw {
  tokenUri?: string;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
  };
}

interface AlchemyNFTAttribute {
  trait_type: string;
  value: string | number;
  prevalence?: number;
  count?: number;
}

interface AlchemyNFT {
  contract: AlchemyNFTContract;
  tokenId: string;
  tokenType: string;
  name?: string;
  description?: string;
  image?: AlchemyNFTImage;
  tokenUri?: string;
  raw?: AlchemyNFTRaw;
  timeLastUpdated: string;
  attributes?: AlchemyNFTAttribute[];
  rarity?: {
    rank?: number;
    score?: number;
    total?: number;
  };
}

interface AlchemyNFTResponse {
  ownedNfts: AlchemyNFT[];
  totalCount: number;
  pageKey?: string;
}

interface NFTTransferParams {
  contractAddress: string;
  toAddress: string;
  tokenId: string;
  gasPrice?: string;
  gasLimit?: string;
  tokenType?: 'ERC721' | 'ERC1155';
}

interface DBNft {
  id: string;
  wallet_id: string;
  contract_address: string;
  token_id: string;
  name: string;
  description: string;
  image_url: string;
  metadata: any;
  network_id: number;
  last_updated: Date;
}

interface DBNftInput extends Omit<DBNft, 'id' | 'last_updated'> {}

// Database operations
export const saveNFT = async (nft: Omit<NFT, 'id' | 'last_updated'>) => {
  if (!nft.contract?.address || !nft.tokenId) {
    throw new Error('Missing required NFT data');
  }

  const dbNFT: DBNftInput = {
    wallet_id: nft.wallet_id || '',
    contract_address: nft.contract.address,
    token_id: nft.tokenId,
    name: nft.title,
    description: nft.description,
    image_url: nft.media?.[0]?.gateway || '',
    metadata: nft.metadata || {},
    network_id: nft.network_id || 1,
  };

  const { data, error } = await supabase
    .from('nfts')
    .insert([{ ...dbNFT, last_updated: new Date() }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateNFT = async (id: string, nft: Partial<Omit<NFT, 'id' | 'last_updated'>>) => {
  const dbNFT: Partial<DBNftInput> = {};

  if (nft.contract?.address) dbNFT.contract_address = nft.contract.address;
  if (nft.tokenId) dbNFT.token_id = nft.tokenId;
  if (nft.title) dbNFT.name = nft.title;
  if (nft.description) dbNFT.description = nft.description;
  if (nft.media?.[0]?.gateway) dbNFT.image_url = nft.media[0].gateway;
  if (nft.metadata) dbNFT.metadata = nft.metadata;
  if (nft.network_id) dbNFT.network_id = nft.network_id;

  const { data, error } = await supabase
    .from('nfts')
    .update({ ...dbNFT, last_updated: new Date() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteNFT = async (id: string) => {
  const { error } = await supabase
    .from('nfts')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const getNFTsByWallet = async (walletId: string): Promise<NFT[]> => {
  const { data, error } = await supabase
    .from('nfts')
    .select('*')
    .eq('wallet_id', walletId);

  if (error) throw error;

  // Convert DB format to NFT format
  return (data || []).map((dbNft: DBNft): NFT => ({
    id: dbNft.id,
    wallet_id: dbNft.wallet_id,
    contract: {
      address: dbNft.contract_address,
      tokenType: 'ERC721', // Default to ERC721 for existing records
    },
    tokenId: dbNft.token_id,
    tokenType: 'ERC721', // Default to ERC721 for existing records
    title: dbNft.name,
    description: dbNft.description,
    media: [{
      raw: '',
      gateway: dbNft.image_url,
      format: 'image/png'
    }],
    timeLastUpdated: dbNft.last_updated.toISOString(),
    metadata: dbNft.metadata,
    network_id: dbNft.network_id
  }));
};

// Function to sync NFTs from Alchemy to our database
export const syncWalletNFTs = async (walletId: string, walletAddress: string) => {
  try {
    console.log('[NFTs] Starting sync for wallet:', walletAddress);
    
    // Initialize Alchemy
    const alchemy = new Alchemy({
      apiKey: NETWORKS.ethereum.rpcUrl.split('/').pop() || '',
      network: Network.ETH_MAINNET
    });
    
    // Get NFTs from Alchemy
    const response: GetNftsForOwnerResponse = await alchemy.nft.getNftsForOwner(walletAddress);
    console.log('[NFTs] Found', response.totalCount, 'NFTs on Alchemy');

    // Get existing NFTs from our database
    const existingNFTs = await getNFTsByWallet(walletId);
    const existingNFTMap = new Map(
      existingNFTs.map(nft => [
        `${nft.contract.address}-${nft.tokenId}`,
        nft
      ])
    );

    // Track processed NFTs to identify ones to remove
    const processedNFTKeys = new Set<string>();

    // Process each NFT from Alchemy
    for (const nft of response.ownedNfts) {
      const nftKey = `${nft.contract.address}-${nft.tokenId}`;
      processedNFTKeys.add(nftKey);

      const nftData: Omit<NFT, 'id' | 'last_updated'> = {
        wallet_id: walletId,
        contract: {
          address: nft.contract.address,
          tokenType: nft.tokenType
        },
        tokenId: nft.tokenId,
        tokenType: nft.tokenType,
        title: nft.title || '',
        description: nft.description || '',
        media: [{
          raw: '',
          gateway: nft.media?.[0]?.gateway || '',
          format: 'image/png'
        }],
        metadata: nft.rawMetadata || {},
        network_id: 1, // Ethereum mainnet
        timeLastUpdated: nft.timeLastUpdated
      };

      const existingNFT = existingNFTMap.get(nftKey);

      if (existingNFT) {
        // Update if metadata has changed
        if (existingNFT.id && JSON.stringify(existingNFT.metadata) !== JSON.stringify(nftData.metadata)) {
          console.log('[NFTs] Updating NFT:', nftKey);
          await updateNFT(existingNFT.id, nftData);
        }
      } else {
        // Save new NFT
        console.log('[NFTs] Saving new NFT:', nftKey);
        await saveNFT(nftData);
      }
    }

    // Remove NFTs that are no longer owned
    for (const [key, nft] of existingNFTMap) {
      if (!processedNFTKeys.has(key) && nft.id) {
        console.log('[NFTs] Removing NFT no longer owned:', key);
        await deleteNFT(nft.id);
      }
    }

    console.log('[NFTs] Sync completed successfully');
  } catch (error) {
    console.error('[NFTs] Sync failed:', error);
    throw error;
  }
};

/**
 * Get NFTs owned by an address
 */
export const getOwnedNFTs = async (ownerAddress: string): Promise<NFTResponse> => {
  console.log('[NFTsApi] Getting owned NFTs for address:', ownerAddress);
  try {
    const response = await makeAlchemyNFTRequest('getNFTsForOwner', {
      owner: ownerAddress,
      withMetadata: true,
      pageSize: 100,
      orderBy: "transferTime"
    }) as AlchemyNFTResponse;
    
    console.log('[NFTsApi] Raw NFTs response:', response);

    const mappedNFTs = response.ownedNfts.map((nft) => {
      // Get the best available image URL
      const imageUrl = nft.image?.cachedUrl || 
                      nft.image?.thumbnailUrl || 
                      nft.raw?.metadata?.image ||
                      '';

      return {
        contract: {
          address: nft.contract.address,
          name: nft.contract.name || '',
          symbol: nft.contract.symbol || '',
          totalSupply: nft.contract.totalSupply || '',
          tokenType: nft.tokenType
        },
        tokenId: nft.tokenId,
        tokenType: nft.tokenType,
        title: nft.name || nft.contract.name || 'Untitled NFT',
        description: nft.description || '',
        media: [{
          raw: typeof nft.tokenUri === 'string' ? nft.tokenUri : '',
          gateway: imageUrl,
          thumbnail: nft.image?.thumbnailUrl || imageUrl,
          format: nft.image?.contentType || 'image/png'
        }],
        timeLastUpdated: nft.timeLastUpdated
      };
    });

    console.log('[NFTsApi] Mapped NFTs:', mappedNFTs);

    return {
      ownedNfts: mappedNFTs,
      totalCount: response.totalCount,
      pageKey: response.pageKey
    };
  } catch (error) {
    console.error('[NFTsApi] Error getting owned NFTs:', {
      ownerAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to get owned NFTs');
  }
};

/**
 * Get NFT metadata
 */
export const getNFTMetadata = async (
  contractAddress: string, 
  tokenId: string,
  tokenType: 'erc721' | 'erc1155' = 'erc721' // Default to erc721 for backward compatibility
): Promise<NFT> => {
  console.log('[NFTsApi] Getting NFT metadata:', { contractAddress, tokenId, tokenType });
  try {
    const nft = await makeAlchemyNFTRequest('getNFTMetadata', {
      contractAddress,
      tokenId,
      tokenType: tokenType.toLowerCase(),
      refreshCache: true
    }) as AlchemyNFT;
    
    const imageUrl = nft.image?.cachedUrl || 
                    nft.image?.thumbnailUrl || 
                    nft.raw?.metadata?.image ||
                    '';

    const formattedNFT: NFT = {
      contract: {
        address: nft.contract.address,
        name: nft.contract.name || '',
        symbol: nft.contract.symbol || '',
        totalSupply: nft.contract.totalSupply || '',
        tokenType: nft.tokenType
      },
      tokenId: nft.tokenId,
      tokenType: nft.tokenType,
      title: nft.name || nft.contract.name || 'Untitled NFT',
      description: nft.description || '',
      media: [{
        raw: typeof nft.tokenUri === 'string' ? nft.tokenUri : '',
        gateway: imageUrl,
        thumbnail: nft.image?.thumbnailUrl || imageUrl,
        format: nft.image?.contentType || 'image/png'
      }],
      timeLastUpdated: nft.timeLastUpdated,
      attributes: nft.attributes?.map(attr => ({
        trait_type: attr.trait_type,
        value: attr.value,
        rarity: attr.prevalence,
        count: attr.count
      })),
      rarity: nft.rarity
    };

    console.log('[NFTsApi] Found NFT metadata with attributes:', formattedNFT.attributes);
    return formattedNFT;
  } catch (error) {
    console.error('[NFTsApi] Error getting NFT metadata:', {
      contractAddress,
      tokenId,
      tokenType,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to get NFT metadata');
  }
};

/**
 * Get NFT transfer history
 */
export const getNFTTransferHistory = async (ownerAddress: string): Promise<any[]> => {
  console.log('[NFTsApi] Getting NFT transfer history for address:', ownerAddress);
  try {
    const response = await makeAlchemyRequest('alchemy_getAssetTransfers', [{
      fromAddress: ownerAddress,
      category: ['ERC721', 'ERC1155'],
      withMetadata: true
    }]);
    
    console.log('[NFTsApi] Found transfers:', response.transfers.length);
    return response.transfers;
  } catch (error) {
    console.error('[NFTsApi] Error getting NFT transfer history:', {
      ownerAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to get NFT transfer history');
  }
};

/**
 * Verify NFT ownership
 */
export const verifyNFTOwnership = async (contractAddress: string, tokenId: string, ownerAddress: string): Promise<boolean> => {
  console.log('[NFTsApi] Verifying NFT ownership:', { contractAddress, tokenId, ownerAddress });
  try {
    const response = await makeAlchemyRequest('alchemy_getNFTsForOwner', [{
      owner: ownerAddress,
      contractAddresses: [contractAddress],
      withMetadata: false,
      pageSize: 100
    }]) as AlchemyNFTResponse;
    
    const isOwner = response.ownedNfts.some(nft => 
      nft.tokenId === tokenId && 
      nft.contract.address.toLowerCase() === contractAddress.toLowerCase()
    );
    
    console.log('[NFTsApi] Ownership verification result:', { isOwner });
    return isOwner;
  } catch (error) {
    console.error('[NFTsApi] Error verifying NFT ownership:', {
      contractAddress,
      tokenId,
      ownerAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to verify NFT ownership');
  }
};

/**
 * Get NFT floor price
 */
export const getNFTFloorPrice = async (contractAddress: string) => {
  try {
    const response = await makeAlchemyRequest('alchemy_getFloorPrice', [contractAddress]);
    return response;
  } catch (error) {
    console.error('Failed to fetch NFT floor price:', {
      contractAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

// Helper function to determine NFT token type
const getNFTTokenType = async (contractAddress: string): Promise<'ERC721' | 'ERC1155' | null> => {
  try {
    // Try ERC721 interface first
    const erc721Contract = new ethers.Contract(contractAddress, ERC721_ABI);
    try {
      await erc721Contract.supportsInterface('0x80ac58cd'); // ERC721 interface ID
      return 'ERC721';
    } catch {
      // Not ERC721, try ERC1155
      const erc1155Contract = new ethers.Contract(contractAddress, ERC1155_ABI);
      try {
        await erc1155Contract.supportsInterface('0xd9b67a26'); // ERC1155 interface ID
        return 'ERC1155';
      } catch {
        return null;
      }
    }
  } catch (error) {
    console.error('[NFTsApi] Error determining token type:', error);
    return null;
  }
};

export const estimateNFTTransferGas = async (
  contractAddress: string,
  tokenId: string,
  fromAddress: string,
  toAddress: string
) => {
  try {
    // Get wallet data to determine chain ID
    const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    if (!walletDataStr) {
      throw new Error('No wallet data found');
    }
    const walletData = JSON.parse(walletDataStr);
    const chainId = (walletData.chainId || 1) as ChainId;

    // Get token type from contract
    const tokenType = await getNFTTokenType(contractAddress);
    if (!tokenType) {
      throw new Error('Failed to determine NFT token type');
    }

    // Use centralized gas estimation
    const gasEstimation = await estimateGas(
      chainId,
      tokenType === 'ERC721' ? TransactionType.NFT_TRANSFER : TransactionType.NFT_APPROVAL,
      fromAddress,
      contractAddress,
      undefined,
      undefined,
      tokenType,
      tokenId
    );

    return {
      gasLimit: gasEstimation.gasLimit.toString(),
      gasPrice: gasEstimation.gasPrice.toString()
    };
  } catch (error) {
    console.error('[NFTsApi] Error estimating gas:', error);
    throw error;
  }
};

/**
 * Transfer an NFT to another address
 */
export const transferNFT = async ({
  contractAddress,
  toAddress,
  tokenId,
  gasPrice,
  gasLimit,
  tokenType = 'ERC721'
}: {
  contractAddress: string;
  toAddress: string;
  tokenId: string;
  gasPrice: string;
  gasLimit: string;
  tokenType: 'ERC721' | 'ERC1155';
}) => {
  try {
    console.log('[NFTs] Starting transfer process...');

    // Get wallet data from secure storage
    const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    if (!walletDataStr) {
      throw new Error('No wallet data found. Please check your wallet setup.');
    }
    
    const walletData = JSON.parse(walletDataStr);
    if (!walletData.privateKey) {
      throw new Error('No private key found in wallet data. Please check your wallet setup.');
    }

    // Create provider and wallet
    const provider = await getProvider();
    provider.pollingInterval = 1000; // Poll every second
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Transaction timed out. Please try again.')), 30000)
    );
    
    const wallet = new ethers.Wallet(walletData.privateKey, provider);
    
    // Create contract instance
    const contract = new ethers.Contract(
      contractAddress,
      tokenType === 'ERC721' ? ERC721_ABI : ERC1155_ABI,
      wallet
    );

    // Check balance for gas
    const balance = await provider.getBalance(wallet.address);
    const estimatedGasCost = BigInt(gasLimit) * BigInt(gasPrice);
    if (balance < estimatedGasCost) {
      throw new Error('Insufficient balance to cover gas fees. Please add funds to your wallet.');
    }

    // Execute transfer with timeout
    console.log('[NFTs] Executing transfer...');
    const transferPromise = tokenType === 'ERC721'
      ? contract.transferFrom(wallet.address, toAddress, tokenId, {
          gasLimit: BigInt(gasLimit),
          gasPrice: BigInt(gasPrice),
        })
      : contract.safeTransferFrom(wallet.address, toAddress, tokenId, 1, '0x', {
          gasLimit: BigInt(gasLimit),
          gasPrice: BigInt(gasPrice),
        });

    const tx = await Promise.race([transferPromise, timeoutPromise]);

    // Return transaction hash immediately
    console.log('[NFTs] Transaction sent:', tx.hash);
    
    // Wait for confirmation in background
    tx.wait().then((receipt: ethers.TransactionReceipt) => {
      console.log('[NFTs] Transaction confirmed:', receipt);
      // Sync NFTs after successful transfer
      return syncWalletNFTs(walletData.address, walletData.address);
    }).catch((error: Error) => {
      console.error('[NFTs] Transaction failed:', error);
    });

    return tx;
  } catch (error) {
    console.error('[NFTs] Transfer failed:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('invalid private key')) {
        throw new Error('Invalid wallet credentials. Please check your wallet setup.');
      } else if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient balance to cover gas fees. Please add funds to your wallet.');
      } else if (error.message.includes('nonce')) {
        throw new Error('Transaction nonce error. Please try again.');
      } else if (error.message.includes('gas required exceeds allowance')) {
        throw new Error('Gas estimation failed. The transaction may not succeed.');
      } else if (error.message.includes('1015')) {
        throw new Error('Network request blocked. Please check your internet connection and try again.');
      }
    }
    throw error;
  }
};

const alchemyConfig = {
  apiKey: NETWORKS.ethereum.rpcUrl.split('/').pop() || '',
  network: Network.ETH_MAINNET,
};

export const syncNFTs = async () => {
  try {
    const walletData = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    if (!walletData) {
      throw new Error('No wallet data found');
    }

    const { address } = JSON.parse(walletData);
    const alchemy = new Alchemy(alchemyConfig);
    
    // Fetch owned NFTs
    const ownedNFTs = await alchemy.nft.getNftsForOwner(address);

    // Store the updated NFT data
    await SecureStore.setItemAsync(
      STORAGE_KEYS.WALLET_NFTS,
      JSON.stringify({
        owned: ownedNFTs,
        lastSync: new Date().toISOString()
      })
    );

    return {
      owned: ownedNFTs
    };
  } catch (error) {
    console.error('Failed to sync NFTs:', error);
    throw error;
  }
}; 