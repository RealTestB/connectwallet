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
  welcome: undefined;
  signin: undefined;
  
  // Password Creation/Import Flow
  'create-password': {
    mode: 'create' | 'import';
    type?: 'seed-phrase' | 'private-key';
  };
  
  // New Wallet Creation Flow
  'seed-phrase': {
    password: string;
  };
  'confirm-seed-phrase': {
    password: string;
    seedPhrase: string;
  };
  'secure-wallet': {
    password: string;
  };
  'wallet-created': {
    walletAddress: string;
    walletType: 'smart' | 'classic';
  };
  
  // Import Flow
  'import-wallet': undefined;
  'import-seed-phrase': {
    password: string;
  };
  'import-private-key': {
    password: string;
  };
  'import-success': {
    walletAddress: string;
    walletType: 'smart' | 'classic';
  };
  
  // Main App Screens
  home: undefined;
  portfolio: {
    walletAddress: string;
    walletType: 'smart' | 'classic';
  };
  swap: undefined;
  nft: undefined;
  pay: undefined;
  receive: undefined;
  settings: undefined;
  
  // NFT Related
  'nft-details': {
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
  'send-nft': { nft: NFT };
  
  // Transaction Related
  'transaction-details': {
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
  'transaction-history': undefined;
}; 