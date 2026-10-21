import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';

/**
 * - `device`: the phone's own hot wallet (Accept Card Payment). Signs with the Keychain secret.
 * - `card`: a card wallet. Viewing needs only the address; sending needs a card tap + password.
 */
export type AccountType = 'device' | 'card';

export type RootStackParamList = {
  LandingScreen: undefined;
  CardManagementScreen: undefined;
  HomeScreen: { address: string; accountType: AccountType; foreignCard?: boolean };
  WebView: { url: string; title: string };
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
export type AppNavigation = NavigationProp<RootStackParamList>;

/**
 * Opens an account's Home screen and drops the login screens from history, so the screens
 * that held the card data and password are unmounted (see "What stays in memory" in the README).
 */
export const openAccount = (navigation: AppNavigation, params: RootStackParamList['HomeScreen']) => {
  navigation.reset({ index: 1, routes: [{ name: 'LandingScreen' }, { name: 'HomeScreen', params }] });
};

export const openWebView = (navigation: AppNavigation, url: string, title: string) => {
  navigation.navigate('WebView', { url, title });
};
