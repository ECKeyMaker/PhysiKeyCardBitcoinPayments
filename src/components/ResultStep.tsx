/** Final step of a payment flow: the txid with an explorer link, or the reason it failed. */

import React from 'react';
import { Text } from 'react-native';
import CustomButton from './CustomButton';
import { explorerTxUrl } from '../functions/config';
import { openWebView, type AppNavigation } from '../navigation';
import { sheet } from '../styles/common';

type ResultStepProps = {
  txid: string | null;
  errorMessage: string;
  navigation: AppNavigation;
  onRetry: () => void;
  onClose: () => void;
};

const ResultStep: React.FC<ResultStepProps> = ({ txid, errorMessage, navigation, onRetry, onClose }) =>
  txid ? (
    <>
      <Text style={sheet.title}>Sent!</Text>
      <Text style={sheet.text}>Transaction ID: {txid}</Text>
      <Text style={sheet.mutedText}>It can take a few minutes to appear and up to an hour to confirm.</Text>
      <CustomButton
        text="View Transaction Details"
        onPress={() => {
          onClose();
          openWebView(navigation, explorerTxUrl(txid), 'Transaction');
        }}
      />
      <CustomButton text="Close" onPress={onClose} />
    </>
  ) : (
    <>
      <Text style={sheet.title}>Payment not sent</Text>
      <Text style={sheet.text}>{errorMessage}</Text>
      <CustomButton text="Try Again" onPress={onRetry} />
      <CustomButton text="Close" onPress={onClose} />
    </>
  );

export default ResultStep;
