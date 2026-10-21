import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSavedAccounts, removeSavedAccount, saveAccount } from '../src/functions/asyncStorage';

beforeEach(() => AsyncStorage.clear());

test('saves, lists and removes accounts', async () => {
  await saveAccount(' Spending ', 'tb1qaddress1');
  await saveAccount('Savings', 'tb1qaddress2');
  expect(await getSavedAccounts()).toEqual([
    { name: 'Savings', address: 'tb1qaddress2' },
    { name: 'Spending', address: 'tb1qaddress1' },
  ]);
  await removeSavedAccount('Savings');
  expect(await getSavedAccounts()).toEqual([{ name: 'Spending', address: 'tb1qaddress1' }]);
});

test('reads accounts saved by earlier versions and skips other keys', async () => {
  // Earlier builds stored JSON.stringify(address) under the account name.
  await AsyncStorage.setItem('Old card', JSON.stringify('bc1qolder'));
  await AsyncStorage.setItem('default', JSON.stringify('ignored'));
  await AsyncStorage.setItem('broken', '{not json');
  expect(await getSavedAccounts()).toEqual([{ name: 'Old card', address: 'bc1qolder' }]);
});
