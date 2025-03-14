declare module '@reown/walletkit' {
  import { EventEmitter } from 'events';

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

  export interface Session {
    topic: string;
    pairingTopic: string;
    relay: {
      protocol: string;
      data?: string;
    };
    expiry: number;
    acknowledged: boolean;
    controller: string;
    namespaces: Record<string, {
      accounts: string[];
      methods: string[];
      events: string[];
    }>;
    requiredNamespaces: Record<string, {
      chains: string[];
      methods: string[];
      events: string[];
    }>;
    optionalNamespaces: Record<string, {
      chains: string[];
      methods: string[];
      events: string[];
    }>;
  }

  export class WalletKit extends EventEmitter {
    static init(config: WalletKitConfig): Promise<WalletKit>;
    createAccount(config: AccountConfig): Promise<Account>;
    getActiveSessions(): Record<string, Session>;
    on(event: string, listener: (...args: any[]) => void): this;
    respondSessionRequest(params: { topic: string; response: any }): Promise<void>;
  }
} 