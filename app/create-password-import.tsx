import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sharedStyles, COLORS, SPACING, FONTS } from '../styles/shared';
import { hashPassword } from '../api/securityApi';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { supabaseAdmin } from '../lib/supabase';
import config from '../api/config';

export default function CreatePasswordImportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only clean up if we haven't completed the flow
      SecureStore.getItemAsync(STORAGE_KEYS.IS_AUTHENTICATED).then(state => {
        if (state !== 'true') {
          console.log('[CreatePasswordImport] Cleaning up incomplete flow');
          SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_PASSWORD);
          SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ID);
        }
      });
    };
  }, []);

  useEffect(() => {
    console.log('[CreatePasswordImport] Flow:', { mode: params.mode });
  }, [params.mode]);

  const calculatePasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (pass.match(/[A-Z]/)) strength += 25;
    if (pass.match(/[0-9]/)) strength += 25;
    if (pass.match(/[^A-Za-z0-9]/)) strength += 25;
    setPasswordStrength(strength);
  };

  const validatePassword = (pass: string) => {
    const hasMinLength = pass.length >= 8;
    const hasUpperCase = /[A-Z]/.test(pass);
    const hasLowerCase = /[a-z]/.test(pass);
    const hasNumbers = /\d/.test(pass);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pass);

    let strength = 0;
    if (hasMinLength) strength++;
    if (hasUpperCase) strength++;
    if (hasLowerCase) strength++;
    if (hasNumbers) strength++;
    if (hasSpecialChar) strength++;

    return strength >= 3;
  };

  const handleCreatePassword = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔐 [CreatePassword] Starting password creation process...');

      // Validate passwords
      if (!validatePassword(password)) {
        throw new Error('Password does not meet requirements');
      }
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      console.log('✅ [CreatePassword] Password validation passed');

      // Hash and store password
      console.log('🔄 [CreatePassword] Hashing password...');
      const hashedPassword = await hashPassword(password);
      const hashedPasswordObj = JSON.parse(hashedPassword);
      console.log('📝 [CreatePassword] Password hash structure:', hashedPasswordObj);

      console.log('💾 [CreatePassword] Storing password in SecureStore...');
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_PASSWORD, hashedPassword);
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_PASSWORD_RAW, password);

      // Get user ID from SecureStore
      console.log('🔍 [CreatePassword] Getting user ID...');
      const userId = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
      console.log('👤 [CreatePassword] User ID:', userId);
      
      if (!userId) {
        throw new Error('No user ID found');
      }

      // Update password hash in database
      console.log('📡 [CreatePassword] Updating password hash in database...');
      const url = `${config.supabase.url}/rest/v1/auth_users?id=eq.${userId}`;
      
      const response = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.timeout = 30000; // 30 second timeout

        xhr.addEventListener('readystatechange', () => {
          console.log('📡 [CreatePassword] XHR state:', xhr.readyState, 'status:', xhr.status);
          
          if (xhr.readyState !== 4) return;

          // Handle network errors
          if (xhr.status === 0) {
            console.error('❌ [CreatePassword] Network error occurred');
            reject(new Error('Network error occurred'));
            return;
          }

          try {
            const response = xhr.responseText ? JSON.parse(xhr.responseText) : null;
            console.log('📦 [CreatePassword] Database response:', response);

            // Handle successful response
            if (xhr.status >= 200 && xhr.status < 300 && response) {
              console.log('✅ [CreatePassword] Password hash updated in database');
              resolve(response);
            } else {
              console.error('❌ [CreatePassword] Database error:', response?.error || xhr.status);
              reject(new Error(response?.error || `HTTP error! status: ${xhr.status}`));
            }
          } catch (error) {
            console.error('❌ [CreatePassword] Failed to parse response:', error);
            reject(new Error('Failed to parse response'));
          }
        });

        xhr.addEventListener('error', () => {
          console.error('❌ [CreatePassword] XHR request failed');
          reject(new Error('Request failed'));
        });

        xhr.addEventListener('timeout', () => {
          console.error('❌ [CreatePassword] XHR request timed out');
          reject(new Error('Request timed out'));
        });

        xhr.open('PATCH', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('apikey', config.supabase.serviceRoleKey);
        xhr.setRequestHeader('Prefer', 'return=representation');
        
        const requestBody = JSON.stringify({
          password_hash: hashedPasswordObj
        });
        console.log('📤 [CreatePassword] Sending request:', { url, body: requestBody });
        
        xhr.send(requestBody);
      });

      console.log('✅ [CreatePassword] Password creation complete, navigating to success page...');

      // Navigate to success page
      router.push({
        pathname: '/import-success',
        params: { type: 'import', mode: params.mode }
      });
    } catch (error) {
      console.error('Error creating password:', error);
      setError(error instanceof Error ? error.message : 'Failed to create password');
    } finally {
      setIsLoading(false);
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
            (isLoading || !password || !confirmPassword) && styles.continueButtonDisabled,
          ]}
          onPress={handleCreatePassword}
          disabled={isLoading || !password || !confirmPassword}
        >
          {isLoading ? (
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