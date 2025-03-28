interface CoinGeckoResponse {
  [key: string]: {
    usd: number;
    usd_24hr_change: number;
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

const COINGECKO_API_KEY = 'CG-VCXZAmb9rowc8iR9nmbeMvkE';
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
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

export const getTokenPrice = async (address: string): Promise<TokenPrice | null> => {
  try {
    const isNativeEth = address === '0x0000000000000000000000000000000000000000';
    
    // For ETH we use /simple/price, for tokens we use /simple/token_price/ethereum
    const url = isNativeEth
      ? `${COINGECKO_BASE_URL}/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true&x_cg_demo_api_key=${COINGECKO_API_KEY}`
      : `${COINGECKO_BASE_URL}/simple/token_price/ethereum?contract_addresses=${address}&vs_currencies=usd&include_24hr_change=true&x_cg_demo_api_key=${COINGECKO_API_KEY}`;
    
    console.log('[CoinGeckoAPI] Making price request to:', url);

    const data = await makeCoinGeckoRequest(url);
    console.log('[CoinGeckoAPI] Raw price response:', data);
    
    if (isNativeEth) {
      if (!data?.ethereum?.usd) {
        console.error('[CoinGeckoAPI] No ETH price data in response:', data);
        return null;
      }
      const priceData = {
        price: data.ethereum.usd,
        change24h: data.ethereum.usd_24h_change || 0
      };
      console.log('[CoinGeckoAPI] Parsed ETH price data:', priceData);
      return priceData;
    }
    
    const tokenData = data[address.toLowerCase()];
    if (!tokenData?.usd) {
      console.error('[CoinGeckoAPI] No token price data in response:', data);
      return null;
    }
    
    const priceData = {
      price: tokenData.usd,
      change24h: tokenData.usd_24h_change || 0
    };
    console.log('[CoinGeckoAPI] Parsed token price data:', priceData);
    return priceData;
  } catch (error) {
    console.error('[CoinGeckoAPI] Error in price request:', error);
    return null;
  }
};

export const getTokenPriceHistory = async (address: string): Promise<PriceHistoryResponse> => {
  try {
    const isNativeEth = address === '0x0000000000000000000000000000000000000000';
    
    // For ETH we use /coins/ethereum/market_chart, for tokens we use /coins/ethereum/contract/{address}/market_chart
    const url = isNativeEth 
      ? `${COINGECKO_BASE_URL}/coins/ethereum/market_chart?vs_currency=usd&days=1&x_cg_demo_api_key=${COINGECKO_API_KEY}`
      : `${COINGECKO_BASE_URL}/coins/ethereum/contract/${address}/market_chart?vs_currency=usd&days=1&x_cg_demo_api_key=${COINGECKO_API_KEY}`;
    
    console.log('[CoinGeckoAPI] Making history request to:', url);

    const data = await makeCoinGeckoRequest(url);
    console.log('[CoinGeckoAPI] Raw history response:', data);
    
    if (!data?.prices?.length) {
      console.error('[CoinGeckoAPI] No price history data found:', data);
      return {
        prices: [],
        market_caps: [],
        total_volumes: []
      };
    }
    
    console.log('[CoinGeckoAPI] Found price history points:', data.prices.length);
    return data as PriceHistoryResponse;
  } catch (error) {
    console.error('[CoinGeckoAPI] Error in history request:', error);
    return {
      prices: [],
      market_caps: [],
      total_volumes: []
    };
  }
}; 