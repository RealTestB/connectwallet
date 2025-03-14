import React, { useEffect, useState } from "react";
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import WalletHeader from "../components/ui/WalletHeader";
import * as Clipboard from "expo-clipboard";
import * as ScreenCapture from "expo-screen-capture";
import { encryptPrivateKey, storeEncryptedData } from "../api/securityApi";
import { importClassicWalletFromPrivateKey } from "../api/walletApi";

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

export default function Page() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
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
    console.log('[ImportPrivateKey] Handling private key change, input length:', value?.length);
    
    try {
      // Ensure value is a string and not null/undefined
      if (!value || typeof value !== 'string') {
        setPrivateKey("");
        setError(null);
        return;
      }

      let cleanValue = value.trim().replace(/\s+/g, "");
      console.log('[ImportPrivateKey] Cleaned value length:', cleanValue.length);
      
      // Check if cleanValue is a valid string and starts with 0x
      if (cleanValue && typeof cleanValue === 'string' && cleanValue.toLowerCase().startsWith("0x")) {
        console.log('[ImportPrivateKey] Found 0x prefix, removing...');
        cleanValue = cleanValue.slice(2);
        console.log('[ImportPrivateKey] Value after prefix removal length:', cleanValue.length);
      }

      if (!cleanValue) {
        console.log('[ImportPrivateKey] Empty value after cleaning');
        setPrivateKey("");
        setError(null);
        return;
      }

      if (/^[0-9a-fA-F]*$/.test(cleanValue)) {
        const finalValue = "0x" + cleanValue;
        console.log('[ImportPrivateKey] Valid hex format, final length:', finalValue.length);
        setPrivateKey(finalValue);
        setError(null);
      } else {
        console.log('[ImportPrivateKey] Invalid hex format detected');
        setError("Invalid private key format - must be hexadecimal");
      }
    } catch (error) {
      console.error('[ImportPrivateKey] Error in handlePrivateKeyChange:', error);
      setError("Invalid private key format");
    }
  };

  const handlePaste = async (): Promise<void> => {
    try {
      console.log('[ImportPrivateKey] Attempting to paste from clipboard');
      const pastedText = await Clipboard.getStringAsync();
      console.log('[ImportPrivateKey] Pasted text length:', pastedText.length);
      handlePrivateKeyChange(pastedText);
    } catch (error) {
      console.error('[ImportPrivateKey] Error in handlePaste:', error);
      setError("Failed to paste from clipboard");
    }
  };

  const handleImport = async () => {
    console.log('[ImportPrivateKey] Starting import process');
    
    if (!privateKey || privateKey.length !== 66) {
      console.log('[ImportPrivateKey] Invalid private key length:', privateKey?.length);
      setError("Please enter a valid private key.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const password = typeof params.password === 'string' ? params.password : '';
      
      console.log('[ImportPrivateKey] Encrypting private key');
      const encryptedKeyData = await encryptPrivateKey(privateKey, password);
      console.log('[ImportPrivateKey] Successfully encrypted private key');

      console.log('[ImportPrivateKey] Storing encrypted data');
      await storeEncryptedData("walletPrivateKey", encryptedKeyData);
      console.log('[ImportPrivateKey] Successfully stored encrypted data');

      console.log('[ImportPrivateKey] Importing classic wallet');
      const { address } = await importClassicWalletFromPrivateKey(privateKey);
      console.log('[ImportPrivateKey] Successfully imported wallet with address:', address);

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
    <LinearGradient
      colors={["#1A2F6C", "#0A1B3F"]}
      style={styles.container}
    >
      <WalletHeader pageName="Import Private Key" onAccountChange={() => {}} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.stepsContainer}>
          <View style={styles.steps}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.stepDot,
                  step === 4 ? styles.activeStep : styles.inactiveStep,
                ]}
              />
            ))}
          </View>
        </View>

        <Text style={styles.title}>Import Private Key</Text>

        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color="#f87171" />
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
            placeholderTextColor="#93c5fd"
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
              size={20}
              color="#93c5fd"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.pasteButton}
          onPress={handlePaste}
        >
          <Ionicons name="clipboard" size={20} color="white" />
          <Text style={styles.pasteButtonText}>Paste Private Key</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Important:</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark" size={12} color="#93c5fd" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Private key should be 66 characters long (including 0x)
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark" size={12} color="#93c5fd" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Contains only numbers and letters A-F
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark" size={12} color="#93c5fd" style={styles.infoIcon} />
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
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.importButtonText}>Import Wallet</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  stepsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 32,
  },
  steps: {
    flexDirection: "row",
    gap: 4,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeStep: {
    backgroundColor: "#3b82f6",
  },
  inactiveStep: {
    backgroundColor: "#3b82f680",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 24,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#ef44441a",
    borderWidth: 1,
    borderColor: "#ef444433",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    color: "#f87171",
    fontSize: 14,
  },
  inputContainer: {
    position: "relative",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#ffffff1a",
    borderWidth: 1,
    borderColor: "#ffffff1a",
    borderRadius: 12,
    padding: 12,
    color: "white",
    fontSize: 16,
    paddingRight: 44,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -10 }],
  },
  pasteButton: {
    backgroundColor: "#ffffff1a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  pasteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  infoBox: {
    backgroundColor: "#ffffff1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  infoIcon: {
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    color: "#93c5fd",
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: "#ef44441a",
    borderWidth: 1,
    borderColor: "#ef444433",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
  },
  importButton: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
}); 