/* eslint-env jest */

// react-native-config reads native build settings; give tests a fixed testnet config.
jest.mock('react-native-config', () => ({
  __esModule: true,
  default: { BITCOIN_NETWORK: 'testnet', ESPLORA_API_URL: 'https://esplora.test/api', EXPLORER_URL: 'https://explorer.test' },
}));

// Native modules without a JS implementation.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest'));
jest.mock('@react-native-clipboard/clipboard', () => require('@react-native-clipboard/clipboard/jest/clipboard-mock.js'));
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(async () => false),
  setGenericPassword: jest.fn(async () => ({ service: 'mock', storage: 'mock' })),
}));
jest.mock('react-native-nfc-manager', () => ({
  __esModule: true,
  default: {
    isSupported: jest.fn(async () => true),
    isEnabled: jest.fn(async () => true),
    start: jest.fn(async () => {}),
    requestTechnology: jest.fn(async () => {}),
    cancelTechnologyRequest: jest.fn(async () => {}),
    getTag: jest.fn(async () => null),
    ndefHandler: { writeNdefMessage: jest.fn(async () => {}) },
    nfcAHandler: { transceive: jest.fn(async () => []) },
  },
  NfcTech: { Ndef: 'Ndef', NfcA: 'NfcA' },
  Ndef: { text: { decodePayload: () => '' }, textRecord: text => ({ text }), encodeMessage: () => [1] },
  NfcError: { UserCancel: class UserCancel extends Error {} },
}));

// react-native-argon2 is native code. hash-wasm produces identical output (Argon2 v1.3,
// UTF-8 password and salt, lowercase hex); __tests__/deriveKey.test.ts cross-checks this.
jest.mock('react-native-argon2', () => ({
  __esModule: true,
  default: async (password, salt, options) => ({
    rawHash: await require('hash-wasm').argon2id({
      password,
      salt,
      iterations: options.iterations,
      memorySize: options.memory,
      parallelism: options.parallelism,
      hashLength: options.hashLength,
      outputType: 'hex',
    }),
    encodedHash: '',
  }),
}));
