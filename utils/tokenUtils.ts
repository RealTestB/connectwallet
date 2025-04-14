import { getChainPath } from '../constants/chains';

export const calculateTokenBalanceUSD = (
  balance: string,
  priceUSD: string,
  decimals: number
): string => {
  try {
    const balanceNum = parseFloat(balance);
    const priceNum = parseFloat(priceUSD);
    
    // If balance is already in token units (like ETH), don't adjust decimals
    const adjustedBalance = balanceNum;
    
    const usdValue = adjustedBalance * priceNum;
    console.log('Calculating USD value:', {
      balance,
      priceUSD,
      decimals,
      balanceNum,
      priceNum,
      adjustedBalance,
      usdValue
    });
    
    return usdValue.toFixed(2);
  } catch (error) {
    console.error('Error calculating USD value:', error);
    return '0.00';
  }
};

export const getTokenLogo = (symbol: string, tokenAddress: string, chainId: number = 1): any => {
  // For native tokens and chain icons
  if (tokenAddress === "0x0000000000000000000000000000000000000000") {
    switch (chainId) {
      case 137:
        return require('../assets/images/polygon.png');
      case 42161:
        return require('../assets/images/arbitrum.png');
      case 10:
        return require('../assets/images/optimism.png');
      case 56:
        return require('../assets/images/bnb.png');
      case 43114:
        return require('../assets/images/avalanche.png');
      case 8453:
        return require('../assets/images/base.png');
      default:
        return require('../assets/images/ethereum.png');
    }
  }

  // For tokens, try 1inch API first
  const chainPath = getChainPath(chainId);
  return { uri: chainId === 1 ? 
    `https://tokens.1inch.io/${tokenAddress.toLowerCase()}.png` : 
    `https://tokens.1inch.io/${chainPath}/${tokenAddress.toLowerCase()}.png` };
}; 