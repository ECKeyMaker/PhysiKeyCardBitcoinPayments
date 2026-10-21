/**
 * Builds, signs and broadcasts a payment from a card (or device) wallet. SECURITY-CRITICAL.
 *
 * - The private key is derived from the card + password for this one payment and zeroed
 *   before broadcasting. It is never stored or logged.
 * - The derived address must match the account the user is signed in to, so a wrong
 *   password or a different card is refused instead of signing from another wallet.
 * - Every input carries its full parent transaction (nonWitnessUtxo). bitcoinjs checks it
 *   against the txid, so the Bitcoin API can't trick the app into paying a hidden fee by
 *   misreporting input amounts.
 */

import * as bitcoin from 'bitcoinjs-lib';
import ecc from '@bitcoinerlab/secp256k1';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import config from './config';
import { MIN_SEND_SATS, outputBytes, outputScriptFor, selectCoins, type CoinSelection } from './bitcoin';
import { addressFromPublicKey, derivePrivateKey, keyPairFromPrivateKey } from './deriveKey';
import { broadcastTransaction, getFeeRate, getRawTransaction, getUtxos } from './esplora';

export class WrongCardOrPasswordError extends Error {
  constructor() {
    super('This card and password belong to a different wallet. Check the password and try again.');
    this.name = 'WrongCardOrPasswordError';
  }
}

export interface PaymentQuote extends CoinSelection {
  feeRate: number; // sat/vB
  amountSats: number;
  totalSats: number; // amount + fee
}

const recipientScript = (recipient: string, fromAddress: string): Uint8Array => {
  const script = outputScriptFor(recipient);
  if (!script) {
    throw new Error(`That isn't a valid Bitcoin ${config.isMainnet ? 'mainnet' : 'testnet'} address.`);
  }
  if (recipient.trim() === fromAddress) {
    throw new Error("You can't send bitcoin to the same wallet it's coming from.");
  }
  return script;
};

const checkAmount = (amountSats: number) => {
  if (!Number.isSafeInteger(amountSats) || amountSats < MIN_SEND_SATS) {
    throw new Error(`The minimum amount is ${MIN_SEND_SATS} sats.`);
  }
};

/**
 * Works out the fee and the coins a payment would use, without signing anything.
 * Throws InsufficientFundsError if the wallet can't cover amount + fee.
 */
export const quotePayment = async (
  fromAddress: string,
  recipient: string,
  amountSats: number,
): Promise<PaymentQuote> => {
  checkAmount(amountSats);
  const script = recipientScript(recipient, fromAddress);
  const [utxos, feeRate] = await Promise.all([getUtxos(fromAddress), getFeeRate()]);
  const selection = selectCoins(utxos, amountSats, outputBytes(script), feeRate);
  return { ...selection, feeRate, amountSats, totalSats: amountSats + selection.feeSats };
};

interface SendParams {
  tag: string;
  password: string;
  expectedAddress: string; // the signed-in account; the card + password must derive this address
  recipient: string;
  amountSats: number;
  feeRate: number; // from quotePayment(), so the user pays the fee they were shown
}

/** Signs and broadcasts a payment. Returns the txid. */
export const sendBitcoin = async ({
  tag,
  password,
  expectedAddress,
  recipient,
  amountSats,
  feeRate,
}: SendParams): Promise<string> => {
  checkAmount(amountSats);
  const script = recipientScript(recipient, expectedAddress);
  const ownScript = bitcoin.address.toOutputScript(expectedAddress, config.network);

  const privateKey = await derivePrivateKey(tag, password);
  let txHex: string;
  let txid: string;
  try {
    const keyPair = keyPairFromPrivateKey(privateKey);
    if (addressFromPublicKey(keyPair.publicKey) !== expectedAddress) {
      throw new WrongCardOrPasswordError();
    }

    const utxos = await getUtxos(expectedAddress);
    const { inputs, changeSats } = selectCoins(utxos, amountSats, outputBytes(script), feeRate);

    const ownScriptHex = bytesToHex(ownScript);
    const psbt = new bitcoin.Psbt({ network: config.network });
    for (const utxo of inputs) {
      const parentHex = await getRawTransaction(utxo.txid);
      const parent = bitcoin.Transaction.fromHex(parentHex);
      const output = parent.outs[utxo.vout];
      if (
        parent.getId() !== utxo.txid ||
        !output ||
        output.value !== BigInt(utxo.value) ||
        bytesToHex(output.script) !== ownScriptHex
      ) {
        throw new Error('The Bitcoin API returned inconsistent coin data. Payment cancelled.');
      }
      psbt.addInput({ hash: utxo.txid, index: utxo.vout, nonWitnessUtxo: hexToBytes(parentHex) });
    }
    psbt.addOutput({ script, value: BigInt(amountSats) });
    if (changeSats > 0) {
      psbt.addOutput({ script: ownScript, value: BigInt(changeSats) });
    }

    psbt.signAllInputs(keyPair);
    const valid = psbt.validateSignaturesOfAllInputs((pubkey, hash, signature) =>
      ecc.verify(hash, pubkey, signature),
    );
    if (!valid) {
      throw new Error('Signature check failed. Payment cancelled.');
    }
    psbt.finalizeAllInputs();
    // extractTransaction() also refuses absurd fee rates (over 5,000 sat/vB).
    const tx = psbt.extractTransaction();
    txHex = tx.toHex();
    txid = tx.getId();
  } finally {
    privateKey.fill(0);
  }

  const broadcastId = await broadcastTransaction(txHex);
  if (broadcastId !== txid) {
    throw new Error(`The network returned an unexpected transaction ID (${broadcastId}).`);
  }
  return txid;
};
