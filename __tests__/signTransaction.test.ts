/**
 * End-to-end signing against a fake Esplora server: builds real parent transactions paying the
 * card's wallet, then checks the transaction the app signs and broadcasts.
 */
import * as bitcoin from 'bitcoinjs-lib';
import ecc from '@bitcoinerlab/secp256k1';
import { estimateVsize } from '../src/functions/bitcoin';
import { quotePayment, sendBitcoin, WrongCardOrPasswordError } from '../src/functions/signTransaction';

const network = bitcoin.networks.testnet;
const CARD = 'a3f1c2d4e5b60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f809';
const PASSWORD = '1234';
const FROM = 'tb1q4h8u4djvealnp2yqxuxprugd0avtlf3neaguk3'; // pinned in deriveKey.test.ts
const TO = 'tb1qq89j97p3prjy4pk77cpselhkx2htpw6uush9fs';
const FEE_RATE = 3;

/** A parent transaction with one output paying `value` sats to FROM. */
const fundingTx = (value: number, seed: number) => {
  const tx = new bitcoin.Transaction();
  tx.addInput(new Uint8Array(32).fill(seed), 0);
  tx.addOutput(bitcoin.address.toOutputScript(FROM, network), BigInt(value));
  return tx;
};

let parents: bitcoin.Transaction[];
let reportedValues: number[];
let broadcasts: string[];

beforeEach(() => {
  parents = [fundingTx(40_000, 1), fundingTx(25_000, 2)];
  reportedValues = [40_000, 25_000];
  broadcasts = [];
  globalThis.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace('https://esplora.test/api', '');
    const reply = (body: unknown) =>
      ({ ok: true, json: async () => body, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) } as Response);
    if (path === `/address/${FROM}/utxo`) {
      return reply(parents.map((tx, i) => ({ txid: tx.getId(), vout: 0, value: reportedValues[i], status: { confirmed: true } })));
    }
    if (path === '/fee-estimates') {
      return reply({ '1': 20, '6': FEE_RATE, '144': 1 });
    }
    const hex = path.match(/^\/tx\/([0-9a-f]{64})\/hex$/);
    if (hex) {
      return reply(parents.find(tx => tx.getId() === hex[1])!.toHex());
    }
    if (path === '/tx' && init?.method === 'POST') {
      broadcasts.push(init.body as string);
      return reply(bitcoin.Transaction.fromHex(init.body as string).getId());
    }
    throw new Error(`Unexpected request ${url}`);
  }) as unknown as typeof fetch;
});

describe('quotePayment + sendBitcoin', () => {
  it('signs a valid payment with change and the quoted fee', async () => {
    const quote = await quotePayment(FROM, TO, 50_000);
    expect(quote.feeRate).toBe(FEE_RATE);
    expect(quote.inputs).toHaveLength(2);

    const txid = await sendBitcoin({
      tag: CARD,
      password: PASSWORD,
      expectedAddress: FROM,
      recipient: TO,
      amountSats: 50_000,
      feeRate: quote.feeRate,
    });

    expect(broadcasts).toHaveLength(1);
    const tx = bitcoin.Transaction.fromHex(broadcasts[0]);
    expect(tx.getId()).toBe(txid);

    const outputs = tx.outs.map(out => ({ address: bitcoin.address.fromOutputScript(out.script, network), value: Number(out.value) }));
    expect(outputs).toEqual([
      { address: TO, value: 50_000 },
      { address: FROM, value: 65_000 - 50_000 - quote.feeSats },
    ]);

    // Fee matches the quote, and the size estimate is never below the real size.
    expect(65_000 - outputs[0].value - outputs[1].value).toBe(quote.feeSats);
    expect(tx.virtualSize()).toBeLessThanOrEqual(estimateVsize(2, [31, 31]));

    // Each input has a valid P2WPKH witness signature over the right amount.
    tx.ins.forEach((input, index) => {
      const [signature, pubkey] = input.witness;
      const sig = bitcoin.script.signature.decode(signature);
      const scriptCode = bitcoin.payments.p2pkh({ pubkey, network }).output!;
      const hash = tx.hashForWitnessV0(index, scriptCode, BigInt(reportedValues[index]), sig.hashType);
      expect(ecc.verify(hash, pubkey, sig.signature)).toBe(true);
    });
  });

  it('refuses a wrong password instead of signing from another wallet', async () => {
    await expect(
      sendBitcoin({ tag: CARD, password: '12345', expectedAddress: FROM, recipient: TO, amountSats: 10_000, feeRate: 1 }),
    ).rejects.toBeInstanceOf(WrongCardOrPasswordError);
    expect(broadcasts).toHaveLength(0);
  });

  it('refuses to sign when the API misreports an input amount', async () => {
    reportedValues[0] = 4_000_000;
    await expect(
      sendBitcoin({ tag: CARD, password: PASSWORD, expectedAddress: FROM, recipient: TO, amountSats: 10_000, feeRate: 1 }),
    ).rejects.toThrow('inconsistent coin data');
    expect(broadcasts).toHaveLength(0);
  });

  it('rejects invalid recipients, self-sends and dust amounts before signing', async () => {
    await expect(quotePayment(FROM, 'bc1q4h8u4djvealnp2yqxuxprugd0avtlf3nnmn0dz', 10_000)).rejects.toThrow('valid Bitcoin testnet address');
    await expect(quotePayment(FROM, FROM, 10_000)).rejects.toThrow('same wallet');
    await expect(quotePayment(FROM, TO, 100)).rejects.toThrow('minimum amount');
  });
});
