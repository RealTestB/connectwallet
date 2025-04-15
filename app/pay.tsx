import { getTokenBalances, getStoredTokenBalances, estimateTokenTransferGas, transferToken } from "../api/tokensApi";
import { makeAlchemyRequest } from "../api/alchemyApi";
import { TokenBalanceResult } from "../types/tokens";
import { sendTransaction, TransactionRequest } from "../api/transactionsApi";
import { getProvider } from "../api/provider";
import { getStoredWallet } from "../api/walletApi";
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import { validateEthereumAddress } from "../utils/validators";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView, ImageBackground, Image, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import config from "../api/config";
import { Alchemy, Network } from "alchemy-sdk";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/types";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ethers } from "ethers";
import { COLORS, SPACING } from '../styles/shared';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useLocalSearchParams } from "expo-router";
import { makeHttpRequest } from "../utils/httpClient";
import { CHAIN_TO_PLATFORM, NATIVE_TOKEN_IDS } from "../api/coingeckoApi";
import { ChainId } from "../constants/chains";
import { ERC20_ABI } from '../constants/abis';
import { estimateGas, getCurrentGasPrices, TransactionType } from '../utils/gasUtils';

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

interface ValidationResult {
  isValid: boolean;
  address?: string;
  error?: string;
  warning?: string;
}

interface TransactionParams {
  from: string;
  to: string;
  amount: string;
  token: string;
  networkId: number;
}

export interface ExtendedTransactionRequest extends TransactionRequest {
  chainId?: number;
  from: string;
}

type NavigationProp = StackNavigationProp<RootStackParamList, 'pay'>;

interface Token {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
  price: number;
  name?: string;
  logo?: string;
  balanceUSD?: number;
  priceChange24h?: number;
}

export default function PayScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const router = useRouter();
  const params = useLocalSearchParams<{ scannedAddress?: string }>();
  const insets = useSafeAreaInsets();
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [usdValue, setUsdValue] = useState<string>("0.00");
  const [gasEstimate, setGasEstimate] = useState<string>("0.00");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<Network>(Network.ETH_MAINNET);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [alchemy, setAlchemy] = useState<Alchemy | null>(null);
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [isFiatInput, setIsFiatInput] = useState<boolean>(false);
  const [fiatAmount, setFiatAmount] = useState<string>("");
  const [tokenAmount, setTokenAmount] = useState<string>("");
  const [tokenPrice, setTokenPrice] = useState<number>(0);
  const [gasUsd, setGasUsd] = useState('0.00');
  const [lastGasUpdate, setLastGasUpdate] = useState<number>(0);

  useEffect(() => {
    loadWalletData();
    // Initialize Alchemy
    const initAlchemy = () => {
      try {
        const alchemyInstance = new Alchemy({
          apiKey: config.alchemy.mainnetKey,
          network: Network.ETH_MAINNET
        });
        setAlchemy(alchemyInstance);
      } catch (error) {
        console.error('Failed to initialize Alchemy:', error);
      }
    };
    initAlchemy();

    // Refresh portfolio data when screen loads
    const refreshPortfolio = async () => {
      try {
        // Get current wallet data
        const walletData = await getStoredWallet();
        if (!walletData?.address) {
          console.error('[Pay] No wallet connected');
          return;
        }

        // Get fresh token balances using the current chain ID
        const tokenBalances = await getTokenBalances(walletData.address, walletData.chainId as ChainId || 1);
        
        if (!tokenBalances || tokenBalances.length === 0) {
          console.log('[Pay] No token balances found');
          setTokens([]);
          return;
        }

        // Get portfolio data for prices
        const portfolioData = await SecureStore.getItemAsync(STORAGE_KEYS.PORTFOLIO_DATA);
        const portfolio = portfolioData ? JSON.parse(portfolioData) : null;

        // Process token balances
        const processedTokens = await Promise.all(tokenBalances.map(async (balance) => {
          let tokenPrice = 0;
          try {
            // Get real-time price from CoinGecko for any token
            const priceResponse = await makeHttpRequest(
              `${config.coingecko.baseUrl}/simple/token_price/${CHAIN_TO_PLATFORM[walletData.chainId as ChainId || 1]}?contract_addresses=${balance.contractAddress}&vs_currencies=usd&x_cg_demo_api_key=${config.coingecko.apiKey}`
            );
            const priceData = await priceResponse.json();
            tokenPrice = priceData[balance.contractAddress.toLowerCase()]?.usd || 0;

            // If it's native token and price not found, try getting price directly
            if (balance.contractAddress === '0x0000000000000000000000000000000000000000' && !tokenPrice) {
              const nativePriceResponse = await makeHttpRequest(
                `${config.coingecko.baseUrl}/simple/price?ids=${NATIVE_TOKEN_IDS[walletData.chainId as ChainId || 1]}&vs_currencies=usd&x_cg_demo_api_key=${config.coingecko.apiKey}`
              );
              const nativePriceData = await nativePriceResponse.json();
              tokenPrice = nativePriceData[NATIVE_TOKEN_IDS[walletData.chainId as ChainId || 1]]?.usd || 0;
            }
          } catch (error) {
            console.error('[Pay] Error fetching token price:', error);
          }

          return {
            address: balance.contractAddress,
            symbol: balance.metadata?.symbol || 'UNKNOWN',
            name: balance.metadata?.name || 'Unknown Token',
            decimals: balance.metadata?.decimals || 18,
            balance: balance.formattedBalance,
            price: tokenPrice,
            logo: balance.metadata?.logo
          };
        }));

        console.log('[Pay] Refreshed token balances:', {
          tokenCount: processedTokens.length,
          tokens: processedTokens.map(t => ({
            symbol: t.symbol,
            balance: t.balance,
            price: t.price
          }))
        });

        setTokens(processedTokens);
          
        // Update price for currently selected token if it exists
        const selectedTokenData = processedTokens.find((t) => t.symbol === selectedToken?.symbol);
        if (selectedTokenData) {
          console.log('[Pay] Updating selected token data:', selectedTokenData);
          setSelectedToken(selectedTokenData);
        }
      } catch (error) {
        console.error('[Pay] Error refreshing portfolio:', error);
      }
    };

    // Refresh immediately and then every 30 seconds
    refreshPortfolio();
    const refreshInterval = setInterval(refreshPortfolio, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  const loadWalletData = async (): Promise<void> => {
    try {
      const storedWallet = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_ADDRESS);
      const storedNetwork = await SecureStore.getItemAsync(STORAGE_KEYS.NETWORK.ID);
      const storedPortfolio = await SecureStore.getItemAsync(STORAGE_KEYS.PORTFOLIO_DATA);

      console.log('[Pay] Loading wallet data:', { 
        hasWallet: !!storedWallet,
        hasNetwork: !!storedNetwork,
        hasPortfolio: !!storedPortfolio 
      });

      if (storedWallet) setWalletAddress(storedWallet);
      if (storedNetwork) {
        const networkMap: { [key: string]: Network } = {
          "1": Network.ETH_MAINNET,
          "5": Network.ETH_GOERLI,
          "137": Network.MATIC_MAINNET,
          "80001": Network.MATIC_MUMBAI,
        };
        setNetworkId(networkMap[storedNetwork] || Network.ETH_MAINNET);
      }

      if (storedWallet && storedPortfolio) {
        const portfolioData = JSON.parse(storedPortfolio);
        console.log('[Pay] Portfolio data loaded:', {
          tokenCount: portfolioData.tokens.length,
          tokens: portfolioData.tokens.map((t: Token) => ({
            symbol: t.symbol,
            price: t.price
          }))
        });

        setTokens(portfolioData.tokens);

        // Set initial token price if we have a selected token
        const selectedTokenData = portfolioData.tokens.find((t: Token) => t.symbol === selectedToken?.symbol);
        console.log('[Pay] Selected token data:', {
          symbol: selectedToken?.symbol,
          price: selectedTokenData?.price,
          found: !!selectedTokenData
        });

        if (selectedTokenData?.price) {
          setTokenPrice(selectedTokenData.price);
          console.log('[Pay] Setting initial token price:', selectedTokenData.price);
        }
      }
    } catch (err) {
      console.error("[Pay] Failed to load wallet data:", err);
      setError("Failed to load wallet data.");
    }
  };

  // Add effect to update token price when selected token changes
  useEffect(() => {
    const selectedTokenData = tokens.find(t => t.symbol === selectedToken?.symbol);
    console.log('[Pay] Token selection changed:', {
      symbol: selectedToken?.symbol,
      price: selectedTokenData?.price,
      allTokens: tokens.map(t => ({ symbol: t.symbol, price: t.price }))
    });

    if (selectedTokenData) {
      // Update price from token data
      const currentPrice = selectedTokenData.price || 0;
      setTokenPrice(currentPrice);
      
      // Recalculate the conversion based on current input
      if (isFiatInput) {
        // If user was entering USD, keep USD the same and recalculate token amount
        const numValue = parseFloat(fiatAmount) || 0;
        const calculatedTokens = currentPrice > 0 ? numValue / currentPrice : 0;
        setTokenAmount(calculatedTokens.toFixed(7));
        setAmount(calculatedTokens.toFixed(7));
      } else {
        // If user was entering tokens, keep token amount the same and recalculate USD
        const numValue = parseFloat(tokenAmount) || 0;
        const calculatedUsd = numValue * currentPrice;
        setFiatAmount(calculatedUsd.toFixed(2));
      }
    }
  }, [selectedToken, tokens]);

  // Handle scanned address from QR code
  useEffect(() => {
    if (params.scannedAddress) {
      setRecipient(params.scannedAddress);
    }
  }, [params.scannedAddress]);

  // Update effect to estimate gas when page loads or network changes
  useEffect(() => {
    if (walletAddress && selectedToken && amount && recipient) {
      const now = Date.now();
      // Only update if it's been more than 60 seconds since last update
      if (now - lastGasUpdate > 60000) {
        estimateBaseGas();
        setLastGasUpdate(now);
      }
    }
  }, [walletAddress, selectedToken, networkId, amount, recipient]);

  // Remove the effect that triggers on token selection alone
  // Add effect to clear gas estimates when token changes
  useEffect(() => {
    if (selectedToken) {
      setGasEstimate('0');
      setGasUsd('0.00000000');
      setError(null);
    }
  }, [selectedToken?.address]);

  const handleAmountChange = (value: string, isFromFiat: boolean = false) => {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Handle empty input
    if (!cleanValue) {
      setFiatAmount('');
      setTokenAmount('');
      setAmount('');
      return;
    }

    // Remove leading zeros before decimal
    const formattedValue = cleanValue.replace(/^0+(?=\d)/, '');
    
    // Prevent multiple decimal points
    if ((formattedValue.match(/\./g) || []).length > 1) {
      return;
    }

    // Limit decimal places to 7
    const parts = formattedValue.split('.');
    if (parts[1] && parts[1].length > 7) {
      parts[1] = parts[1].substring(0, 7);
      const limitedValue = parts.join('.');
      if (isFromFiat) {
        setFiatAmount(limitedValue);
      } else {
        setTokenAmount(limitedValue);
      }
      return;
    }

    // Convert to number for calculations
    const numValue = parseFloat(formattedValue);

    // Check if we need to limit the amount for native token transfers
    if (selectedToken?.address === '0x0000000000000000000000000000000000000000') {
      const currentGasEstimate = gasEstimate || '0';
      if (currentGasEstimate !== '0' && selectedToken.balance) {
        // Calculate max amount considering gas buffer
        const balanceWei = ethers.parseEther(selectedToken.balance);
        const gasWei = ethers.parseEther(currentGasEstimate);
        const gasWithBuffer = (gasWei * BigInt(150)) / BigInt(100); // 1.5x buffer
        const maxAmountWei = balanceWei - gasWithBuffer;
        const maxAmount = parseFloat(ethers.formatEther(maxAmountWei));

        // Check if amount exceeds max
        if (isFromFiat) {
          const tokenAmount = tokenPrice > 0 ? numValue / tokenPrice : 0;
          if (tokenAmount > maxAmount) {
            const adjustedFiat = maxAmount * tokenPrice;
            setFiatAmount(adjustedFiat.toFixed(2));
            setTokenAmount(maxAmount.toString());
            setAmount(maxAmount.toString());
            setUsdValue(adjustedFiat.toFixed(2));
            return;
          }
        } else {
          if (numValue > maxAmount) {
            const adjustedFiat = maxAmount * (tokenPrice || 0);
            setFiatAmount(adjustedFiat.toFixed(2));
            setTokenAmount(maxAmount.toString());
            setAmount(maxAmount.toString());
            setUsdValue(adjustedFiat.toFixed(2));
            return;
          }
        }
      }
    }

    if (isFromFiat) {
      // User is entering USD amount
      const calculatedTokens = tokenPrice > 0 ? numValue / tokenPrice : 0;
      setFiatAmount(formattedValue);
      // Limit token amount to 7 decimal places
      const limitedTokens = parseFloat(calculatedTokens.toFixed(7));
      setTokenAmount(limitedTokens.toString());
      setAmount(limitedTokens.toString());
      
      // Update USD value display
      setUsdValue(formattedValue);
    } else {
      // User is entering token amount
      const calculatedUsd = numValue * (tokenPrice || 0);
      setTokenAmount(formattedValue);
      setAmount(formattedValue);
      
      // Update both fiat amount and USD value display
      const formattedUsd = calculatedUsd.toFixed(2);
      setFiatAmount(formattedUsd);
      setUsdValue(formattedUsd);
    }
  };

  // Simplified gas estimation function
  const estimateBaseGas = async () => {
    try {
      console.log('[Pay] Starting gas estimation process', {
        hasSelectedToken: !!selectedToken,
        hasWalletAddress: !!walletAddress,
        selectedToken: selectedToken ? {
          address: selectedToken.address,
          symbol: selectedToken.symbol,
          decimals: selectedToken.decimals,
          balance: selectedToken.balance
        } : null
      });
      
      if (!selectedToken || !walletAddress) {
        console.log('[Pay] Missing required data:', { 
          hasSelectedToken: !!selectedToken, 
          hasWalletAddress: !!walletAddress 
        });
        return;
      }

      const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      if (!walletDataStr) {
        console.log('[Pay] No wallet data found in secure storage');
        return;
      }
      
      const walletData = JSON.parse(walletDataStr);
      const chainId = (walletData.chainId || 1) as ChainId;

      // Calculate smallest unit based on token decimals
      const decimals = selectedToken.decimals || 18;
      const smallestUnit = ethers.parseUnits('0.000001', decimals);

      // Get gas estimation
      const gasEstimation = await estimateGas(
        chainId,
        TransactionType.NATIVE_TRANSFER,
        walletAddress as string,
        walletAddress as string,
        undefined,
        ethers.toQuantity(smallestUnit)
      );

      // Calculate gas costs
      const gasCostWei = gasEstimation.gasLimit * gasEstimation.gasPrice;
      const gasCostEth = ethers.formatEther(gasCostWei);
      
      // Get native token price for USD conversion
      const nativePriceResponse = await makeHttpRequest(
        `${config.coingecko.baseUrl}/simple/price?ids=${NATIVE_TOKEN_IDS[chainId]}&vs_currencies=usd&x_cg_demo_api_key=${config.coingecko.apiKey}`
      );
      const nativePriceData = await nativePriceResponse.json();
      const nativeTokenPrice = nativePriceData[NATIVE_TOKEN_IDS[chainId]]?.usd || 0;
      
      const gasUsdValue = (parseFloat(gasCostEth) * nativeTokenPrice).toFixed(8);

      setGasEstimate(gasCostEth);
      setGasUsd(gasUsdValue);

      console.log('[Pay] Final gas estimation results:', {
        gasLimit: gasEstimation.gasLimit.toString(),
        gasPrice: {
          wei: gasEstimation.gasPrice.toString(),
          gwei: ethers.formatUnits(gasEstimation.gasPrice, 'gwei')
        },
        gasCost: {
          eth: gasCostEth,
          usd: gasUsdValue
        }
      });
    } catch (error) {
      console.error('[Pay] Gas estimation error:', error);
      setGasEstimate('0');
      setGasUsd('0.00000000');
      setError('Failed to estimate gas. Please try again.');
    }
  };

  const handleSend = async () => {
    try {
      if (!selectedToken || !amount || !recipient || !walletAddress) {
        setError('Please fill in all required fields before sending.');
        return;
      }

      // Get current balance and amount with gas calculation
      const currentBalance = parseFloat(selectedToken.balance);
      const sendAmount = parseFloat(amount);
      
      // Get current chain ID
      const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      if (!walletDataStr) {
        throw new Error('No wallet data found');
      }
      const walletData = JSON.parse(walletDataStr);
      const chainId = (walletData.chainId || 1) as ChainId;
      
      // Get current gas price using fee history
      const feeData = await makeAlchemyRequest('eth_feeHistory', [
        '0x1',
        'latest',
        [25, 50, 75]
      ], chainId);

      const baseFeePerGas = feeData.baseFeePerGas ? BigInt(feeData.baseFeePerGas[0]) : BigInt(0);
      const priorityFeePerGas = feeData.reward ? BigInt(feeData.reward[0][1]) : BigInt(0);
      const gasPrice = baseFeePerGas + priorityFeePerGas;

      // Estimate gas limit based on token type
      let gasEstimation;
      if (selectedToken.address === '0x0000000000000000000000000000000000000000') {
        gasEstimation = await estimateGas(
          chainId,
          TransactionType.NATIVE_TRANSFER,
          walletAddress as string,
          walletAddress as string,
          undefined,
          '0x0'
        );
      } else {
        const contract = new ethers.Contract(selectedToken.address, ERC20_ABI);
        const data = contract.interface.encodeFunctionData('transfer', [
          recipient,
          ethers.parseUnits(amount, selectedToken.decimals || 18)
        ]);
        
        gasEstimation = await estimateGas(
          chainId,
          TransactionType.TOKEN_TRANSFER,
          walletAddress,
          selectedToken.address,
          data,
          '0x0'
        );
      }

      console.log('[Pay] Estimated gas:', gasEstimation);

      if (selectedToken.address === '0x0000000000000000000000000000000000000000') {
        const gasCostWei = gasEstimation.gasPrice * gasEstimation.gasLimit;
        const gasCostWithBuffer = gasCostWei * BigInt(130) / BigInt(100); // 30% buffer
        const amountWei = ethers.parseEther(amount);
        const balanceWei = ethers.parseEther(selectedToken.balance);
        
        if (amountWei + gasCostWithBuffer > balanceWei) {
          setError("Insufficient balance to cover transfer and gas fees");
          return;
        }
      }

      // Clear any existing errors
      setError(null);

      // Navigate to confirmation screen with transaction details
      router.push({
        pathname: '/confirm-transaction',
        params: {
          tokenAddress: selectedToken.address,
          tokenSymbol: selectedToken.symbol,
          tokenDecimals: selectedToken.decimals?.toString() || '18',
          amount: amount,
          recipient: recipient,
          gasPrice: gasEstimation.gasPrice.toString(),
          gasLimit: gasEstimation.gasLimit.toString(),
          usdValue: usdValue,
          tokenLogo: selectedToken.logo,
          total: amount,  // Add total amount for ETH value
          networkFee: gasEstimate, // Add network fee
          gasUsd: gasUsd // Add gas fee in USD
        }
      });
      
    } catch (error) {
      console.error('[Pay] Error preparing transaction:', error);
      
      // Handle specific error cases
      let errorMessage = 'An error occurred while processing your transaction.';
      
      if (error instanceof Error) {
        if (error.message.includes('transaction underpriced')) {
          errorMessage = 'Gas price too low. Please try again.';
        } else if (error.message.includes('gas required exceeds allowance')) {
          errorMessage = 'The transaction requires more gas than expected. Please try again with a smaller amount.';
        } else if (error.message.includes('nonce')) {
          errorMessage = 'There was an issue with the transaction sequence. Please try again.';
        } else if (error.message.includes('1015')) {
          errorMessage = 'Network connection issue. Please check your internet connection and try again.';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient balance to cover transfer and gas fees.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountChange = (account: Account): void => {
    setWalletAddress(account.address);
    if (account.chainId) {
      // Convert chain ID to Alchemy Network enum
      const networkMap: { [key: number]: Network } = {
        1: Network.ETH_MAINNET,
        5: Network.ETH_GOERLI,
        137: Network.MATIC_MAINNET,
        80001: Network.MATIC_MUMBAI,
      };
      setNetworkId(networkMap[account.chainId] || Network.ETH_MAINNET);
    }
  };

  // Add function to calculate maximum sendable amount
  const calculateMaxAmount = async () => {
    try {
      if (!selectedToken || !walletAddress) return;

      const tokenBalance = parseFloat(selectedToken.balance);
      
      // For native currency (ETH), subtract gas fees
      if (selectedToken.address === '0x0000000000000000000000000000000000000000') {
        // Get current gas price
        const gasPrice = await makeAlchemyRequest('eth_gasPrice', []);
        
        // Get gas limit for a standard ETH transfer
        const gasLimit = '0x5208'; // 21000 gas units for standard ETH transfer
        
        // Calculate total gas cost in ETH
        const gasCostWei = BigInt(gasPrice) * BigInt(gasLimit);
        const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
        
        // Add 30% buffer for gas price fluctuations
        const gasCostWithBuffer = gasCostEth * 1.3;
        
        // Calculate max amount by subtracting gas cost from balance
        const maxAmount = tokenBalance - gasCostWithBuffer;
        
        console.log('[Pay] Calculating max ETH amount:', {
          balance: tokenBalance,
          gasCost: gasCostEth,
          gasCostWithBuffer,
          maxAmount
        });
        
        // Format to 6 decimal places to avoid precision issues
        const formattedMaxAmount = maxAmount > 0 ? maxAmount.toFixed(6) : '0';
        
        // Update both token and fiat amounts
        setAmount(formattedMaxAmount);
        const usdValue = parseFloat(formattedMaxAmount) * tokenPrice;
        setFiatAmount(usdValue.toFixed(2));
        
        return formattedMaxAmount;
      }
      
      // For ERC20 tokens, return full balance formatted
      const formattedBalance = tokenBalance.toFixed(6);
      setAmount(formattedBalance);
      const usdValue = tokenBalance * tokenPrice;
      setFiatAmount(usdValue.toFixed(2));
      return formattedBalance;
    } catch (error) {
      console.error('Error calculating max amount:', error);
      return '0';
    }
  };

  // Add function to handle max button click
  const handleMaxClick = async () => {
    try {
      if (!selectedToken) return;

      // Get current chain ID
      const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      if (!walletDataStr) {
        throw new Error('No wallet data found');
      }
      const walletData = JSON.parse(walletDataStr);
      const chainId = (walletData.chainId || 1) as ChainId;

      // For ETH/native token transfers, we need to account for gas
      if (selectedToken.address === '0x0000000000000000000000000000000000000000') {
        // Get gas estimation for a basic transfer
        const gasEstimation = await estimateGas(
          chainId,
          TransactionType.NATIVE_TRANSFER,
          walletAddress as string,
          walletAddress as string,
          undefined,
          '0x0'
        );

        // Calculate gas cost with 1.8x buffer
        const gasCostWei = gasEstimation.gasLimit * gasEstimation.gasPrice;
        const gasCostWithBuffer = (gasCostWei * BigInt(180)) / BigInt(100); // 80% buffer
        
        // Calculate max amount in Wei
        const balanceWei = ethers.parseEther(selectedToken.balance);
        const maxAmountWei = balanceWei - gasCostWithBuffer;
        
        if (maxAmountWei <= 0) {
          setError("Insufficient balance to cover gas fees");
          setAmount('0');
          setTokenAmount('0');
          setFiatAmount('0');
          setUsdValue('0');
          return;
        }

        // Format amounts with proper precision
        const formattedMaxAmount = ethers.formatEther(maxAmountWei);
        const currentPrice = selectedToken.price || 0;
        const calculatedUsd = (parseFloat(formattedMaxAmount) * currentPrice).toFixed(2);
        
        // Update all state values in sequence
        setError(null);
        setAmount(formattedMaxAmount);
        setTokenAmount(formattedMaxAmount);
        setFiatAmount(calculatedUsd);
        setUsdValue(calculatedUsd);
        
        // Update gas estimates
        const gasCostFormatted = ethers.formatEther(gasCostWei);
        setGasEstimate(gasCostFormatted);
        setGasUsd((parseFloat(gasCostFormatted) * currentPrice).toFixed(2));

        // Also update the base gas estimation for the UI
        await estimateBaseGas();
      } else {
        // For other tokens, use full balance
        const balance = parseFloat(selectedToken.balance);
        const formattedBalance = balance.toFixed(6);
        const currentPrice = selectedToken.price || 0;
        const calculatedUsd = (balance * currentPrice).toFixed(2);
        
        // Update all state values in sequence
        setError(null);
        setAmount(formattedBalance);
        setTokenAmount(formattedBalance);
        setFiatAmount(calculatedUsd);
        setUsdValue(calculatedUsd);
      }
    } catch (error) {
      console.error('[Pay] Error in handleMaxClick:', error);
      setError('Failed to calculate maximum amount');
      setAmount('0');
      setTokenAmount('0');
      setFiatAmount('0');
      setUsdValue('0');
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('../assets/background.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.content}>
          <WalletHeader 
            onAccountChange={handleAccountChange}
          />

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              {/* Token Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Token</Text>
                <TouchableOpacity
                  style={[
                    styles.select,
                    showTokenPicker && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
                  ]}
                  onPress={() => setShowTokenPicker(!showTokenPicker)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {selectedToken?.logo && (
                      <Image
                        source={{ uri: selectedToken.logo }}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          marginRight: SPACING.sm
                        }}
                      />
                    )}
                    <Text style={styles.selectText}>
                      {selectedToken?.symbol}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.selectText, { opacity: 0.7, marginRight: SPACING.sm }]}>
                      {selectedToken?.balance || '0.00'}
                    </Text>
                    <Ionicons 
                      name={showTokenPicker ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={COLORS.white} 
                    />
                  </View>
                </TouchableOpacity>
                {showTokenPicker && (
                  <ScrollView style={styles.tokenList} nestedScrollEnabled>
                    {tokens.map((token) => (
                      <TouchableOpacity
                        key={token.symbol}
                        style={[
                          styles.tokenOption,
                          token.symbol === selectedToken?.symbol && styles.tokenOptionActive
                        ]}
                        onPress={() => {
                          setSelectedToken(token);
                          setShowTokenPicker(false);
                        }}
                      >
                        <View style={styles.tokenInfo}>
                          {token.logo && (
                            <Image
                              source={{ uri: token.logo }}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                marginRight: SPACING.sm
                              }}
                            />
                          )}
                          <Text style={styles.tokenSymbol}>
                            {token.symbol}
                          </Text>
                        </View>
                        <Text style={styles.tokenBalance}>
                          {parseFloat(token.balance || '0').toFixed(4)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Recipient Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Recipient Address</Text>
                <View style={styles.addressInputContainer}>
                  <TextInput
                    style={[styles.input, styles.addressInput]}
                    value={recipient}
                    onChangeText={setRecipient}
                    placeholder="Enter wallet address"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  />
                  <TouchableOpacity
                    style={styles.scanButton}
                    onPress={() => router.push('/scan-qr')}
                  >
                    <Ionicons name="qr-code-outline" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Amount */}
              <View style={styles.inputGroup}>
                <View style={styles.amountHeader}>
                  <Text style={styles.label}>Amount</Text>
                  <View style={styles.amountHeaderRight}>
                    <TouchableOpacity
                      style={styles.maxButton}
                      onPress={handleMaxClick}
                    >
                      <Text style={styles.maxButtonText}>MAX</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.currencyToggle}
                      onPress={() => {
                        setIsFiatInput(!isFiatInput);
                        // When switching, use the current visible amount for conversion
                        const currentValue = isFiatInput ? fiatAmount : tokenAmount;
                        handleAmountChange(currentValue || '0', !isFiatInput);
                      }}
                    >
                      <Text style={styles.currencyToggleText}>
                        {isFiatInput ? 'USD' : selectedToken?.symbol}
                      </Text>
                      <Ionicons 
                        name="swap-horizontal" 
                        size={16} 
                        color={COLORS.white} 
                        style={{ marginLeft: 4 }}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.amountContainer}>
                  <TextInput
                    style={styles.input}
                    value={isFiatInput ? fiatAmount : tokenAmount}
                    onChangeText={(value) => handleAmountChange(value, isFiatInput)}
                    placeholder="0.00"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.conversionValue}>
                    ≈ {isFiatInput 
                      ? `${parseFloat(tokenAmount || '0').toFixed(6)} ${selectedToken?.symbol}`
                      : `$${parseFloat(fiatAmount || '0').toFixed(2)}`}
                  </Text>
                </View>
              </View>

              {/* Gas Estimate */}
              <View style={styles.gasContainer}>
                <View style={styles.gasInfo}>
                  <Text style={styles.gasLabel}>Estimated Gas Fee</Text>
                  <View style={styles.gasValue}>
                    <Text style={styles.gasAmount} numberOfLines={2} adjustsFontSizeToFit>
                      {parseFloat(gasEstimate).toFixed(8)} ETH
                    </Text>
                    <Text style={styles.gasUsd}>
                      (≈ ${parseFloat(gasUsd).toFixed(8)})
                    </Text>
                  </View>
                </View>
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!amount || !recipient || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={handleSend}
              disabled={!amount || !recipient || isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="white" />
                  <Text style={styles.buttonText}>Sending...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Send Token</Text>
              )}
            </TouchableOpacity>
          </ScrollView>

          <BottomNav activeTab="pay" />
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: 'rgba(20, 24, 40, 0.15)',
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.7,
    marginBottom: 4,
  },
  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: SPACING.sm,
  },
  selectText: {
    color: COLORS.white,
    fontSize: 16,
  },
  tokenList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#3a5983",
    borderRadius: 12,
    marginTop: 4,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    maxHeight: 300,
  },
  tokenOption: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tokenOptionActive: {
    backgroundColor: "#3a5983",
  },
  tokenInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  tokenSymbol: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  tokenBalance: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 14,
    marginLeft: SPACING.sm,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: SPACING.sm,
    color: COLORS.white,
    fontSize: 16,
  },
  amountContainer: {
    position: "relative",
  },
  usdValue: {
    position: "absolute",
    right: SPACING.md,
    top: "50%",
    transform: [{ translateY: -10 }],
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 14,
  },
  gasContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: SPACING.md,
  },
  gasInfo: {
    gap: SPACING.xs,
  },
  gasLabel: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 14,
  },
  gasValue: {
    flexDirection: "column",
    gap: SPACING.xs/2,
  },
  gasAmount: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },
  gasUsd: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    borderRadius: 12,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    flex: 1,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  amountHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  maxButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  maxButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  currencyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  currencyToggleText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  conversionValue: {
    position: "absolute",
    right: SPACING.md,
    top: "50%",
    transform: [{ translateY: -10 }],
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 14,
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  addressInput: {
    flex: 1,
  },
  scanButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 