/**
 * Pure Bitcoin helpers: amounts, addresses, fee sizes and coin selection. No network calls.
 * All amounts are integer satoshis (`number`; every possible BTC amount is a safe integer).
 */

import * as bitcoin from 'bitcoinjs-lib';
import ecc from '@bitcoinerlab/secp256k1';
import config from './config';

// Needed so Taproot (bc1p... / tb1p...) recipients validate.
bitcoin.initEccLib(ecc);

export const SATS_PER_BTC = 100_000_000;

// Smallest recipient amount the app will create. Outputs below the dust limit
// (294 sats for P2WPKH, 546 for legacy) are rejected by the network.
export const MIN_SEND_SATS = 546;

// Change below this is added to the fee instead of creating an unspendable output.
export const CHANGE_DUST_SATS = 294;

/** Parses a user-typed BTC amount ("0.0015") into satoshis, or null if it isn't valid. */
export const parseBtcAmount = (text: string): number | null => {
  const value = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{0,8})?$/.test(value) && !/^\.\d{1,8}$/.test(value)) {
    return null;
  }
  const [whole = '0', fraction = ''] = value.split('.');
  const sats = Number(whole || '0') * SATS_PER_BTC + Number(fraction.padEnd(8, '0'));
  return Number.isSafeInteger(sats) ? sats : null;
};

/** Formats satoshis as BTC without trailing zeros, e.g. 150000 → "0.0015". */
export const formatBtc = (sats: number): string => {
  const sign = sats < 0 ? '-' : '';
  const abs = Math.abs(sats);
  const whole = Math.floor(abs / SATS_PER_BTC);
  const fraction = String(abs % SATS_PER_BTC).padStart(8, '0').replace(/0+$/, '');
  return `${sign}${whole}${fraction ? `.${fraction}` : ''}`;
};

export const satsToUsd = (sats: number, btcUsdRate: number): number =>
  Math.round((sats / SATS_PER_BTC) * btcUsdRate * 100) / 100;

/** Returns the output script for an address on the configured network, or null if invalid. */
export const outputScriptFor = (address: string): Uint8Array | null => {
  try {
    return bitcoin.address.toOutputScript(address.trim(), config.network);
  } catch {
    return null;
  }
};

/** True for any valid address type (bc1q, bc1p, 1..., 3...) on the configured network. */
export const isValidAddress = (address: string): boolean => outputScriptFor(address) !== null;

// Transaction weight, used for fee estimates. Inputs are always this app's own P2WPKH coins.
// Per input: 41 bytes ×4 + worst-case witness (1 + 1 + 72 sig + 1 + 33 pubkey) = 272 WU (68 vB).
const TX_OVERHEAD_WU = 42; // version, locktime, in/out counts ×4 + SegWit marker and flag
const P2WPKH_INPUT_WU = 272;
const P2WPKH_OUTPUT_BYTES = 31;

/** Size of an output paying `script`: 8-byte value + 1-byte length + script. */
export const outputBytes = (script: Uint8Array): number => 9 + script.length;

export const estimateVsize = (inputCount: number, outputSizes: number[]): number => {
  const outputs = outputSizes.reduce((sum, size) => sum + size, 0);
  return Math.ceil((TX_OVERHEAD_WU + inputCount * P2WPKH_INPUT_WU + outputs * 4) / 4);
};

export interface Utxo {
  txid: string;
  vout: number;
  value: number;
}

export interface CoinSelection {
  inputs: Utxo[];
  feeSats: number;
  changeSats: number; // 0 when the change was too small and went to the fee
}

export class InsufficientFundsError extends Error {
  constructor(public readonly neededSats: number, public readonly availableSats: number) {
    super('Not enough bitcoin to cover this amount plus the network fee.');
    this.name = 'InsufficientFundsError';
  }
}

/**
 * Largest-first coin selection for a single payment with optional change back to the sender.
 * Throws InsufficientFundsError if the UTXOs can't cover amount + fee.
 */
export const selectCoins = (
  utxos: Utxo[],
  amountSats: number,
  recipientOutputBytes: number,
  feeRate: number,
): CoinSelection => {
  const sorted = [...utxos].sort((a, b) => b.value - a.value);
  const inputs: Utxo[] = [];
  let total = 0;

  for (const utxo of sorted) {
    inputs.push(utxo);
    total += utxo.value;

    const feeWithChange = Math.ceil(
      estimateVsize(inputs.length, [recipientOutputBytes, P2WPKH_OUTPUT_BYTES]) * feeRate,
    );
    const change = total - amountSats - feeWithChange;
    if (change >= CHANGE_DUST_SATS) {
      return { inputs, feeSats: feeWithChange, changeSats: change };
    }

    const feeWithoutChange = Math.ceil(estimateVsize(inputs.length, [recipientOutputBytes]) * feeRate);
    if (total - amountSats >= feeWithoutChange) {
      // No change output: whatever is left over (≥ the fee, < dust + change cost) goes to miners.
      return { inputs, feeSats: total - amountSats, changeSats: 0 };
    }
  }

  const minimumFee = Math.ceil(estimateVsize(Math.max(sorted.length, 1), [recipientOutputBytes]) * feeRate);
  throw new InsufficientFundsError(amountSats + minimumFee, total);
};
