/**
 * Card + password → Bitcoin key. SECURITY-CRITICAL.
 *
 * privateKey = SHA256( SHA256(a) + a ), where a = hex(Argon2id(tag + password, SALT))
 * The two SHA-256 steps hash the UTF-8 text of the hex strings (this matches the original
 * crypto-js implementation). The wallet is the P2WPKH (native SegWit, bc1q... / tb1q...)
 * address of that key.
 *
 * Changing the salt, the Argon2 options, the order of tag + password or any step below
 * gives every existing card a different wallet. __tests__/deriveKey.test.ts pins known
 * outputs to catch that.
 */

import argon2 from 'react-native-argon2';
import * as bitcoin from 'bitcoinjs-lib';
import ecc from '@bitcoinerlab/secp256k1';
import { ECPairFactory, type ECPairInterface } from 'ecpair';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import config from './config';

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

export const SALT = 'BklcooclkncUhnaiianhUcnklcooclkB';

export const ARGON2_OPTIONS = {
  iterations: 2,
  memory: 32768,
  parallelism: 2,
  hashLength: 32,
  mode: 'argon2id',
} as const;

const sha256Hex = (text: string): string => bytesToHex(sha256(utf8ToBytes(text)));

/**
 * Derives the 32-byte private key. Callers must zero the result with `.fill(0)` when done.
 * DO NOT CHANGE the order of tag + password.
 */
export const derivePrivateKey = async (tag: string, password: string): Promise<Uint8Array> => {
  const { rawHash } = await argon2(tag + password, SALT, ARGON2_OPTIONS);
  const firstHash = sha256Hex(rawHash);
  return hexToBytes(sha256Hex(firstHash + rawHash));
};

export const keyPairFromPrivateKey = (privateKey: Uint8Array): ECPairInterface =>
  ECPair.fromPrivateKey(privateKey, { network: config.network });

export const addressFromPublicKey = (publicKey: Uint8Array): string => {
  const { address } = bitcoin.payments.p2wpkh({ pubkey: publicKey, network: config.network });
  if (!address) {
    throw new Error('Failed to generate a Bitcoin address.');
  }
  return address;
};

/** Derives the wallet address for a card + password. The private key is zeroed before returning. */
export const deriveAddress = async (tag: string, password: string): Promise<string> => {
  const privateKey = await derivePrivateKey(tag, password);
  try {
    return addressFromPublicKey(keyPairFromPrivateKey(privateKey).publicKey);
  } finally {
    privateKey.fill(0);
  }
};
