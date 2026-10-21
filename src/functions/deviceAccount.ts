/**
 * The device account behind "Accept Card Payment": a hot wallet whose secret lives in the
 * phone's Keychain (iOS) / Keystore (Android) instead of on a card. The secret is used as both
 * the "tag" and the "password" in deriveKey.ts, so it derives a wallet like any card would.
 *
 * Deleting the app or wiping the phone deletes the secret and any funds left in this wallet.
 * This module never overwrites an existing secret: a secret is only created when none exists.
 */

import * as Keychain from 'react-native-keychain';
import { deriveAddress } from './deriveKey';
import { randomHex } from './random';

// Kept from earlier releases so existing merchants keep the same wallet. The secret is stored
// under the Keychain's default service with this username.
const USERNAME = 'Default';

const readDeviceSecret = async (): Promise<string | null> => {
  const credentials = await Keychain.getGenericPassword();
  if (!credentials) {
    return null;
  }
  if (credentials.username !== USERNAME) {
    // Refuse rather than overwrite: the entry might hold a secret that still controls funds.
    throw new Error('Secure storage holds an unexpected entry, so the payment wallet was not opened.');
  }
  return credentials.password;
};

/** The existing device secret, for signing. Never creates one. */
export const getDeviceSecret = async (): Promise<string> => {
  const secret = await readDeviceSecret();
  if (!secret) {
    throw new Error("This phone's payment wallet secret is missing from secure storage.");
  }
  return secret;
};

/** The device wallet's address, creating and storing a secret on first use. */
export const getDeviceAddress = async (): Promise<string> => {
  let secret = await readDeviceSecret();
  if (!secret) {
    secret = randomHex(32);
    if (!(await Keychain.setGenericPassword(USERNAME, secret))) {
      throw new Error("Couldn't save the payment wallet in secure storage.");
    }
  }
  return deriveAddress(secret, secret);
};
