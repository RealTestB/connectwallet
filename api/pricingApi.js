import Constants from 'expo-constants';
import config from './config';

const CMC_API_KEY = Constants.expoConfig.extra.CMC_API_KEY;

export { CMC_API_KEY };

// CoinMarketCap Fiat Currency Mapping
const FIAT_CURRENCY_IDS = {
  USD: 2781,
  EUR: 2790,
  GBP: 2791,
  JPY: 2797,
  AUD: 2782,
  CAD: 2784,
  INR: 2796,
  CNY: 2787,
  RUB: 2806,
  BRL: 2783,
  // Add more currencies if needed
};

// Get CoinMarketCap ID for a Fiat Currency
const getFiatCurrencyId = (fiat) => FIAT_CURRENCY_IDS[fiat] || FIAT_CURRENCY_IDS["USD"];

// Fetch CoinMarketCap ID for a Token Symbol
export const fetchCoinMarketCapId = async (symbol) => {
  try {
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?symbol=${symbol}`,
      {
        headers: {
          "X-CMC_PRO_API_KEY": CMC_API_KEY,
        },
      }
    );
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      return data.data[0].id; // Returns CoinMarketCap ID
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch CoinMarketCap ID:", error);
    return null;
  }
};

// Fetch Real-Time Token Price in Any Fiat Currency
export const fetchTokenPrice = async (symbol, fiat = "USD") => {
  try {
    const coinId = await fetchCoinMarketCapId(symbol);
    const fiatId = getFiatCurrencyId(fiat);

    if (!coinId) {
      console.warn(`No CoinMarketCap ID found for ${symbol}`);
      return null;
    }

    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=${coinId}&convert_id=${fiatId}`,
      {
        headers: {
          "X-CMC_PRO_API_KEY": CMC_API_KEY,
        },
      }
    );

    const data = await response.json();
    const tokenData = data.data[coinId]?.quote[fiatId];

    return {
      price: tokenData?.price || 0,
      marketCap: tokenData?.market_cap || 0,
      volume24h: tokenData?.volume_24h || 0,
      percentChange1h: tokenData?.percent_change_1h || 0,
      percentChange24h: tokenData?.percent_change_24h || 0,
      percentChange7d: tokenData?.percent_change_7d || 0,
      percentChange30d: tokenData?.percent_change_30d || 0,
      circulatingSupply: tokenData?.circulating_supply || 0,
      totalSupply: tokenData?.total_supply || 0,
      maxSupply: tokenData?.max_supply || null,
    };
  } catch (error) {
    console.error("Failed to fetch token price:", error);
    return null;
  }
};

// Fetch Global Market Metrics (Market Cap, BTC Dominance) in Any Fiat
export const fetchGlobalMarketMetrics = async (fiat = "USD") => {
  try {
    const fiatId = getFiatCurrencyId(fiat);
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest?convert_id=${fiatId}`,
      {
        headers: {
          "X-CMC_PRO_API_KEY": CMC_API_KEY,
        },
      }
    );

    const data = await response.json();
    const globalData = data.data;

    return {
      totalMarketCap: globalData.quote[fiatId]?.total_market_cap || 0,
      totalVolume24h: globalData.quote[fiatId]?.total_volume_24h || 0,
      btcDominance: globalData.btc_dominance || 0,
      ethDominance: globalData.eth_dominance || 0,
    };
  } catch (error) {
    console.error("Failed to fetch global market metrics:", error);
    return null;
  }
};

export const getTokenPrice = async (symbol) => {
    try {
        const response = await fetch(
            `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}`,
            {
                headers: {
                    'X-CMC_PRO_API_KEY': config.apiKeys.cmcKey
                }
            }
        );
        // ... rest of the code ...
    } catch (error) {
        console.error("Failed to fetch token price:", error);
        return null;
    }
};
