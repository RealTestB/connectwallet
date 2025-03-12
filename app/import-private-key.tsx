import { useNavigation, useRoute } from "@react-navigation/native";
import { encryptPrivateKey, storeEncryptedData } from "../api/securityApi";
import * as Clipboard from "expo-clipboard";
import * as ScreenCapture from "expo-screen-capture";
import { importClassicWalletFromPrivateKey } from "../api/walletApi";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";

type ImportPrivateKeyScreenNavigationProp = StackNavigationProp<RootStackParamList, 'import-private-key'>;
type ImportPrivateKeyScreenRouteProp = RouteProp<RootStackParamList, 'import-private-key'>;

export default function ImportPrivateKeyScreen(): JSX.Element {
  const navigation = useNavigation<ImportPrivateKeyScreenNavigationProp>();
  const route = useRoute<ImportPrivateKeyScreenRouteProp>();
  const { password } = route.params;

  const [privateKey, setPrivateKey] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSecure, setIsSecure] = useState<boolean>(true);

  useEffect(() => {
    void disableScreenCapture();
  }, []);

  const disableScreenCapture = async (): Promise<void> => {
    await ScreenCapture.preventScreenCaptureAsync();
  };

  const handlePrivateKeyChange = (value: string): void => {
    let cleanValue = value.replace(/\s+/g, "");
    if (cleanValue.toLowerCase().startsWith("0x")) {
      cleanValue = cleanValue.slice(2);
    }

    if (/^[0-9a-fA-F]*$/.test(cleanValue)) {
      setPrivateKey(cleanValue.length ? "0x" + cleanValue : "");
      setError(null);
    }
  };

  const handlePaste = async (): Promise<void> => {
    const pastedText = await Clipboard.getStringAsync();
    handlePrivateKeyChange(pastedText);
  };

  const handleImport = async (): Promise<void> => {
    if (!privateKey || privateKey.length !== 66) {
      setError("Please enter a valid private key.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Encrypt the private key before storing
      const encryptedKeyData = await encryptPrivateKey(privateKey, password);
      await storeEncryptedData("walletPrivateKey", encryptedKeyData);

      // Import wallet with the private key
      const { address } = await importClassicWalletFromPrivateKey(privateKey);

      // Navigate to success screen with correct parameters
      navigation.replace("import-success", {
        walletAddress: address,
        walletType: 'classic'
      });
    } catch (err) {
      console.error("Import failed:", err);
      setError("Failed to import wallet. Please check your private key.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Import Private Key</Text>
      </View>

      {/* Security Warning */}
      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          ⚠ Never share your private key. Make sure no one is watching your screen.
        </Text>
      </View>

      {/* Private Key Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          secureTextEntry={isSecure}
          placeholder="Enter your private key"
          placeholderTextColor="#6A9EFF"
          value={privateKey}
          onChangeText={handlePrivateKeyChange}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />
        <TouchableOpacity onPress={() => setIsSecure(!isSecure)} style={styles.eyeButton}>
          <Text style={styles.eyeText}>{isSecure ? "🙈" : "👁️"}</Text>
        </TouchableOpacity>
      </View>

      {/* Paste Button */}
      <TouchableOpacity style={styles.pasteButton} onPress={handlePaste}>
        <Text style={styles.pasteButtonText}>📋 Paste Private Key</Text>
      </TouchableOpacity>

      {/* Import Requirements */}
      <View style={styles.requirementsBox}>
        <Text style={styles.requirementText}>✅ Private key should be 66 characters long (including `0x`)</Text>
        <Text style={styles.requirementText}>✅ Contains only numbers and letters A-F</Text>
        <Text style={styles.requirementText}>✅ You can paste your private key directly</Text>
      </View>

      {/* Error Message */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Import Button */}
      <TouchableOpacity
        style={[
          styles.importButton,
          isProcessing || privateKey.length !== 66 ? styles.disabledButton : {},
        ]}
        onPress={handleImport}
        disabled={isProcessing || privateKey.length !== 66}
      >
        {isProcessing ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Import Wallet</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1B3F",
    padding: 20,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backText: {
    fontSize: 24,
    color: "#6A9EFF",
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    flex: 1,
  },
  warningBox: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  warningText: {
    color: "red",
    fontSize: 14,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    color: "white",
    fontSize: 16,
  },
  eyeButton: {
    padding: 10,
  },
  eyeText: {
    fontSize: 18,
    color: "#6A9EFF",
  },
  pasteButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  pasteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  requirementsBox: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  requirementText: {
    color: "#6A9EFF",
    fontSize: 14,
    marginBottom: 4,
  },
  errorText: {
    color: "red",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 10,
  },
  importButton: {
    backgroundColor: "#6A9EFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "rgba(106, 158, 255, 0.3)",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
}); 