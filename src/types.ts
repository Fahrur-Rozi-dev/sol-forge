import { PublicKey, Connection } from '@solana/web3.js';

export type SolForgeConfig = {
  rpcUrl?: string;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  walletPath?: string;
};

export type WalletInfo = {
  address: string;
  solBalance: number;
  tokenAccounts: TokenAccountInfo[];
};

export type TokenAccountInfo = {
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number;
};

export type TransactionResult = {
  signature: string;
  slot: number;
  confirmations: number;
  blockTime: number | null;
  success: boolean;
  logs: string[];
};

export type TokenInfo = {
  address: string;
  mintAuthority: string | null;
  decimals: number;
  supply: string;
  isInitialized: boolean;
};

export type PriceInfo = {
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  source: string;
};

export type SwapQuote = {
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  priceImpactPct: number;
  route: string[];
  fee: number;
};
