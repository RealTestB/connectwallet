import { Network } from 'alchemy-sdk';
import config from './config';

export interface TokenPrice {
  symbol: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: string;
}

export interface TokenPriceResponse {
  [symbol: string]: TokenPrice;
}

export interface CoinMarketCapQuote {
  price: number;
  volume_24h: number;
  volume_change_24h: number;
  percent_change_1h: number;
  percent_change_24h: number;
  percent_change_7d: number;
  market_cap: number;
  market_cap_dominance: number;
  fully_diluted_market_cap: number;
  last_updated: string;
}

export interface CoinMarketCapResponse {
  data: {
    [id: string]: {
      id: number;
      name: string;
      symbol: string;
      slug: string;
      is_active: number;
      is_fiat: number;
      circulating_supply: number;
      total_supply: number;
      max_supply: number;
      date_added: string;
      num_market_pairs: number;
      cmc_rank: number;
      last_updated: string;
      tags: string[];
      platform: null | {
        id: number;
        name: string;
        symbol: string;
        slug: string;
        token_address: string;
      };
      quote: {
        USD: CoinMarketCapQuote;
      };
    };
  };
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
    elapsed: number;
    credit_count: number;
  };
}

/**
 * Make a request to CoinMarketCap API using XMLHttpRequest
 */
const makeCoinMarketCapRequest = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 30000; // 30 second timeout

    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState !== 4) return;

      // Handle network errors
      if (xhr.status === 0) {
        reject(new Error('Network error occurred'));
        return;
      }

      try {
        const response = xhr.responseText ? JSON.parse(xhr.responseText) : null;

        // Handle successful response
        if (xhr.status >= 200 && xhr.status < 300 && response) {
          resolve(response);
        } else {
          reject(new Error(response?.error || `HTTP error! status: ${xhr.status}`));
        }
      } catch (error) {
        reject(new Error('Failed to parse response'));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Request failed'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Request timed out'));
    });

    xhr.open('GET', url);
    xhr.setRequestHeader('X-CMC_PRO_API_KEY', config.apiKeys.cmcKey);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.send();
  });
};

/**
 * Get token prices from CoinMarketCap
 */
export const getTokenPrices = async (
  addresses: string[],
  network: Network = Network.ETH_MAINNET
): Promise<TokenPriceResponse> => {
  try {
    const chainParam = network === Network.ETH_MAINNET ? 'ETH' : 'MATIC';
    const addressList = addresses.join(',');

    const data = await makeCoinMarketCapRequest(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?address=${addressList}&chain=${chainParam}`
    ) as CoinMarketCapResponse;

    const prices: TokenPriceResponse = {};

    Object.values(data.data).forEach(token => {
      const quote = token.quote.USD;
      prices[token.symbol] = {
        symbol: token.symbol,
        price: quote.price,
        change24h: quote.percent_change_24h,
        marketCap: quote.market_cap,
        volume24h: quote.volume_24h,
        lastUpdated: quote.last_updated
      };
    });

    return prices;
  } catch (error) {
    console.error('Failed to fetch token prices:', error);
    throw error;
  }
};

/**
 * Get token price history from CoinMarketCap
 */
export const getTokenPriceHistory = async (
  address: string,
  network: Network = Network.ETH_MAINNET,
  timeframe: '24h' | '7d' | '30d' | '3m' | '1y' = '7d'
): Promise<{
  prices: Array<{ timestamp: number; price: number }>;
  change: number;
}> => {
  try {
    const chainParam = network === Network.ETH_MAINNET ? 'ETH' : 'MATIC';
    const interval = timeframe === '24h' ? '1h' : '1d';

    const data = await makeCoinMarketCapRequest(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/historical?address=${address}&chain=${chainParam}&interval=${interval}&count=${timeframe === '24h' ? 24 : 30}`
    );

    const quotes = data.data[Object.keys(data.data)[0]].quotes;

    const prices = quotes.map((quote: any) => ({
      timestamp: new Date(quote.timestamp).getTime(),
      price: quote.quote.USD.price
    }));

    const firstPrice = prices[0].price;
    const lastPrice = prices[prices.length - 1].price;
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    return {
      prices,
      change
    };
  } catch (error) {
    console.error('Failed to fetch token price history:', error);
    throw error;
  }
}; 