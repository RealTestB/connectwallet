import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { sharedStyles, COLORS, SPACING, FONTS } from "../styles/shared";

type IconName = 'checkmark-circle' | 'wallet' | 'shield' | 'refresh';

interface Message {
  title: string;
  description: string;
  icon: IconName;
  tips: boolean;
}

export default function ImportSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const [message, setMessage] = useState<Message>({
    title: "",
    description: "",
    icon: "checkmark-circle",
    tips: true,
  });
  const [fadeAnim] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(10));

  useEffect(() => {
    const successType = typeof params.type === 'string' ? params.type : 'import';

    switch (successType) {
      case "creation":
        setMessage({
          title: "Wallet Successfully Created",
          description: "Your wallet has been created and is ready to use",
          icon: "wallet",
          tips: true,
        });
        break;
      case "import":
        setMessage({
          title: "Wallet Successfully Imported",
          description: "Your wallet has been imported and is ready to use",
          icon: "checkmark-circle",
          tips: true,
        });
        break;
      case "backup":
        setMessage({
          title: "Backup Complete",
          description: "Your wallet has been successfully backed up",
          icon: "shield",
          tips: false,
        });
        break;
      case "reset":
        setMessage({
          title: "Wallet Reset Complete",
          description: "Your wallet has been reset to default settings",
          icon: "refresh",
          tips: false,
        });
        break;
      default:
        setMessage({
          title: "Success",
          description: "Operation completed successfully",
          icon: "checkmark-circle",
          tips: false,
        });
    }

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto redirect after 3 seconds
    const timer = setTimeout(() => {
      router.push("/portfolio");
    }, 3000);

    return () => clearTimeout(timer);
  }, [params.type]);

  const handleGoToPortfolio = () => {
    router.push("/portfolio");
  };

  return (
    <View style={sharedStyles.container}>
      <Image 
        source={require("../assets/images/background.png")}
        style={sharedStyles.backgroundImage}
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          <Ionicons name={message.icon} size={48} color={COLORS.success} />
        </Animated.View>

        <Animated.View
          style={[
            styles.messageContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          <Text style={[FONTS.h1, styles.title]}>{message.title}</Text>
          <Text style={[FONTS.body, { color: COLORS.textSecondary }]}>{message.description}</Text>
        </Animated.View>

        {message.tips && (
          <Animated.View
            style={[
              styles.tipsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY }],
              },
            ]}
          >
            <Text style={[FONTS.caption, styles.tipsTitle]}>Important Security Tips:</Text>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Ionicons name="shield-outline" size={16} color={COLORS.primary} style={styles.tipIcon} />
                <Text style={[FONTS.caption, styles.tipText]}>
                  Never share your private key or seed phrase with anyone
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="lock-closed-outline" size={16} color={COLORS.primary} style={styles.tipIcon} />
                <Text style={[FONTS.caption, styles.tipText]}>
                  Store your recovery phrase in a secure location
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="eye-off-outline" size={16} color={COLORS.primary} style={styles.tipIcon} />
                <Text style={[FONTS.caption, styles.tipText]}>
                  Keep your password private and use a strong combination
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        <Animated.Text
          style={[
            FONTS.caption,
            styles.redirectText,
            {
              opacity: fadeAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          Redirecting to your wallet...
        </Animated.Text>

        <TouchableOpacity
          style={[sharedStyles.button, styles.button]}
          onPress={handleGoToPortfolio}
        >
          <Text style={sharedStyles.buttonText}>Go to Portfolio</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: `${COLORS.success}33`,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  messageContainer: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  title: {
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  tipsContainer: {
    backgroundColor: `${COLORS.white}0D`,
    borderRadius: 12,
    padding: SPACING.lg,
    width: "100%",
    marginBottom: SPACING.lg,
  },
  tipsTitle: {
    marginBottom: SPACING.xs,
  },
  tipsList: {
    gap: SPACING.xs,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.xs,
  },
  tipIcon: {
    marginTop: 2,
  },
  tipText: {
    flex: 1,
  },
  redirectText: {
    marginBottom: SPACING.lg,
  },
  button: {
    width: "100%",
  },
}); 