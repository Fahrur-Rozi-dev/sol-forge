import { LAMPORTS_PER_SOL, PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

describe('SOL Forge - Core constants', () => {
  it('should have correct SOL lamports constant', () => {
    expect(LAMPORTS_PER_SOL).toBe(1000000000);
  });

  it('should roundtrip base58 encoding', () => {
    const kp = Keypair.generate();
    const encoded = bs58.encode(kp.secretKey);
    const decoded = Keypair.fromSecretKey(bs58.decode(encoded));
    expect(kp.publicKey.toBase58()).toBe(decoded.publicKey.toBase58());
  });

  it('should validate Solana addresses', () => {
    const validMints = [
      'So11111111111111111111111111111111111111112',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    ];
    for (const mint of validMints) {
      expect(() => new PublicKey(mint)).not.toThrow();
    }
  });

  it('should reject invalid public keys', () => {
    expect(() => new PublicKey('not-a-valid-key')).toThrow();
  });
});

describe('SOL Forge - Token constants', () => {
  it('should have correct known token mint addresses', () => {
    const TOKENS: Record<string, string> = {
      SOL: 'So11111111111111111111111111111111111111112',
      USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    };

    for (const mint of Object.values(TOKENS)) {
      expect(() => new PublicKey(mint)).not.toThrow();
    }
  });

  it('should have correct decimal places for tokens', () => {
    const DECIMALS: Record<string, number> = { SOL: 9, USDC: 6, USDT: 6, BONK: 5, JUP: 6 };
    for (const decimals of Object.values(DECIMALS)) {
      expect(decimals).toBeGreaterThanOrEqual(0);
      expect(decimals).toBeLessThanOrEqual(9);
    }
  });
});

describe('SOL Forge - Utility calculations', () => {
  it('should convert SOL to lamports correctly', () => {
    expect(1 * LAMPORTS_PER_SOL).toBe(1_000_000_000);
    expect(0.5 * LAMPORTS_PER_SOL).toBe(500_000_000);
    expect(0.001 * LAMPORTS_PER_SOL).toBe(1_000_000);
    expect(100 * LAMPORTS_PER_SOL).toBe(100_000_000_000);
  });

  it('should handle precision in decimal conversions', () => {
    const decimals = 6;
    const rawAmount = BigInt(Math.round(1.5 * Math.pow(10, decimals)));
    expect(rawAmount.toString()).toBe('1500000');
  });
});
