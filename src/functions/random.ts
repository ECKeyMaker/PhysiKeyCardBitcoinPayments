import { bytesToHex } from '@noble/hashes/utils.js';

/** Hex string of `byteCount` bytes from the native CSPRNG (installed by react-native-get-random-values). */
export const randomHex = (byteCount: number): string => {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
};
