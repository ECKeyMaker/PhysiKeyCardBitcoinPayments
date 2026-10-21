/**
 * Send bitcoin from the signed-in wallet.
 *
 * Steps: 0 recipient → 1 amount → 2 review (real fee from the network) → 3 card tap + password
 * (card wallets only) → 4 result. Device wallets sign with the Keychain secret at step 2.
 */

import React, { useEffect, useState } from 'react';
import { Text, TextInput } from 'react-native';
import BottomSheet from './BottomSheet';
import CustomButton from './CustomButton';
import AndroidScanModal from './AndroidScanModal';
import ResultStep from './ResultStep';
import useAmountInput from '../hooks/useAmountInput';
import useBtcPrice from '../hooks/useBtcPrice';
import useScanModal from '../hooks/useScanModal';
import { formatBtc, isValidAddress } from '../functions/bitcoin';
import { getDeviceSecret } from '../functions/deviceAccount';
import errorMessage from '../functions/errorMessage';
import { isNfcCancel, readCard } from '../functions/nfc';
import { quotePayment, sendBitcoin, type PaymentQuote } from '../functions/signTransaction';
import type { AccountType, AppNavigation } from '../navigation';
import { colors, sheet } from '../styles/common';

type SendModalProps = {
  visible: boolean;
  closeSendModal: () => void;
  onSent: () => void;
  address: string;
  accountType: AccountType;
  navigation: AppNavigation;
};

const SendModal: React.FC<SendModalProps> = ({ visible, closeSendModal, onSent, address, accountType, navigation }) => {
  const { rate, refreshRate } = useBtcPrice();
  const amount = useAmountInput(rate);
  const { scanModal, closeScanModal, withScanModal } = useScanModal();
  const [step, setStep] = useState(0);
  const [recipient, setRecipient] = useState('');
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  const [failure, setFailure] = useState('');

  const { reset: resetAmount } = amount;
  useEffect(() => {
    if (visible) {
      refreshRate();
    } else {
      setStep(0);
      setRecipient('');
      resetAmount();
      setQuote(null);
      setPassword('');
      setInlineError(null);
      setTxid(null);
    }
  }, [visible, refreshRate, resetAmount]);

  const recipientTrimmed = recipient.trim();
  const recipientError =
    recipientTrimmed === ''
      ? null
      : !isValidAddress(recipientTrimmed)
      ? "That isn't a valid Bitcoin address for this network."
      : recipientTrimmed === address
      ? "That's this wallet's own address."
      : null;

  const goToStep = (next: number) => {
    setInlineError(null);
    setStep(next);
  };

  const reviewPayment = async () => {
    if (amount.sats === null) {
      return;
    }
    setLoading(true);
    try {
      setQuote(await quotePayment(address, recipientTrimmed, amount.sats));
      goToStep(2);
    } catch (error) {
      setInlineError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const send = async (tag: string, secret: string) => {
    if (!quote) {
      return;
    }
    setLoading(true);
    try {
      const id = await sendBitcoin({
        tag,
        password: secret,
        expectedAddress: address,
        recipient: recipientTrimmed,
        amountSats: quote.amountSats,
        feeRate: quote.feeRate,
      });
      setTxid(id);
      onSent();
    } catch (error) {
      setTxid(null);
      setFailure(errorMessage(error));
    } finally {
      setLoading(false);
      setStep(4);
    }
  };

  const confirm = async () => {
    if (accountType === 'card') {
      goToStep(3);
      return;
    }
    try {
      const secret = await getDeviceSecret();
      await send(secret, secret);
    } catch (error) {
      setFailure(errorMessage(error));
      setStep(4);
    }
  };

  const scanCardAndSend = async () => {
    // Copy the password out of screen state and clear it before the slow signing work starts.
    const typedPassword = password;
    setPassword('');
    try {
      const card = await withScanModal(() => readCard('Hold your card near the phone to sign.'));
      await send(card.text, typedPassword);
    } catch (error) {
      if (!isNfcCancel(error)) {
        setFailure(errorMessage(error));
        setStep(4);
      }
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Text style={sheet.title}>Recipient Address</Text>
            <TextInput
              style={[sheet.input, sheet.inputContainer]}
              value={recipient}
              onChangeText={setRecipient}
              placeholder="bc1... or tb1..."
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              selectionColor="black"
            />
            {recipientError && <Text style={sheet.errorText}>{recipientError}</Text>}
            <CustomButton text="Continue" disabled={recipientTrimmed === '' || recipientError !== null} onPress={() => goToStep(1)} />
            <CustomButton text="Cancel" onPress={closeSendModal} />
          </>
        );
      case 1:
        return (
          <>
            <Text style={sheet.title}>Amount</Text>
            <TextInput
              style={[sheet.input, sheet.inputContainer]}
              value={amount.text}
              onChangeText={text => {
                setInlineError(null);
                amount.setText(text);
              }}
              placeholder="Amount in BTC"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.placeholder}
              selectionColor="black"
            />
            {amount.usd !== null && <Text style={sheet.mutedText}>≈ ${amount.usd.toFixed(2)}</Text>}
            {(amount.error || inlineError) && <Text style={sheet.errorText}>{amount.error ?? inlineError}</Text>}
            <CustomButton text="Review" disabled={amount.sats === null} onPress={reviewPayment} />
            <CustomButton text="Go Back" onPress={() => goToStep(0)} />
          </>
        );
      case 2:
        return (
          quote && (
            <>
              <Text style={sheet.title}>Review</Text>
              <Text style={sheet.text}>To: {recipientTrimmed}</Text>
              <Text style={sheet.text}>Amount: {formatBtc(quote.amountSats)} BTC</Text>
              <Text style={sheet.text}>
                Network fee: {formatBtc(quote.feeSats)} BTC ({Math.round(quote.feeRate * 10) / 10} sat/vB)
              </Text>
              <Text style={sheet.text}>Total: {formatBtc(quote.totalSats)} BTC</Text>
              <CustomButton text={accountType === 'card' ? 'Continue' : 'Send'} onPress={confirm} />
              <CustomButton text="Go Back" onPress={() => goToStep(1)} />
            </>
          )
        );
      case 3:
        return (
          <>
            <Text style={sheet.title}>Sign with your card</Text>
            <TextInput
              style={[sheet.input, sheet.inputContainer]}
              value={password}
              onChangeText={setPassword}
              placeholder="Card password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              autoCapitalize="none"
              selectionColor="black"
            />
            <CustomButton
              text="Tap Card to Send"
              imageSource={require('../assets/images/icons/nfc_icon.png')}
              disabled={password.length === 0}
              onPress={scanCardAndSend}
            />
            <CustomButton
              text="Go Back"
              onPress={() => {
                setPassword('');
                goToStep(2);
              }}
            />
          </>
        );
      default:
        return (
          <ResultStep txid={txid} errorMessage={failure} navigation={navigation} onRetry={() => goToStep(0)} onClose={closeSendModal} />
        );
    }
  };

  return (
    <>
      <BottomSheet visible={visible && !scanModal} onClose={closeSendModal} loading={loading}>
        {renderStep()}
      </BottomSheet>
      <AndroidScanModal visible={scanModal} closeScanModal={closeScanModal} />
    </>
  );
};

export default SendModal;
