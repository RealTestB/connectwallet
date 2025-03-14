import React, { useState } from "react";
import {View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator,} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import WalletHeader from "../components/ui/WalletHeader";

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

export default function CreatePasswordScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSecure, setIsSecure] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const validatePassword = (pass: string) => {
    if (!pass) return "Password is required";
    if (pass.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pass)) return "Password must include an uppercase letter";
    if (!/[0-9]/.test(pass)) return "Password must include a number";
    if (!/[^A-Za-z0-9]/.test(pass))
      return "Password must include a special character";
    return null;
  };

  const calculateStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^A-Za-z0-9]/.test(pass)) strength++;
    return strength;
  };

  const passwordStrength = calculateStrength(password);

  const getStrengthText = () => {
    if (password.length === 0) return "";
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength === 2) return "Medium";
    if (passwordStrength === 3) return "Strong";
    return "Very Strong";
  };

  const getStrengthColor = () => {
    if (password.length === 0) return "#ffffff1a";
    if (passwordStrength <= 1) return "#ef4444";
    if (passwordStrength === 2) return "#eab308";
    if (passwordStrength === 3) return "#22c55e";
    return "#4ade80";
  };

  const handleContinue = async () => {
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
      // Here you would typically make your API call
      // For now, we'll just navigate to the next screen
      router.push({
        pathname: "/confirm-seed-phrase",
        params: { password: encodeURIComponent(password) },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <WalletHeader pageName="Create Password" onAccountChange={() => {}} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.stepsContainer}>
          <View style={styles.steps}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.stepDot,
                  step === 1 ? styles.activeStep : styles.inactiveStep,
                ]}
              />
            ))}
          </View>
        </View>

        <Text style={styles.title}>Create Password</Text>

        <View style={styles.warningBox}>
          <Ionicons name="shield-checkmark" size={20} color="#facc15" />
          <Text style={styles.warningText}>
            Use a strong password that you don't use anywhere else
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.input}
              secureTextEntry={isSecure}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor="#93c5fd"
            />
            <TouchableOpacity
              onPress={() => setIsSecure(!isSecure)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={isSecure ? "eye-off" : "eye"}
                size={20}
                color="#93c5fd"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.strengthContainer}>
            <View style={styles.strengthBars}>
              {[...Array(4)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.strengthBar,
                    {
                      backgroundColor: i < passwordStrength ? getStrengthColor() : "#ffffff1a",
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.strengthText}>{getStrengthText()}</Text>
          </View>

          <TextInput
            style={styles.input}
            secureTextEntry={isSecure}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            placeholderTextColor="#93c5fd"
          />

          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <View style={styles.requirementsList}>
              <View style={styles.requirementItem}>
                <Ionicons
                  name={password.length >= 8 ? "checkmark-circle" : "ellipse"}
                  size={12}
                  color={password.length >= 8 ? "#4ade80" : "#93c5fd"}
                />
                <Text
                  style={[
                    styles.requirementText,
                    password.length >= 8 && styles.requirementMet,
                  ]}
                >
                  At least 8 characters
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons
                  name={/[A-Z]/.test(password) ? "checkmark-circle" : "ellipse"}
                  size={12}
                  color={/[A-Z]/.test(password) ? "#4ade80" : "#93c5fd"}
                />
                <Text
                  style={[
                    styles.requirementText,
                    /[A-Z]/.test(password) && styles.requirementMet,
                  ]}
                >
                  One uppercase letter
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons
                  name={/[0-9]/.test(password) ? "checkmark-circle" : "ellipse"}
                  size={12}
                  color={/[0-9]/.test(password) ? "#4ade80" : "#93c5fd"}
                />
                <Text
                  style={[
                    styles.requirementText,
                    /[0-9]/.test(password) && styles.requirementMet,
                  ]}
                >
                  One number
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons
                  name={/[^A-Za-z0-9]/.test(password) ? "checkmark-circle" : "ellipse"}
                  size={12}
                  color={/[^A-Za-z0-9]/.test(password) ? "#4ade80" : "#93c5fd"}
                />
                <Text
                  style={[
                    styles.requirementText,
                    /[^A-Za-z0-9]/.test(password) && styles.requirementMet,
                  ]}
                >
                  One special character
                </Text>
              </View>
            </View>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, isCreating && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A2F6C",
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
    alignItems: "center",
    gap: 8,
    backgroundColor: "#facc151a",
    borderWidth: 1,
    borderColor: "#facc1533",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    color: "#facc15",
    fontSize: 14,
  },
  inputContainer: {
    gap: 16,
  },
  passwordInputContainer: {
    position: "relative",
  },
  input: {
    backgroundColor: "#ffffff1a",
    borderWidth: 1,
    borderColor: "#ffffff1a",
    borderRadius: 12,
    padding: 12,
    color: "white",
    fontSize: 16,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -10 }],
  },
  strengthContainer: {
    gap: 8,
  },
  strengthBars: {
    flexDirection: "row",
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    color: "#93c5fd",
    fontSize: 14,
  },
  requirementsContainer: {
    backgroundColor: "#ffffff1a",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  requirementsTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  requirementsList: {
    gap: 8,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  requirementText: {
    color: "#93c5fd",
    fontSize: 14,
  },
  requirementMet: {
    color: "#4ade80",
  },
  errorContainer: {
    backgroundColor: "#ef44441a",
    padding: 16,
    borderRadius: 12,
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
}); 