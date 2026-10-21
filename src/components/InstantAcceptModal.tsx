/**
 * Instant Accept: a customer pays the merchant's device wallet by tapping their card on the
 * merchant's phone and typing their password.
 *
 * Steps: 0 merchant enters amount → 1 customer password + card tap → 2 customer reviews
 * (from, to, fee) and confirms → 3 result.
 *
 * Between the tap and the confirmation the card data and password are held in a ref (never in
 * rendered state) and cleared on confirm, cancel or close.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput } from 'react-native';
import BottomSheet from './BottomSheet';
import CustomButton from './CustomButton';
import AndroidScanModal from './AndroidScanModal';
import ResultStep from './ResultStep';
import useAmountInput from '../hooks/useAmountInput';
import useBtcPrice from '../hooks/useBtcPrice';
import useScanModal from '../hooks/useScanModal';
import { formatBtc } from '../functions/bitcoin';
import { deriveAddress } from '../functions/deriveKey';
import errorMessage from '../functions/errorMessage';
import { CardStatus, isNfcCancel, readCard } from '../functions/nfc';
import { quotePayment, sendBitcoin, type PaymentQuote } from '../functions/signTransaction';
import type { AppNavigation } from '../navigation';
import { colors, sheet } from '../styles/common';

type InstantAcceptModalProps = {
  visible: boolean;
  closeInstantAcceptModal: () => void;
  onReceived: () => void;
  address: string; // the merchant's device wallet, which receives the payment
  navigation: AppNavigation;
};

type CustomerCard = { tag: string; password: string; address: string };

const InstantAcceptModal: React.FC<InstantAcceptModalProps> = ({
  visible,
  closeInstantAcceptModal,
  onReceived,
  address,
  navigation,
}) => {
  const { rate, refreshRate } = useBtcPrice();
  const amount = useAmountInput(rate);
  const { scanModal, closeScanModal, withScanModal } = useScanModal();
  const [step, setStep] = useState(0);
  const [password, setPassword] = useState('');
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [customerAddress, setCustomerAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  const [failure, setFailure] = useState('');
  const customerCard = useRef<CustomerCard | null>(null);

  const { reset: resetAmount } = amount;
  useEffect(() => {
    if (visible) {
      refreshRate();
    } else {
      customerCard.current = null;
      setStep(0);
      resetAmount();
      setPassword('');
      setQuote(null);
      setCustomerAddress('');
      setInlineError(null);
      setTxid(null);
    }
  }, [visible, refreshRate, resetAmount]);

  useEffect(
    () => () => {
      customerCard.current = null;
    },
    [],
  );

  const goToStep = (next: number) => {
    setInlineError(null);
    setStep(next);
  };

  const scanCustomerCard = async () => {
    if (amount.sats === null) {
      return;
    }
    const typedPassword = password;
    setPassword('');
    try {
      const card = await withScanModal(() => readCard('Customer: hold your card near the phone.'));
      if (card.status === CardStatus.Blank) {
        throw new Error("This card hasn't been set up yet. Set it up under Card Management first.");
      }
      setLoading(true);
      const from = await deriveAddress(card.text, typedPassword);
      const paymentQuote = await quotePayment(from, address, amount.sats);
      customerCard.current = { tag: card.text, password: typedPassword, address: from };
      setCustomerAddress(from);
      setQuote(paymentQuote);
      goToStep(2);
    } catch (error) {
      if (!isNfcCancel(error)) {
        setInlineError(errorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const pay = async () => {
    const card = customerCard.current;
    customerCard.current = null;
    if (!card || !quote) {
      goToStep(1);
      return;
    }
    setLoading(true);
    try {
      const id = await sendBitcoin({
        tag: card.tag,
        password: card.password,
        expectedAddress: card.address,
        recipient: address,
        amountSats: quote.amountSats,
        feeRate: quote.feeRate,
      });
      setTxid(id);
      onReceived();
    } catch (error) {
      setTxid(null);
      setFailure(errorMessage(error));
    } finally {
      setLoading(false);
      setStep(3);
    }
  };

  const backToAmount = () => {
    customerCard.current = null;
    setPassword('');
    goToStep(0);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Text style={sheet.title}>Request Payment</Text>
            <Text style={sheet.mutedText}>Enter the amount to charge the customer.</Text>
            <TextInput
              style={[sheet.input, sheet.inputContainer]}
              value={amount.text}
              onChangeText={amount.setText}
              placeholder="Amount in BTC"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.placeholder}
              selectionColor="black"
            />
            {amount.usd !== null && <Text style={sheet.mutedText}>≈ ${amount.usd.toFixed(2)}</Text>}
            {amount.error && <Text style={sheet.errorText}>{amount.error}</Text>}
            <CustomButton text="Continue" disabled={amount.sats === null} onPress={() => goToStep(1)} />
            <CustomButton text="Cancel" onPress={closeInstantAcceptModal} />
          </>
        );
      case 1:
        return (
          <>
            <Text style={sheet.title}>Customer</Text>
            <Text style={sheet.text}>
              Pay {amount.text} BTC{amount.usd !== null ? ` (≈ $${amount.usd.toFixed(2)})` : ''}. Enter your card password, then tap
              your card.
            </Text>
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
            {inlineError && <Text style={sheet.errorText}>{inlineError}</Text>}
            <CustomButton
              text="Tap Card"
              imageSource={require('../assets/images/icons/nfc_icon.png')}
              disabled={password.length === 0}
              onPress={scanCustomerCard}
            />
            <CustomButton text="Go Back" onPress={backToAmount} />
          </>
        );
      case 2:
        return (
          quote && (
            <>
              <Text style={sheet.title}>Confirm Payment</Text>
              <Text style={sheet.text}>From: {customerAddress}</Text>
              <Text style={sheet.text}>To: {address}</Text>
              <Text style={sheet.text}>Amount: {formatBtc(quote.amountSats)} BTC</Text>
              <Text style={sheet.text}>Network fee: {formatBtc(quote.feeSats)} BTC (paid by the customer)</Text>
              <Text style={sheet.text}>Total: {formatBtc(quote.totalSats)} BTC</Text>
              <CustomButton text="Pay" onPress={pay} />
              <CustomButton text="Cancel" onPress={backToAmount} />
            </>
          )
        );
      default:
        return (
          <ResultStep
            txid={txid}
            errorMessage={failure}
            navigation={navigation}
            onRetry={backToAmount}
            onClose={closeInstantAcceptModal}
          />
        );
    }
  };

  return (
    <>
      <BottomSheet visible={visible && !scanModal} onClose={closeInstantAcceptModal} loading={loading}>
        {renderStep()}
      </BottomSheet>
      <AndroidScanModal visible={scanModal} closeScanModal={closeScanModal} />
    </>
  );
};

export default InstantAcceptModal;
