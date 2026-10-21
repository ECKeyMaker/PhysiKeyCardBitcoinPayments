// Copies .env.<network> over .env, which react-native-config compiles into the app.
// Usage: node scripts/set-env.js testnet|mainnet  (the npm scripts call this for you)
const fs = require('fs');
const path = require('path');

const network = process.argv[2];
if (network !== 'testnet' && network !== 'mainnet') {
  console.error('Usage: node scripts/set-env.js testnet|mainnet');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const source = path.join(root, `.env.${network}`);
const template = `${source}.example`;

if (!fs.existsSync(source)) {
  if (!fs.existsSync(template)) {
    console.error(`Missing .env.${network} and its template .env.${network}.example`);
    process.exit(1);
  }
  fs.copyFileSync(template, source);
  console.log(`Created .env.${network} from .env.${network}.example`);
}

fs.copyFileSync(source, path.join(root, '.env'));
console.log(`Environment set to ${network}. Rebuild the native app if you changed networks.`);
