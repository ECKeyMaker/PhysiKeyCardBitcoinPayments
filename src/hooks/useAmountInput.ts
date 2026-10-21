/**
 * State and validation for a BTC amount field: parses to satoshis, shows the USD value and
 * enforces the minimum amount and the per-transfer USD limit (MAX_TRANSFER_USD).
 */

import { useCallback, useState } from 'react';
import config from '../functions/config';
import { formatBtc, MIN_SEND_SATS, parseBtcAmount, satsToUsd } from '../functions/bitcoin';

const useAmountInput = (rate: number | null) => {
  const [text, setText] = useState('');
  const reset = useCallback(() => setText(''), []);
  const parsed = parseBtcAmount(text);
  const usd = parsed !== null && rate !== null ? satsToUsd(parsed, rate) : null;

  let error: string | null = null;
  if (text !== '' && parsed === null) {
    error = 'Enter an amount in BTC with up to 8 decimal places.';
  } else if (parsed !== null && parsed < MIN_SEND_SATS) {
    error = `The minimum amount is ${formatBtc(MIN_SEND_SATS)} BTC.`;
  } else if (parsed !== null && rate === null) {
    error = "Couldn't load the BTC price, so the transfer limit can't be checked. Try again in a moment.";
  } else if (usd !== null && usd >= config.maxTransferUsd) {
    error = `Each transfer must be under $${config.maxTransferUsd.toLocaleString('en-US')}.`;
  }

  return {
    text,
    setText,
    sats: error === null ? parsed : null, // null until the amount is valid
    usd,
    error,
    reset,
  };
};

export default useAmountInput;
