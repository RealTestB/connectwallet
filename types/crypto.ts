export interface EncryptedData {
  encryptedData: string;
  salt: string;
  iv: string;
}

export interface EncryptedSeedPhrase extends EncryptedData {
  encryptedSeedPhrase: string;
}

export interface EncryptedPrivateKey extends EncryptedData {
  encryptedKey: string;
}

export interface WalletData {
  address: string;
  chainId?: number;
  features?: string[];
}

export interface CryptoConfig {
  algorithm: 'AES-GCM';
  keyLength: number;
  saltLength: number;
  ivLength: number;
  iterations: number;
}

export type HashAlgorithm = 'SHA-256' | 'SHA-512';

export interface SecurityConfig {
  sessionTimeout: number;
  maxAttempts: number;
  lockoutDuration: number;
} 