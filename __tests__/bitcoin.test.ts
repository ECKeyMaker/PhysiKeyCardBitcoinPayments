import * as bitcoin from 'bitcoinjs-lib';
import { hexToBytes } from '@noble/hashes/utils.js';
import {
  CHANGE_DUST_SATS,
  InsufficientFundsError,
  estimateVsize,
  formatBtc,
  isValidAddress,
  outputBytes,
  outputScriptFor,
  parseBtcAmount,
  satsToUsd,
  selectCoins,
} from '../src/functions/bitcoin';

describe('parseBtcAmount', () => {
  it.each([
    ['1', 100_000_000],
    ['0.0015', 150_000],
    ['.5', 50_000_000],
    ['0,001', 100_000],
    ['21000000', 2_100_000_000_000_000],
    ['0.00000001', 1],
    [' 2. ', 200_000_000],
  ])('parses %p as %p sats', (text, sats) => {
    expect(parseBtcAmount(text)).toBe(sats);
  });

  it.each(['', 'abc', '1.123456789', '-1', '1e3', '1.2.3', '.'])('rejects %p', text => {
    expect(parseBtcAmount(text)).toBeNull();
  });
});

describe('formatBtc', () => {
  it.each([
    [150_000, '0.0015'],
    [100_000_000, '1'],
    [1, '0.00000001'],
    [0, '0'],
    [-2_500, '-0.000025'],
  ])('formats %p sats as %p', (sats, text) => {
    expect(formatBtc(sats)).toBe(text);
  });

  it('round-trips with parseBtcAmount', () => {
    for (const sats of [1, 546, 123_456_789, 2_100_000_000_000_000]) {
      expect(parseBtcAmount(formatBtc(sats))).toBe(sats);
    }
  });
});

describe('satsToUsd', () => {
  it('rounds to cents', () => {
    expect(satsToUsd(150_000, 100_000)).toBe(150);
    expect(satsToUsd(1, 100_000)).toBe(0);
  });
});

describe('addresses (testnet build)', () => {
  // Generator point G: a valid public key for building one address of each type.
  const pubkey = hexToBytes('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798');
  const network = bitcoin.networks.testnet;
  const p2pkh = bitcoin.payments.p2pkh({ pubkey, network }).address!;
  const p2sh = bitcoin.payments.p2sh({ redeem: bitcoin.payments.p2wpkh({ pubkey, network }), network }).address!;
  const p2tr = bitcoin.payments.p2tr({ internalPubkey: pubkey.slice(1), network }).address!;

  it.each([
    ['P2WPKH', 'tb1q4h8u4djvealnp2yqxuxprugd0avtlf3neaguk3'],
    ['P2TR', p2tr],
    ['P2PKH', p2pkh],
    ['P2SH', p2sh],
  ])('accepts %s addresses', (_type, address) => {
    expect(isValidAddress(address)).toBe(true);
  });

  it.each([
    'bc1q4h8u4djvealnp2yqxuxprugd0avtlf3nnmn0dz', // mainnet address on a testnet build
    'tb1q4h8u4djvealnp2yqxuxprugd0avtlf3neaguk4', // bad checksum
    '02e8ed1e1b8e7cd3e5d4a08e1c1b3c0e8e0b7d1b0e5a4c3b2a1908f7e6d5c4b3a2', // a public key, not an address
    '',
  ])('rejects %p', address => {
    expect(isValidAddress(address)).toBe(false);
  });

  it('sizes outputs by script type', () => {
    expect(outputBytes(outputScriptFor('tb1q4h8u4djvealnp2yqxuxprugd0avtlf3neaguk3')!)).toBe(31);
    expect(outputBytes(outputScriptFor(p2tr)!)).toBe(43);
    expect(outputBytes(outputScriptFor(p2pkh)!)).toBe(34);
    expect(outputBytes(outputScriptFor(p2sh)!)).toBe(32);
  });
});

describe('selectCoins', () => {
  const utxo = (value: number, n = 0) => ({ txid: `${n}`.padStart(64, '0'), vout: 0, value });

  it('uses the largest coins first and returns change', () => {
    const result = selectCoins([utxo(10_000, 1), utxo(50_000, 2), utxo(20_000, 3)], 30_000, 31, 2);
    expect(result.inputs.map(input => input.value)).toEqual([50_000]);
    expect(result.feeSats).toBe(Math.ceil(estimateVsize(1, [31, 31]) * 2));
    expect(result.changeSats).toBe(50_000 - 30_000 - result.feeSats);
  });

  it('adds coins until amount + fee is covered', () => {
    const result = selectCoins([utxo(10_000, 1), utxo(12_000, 2)], 20_000, 31, 1);
    expect(result.inputs).toHaveLength(2);
    expect(result.changeSats + result.feeSats + 20_000).toBe(22_000);
  });

  it('drops dust change into the fee', () => {
    const fee = Math.ceil(estimateVsize(1, [31]) * 1);
    const result = selectCoins([utxo(10_000 + fee + CHANGE_DUST_SATS - 1)], 10_000, 31, 1);
    expect(result.changeSats).toBe(0);
    expect(result.feeSats).toBe(fee + CHANGE_DUST_SATS - 1);
  });

  it('throws InsufficientFundsError when the wallet is short', () => {
    expect(() => selectCoins([utxo(10_000)], 10_000, 31, 1)).toThrow(InsufficientFundsError);
    expect(() => selectCoins([], 1_000, 31, 1)).toThrow(InsufficientFundsError);
  });
});
