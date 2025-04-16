module.exports = {
  expo: {
    name: "ConnectWallet",
    slug: "connectwallet",
    version: "1.0.4",
    runtimeVersion: {
      policy: "sdkVersion"
    },
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "native",
      backgroundColor: "#232323"
    },
    updates: {
      enabled: true,
      checkAutomatically: "ON_LOAD",
      url: "https://u.expo.dev/2eb87a1c-e5e8-44f5-8d81-cf90358b61aa"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    scheme: "com.concordianova.connectwallet",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.concordianova.connectwallet",
      associatedDomains: [
        "applinks:connectwallet.app"
      ],
      infoPlist: {
        NSCameraUsageDescription: "This app uses the camera for scanning QR codes.",
        NSLocationWhenInUseUsageDescription: "This app uses your location for finding nearby services.",
        UIBackgroundModes: ["remote-notification"],
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSAllowsArbitraryLoadsForMedia: true,
          NSAllowsArbitraryLoadsInWebContent: true
        }
      }
    },
    android: {
      package: "com.concordianova.connectwallet",
      versionCode: 71,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE"
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "com.concordianova.connectwallet"
            },
            {
              scheme: "https",
              host: "connectwallet.app"
            }
          ],
          category: [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ],
      networkSecurityConfig: {
        cleartextTrafficPermitted: true
      }
    },
    web: {
      favicon: "./assets/images/icon.png"
    },
    owner: "connectwallet",
    plugins: [
      ["expo-dev-client", {
        "developerMode": true
      }],
      [
        "react-native-vision-camera",
        {
          "cameraPermissionText": "ConnectWallet needs access to your camera to scan QR codes.",
          "enableMicrophonePermission": false
        }
      ],
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 24,
            kotlinVersion: "1.9.25",
            buildToolsVersion: "35.0.0",
            extraProperties: {
              "android.suppressKotlinVersionCompatibilityCheck": true,
              "android.defaults.buildfeatures.buildconfig": true,
              "android.useAndroidX": true,
              "android.enableJetifier": true,
              "kotlinCompilerExtensionVersion": "1.5.15",
              "android.okhttp.timeout.connect": "30000",
              "android.okhttp.timeout.read": "30000",
              "android.okhttp.timeout.write": "30000",
              "androidx.browser.version": "1.8.0"
            }
          },
          ios: {
            deploymentTarget: "17.0"
          }
        }
      ],
      [
        "expo-asset"
      ],
      [
        "expo-secure-store",
        {
          faceIDPermission: "ConnectWallet needs to access your Face ID for secure authentication."
        }
      ],
      ["expo-router"],
      [
        "expo-splash-screen",
        {
          ios: {
            backgroundColor: "#232323",
            image: "./assets/images/splash-icon.png",
            resizeMode: "native",
            imageResizeMode: "native"
          },
          android: {
            backgroundColor: "#232323",
            image: "./assets/images/splash-icon.png",
            resizeMode: "native",
            imageResizeMode: "native"
          }
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "1083be59-e11a-48f1-844c-f8bebeb2b4d0"
      },
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || "https://fymuwcftwkzuomgphqjx.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5bXV3Y2Z0d2t6dW9tZ3BocWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2MTU3NzQsImV4cCI6MjA1NjE5MTc3NH0.wS-1aj-wYvR0RoopHPv9JVjGPfqRjBLon9fXnrCXGkU",
      EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5bXV3Y2Z0d2t6dW9tZ3BocWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDYxNTc3NCwiZXhwIjoyMDU2MTkxNzc0fQ.phtHxE_6r-nUANxOSO-iHA9i5OziJx6SQCY4TmIorTY",
      ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
      ETHEREUM_MAINNET_URL: process.env.ETHEREUM_MAINNET_URL,
      ETHEREUM_MAINNET_FALLBACK_URLS: [
        "https://eth.llamarpc.com",
        "https://rpc.ankr.com/eth",
        "https://ethereum.publicnode.com",
        "https://1rpc.io/eth"
      ],
      ALCHEMY_ETH_MAINNET_KEY: process.env.ALCHEMY_ETH_MAINNET_KEY,
      ETHEREUM_SEPOLIA_URL: process.env.ETHEREUM_SEPOLIA_URL,
      POLYGON_POS_MAINNET_URL: process.env.POLYGON_POS_MAINNET_URL,
      POLYGON_POS_FALLBACK_URLS: [
        "https://polygon-rpc.com",
        "https://rpc-mainnet.matic.network",
        "https://rpc.ankr.com/polygon"
      ],
      ARBITRUM_MAINNET_URL: process.env.ARBITRUM_MAINNET_URL,
      ARBITRUM_FALLBACK_URLS: [
        "https://arb1.arbitrum.io/rpc",
        "https://rpc.ankr.com/arbitrum"
      ],
      ARBITRUM_SEPOLIA_URL: process.env.ARBITRUM_SEPOLIA_URL,
      OPTIMISM_MAINNET_URL: process.env.OP_MAINNET_URL,
      OPTIMISM_FALLBACK_URLS: [
        "https://mainnet.optimism.io",
        "https://rpc.ankr.com/optimism"
      ],
      OPTIMISM_SEPOLIA_URL: process.env.OP_SEPOLIA_URL,
      AVALANCHE_MAINNET_URL: process.env.AVALANCHE_MAINNET_URL,
      AVALANCHE_FALLBACK_URLS: [
        "https://api.avax.network/ext/bc/C/rpc",
        "https://rpc.ankr.com/avalanche"
      ],
      BASE_MAINNET_URL: process.env.BASE_MAINNET_URL,
      BASE_FALLBACK_URLS: [
        "https://mainnet.base.org",
        "https://base.gateway.tenderly.co"
      ],
      WORLD_CHAIN_MAINNET_URL: process.env.WORLD_CHAIN_MAINNET_URL,
      WORLD_CHAIN_SEPOLIA_URL: process.env.WORLD_CHAIN_SEPOLIA_URL,
      SHAPE_MAINNET_URL: process.env.SHAPE_MAINNET_URL,
      SHAPE_SEPOLIA_URL: process.env.SHAPE_SEPOLIA_URL,
      ETHEREUM_HOLESKY_URL: process.env.ETHEREUM_HOLESKY_URL,
      ZKSYNC_MAINNET_URL: process.env.ZKSYNC_MAINNET_URL,
      ZKSYNC_SEPOLIA_URL: process.env.ZKSYNC_SEPOLIA_URL,
      POLYGON_POS_AMOY_URL: process.env.POLYGON_POS_AMOY_URL,
      POLYGON_ZKEVM_MAINNET_URL: process.env.POLYGON_ZKEVM_MAINNET_URL,
      POLYGON_ZKEVM_CARDONA_URL: process.env.POLYGON_ZKEVM_CARDONA_URL,
      GEIST_MAINNET_URL: process.env.GEIST_MAINNET_URL,
      GEIST_POLTER_URL: process.env.GEIST_POLTER_URL,
      ARBITRUM_NOVA_MAINNET_URL: process.env.ARBITRUM_NOVA_MAINNET_URL,
      STARKNET_MAINNET_URL: process.env.STARKNET_MAINNET_URL,
      STARKNET_SEPOLIA_URL: process.env.STARKNET_SEPOLIA_URL,
      ASTAR_MAINNET_URL: process.env.ASTAR_MAINNET_URL,
      ZETA_CHAIN_MAINNET_URL: process.env.ZETA_CHAIN_MAINNET_URL,
      ZETA_CHAIN_TESTNET_URL: process.env.ZETA_CHAIN_TESTNET_URL,
      FANTOM_OPERA_MAINNET_URL: process.env.FANTOM_OPERA_MAINNET_URL,
      FANTOM_OPERA_TESTNET_URL: process.env.FANTOM_OPERA_TESTNET_URL,
      MANTLE_MAINNET_URL: process.env.MANTLE_MAINNET_URL,
      MANTLE_SEPOLIA_URL: process.env.MANTLE_SEPOLIA_URL,
      BERACHAIN_MAINNET_URL: process.env.BERACHAIN_MAINNET_URL,
      BLAST_MAINNET_URL: process.env.BLAST_MAINNET_URL,
      BLAST_SEPOLIA_URL: process.env.BLAST_SEPOLIA_URL,
      LINEA_MAINNET_URL: process.env.LINEA_MAINNET_URL,
      LINEA_SEPOLIA_URL: process.env.LINEA_SEPOLIA_URL,
      BASE_SEPOLIA_URL: process.env.BASE_SEPOLIA_URL,
      GNOSIS_MAINNET_URL: process.env.GNOSIS_MAINNET_URL,
      GNOSIS_CHIADO_URL: process.env.GNOSIS_CHIADO_URL,
      BNB_SMART_CHAIN_MAINNET_URL: process.env.BNB_SMART_CHAIN_MAINNET_URL,
      BNB_SMART_CHAIN_TESTNET_URL: process.env.BNB_SMART_CHAIN_TESTNET_URL,
      AVALANCHE_FUJI_URL: process.env.AVALANCHE_FUJI_URL,
      SOLANA_MAINNET_URL: process.env.SOLANA_MAINNET_URL,
      SOLANA_DEVNET_URL: process.env.SOLANA_DEVNET_URL,
      CROSSFI_MAINNET_URL: process.env.CROSSFI_MAINNET_URL,
      CROSSFI_TESTNET_URL: process.env.CROSSFI_TESTNET_URL,
      FLOW_EVM_MAINNET_URL: process.env.FLOW_EVM_MAINNET_URL,
      FLOW_EVM_TESTNET_URL: process.env.FLOW_EVM_TESTNET_URL,
      APECHAIN_MAINNET_URL: process.env.APECHAIN_MAINNET_URL,
      APECHAIN_CURTIS_URL: process.env.APECHAIN_CURTIS_URL,
      UNICHAIN_MAINNET_URL: process.env.UNICHAIN_MAINNET_URL,
      UNICHAIN_SEPOLIA_URL: process.env.UNICHAIN_SEPOLIA_URL,
      S3_URL: process.env.S3_URL,
      S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
      S3_SECRET_KEY: process.env.S3_SECRET_KEY,
      S3_REGION: process.env.S3_REGION,
      CMC_API_KEY: process.env.CMC_API_KEY,
      LIFI_API_KEY: process.env.LIFI_API_KEY,
      REOWN_PROJECT_ID: process.env.REOWN_PROJECT_ID || '',
      WALLETCONNECT_PROJECT_ID: process.env.WALLETCONNECT_PROJECT_ID,
      NETWORK_SETTINGS: {
        timeoutMs: 15000,
        maxRetries: 3,
        retryDelayMs: 1000,
        maxRetryDelayMs: 10000,
        pollingIntervalMs: 8000
      }
    },
    experiments: {
      tsconfigPaths: true
    },
    developmentClient: {
      silentLaunch: false
    }
  }
};