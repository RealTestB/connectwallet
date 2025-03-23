import React, { useState, useCallback } from 'react';
import { useRouter, useNavigation } from "expo-router";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, ActivityIndicator } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from 'expo-secure-store';

const MAX_NAVIGATION_ATTEMPTS = 3;
const FETCH_TIMEOUT = 8000; // 8 seconds timeout

export default function Page() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [navigationAttempts, setNavigationAttempts] = useState(0);
  const { checkAuth, updateLastActive } = useAuth();

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

  const fetchWithTimeout = async (key: string) => {
    const fetchPromise = SecureStore.getItemAsync(key);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Fetch timeout for key: ${key}`));
      }, FETCH_TIMEOUT);
    });

    return Promise.race([fetchPromise, timeoutPromise]);
  };

  const handleSignIn = async () => {
    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    setIsLoading(true);
    try {
      console.log('[SignIn] Starting sign in process');
      
      // Verify password with timeout
      const storedPassword = await fetchWithTimeout('walletPassword');
      
      if (!storedPassword) {
        throw new Error('No password found in secure storage');
      }
      
      if (storedPassword !== password) {
        throw new Error('Invalid password');
      }
      
      console.log('[SignIn] Password verified');
      
      // Update last active timestamp and check auth status
      await updateLastActive();
      await checkAuth();
      
      console.log('[SignIn] Auth check completed, navigating to portfolio');
      // Reset navigation attempts before trying to navigate
      setNavigationAttempts(0);
      safeNavigate("/portfolio");
    } catch (error) {
      console.error("[SignIn] Sign in failed:", error);
      let errorMessage = "Failed to sign in. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = "Connection timed out. Please check your internet connection and try again.";
        } else if (error.message.includes('Invalid password')) {
          errorMessage = "Incorrect password. Please try again.";
        }
      }
      
      Alert.alert("Error", errorMessage);
      setIsLoading(false);
    }
  };

  // Rest of the component remains the same
  return (
    <LinearGradient
      colors={["#1A2F6C", "#0A1B3F"]}
      style={styles.container}
    >
      <View 
        style={[
          styles.content,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Enter your password to continue</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#93c5fd"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleSignIn}
                returnKeyType="go"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#93c5fd"
                />
              </TouchableOpacity>
            </View>
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
              <ActivityIndicator color="white" />
              <Text style={styles.buttonText}>Signing In...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: "center",
    marginVertical: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#93c5fd",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: "#93c5fd",
  },
  passwordContainer: {
    position: "relative",
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    color: "white",
    fontSize: 16,
    paddingRight: 40,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -10 }],
  },
  signInButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  signInButtonDisabled: {
    backgroundColor: "rgba(59, 130, 246, 0.5)",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
});