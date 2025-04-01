import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { COLORS, SPACING, FONTS, sharedStyles } from "../styles/shared";
import { hashPassword, verifyPassword } from "../api/securityApi";
import WalletHeader from "../components/ui/WalletHeader";
import config from "../api/config";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculatePasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (pass.match(/[A-Z]/)) strength += 25;
    if (pass.match(/[0-9]/)) strength += 25;
    if (pass.match(/[^A-Za-z0-9]/)) strength += 25;
    setPasswordStrength(strength);
  };

  const validateNewPassword = () => {
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return false;
    }
    if (!newPassword.match(/[A-Z]/)) {
      setError("New password must contain at least one uppercase letter");
      return false;
    }
    if (!newPassword.match(/[0-9]/)) {
      setError("New password must contain at least one number");
      return false;
    }
    if (!newPassword.match(/[^A-Za-z0-9]/)) {
      setError("New password must contain at least one special character");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return false;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from current password");
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    try {
      setError(null);
      if (!currentPassword || !newPassword || !confirmPassword) {
        setError("Please fill in all fields");
        return;
      }

      setIsProcessing(true);

      // Verify current password
      const storedPasswordHash = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PASSWORD);
      if (!storedPasswordHash) {
        throw new Error("No password found in secure storage");
      }

      const isValid = await verifyPassword(currentPassword, storedPasswordHash);
      if (!isValid) {
        setError("Current password is incorrect");
        return;
      }

      // Validate new password
      if (!validateNewPassword()) {
        return;
      }

      // Get user ID from secure storage
      const tempUserId = await SecureStore.getItemAsync(STORAGE_KEYS.TEMP_USER_ID);
      if (!tempUserId) {
        throw new Error("User ID not found in secure storage");
      }

      // Hash new password
      const newHashedPasswordStr = await hashPassword(newPassword);
      const newHashedPasswordObj = JSON.parse(newHashedPasswordStr);

      // Update password in Supabase using XMLHttpRequest
      const updatePassword = () => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.timeout = 30000; // 30 second timeout

          xhr.addEventListener('readystatechange', () => {
            if (xhr.readyState !== 4) return;

            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(true);
            } else {
              let errorMessage = `Failed to update password (${xhr.status})`;
              try {
                if (xhr.responseText) {
                  const errorData = JSON.parse(xhr.responseText);
                  errorMessage = errorData.message || errorData.error || errorMessage;
                }
              } catch (e) {
                // Ignore JSON parse error
              }
              reject(new Error(errorMessage));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Network request failed'));
          });

          xhr.addEventListener('timeout', () => {
            reject(new Error('Request timed out'));
          });

          const url = `${config.supabase.url}/rest/v1/auth_users?temp_user_id=eq.${tempUserId}`;
          xhr.open('PATCH', url);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('apikey', config.supabase.serviceRoleKey);
          xhr.setRequestHeader('Prefer', 'return=minimal');

          const body = JSON.stringify({
            password_hash: newHashedPasswordObj
          });

          xhr.send(body);
        });
      };

      // Update password in Supabase
      await updatePassword();

      // Update password in SecureStore
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_PASSWORD, newHashedPasswordStr);

      Alert.alert(
        "Success",
        "Your password has been changed successfully",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err) {
      console.error("[ChangePassword] Error:", err);
      setError("Failed to change password. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={sharedStyles.container}>
      <Image
        source={require("../assets/background.png")}
        style={sharedStyles.backgroundImage}
      />

      <WalletHeader onAccountChange={() => {}} pageName="Change Password" />

      <View style={[styles.content, { paddingTop: insets.top }]}>
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={24} color={COLORS.primary} />
          <Text style={styles.warningText}>
            Make sure to use a strong password that you don't use anywhere else
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showCurrentPassword}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            placeholderTextColor={COLORS.textSecondary}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowCurrentPassword(!showCurrentPassword)}
          >
            <Ionicons
              name={showCurrentPassword ? "eye-off" : "eye"}
              size={24}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showNewPassword}
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              calculatePasswordStrength(text);
            }}
            placeholder="New password"
            placeholderTextColor={COLORS.textSecondary}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowNewPassword(!showNewPassword)}
          >
            <Ionicons
              name={showNewPassword ? "eye-off" : "eye"}
              size={24}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.strengthText}>
          Password Strength:{" "}
          {passwordStrength >= 75
            ? "Very Strong"
            : passwordStrength >= 50
            ? "Strong"
            : passwordStrength >= 25
            ? "Medium"
            : "Weak"}
        </Text>
        <View style={styles.strengthBarContainer}>
          <View style={[styles.strengthBar, { width: `${passwordStrength}%` }]} />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={COLORS.textSecondary}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off" : "eye"}
              size={24}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          <Text
            style={[
              styles.requirementText,
              newPassword.length >= 8 && styles.requirementMet,
            ]}
          >
            • At least 8 characters
          </Text>
          <Text
            style={[
              styles.requirementText,
              newPassword.match(/[A-Z]/) && styles.requirementMet,
            ]}
          >
            • One uppercase letter
          </Text>
          <Text
            style={[
              styles.requirementText,
              newPassword.match(/[0-9]/) && styles.requirementMet,
            ]}
          >
            • One number
          </Text>
          <Text
            style={[
              styles.requirementText,
              newPassword.match(/[^A-Za-z0-9]/) && styles.requirementMet,
            ]}
          >
            • One special character
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.changeButton,
            (isProcessing ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword) &&
              styles.changeButtonDisabled,
          ]}
          onPress={handleChangePassword}
          disabled={
            isProcessing || !currentPassword || !newPassword || !confirmPassword
          }
        >
          {isProcessing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.changeButtonText}>Change Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  warningContainer: {
    backgroundColor: `${COLORS.primary}20`,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    flexDirection: "row",
    alignItems: "center",
  },
  warningText: {
    ...FONTS.body,
    color: COLORS.primary,
    flex: 1,
    marginLeft: SPACING.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${COLORS.white}10`,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  input: {
    flex: 1,
    padding: SPACING.md,
    ...FONTS.body,
    color: COLORS.white,
  },
  eyeIcon: {
    padding: SPACING.md,
  },
  strengthText: {
    ...FONTS.caption,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  strengthBarContainer: {
    height: 4,
    backgroundColor: `${COLORS.primary}20`,
    borderRadius: 2,
    marginBottom: SPACING.lg,
  },
  strengthBar: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  requirementsContainer: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  requirementsTitle: {
    ...FONTS.body,
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  requirementText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  requirementMet: {
    color: COLORS.success,
  },
  errorContainer: {
    backgroundColor: `${COLORS.error}20`,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorText: {
    ...FONTS.body,
    color: COLORS.error,
  },
  changeButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: "center",
  },
  changeButtonDisabled: {
    opacity: 0.5,
  },
  changeButtonText: {
    ...FONTS.body,
    color: COLORS.white,
    fontWeight: "600",
  },
}); 