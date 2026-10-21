/**
 * App configuration, compiled in from `.env` by react-native-config.
 * Run `npm run testnet` or `npm run mainnet` to select a network (see scripts/set-env.js).
 * Values are read at build time, so restart Metro and rebuild after changing them.
 */

import Config from 'react-native-config';
import * as bitcoin from 'bitcoinjs-lib';

export type NetworkName = 'mainnet' | 'testnet';

const networkName: NetworkName = Config.BITCOIN_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';

const defaults = {
  mainnet: {
    esploraApiUrl: 'https://mempool.space/api',
    explorerUrl: 'https://mempool.space',
  },
  testnet: {
    esploraApiUrl: 'https://mempool.space/testnet4/api',
    explorerUrl: 'https://mempool.space/testnet4',
  },
};

const trimSlash = (url: string) => url.replace(/\/+$/, '');

const positiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const config = {
  networkName,
  isMainnet: networkName === 'mainnet',
  // bitcoinjs-lib's `testnet` params are shared by testnet3, testnet4 and signet (tb1... addresses).
  network: networkName === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet,
  esploraApiUrl: trimSlash(Config.ESPLORA_API_URL || defaults[networkName].esploraApiUrl),
  explorerUrl: trimSlash(Config.EXPLORER_URL || defaults[networkName].explorerUrl),
  // Optional, for Esplora providers that require a key. Placeholder values are ignored.
  // Anything in .env is compiled into the app and can be extracted from it, so use a key
  // that's restricted to this app and safe to expose.
  esploraApiKey: Config.ESPLORA_API_KEY && !Config.ESPLORA_API_KEY.startsWith('YOUR_') ? Config.ESPLORA_API_KEY : '',
  esploraApiKeyHeader: Config.ESPLORA_API_KEY_HEADER || 'x-api-key',
  // Confirmation target, in blocks, used to pick a fee rate from the Esplora fee estimates.
  feeTargetBlocks: positiveNumber(Config.FEE_TARGET_BLOCKS, 6),
  // Client-side guardrail per transfer, in USD. Not enforced on-chain.
  maxTransferUsd: positiveNumber(Config.MAX_TRANSFER_USD, 3000),
  // Shown on the landing screen as "Don't have a card?". Leave empty to hide the link.
  storeUrl: Config.STORE_URL ?? '',
};

export const explorerTxUrl = (txid: string) => `${config.explorerUrl}/tx/${txid}`;
export const explorerAddressUrl = (address: string) => `${config.explorerUrl}/address/${address}`;

export default config;
