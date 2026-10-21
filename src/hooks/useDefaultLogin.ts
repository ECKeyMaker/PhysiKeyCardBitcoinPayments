/**
 * Opens the device wallet used by "Accept Card Payment", creating its Keychain secret on first
 * use (see functions/deviceAccount.ts).
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getDeviceAddress } from '../functions/deviceAccount';
import type { AppNavigation } from '../navigation';

const useDefaultLogin = () => {
  const navigation = useNavigation<AppNavigation>();
  const [loading, setLoading] = useState(false);

  const defaultLogin = async () => {
    setLoading(true);
    try {
      const address = await getDeviceAddress();
      navigation.navigate('HomeScreen', { address, accountType: 'device' });
    } catch (error) {
      Alert.alert("Couldn't open the payment wallet", (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return { defaultLogin, loading };
};

export default useDefaultLogin;
