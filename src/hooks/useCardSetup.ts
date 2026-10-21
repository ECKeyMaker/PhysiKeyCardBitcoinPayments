/**
 * New card setup: write a random secret to a blank card, derive its wallet, then lock the card.
 * Steps: 0 choose password → 1 tap again to lock → 2 save account (optional) and log in.
 */

import { useCallback, useState } from 'react';
import { deriveAddress } from '../functions/deriveKey';
import enablePassword from '../functions/enablePassword';
import errorMessage from '../functions/errorMessage';
import { isNfcCancel, writeCardSecret } from '../functions/nfc';
import useScanModal from './useScanModal';

const useCardSetup = () => {
  const { scanModal, closeScanModal, withScanModal } = useScanModal();
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (task: () => Promise<void>) => {
    setError(null);
    try {
      await task();
    } catch (e) {
      if (!isNfcCancel(e)) {
        setError(errorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  /** Writes the card and derives its address. The card secret never leaves this function. */
  const writeCard = (password: string) =>
    run(async () => {
      const secret = await withScanModal(writeCardSecret);
      setBusy(true);
      /** DO NOT CHANGE CARD + PASSWORD ORDER */
      setAddress(await deriveAddress(secret, password));
      setStep(1);
    });

  const lockCard = () =>
    run(async () => {
      await withScanModal(enablePassword);
      setStep(2);
    });

  const reset = useCallback(() => {
    setStep(0);
    setAddress('');
    setError(null);
  }, []);

  return { step, address, busy, error, writeCard, lockCard, reset, skipLock: () => setStep(2), scanModal, closeScanModal };
};

export default useCardSetup;
