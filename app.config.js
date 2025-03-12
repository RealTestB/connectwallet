module.exports = {
  expo: {
    name: "wallet-new",
    slug: "wallet-new",
    version: "1.0.0",
    runtimeVersion: {
      policy: "sdkVersion"
    },
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "cover",
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
        "applinks:newwallet.app"
      ],
      infoPlist: {
        NSCameraUsageDescription: "This app uses the camera for scanning QR codes.",
        NSLocationWhenInUseUsageDescription: "This app uses your location for finding nearby services.",
        UIBackgroundModes: ["remote-notification"]
      }
    },
    android: {
      package: "com.concordianova.connectwallet",
      versionCode: 68,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.READ_EXTERNAL_STORAGE"
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
              host: "newwallet.app"
            }
          ],
          category: [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    },
    web: {
      favicon: "./assets/images/icon.png"
    },
    owner: "connectwallet",
    plugins: [
      ["expo-dev-client"],
      [
        "expo-build-properties",
        {
          android: {
            newArchEnabled: false,
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
              "kotlinCompilerExtensionVersion": "1.5.15"
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
        "expo-secure-store"
      ],
      ["expo-router"],
      [
        "expo-splash-screen",
        {
          ios: {
            backgroundColor: "#232323",
            image: "./assets/images/splash.png",
            resizeMode: "cover"
          },
          android: {
            backgroundColor: "#232323",
            image: "./assets/images/splash.png",
            resizeMode: "cover"
          }
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "b10e8035-6c51-40f7-b8db-ac04478e981e"
      },
      ALCHEMY_ETH_MAINNET_KEY: process.env.ALCHEMY_ETH_MAINNET_KEY,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      CMC_API_KEY: process.env.CMC_API_KEY,
      LIFI_API_KEY: process.env.LIFI_API_KEY,
      REOWN_PROJECT_ID: process.env.REOWN_PROJECT_ID,
      WALLETCONNECT_PROJECT_ID: process.env.WALLETCONNECT_PROJECT_ID
    },
    experiments: {
      tsconfigPaths: true
    }
  }
}; 