module.exports = {
  preset: '@react-native/jest-preset',
  // These ship ES modules for the "browser"/"react-native" conditions, so Jest must transform them too.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community|-async-storage|-clipboard)?|@react-navigation|@noble|@bitcoinerlab|uint8array-tools|varuint-bitcoin|bip174|bitcoinjs-lib|ecpair|valibot)/)',
  ],
  setupFiles: ['./jest.setup.js'],
};
