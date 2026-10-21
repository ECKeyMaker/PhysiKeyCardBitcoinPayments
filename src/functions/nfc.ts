/**
 * NFC card access. A card stores 32 random bytes (64 hex characters) as a single NDEF text
 * record. That text, plus the user's password, derives the wallet (see deriveKey.ts).
 */

import { Platform } from 'react-native';
import NfcManager, { Ndef, NfcError, NfcTech } from 'react-native-nfc-manager';
import { randomHex } from './random';

let started = false;

const startNfc = async () => {
  if (!(await NfcManager.isSupported())) {
    throw new Error("This device doesn't support NFC.");
  }
  if (!started) {
    await NfcManager.start();
    started = true;
  }
  if (Platform.OS === 'android' && !(await NfcManager.isEnabled())) {
    throw new Error('NFC is turned off. Turn it on in your phone settings and try again.');
  }
};

/** Runs `fn` while a tag of the given technology is connected, and always ends the session. */
export const withTag = async <T>(tech: NfcTech, alertMessage: string, fn: () => Promise<T>): Promise<T> => {
  await startNfc();
  try {
    await NfcManager.requestTechnology(tech, { alertMessage });
    return await fn();
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => {});
  }
};

export const cancelNfc = () => NfcManager.cancelTechnologyRequest().catch(() => {});

/** True when the error just means the user closed the scan prompt. */
export const isNfcCancel = (error: unknown): boolean => error instanceof NfcError.UserCancel;

export enum CardStatus {
  Blank = 0, // no NDEF data: ready for setup
  Valid = 1, // holds a 64-hex-character secret written by this app
  Foreign = 2, // holds some other data; can still be used, but wasn't set up by this app
}

export interface CardRead {
  status: CardStatus;
  text: string;
}

const isCardSecret = (text: string) => /^[a-fA-F0-9]{64}$/.test(text);

export const readCard = (alertMessage = 'Hold your card near the phone.'): Promise<CardRead> =>
  withTag(NfcTech.NfcA, alertMessage, async () => {
    const tag = await NfcManager.getTag();
    if (!tag) {
      throw new Error("Couldn't read the card. Hold it still against the phone and try again.");
    }
    const record = tag.ndefMessage?.[0];
    if (!record || record.payload.length === 0) {
      return { status: CardStatus.Blank, text: '' };
    }
    const text = Ndef.text.decodePayload(Uint8Array.from(record.payload));
    return { status: isCardSecret(text) ? CardStatus.Valid : CardStatus.Foreign, text };
  });

/** Writes a fresh random secret to a blank card and returns it. */
export const writeCardSecret = (): Promise<string> =>
  withTag(NfcTech.Ndef, 'Hold your new card near the phone to set it up.', async () => {
    const secret = randomHex(32);
    const message = Ndef.encodeMessage([Ndef.textRecord(secret)]);
    if (!message) {
      throw new Error('Failed to encode the card data.');
    }
    await NfcManager.ndefHandler.writeNdefMessage(message);
    return secret;
  });
