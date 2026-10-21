/**
 * Blockchain data over an Esplora REST API (mempool.space by default, or Blockstream, or
 * your own Esplora/electrs server). Set ESPLORA_API_URL in .env to change it. No API key needed.
 * API reference: https://github.com/Blockstream/esplora/blob/master/API.md
 */

import config from './config';
import type { Utxo } from './bitcoin';

const TIMEOUT_MS = 15000;

// Only sent when ESPLORA_API_KEY is set (for paid or private Esplora providers).
const authHeaders: Record<string, string> = config.esploraApiKey
  ? { [config.esploraApiKeyHeader]: config.esploraApiKey }
  : {};

const request = async (path: string, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${config.esploraApiUrl}${path}`, {
      ...init,
      headers: { ...authHeaders, ...(init?.headers as Record<string, string> | undefined) },
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Bitcoin API error ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
    }
    return response;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error('The Bitcoin network request timed out. Check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const getJson = async <T>(path: string): Promise<T> => (await request(path)).json() as Promise<T>;

interface AddressStats {
  funded_txo_sum: number;
  spent_txo_sum: number;
}

interface AddressInfo {
  chain_stats: AddressStats;
  mempool_stats: AddressStats;
}

export interface Balance {
  confirmedSats: number;
  pendingSats: number; // unconfirmed incoming minus outgoing; can be negative
  totalSats: number;
}

export const getBalance = async (address: string): Promise<Balance> => {
  const { chain_stats: chain, mempool_stats: mempool } = await getJson<AddressInfo>(`/address/${address}`);
  const confirmedSats = chain.funded_txo_sum - chain.spent_txo_sum;
  const pendingSats = mempool.funded_txo_sum - mempool.spent_txo_sum;
  return { confirmedSats, pendingSats, totalSats: confirmedSats + pendingSats };
};

/** Spendable coins, including unconfirmed ones (for example change from a recent send). */
export const getUtxos = async (address: string): Promise<Utxo[]> => {
  const utxos = await getJson<Array<{ txid: string; vout: number; value: number }>>(`/address/${address}/utxo`);
  return utxos.map(({ txid, vout, value }) => ({ txid, vout, value }));
};

/** Fee rate in sat/vB for the configured confirmation target, never below 1 sat/vB. */
export const getFeeRate = async (): Promise<number> => {
  const estimates = await getJson<Record<string, number>>('/fee-estimates');
  // Use the closest target at or above the configured one; fall back to the slowest available.
  const targets = Object.keys(estimates).map(Number).sort((a, b) => a - b);
  const target = targets.find(t => t >= config.feeTargetBlocks) ?? targets[targets.length - 1];
  const rate = target !== undefined ? estimates[String(target)] : undefined;
  return Math.max(1, rate ?? 1);
};

/** Raw transaction hex, used to verify input amounts before signing. */
export const getRawTransaction = async (txid: string): Promise<string> =>
  (await (await request(`/tx/${txid}/hex`)).text()).trim();

/** Broadcasts a signed transaction (hex) and returns its txid. */
export const broadcastTransaction = async (txHex: string): Promise<string> => {
  const response = await request('/tx', { method: 'POST', body: txHex, headers: { 'Content-Type': 'text/plain' } });
  return (await response.text()).trim();
};

interface EsploraTx {
  txid: string;
  status: { confirmed: boolean; block_time?: number };
  vin: Array<{ prevout?: { scriptpubkey_address?: string; value: number } }>;
  vout: Array<{ scriptpubkey_address?: string; value: number }>;
}

export interface Transaction {
  txid: string;
  netSats: number; // received minus sent, from this address's point of view
  confirmed: boolean;
  date: Date | null;
}

/** The address's most recent transactions (mempool first, then up to 25 confirmed). */
export const getTransactions = async (address: string): Promise<Transaction[]> => {
  const txs = await getJson<EsploraTx[]>(`/address/${address}/txs`);
  return txs.map(tx => {
    const received = tx.vout
      .filter(out => out.scriptpubkey_address === address)
      .reduce((sum, out) => sum + out.value, 0);
    const sent = tx.vin
      .filter(input => input.prevout?.scriptpubkey_address === address)
      .reduce((sum, input) => sum + (input.prevout?.value ?? 0), 0);
    return {
      txid: tx.txid,
      netSats: received - sent,
      confirmed: tx.status.confirmed,
      date: tx.status.block_time ? new Date(tx.status.block_time * 1000) : null,
    };
  });
};
