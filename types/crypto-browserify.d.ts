declare module 'crypto-browserify' {
  const crypto: {
    getRandomValues(array: Uint8Array): Uint8Array;
    subtle: SubtleCrypto;
    randomBytes(size: number): Buffer;
    createHash(algorithm: string): any;
    createHmac(algorithm: string, key: string | Buffer): any;
    pbkdf2(
      password: string | Buffer,
      salt: string | Buffer,
      iterations: number,
      keylen: number,
      digest: string,
      callback: (err: Error | null, derivedKey: Buffer) => void
    ): void;
    pbkdf2Sync(
      password: string | Buffer,
      salt: string | Buffer,
      iterations: number,
      keylen: number,
      digest: string
    ): Buffer;
  };
  export = crypto;
} 