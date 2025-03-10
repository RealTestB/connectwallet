import { ethers } from 'ethers';
import { Alert } from 'react-native';

/**
 * Enhanced Ethereum address validator with ENS support, checksum validation,
 * zero address warning, and contract detection
 * @param {string} address - The address or ENS name to validate
 * @param {ethers.providers.Provider} provider - Ethereum provider instance
 * @returns {Promise<Object>} Validation result with status and details
 */
export const validateEthereumAddress = async (address, provider) => {
  try {
    // If no input, return invalid
    if (!address) {
      return {
        isValid: false,
        error: 'Address is required'
      };
    }

    // Check if it's an ENS name
    if (address.endsWith('.eth')) {
      try {
        const resolvedAddress = await provider.resolveName(address);
        if (!resolvedAddress) {
          return {
            isValid: false,
            error: 'Invalid ENS name or unable to resolve'
          };
        }
        address = resolvedAddress;
      } catch (error) {
        return {
          isValid: false,
          error: 'Failed to resolve ENS name'
        };
      }
    }

    // Basic format check
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return {
        isValid: false,
        error: 'Invalid address format'
      };
    }

    // Checksum validation
    try {
      const checksumAddress = ethers.utils.getAddress(address);
      if (checksumAddress !== address) {
        return {
          isValid: true,
          address: checksumAddress,
          warning: 'Address checksum mismatch - corrected format provided'
        };
      }
    } catch {
      return {
        isValid: false,
        error: 'Invalid address checksum'
      };
    }

    // Zero address check
    if (address === '0x0000000000000000000000000000000000000000') {
      return new Promise((resolve) => {
        Alert.alert(
          'Warning: Burn Address',
          'You are about to send to the zero address (burn address). Any funds sent here will be lost forever. Are you sure you want to proceed?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve({
                isValid: false,
                error: 'Transaction cancelled'
              })
            },
            {
              text: 'Proceed',
              style: 'destructive',
              onPress: () => resolve({
                isValid: true,
                address,
                warning: 'Sending to burn address'
              })
            }
          ]
        );
      });
    }

    // Contract address check
    try {
      const code = await provider.getCode(address);
      const isContract = code !== '0x';

      if (isContract) {
        return new Promise((resolve) => {
          Alert.alert(
            'Warning: Contract Address',
            'You are about to send to a smart contract address. Make sure this contract can handle the tokens you are sending. Do you want to proceed?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve({
                  isValid: false,
                  error: 'Transaction cancelled'
                })
              },
              {
                text: 'Proceed',
                style: 'default',
                onPress: () => resolve({
                  isValid: true,
                  address,
                  warning: 'Sending to contract address'
                })
              }
            ]
          );
        });
      }
    } catch (error) {
      console.warn('Contract detection failed:', error);
      // Continue without contract detection if it fails
    }

    // If all checks pass
    return {
      isValid: true,
      address,
      warning: null
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Validation failed: ' + error.message
    };
  }
}; 