import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import bs58 from 'bs58';

const WALLET_DIR = path.join(process.env.HOME || '.', '.sol-forge-wallets');

function ensureWalletDir(): string {
  if (!fs.existsSync(WALLET_DIR)) {
    fs.mkdirSync(WALLET_DIR, { recursive: true });
  }
  return WALLET_DIR;
}

export function createWallet(name?: string): { keypair: Keypair; name: string; address: string; secretKey: string } {
  const keypair = Keypair.generate();
  const walletName = name || `wallet-${Date.now()}`;
  const address = keypair.publicKey.toBase58();
  const secretKey = bs58.encode(keypair.secretKey);

  // Save to disk
  const dir = ensureWalletDir();
  const filePath = path.join(dir, `${walletName}.json`);
  fs.writeFileSync(filePath, JSON.stringify({
    name: walletName,
    address,
    secretKey: Array.from(keypair.secretKey),
    publicKey: keypair.publicKey.toString(),
  }, null, 2));

  return { keypair, name: walletName, address, secretKey };
}

export function loadWallet(name: string): Keypair | null {
  const dir = ensureWalletDir();
  const filePath = path.join(dir, `${name}.json`);
  if (!fs.existsSync(filePath)) return null;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return Keypair.fromSecretKey(new Uint8Array(data.secretKey));
}

export function loadWalletFromPrivateKey(privateKey: string): Keypair {
  const decoded = bs58.decode(privateKey);
  return Keypair.fromSecretKey(decoded);
}

export function listWallets(): { name: string; address: string }[] {
  const dir = ensureWalletDir();
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    return { name: data.name, address: data.address };
  });
}
