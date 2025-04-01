import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as ScreenCapture from "expo-screen-capture";
import { importClassicWalletFromPrivateKey } from "../api/walletApi";
import { sharedStyles, COLORS, SPACING, FONTS } from '../styles/shared';

export default function ImportPrivateKey() {
  const router = useRouter();
  const [privateKey, setPrivateKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSecure, setIsSecure] = useState(true);

  useEffect(() => {
    void disableScreenCapture();
  }, []);

  const disableScreenCapture = async (): Promise<void> => {
    await ScreenCapture.preventScreenCaptureAsync();
  };

  const handlePrivateKeyChange = (value: string): void => {
    try {
      if (!value || typeof value !== 'string') {
        setPrivateKey("");
        setError(null);
        return;
      }

      let cleanValue = value.trim().replace(/\s+/g, "");
      
      if (cleanValue && typeof cleanValue === 'string' && cleanValue.toLowerCase().startsWith("0x")) {
        cleanValue = cleanValue.slice(2);
      }

      if (!cleanValue) {
        setPrivateKey("");
        setError(null);
        return;
      }

      if (/^[0-9a-fA-F]*$/.test(cleanValue)) {
        const finalValue = "0x" + cleanValue;
        setPrivateKey(finalValue);
        setError(null);
      } else {
        setError("Invalid private key format - must be hexadecimal");
      }
    } catch (error) {
      console.error('[ImportPrivateKey] Error in handlePrivateKeyChange:', error);
      setError("Invalid private key format");
    }
  };

  const handlePaste = async (): Promise<void> => {
    try {
      const pastedText = await Clipboard.getStringAsync();
      handlePrivateKeyChange(pastedText);
    } catch (error) {
      console.error('[ImportPrivateKey] Error in handlePaste:', error);
      setError("Failed to paste from clipboard");
    }
  };

  const handleImport = async () => {
    if (!privateKey || privateKey.length !== 66) {
      setError("Please enter a valid private key.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { address } = await importClassicWalletFromPrivateKey(privateKey);
      router.push({
        pathname: "/import-success",
        params: { type: "import", address }
      });
    } catch (err) {
      console.error('[ImportPrivateKey] Import failed:', err);
      setError("Failed to import wallet. Please check your private key.");
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
      <ScrollView style={sharedStyles.contentContainer}>
        <Text style={sharedStyles.title}>Import Private Key</Text>
        <Text style={sharedStyles.subtitle}>
          Enter your private key to import your wallet
        </Text>

        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={24} color={COLORS.error} style={sharedStyles.iconSpacing} />
          <Text style={styles.warningText}>
            Never share your private key with anyone. Make sure no one is watching your screen.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            secureTextEntry={isSecure}
            value={privateKey}
            onChangeText={handlePrivateKeyChange}
            placeholder="Enter your private key"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setIsSecure(!isSecure)}
          >
            <Ionicons
              name={isSecure ? "eye-off" : "eye"}
              size={24}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.pasteButton}
          onPress={handlePaste}
        >
          <Ionicons name="clipboard" size={24} color={COLORS.white} />
          <Text style={styles.pasteButtonText}>Paste Private Key</Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Important:</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark" size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Private key should be 66 characters long (including 0x)
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark" size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Contains only numbers and letters A-F
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark" size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>
                You can paste your private key directly
              </Text>
            </View>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.importButton,
            (isProcessing || !privateKey || privateKey.length !== 66) && styles.importButtonDisabled,
          ]}
          onPress={handleImport}
          disabled={isProcessing || !privateKey || privateKey.length !== 66}
        >
          {isProcessing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.importButtonText}>Import Wallet</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  warningContainer: {
    backgroundColor: `${COLORS.error}20`,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    ...FONTS.body,
    color: COLORS.error,
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
    color: COLORS.white,
  },
  eyeIcon: {
    padding: SPACING.md,
  },
  pasteButton: {
    backgroundColor: `${COLORS.white}10`,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.xl,
  },
  pasteButtonText: {
    ...FONTS.body,
    color: COLORS.white,
    marginLeft: SPACING.sm,
  },
  infoContainer: {
    backgroundColor: `${COLORS.white}10`,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  infoTitle: {
    ...FONTS.body,
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  infoList: {
    gap: SPACING.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    flex: 1,
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
  importButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    ...FONTS.body,
    color: COLORS.white,
    fontWeight: '600',
  },
}); 