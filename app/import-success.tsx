import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { sharedStyles, COLORS, SPACING, FONTS } from "../styles/shared";
import * as SecureStore from "expo-secure-store";
import { supabase, supabaseAdmin } from "../lib/supabase";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { useAuth } from '../contexts/AuthContext';

type IconName = 'checkmark-circle' | 'wallet' | 'shield' | 'refresh';

interface Message {
  title: string;
  description: string;
  icon: IconName;
  tips: boolean;
}

export default function ImportSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const { checkAuth } = useAuth();
  const [message, setMessage] = useState<Message>({
    title: "",
    description: "",
    icon: "checkmark-circle",
    tips: true,
  });
  const [fadeAnim] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(10));
  const [sessionRefreshed, setSessionRefreshed] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const successType = typeof params.type === 'string' ? params.type : 'import';

    switch (successType) {
      case "creation":
        setMessage({
          title: "Wallet Successfully Created",
          description: "Your wallet has been created and is ready to use",
          icon: "wallet",
          tips: true,
        });
        break;
      case "import":
        setMessage({
          title: "Wallet Successfully Imported",
          description: "Your wallet has been imported and is ready to use",
          icon: "checkmark-circle",
          tips: true,
        });
        break;
      case "backup":
        setMessage({
          title: "Backup Complete",
          description: "Your wallet has been successfully backed up",
          icon: "shield",
          tips: false,
        });
        break;
      case "reset":
        setMessage({
          title: "Wallet Reset Complete",
          description: "Your wallet has been reset to default settings",
          icon: "refresh",
          tips: false,
        });
        break;
      default:
        setMessage({
          title: "Success",
          description: "Operation completed successfully",
          icon: "checkmark-circle",
          tips: false,
        });
    }

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Set sessionRefreshed to true since we just created the password
    setSessionRefreshed(true);

    // Cleanup function
    return () => {
      // Clear any temporary states
      setSessionRefreshed(false);
      setIsNavigating(false);
      setError(null);
    };
  }, []);

  const handleGoToPortfolio = async () => {
    if (isNavigating) {
      console.log('🚫 Navigation already in progress');
      return;
    }

    try {
      console.log('🚀 Starting navigation to portfolio...');
      setIsNavigating(true);

      // Log initial state
      const initialAuthState = await SecureStore.getItemAsync(STORAGE_KEYS.IS_AUTHENTICATED);
      const initialWalletData = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      console.log('📊 [Debug] Initial state:', {
        isAuthenticated: initialAuthState,
        hasWalletData: !!initialWalletData,
        walletData: initialWalletData ? JSON.parse(initialWalletData) : null
      });

      // Set authentication flag
      await SecureStore.setItemAsync(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
      console.log('✅ Authentication flag set');

      // Set last active timestamp
      const now = Date.now().toString();
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE, now);
      console.log('✅ Last active timestamp set:', new Date(parseInt(now)).toISOString());

      // Verify storage after setting
      const verifyAuth = await SecureStore.getItemAsync(STORAGE_KEYS.IS_AUTHENTICATED);
      const verifyLastActive = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE);
      console.log('🔍 [Debug] Storage verification:', {
        isAuthenticated: verifyAuth,
        lastActive: verifyLastActive,
        lastActiveDate: new Date(parseInt(verifyLastActive || '0')).toISOString()
      });

      // Update auth context
      console.log('🔄 [Debug] Calling checkAuth...');
      await checkAuth();
      console.log('✅ [Debug] checkAuth completed');

      // Get final state before navigation
      const finalAuthState = await SecureStore.getItemAsync(STORAGE_KEYS.IS_AUTHENTICATED);
      console.log('📊 [Debug] Final state before navigation:', {
        isAuthenticated: finalAuthState
      });

      // Use a small delay to ensure the root layout is mounted
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ Navigation conditions met, proceeding to portfolio...');
      router.replace('/portfolio');
    } catch (error) {
      console.error('❌ Error during navigation:', error);
      setError('Failed to navigate to portfolio');
      setIsNavigating(false);
      
      // Log error details
      console.error('🔍 [Debug] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // If navigation fails, try to redirect to the index page
      try {
        router.replace('/');
      } catch (fallbackError) {
        console.error('❌ Fallback navigation failed:', fallbackError);
      }
    }
  };

  const refreshSession = async () => {
    try {
      console.log('🔄 Starting session refresh...');
      setIsLoading(true);
      
      // Get user ID from SecureStore
      const userId = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
      console.log('👤 [Debug] User ID from SecureStore:', userId);
      if (!userId) {
        throw new Error('No user ID found');
      }

      // Get email from SecureStore
      const email = await SecureStore.getItemAsync(STORAGE_KEYS.USER_EMAIL);
      console.log('📧 [Debug] Email from SecureStore:', email);
      if (!email) {
        throw new Error('No email found');
      }

      // Get password hash from SecureStore
      const passwordHash = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PASSWORD);
      console.log('🔐 [Debug] Password hash from SecureStore:', passwordHash);
      if (!passwordHash) {
        throw new Error('No password found. Please set a password first.');
      }

      // Parse the password hash
      console.log('🔍 [Debug] Parsing password hash...');
      const parsedHash = JSON.parse(passwordHash);
      console.log('📝 [Debug] Parsed hash structure:', parsedHash);

      // Get user data from database to verify password hash
      console.log('🔍 [Debug] Querying database for user:', userId);
      let dbResponse = await supabaseAdmin
        .from('auth_users')
        .select('password_hash')
        .eq('id', userId)
        .single();

      console.log('📦 [Debug] Database response:', dbResponse);

      if (dbResponse.error) {
        console.error('❌ [Debug] Database error:', dbResponse.error);
        throw dbResponse.error;
      }

      // Check if we have data and it contains password_hash
      if (!dbResponse.data || !dbResponse.data.password_hash) {
        console.log('⏳ [Debug] No password hash found, waiting 1s before retry...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('🔄 [Debug] Retrying database query...');
        dbResponse = await supabaseAdmin
          .from('auth_users')
          .select('password_hash')
          .eq('id', userId)
          .single();
          
        console.log('📦 [Debug] Retry response:', dbResponse);
        
        if (dbResponse.error || !dbResponse.data || !dbResponse.data.password_hash) {
          console.error('❌ [Debug] Retry failed:', dbResponse);
          throw new Error('No password hash found in database after retry');
        }
      }

      const userData = dbResponse.data;
      const dbPasswordHash = userData.password_hash;

      // Log the comparison
      console.log('🔍 [Debug] Comparing hashes:', {
        storedHash: parsedHash.hash,
        dbHash: dbPasswordHash.hash
      });

      // Verify the password hash matches
      if (dbPasswordHash.hash !== parsedHash.hash) {
        console.error('❌ [Debug] Hash mismatch:', {
          stored: parsedHash.hash,
          database: dbPasswordHash.hash
        });
        throw new Error('Password hash mismatch');
      }

      console.log('✅ [Debug] Hash verification successful');

      // Refresh session with Supabase using the credentials we already have
      console.log('🔄 [Debug] Attempting to sign in with verified credentials');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: parsedHash.hash
      });

      if (signInError) {
        console.error('❌ [Debug] Sign in error:', signInError);
        throw signInError;
      }

      console.log('✅ Session refreshed successfully');
      setSessionRefreshed(true);
      setError(null);
    } catch (error) {
      console.error('❌ Error refreshing session:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh session');
      // Still allow navigation even if session refresh fails
      setSessionRefreshed(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={sharedStyles.container}>
      <Image 
        source={require("../assets/images/background.png")}
        style={sharedStyles.backgroundImage}
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          <Ionicons name={message.icon} size={48} color={COLORS.success} />
        </Animated.View>

        <Animated.View
          style={[
            styles.messageContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          <Text style={[FONTS.h1, styles.title]}>{message.title}</Text>
          <Text style={[FONTS.body, { color: COLORS.textSecondary }]}>{message.description}</Text>
        </Animated.View>

        {message.tips && (
          <Animated.View
            style={[
              styles.tipsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY }],
              },
            ]}
          >
            <Text style={[FONTS.caption, styles.tipsTitle]}>Important Security Tips:</Text>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Ionicons name="shield-outline" size={16} color={COLORS.primary} style={styles.tipIcon} />
                <Text style={[FONTS.caption, styles.tipText]}>
                  Never share your private key or seed phrase with anyone
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="lock-closed-outline" size={16} color={COLORS.primary} style={styles.tipIcon} />
                <Text style={[FONTS.caption, styles.tipText]}>
                  Store your recovery phrase in a secure location
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="eye-off-outline" size={16} color={COLORS.primary} style={styles.tipIcon} />
                <Text style={[FONTS.caption, styles.tipText]}>
                  Keep your password private and use a strong combination
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        <Animated.Text
          style={[
            FONTS.caption,
            styles.redirectText,
            {
              opacity: fadeAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          {sessionRefreshed ? "Ready to go to your wallet" : "Setting up your wallet..."}
        </Animated.Text>

        <TouchableOpacity
          style={[sharedStyles.button, styles.button, !sessionRefreshed && styles.buttonDisabled]}
          onPress={handleGoToPortfolio}
          disabled={!sessionRefreshed || isNavigating}
        >
          <Text style={sharedStyles.buttonText}>
            {isNavigating ? "Navigating..." : "Go to Portfolio"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: `${COLORS.success}33`,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  messageContainer: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  title: {
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  tipsContainer: {
    backgroundColor: `${COLORS.white}0D`,
    borderRadius: 12,
    padding: SPACING.lg,
    width: "100%",
    marginBottom: SPACING.lg,
  },
  tipsTitle: {
    marginBottom: SPACING.xs,
  },
  tipsList: {
    gap: SPACING.xs,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.xs,
  },
  tipIcon: {
    marginTop: 2,
  },
  tipText: {
    flex: 1,
  },
  redirectText: {
    marginBottom: SPACING.lg,
  },
  button: {
    width: "100%",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
}); 