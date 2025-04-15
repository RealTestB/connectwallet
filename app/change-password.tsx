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
import { encryptPassword, verifyPassword } from "../utils/crypto";
import WalletHeader from "../components/ui/WalletHeader";
import { supabase } from '../lib/supabase';
import config from '../api/config';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    try {
      setIsLoading(true);

      // Validate inputs
      if (!currentPassword || !newPassword || !confirmPassword) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      if (newPassword !== confirmPassword) {
        Alert.alert('Error', 'New passwords do not match');
        return;
      }

      if (newPassword.length < 8) {
        Alert.alert('Error', 'Password must be at least 8 characters long');
        return;
      }

      // Get stored password and user ID
      const storedPassword = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PASSWORD);
      const userId = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
      
      if (!storedPassword || !userId) {
        Alert.alert('Error', 'No password or user ID found');
        return;
      }

      // Verify current password
      const isValid = await verifyPassword(currentPassword, storedPassword);
      if (!isValid) {
        Alert.alert('Error', 'Current password is incorrect');
        return;
      }

      // Encrypt new password
      const encryptedNewPassword = await encryptPassword(newPassword);

      // Update password in database
      const { error: dbError } = await supabase
        .from('auth_users')
        .update({ password_hash: encryptedNewPassword })
        .eq('id', userId);

      if (dbError) {
        console.error('[ChangePassword] Database error:', dbError);
        Alert.alert('Error', 'Failed to update password in database');
        return;
      }

      // Update password in SecureStore
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_PASSWORD, encryptedNewPassword);
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_PASSWORD_RAW, newPassword);

      Alert.alert(
        'Password Updated',
        'Your password has been changed successfully',
        [
          {
            text: 'Done',
            onPress: () => router.back(),
            style: 'default',
          }
        ],
        {
          cancelable: false,
        }
      );
    } catch (error) {
      console.error('[ChangePassword] Error:', error);
      Alert.alert(
        'Update Failed',
        'Unable to change password. Please try again.',
        [
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={sharedStyles.container}>
      <Image
        source={require("../assets/background.png")}
        style={sharedStyles.backgroundImage}
      />

      <WalletHeader 
        onAccountChange={() => {}} 
        pageName="Change Password" 
      />

      <View style={[styles.content, { paddingTop: insets.top }]}>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Ionicons
                  name={showCurrentPassword ? "eye-off" : "eye"}
                  size={24}
                  color={COLORS.white}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? "eye-off" : "eye"}
                  size={24}
                  color={COLORS.white}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={24}
                  color={COLORS.white}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (!currentPassword || !newPassword || !confirmPassword) && styles.buttonDisabled
          ]}
          onPress={handleChangePassword}
          disabled={!currentPassword || !newPassword || !confirmPassword || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
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
  card: {
    backgroundColor: 'rgba(20, 24, 40, 0.15)',
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.7,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    padding: SPACING.md,
  },
  eyeButton: {
    padding: SPACING.md,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
}); 