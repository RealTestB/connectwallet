import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Image } from "react-native";
import { sharedStyles, COLORS, SPACING, FONTS } from "../styles/shared";

export default function CreatingWalletScreen() {
  return (
    <View style={sharedStyles.container}>
      <Image 
        source={require("../assets/images/background.png")}
        style={sharedStyles.backgroundImage}
      />
      <View style={styles.content}>
        <Text style={styles.title}>Creating Your Wallet</Text>
        <Text style={styles.subtitle}>
          Please wait while we securely generate your wallet
        </Text>
        <ActivityIndicator 
          size="large" 
          color={COLORS.primary} 
          style={styles.loader}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  title: {
    ...FONTS.h1,
    color: COLORS.white,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xl * 2,
  },
  loader: {
    transform: [{ scale: 1.5 }],
  },
}); 