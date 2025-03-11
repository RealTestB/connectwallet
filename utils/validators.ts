import { ethers, JsonRpcProvider } from 'ethers';
import { Alchemy } from 'alchemy-sdk';

interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  address?: string;
}

interface PasswordValidationRules {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

export const validateEthereumAddress = async (
  address: string,
  provider?: JsonRpcProvider | Alchemy
): Promise<ValidationResult> => {
  try {
    // Basic format validation
    if (!address) {
      return { isValid: false, error: "Address is required" };
    }

    if (!address.startsWith("0x")) {
      return { isValid: false, error: "Invalid address format: must start with 0x" };
    }

    if (address.length !== 42) {
      return { isValid: false, error: "Invalid address length" };
    }

    // Checksum validation
    try {
      const checksumAddress = ethers.getAddress(address);
      const warning = address !== checksumAddress ? "Address converted to checksum format" : undefined;
      
      // If provider is available, check if it's a contract address
      if (provider) {
        try {
          const code = await (provider instanceof JsonRpcProvider 
            ? provider.getCode(checksumAddress)
            : provider.core.getCode(checksumAddress));

          if (code !== "0x") {
            return {
              isValid: true,
              warning: "This appears to be a contract address",
              address: checksumAddress,
            };
          }
        } catch (error) {
          console.warn('Failed to check if address is a contract:', error);
          // Continue with basic validation if contract check fails
        }
      }

      return {
        isValid: true,
        warning,
        address: checksumAddress,
      };
    } catch {
      return { isValid: false, error: "Invalid address checksum" };
    }
  } catch (error) {
    return {
      isValid: false,
      error: "Address validation failed: " + (error as Error).message,
    };
  }
};

export const validatePassword = (
  password: string,
  rules: PasswordValidationRules = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  }
): string | null => {
  if (!password) {
    return "Password is required";
  }

  if (password.length < rules.minLength) {
    return `Password must be at least ${rules.minLength} characters long`;
  }

  if (rules.requireUppercase && !/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (rules.requireLowercase && !/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }

  if (rules.requireNumber && !/\d/.test(password)) {
    return "Password must contain at least one number";
  }

  if (rules.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Password must contain at least one special character";
  }

  return null;
};

export const calculatePasswordStrength = (password: string): number => {
  let strength = 0;

  // Length contribution (up to 25%)
  strength += Math.min(25, (password.length / 12) * 25);

  // Character variety contribution (up to 75%)
  if (/[A-Z]/.test(password)) strength += 15; // uppercase
  if (/[a-z]/.test(password)) strength += 15; // lowercase
  if (/[0-9]/.test(password)) strength += 15; // numbers
  if (/[^A-Za-z0-9]/.test(password)) strength += 15; // special characters
  if (password.length >= 12) strength += 15; // extra length bonus

  return Math.min(100, strength);
};

export const validateSeedPhrase = (phrase: string): ValidationResult => {
  try {
    if (!phrase) {
      return { isValid: false, error: "Seed phrase is required" };
    }

    const words = phrase.trim().split(/\s+/);
    
    // Check word count
    if (![12, 15, 18, 21, 24].includes(words.length)) {
      return {
        isValid: false,
        error: "Invalid number of words. Must be 12, 15, 18, 21, or 24 words",
      };
    }

    // Check if each word is valid (basic check)
    const invalidWords = words.filter(word => !/^[a-zA-Z]+$/.test(word));
    if (invalidWords.length > 0) {
      return {
        isValid: false,
        error: "Invalid characters in seed phrase. Only letters are allowed",
      };
    }

    // Validate using ethers
    try {
      ethers.Wallet.fromPhrase(phrase);
      return { isValid: true };
    } catch {
      return { isValid: false, error: "Invalid seed phrase" };
    }
  } catch (error) {
    return {
      isValid: false,
      error: "Seed phrase validation failed: " + (error as Error).message,
    };
  }
}; 