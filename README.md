# Bit Wand

**Bit Wand turns a low-cost NFC tag into a Bitcoin payment card.** It's an open-source React Native app for iOS and Android. A card plus a password *is* the wallet: the private key is derived from the two on the phone each time it's needed, and is never stored anywhere.

The same app also works as a point of sale. A merchant opens **Accept Card Payment**, types an amount, and the customer taps their card and enters their password on the merchant's phone to pay.

> ⚠️ **This software moves real bitcoin and has not been independently audited.** Read the [Security model](#security-model) before you fork it for production use. Develop on testnet.

## Contents

- [How it works](#how-it-works)
- [Security model](#security-model)
- [App flows](#app-flows)
- [Project structure](#project-structure)
- [Configuration](#configuration)
- [Getting started](#getting-started)
- [Release builds](#release-builds)
- [Development](#development)
- [Forking checklist](#forking-checklist)
- [Upgrading from earlier versions](#upgrading-from-earlier-versions)
- [Known issues](#known-issues)
- [Troubleshooting](#troubleshooting)
- [Contributing, security and license](#contributing-security-and-license)

---

## How it works

### Key management primitive

Each card stores **32 random bytes** (64 hex characters) as a single NDEF text record, written once when the card is set up. The card secret is combined with the user's password to derive a Bitcoin key:

```
a          = hex( Argon2id(cardSecret + password, salt, t=2, m=32 MiB, p=2, 32-byte output) )
privateKey = SHA256( SHA256(a) + a )        ← both hashes are over the UTF-8 text of the hex strings
address    = P2WPKH(publicKey(privateKey))  ← native SegWit: bc1q... on mainnet, tb1q... on testnet
```

The code is in [deriveKey.ts](src/functions/deriveKey.ts). Its properties:

- **Nothing secret is stored.** The phone keeps only the public address (and only if the user saves the account). The key is re-derived for each login or payment, then zeroed.
- **Neither half is enough.** The card alone doesn't reveal the wallet without the password, and the password alone is useless without the card.
- **Every password is a valid wallet.** There's no "wrong password" error at login: a mistyped password opens a different, empty wallet. That's why the app asks for the password twice at login, and why payments check that the card + password derive the signed-in address before signing.
- **The derivation is frozen.** Changing the salt, the Argon2 options, the hash steps or the order of card + password moves every existing user to a different wallet. [`__tests__/deriveKey.test.ts`](__tests__/deriveKey.test.ts) pins the exact outputs, so CI fails if any change (including a dependency upgrade) would do that.

The card is then **write-locked** with the NTAG21x password feature ([enablePassword.ts](src/functions/enablePassword.ts)), so its secret can't be overwritten or erased by accident. Reading stays open, so the lock doesn't add secrecy; the password does that.

### Two kinds of accounts

| | Card wallet | Device wallet ("Accept Card Payment") |
|---|---|---|
| **Secret** | Card secret + the user's password | A random 32-byte secret in the phone's Keychain (iOS) / Keystore (Android) |
| **Derivation** | `derive(cardSecret, password)` | `derive(deviceSecret, deviceSecret)`, the same function |
| **To send** | Tap the card and enter the password | No tap needed: the app signs with the Keychain secret |
| **Use** | The customer's wallet, cold storage | The merchant's till: receives Instant Accept payments, then withdraws to a card or any address |
| **If the phone is lost** | Nothing is lost: the card + password still work in any build | **The funds are lost** unless they were withdrawn first. It's a hot wallet |

### Bitcoin transactions

The app talks to an **[Esplora](https://github.com/Blockstream/esplora/blob/master/API.md) REST API**: [mempool.space](https://mempool.space/docs/api/rest) by default, or Blockstream, or your own server. The defaults need no API key; providers that require one are supported with `ESPLORA_API_KEY`. [esplora.ts](src/functions/esplora.ts) fetches balances, spendable coins (UTXOs), fee estimates and history, and broadcasts signed transactions.

A payment ([signTransaction.ts](src/functions/signTransaction.ts)) goes through these steps:

1. **Quote.** `quotePayment()` gets the wallet's coins and the network fee rate for the configured confirmation target (6 blocks, about an hour, by default). It selects coins largest-first and computes the exact fee. The user sees the recipient, amount, fee and total before anything is signed.
2. **Derive and check.** `sendBitcoin()` derives the key from the card + password and **refuses to continue if it doesn't match the signed-in address.**
3. **Verify the coins.** For each input it downloads the full parent transaction and checks that the txid, amount and script match what the API reported. bitcoinjs then signs over those verified amounts (`nonWitnessUtxo`). A malicious API can't trick the app into paying a hidden fee by misreporting input amounts.
4. **Sign and broadcast.** It pays the recipient (any address type: `bc1q`, `bc1p` Taproot, `1...`, `3...`), sends change back to the same address (change under 294 sats goes to the fee instead), zeroes the key, broadcasts, and checks the returned txid.

All amounts are handled as integer satoshis ([bitcoin.ts](src/functions/bitcoin.ts)), never floating-point BTC.

---

## Security model

Read this before forking for production use.

**What protects a card wallet**

- The private key is never stored: not on disk, not in the Keychain, not in app state, and never logged. It exists only while one login or payment runs, and it's zeroed afterwards. See [What stays in memory](#what-stays-in-memory).
- A stolen card alone is not enough: the attacker also needs the password, and each guess costs one Argon2id run.
- A password alone is not enough: the attacker also needs the card secret.
- Before signing, the app checks that the card + password derive the signed-in account, that the wallet can cover the amount plus the fee, and that every input amount matches its parent transaction.

**⚠️ Whoever's phone you tap on holds your private key at that moment**

The private key is derived on the phone that reads the card and receives the password. That phone has full control of the wallet for as long as the app keeps the key. In **Instant Accept**, the customer taps their card and types their password on the **merchant's** phone.

This repository's code only uses the key to sign the payment the customer confirmed, then discards it. But this is open-source software: anyone can build a modified version that looks identical and silently drains every card used on it. A card + password gives no protection against the device it's entered on. Make sure users understand:

- Only tap your card and enter your password in an app you trust, on a device you trust, installed from a source you trust (an official app store listing).
- If you're unsure about a merchant's phone, pay from a small "spending" card instead of your main card. Each card + password is a separate wallet.
- To receive bitcoin, share your **address** (it's public and safe) instead of tapping your card on someone else's phone.
- If you publish a fork, users trust *your* build with their keys. Build it from reviewed source, sign it with a key you protect, and say where people can verify it.

**Limitations to be aware of**

- **The salt is fixed and public, and the Argon2 cost is modest.** `SALT` in [deriveKey.ts](src/functions/deriveKey.ts) is `'BklcooclkncUhnaiianhUcnklcooclkB'` for every user, with 2 iterations and 32 MiB. Raising the cost or changing the salt would make guessing harder, but it gives every existing card a *different* wallet in your build. Decide before you ship, never after. If you change it, `npm test` fails until you regenerate the pinned values in `__tests__/deriveKey.test.ts`.
- **Short passwords are weak.** The app accepts passwords of 4+ characters (`MIN_PASSWORD_LENGTH` in [useVerifyPasswords.ts](src/hooks/useVerifyPasswords.ts)). Argon2id slows guessing, but a 4-digit PIN still has only 10,000 possibilities for someone holding the card. Consider requiring longer passwords for new cards. Raising the minimum for login would lock out existing users with shorter passwords.
- **The card lock prevents accidents, not attacks.** The NTAG write password (`NTAG_WRITE_PASSWORD`, default `1234abcd`) is the same for every card made by a build and is visible in the app binary. Anyone can still *read* the card secret with a phone; the security relies on the password.
- **The app trusts its Esplora server for some things.** Input amounts are verified (see above), but the server could still hide coins, report a misleading balance, suggest an inflated fee rate (you see the fee before confirming), or refuse to broadcast. It also learns which addresses the app looks up. For production, consider running your own Esplora / electrs server and setting `ESPLORA_API_URL`.
- **Device wallets are hot wallets.** Treat them like a cash register: withdraw regularly. Deleting the app or wiping the phone deletes the Keychain secret and any funds left in that wallet.
- **Address reuse.** Each wallet is a single address, and change goes back to it. This is simple and easy to recover from (the same card + password always finds the funds), but it's worse for privacy than an HD wallet.
- **Spending limits are client-side only.** The app blocks single transfers of `MAX_TRANSFER_USD` ($3,000 by default) or more, using the CoinGecko price. If the price can't be loaded, sending is blocked rather than unlimited. These are UX guardrails, not on-chain limits.

### What stays in memory

| Secret | Where it lives | How long |
|---|---|---|
| **Private key** | A local `Uint8Array` inside `derivePrivateKey()` / `sendBitcoin()` / `deriveAddress()`, and the signing key pair built from it | Only while one login or payment runs. The array is zeroed with `.fill(0)` before broadcasting |
| **Card secret** (read from the card) | The screen or sheet that scanned it | Card login: until the password sheet closes, then the navigation history is reset so the login screens unmount. Send: read at signing time, never put in state. Instant Accept: in a ref (not rendered) between the tap and the customer's confirmation, then cleared |
| **Password** | The password field | Copied out and cleared from the field as soon as it's submitted. Instant Accept keeps it in the same ref as the card secret until the customer confirms or cancels |
| **Device secret** | The phone's Keychain / Keystore | Persistently, by design: this is what makes device wallets [hot wallets](#security-model) |
| **Wallet address** | Navigation params and, for saved accounts, AsyncStorage | Persistently. Addresses are public and safe to keep |

"Cleared" means the app drops every reference (or zeroes the bytes, for the private key), so the value can be garbage collected. **JavaScript strings can't be overwritten**, so the card secret, the password and the Argon2 intermediate values stay in RAM until the garbage collector reuses that space, and the OS or keyboard may keep their own copies of typed text. On a phone compromised at root level, an attacker could still scrape them from memory. The app's job is to keep that window as short as possible, not to make it zero.

---

## App flows

All payment and setup flows are bottom sheets in [src/components/](src/components/). Each multi-step flow keeps a `step` state and renders one step at a time inside the same sheet ([BottomSheet.tsx](src/components/BottomSheet.tsx)).

### Navigation map

```
LandingScreen
├── Accept Card Payment ─► HomeScreen (device wallet): balance, history
│                           ├── Accept BTC ── InstantAcceptModal: merchant enters amount → customer password + card tap
│                           │                 → customer reviews from / to / fee → Pay
│                           └── Withdraw ──── SendModal (signs with the Keychain secret)
├── Card Management ─────► CardManagementScreen: saved accounts, Log In with Card
│                           ├── blank card ── CreateCardModal: choose password → tap (write secret) → tap (lock) → save?
│                           ├── written card  PasswordModal: password × 2 → HomeScreen (card wallet)
│                           └── saved account ──────────────────────────────► HomeScreen (card wallet, view only until you send)
│                                                                              └── Send Bitcoin ── SendModal (card tap + password)
└── Don't have a card? ──► WebViewScreen (STORE_URL)
```

Routes and their params are typed in [navigation.ts](src/navigation.ts). `openAccount()` opens a wallet and resets the navigation history, so the screens that held card data and passwords are unmounted.

### Example: sending bitcoin ([SendModal.tsx](src/components/SendModal.tsx))

- **Step 0 – Recipient.** Validated against the configured network with `isValidAddress()`. Sending to the wallet's own address is refused.
- **Step 1 – Amount.** Parsed to satoshis by `useAmountInput()`: at most 8 decimals, at least 546 sats, under `MAX_TRANSFER_USD`.
- **Step 2 – Review.** `quotePayment()` shows the network fee, fee rate and total. Insufficient funds are reported here, before anything is signed.
- **Step 3 – Sign (card wallets).** The user types the password, then taps the card. `scanCardAndSend()` copies the password out of state, clears the field, reads the card and calls `sendBitcoin()`. Device wallets skip this step and sign with the Keychain secret.
- **Step 4 – Result.** The txid with a link to the block explorer, or the specific reason it failed (wrong card or password, not enough bitcoin, network error).

NFC on Android needs an in-app "Ready to Scan" prompt, so [AndroidScanModal](src/components/AndroidScanModal.tsx) is shown on Android only; iOS shows its own system NFC sheet.

---

## Project structure

```
├── App.tsx, index.js            Navigation stack; random-number polyfill; console.log disabled in release builds
├── scripts/set-env.js           Copies .env.testnet / .env.mainnet over .env (used by the npm scripts)
├── .env.*.example               Config templates (no secrets needed); copied to .env.testnet / .env.mainnet
├── __tests__/                   Jest tests: pinned key derivation, signing against a fake Esplora, helpers, app render
├── jest.config.js, jest.setup.js  Test config and native-module mocks (hash-wasm stands in for native Argon2)
├── patches/                     patch-package fixes applied on npm install (react-native-argon2: Gradle 9 and RN 0.87 iOS headers)
├── LICENSE, LICENSES/           MIT for this project; SIL OFL for the Michroma and Figtree fonts
├── SECURITY.md, CONTRIBUTING.md Vulnerability reporting and contribution rules
├── .github/                     CI workflow (tests, lint, typecheck), issue and pull request templates
├── src/
│   ├── screens/                 One file per route: Landing, CardManagement, Home, WebView
│   ├── components/              Bottom-sheet flows (Send, InstantAccept, CreateCard, Password, SaveAccount) and UI pieces
│   ├── hooks/                   Stateful logic: card setup, balance, BTC price, amount input, password checks, scan prompt
│   ├── functions/               Logic with no UI
│   │   ├── deriveKey.ts         Card + password → key → address (Argon2id, salt)       ← security-critical
│   │   ├── signTransaction.ts   Quote, verify inputs, sign and broadcast payments      ← security-critical
│   │   ├── bitcoin.ts           Amount parsing, address validation, fee sizes, coin selection
│   │   ├── esplora.ts           Balance, UTXOs, fee estimates, history, broadcast
│   │   ├── nfc.ts               NFC sessions; read a card; write a new card secret
│   │   ├── enablePassword.ts    Write-lock NTAG213/215/216 cards (from the NXP datasheet)
│   │   ├── deviceAccount.ts     The Instant Accept device secret in the Keychain / Keystore
│   │   ├── asyncStorage.ts      Saved account names → addresses (no secrets)
│   │   ├── config.ts            Network and endpoints from .env
│   │   └── ...                  BTC price, random hex, clipboard, error messages
│   ├── navigation.ts            Route types, openAccount(), openWebView()
│   ├── styles/common.ts         Shared fonts, colors and sheet styles
│   ├── types/                   Type declarations (.env keys, crypto global)
│   └── assets/                  Images, fonts, icons
├── ios/                         Xcode project (open bitwand.xcworkspace after pod install)
└── android/                     Gradle project, package com.physikey.bitwand
```

---

## Configuration

Settings are compiled into the app from `.env` by [react-native-config](https://github.com/lugg/react-native-config). Don't edit `.env` directly: edit `.env.testnet` or `.env.mainnet`, and let the npm scripts copy the right one into place. They're created from the `.example` templates on first run and are gitignored. **No API keys are required with the defaults.**

If your Esplora provider needs an API key, replace the `YOUR_ESPLORA_API_KEY` placeholder in `.env.testnet` / `.env.mainnet`. **Anything in `.env` ships inside the app** and can be extracted from it, so only use keys meant for client apps (restricted to this app, rate-limited, safe to leak). Signing keys and passwords never go in `.env`; see [Release builds](#release-builds).

| Key | Default (testnet / mainnet) | What it does |
|---|---|---|
| `BITCOIN_NETWORK` | `testnet` / `mainnet` | Address format (`tb1`/`bc1`) and network checks. Anything other than `mainnet` means testnet |
| `ESPLORA_API_URL` | `https://mempool.space/testnet4/api` / `https://mempool.space/api` | Esplora REST API. Testnet3 is `https://blockstream.info/testnet/api`; signet is `https://mempool.space/signet/api` |
| `EXPLORER_URL` | `https://mempool.space/testnet4` / `https://mempool.space` | Block explorer for the "View" links (`/tx/<txid>` and `/address/<address>`) |
| `ESPLORA_API_KEY` | `YOUR_ESPLORA_API_KEY` (ignored) | Optional key for Esplora providers that require one. Values starting with `YOUR_` are treated as unset |
| `ESPLORA_API_KEY_HEADER` | `x-api-key` | Header the key is sent in. Use `Authorization` with a value like `Bearer <token>` if your provider expects that |
| `FEE_TARGET_BLOCKS` | `6` | Confirmation target used to pick a fee rate from `/fee-estimates` (1 block ≈ 10 minutes) |
| `MAX_TRANSFER_USD` | `3000` | Client-side limit per transfer |
| `STORE_URL` | PhysiKey store | "Don't have a card?" link on the landing screen. Empty hides it |
| `NTAG_WRITE_PASSWORD` | `1234abcd` | 8 hex characters used to write-lock cards. Not a secret, and not part of the wallet derivation |

Values are read when the app is built, so **rebuild the native app after switching networks** (Metro alone isn't enough). The header shows "Bit Wand (Testnet)" and the landing screen shows a TESTNET banner on testnet builds.

Third-party services the app calls: the Esplora server above, `api.coingecko.com` for the BTC/USD price, and whatever pages users open in the in-app browser.

---

## Getting started

### Prerequisites

- **Node.js 22.11 or later** and npm.
- **Android:** Android Studio with the Android SDK (API 36 and 37), and **JDK 17** (`brew install openjdk@17`, then set `JAVA_HOME`). Gradle downloads the NDK and build tools on the first build.
- **iOS:** a Mac with **Xcode 26** and [CocoaPods](https://cocoapods.org) (`brew install cocoapods`), plus an Apple Developer account to run on a device.
- **A physical phone with NFC.** Simulators and emulators can't read cards. iPhones need iOS 16.6 or later.
- **NFC cards:** NTAG213, NTAG215 or NTAG216 stickers, cards or key fobs (ISO 14443-A, NFC Forum Type 2).

See React Native's [environment setup guide](https://reactnative.dev/docs/set-up-your-environment) if this is your first React Native project.

### 1. Install

```bash
npm install
cd ios && pod install && cd ..
```

### 2. Configure

```bash
npm run testnet     # creates .env.testnet from the template, copies it to .env and starts Metro
```

The defaults work without changes. To use mainnet later, run `npm run mainnet` (and rebuild).

### 3. Run on a device

Keep Metro running from step 2, then in another terminal:

```bash
npm run android     # with an Android phone connected over USB (USB debugging on)
npm run ios         # or open ios/bitwand.xcworkspace in Xcode, pick your iPhone and press Run
```

For iOS, set your own signing team in Xcode first (target **bitwand → Signing & Capabilities**). If you change the bundle identifier, enable the **NFC Tag Reading** capability for the new App ID in your Apple Developer account.

### 4. Try it on testnet

1. **Card Management → Log In with Card** and tap a blank NTAG card. Choose a password, then tap again to write and then lock the card.
2. On the Home screen, tap the address to copy it, and get free testnet4 coins from a faucet such as [mempool.space/testnet4/faucet](https://mempool.space/testnet4/faucet).
3. Pull down to refresh. Try **Send Bitcoin** (tap the card to sign), and try **Accept Card Payment → Accept BTC** to pay a device wallet with the card.
4. Try a wrong password at the signing step: the app should refuse with "This card and password belong to a different wallet".

---

## Release builds

Bump the version in both places before every store upload:

| | Version shown to users | Build number (must increase every upload) |
|---|---|---|
| Android ([android/app/build.gradle](android/app/build.gradle)) | `versionName "2.1.0"` | `versionCode 6` |
| iOS (Xcode target → General, or `project.pbxproj`) | `MARKETING_VERSION = 2.1.0` | `CURRENT_PROJECT_VERSION = 7` |

### Android (Google Play)

1. **Create an upload key** once, and keep it outside the repo:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore ~/keys/bitwand-upload.keystore \
     -alias bitwand-upload -keyalg RSA -keysize 2048 -validity 10000
   ```
2. **Add the signing settings.** Copy the template and replace its `YOUR_...` placeholders:
   ```bash
   cp android/keystore.properties.example android/keystore.properties   # gitignored
   ```
   ```properties
   BITWAND_UPLOAD_STORE_FILE=/Users/you/keys/bitwand-upload.keystore
   BITWAND_UPLOAD_KEY_ALIAS=bitwand-upload
   BITWAND_UPLOAD_STORE_PASSWORD=...
   BITWAND_UPLOAD_KEY_PASSWORD=...
   ```
   You can also set them as **environment variables** with the same names (they take priority, which suits CI), or in `~/.gradle/gradle.properties`. **Never put them in `.env`**: react-native-config compiles `.env` into the app, so they'd ship inside it. Until these are set, release builds are signed with the public debug key: fine for testing, rejected by Google Play.
3. **Build the bundle:**
   ```bash
   npm run build:android:mainnet   # → android/app/build/outputs/bundle/release/app-release.aab
   ```
   For a test APK you can install directly: `cd android && ./gradlew assembleRelease`.
4. **Upload** the `.aab` in the Play Console and turn on **Play App Signing**. Back up the upload keystore and its passwords, for example in a password manager. They exist only on your machine.

Play requirements this project already meets: **target API 36** (required for new apps and updates since August 31, 2026), **16 KB memory page support** (React Native 0.87 and react-native-argon2 4), and edge-to-edge layouts. You still need to provide, in the Play Console:

- a **privacy policy** URL,
- the **Data safety** form (the app collects nothing itself, but it sends addresses to the Esplora server),
- the **financial features** declaration, as a non-custodial cryptocurrency wallet. Check Google Play's policies on blockchain-based content and cryptocurrency wallets for each country you target.

### iOS (App Store)

1. In Xcode, open `ios/bitwand.xcworkspace`, select the **bitwand** target, and set your **Team** and **Bundle Identifier** under Signing & Capabilities. Make sure **Near Field Communication Tag Reading** is listed; the entitlement is in [bitwand.entitlements](ios/bitwand/bitwand.entitlements).
2. Run `npm run mainnet` once so `.env` holds mainnet settings. **Product → Archive** bundles the JavaScript with the current `.env` (the standard "Bundle React Native code and images" build phase), so an archive never ships a stale bundle.
3. In the Organizer, **Distribute App → App Store Connect**.

The project is already set up for review: `NFCReaderUsageDescription` explains NFC use, `UIRequiredDeviceCapabilities` includes `nfc` (so only NFC-capable iPhones can install it), the app is iPhone-only, and a privacy manifest ([PrivacyInfo.xcprivacy](ios/bitwand/PrivacyInfo.xcprivacy)) declares the required-reason APIs React Native uses. `ITSAppUsesNonExemptEncryption` is `false`, since the app only uses cryptography for signing, hashing and HTTPS; confirm that this applies to your fork. You'll also need a privacy policy URL, and the cryptocurrency section of Apple's [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (3.1.5) applies to wallets.

---

## Development

```bash
npm test            # Jest: key derivation vectors, signing, helpers, storage, app render
npm run lint        # ESLint (@react-native config)
npm run typecheck   # tsc --noEmit
```

The tests run without a phone. Native modules are mocked in [jest.setup.js](jest.setup.js), and [hash-wasm](https://github.com/Daninet/hash-wasm) stands in for the native Argon2 library (its output was cross-checked against the reference C implementation). [`signTransaction.test.ts`](__tests__/signTransaction.test.ts) signs real transactions against a fake Esplora server and verifies the signatures, outputs and fee, the wrong-password refusal and the lying-API refusal.

The same three checks run in GitHub Actions on every push and pull request ([ci.yml](.github/workflows/ci.yml)).

`npm audit` reports two denial-of-service advisories, which it counts once for every package that depends on them: `braces` (high, crafted glob patterns), pulled in by the React Native CLI and Metro, and `sprintf-js` (moderate), pulled in by Jest's coverage tooling. Both are build and test tools that run on your computer. Neither is bundled into the app. `npm audit fix --force` would downgrade React Native, so don't run it.

---

## Forking checklist

Before publishing your own build:

1. **Decide on the key derivation now.** Keep it, and your users' cards work in this app and in every other build that kept it. Or change `SALT` / `ARGON2_OPTIONS` for a separate key space (stronger Argon2 settings are a good reason). You can't change it after people hold funds.
2. **Rename the app.** Display name (`app.json`, `ios/bitwand/Info.plist`, `android/app/src/main/res/values/strings.xml`), iOS bundle identifier and team (Xcode), Android `applicationId` and `namespace` ([build.gradle](android/app/build.gradle)), the title text in [HomeHeader.tsx](src/components/HomeHeader.tsx) and [App.tsx](App.tsx), the `NFCReaderUsageDescription` in `Info.plist`, and the "not set up in Bit Wand" warnings in [HomeScreen.tsx](src/screens/HomeScreen.tsx) and [PasswordModal.tsx](src/components/PasswordModal.tsx).
3. **Replace the artwork:** the app icons (`ios/bitwand/Images.xcassets`, `android/app/src/main/res/mipmap-*`), the launch screen, and the images in `src/assets/`.
4. **Fonts.** The app uses **Michroma** (titles) and **Figtree** (body text), both under the SIL Open Font License ([LICENSES/](LICENSES/)), so they can be redistributed in forks. To change them, put the new files in `src/assets/fonts/` named after each font's PostScript name, run `npx react-native-asset` (it updates the Xcode project, `UIAppFonts` and the Android assets), and set the names in [styles/common.ts](src/styles/common.ts). Commercial fonts usually can't be published in a public repository.
5. **Set your own `NTAG_WRITE_PASSWORD`** if you don't want cards to be lockable/unlockable by other builds. Cards locked by a build with a different password can still be read and used, but not re-locked.
6. **Choose your Esplora server.** For production, consider your own [Esplora](https://github.com/Blockstream/esplora) or [electrs](https://github.com/romanz/electrs) instance, for privacy and availability.
7. **Review the limits and copy:** `MAX_TRANSFER_USD`, `MIN_PASSWORD_LENGTH`, `STORE_URL`, and the warnings in the setup and login sheets.
8. **Set up release signing** with your own upload key and Apple team ([Release builds](#release-builds)).
9. **Publish where users can verify your build**, and keep [SECURITY.md](SECURITY.md) pointing to your repository. Point the repository URLs in `package.json` and `.github/ISSUE_TEMPLATE/config.yml` to your repository, and turn on GitHub's private vulnerability reporting.

### Ideas for extending

- **Buying bitcoin:** link a regulated on-ramp in a web view or with its SDK, using the wallet address as the destination. Keep its API keys out of the repo.
- **QR codes:** show the address as a QR code on Home, and scan recipients' QR codes in SendModal.
- **Fee choice:** let users pick a fee target, or add RBF (`sequence < 0xfffffffe`) so stuck payments can be bumped.
- **Stronger key derivation for new cards:** add a version byte to the card data, so new cards can use stronger Argon2 settings while old cards keep working.

---

## Upgrading from earlier versions

Version 2.1 is a rewrite of the app's internals. **Existing wallets don't change**: every card + password and the Instant Accept device wallet derive the same addresses as before (pinned by `__tests__/deriveKey.test.ts`). What changed for developers:

- **Blockchain API.** Tatum (which needed an API key) was replaced with Esplora (no key by default; optional `ESPLORA_API_KEY`). The old `TATUM_API_KEY`, `NETWORK` and `CHAIN` settings are gone, and no keys or signing passwords are stored in the repository; see [Configuration](#configuration). Testnet now defaults to **testnet4**; set `ESPLORA_API_URL` to `https://blockstream.info/testnet/api` if your test coins are on testnet3.
- **React Native 0.75 → 0.87** (New Architecture, Android target API 36, edge-to-edge), with all native modules updated. The Node.js polyfill stack (`rn-nodeify`, `react-native-crypto`, `shim.js`) is gone: bitcoinjs-lib 7 doesn't need it.
- **Fixes:** payments check the card + password against the signed-in account; input amounts are verified against their parent transactions; fees and change are computed in integer satoshis with dust handling; testnet payments no longer query mainnet coins; NTAG216 cards are detected (they were mistaken for NTAG215, so the lock was written to the wrong pages) and lock errors are reported instead of ignored; random secrets come from the native CSPRNG instead of `react-native-randombytes`; history shows the amount each transaction moved in or out of the wallet; errors that were silently swallowed are now shown.
- Saved accounts and the Keychain device secret are read from the same places as before.

---

## Known issues

- **One address per wallet.** See [Limitations](#security-model).
- **Only NTAG213/215/216 cards can be locked.** Other NDEF-capable tags can still be set up if the user taps **Skip Locking**, but they stay writable.
- **History shows the 3 most recent transactions** in the app (Esplora returns the latest 25); **View All** opens the block explorer.
- **Unconfirmed coins are spendable.** The balance and coin selection include unconfirmed coins, including incoming ones that could still be double-spent. A merchant should wait for confirmation before handing over high-value goods.

## Troubleshooting

- **"NFC is turned off"** (Android): turn on NFC in Settings → Connected devices.
- **Nothing happens when tapping a card on iPhone:** hold the card against the back of the phone near the top edge until the system sheet confirms. Card reading needs iPhone 7 or later, and the NFC Tag Reading capability must be enabled for your App ID.
- **"Couldn't reach the Bitcoin network":** check the phone's internet connection. A USB connection to your computer doesn't give the phone internet access.
- **The app still shows testnet (or mainnet) after switching:** `.env` values are compiled in. Run `npm run testnet` / `npm run mainnet`, then rebuild with `npm run android` / `npm run ios`.
- **Android build fails with a Java version error:** set `JAVA_HOME` to JDK 17, for example `export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`. In Android Studio: Settings → Build Tools → Gradle → Gradle JDK.
- **iOS build fails after pulling changes:** run `cd ios && pod install`, then clean the build folder in Xcode (Shift+Cmd+K).
- **"This card is already locked with a different password":** the card was locked by a build with a different `NTAG_WRITE_PASSWORD`. It still works for payments; it just can't be re-locked by this build.

## Contributing, security and license

- Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).
- Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
- Licensed under the [MIT License](LICENSE). The fonts in `src/assets/fonts/` are third-party and licensed separately under the SIL Open Font License 1.1 ([LICENSES/](LICENSES/)).
