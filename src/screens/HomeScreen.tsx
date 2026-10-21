import React, { useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
import ScreenBackground from '../components/ScreenBackground';
import HistoryList from '../components/HistoryList';
import InstantAcceptModal from '../components/InstantAcceptModal';
import SaveAccountModal from '../components/SaveAccountModal';
import SendModal from '../components/SendModal';
import { formatBtc, satsToUsd } from '../functions/bitcoin';
import copyToClipboard from '../functions/copyToClipboard';
import useBtcPrice from '../hooks/useBtcPrice';
import useFetchBalance from '../hooks/useFetchBalance';
import type { ScreenProps } from '../navigation';
import { fonts } from '../styles/common';

const HomeScreen = ({ route, navigation }: ScreenProps<'HomeScreen'>) => {
  const { address, accountType, foreignCard } = route.params;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { balance, loading, error, fetchBalance } = useFetchBalance(address);
  const { rate, refreshRate } = useBtcPrice();
  const [historyKey, setHistoryKey] = useState(0);
  const [sendModal, setSendModal] = useState(false);
  const [instantAcceptModal, setInstantAcceptModal] = useState(false);
  const [saveAccountModal, setSaveAccountModal] = useState(false);

  const refresh = () => {
    fetchBalance();
    refreshRate();
    setHistoryKey(key => key + 1);
  };

  const isDevice = accountType === 'device';
  const usd = balance && rate !== null ? satsToUsd(balance.totalSats, rate).toFixed(2) : null;

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={[styles.scrollViewContent, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#fff" />}
      >
        <View style={[styles.gradientContainer, { top: height * 0.35 }]}>
          <LinearGradient colors={['rgba(217, 217, 217, 0.2)', 'rgba(217, 217, 217, 0.5)']} style={StyleSheet.absoluteFill} />
        </View>
        <Pressable onPress={() => copyToClipboard(address)} style={styles.balanceContainer} accessibilityHint="Copies the address">
          {error ? (
            <Text style={styles.key}>Couldn't load the balance. Pull down to retry.</Text>
          ) : balance ? (
            <>
              <Text style={styles.text}>
                {isDevice ? 'Balance' : 'Card Balance'}: {usd !== null ? `$${usd}` : '—'}
              </Text>
              <Text style={styles.key}>BTC: {formatBtc(balance.totalSats)}</Text>
              {balance.pendingSats !== 0 && <Text style={styles.small}>Includes {formatBtc(balance.pendingSats)} BTC pending</Text>}
            </>
          ) : (
            <Text style={styles.text}>Loading balance...</Text>
          )}
          <View style={styles.addressRow}>
            <Text style={styles.key}>
              Address: {address.slice(0, 8)}...{address.slice(-6)}
            </Text>
            <Image source={require('../assets/images/icons/copy.png')} style={styles.copyIcon} />
          </View>
          {foreignCard && <Text style={styles.small}>This card was not set up in Bit Wand.</Text>}
          {!isDevice && (
            <Pressable onPress={() => setSaveAccountModal(true)} style={styles.saveButton}>
              <Text style={styles.saveText}>Save Account</Text>
            </Pressable>
          )}
        </Pressable>
        <View style={styles.buttonContainer}>
          {isDevice ? (
            <View style={styles.rowButtons}>
              <CustomButton
                text="Withdraw"
                imageSource={require('../assets/images/icons/transfer.png')}
                buttonShape="square"
                onPress={() => setSendModal(true)}
              />
              <CustomButton
                text="Accept BTC"
                imageSource={require('../assets/images/icons/send.png')}
                buttonShape="square"
                onPress={() => setInstantAcceptModal(true)}
              />
            </View>
          ) : (
            <CustomButton text="Send Bitcoin" imageSource={require('../assets/images/icons/transfer.png')} onPress={() => setSendModal(true)} />
          )}
          <HistoryList address={address} refreshKey={historyKey} navigation={navigation} />
          <CustomButton text="Sign Out" onPress={() => navigation.reset({ index: 0, routes: [{ name: 'LandingScreen' }] })} />
        </View>
      </ScrollView>
      <SaveAccountModal visible={saveAccountModal} closeSaveAccountModal={() => setSaveAccountModal(false)} address={address} />
      <SendModal
        visible={sendModal}
        closeSendModal={() => setSendModal(false)}
        onSent={refresh}
        address={address}
        accountType={accountType}
        navigation={navigation}
      />
      {isDevice && (
        <InstantAcceptModal
          visible={instantAcceptModal}
          closeInstantAcceptModal={() => setInstantAcceptModal(false)}
          onReceived={refresh}
          address={address}
          navigation={navigation}
        />
      )}
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
  },
  text: {
    fontFamily: fonts.body,
    color: '#fff',
    fontSize: 32,
    marginHorizontal: 24,
  },
  key: {
    fontFamily: fonts.body,
    color: '#fff',
    fontSize: 20,
    marginHorizontal: 24,
  },
  small: {
    fontFamily: fonts.body,
    color: '#fff',
    fontSize: 14,
    marginHorizontal: 24,
    marginTop: 4,
  },
  balanceContainer: {
    minHeight: 200,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  gradientContainer: {
    width: '100%',
    position: 'absolute',
    height: '100%',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyIcon: {
    width: 24,
    height: 24,
  },
  saveButton: {
    marginHorizontal: 24,
    marginVertical: 16,
    width: 150,
    padding: 8,
    backgroundColor: '#000',
    alignItems: 'center',
    borderRadius: 15,
  },
  saveText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: fonts.body,
  },
});

export default HomeScreen;
