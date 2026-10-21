# Security Policy

Bit Wand derives Bitcoin keys and signs transactions that move real funds. We take security reports seriously and appreciate responsible disclosure.

## Reporting a vulnerability

**Please do not open a public issue, pull request or discussion for security problems.**

Report privately through GitHub instead:

1. Open the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Describe the issue, the affected files or versions, and steps to reproduce. Include a proof of concept if you have one.

We aim to acknowledge reports within 3 business days and to keep you updated while we investigate. Once a fix is available, we'll credit you in the advisory unless you'd rather stay anonymous.

## Scope

We're especially interested in:

- **Key derivation:** anything that weakens or changes how a card + password becomes a private key (`src/functions/deriveKey.ts`), or that leaks the key, card secret or password.
- **Transaction signing:** any way to make the app sign or broadcast a payment the user didn't confirm, pay a different amount, recipient or fee than shown, or sign from the wrong wallet (`src/functions/signTransaction.ts`, `src/functions/bitcoin.ts`, `src/components/SendModal.tsx`, `src/components/InstantAcceptModal.tsx`).
- **Untrusted API data:** ways a malicious or compromised Esplora server could cause loss of funds (`src/functions/esplora.ts`).
- **NFC handling:** reading, writing or locking cards (`src/functions/nfc.ts`, `src/functions/enablePassword.ts`).
- **Device secrets:** storage and use of the Instant Accept device secret in the Keychain / Keystore (`src/functions/deviceAccount.ts`).
- **Secrets in the build:** API keys or credentials that could end up committed or bundled.

## Known limitations

These are documented design trade-offs, not vulnerabilities. Reports that propose improvements to them are still welcome.

- The Argon2id salt is fixed and public, and the Argon2 cost is low (2 iterations, 32 MiB).
- Passwords can be as short as 4 characters.
- The NTAG write password is the same for every card made by a build, and the card secret can be read by anyone with an NFC reader.
- Instant Accept device wallets are hot wallets.
- The phone a card and password are entered on derives the private key, so a modified build of the app could steal from any card used on it (see "Whoever's phone you tap on holds your private key" in the README).
- The app trusts its Esplora server for coin lists, balances and fee rates (input amounts are verified; see the README).
- Spending limits are enforced in the app only, not on-chain.

See the [Security model](README.md#security-model) section of the README for details.

## Supported versions

Security fixes are made on the `main` branch. Forks are responsible for applying fixes to their own builds.

## Disclaimer

This software has not been independently audited and is provided as-is under the [MIT License](LICENSE), without warranty of any kind.
