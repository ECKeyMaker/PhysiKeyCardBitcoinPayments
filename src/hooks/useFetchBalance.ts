/**
 * Fetches the balance of an address and keeps it up to date while the screen is open.
 * Call `fetchBalance()` to refresh manually (pull to refresh, after a payment).
 */

import { useCallback, useEffect, useState } from 'react';
import { getBalance, type Balance } from '../functions/esplora';

interface FetchBalanceResult {
  balance: Balance | null;
  loading: boolean;
  error: string | null;
  fetchBalance: () => Promise<void>;
}

const useFetchBalance = (address: string): FetchBalanceResult => {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    try {
      setBalance(await getBalance(address));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, error, fetchBalance };
};

export default useFetchBalance;
