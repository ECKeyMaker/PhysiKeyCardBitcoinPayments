/** Loads the BTC → USD rate once per mount. `rate` stays null if the price API is unreachable. */

import { useCallback, useEffect, useState } from 'react';
import { getBtcUsdRate } from '../functions/convertBitcoin';

const useBtcPrice = () => {
  const [rate, setRate] = useState<number | null>(null);

  const refreshRate = useCallback(async () => {
    try {
      setRate(await getBtcUsdRate());
    } catch {
      setRate(null);
    }
  }, []);

  useEffect(() => {
    refreshRate();
  }, [refreshRate]);

  return { rate, refreshRate };
};

export default useBtcPrice;
