export type ImportState = 'none' | 'seed-phrase' | 'private-key' | 'password' | 'completed';

export type RouteType = 'public' | 'auth' | 'import' | 'protected';

export type AuthState = {
  isAuthenticated: boolean;
  hasWallet: boolean;
};

export type RouteConfig = {
  path: string;
  type: RouteType;
  importStep?: ImportState;
};

// Define all routes and their types
export const ROUTES: Record<string, RouteConfig> = {
  welcome: { path: '/welcome', type: 'public' },
  signin: { path: '/signin', type: 'auth' },
  'import-seed-phrase': { 
    path: '/import-seed-phrase', 
    type: 'import',
    importStep: 'seed-phrase'
  },
  'import-private-key': { 
    path: '/import-private-key', 
    type: 'import',
    importStep: 'private-key'
  },
  'create-password-import': { 
    path: '/create-password-import', 
    type: 'import',
    importStep: 'password'
  },
  'import-success': { 
    path: '/import-success', 
    type: 'import',
    importStep: 'completed'
  },
  portfolio: { path: '/portfolio', type: 'protected' }
}; 