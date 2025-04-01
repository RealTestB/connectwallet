import React, { useState, useCallback } from 'react';
import { useRouter, useNavigation } from "expo-router";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, ActivityIndicator, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from 'expo-secure-store';
import { verifyPassword } from "../api/securityApi";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { sharedStyles, COLORS, SPACING, FONTS } from "../styles/shared";

const MAX_NAVIGATION_ATTEMPTS = 3;
const FETCH_TIMEOUT = 8000; // 8 seconds timeout

// Add fetchWithTimeout function
const fetchWithTimeout = async (key: string): Promise<string | null> => {
  try {
    const timeoutPromise = new Promise<string | null>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout after ${FETCH_TIMEOUT}ms`));
      }, FETCH_TIMEOUT);
    });

    const fetchPromise = SecureStore.getItemAsync(key);

    const result = await Promise.race([fetchPromise, timeoutPromise]);
    return result;
  } catch (error) {
    console.error(`[SignIn] Error fetching ${key}:`, error);
    throw error;
  }
};

export default function Page() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [navigationAttempts, setNavigationAttempts] = useState(0);
  const { checkAuth, updateLastActive } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const safeNavigate = useCallback((path: string) => {
    if (navigationAttempts >= MAX_NAVIGATION_ATTEMPTS) {
      console.error('[SignIn] Max navigation attempts reached');
      Alert.alert(
        "Navigation Error",
        "Unable to navigate to the portfolio. Please try again later.",
        [{ text: "OK", onPress: () => setIsLoading(false) }]
      );
      return;
    }

    try {
      console.log('[SignIn] Navigating to:', path);
      router.replace(path);
    } catch (error) {
      console.error('[SignIn] Navigation failed:', error);
      Alert.alert("Error", "Navigation failed. Please try again.");
      setIsLoading(false);
    }
  }, [router, navigationAttempts]);

  const handleSignIn = async (): Promise<void> => {
    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    try {
      console.log('[SignIn] Starting sign in process');
      setIsLoading(true);
      setError(null);

      // Get stored password hash using correct storage key
      const storedPasswordHash = await fetchWithTimeout(STORAGE_KEYS.WALLET_PASSWORD);
      if (!storedPasswordHash) {
        throw new Error("No password found in secure storage");
      }

      // Verify password
      const isValid = await verifyPassword(password, storedPasswordHash);
      if (!isValid) {
        throw new Error("Invalid password");
      }
      console.log('[SignIn] Password verified');

      // Update auth state and wait for it to complete
      console.log('[SignIn] Updating authentication state...');
      await updateLastActive();
      await checkAuth();
      
      // Add a small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('[SignIn] Authentication state updated, navigating to portfolio');
      router.replace('/portfolio');
    } catch (error) {
      console.error('[SignIn] Error during sign in:', error);
      setError(error instanceof Error ? error.message : "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[sharedStyles.container]}>
      <Image 
        source={require('../assets/images/background.png')} 
        style={sharedStyles.backgroundImage}
      />
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={sharedStyles.title}>Welcome Back</Text>
          <Text style={sharedStyles.subtitle}>Enter your password to continue</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleSignIn}
              returnKeyType="go"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={24}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.signInButton,
            (!password.trim() || isLoading) && styles.signInButtonDisabled
          ]}
          onPress={handleSignIn}
          disabled={!password.trim() || isLoading}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={COLORS.white} />
              <Text style={styles.buttonText}>Signing In...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl * 2,
  },
  header: {
    alignItems: "center",
    marginBottom: SPACING.xl,
    marginTop: SPACING.xl * 3,
  },
  formContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...FONTS.body,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  input: {
    ...FONTS.body,
    padding: SPACING.md,
    paddingRight: SPACING.xl * 2,
  },
  eyeIcon: {
    position: "absolute",
    right: SPACING.md,
    top: "50%",
    transform: [{ translateY: -12 }],
  },
  signInButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.xs,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  signInButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  buttonText: {
    ...FONTS.body,
    fontWeight: '600',
  },
  errorText: {
    ...FONTS.caption,
    color: COLORS.error,
    textAlign: "center",
    marginTop: SPACING.md,
  },
});