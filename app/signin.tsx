import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function SignInScreen(): JSX.Element {
  const [password, setPassword] = useState("");
  const { checkAuth, updateLastActive } = useAuth();
  const router = useRouter();

  const handleSignIn = async () => {
    try {
      // Here you would validate the password
      // For now, we'll just check if it's not empty
      if (!password.trim()) {
        Alert.alert("Error", "Please enter your password");
        return;
      }

      // Update last active timestamp and check auth status
      await updateLastActive();
      await checkAuth();
      
      // Navigate to portfolio
      router.replace("/portfolio");
    } catch (error) {
      console.error("Sign in failed:", error);
      Alert.alert("Error", "Failed to sign in. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Enter your password to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleSignIn}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1B3F",
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#6A9EFF",
    marginBottom: 32,
  },
  input: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    color: "white",
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    width: "100%",
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
}); 