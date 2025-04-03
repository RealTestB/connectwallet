import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Image, ImageBackground, Modal, TouchableWithoutFeedback, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../components/ui/BottomNav';
import { getStoredWallet } from '../api/walletApi';
import { getWalletTokenBalances } from '../api/tokensApi';
import { getTokenPrice } from '../api/coingeckoApi';
import { getSwapQuote, executeSwap, SwapQuote } from '../api/lifiApi';
import { supabaseAdmin } from '../lib/supabase';
import { ethers } from 'ethers';
import { COLORS, SPACING } from '../styles/shared';
import { NETWORKS } from '../api/config';
import config from '../api/config';
import { 
  ChainType, 
  getTokens, 
  getChains, 
  getTools,
  getConnections,
  type TokensRequest, 
  type ChainsRequest,
  type ToolsRequest,
  type ConnectionsRequest,
  type ExtendedChain,
  type Token as LiFiToken,
  type TokensResponse
} from '@lifi/sdk';
import {
  getAllTokens,
  getTokenDetails,
  getSingleTokenBalance,
  getMultipleTokenBalances,
  getTokenBalancesByChainId,
  checkTokenAllowance,
  checkMultipleTokenAllowances,
  approveToken,
  revokeToken
} from '../api/tokenManagement';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { Token } from '../types/api';

interface TokenAmount {
  token: Token;
  amount: string;
}

interface Account {
  address: string;
  chainId?: number;
}

interface Chain {
  chainId: number;
  name: string;
  key: string;
  chainType: ChainType;
  coin: string;
  mainnet: boolean;
  logoURI: string;
  tokenlistUrl?: string;
  multicallAddress?: string;
  metamask?: {
    chainId: string;
    blockExplorerUrls: string[];
    chainName: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    rpcUrls: string[];
  };
  nativeToken: LiFiToken;
  rpcUrl?: string;
  blockExplorerUrl?: string;
}

interface Bridge {
  key: string;
  name: string;
  logoURI: string;
  supportedChains: {
    fromChainId: number;
    toChainId: number;
  }[];
}

interface Exchange {
  key: string;
  name: string;
  logoURI: string;
  supportedChains: number[];
}

interface ToolsResponse {
  bridges: Bridge[];
  exchanges: Exchange[];
}

const MODAL_HEIGHT = Dimensions.get('window').height * 0.7;

const getChainPath = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return 'ethereum';
    case 137:
      return 'polygon';
    case 42161:
      return 'arbitrum';
    case 10:
      return 'optimism';
    case 56:
      return 'smartchain';
    case 43114:
      return 'avalanche';
    default:
      return 'ethereum';
  }
};

const getTokenLogo = (symbol: string, tokenAddress: string, chainId: number = 1): string => {
  const chainPath = getChainPath(chainId);
  
  // For native tokens
  if (tokenAddress === "0x0000000000000000000000000000000000000000") {
    switch (chainId) {
      case 137:
        return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png";
      case 42161:
        return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png";
      case 10:
        return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png";
      case 56:
        return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png";
      case 43114:
        return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanche/info/logo.png";
      default:
        return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png";
    }
  }

  // Try multiple sources in order of reliability
  const sources = [
    // 1. 1inch Protocol Token Logo API (most reliable for verified tokens)
    chainId === 1 ? `https://tokens.1inch.io/${tokenAddress.toLowerCase()}.png` : 
    chainId === 137 ? `https://tokens.1inch.io/polygon/${tokenAddress.toLowerCase()}.png` :
    chainId === 42161 ? `https://tokens.1inch.io/arbitrum/${tokenAddress.toLowerCase()}.png` :
    chainId === 10 ? `https://tokens.1inch.io/optimism/${tokenAddress.toLowerCase()}.png` :
    `https://tokens.1inch.io/${tokenAddress.toLowerCase()}.png`,
    
    // 2. Trustwallet Assets (fallback for verified tokens)
    `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainPath}/assets/${tokenAddress}/logo.png`,
    
    // 3. Default chain-specific placeholder
    `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainPath}/info/logo.png`
  ];

  return sources[0];
};

const getChainName = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return 'Ethereum';
    case 137:
      return 'Polygon';
    case 42161:
      return 'Arbitrum';
    case 10:
      return 'Optimism';
    case 56:
      return 'BSC';
    case 43114:
      return 'Avalanche';
    default:
      return `Chain ${chainId}`;
  }
};

const Swap = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [estimatedOutput, setEstimatedOutput] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isLoading, setIsLoading] = useState(false);
  const [showFromTokenList, setShowFromTokenList] = useState(false);
  const [showToTokenList, setShowToTokenList] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<SwapQuote | null>(null);
  const [availableChains, setAvailableChains] = useState<Chain[]>([]);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [fromChainId, setFromChainId] = useState(1);
  const [toChainId, setToChainId] = useState(1);
  const [showChainSelector, setShowChainSelector] = useState<'from' | 'to' | null>(null);
  const [availableTools, setAvailableTools] = useState<ToolsResponse | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(MODAL_HEIGHT)).current;

  useEffect(() => {
    const init = async () => {
      try {
        // Load wallet data first
        await loadWalletData();
        
        // Load chains and tokens in parallel
        await Promise.all([
          loadAvailableChains(),
          loadAvailableTokens()
        ]);
        
        console.log('[Swap] Initialization complete');
      } catch (error) {
        console.error('[Swap] Error during initialization:', error);
        Alert.alert('Error', 'Failed to initialize swap screen');
      }
    };

    init();
  }, []);

  useEffect(() => {
    const shouldShowModal = showFromTokenList || showToTokenList || showChainSelector !== null;
    
    if (shouldShowModal && !isClosing) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    }
  }, [showFromTokenList, showToTokenList, showChainSelector, isClosing]);

  const handleCloseModal = () => {
    setIsClosing(true);
    Animated.timing(slideAnim, {
      toValue: MODAL_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowFromTokenList(false);
      setShowToTokenList(false);
      setShowChainSelector(null);
      setIsClosing(false);
      slideAnim.setValue(MODAL_HEIGHT);
    });
  };

  const loadWalletData = async () => {
    try {
      const walletData = await getStoredWallet();
      if (walletData?.address) {
        setCurrentAccount({ address: walletData.address });

        // Get wallet from Supabase
        const { data: wallet, error: walletError } = await supabaseAdmin
          .from("wallets")
          .select("id, public_address")
          .eq("public_address", walletData.address.toLowerCase())
          .eq("chain_name", "ethereum") // Swap only works on Ethereum mainnet
          .maybeSingle();

        if (walletError) {
          throw walletError;
        }

        if (!wallet) {
          throw new Error("Wallet not found");
        }

        // Get token balances
        const supabaseTokens = await getWalletTokenBalances(wallet.id);
        if (!supabaseTokens || supabaseTokens.length === 0) {
          setTokens([]);
          return;
        }

        // Filter tokens by Ethereum mainnet
        const chainTokens = supabaseTokens.filter(token => token.chainId === 1);

        const mappedTokens = await Promise.all(
          chainTokens.map(async (token) => {
            const priceData = await getTokenPrice(token.token_address, token.chainId);
            return {
              symbol: token.symbol,
              name: token.name,
              address: token.token_address,
              decimals: token.decimals || 18,
              balance: token.balance || "0",
              price: priceData?.price || 0,
              change24h: priceData?.change24h || 0,
              logoURI: getTokenLogo(token.symbol, token.token_address, token.chainId),
              chainId: token.chainId,
            } as Token;
          })
        );

        setTokens(mappedTokens);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    }
  };

  const loadAvailableChains = async () => {
    try {
      console.log('[Swap] Loading available chains...');
      const chainsRequest: ChainsRequest = {
        chainTypes: [ChainType.EVM],
      };
      const chains = await getChains(chainsRequest);
      console.log('[Swap] Loaded chains:', chains.length);

      // Filter for the chains we have Alchemy RPCs for
      const supportedChainIds = [
        1,    // Ethereum
        137,  // Polygon
        42161,// Arbitrum
        10,   // Optimism
        43114,// Avalanche
        8453, // Base
        56    // BNB Smart Chain
      ];
      
      const filteredChains = chains.filter(chain => supportedChainIds.includes(chain.id));
      console.log('[Swap] Filtered supported chains:', filteredChains.length);

      const formattedChains = filteredChains.map(chain => {
        // Get chain configuration from NETWORKS
        const networkKey = Object.keys(NETWORKS).find(key => 
          NETWORKS[key].chainId === chain.id
        );
        const networkConfig = networkKey ? NETWORKS[networkKey] : null;

        return {
          chainId: chain.id,
          name: chain.name,
          key: chain.key,
          chainType: chain.chainType,
          coin: chain.coin,
          mainnet: chain.mainnet,
          logoURI: getTokenLogo('', '0x0000000000000000000000000000000000000000', chain.id),
          tokenlistUrl: chain.tokenlistUrl,
          multicallAddress: chain.multicallAddress,
          metamask: chain.metamask,
          nativeToken: chain.nativeToken,
          // Add RPC URL from our network config if available
          rpcUrl: networkConfig?.rpcUrl || chain.metamask?.rpcUrls[0],
          blockExplorerUrl: networkConfig?.blockExplorerUrl || chain.metamask?.blockExplorerUrls[0]
        };
      });

      setAvailableChains(formattedChains);
      console.log('[Swap] Chains loaded successfully:', formattedChains.map(c => c.name).join(', '));
    } catch (error) {
      console.error('[Swap] Error loading chains:', error);
      Alert.alert('Error', 'Failed to load available chains');
    }
  };

  const loadAvailableTokens = async () => {
    try {
      console.log('[Swap] Loading available tokens...');
      const tokensRequest: TokensRequest = {
        chainTypes: [ChainType.EVM],
        chains: [fromChainId] // Only fetch tokens for the current chain
      };
      const tokensResponse: TokensResponse = await getTokens(tokensRequest);
      
      // Get chain configuration from NETWORKS
      const networkKey = Object.keys(NETWORKS).find(key => 
        NETWORKS[key].chainId === fromChainId
      );
      const networkConfig = networkKey ? NETWORKS[networkKey] : null;

      // Get tokens for the current chain
      const chainTokens = tokensResponse.tokens[fromChainId] || [];
      console.log('[Swap] Loaded tokens:', chainTokens.length, 'for chain', fromChainId);

      // Format tokens for the current chain
      const formattedTokens = chainTokens.map((token: LiFiToken) => ({
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        address: token.address,
        chainId: fromChainId,
        balance: '0',
        price: Number(token.priceUSD || 0),
        change24h: 0,
        logoURI: token.logoURI || getTokenLogo(token.symbol, token.address, fromChainId),
        // Add chain info
        chainName: networkConfig?.name || getChainName(fromChainId),
        chainLogoURI: getTokenLogo('', '0x0000000000000000000000000000000000000000', fromChainId),
        blockExplorerUrl: networkConfig?.blockExplorerUrl
      } as Token));

      setAvailableTokens(formattedTokens);
      console.log('[Swap] Tokens loaded successfully. Sample tokens:', 
        formattedTokens.slice(0, 5).map(t => `${t.symbol} (${t.chainName})`).join(', '));

      // Set default tokens if none selected
      if (!fromToken) {
        // Try to find native token (ETH/MATIC/etc) for the selected chain
        const defaultToken = formattedTokens.find(t => 
          t.address === '0x0000000000000000000000000000000000000000' || t.symbol === 'ETH'
        );
        if (defaultToken) {
          console.log('[Swap] Setting default from token:', defaultToken.symbol, 'on', defaultToken.chainName);
          setFromToken(defaultToken);
        }
      }
      if (!toToken) {
        // Try to find USDC or USDT on the selected chain
        const defaultToken = formattedTokens.find(t => 
          t.symbol === 'USDC' || t.symbol === 'USDT'
        );
        if (defaultToken) {
          console.log('[Swap] Setting default to token:', defaultToken.symbol, 'on', defaultToken.chainName);
          setToToken(defaultToken);
        }
      }
    } catch (error) {
      console.error('[Swap] Error loading tokens:', error);
      Alert.alert('Error', 'Failed to load available tokens');
    }
  };

  const handleAmountChange = async (value: string) => {
    setAmount(value);
    if (fromToken && toToken && value) {
      try {
        setIsLoading(true);
        const quote = await getSwapQuote({
          fromChainId: fromToken.chainId,
          toChainId: toToken.chainId,
          fromTokenAddress: fromToken.address,
          toTokenAddress: toToken.address,
          fromAmount: value,
          fromAddress: currentAccount?.address || '',
          toAddress: currentAccount?.address || '',
          slippage: parseFloat(slippage) / 100 // Convert percentage to decimal
        });
        setCurrentQuote(quote);
        setEstimatedOutput(quote.estimate.toAmount);
      } catch (error) {
        console.error('Error getting quote:', error);
        Alert.alert('Error', 'Failed to get swap quote');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSwap = async () => {
    if (!currentQuote || !fromToken || !currentAccount?.address) {
      Alert.alert('Error', 'Missing required data for swap');
      return;
    }

    try {
      setIsLoading(true);

      // Get wallet data from SecureStore
      const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      if (!walletDataStr) {
        throw new Error('No wallet data found');
      }

      const walletData = JSON.parse(walletDataStr);
      if (!walletData.privateKey) {
        throw new Error('No private key found in wallet data');
      }

      // Create provider instance
      const provider = new ethers.JsonRpcProvider(config.alchemy.rpcUrl());
      const wallet = new ethers.Wallet(walletData.privateKey, provider);

      // 1. Check token allowance first
      const allowance = await checkTokenAllowance(
        {
          ...fromToken,
          chainId: fromToken.chainId,
          address: fromToken.address as `0x${string}`,
          priceUSD: Number(fromToken.price)
        },
        currentAccount.address as `0x${string}`,
        (currentQuote.estimate.approvalAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`
      );

      // 2. If allowance is insufficient, request approval
      if (allowance === undefined || allowance < BigInt(currentQuote.estimate.fromAmount)) {
        await approveToken(
          wallet as any, // Type assertion needed for compatibility
          {
            ...fromToken,
            chainId: fromToken.chainId,
            address: fromToken.address as `0x${string}`,
            priceUSD: Number(fromToken.price)
          },
          (currentQuote.estimate.approvalAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`,
          BigInt(currentQuote.estimate.fromAmount)
        );
      }

      // 3. Execute the swap
      const txHash = await executeSwap(currentQuote);
      Alert.alert('Success', `Swap executed successfully!\nTransaction: ${txHash}`);
      
      // 4. Refresh token balances
      await loadWalletData();
      
    } catch (error) {
      console.error('Error executing swap:', error);
      Alert.alert('Error', 'Failed to execute swap');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTokenList = (isFromToken: boolean) => {
    const filteredTokens = availableTokens.filter(token => 
      token.chainId === (isFromToken ? fromChainId : toChainId)
    );

    return (
      <Modal
        animationType="none"
        transparent={true}
        visible={isFromToken ? showFromTokenList : showToTokenList}
        onRequestClose={handleCloseModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View 
                style={[
                  styles.modalContainer,
                  {
                    transform: [{ translateY: slideAnim }],
                  }
                ]}
              >
                <Image
                  source={require('../assets/background.png')}
                  style={styles.modalBackground}
                />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {isFromToken ? 'From Token' : 'To Token'}
                  </Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleCloseModal}
                  >
                    <Ionicons name="close" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.modalList}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalListContent}
                >
                  {filteredTokens.map((token) => (
                    <TouchableOpacity
                      key={`${token.chainId}-${token.address}`}
                      style={[
                        styles.modalOption,
                        ((isFromToken ? fromToken : toToken)?.address === token.address) &&
                          styles.modalOptionSelected
                      ]}
                      onPress={() => {
                        if (isFromToken) {
                          setFromToken(token);
                        } else {
                          setToToken(token);
                        }
                        handleCloseModal();
                      }}
                    >
                      <View style={styles.chainSelectContent}>
                        <Image
                          source={{ uri: token.logoURI }}
                          style={styles.modalChainIcon}
                          defaultSource={require('../assets/favicon.png')}
                        />
                        <View style={styles.modalTokenInfo}>
                          <Text style={[
                            styles.modalOptionText,
                            ((isFromToken ? fromToken : toToken)?.address === token.address) &&
                              styles.modalOptionTextSelected
                          ]}>
                            {token.symbol}
                          </Text>
                          <Text style={styles.modalTokenName}>{token.name}</Text>
                        </View>
                      </View>
                      {((isFromToken ? fromToken : toToken)?.address === token.address) && (
                        <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  const renderChainSelector = () => {
    return (
      <Modal
        animationType="none"
        transparent={true}
        visible={showChainSelector !== null}
        onRequestClose={handleCloseModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View 
                style={[
                  styles.modalContainer,
                  {
                    transform: [{ translateY: slideAnim }],
                  }
                ]}
              >
                <Image
                  source={require('../assets/background.png')}
                  style={styles.modalBackground}
                />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {showChainSelector === 'from' ? 'From Chain' : 'To Chain'}
                  </Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleCloseModal}
                  >
                    <Ionicons name="close" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.modalList}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalListContent}
                >
                  {availableChains.map((chain) => (
                    <TouchableOpacity
                      key={chain.chainId}
                      style={[
                        styles.modalOption,
                        ((showChainSelector === 'from' && fromChainId === chain.chainId) ||
                          (showChainSelector === 'to' && toChainId === chain.chainId)) &&
                          styles.modalOptionSelected
                      ]}
                      onPress={() => handleChainSelect(chain)}
                    >
                      <View style={styles.chainSelectContent}>
                        <Image 
                          source={{ uri: chain.logoURI }} 
                          style={styles.modalChainIcon}
                          defaultSource={require('../assets/favicon.png')}
                        />
                        <Text style={[
                          styles.modalOptionText,
                          ((showChainSelector === 'from' && fromChainId === chain.chainId) ||
                            (showChainSelector === 'to' && toChainId === chain.chainId)) &&
                            styles.modalOptionTextSelected
                        ]}>
                          {chain.name}
                        </Text>
                      </View>
                      {((showChainSelector === 'from' && fromChainId === chain.chainId) ||
                        (showChainSelector === 'to' && toChainId === chain.chainId)) && (
                        <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  // Update the connections check function
  const checkAvailableConnections = async (fromChainId: number, toChainId: number) => {
    try {
      const connectionRequest: ConnectionsRequest = {
        fromChain: fromChainId,
        toChain: toChainId,
        allowSwitchChain: true,
        allowDestinationCall: true
      };

      const connections = await getConnections(connectionRequest);
      console.log('[Swap] Available connections:', {
        fromChain: fromChainId,
        toChain: toChainId,
        connections
      });

      // Return true if we have any connections
      return Object.keys(connections).length > 0;
    } catch (error) {
      console.error('Error checking connections:', error);
      return false;
    }
  };

  // Update chain selection handler to check connections
  const handleChainSelect = async (chain: Chain) => {
    if (showChainSelector === 'from') {
      setFromChainId(chain.chainId);
      if (toChainId) {
        const hasConnections = await checkAvailableConnections(chain.chainId, toChainId);
        if (!hasConnections) {
          Alert.alert('Warning', 'No available bridges or exchanges between selected chains');
        }
      }
    } else {
      setToChainId(chain.chainId);
      if (fromChainId) {
        const hasConnections = await checkAvailableConnections(fromChainId, chain.chainId);
        if (!hasConnections) {
          Alert.alert('Warning', 'No available bridges or exchanges between selected chains');
        }
      }
    }
    setShowChainSelector(null);
  };

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('../assets/background.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Swap</Text>
          </View>

          <View style={styles.swapContainer}>
            {/* From Chain Selector */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="git-network" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.settingLabel}>From Chain</Text>
              </View>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => {
                  setShowChainSelector('from');
                  slideAnim.setValue(MODAL_HEIGHT);
                }}
              >
                <View style={styles.chainSelectContent}>
                  <Image
                    source={{ uri: getTokenLogo('', '0x0000000000000000000000000000000000000000', fromChainId) }}
                    style={styles.chainIcon}
                    defaultSource={require('../assets/favicon.png')}
                  />
                  <Text style={styles.selectButtonText}>{getChainName(fromChainId)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* From Token Input */}
            <View style={styles.tokenInputContainer}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="wallet" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.settingLabel}>From Token</Text>
                </View>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => {
                    setShowFromTokenList(true);
                    slideAnim.setValue(MODAL_HEIGHT);
                  }}
                >
                  {fromToken ? (
                    <View style={styles.tokenSelectContent}>
                      <Image
                        source={{ uri: fromToken.logoURI }}
                        style={styles.tokenIcon}
                        defaultSource={require('../assets/favicon.png')}
                      />
                      <Text style={styles.selectButtonText}>{fromToken.symbol}</Text>
                    </View>
                  ) : (
                    <Text style={styles.selectButtonText}>Select Token</Text>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.tokenInput}
                placeholder="0.0"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholderTextColor={COLORS.white}
              />
            </View>

            {/* To Chain Selector */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="git-network" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.settingLabel}>To Chain</Text>
              </View>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => {
                  setShowChainSelector('to');
                  slideAnim.setValue(MODAL_HEIGHT);
                }}
              >
                <View style={styles.chainSelectContent}>
                  <Image
                    source={{ uri: getTokenLogo('', '0x0000000000000000000000000000000000000000', toChainId) }}
                    style={styles.chainIcon}
                    defaultSource={require('../assets/favicon.png')}
                  />
                  <Text style={styles.selectButtonText}>{getChainName(toChainId)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* To Token Input */}
            <View style={styles.tokenInputContainer}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="wallet" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.settingLabel}>To Token</Text>
                </View>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => {
                    setShowToTokenList(true);
                    slideAnim.setValue(MODAL_HEIGHT);
                  }}
                >
                  {toToken ? (
                    <View style={styles.tokenSelectContent}>
                      <Image
                        source={{ uri: toToken.logoURI }}
                        style={styles.tokenIcon}
                        defaultSource={require('../assets/favicon.png')}
                      />
                      <Text style={styles.selectButtonText}>{toToken.symbol}</Text>
                    </View>
                  ) : (
                    <Text style={styles.selectButtonText}>Select Token</Text>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.tokenInput}
                placeholder="0.0"
                value={estimatedOutput}
                editable={false}
                placeholderTextColor={COLORS.white}
              />
            </View>

            {/* Slippage Settings */}
            <View style={styles.slippageContainer}>
              <Text style={styles.slippageLabel}>Slippage Tolerance</Text>
              <View style={styles.slippageButtons}>
                {['0.1', '0.5', '1.0', '3.0'].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.slippageButton,
                      slippage === value && styles.slippageButtonActive
                    ]}
                    onPress={() => setSlippage(value)}
                  >
                    <Text style={[
                      styles.slippageButtonText,
                      slippage === value && styles.slippageButtonTextActive
                    ]}>
                      {value}%
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.slippageButton,
                    !['0.1', '0.5', '1.0', '3.0'].includes(slippage) && styles.slippageButtonActive
                  ]}
                  onPress={() => {
                    const value = prompt('Enter custom slippage (0.1-5.0):');
                    if (value && !isNaN(parseFloat(value)) && parseFloat(value) >= 0.1 && parseFloat(value) <= 5.0) {
                      setSlippage(value);
                    }
                  }}
                >
                  <Text style={styles.slippageButtonText}>Custom</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Swap Button */}
            <TouchableOpacity
              style={[
                styles.swapButton,
                (!fromToken || !toToken || !amount || isLoading) && styles.swapButtonDisabled
              ]}
              onPress={handleSwap}
              disabled={!fromToken || !toToken || !amount || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.swapButtonText}>Swap</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Modals */}
          {renderTokenList(true)}
          {renderTokenList(false)}
          {renderChainSelector()}

          <BottomNav activeTab="pay" />
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl * 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  swapContainer: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  selectButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  tokenSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  tokenInputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  tokenIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  tokenInput: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: SPACING.sm,
  },
  slippageContainer: {
    gap: SPACING.sm,
  },
  slippageLabel: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.7,
  },
  slippageButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  slippageButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  slippageButtonActive: {
    backgroundColor: COLORS.primary,
  },
  slippageButtonText: {
    color: COLORS.white,
    fontSize: 14,
  },
  slippageButtonTextActive: {
    fontWeight: '600',
  },
  swapButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  swapButtonDisabled: {
    opacity: 0.5,
  },
  swapButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    height: MODAL_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: SPACING.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalList: {
    flex: 1,
  },
  modalListContent: {
    padding: SPACING.lg,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalOptionText: {
    fontSize: 16,
    color: COLORS.white,
  },
  modalOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  chainSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  modalChainIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  modalTokenInfo: {
    flex: 1,
  },
  modalTokenName: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.7,
  },
  chainIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});

export default Swap; 