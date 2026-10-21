/**
 * @format
 */

// Polyfills must load first, before anything imports bitcoinjs-lib:
// - crypto.getRandomValues (native CSPRNG) for card and device secrets.
// - TextDecoder, which Hermes lacks and bitcoinjs-lib's dependencies create at import time.
import 'react-native-get-random-values';
import 'fast-text-encoding';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Keep release builds quiet. Never log secrets in any build (see CONTRIBUTING.md).
if (!__DEV__) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

AppRegistry.registerComponent(appName, () => App);
