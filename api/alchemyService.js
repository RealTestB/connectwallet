import Constants from 'expo-constants';

const ALCHEMY_ETH_MAINNET_KEY = Constants.expoConfig.extra.ALCHEMY_ETH_MAINNET_KEY;

export { ALCHEMY_ETH_MAINNET_KEY };
export const fetchAlchemyTransactions = async (walletAddress) => {
  try {
    const response = await fetch(
      `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_ETH_MAINNET_KEY}`,
      {
        method: "POST",
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "alchemy_getAssetTransfers",
          params: [
            {
              fromBlock: "0x0",
              toAddress: walletAddress,
              category: ["external", "erc20", "erc721"],
            },
          ],
        }),
      }
    );
    const data = await response.json();
    return data.result.transfers || [];
  } catch (error) {
    console.error("Failed to fetch Alchemy transactions:", error);
    return [];
  }
};
