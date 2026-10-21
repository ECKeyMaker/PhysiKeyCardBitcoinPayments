/**
 * Card login and setup. Reading a card opens either the setup flow (blank card) or the password
 * prompt (card with a secret). The card data is cleared from this screen when the prompt closes.
 */

import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AccountsHeader from '../components/AccountsHeader';
import AndroidScanModal from '../components/AndroidScanModal';
import CreateCardModal from '../components/CreateCardModal';
import CustomButton from '../components/CustomButton';
import ScreenBackground from '../components/ScreenBackground';
import PasswordModal from '../components/PasswordModal';
import { CardStatus, isNfcCancel, readCard, type CardRead } from '../functions/nfc';
import useScanModal from '../hooks/useScanModal';
import type { ScreenProps } from '../navigation';

const CardManagementScreen = ({ navigation }: ScreenProps<'CardManagementScreen'>) => {
  const insets = useSafeAreaInsets();
  const { scanModal, closeScanModal, withScanModal } = useScanModal();
  const [card, setCard] = useState<CardRead | null>(null);

  const handleScan = async () => {
    try {
      setCard(await withScanModal(() => readCard()));
    } catch (error) {
      if (!isNfcCancel(error)) {
        Alert.alert("Couldn't read the card", (error as Error).message);
      }
    }
  };

  const closeCard = () => setCard(null);

  return (
    <ScreenBackground>
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <LinearGradient colors={['rgba(217, 217, 217, 0.5)', 'rgba(255, 255, 255, 0.2)']} style={StyleSheet.absoluteFill} />
        <AccountsHeader navigation={navigation} />
      </View>
      <View style={[styles.buttonContainer, { bottom: insets.bottom + 48 }]}>
        <CustomButton text="Log In with Card" imageSource={require('../assets/images/icons/nfc_icon.png')} onPress={handleScan} />
        <CustomButton text="Go Back" onPress={() => navigation.goBack()} />
      </View>
      <CreateCardModal visible={card?.status === CardStatus.Blank} closeCreateCardModal={closeCard} />
      <PasswordModal
        visible={card !== null && card.status !== CardStatus.Blank}
        closePasswordModal={closeCard}
        cardText={card?.text ?? ''}
        foreignCard={card?.status === CardStatus.Foreign}
      />
      <AndroidScanModal visible={scanModal} closeScanModal={closeScanModal} />
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  buttonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});

export default CardManagementScreen;
