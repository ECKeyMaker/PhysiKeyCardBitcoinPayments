/**
 * Visibility of the Android "Ready to Scan" prompt. iOS shows its own system NFC sheet, so the
 * prompt is only opened on Android. Closing it cancels the pending NFC request.
 */

import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { cancelNfc } from '../functions/nfc';

const useScanModal = () => {
  const [scanModal, setScanModal] = useState(false);

  const openScanModal = useCallback(() => {
    if (Platform.OS === 'android') {
      setScanModal(true);
    }
  }, []);

  const closeScanModal = useCallback(() => {
    setScanModal(false);
    cancelNfc();
  }, []);

  /** Shows the prompt while `task` runs, then hides it. */
  const withScanModal = useCallback(
    async <T>(task: () => Promise<T>): Promise<T> => {
      openScanModal();
      try {
        return await task();
      } finally {
        setScanModal(false);
      }
    },
    [openScanModal],
  );

  return { scanModal, closeScanModal, withScanModal };
};

export default useScanModal;
