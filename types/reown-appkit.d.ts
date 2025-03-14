declare module '@reown/appkit-react-native' {
  import { FC, ReactNode } from 'react';

  export interface AppKitProviderProps {
    projectId: string;
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
    children?: ReactNode;
  }

  export const AppKitProvider: FC<AppKitProviderProps>;
} 