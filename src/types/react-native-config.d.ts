// Keys read from .env (see .env.testnet.example). All values are strings at runtime.
export {};

declare module 'react-native-config' {
  export interface NativeConfig {
    BITCOIN_NETWORK?: 'mainnet' | 'testnet';
    ESPLORA_API_URL?: string;
    EXPLORER_URL?: string;
    ESPLORA_API_KEY?: string;
    ESPLORA_API_KEY_HEADER?: string;
    FEE_TARGET_BLOCKS?: string;
    MAX_TRANSFER_USD?: string;
    STORE_URL?: string;
    NTAG_WRITE_PASSWORD?: string;
  }
}
