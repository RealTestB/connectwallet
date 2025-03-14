import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

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
    <LinearGradient
      colors={["#1A2F6C", "#0A1B3F"]}
      style={styles.container}
    >
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
          <Ionicons name={message.icon} size={48} color="#4ade80" />
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
          <Text style={styles.title}>{message.title}</Text>
          <Text style={styles.description}>{message.description}</Text>
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
            <Text style={styles.tipsTitle}>Important Security Tips:</Text>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Ionicons name="shield-outline" size={16} color="#93c5fd" style={styles.tipIcon} />
                <Text style={styles.tipText}>
                  Never share your private key or seed phrase with anyone
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="lock-closed-outline" size={16} color="#93c5fd" style={styles.tipIcon} />
                <Text style={styles.tipText}>
                  Store your recovery phrase in a secure location
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="eye-off-outline" size={16} color="#93c5fd" style={styles.tipIcon} />
                <Text style={styles.tipText}>
                  Keep your password private and use a strong combination
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        <Animated.Text
          style={[
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
          style={styles.button}
          onPress={handleGoToPortfolio}
        >
          <Text style={styles.buttonText}>Go to Portfolio</Text>
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
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: "rgba(74, 222, 128, 0.2)",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  messageContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    color: "#93c5fd",
    fontSize: 16,
    textAlign: "center",
  },
  tipsContainer: {
    backgroundColor: "#ffffff1a",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    marginBottom: 24,
  },
  tipsTitle: {
    color: "#93c5fd",
    fontSize: 14,
    marginBottom: 8,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  tipIcon: {
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    color: "white",
    fontSize: 14,
  },
  redirectText: {
    color: "#93c5fd",
    fontSize: 14,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
}); 