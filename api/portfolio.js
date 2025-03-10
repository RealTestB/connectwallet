import { fetchTokenPrice, fetchTokenChartData } from "../api/pricingApi";
import { useState, useEffect } from "react";

const PortfolioScreen = ({ selectedToken = "ETH", selectedFiat = "USD" }) => {
  const [tokenData, setTokenData] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      // Fetch latest token price in selected fiat
      const priceInfo = await fetchTokenPrice(selectedToken, selectedFiat);
      setTokenData(priceInfo);

      // Fetch historical data for charts
      const historicalData = await fetchTokenChartData(selectedToken, selectedFiat, "30d");
      setChartData(historicalData);
    };

    loadData();
  }, [selectedToken, selectedFiat]); // Reload data when token/fiat changes

  return (
    <View>
      {/* Display token info */}
      {tokenData && (
        <Text>
          {selectedToken} Price: {tokenData.price} {selectedFiat}
        </Text>
      )}

      {/* Display chart here using chartData */}
    </View>
  );
};

export default PortfolioScreen;
