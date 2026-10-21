import { formatBtc, InsufficientFundsError } from './bitcoin';
import { WrongCardOrPasswordError } from './signTransaction';

/** Turns an error from a payment flow into a message for the user. */
const errorMessage = (error: unknown): string => {
  if (error instanceof InsufficientFundsError && error.availableSats === 0) {
    return 'This wallet is empty. If you paid with a card, check the password: a different password opens a different wallet.';
  }
  if (error instanceof InsufficientFundsError) {
    return `Not enough bitcoin. This payment needs ${formatBtc(error.neededSats)} BTC including the network fee, and the wallet has ${formatBtc(error.availableSats)} BTC.`;
  }
  if (error instanceof WrongCardOrPasswordError) {
    return error.message;
  }
  if (error instanceof TypeError && /network request failed/i.test(error.message)) {
    return "Couldn't reach the Bitcoin network. Check your internet connection and try again.";
  }
  return (error as Error)?.message || 'Something went wrong. Please try again.';
};

export default errorMessage;
