import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sharedStyles, COLORS, SPACING, FONTS } from '../styles/shared';
import { createAnonymousUser, createAnonymousUserForImport } from '../api/supabaseApi';
import { hashPassword } from '../api/securityApi';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';

export default function CreatePasswordImport() {
  const { mode, type } = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only clean up if we haven't completed the flow
      SecureStore.getItemAsync(STORAGE_KEYS.SETUP_STATE).then(state => {
        if (state !== STORAGE_KEYS.SETUP_STEPS.COMPLETE) {
          console.log('[CreatePasswordImport] Cleaning up incomplete flow');
          SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_PASSWORD);
          SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ID);
          SecureStore.deleteItemAsync(STORAGE_KEYS.SETUP_STATE);
        }
      });
    };
  }, []);

  useEffect(() => {
    console.log('[CreatePasswordImport] Flow:', { mode, type });
  }, [mode, type]);

  const calculatePasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (pass.match(/[A-Z]/)) strength += 25;
    if (pass.match(/[0-9]/)) strength += 25;
    if (pass.match(/[^A-Za-z0-9]/)) strength += 25;
    setPasswordStrength(strength);
  };

  const validatePassword = () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (!password.match(/[A-Z]/)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!password.match(/[0-9]/)) {
      setError('Password must contain at least one number');
      return false;
    }
    if (!password.match(/[^A-Za-z0-9]/)) {
      setError('Password must contain at least one special character');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleCreatePassword = async () => {
    try {
      setError(null);
      if (!validatePassword()) return;

      setIsProcessing(true);

      // Hash the password
      const hashedPasswordStr = await hashPassword(password);
      const hashedPasswordObj = JSON.parse(hashedPasswordStr);

      // Create anonymous user in Supabase (using import-specific function)
      const userId = await createAnonymousUserForImport(hashedPasswordObj);

      // Store password hash and user id
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_PASSWORD, hashedPasswordStr);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_ID, userId);
      await SecureStore.setItemAsync(STORAGE_KEYS.SETUP_STATE, STORAGE_KEYS.SETUP_STEPS.PASSWORD_CREATED);

      // Navigate based on import type
      if (type === 'seed') {
        router.push('/import-seed-phrase');
      } else if (type === 'key') {
        router.push('/import-private-key');
      }
    } catch (err: any) {
      console.error('[CreatePasswordImport] Error:', err);
      setError(err.message || 'Failed to create password');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={sharedStyles.container}>
      <ImageBackground
        source={require('../assets/images/background.png')}
        style={sharedStyles.backgroundImage}
      />
      <View style={sharedStyles.contentContainer}>
        <Text style={sharedStyles.title}>Create Password</Text>
        <Text style={sharedStyles.subtitle}>
          Set a strong password to secure your wallet
        </Text>

        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={24} color={COLORS.primary} style={sharedStyles.iconSpacing} />
          <Text style={styles.warningText}>
            Use a strong password that you don't use anywhere else.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              calculatePasswordStrength(text);
            }}
            placeholder="Enter password"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={24}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.strengthText}>
          Password Strength: {passwordStrength >= 75 ? 'Very Strong' : passwordStrength >= 50 ? 'Strong' : passwordStrength >= 25 ? 'Medium' : 'Weak'}
        </Text>
        <View style={styles.strengthBarContainer}>
          <View style={[styles.strengthBar, { width: `${passwordStrength}%` }]} />
        </View>

        <View style={[styles.inputContainer, { marginTop: SPACING.lg }]}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
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
          <Text style={[styles.requirementText, password.length >= 8 && styles.requirementMet]}>
            • At least 8 characters
          </Text>
          <Text style={[styles.requirementText, password.match(/[A-Z]/) && styles.requirementMet]}>
            • One uppercase letter
          </Text>
          <Text style={[styles.requirementText, password.match(/[0-9]/) && styles.requirementMet]}>
            • One number
          </Text>
          <Text style={[styles.requirementText, password.match(/[^A-Za-z0-9]/) && styles.requirementMet]}>
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
            styles.continueButton,
            (isProcessing || !password || !confirmPassword) && styles.continueButtonDisabled,
          ]}
          onPress={handleCreatePassword}
          disabled={isProcessing || !password || !confirmPassword}
        >
          {isProcessing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  warningContainer: {
    backgroundColor: `${COLORS.primary}20`,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    ...FONTS.body,
    color: COLORS.primary,
    flex: 1,
    marginLeft: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.white}10`,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  input: {
    flex: 1,
    padding: SPACING.md,
    ...FONTS.body,
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
    height: '100%',
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
    marginBottom: SPACING.xs
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
  continueButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    ...FONTS.body,
    color: COLORS.white,
    fontWeight: '600',
  },
}); 