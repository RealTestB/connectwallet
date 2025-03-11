declare module 'expo-crypto' {
  export enum CryptoDigestAlgorithm {
    SHA1 = 'SHA-1',
    SHA256 = 'SHA-256',
    SHA384 = 'SHA-384',
    SHA512 = 'SHA-512',
    MD2 = 'MD2',
    MD4 = 'MD4',
    MD5 = 'MD5'
  }

  export enum CryptoEncryptionAlgorithm {
    AES = 'AES',
    AES_GCM = 'AES-GCM'
  }

  export interface CryptoEncryptionOptions {
    algorithm: CryptoEncryptionAlgorithm;
    iv: string;
  }

  export function getRandomBytes(size: number): Uint8Array;
  export function digestStringAsync(algorithm: CryptoDigestAlgorithm, data: string): Promise<string>;
  export function encryptAsync(data: string, key: string, options: CryptoEncryptionOptions): Promise<string>;
  export function decryptAsync(data: string, key: string, options: CryptoEncryptionOptions): Promise<string>;
} 