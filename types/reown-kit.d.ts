declare module '@reown/walletkit' {
  export class Core {
    constructor(config: { projectId: string });
  }

  export interface WalletKitConfig {
    core: Core;
    metadata: {
      name: string;
      description: string;
      url: string;
      icons: string[];
      redirect: {
        native: string;
        universal: string;
      };
    };
    features?: {
      verify?: boolean;
      notifications?: boolean;
      oneClickAuth?: boolean;
    };
  }

  export interface AccountConfig {
    config: {
      enableBatchTransactions?: boolean;
      enablePaymaster?: boolean;
      recoveryMethods?: string[];
      chainConfig: {
        defaultChain: {
          chainId: number;
          name: string;
          rpcUrl: string;
          blockExplorerUrl: string;
          nativeCurrency: {
            name: string;
            symbol: string;
            decimals: number;
          };
        };
        supportedChains: Array<{
          chainId: number;
          name: string;
          rpcUrl: string;
          blockExplorerUrl: string;
          nativeCurrency: {
            name: string;
            symbol: string;
            decimals: number;
          };
        }>;
      };
    };
  }

  export interface Account {
    address: string;
    chainId: number;
    features: {
      verify: boolean;
      notifications: boolean;
      oneClickAuth: boolean;
    };
  }

  export class WalletKit {
    static init(config: WalletKitConfig): Promise<WalletKit>;
    createAccount(config: AccountConfig): Promise<Account>;
  }
} 