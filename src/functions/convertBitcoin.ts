/** BTC → USD price from CoinGecko's free API. Used for display and the per-transfer USD limit. */

const PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';

export const getBtcUsdRate = async (): Promise<number> => {
  const response = await fetch(PRICE_URL);
  if (!response.ok) {
    throw new Error(`Price API error ${response.status}`);
  }
  const data = await response.json();
  const rate = data?.bitcoin?.usd;
  if (typeof rate !== 'number' || rate <= 0) {
    throw new Error('Invalid response from the price API.');
  }
  return rate;
};
