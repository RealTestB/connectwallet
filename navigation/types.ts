export interface NFT {
  tokenId: string;
  name?: string;
  collection?: string;
  image?: string;
  description?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  contractAddress: string;
  owner: string;
  chain: string;
}

export type RootStackParamList = {
  // Welcome & Initial Flow
  Welcome: undefined;
  
  // Password Creation/Import Flow
  CreatePassword: {
    mode: 'create' | 'import';
    type?: 'seed-phrase' | 'private-key';
  };
  
  // New Wallet Creation Flow
  SeedPhrase: {
    password: string;
  };
  ConfirmSeedPhrase: {
    password: string;
    seedPhrase: string;
  };
  SecureWallet: {
    password: string;
  };
  WalletCreated: {
    walletAddress: string;
    walletType: 'smart' | 'classic';
  };
  
  // Import Flow
  ImportWallet: undefined;
  ImportSeedPhrase: {
    password: string;
  };
  ImportPrivateKey: {
    password: string;
  };
  ImportSuccess: {
    walletAddress: string;
    walletType: 'smart' | 'classic';
  };
  
  // Main App Screens
  Home: undefined;
  Portfolio: {
    walletAddress: string;
    walletType: 'smart' | 'classic';
  };
  Swap: undefined;
  
  // NFT Related
  NFTDetails: {
    nft: {
      tokenId: string;
      name: string;
      collection?: string;
      image: string;
      owner: string;
      chain: string;
      explorerUrl?: string;
      traits?: Array<{
        trait_type: string;
        value: string | number;
      }>;
    };
  };
  SendNFTScreen: { nft: NFT };
  
  // Transaction Related
  TransactionDetails: {
    transaction: {
      type?: string;
      amount?: string;
      date?: string;
      status?: string;
      to?: string;
      from?: string;
      network?: string;
      fee?: string;
      provider?: string;
      paid?: string;
      received?: string;
      explorer?: string;
    };
  };
}; 