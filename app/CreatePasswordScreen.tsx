import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { encryptPassword, storeEncryptedData } from "../api/securityApi";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type RootStackParamList = {
  CreatePassword: {
    mode: 'new' | 'import';
    type?: 'seed-phrase' | 'private-key';
  };
  SeedPhrase: {
    password: string;
  };
  ImportSeedPhrase: {
    password: string;
  };
  ImportPrivateKey: {
    password: string;
  };
};

type CreatePasswordScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CreatePassword'
>;

type CreatePasswordScreenRouteProp = RouteProp<
  RootStackParamList,
  'CreatePassword'
>;

type PasswordStrength = '' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';

export default function CreatePasswordScreen(): JSX.Element {
  const navigation = useNavigation<CreatePasswordScreenNavigationProp>();
  const route = useRoute<CreatePasswordScreenRouteProp>();
  const { mode, type } = route.params;

  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSecure, setIsSecure] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const validatePassword = (pass: string): string | null => {
    if (!pass) return "Password is required";
    if (pass.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pass)) return "Password must include an uppercase letter";
    if (!/[0-9]/.test(pass)) return "Password must include a number";
    if (!/[^A-Za-z0-9]/.test(pass)) return "Password must include a special character";
    return null;
  };

  const calculateStrength = (pass: string): number => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^A-Za-z0-9]/.test(pass)) strength++;
    return strength;
  };

  const passwordStrength = calculateStrength(password);

  const getStrengthText = (): PasswordStrength => {
    if (password.length === 0) return "";
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength === 2) return "Medium";
    if (passwordStrength === 3) return "Strong";
    return "Very Strong";
  };

  const storePasswordSecurely = async (pass: string): Promise<void> => {
    try {
      // Encrypt the password using our security service
      const encryptedPasswordData = await encryptPassword(pass);
      
      // Store the encrypted password data
      await storeEncryptedData("encryptedPassword", encryptedPasswordData);
    } catch (error) {
      console.error("Error encrypting password:", error);
      throw error;
    }
  };

  const handleContinue = async (): Promise<void> => {
    setError("");

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsCreating(true);
    try {
      await storePasswordSecurely(password);

      // Navigate based on mode and type
      if (mode === 'new') {
        // New wallet creation flow
        navigation.navigate("SeedPhrase", { password });
      } else if (mode === 'import') {
        // Import flow
        if (type === 'seed-phrase') {
          navigation.navigate("ImportSeedPhrase", { password });
        } else if (type === 'private-key') {
          navigation.navigate("ImportPrivateKey", { password });
        }
      }
    } catch (err) {
      console.error("Password creation failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Password</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          {mode === 'new' 
            ? "This password will unlock your wallet only on this device"
            : "Set a password to protect your imported wallet"}
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            secureTextEntry={isSecure}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor="#6A9EFF"
            style={styles.input}
          />
          <TouchableOpacity onPress={() => setIsSecure(!isSecure)} style={styles.toggleButton}>
            <Text style={styles.toggleText}>{isSecure ? "👁️" : "🙈"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.strengthBar}>
          {[...Array(4)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.strengthSegment,
                i < passwordStrength && styles.strengthActive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.strengthText}>{getStrengthText()}</Text>

        <TextInput
          secureTextEntry={isSecure}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          placeholderTextColor="#6A9EFF"
          style={styles.input}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity 
          onPress={handleContinue} 
          style={[
            styles.button,
            isCreating && styles.buttonDisabled
          ]} 
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1B3F",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    fontSize: 24,
    color: "#6A9EFF",
    marginRight: 16,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    color: "#6A9EFF",
    textAlign: "center",
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: "white",
    fontSize: 16,
  },
  toggleButton: {
    padding: 10,
  },
  toggleText: {
    fontSize: 18,
    color: "#6A9EFF",
  },
  errorText: {
    color: "#FF4D4D",
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
    backgroundColor: "rgba(255, 77, 77, 0.1)",
    padding: 10,
    borderRadius: 8,
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: "#2563EB80",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  strengthBar: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 10,
  },
  strengthSegment: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
  },
  strengthActive: {
    backgroundColor: "#4CAF50",
  },
  strengthText: {
    color: "#6A9EFF",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
}); 