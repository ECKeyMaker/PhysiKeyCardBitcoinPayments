import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { removeSavedAccount, type SavedAccount } from '../functions/asyncStorage';
import type { AppNavigation } from '../navigation';
import { colors, fonts } from '../styles/common';

type AccountListProps = {
  accounts: SavedAccount[];
  navigation: AppNavigation;
  onChange: () => void;
};

const shorten = (address: string) => `${address.slice(0, 10)}...${address.slice(-10)}`;

const AccountList: React.FC<AccountListProps> = ({ accounts, navigation, onChange }) => {
  const { width } = useWindowDimensions();

  const confirmRemove = (account: SavedAccount) => {
    Alert.alert('Remove account?', `"${account.name}" will be removed from this phone. The wallet and its funds are not affected.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeSavedAccount(account.name);
          onChange();
        },
      },
    ]);
  };

  return (
    <View style={[styles.card, { width: width * 0.8 }]}>
      <ScrollView>
        {accounts.map((account, index) => (
          <View key={account.name} style={[styles.row, index === accounts.length - 1 && styles.lastRow]}>
            <Pressable
              style={styles.details}
              onPress={() => navigation.navigate('HomeScreen', { address: account.address, accountType: 'card' })}
            >
              <Text style={styles.name}>{account.name}</Text>
              <Text style={styles.address}>{shorten(account.address)}</Text>
            </Pressable>
            <Pressable style={styles.removeButton} onPress={() => confirmRemove(account)} accessibilityLabel={`Remove ${account.name}`}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default AccountList;

const styles = StyleSheet.create({
  card: {
    marginVertical: 16,
    maxHeight: 220,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: '#000',
    borderBottomWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  details: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  address: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  removeButton: {
    backgroundColor: '#de0a26',
    borderRadius: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  removeText: {
    color: '#fff',
    fontFamily: fonts.body,
  },
});
