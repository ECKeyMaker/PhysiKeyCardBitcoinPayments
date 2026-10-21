/** Android-only "Ready to Scan" prompt (iOS shows its own NFC sheet). Cancelling stops the scan. */

import React from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import BottomSheet from './BottomSheet';
import CustomButton from './CustomButton';
import { sheet } from '../styles/common';

type AndroidScanModalProps = {
  visible: boolean;
  closeScanModal: () => void;
};

const AndroidScanModal: React.FC<AndroidScanModalProps> = ({ visible, closeScanModal }) => (
  <BottomSheet visible={visible} onClose={closeScanModal}>
    <Text style={sheet.title}>Ready to Scan</Text>
    <Image source={require('../assets/images/icons/nfc_icon.png')} resizeMode="contain" style={styles.image} />
    <Text style={sheet.mutedText}>Hold your card near the back of the phone.</Text>
    <CustomButton text="Cancel" onPress={closeScanModal} />
  </BottomSheet>
);

export default AndroidScanModal;

const styles = StyleSheet.create({
  image: {
    height: 120,
    marginBottom: 8,
  },
});
