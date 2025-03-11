declare module 'alchemy-sdk' {
  export enum Network {
    ETH_MAINNET = 'eth-mainnet',
    ETH_GOERLI = 'eth-goerli',
    ETH_SEPOLIA = 'eth-sepolia',
    MATIC_MAINNET = 'polygon-mainnet',
    MATIC_MUMBAI = 'polygon-mumbai',
    ARB_MAINNET = 'arb-mainnet',
    ARB_GOERLI = 'arb-goerli',
    OPT_MAINNET = 'opt-mainnet',
    OPT_GOERLI = 'opt-goerli'
  }

  export interface AlchemySettings {
    apiKey: string;
    network?: Network;
    maxRetries?: number;
    requestTimeout?: number;
  }

  export interface NftMetadataResponse {
    contract: {
      address: string;
      name?: string;
      symbol?: string;
      totalSupply?: string;
      tokenType: string;
    };
    tokenId: string;
    tokenType: string;
    title: string;
    description: string;
    timeLastUpdated: string;
    metadataError?: string;
    rawMetadata?: Record<string, any>;
    tokenUri?: {
      raw: string;
      gateway: string;
    };
    media: Array<{
      raw: string;
      gateway: string;
      thumbnail?: string;
      format: string;
      bytes?: number;
    }>;
  }

  export interface NftContractMetadataResponse {
    name?: string;
    symbol?: string;
    totalSupply?: string;
    tokenType: string;
    contractDeployer?: string;
    deployedBlockNumber?: number;
    openSea?: {
      floorPrice?: number;
      collectionName?: string;
      safelistRequestStatus?: string;
      imageUrl?: string;
      description?: string;
      externalUrl?: string;
      twitterUsername?: string;
      discordUrl?: string;
      lastIngestedAt?: string;
    };
  }

  export interface GetNftsForOwnerOptions {
    pageKey?: string;
    pageSize?: number;
    contractAddresses?: string[];
    omitMetadata?: boolean;
    orderBy?: 'transferTime' | 'mint';
  }

  export interface GetNftsForOwnerResponse {
    ownedNfts: NftMetadataResponse[];
    pageKey?: string;
    totalCount: number;
  }

  export interface GetAssetTransfersOptions {
    fromBlock?: string;
    toBlock?: string;
    fromAddress?: string;
    toAddress?: string;
    contractAddresses?: string[];
    category?: string[];
    excludeZeroValue?: boolean;
    maxCount?: number;
    pageKey?: string;
    withMetadata?: boolean;
  }

  export interface AssetTransfersResponse {
    transfers: Array<{
      blockNum: string;
      hash: string;
      from: string;
      to: string;
      value?: number;
      asset?: string;
      category: string;
      tokenId?: string;
      uniqueId?: string;
      rawContract?: {
        value?: string;
        address?: string;
        decimal?: number;
      };
    }>;
    pageKey?: string;
  }

  export interface GetFloorPriceResponse {
    openSea?: {
      floorPrice?: number;
      priceCurrency?: string;
      collectionUrl?: string;
      retrievedAt?: string;
    };
    looksRare?: {
      floorPrice?: number;
      priceCurrency?: string;
      collectionUrl?: string;
      retrievedAt?: string;
    };
  }

  export interface TokenBalance {
    contractAddress: string;
    tokenBalance: string;
  }

  export interface TokenBalancesResponse {
    tokenBalances: TokenBalance[];
  }

  export interface TokenMetadata {
    decimals: number;
    logo?: string;
    name?: string;
    symbol: string;
    isSpam?: boolean;
  }

  export interface Block {
    hash: string;
    parentHash: string;
    number: number;
    timestamp: number;
    nonce: string;
    difficulty: number;
    gasLimit: bigint;
    gasUsed: bigint;
    miner: string;
    extraData: string;
    transactions: string[];
  }

  export interface TransactionResponse {
    hash: string;
    blockHash: string | null;
    blockNumber: number | null;
    from: string;
    gasPrice: bigint | null;
    maxPriorityFeePerGas: bigint | null;
    maxFeePerGas: bigint | null;
    gasLimit: bigint;
    to: string | null;
    value: bigint;
    nonce: number;
    data: string;
    chainId: number;
    type: number;
  }

  export interface Provider {
    estimateGas(transaction: TransactionRequest): Promise<bigint>;
    getFeeData(): Promise<{
      gasPrice: bigint | null;
      maxFeePerGas: bigint | null;
      maxPriorityFeePerGas: bigint | null;
    }>;
  }

  export class Config {
    getProvider(): Promise<Provider>;
  }

  export class Nft {
    getNftsForOwner(owner: string, options?: GetNftsForOwnerOptions): Promise<GetNftsForOwnerResponse>;
    getNftMetadata(contractAddress: string, tokenId: string): Promise<NftMetadataResponse>;
    getContractMetadata(contractAddress: string): Promise<NftContractMetadataResponse>;
    getFloorPrice(contractAddress: string): Promise<GetFloorPriceResponse>;
  }

  export class Core {
    getAssetTransfers(options: GetAssetTransfersOptions): Promise<AssetTransfersResponse>;
    getTokenBalances(address: string): Promise<TokenBalancesResponse>;
    getTokenMetadata(address: string): Promise<TokenMetadata>;
    getBalance(address: string): Promise<bigint>;
    getTransactionReceipt(hash: string): Promise<TransactionReceipt | null>;
    getTransaction(hash: string): Promise<TransactionResponse | null>;
    getBlock(blockNumber: number): Promise<Block>;
  }

  export class Alchemy {
    constructor(settings: AlchemySettings);
    nft: Nft;
    core: Core;
    config: Config;
  }
} 