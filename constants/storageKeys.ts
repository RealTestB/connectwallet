export const STORAGE_KEYS = {
  // Wallet Setup State
  SETUP_STATE: 'wallet_setup_state',
  TEMP_SEED_PHRASE: 'temp_seed_phrase',
  TEMP_USER_ID: 'temp_user_id',

  // Wallet Data
  WALLET_DATA: 'wallet_data',
  WALLET_ADDRESS: 'wallet_address',
  WALLET_PRIVATE_KEY: 'wallet_private_key',
  WALLET_SEED_PHRASE: 'wallet_seed_phrase',
  WALLET_PASSWORD: 'wallet_password',
  WALLET_LAST_ACTIVE: 'wallet_last_active',
  ACTIVITY_LOGS: 'activity_logs',
  TOKEN_BALANCES: 'token_balances',

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

  // Setup Steps
  SETUP_STEPS: {
    PASSWORD_CREATED: 'password_created',
    SEED_PHRASE_GENERATED: 'seed_phrase_generated',
    SEED_PHRASE_CONFIRMED: 'seed_phrase_confirmed',
    WALLET_SECURED: 'wallet_secured',
    COMPLETE: 'complete'
  },

  PORTFOLIO_DATA: 'portfolio_data',
} as const; 