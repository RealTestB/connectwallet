import { ethers } from 'ethers';
import { makeAlchemyRequest } from '../api/alchemyApi';
import { makeHttpRequest } from '../utils/httpClient';
import { NATIVE_TOKEN_IDS, COINGECKO_BASE_URL, COINGECKO_API_KEY } from '../api/coingeckoApi';
import { ChainId } from '../types/chains';
import { NETWORKS } from '../constants/networks';

// Transaction types for gas estimation
export enum TransactionType {
  NATIVE_TRANSFER = 'NATIVE_TRANSFER',
  TOKEN_TRANSFER = 'TOKEN_TRANSFER',
  TOKEN_APPROVAL = 'TOKEN_APPROVAL',
  NFT_TRANSFER = 'NFT_TRANSFER',
  NFT_APPROVAL = 'NFT_APPROVAL',
  SWAP = 'SWAP',
  CONTRACT_DEPLOYMENT = 'CONTRACT_DEPLOYMENT',
  CONTRACT_INTERACTION = 'CONTRACT_INTERACTION'
}

// Network-specific gas configurations
export interface GasConfig {
  lastUpdated: number;
  basePriorityFee: bigint;
  baseGasLimit: Record<TransactionType, bigint>;
  bufferMultiplier: number;
  minGasPrice: bigint;
  maxGasPrice: bigint;
  defaultGasLimit: bigint;
}

// Cache for gas configurations
const gasConfigCache: Partial<Record<ChainId, GasConfig>> = {};

// Get network-specific gas configuration
export const getNetworkGasConfig = async (chainId: ChainId): Promise<GasConfig> => {
  const network = NETWORKS[chainId];
  if (!network) {
    throw new Error(`Network not found for chain ID: ${chainId}`);
  }

  // Check if we have a cached config that's less than 5 minutes old
  const cachedConfig = gasConfigCache[chainId];
  if (cachedConfig && Date.now() - cachedConfig.lastUpdated < 300000) {
    return cachedConfig;
  }

  try {
    // Get current gas price data
    const feeData = await makeAlchemyRequest('eth_feeHistory', [
      '0x1',
      'latest',
      [25, 50, 75]
    ], chainId);

    // Calculate base gas price and priority fee
    const baseGasPrice = feeData.baseFeePerGas ? BigInt(feeData.baseFeePerGas[0]) : ethers.parseUnits('1', 'gwei');
    const priorityFee = feeData.reward ? BigInt(feeData.reward[0][1]) : ethers.parseUnits('1', 'gwei');

    // Get network gas limits
    const gasLimits = await fetchNetworkGasLimits(chainId);

    // Create new gas config
    const newConfig: GasConfig = {
      lastUpdated: Date.now(),
      basePriorityFee: priorityFee,
      baseGasLimit: gasLimits,
      bufferMultiplier: await getNetworkBufferMultiplier(chainId),
      minGasPrice: await getNetworkMinGasPrice(chainId),
      maxGasPrice: await getNetworkMaxGasPrice(chainId),
      defaultGasLimit: gasLimits[TransactionType.NATIVE_TRANSFER]
    };

    // Cache the config
    gasConfigCache[chainId] = newConfig;

    return newConfig;
  } catch (error) {
    console.error('[GasUtils] Error fetching gas config:', error);
    // Return default config if fetch fails
    return await getDefaultGasConfig(chainId);
  }
};

// Fetch gas limits from the network
const fetchNetworkGasLimits = async (chainId: ChainId): Promise<Record<TransactionType, bigint>> => {
  try {
    // Get gas limits from network
    const response = await makeAlchemyRequest('eth_getBlockByNumber', ['latest', false], chainId);
    const baseGasLimit = BigInt(response.gasLimit);

    // Calculate gas limits based on network's base gas limit
    return {
      [TransactionType.NATIVE_TRANSFER]: baseGasLimit / BigInt(100),
      [TransactionType.TOKEN_TRANSFER]: baseGasLimit / BigInt(30),
      [TransactionType.TOKEN_APPROVAL]: baseGasLimit / BigInt(50),
      [TransactionType.NFT_TRANSFER]: baseGasLimit / BigInt(20),
      [TransactionType.NFT_APPROVAL]: baseGasLimit / BigInt(40),
      [TransactionType.SWAP]: baseGasLimit / BigInt(10),
      [TransactionType.CONTRACT_DEPLOYMENT]: baseGasLimit / BigInt(2),
      [TransactionType.CONTRACT_INTERACTION]: baseGasLimit / BigInt(20)
    };
  } catch (error) {
    console.error('[GasUtils] Error fetching gas limits:', error);
    throw error;
  }
};

// Get network-specific buffer multiplier
const getNetworkBufferMultiplier = async (chainId: ChainId): Promise<number> => {
  try {
    // Get historical gas usage data
    const feeData = await makeAlchemyRequest('eth_feeHistory', [
      '0x1',
      'latest',
      [25, 50, 75]
    ], chainId);

    // Calculate buffer based on historical gas usage volatility
    const gasUsed = feeData.gasUsedRatio;
    const volatility = Math.max(...gasUsed) - Math.min(...gasUsed);
    return Math.min(150, Math.max(110, Math.round(100 + (volatility * 100))));
  } catch (error) {
    console.error('[GasUtils] Error calculating buffer multiplier:', error);
    return 130; // Default fallback
  }
};

// Get network-specific minimum gas price
const getNetworkMinGasPrice = async (chainId: ChainId): Promise<bigint> => {
  try {
    // Get current gas price data
    const feeData = await makeAlchemyRequest('eth_feeHistory', [
      '0x1',
      'latest',
      [25, 50, 75]
    ], chainId);

    // Calculate minimum gas price based on historical data
    const baseFees = feeData.baseFeePerGas.map(BigInt);
    const minBaseFee = baseFees.reduce((a: bigint, b: bigint) => a < b ? a : b);
    return minBaseFee / BigInt(2); // Set minimum at 50% of lowest historical base fee
  } catch (error) {
    console.error('[GasUtils] Error calculating min gas price:', error);
    return ethers.parseUnits('1', 'gwei'); // Default fallback
  }
};

// Get network-specific maximum gas price
const getNetworkMaxGasPrice = async (chainId: ChainId): Promise<bigint> => {
  try {
    // Get current gas price data
    const feeData = await makeAlchemyRequest('eth_feeHistory', [
      '0x1',
      'latest',
      [25, 50, 75]
    ], chainId);

    // Calculate maximum gas price based on historical data
    const baseFees = feeData.baseFeePerGas.map(BigInt);
    const maxBaseFee = baseFees.reduce((a: bigint, b: bigint) => a > b ? a : b);
    return maxBaseFee * BigInt(2); // Set maximum at 200% of highest historical base fee
  } catch (error) {
    console.error('[GasUtils] Error calculating max gas price:', error);
    return ethers.parseUnits('10000', 'gwei'); // Default fallback
  }
};

// Get default gas config when network requests fail
const getDefaultGasConfig = async (chainId: ChainId): Promise<GasConfig> => {
  // Get current block to calculate default gas limits
  const block = await makeAlchemyRequest('eth_getBlockByNumber', ['latest', false], chainId);
  const baseGasLimit = BigInt(block.gasLimit);

  return {
    lastUpdated: Date.now(),
    basePriorityFee: ethers.parseUnits('1', 'gwei'),
    baseGasLimit: {
      [TransactionType.NATIVE_TRANSFER]: baseGasLimit / BigInt(100),
      [TransactionType.TOKEN_TRANSFER]: baseGasLimit / BigInt(30),
      [TransactionType.TOKEN_APPROVAL]: baseGasLimit / BigInt(50),
      [TransactionType.NFT_TRANSFER]: baseGasLimit / BigInt(20),
      [TransactionType.NFT_APPROVAL]: baseGasLimit / BigInt(40),
      [TransactionType.SWAP]: baseGasLimit / BigInt(10),
      [TransactionType.CONTRACT_DEPLOYMENT]: baseGasLimit / BigInt(2),
      [TransactionType.CONTRACT_INTERACTION]: baseGasLimit / BigInt(20)
    },
    bufferMultiplier: 130,
    minGasPrice: ethers.parseUnits('1', 'gwei'),
    maxGasPrice: ethers.parseUnits('10000', 'gwei'),
    defaultGasLimit: baseGasLimit / BigInt(100)
  };
};

// Get current gas prices for a network
export const getCurrentGasPrices = async (chainId: ChainId): Promise<{
  baseFee: bigint;
  maxPriorityFee: bigint;
  maxFee: bigint;
}> => {
  try {
    // Get current gas price data
    const feeData = await makeAlchemyRequest('eth_feeHistory', [
      '0x1',
      'latest',
      [25, 50, 75]
    ], chainId);

    // Calculate current base fee
    const baseFee = feeData.baseFeePerGas ? BigInt(feeData.baseFeePerGas[0]) : ethers.parseUnits('1', 'gwei');

    // Calculate priority fee based on network conditions
    const rewards = feeData.reward ? feeData.reward[0].map((r: string) => BigInt(r)) : [ethers.parseUnits('1', 'gwei')];
    const maxPriorityFee = rewards.reduce((a: bigint, b: bigint) => a > b ? a : b);

    // Special handling for Arbitrum (chainId 42161)
    if (chainId === 42161) {
      // Arbitrum has much lower gas fees, use a smaller multiplier
      const maxFee = baseFee + maxPriorityFee;
      return {
        baseFee,
        maxPriorityFee,
        maxFee
      };
    }

    // For other networks, use standard calculation
    const maxFee = (baseFee * BigInt(2)) + maxPriorityFee;

    return {
      baseFee,
      maxPriorityFee,
      maxFee
    };
  } catch (error) {
    console.error('[GasUtils] Error fetching gas prices:', error);
    // Return safe default values if the request fails
    const defaultGwei = ethers.parseUnits('1', 'gwei');
    return {
      baseFee: defaultGwei,
      maxPriorityFee: defaultGwei,
      maxFee: defaultGwei * (chainId === 42161 ? BigInt(1) : BigInt(3)) // Lower default for Arbitrum
    };
  }
};

// Helper function to generate NFT transfer data
const generateNFTTransferData = (
  tokenType: 'ERC721' | 'ERC1155',
  tokenId: string,
  fromAddress: string,
  toAddress: string,
  amount: string = '1'
): string => {
  try {
    if (tokenType === 'ERC721') {
      // Function signature for transferFrom(address,address,uint256)
      const transferFunctionSignature = '0x23b872dd';
      
      // Ensure addresses have 0x prefix and are lowercase
      const formattedFromAddress = fromAddress.startsWith('0x') ? fromAddress.toLowerCase() : `0x${fromAddress.toLowerCase()}`;
      const formattedToAddress = toAddress.startsWith('0x') ? toAddress.toLowerCase() : `0x${toAddress.toLowerCase()}`;
      
      // Remove 0x prefix and pad addresses to 32 bytes (64 characters)
      const fromAddressPadded = formattedFromAddress.slice(2).padStart(64, '0');
      const toAddressPadded = formattedToAddress.slice(2).padStart(64, '0');
      
      // Convert tokenId to hex and pad to 32 bytes (64 characters)
      const tokenIdPadded = BigInt(tokenId).toString(16).padStart(64, '0');
      
      return `${transferFunctionSignature}${fromAddressPadded}${toAddressPadded}${tokenIdPadded}`;
    } else {
      // Function signature for safeTransferFrom(address,address,uint256,uint256,bytes)
      const transferFunctionSignature = '0xf242432a';
      
      // Ensure addresses have 0x prefix and are lowercase
      const formattedFromAddress = fromAddress.startsWith('0x') ? fromAddress.toLowerCase() : `0x${fromAddress.toLowerCase()}`;
      const formattedToAddress = toAddress.startsWith('0x') ? toAddress.toLowerCase() : `0x${toAddress.toLowerCase()}`;
      
      // Remove 0x prefix and pad addresses to 32 bytes (64 characters)
      const fromAddressPadded = formattedFromAddress.slice(2).padStart(64, '0');
      const toAddressPadded = formattedToAddress.slice(2).padStart(64, '0');
      
      // Convert tokenId and amount to hex and pad to 32 bytes (64 characters)
      const tokenIdPadded = BigInt(tokenId).toString(16).padStart(64, '0');
      const amountPadded = BigInt(amount).toString(16).padStart(64, '0');
      
      // Empty bytes for data parameter
      const dataPadded = '00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000';
      
      return `${transferFunctionSignature}${fromAddressPadded}${toAddressPadded}${tokenIdPadded}${amountPadded}${dataPadded}`;
    }
  } catch (error) {
    console.error('[GasUtils] Error generating NFT transfer data:', error);
    throw error;
  }
};

// Estimate gas for a transaction
export const estimateGas = async (
  chainId: ChainId,
  transactionType: TransactionType,
  from: string,
  to: string,
  data?: string,
  value?: string,
  tokenType?: 'ERC721' | 'ERC1155',
  tokenId?: string
): Promise<{
  gasLimit: bigint;
  gasPrice: bigint;
  maxPriorityFee: bigint;
  maxFee: bigint;
}> => {
  try {
    // Get network gas config
    const gasConfig = await getNetworkGasConfig(chainId);

    // Get current gas prices
    const { baseFee, maxPriorityFee, maxFee } = await getCurrentGasPrices(chainId);

    // Get base gas limit for transaction type
    const baseGasLimit = gasConfig.baseGasLimit[transactionType];

    // Generate data for NFT transfers if needed
    let finalData = data;
    if (transactionType === TransactionType.NFT_TRANSFER && tokenType && tokenId) {
      finalData = generateNFTTransferData(tokenType, tokenId, from, to);
    }

    // Estimate actual gas limit
    const estimatedGas = await makeAlchemyRequest('eth_estimateGas', [{
      from,
      to,
      data: data || undefined,
      value: value ? (value.startsWith('0x') ? value : `0x${value.replace('0x', '')}`) : '0x0'
    }], chainId);

    // Apply buffer to gas limit
    const gasLimit = (BigInt(estimatedGas) * BigInt(gasConfig.bufferMultiplier)) / BigInt(100);

    // Ensure gas limit is within bounds
    const boundedGasLimit = gasLimit > baseGasLimit ? baseGasLimit : gasLimit;

    return {
      gasLimit: boundedGasLimit,
      gasPrice: baseFee,
      maxPriorityFee,
      maxFee
    };
  } catch (error) {
    console.error('[GasUtils] Error estimating gas:', error);
    throw error;
  }
};

// Calculate maximum sendable amount for native token transfers
export const calculateMaxNativeTokenAmount = async (
  chainId: ChainId,
  balance: string,
  price: number
): Promise<{
  amount: string;
  usdValue: string;
  gasEstimate: string;
  gasUsd: string;
}> => {
  try {
    const balanceWei = ethers.parseEther(balance);
    
    // Get gas estimation for a basic transfer
    const gasEstimation = await estimateGas(
      chainId,
      TransactionType.NATIVE_TRANSFER,
      '',
      '',
      '',
      ''
    );

    // Calculate gas costs
    const gasCostWei = gasEstimation.gasLimit * gasEstimation.gasPrice;
    const gasCostEth = ethers.formatEther(gasCostWei);
    const gasCostUsd = (parseFloat(gasCostEth) * price).toFixed(8);

    const maxAmountWei = balanceWei - gasCostWei;
    
    if (maxAmountWei <= 0) {
      return {
        amount: '0',
        usdValue: '0',
        gasEstimate: '0',
        gasUsd: '0'
      };
    }

    const amount = ethers.formatEther(maxAmountWei);
    const usdValue = (parseFloat(amount) * price).toFixed(2);

    return {
      amount,
      usdValue,
      gasEstimate: gasCostEth,
      gasUsd: gasCostUsd
    };
  } catch (error) {
    console.error('[GasUtils] Error calculating max amount:', error);
    throw error;
  }
}; 