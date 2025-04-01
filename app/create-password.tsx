import React, { useState } from "react";
import {View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { getRandomBytes } from 'expo-crypto';
import { hashPassword } from "../api/securityApi";
import * as Crypto from 'expo-crypto';
import { createAnonymousUser } from "../api/supabaseApi";
import { sharedStyles, COLORS, SPACING } from '../styles/shared';
import OnboardingLayout from '../components/ui/OnboardingLayout';
import { STORAGE_KEYS } from '../constants/storageKeys';

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

export default function Page() {
  const router = useRouter();
  const { mode, type } = useLocalSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSecure, setIsSecure] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0.25); // 25% progress in onboarding

  // Add debug logging for mode and type
  React.useEffect(() => {
    console.log('[CreatePassword] Flow:', { mode, type });
  }, [mode, type]);

  const validatePassword = (pass: string) => {
    if (!pass) return "Password is required";
    if (pass.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pass)) return "Password must include an uppercase letter";
    if (!/[0-9]/.test(pass)) return "Password must include a number";
    if (!/[^A-Za-z0-9]/.test(pass))
      return "Password must include a special character";
    return null;
  };

  const calculateStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^A-Za-z0-9]/.test(pass)) strength++;
    return strength;
  };

  const passwordStrength = calculateStrength(password);

  const getStrengthText = () => {
    if (password.length === 0) return "";
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength === 2) return "Medium";
    if (passwordStrength === 3) return "Strong";
    return "Very Strong";
  };

  const getStrengthColor = () => {
    if (password.length === 0) return "#ffffff1a";
    if (passwordStrength <= 1) return "#ef4444";
    if (passwordStrength === 2) return "#eab308";
    if (passwordStrength === 3) return "#22c55e";
    return "#4ade80";
  };

  const handleCreatePassword = async () => {
    try {
      setIsCreating(true);
      setError("");

      // Validate passwords
      if (!password || !confirmPassword) {
        setError('Please fill in all fields');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      const passwordValidation = validatePassword(password);
      if (passwordValidation) {
        setError(passwordValidation);
        return;
      }

      // Hash and store password
      const hashedPasswordStr = await hashPassword(password);
      const hashedPasswordObj = JSON.parse(hashedPasswordStr);
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_PASSWORD, hashedPasswordStr);

      // Create anonymous user in Supabase
      try {
        const tempUserId = await createAnonymousUser(hashedPasswordObj);
        await SecureStore.setItemAsync(STORAGE_KEYS.TEMP_USER_ID, tempUserId);

        // Update setup state
        await SecureStore.setItemAsync(STORAGE_KEYS.SETUP_STATE, STORAGE_KEYS.SETUP_STEPS.PASSWORD_CREATED);

        // Navigate based on flow type
        if (mode === 'new') {
          // New wallet creation flow
          router.push('/seed-phrase');
        } else if (mode === 'import') {
          if (type === 'seed') {
            // Import with seed phrase flow
            router.push({
              pathname: '/import-seed-phrase',
              params: { password: hashedPasswordStr }
            });
          } else if (type === 'key') {
            // Import with private key flow
            router.push({
              pathname: '/import-private-key',
              params: { password: hashedPasswordStr }
            });
          }
        }
      } catch (error) {
        console.error('[CreatePassword] Error creating anonymous user:', error);
        setError('Failed to create user account. Please try again.');
      }
    } catch (error) {
      console.error('[CreatePassword] Error:', error);
      setError('Failed to create password');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <OnboardingLayout
      progress={0.25}
      title="Create Password"
      subtitle="Set a strong password to secure your wallet"
      icon="lock-outline"
    >
      <View style={styles.warningBox}>
        <Ionicons name="shield-checkmark" size={20} color="#facc15" />
        <Text style={styles.warningText}>
          Use a strong password that you don't use anywhere else
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.passwordInputContainer}>
          <TextInput
            style={styles.input}
            secureTextEntry={isSecure}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor="#93c5fd"
          />
          <TouchableOpacity
            onPress={() => setIsSecure(!isSecure)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={isSecure ? "eye-off" : "eye"}
              size={20}
              color="#93c5fd"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.strengthContainer}>
          <View style={styles.strengthBars}>
            {[...Array(4)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.strengthBar,
                  {
                    backgroundColor: i < passwordStrength ? getStrengthColor() : "#ffffff1a",
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.strengthText}>{getStrengthText()}</Text>
        </View>

        <TextInput
          style={styles.input}
          secureTextEntry={isSecure}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          placeholderTextColor="#93c5fd"
        />

        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          <View style={styles.requirementsList}>
            <View style={styles.requirementItem}>
              <Ionicons
                name={password.length >= 8 ? "checkmark-circle" : "ellipse"}
                size={12}
                color={password.length >= 8 ? "#4ade80" : "#93c5fd"}
              />
              <Text
                style={[
                  styles.requirementText,
                  password.length >= 8 && styles.requirementMet,
                ]}
              >
                At least 8 characters
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons
                name={/[A-Z]/.test(password) ? "checkmark-circle" : "ellipse"}
                size={12}
                color={/[A-Z]/.test(password) ? "#4ade80" : "#93c5fd"}
              />
              <Text
                style={[
                  styles.requirementText,
                  /[A-Z]/.test(password) && styles.requirementMet,
                ]}
              >
                One uppercase letter
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons
                name={/[0-9]/.test(password) ? "checkmark-circle" : "ellipse"}
                size={12}
                color={/[0-9]/.test(password) ? "#4ade80" : "#93c5fd"}
              />
              <Text
                style={[
                  styles.requirementText,
                  /[0-9]/.test(password) && styles.requirementMet,
                ]}
              >
                One number
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons
                name={/[^A-Za-z0-9]/.test(password) ? "checkmark-circle" : "ellipse"}
                size={12}
                color={/[^A-Za-z0-9]/.test(password) ? "#4ade80" : "#93c5fd"}
              />
              <Text
                style={[
                  styles.requirementText,
                  /[^A-Za-z0-9]/.test(password) && styles.requirementMet,
                ]}
              >
                One special character
              </Text>
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.button, isCreating && styles.buttonDisabled]}
          onPress={handleCreatePassword}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#facc1510",
    padding: SPACING.sm,
    borderRadius: 12,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  warningText: {
    color: "#facc15",
    fontSize: 14,
    flex: 1,
  },
  inputContainer: {
    gap: SPACING.md,
  },
  passwordInputContainer: {
    position: "relative",
    width: "100%",
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: SPACING.md,
    color: COLORS.white,
    fontSize: 16,
    width: "100%",
  },
  eyeIcon: {
    position: "absolute",
    right: SPACING.md,
    top: "50%",
    transform: [{ translateY: -10 }],
    padding: SPACING.xs,
  },
  strengthContainer: {
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  strengthBars: {
    flexDirection: "row",
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  requirementsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  requirementsTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: SPACING.xs,
  },
  requirementsList: {
    gap: SPACING.xs,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  requirementText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  requirementMet: {
    color: COLORS.success,
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: "center",
    marginTop: SPACING.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "500",
  },
}); 
