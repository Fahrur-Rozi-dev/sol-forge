import { Connection, Commitment } from '@solana/web3.js';
import { SolForgeConfig } from '../types.js';

const VALID_COMMITMENTS: Commitment[] = ['processed', 'confirmed', 'finalized'];

let connection: Connection | null = null;
let config: SolForgeConfig = {
  rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  commitment: 'confirmed',
};

export function initConnection(cfg?: SolForgeConfig): Connection {
  if (cfg) config = { ...config, ...cfg };
  if (!connection) {
    const commitment: Commitment = VALID_COMMITMENTS.includes(config.commitment as Commitment)
      ? (config.commitment as Commitment)
      : 'confirmed';
    connection = new Connection(config.rpcUrl!, {
      commitment,
      confirmTransactionInitialTimeout: 60000,
    });
  }
  return connection;
}

export function getConnection(): Connection {
  if (!connection) return initConnection();
  return connection;
}

export function getConfig(): SolForgeConfig {
  return { ...config };
}
