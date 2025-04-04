import { ChainId } from '../constants/chains';

interface CoinGeckoResponse {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
    usd_24hr_vol?: number;
  };
}

interface TokenPrice {
  price: number;
  change24h: number;
}

interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
}

interface PriceHistoryResponse {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

interface CoinGeckoTokenInfo {
  id: string;
  symbol: string;
  name: string;
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  description?: {
    en?: string;
  };
  links?: {
    homepage?: string[];
    blockchain_site?: string[];
  };
}

const TIMEOUT_MS = 30000; // 30 second timeout

const makeCoinGeckoRequest = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Add API key as query parameter
    const urlWithKey = `${url}${url.includes('?') ? '&' : '?'}x_cg_demo_api_key=${COINGECKO_API_KEY}`;
    console.log('[CoinGeckoAPI] Making request to:', urlWithKey);
    
    const xhr = new XMLHttpRequest();
    xhr.timeout = TIMEOUT_MS;
    
    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState !== 4) return;
      
      console.log('[CoinGeckoAPI] Response received:', {
        status: xhr.status,
        statusText: xhr.statusText,
        hasResponse: !!xhr.responseText
      });
      
      if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
        try {
          const response = JSON.parse(xhr.responseText);
          console.log('[CoinGeckoAPI] Successfully parsed response');
          resolve(response);
        } catch (error) {
          const errorMsg = 'Failed to parse response';
          console.error('[CoinGeckoAPI]', errorMsg, error);
          reject(new Error(errorMsg));
        }
      } else {
        const errorMsg = `Request failed with status ${xhr.status}`;
        console.error('[CoinGeckoAPI]', errorMsg, {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText
        });
        reject(new Error(errorMsg));
      }
    });

    xhr.addEventListener('error', () => {
      const errorMsg = 'Network request failed';
      console.error('[CoinGeckoAPI]', errorMsg);
      reject(new Error(errorMsg));
    });

    xhr.addEventListener('timeout', () => {
      const errorMsg = `Request timed out after ${TIMEOUT_MS}ms`;
      console.error('[CoinGeckoAPI]', errorMsg);
      reject(new Error(errorMsg));
    });

    try {
      xhr.open('GET', urlWithKey);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();
    } catch (error) {
      const errorMsg = 'Failed to send request';
      console.error('[CoinGeckoAPI]', errorMsg, error);
      reject(new Error(errorMsg));
    }
  });
};

// Map of chain IDs to CoinGecko platform IDs
export const CHAIN_TO_PLATFORM: Record<ChainId, string> = {
  1: 'ethereum',
  137: 'polygon-pos',
  42161: 'arbitrum-one',
  10: 'optimistic-ethereum',
  56: 'binance-smart-chain',
  43114: 'avalanche',
  8453: 'base'
};

// Map of native token IDs for each chain
export const NATIVE_TOKEN_IDS: Record<ChainId, string> = {
  1: 'ethereum',
  137: 'matic-network',
  42161: 'ethereum',
  10: 'ethereum',
  56: 'binancecoin',
  43114: 'avalanche-2',
  8453: 'ethereum'
};

// Map of wrapped native token addresses for each chain
const WRAPPED_NATIVE_ADDRESSES: Record<ChainId, string> = {
  1: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  137: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // WMATIC
  42161: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH
  10: '0x4200000000000000000000000000000000000006', // WETH
  56: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', // WBNB
  43114: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7', // WAVAX
  8453: '0x4200000000000000000000000000000000000006'  // WETH
};

export const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
export const COINGECKO_API_KEY = 'CG-VCXZAmb9rowc8iR9nmbeMvkE';

export const getTokenPrice = async (contractAddress: string, chainId: ChainId): Promise<TokenPrice | null> => {
  try {
    console.log('[CoinGeckoAPI] Getting token price:', { contractAddress, chainId });
    const platform = CHAIN_TO_PLATFORM[chainId];
    console.log('[CoinGeckoAPI] Using platform:', platform);
    
    // Handle native token
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      const tokenId = NATIVE_TOKEN_IDS[chainId];
      console.log('[CoinGeckoAPI] Getting native token price for:', { tokenId, chainId });
      
      if (!tokenId) {
        console.error('[CoinGeckoAPI] No token ID found for chain:', chainId);
        return null;
      }

      const url = `${COINGECKO_BASE_URL}/simple/price?ids=${tokenId}&vs_currencies=usd&include_24hr_change=true`;
      console.log('[CoinGeckoAPI] Making native token price request:', url);
      
      const response = await makeCoinGeckoRequest(url);
      console.log('[CoinGeckoAPI] Native token price response:', response);

      if (!response[tokenId]?.usd) {
        console.error('[CoinGeckoAPI] No token price data in response:', response);
        return null;
      }

      return {
        price: response[tokenId].usd,
        change24h: response[tokenId].usd_24h_change || 0
      };
    }

    // Handle wrapped native token (like WETH) - use native token price
    if (WRAPPED_NATIVE_ADDRESSES[chainId]?.toLowerCase() === contractAddress.toLowerCase()) {
      const tokenId = NATIVE_TOKEN_IDS[chainId];
      console.log('[CoinGeckoAPI] Getting wrapped native token price for:', { tokenId, chainId });
      
      if (!tokenId) {
        console.error('[CoinGeckoAPI] No token ID found for wrapped token on chain:', chainId);
        return null;
      }

      const url = `${COINGECKO_BASE_URL}/simple/price?ids=${tokenId}&vs_currencies=usd&include_24hr_change=true`;
      console.log('[CoinGeckoAPI] Making wrapped token price request:', url);
      
      const response = await makeCoinGeckoRequest(url);
      console.log('[CoinGeckoAPI] Wrapped token price response:', response);

      if (!response[tokenId]?.usd) {
        console.error('[CoinGeckoAPI] No token price data in response:', response);
        return null;
      }

      return {
        price: response[tokenId].usd,
        change24h: response[tokenId].usd_24h_change || 0
      };
    }

    // Handle other tokens
    if (!platform) {
      console.error('[CoinGeckoAPI] No platform found for chain:', chainId);
      return null;
    }

    const url = `${COINGECKO_BASE_URL}/simple/token_price/${platform}?contract_addresses=${contractAddress}&vs_currencies=usd&include_24hr_change=true`;
    console.log('[CoinGeckoAPI] Making token price request:', url);
    
    const response = await makeCoinGeckoRequest(url);
    console.log('[CoinGeckoAPI] Token price response:', response);

    if (!response[contractAddress.toLowerCase()]) {
      console.error('[CoinGeckoAPI] No token price data in response:', response);
      return null;
    }

    return {
      price: response[contractAddress.toLowerCase()].usd,
      change24h: response[contractAddress.toLowerCase()].usd_24h_change || 0
    };
  } catch (error) {
    console.error('[CoinGeckoAPI] Error fetching token price:', error);
    return null;
  }
};

export const getTokenPriceHistory = async (contractAddress: string, chainId: ChainId): Promise<PriceHistoryResponse> => {
  try {
    const platform = CHAIN_TO_PLATFORM[chainId];

    // Handle native token
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      const tokenId = NATIVE_TOKEN_IDS[chainId];
      if (!tokenId) return {
        prices: [],
        market_caps: [],
        total_volumes: []
      };

      const url = `${COINGECKO_BASE_URL}/coins/${tokenId}/market_chart?vs_currency=usd&days=1`;
      const response = await makeCoinGeckoRequest(url);
      
      if (!response?.prices?.length) {
        console.error('[CoinGeckoAPI] No native token price history data found:', response);
        return {
          prices: [],
          market_caps: [],
          total_volumes: []
        };
      }
      return response as PriceHistoryResponse;
    }

    // Handle wrapped native token (like WETH) - use native token price history
    if (WRAPPED_NATIVE_ADDRESSES[chainId]?.toLowerCase() === contractAddress.toLowerCase()) {
      const tokenId = NATIVE_TOKEN_IDS[chainId];
      if (!tokenId) return {
        prices: [],
        market_caps: [],
        total_volumes: []
      };

      const url = `${COINGECKO_BASE_URL}/coins/${tokenId}/market_chart?vs_currency=usd&days=1`;
      const response = await makeCoinGeckoRequest(url);
      
      if (!response?.prices?.length) {
        console.error('[CoinGeckoAPI] No native token price history data found:', response);
        return {
          prices: [],
          market_caps: [],
          total_volumes: []
        };
      }
      return response as PriceHistoryResponse;
    }

    // Handle other tokens
    if (!platform) return {
      prices: [],
      market_caps: [],
      total_volumes: []
    };

    const url = `${COINGECKO_BASE_URL}/coins/${platform}/contract/${contractAddress}/market_chart?vs_currency=usd&days=1`;
    const response = await makeCoinGeckoRequest(url);
    
    if (!response?.prices?.length) {
      console.error('[CoinGeckoAPI] No token price history data found:', response);
      return {
        prices: [],
        market_caps: [],
        total_volumes: []
      };
    }
    return response as PriceHistoryResponse;
  } catch (error) {
    console.error('[CoinGeckoAPI] Error in history request:', error);
    return {
      prices: [],
      market_caps: [],
      total_volumes: []
    };
  }
};

export const getTokenInfo = async (contractAddress: string, chainId: ChainId): Promise<CoinGeckoTokenInfo | null> => {
  try {
    console.log('[CoinGeckoAPI] Getting token info:', { contractAddress, chainId });
    const platform = CHAIN_TO_PLATFORM[chainId];
    
    // Handle native token
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      const tokenId = NATIVE_TOKEN_IDS[chainId];
      if (!tokenId) {
        console.error('[CoinGeckoAPI] No token ID found for chain:', chainId);
        return null;
      }

      const url = `${COINGECKO_BASE_URL}/coins/${tokenId}`;
      console.log('[CoinGeckoAPI] Making native token info request:', url);
      
      const response = await makeCoinGeckoRequest(url);
      return response as CoinGeckoTokenInfo;
    }

    // Handle wrapped native token
    if (WRAPPED_NATIVE_ADDRESSES[chainId]?.toLowerCase() === contractAddress.toLowerCase()) {
      const tokenId = NATIVE_TOKEN_IDS[chainId];
      if (!tokenId) {
        console.error('[CoinGeckoAPI] No token ID found for wrapped token on chain:', chainId);
        return null;
      }

      const url = `${COINGECKO_BASE_URL}/coins/${tokenId}`;
      console.log('[CoinGeckoAPI] Making wrapped token info request:', url);
      
      const response = await makeCoinGeckoRequest(url);
      return response as CoinGeckoTokenInfo;
    }

    // Handle other tokens
    if (!platform) {
      console.error('[CoinGeckoAPI] No platform found for chain:', chainId);
      return null;
    }

    const url = `${COINGECKO_BASE_URL}/coins/${platform}/contract/${contractAddress}`;
    console.log('[CoinGeckoAPI] Making token info request:', url);
    
    const response = await makeCoinGeckoRequest(url);
    return response as CoinGeckoTokenInfo;
  } catch (error) {
    console.error('[CoinGeckoAPI] Error fetching token info:', error);
    return null;
  }
}; 