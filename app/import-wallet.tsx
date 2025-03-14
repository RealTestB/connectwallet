import { useNavigation } from "@react-navigation/native";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/types";

type ImportWalletScreenNavigationProp = StackNavigationProp<RootStackParamList, 'import-wallet'>;

export default function ImportWalletScreen(): JSX.Element {
  const navigation = useNavigation<ImportWalletScreenNavigationProp>();

  const handleImportSeedPhrase = (): void => {
    navigation.navigate('create-password', {
      mode: 'import',
      type: 'seed-phrase'
    });
  };

  const handleImportPrivateKey = (): void => {
    navigation.navigate('create-password', {
      mode: 'import',
      type: 'private-key'
    });
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Import Wallet</Text>
      </View>

      {/* Security Warning */}
      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          ⚠ Never share your private keys or seed phrase. Anyone with access to them can control your wallet.
        </Text>
      </View>

      {/* Import Options */}
      <TouchableOpacity
        style={styles.importOption}
        onPress={handleImportSeedPhrase}
      >
        <Text style={styles.importText}>🌱 Import with Seed Phrase</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.importOptionSecondary}
        onPress={handleImportPrivateKey}
      >
        <Text style={styles.importText}>🔑 Import with Private Key</Text>
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
  importOption: {
    backgroundColor: "#1A2F6C",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  importOptionSecondary: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  importText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  }
}); 