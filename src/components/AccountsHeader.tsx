import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import AccountList from './AccountList';
import { getSavedAccounts, type SavedAccount } from '../functions/asyncStorage';
import type { AppNavigation } from '../navigation';
import { fonts } from '../styles/common';

const AccountsHeader = ({ navigation }: { navigation: AppNavigation }) => {
  const { height } = useWindowDimensions();
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);

  const loadAccounts = useCallback(() => {
    getSavedAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]));
  }, []);

  useFocusEffect(loadAccounts);

  return (
    <View style={[styles.container, { height: height / 1.25 }]}>
      {accounts.length > 0 ? (
        <>
          <Text style={styles.titleText}>Manage Accounts</Text>
          <Text style={styles.text}>Choose an account or log in with a card to continue.</Text>
          <AccountList accounts={accounts} navigation={navigation} onChange={loadAccounts} />
        </>
      ) : (
        <>
          <Text style={styles.titleText}>Log In</Text>
          <Text style={styles.text}>No accounts saved. Log in with a card to continue.</Text>
          <Image source={require('../assets/images/animations/card_tap_animation.gif')} style={styles.image} resizeMode="contain" />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 50,
  },
  titleText: {
    fontFamily: fonts.title,
    color: '#fff',
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 32,
    marginHorizontal: 8,
  },
  text: {
    fontFamily: fonts.body,
    color: '#fff',
    fontSize: 24,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  image: {
    width: '100%',
    flex: 0.7,
  },
});

export default AccountsHeader;
