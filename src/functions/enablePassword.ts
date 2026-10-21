/**
 * Write-protects an NTAG213/215/216 card with its 32-bit password, so the secret on it can't be
 * overwritten or erased by accident. Reading stays open: the wallet's security rests on the
 * user's password, not on this lock. Implemented from the NXP NTAG213/215/216 datasheet
 * (sections 8.8 "Password verification protection" and 10 "NTAG commands").
 */

/* eslint-disable no-bitwise -- NTAG configuration bytes are bit fields */
import Config from 'react-native-config';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { withTag } from './nfc';

const READ = 0x30; // returns 16 bytes = 4 pages, starting at the given page
const WRITE = 0xa2; // writes one 4-byte page
const PWD_AUTH = 0x1b;

// Capability Container byte 2 (data area size) → first configuration page (CFG0).
const CONFIG_PAGE_BY_SIZE: Record<number, { model: string; cfg0: number }> = {
  0x12: { model: 'NTAG213', cfg0: 0x29 },
  0x3e: { model: 'NTAG215', cfg0: 0x83 },
  0x6d: { model: 'NTAG216', cfg0: 0xe3 },
};

const AUTH0_DISABLED = 0xff;
const FIRST_USER_PAGE = 0x04; // AUTH0 = 4 protects all user memory
const PROT_BIT = 0x80; // ACCESS.PROT: 0 = protect writes only, 1 = protect reads and writes

const parsePassword = (hex: string | undefined): number[] => {
  const value = hex && /^[0-9a-fA-F]{8}$/.test(hex) ? hex : '1234abcd';
  return value.match(/../g)!.map(byte => parseInt(byte, 16));
};

// Every card made by a build shares this password, and it's visible in the app binary, so it
// only prevents accidental writes. Cards already locked with a different password can't be
// re-locked. Set NTAG_WRITE_PASSWORD (8 hex characters) in .env to use your own.
const PASSWORD = parsePassword(Config.NTAG_WRITE_PASSWORD);
const PACK = [0xaa, 0xbb]; // password acknowledge the tag returns after a successful PWD_AUTH

const transceive = (bytes: number[]) => NfcManager.nfcAHandler.transceive(bytes);

export default function enablePassword(): Promise<void> {
  return withTag(NfcTech.NfcA, 'Hold the same card near the phone again to lock it.', async () => {
    const header = await transceive([READ, 0x00]); // pages 0-3; page 3 is the Capability Container
    const layout = CONFIG_PAGE_BY_SIZE[header[14]];
    if (!layout) {
      throw new Error('This card type is not supported. Use an NTAG213, NTAG215 or NTAG216 card.');
    }
    const { cfg0 } = layout;
    const config = await transceive([READ, cfg0]); // CFG0, CFG1 (ACCESS), PWD (reads as 0), PACK

    if (config[3] !== AUTH0_DISABLED) {
      // Already locked: confirm it's locked with our password.
      const pack = await transceive([PWD_AUTH, ...PASSWORD]);
      if (pack[0] !== PACK[0] || pack[1] !== PACK[1]) {
        throw new Error('This card is already locked with a different password.');
      }
      return;
    }

    // Order matters: set PACK and PWD before enabling protection with AUTH0 last.
    await transceive([WRITE, cfg0 + 3, ...PACK, config[14], config[15]]);
    await transceive([WRITE, cfg0 + 2, ...PASSWORD]);
    await transceive([WRITE, cfg0 + 1, config[4] & ~PROT_BIT, config[5], config[6], config[7]]);
    await transceive([WRITE, cfg0, config[0], config[1], config[2], FIRST_USER_PAGE]);
  });
}
