import * as Keychain from 'react-native-keychain';
import { getDeviceAddress, getDeviceSecret } from '../src/functions/deviceAccount';

const getGenericPassword = Keychain.getGenericPassword as jest.Mock;
const setGenericPassword = Keychain.setGenericPassword as jest.Mock;
const SECRET = '7d0c5e1b9a2f4386c1e0d7b5a49f3e2c8b6a1d0f5e4c3b2a19087f6e5d4c3b2a';

beforeEach(() => {
  getGenericPassword.mockReset();
  setGenericPassword.mockReset().mockResolvedValue({ service: 'mock', storage: 'mock' });
});

test('opens the existing device wallet without writing to the Keychain', async () => {
  getGenericPassword.mockResolvedValue({ username: 'Default', password: SECRET });
  // Pinned in deriveKey.test.ts: existing merchants keep the same wallet.
  await expect(getDeviceAddress()).resolves.toBe('tb1qvxqlyhssuxph8k2fxjpkgwnzk9rvhn9f8mqncn');
  await expect(getDeviceSecret()).resolves.toBe(SECRET);
  expect(setGenericPassword).not.toHaveBeenCalled();
});

test('creates a random 32-byte secret only when none exists', async () => {
  getGenericPassword.mockResolvedValue(false);
  await getDeviceAddress();
  expect(setGenericPassword).toHaveBeenCalledTimes(1);
  expect(setGenericPassword.mock.calls[0][0]).toBe('Default');
  expect(setGenericPassword.mock.calls[0][1]).toMatch(/^[0-9a-f]{64}$/);
});

test('never creates or overwrites a secret when signing or when the entry is unexpected', async () => {
  getGenericPassword.mockResolvedValue(false);
  await expect(getDeviceSecret()).rejects.toThrow('missing');
  getGenericPassword.mockResolvedValue({ username: 'someone-else', password: 'x' });
  await expect(getDeviceAddress()).rejects.toThrow('unexpected entry');
  expect(setGenericPassword).not.toHaveBeenCalled();
});
