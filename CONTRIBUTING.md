# Contributing to Bit Wand

Thanks for helping improve Bit Wand. This app manages real bitcoin, so changes are reviewed carefully, especially anything that touches keys, signing or NFC.

## Before you start

- **Security issues:** don't open a public issue. Follow [SECURITY.md](SECURITY.md).
- **Bugs and ideas:** open an issue first for anything larger than a small fix, so we can agree on the approach before you write code.

## Setup

Follow [Getting started](README.md#getting-started) in the README. In short:

```bash
npm install
cd ios && pod install && cd ..
npm run testnet
```

Develop and test on **testnet4**. Never use mainnet funds while testing.

## Before opening a pull request

Run all three checks and make sure they pass:

```bash
npm test
npm run lint
npm run typecheck
```

Format the files you changed with `npx prettier --write <files>`.

## Rules for security-sensitive code

- **Never change the key derivation by accident.** `__tests__/deriveKey.test.ts` pins the Argon2 output, private key and addresses produced for known card + password inputs. If it fails, your change would move every existing user to a different wallet. Don't update the pinned values unless the pull request is explicitly about changing the derivation, and say so clearly in its description.
- **Keep the signing checks.** `sendBitcoin()` must keep refusing when the card + password don't derive the signed-in address, and must keep verifying input amounts against the full parent transactions. `__tests__/signTransaction.test.ts` covers both.
- **Don't hold secrets longer than needed.** Copy card data and passwords into a local variable and clear the screen state before slow work starts (see `scanCardAndSend()` in `SendModal.tsx`), zero private keys with `.fill(0)` when done, and never put keys, card data or passwords in AsyncStorage or in navigation params. See [What stays in memory](README.md#what-stays-in-memory).
- **Never log secrets.** Don't `console.log` card data, passwords, private keys, Keychain values or full NFC read results, even temporarily.
- **Never commit secrets.** API keys, keystores and signing passwords stay out of the repo. Only edit the `.env.*.example` templates in commits.
- **Keep user confirmation in front of every payment.** Every send shows the recipient, amount and network fee before signing, and card wallets need a card tap and password.

## Pull requests

- Keep each pull request focused on one change.
- Describe what changed and why, and how you tested it. Say which platform and device you tested on (NFC needs a physical device).
- Add or update tests where it's practical.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
