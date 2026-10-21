/** The optional Esplora API key is sent only when a real key is configured. */

const loadEsplora = (env: Record<string, string>) => {
  jest.resetModules();
  jest.doMock('react-native-config', () => ({
    __esModule: true,
    default: { BITCOIN_NETWORK: 'testnet', ESPLORA_API_URL: 'https://esplora.test/api', ...env },
  }));
  return require('../src/functions/esplora') as typeof import('../src/functions/esplora');
};

const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, text: async () => 'ab'.repeat(32) } as Response));

beforeEach(() => {
  fetchMock.mockClear();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

const sentHeaders = () => fetchMock.mock.calls[0][1]?.headers as Record<string, string>;

test('sends no key by default or when the placeholder is left in place', async () => {
  await loadEsplora({ ESPLORA_API_KEY: 'YOUR_ESPLORA_API_KEY' }).getRawTransaction('00');
  expect(sentHeaders()).toEqual({});
});

test('sends the configured key in the configured header', async () => {
  await loadEsplora({ ESPLORA_API_KEY: 'Bearer abc123', ESPLORA_API_KEY_HEADER: 'Authorization' }).broadcastTransaction('beef');
  expect(sentHeaders()).toEqual({ Authorization: 'Bearer abc123', 'Content-Type': 'text/plain' });
});

test('defaults the header name to x-api-key', async () => {
  await loadEsplora({ ESPLORA_API_KEY: 'k-1' }).getRawTransaction('00');
  expect(sentHeaders()).toEqual({ 'x-api-key': 'k-1' });
});
