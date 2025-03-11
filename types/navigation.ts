import { NFT, Token } from './api';

export type RootStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  CreatePassword: {
    mode: 'new' | 'import';
    type?: 'seed-phrase' | 'private-key';
  };
  ImportSeedPhrase: {
    password: string;
  };
  ImportPrivateKey: {
    password: string;
  };
  SeedPhrase: {
    password: string;
  };
  ConfirmSeedPhrase: {
    password: string;
  };
  SecureWallet: undefined;
  WalletCreated: undefined;
  ImportSuccess: {
    type: 'creation' | 'import' | 'backup' | 'reset';
  };
  Portfolio: undefined;
  NFT: undefined;
  NFTDetails: {
    nft: NFT;
  };
  SendNFT: {
    nft: NFT;
  };
  Pay: undefined;
  Receive: undefined;
  Swap: undefined;
  TransactionHistory: undefined;
  TransactionDetails: {
    id: string;
  };
  Settings: undefined;
};

export type TabParamList = {
  Portfolio: undefined;
  NFT: undefined;
  Pay: undefined;
  Receive: undefined;
  Settings: undefined;
}; 