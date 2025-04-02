export const calculateTokenBalanceUSD = (
  balance: string,
  priceUSD: string,
  decimals: number
): string => {
  const balanceNum = parseFloat(balance);
  const priceNum = parseFloat(priceUSD);
  const adjustedBalance = balanceNum / Math.pow(10, decimals);
  return (adjustedBalance * priceNum).toFixed(2);
}; 