export const STORAGE_KEYS = {
  // Authentication State
  IS_AUTHENTICATED: 'is_authenticated',
  USER_ID: 'user_id',
  USER_EMAIL: 'user_email',

  // Wallet Data
  WALLET_DATA: 'wallet_data',
  WALLET_ADDRESS: 'wallet_address',
  WALLET_PRIVATE_KEY: 'wallet_private_key',
  WALLET_SEED_PHRASE: 'wallet_seed_phrase',
  WALLET_PASSWORD: 'wallet_password',
  WALLET_PASSWORD_RAW: 'wallet_password_raw',
  WALLET_LAST_ACTIVE: 'wallet_last_active',
  ACTIVITY_LOGS: 'activity_logs',
  TOKEN_BALANCES: 'token_balances',
  WALLET_NFTS: 'wallet_nfts',

  // Settings
  SETTINGS: {
    DARK_MODE: 'dark_mode',
    LANGUAGE: 'language',
    CURRENCY: 'currency',
    LAST_USED_NETWORK: 'last_used_network'
  },

  // Network
  NETWORK: {
    ID: 'network_id',
    WALLET_ADDRESS: 'network_wallet_address'
  },

  PORTFOLIO_DATA: 'portfolio_data',
  TRANSACTIONS: 'transactions',
  NEXT_ACCOUNT_INDEX: 'next_account_index',

  // New keys
  SELECTED_CHAIN_ID: 'selected_chain_id',
  SELECTED_ACCOUNT_INDEX: 'selected_account_index',
} as const; 