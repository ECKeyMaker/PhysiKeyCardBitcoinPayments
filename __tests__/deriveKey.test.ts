/**
 * Pins the card + password → key → address derivation.
 *
 * If this test fails, a change (code, salt, Argon2 options or a dependency upgrade) would give
 * every existing card a different wallet. Do not update these values unless you intend to break
 * compatibility with existing cards, and say so clearly in the pull request.
 *
 * The expected values were generated with the original implementation (crypto-js SHA-256,
 * bitcoinjs-lib 5.1.1 ECPair, react-native-argon2 options below). The Argon2 outputs were also
 * cross-checked against the reference C implementation (argon2-cffi).
 */
import * as bitcoin from 'bitcoinjs-lib';
import { bytesToHex } from '@noble/hashes/utils.js';
import argon2 from 'react-native-argon2';
import {
  ARGON2_OPTIONS,
  SALT,
  addressFromPublicKey,
  deriveAddress,
  derivePrivateKey,
  keyPairFromPrivateKey,
} from '../src/functions/deriveKey';

const CARD = 'a3f1c2d4e5b60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f809';
const DEVICE_SECRET = '7d0c5e1b9a2f4386c1e0d7b5a49f3e2c8b6a1d0f5e4c3b2a19087f6e5d4c3b2a';

const vectors = [
  {
    tag: CARD,
    password: '1234',
    argon2: '71ea0a17bac0c14580c4d12b17fa5c1cb4fd5c308f1776971508d713ee251007',
    privateKey: '8dc6cd8d8b45fff65b072ab7aed060d3bada64f27e1bdc03c5235ab59e440757',
    mainnet: 'bc1q4h8u4djvealnp2yqxuxprugd0avtlf3nnmn0dz',
    testnet: 'tb1q4h8u4djvealnp2yqxuxprugd0avtlf3neaguk3',
  },
  {
    tag: CARD,
    password: 'correct horse battery staple',
    argon2: '416f3a49a87a6f5d6ac59b784b233b62ef8f58dd1099354627d10dff52fa7f01',
    privateKey: '2eeda58ff794bb948c471bc2187d15497d3c6b3a1969d6a81136a2de113b4b69',
    mainnet: 'bc1qq89j97p3prjy4pk77cpselhkx2htpw6ukkvkjr',
    testnet: 'tb1qq89j97p3prjy4pk77cpselhkx2htpw6uush9fs',
  },
  {
    tag: '00000000000000000000000000000000000000000000000000000000000000ff',
    password: 'pässwörd-✓',
    argon2: '7c057bcad7808535331bfcf0bbbf7130eb13fd5c888764f6593a7c5154c5c282',
    privateKey: 'accea433eed0d46aa9bccd97c1ddee61a27a73c4bbbe8efd2b1ed344af63d096',
    mainnet: 'bc1qdz27ypas2f8pwgp3x4ypcqmx5ckfqe3dzm7r33',
    testnet: 'tb1qdz27ypas2f8pwgp3x4ypcqmx5ckfqe3dga9s2z',
  },
  {
    // Instant Accept device wallet: the Keychain secret is used as both tag and password.
    tag: DEVICE_SECRET,
    password: DEVICE_SECRET,
    argon2: '3d961689e1ee06b8fee0405f0d01b3b39e7cf6b6b5432a24864c432a758e4f99',
    privateKey: 'fe86b3eb4387f80fbbf92a431846e66655da6209349f022f2233ccbb5d4b0d5a',
    mainnet: 'bc1qvxqlyhssuxph8k2fxjpkgwnzk9rvhn9fdamqrq',
    testnet: 'tb1qvxqlyhssuxph8k2fxjpkgwnzk9rvhn9f8mqncn',
  },
];

describe('key derivation', () => {
  it('uses the published salt and Argon2 options', () => {
    expect(SALT).toBe('BklcooclkncUhnaiianhUcnklcooclkB');
    expect(ARGON2_OPTIONS).toEqual({ iterations: 2, memory: 32768, parallelism: 2, hashLength: 32, mode: 'argon2id' });
  });

  it.each(vectors)('derives the pinned key and addresses for password "$password"', async vector => {
    const { rawHash } = await argon2(vector.tag + vector.password, SALT, ARGON2_OPTIONS);
    expect(rawHash).toBe(vector.argon2);

    const privateKey = await derivePrivateKey(vector.tag, vector.password);
    expect(bytesToHex(privateKey)).toBe(vector.privateKey);

    // Tests run with BITCOIN_NETWORK=testnet (see jest.setup.js).
    const keyPair = keyPairFromPrivateKey(privateKey);
    expect(addressFromPublicKey(keyPair.publicKey)).toBe(vector.testnet);
    const { address: mainnet } = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.bitcoin });
    expect(mainnet).toBe(vector.mainnet);

    await expect(deriveAddress(vector.tag, vector.password)).resolves.toBe(vector.testnet);
  });

  it('gives a different wallet for a different password on the same card', async () => {
    expect(await deriveAddress(CARD, '1235')).not.toBe(vectors[0].testnet);
  });
});
