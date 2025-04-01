import { getTokenBalances, getStoredTokenBalances, TokenBalanceResult, estimateTokenTransferGas, makeAlchemyRequest } from "../api/tokensApi";
import { sendTransaction, TransactionRequest } from "../api/transactionsApi";
import { getProvider } from "../api/provider";
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
  price?: number;
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
        const storedPortfolio = await SecureStore.getItemAsync(STORAGE_KEYS.PORTFOLIO_DATA);
        if (storedPortfolio) {
          const portfolioData = JSON.parse(storedPortfolio);
          console.log('[Pay] Refreshed portfolio data:', {
            tokenCount: portfolioData.tokens.length,
            tokens: portfolioData.tokens.map((t: Token) => ({
              symbol: t.symbol,
              price: t.price
            }))
          });
          setTokens(portfolioData.tokens);
          
          // Update price for currently selected token
          const selectedTokenData = portfolioData.tokens.find((t: Token) => t.symbol === selectedToken?.symbol);
          if (selectedTokenData?.price) {
            console.log('[Pay] Updating price from refresh:', selectedTokenData.price);
            setTokenPrice(selectedTokenData.price);
          }
        }
      } catch (error) {
        console.error('[Pay] Error refreshing portfolio:', error);
      }
    };

    // Refresh immediately and then every 2 minutes
    refreshPortfolio();
    const refreshInterval = setInterval(refreshPortfolio, 120000);

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

    if (selectedTokenData?.price) {
      console.log('[Pay] Updating token price:', selectedTokenData.price);
      setTokenPrice(selectedTokenData.price);
      
      // Recalculate the conversion based on current input
      if (isFiatInput) {
        // If user was entering USD, keep USD the same and recalculate token amount
        const numValue = parseFloat(fiatAmount) || 0;
        const calculatedTokens = selectedTokenData.price > 0 ? numValue / selectedTokenData.price : 0;
        setTokenAmount(calculatedTokens.toString());
        setAmount(calculatedTokens.toString());
      } else {
        // If user was entering tokens, keep token amount the same and recalculate USD
        const numValue = parseFloat(tokenAmount) || 0;
        const calculatedUsd = numValue * selectedTokenData.price;
        setFiatAmount(calculatedUsd.toString());
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
    if (walletAddress && selectedToken) {
      const now = Date.now();
      // Only update if it's been more than 60 seconds since last update
      if (now - lastGasUpdate > 60000) {
        estimateBaseGas();
        setLastGasUpdate(now);
      }
    }
  }, [walletAddress, selectedToken, networkId]);

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
      // If we're limiting decimals, update the input value
      if (isFromFiat) {
        setFiatAmount(limitedValue);
      } else {
        setTokenAmount(limitedValue);
      }
      return;
    }

    // Convert to number for calculations
    const numValue = parseFloat(formattedValue);

    console.log('[Pay] Amount change:', { 
      isFromFiat, 
      value: numValue, 
      tokenPrice,
      selectedToken,
      tokens: tokens.map(t => ({ symbol: t.symbol, price: t.price }))
    });

    if (isFromFiat) {
      // User is entering USD amount
      const calculatedTokens = tokenPrice > 0 ? numValue / tokenPrice : 0;
      setFiatAmount(formattedValue);
      // Limit token amount to 7 decimal places
      const limitedTokens = parseFloat(calculatedTokens.toFixed(7));
      setTokenAmount(limitedTokens.toString());
      setAmount(limitedTokens.toString());
    } else {
      // User is entering token amount
      const calculatedUsd = numValue * tokenPrice;
      setTokenAmount(formattedValue);
      setFiatAmount(calculatedUsd.toString());
      setAmount(formattedValue);
    }
  };

  // New function to estimate base gas cost
  const estimateBaseGas = async () => {
    try {
      if (!selectedToken) return;

      // Get gas estimate and gas price
      const [gasLimitHex, gasPriceHex] = await Promise.all([
        estimateTokenTransferGas(
          selectedToken.address,
          walletAddress || '',
          '0x0000000000000000000000000000000000000000', // Zero address for estimation
          '0' // Zero amount for base estimation
        ),
        makeAlchemyRequest('eth_gasPrice', [])
      ]);
      
      console.log('[Pay] Gas estimation responses:', {
        gasLimitHex,
        gasPriceHex
      });
      
      // Validate responses
      if (!gasLimitHex || typeof gasLimitHex !== 'string') {
        throw new Error('Invalid gas limit response');
      }
      
      if (!gasPriceHex || typeof gasPriceHex !== 'string') {
        throw new Error('Invalid gas price response');
      }

      // Convert hex strings to BigInt
      const gasLimitBigInt = BigInt(gasLimitHex);
      const gasPriceBigInt = BigInt(gasPriceHex);
      
      // Calculate network fee (gas limit * gas price)
      const networkFee = ethers.formatEther(gasLimitBigInt * gasPriceBigInt);
      
      // Update gas estimate and USD value
      setGasEstimate(networkFee);
      setGasUsd((parseFloat(networkFee) * 1800).toFixed(2)); // Using ETH price of $1800 for USD conversion
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error estimating base gas:', error);
      setGasEstimate('0');
      setGasUsd('0');
      setError(error instanceof Error ? error.message : 'Failed to estimate gas');
    }
  };

  const handleSend = async () => {
    try {
      if (!recipient || !amount || !selectedToken) {
        return;
      }

      setIsLoading(true);

      // Validate amount is a valid number
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Invalid amount');
      }

      // Get gas estimate
      const gasLimit = await estimateTokenTransferGas(
        selectedToken.address,
        walletAddress || '',
        recipient,
        amount
      );

      // Get current gas price
      const gasPrice = await makeAlchemyRequest('eth_gasPrice', []);
      
      // Calculate network fee (gas limit * gas price)
      const networkFee = ethers.formatEther(BigInt(gasLimit) * BigInt(gasPrice));
      
      // Calculate total in ETH (amount + network fee)
      const amountInEth = isFiatInput ? parseFloat(tokenAmount) : numAmount;
      const total = amountInEth + parseFloat(networkFee);

      // Check if total cost exceeds balance
      const tokenBalance = parseFloat(selectedToken.balance);
      if (total > tokenBalance) {
        throw new Error(`Insufficient balance to cover amount plus gas fees. You have ${tokenBalance.toFixed(6)} ${selectedToken.symbol}`);
      }

      // Navigate to confirmation screen
      router.push({
        pathname: '/confirm-transaction',
        params: {
          amount: amountInEth.toString(),
          to: recipient,
          from: walletAddress || '',
          tokenSymbol: selectedToken.symbol,
          tokenAddress: selectedToken.address,
          decimals: selectedToken.decimals.toString(),
          gasLimit: gasLimit.toString(),
          gasPrice,
          networkFee,
          total: total.toString()
        }
      });
    } catch (error) {
      console.error('Error preparing transaction:', error);
      // Show error message
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to prepare transaction'
      );
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
                      {gasEstimate} ETH
                    </Text>
                    <Text style={styles.gasUsd}>
                      (≈ ${gasUsd})
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
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
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