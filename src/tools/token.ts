import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';
import { createMint, mintTo, transfer, getOrCreateAssociatedTokenAccount, getMint, burn } from '@solana/spl-token';
import { getConnection } from '../utils/connection.js';
import { loadWalletFromPrivateKey } from '../utils/keypair.js';

export function registerTokenTools(server: McpServer) {

  server.tool(
    'create_token',
    'Create a new SPL token on Solana. Returns mint address.',
    {
      authorityPrivateKey: z.string().describe('Token authority private key (base58) — becomes mint & freeze authority'),
      decimals: z.number().min(0).max(9).default(9).describe('Number of decimal places (0-9)'),
      simulateOnly: z.boolean().optional().default(false).describe('If true, only simulate'),
    },
    async ({ authorityPrivateKey, decimals, simulateOnly }) => {
      try {
        const conn = getConnection();
        const authority = loadWalletFromPrivateKey(authorityPrivateKey);

        if (simulateOnly) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({
            simulation: true,
            message: `Would create SPL token with ${decimals} decimals`,
            authority: authority.publicKey.toBase58(),
          }, null, 2) }] };
        }

        const mint = await createMint(conn, authority, authority.publicKey, authority.publicKey, decimals);

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          success: true,
          mintAddress: mint.toBase58(),
          decimals,
          authority: authority.publicKey.toBase58(),
          explorerUrl: `https://explorer.solana.com/address/${mint.toBase58()}`,
          message: `SPL Token created! Mint: ${mint.toBase58()}`,
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'mint_tokens',
    'Mint SPL tokens to a destination wallet.',
    {
      mintAddress: z.string().describe('Token mint address (base58)'),
      mintAuthorityPrivateKey: z.string().describe('Mint authority private key (base58)'),
      destinationAddress: z.string().describe('Recipient wallet address (base58)'),
      amount: z.number().positive().describe('Amount to mint (in UI units, before decimals)'),
    },
    async ({ mintAddress, mintAuthorityPrivateKey, destinationAddress, amount }) => {
      try {
        const conn = getConnection();
        const authority = loadWalletFromPrivateKey(mintAuthorityPrivateKey);
        const mint = new PublicKey(mintAddress);
        const destination = new PublicKey(destinationAddress);

        const mintInfo = await getMint(conn, mint);
        const rawAmount = BigInt(Math.round(amount * Math.pow(10, mintInfo.decimals)));

        const tokenAccount = await getOrCreateAssociatedTokenAccount(conn, authority, mint, destination);
        const sig = await mintTo(conn, authority, mint, tokenAccount.address, authority, rawAmount);

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          success: true, signature: sig, mintAddress, destination: destinationAddress, amount,
          rawAmount: rawAmount.toString(),
          tokenAccount: tokenAccount.address.toBase58(),
          explorerUrl: `https://explorer.solana.com/tx/${sig}`,
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'transfer_token',
    'Transfer SPL tokens between wallets.',
    {
      mintAddress: z.string().describe('Token mint address'),
      fromPrivateKey: z.string().describe('Sender private key (base58)'),
      toAddress: z.string().describe('Recipient address (base58)'),
      amount: z.number().positive().describe('Amount to transfer (UI units)'),
    },
    async ({ mintAddress, fromPrivateKey, toAddress, amount }) => {
      try {
        const conn = getConnection();
        const sender = loadWalletFromPrivateKey(fromPrivateKey);
        const mint = new PublicKey(mintAddress);
        const recipient = new PublicKey(toAddress);

        const mintInfo = await getMint(conn, mint);
        const rawAmount = BigInt(Math.round(amount * Math.pow(10, mintInfo.decimals)));

        const fromAccount = await getOrCreateAssociatedTokenAccount(conn, sender, mint, sender.publicKey);
        const toAccount = await getOrCreateAssociatedTokenAccount(conn, sender, mint, recipient);
        const sig = await transfer(conn, sender, fromAccount.address, toAccount.address, sender, rawAmount);

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          success: true, signature: sig, mintAddress,
          from: sender.publicKey.toBase58(), to: toAddress, amount,
          explorerUrl: `https://explorer.solana.com/tx/${sig}`,
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_token_info',
    'Get SPL token mint info: supply, decimals, authorities.',
    {
      mintAddress: z.string().describe('Token mint address (base58)'),
    },
    async ({ mintAddress }) => {
      try {
        const conn = getConnection();
        const mint = new PublicKey(mintAddress);
        const info = await getMint(conn, mint);

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          address: mintAddress,
          decimals: info.decimals,
          supply: info.supply.toString(),
          uiSupply: Number(info.supply) / Math.pow(10, info.decimals),
          mintAuthority: info.mintAuthority?.toBase58() || null,
          freezeAuthority: info.freezeAuthority?.toBase58() || null,
          isInitialized: info.isInitialized,
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_token_accounts',
    'List all SPL token accounts owned by a wallet.',
    {
      address: z.string().describe('Wallet address (base58)'),
    },
    async ({ address }) => {
      try {
        const conn = getConnection();
        const owner = new PublicKey(address);

        const tokenAccounts = await conn.getParsedTokenAccountsByOwner(owner, {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        });

        const accounts = tokenAccounts.value.map(t => ({
          mint: t.account.data.parsed.info.mint,
          tokenAccount: t.pubkey.toBase58(),
          amount: t.account.data.parsed.info.tokenAmount.amount,
          decimals: t.account.data.parsed.info.tokenAmount.decimals,
          uiAmount: t.account.data.parsed.info.tokenAmount.uiAmount,
        }));

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          owner: address, accountCount: accounts.length, accounts,
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'burn_tokens',
    'Burn SPL tokens (reduce supply permanently).',
    {
      mintAddress: z.string().describe('Token mint address'),
      ownerPrivateKey: z.string().describe('Token account owner private key (base58)'),
      amount: z.number().positive().describe('Amount to burn (UI units)'),
    },
    async ({ mintAddress, ownerPrivateKey, amount }) => {
      try {
        const conn = getConnection();
        const owner = loadWalletFromPrivateKey(ownerPrivateKey);
        const mint = new PublicKey(mintAddress);

        const mintInfo = await getMint(conn, mint);
        const rawAmount = BigInt(Math.round(amount * Math.pow(10, mintInfo.decimals)));

        const tokenAccount = await getOrCreateAssociatedTokenAccount(conn, owner, mint, owner.publicKey);
        const sig = await burn(conn, owner, tokenAccount.address, mint, owner, rawAmount);

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          success: true, signature: sig, mintAddress, burned: amount,
          explorerUrl: `https://explorer.solana.com/tx/${sig}`,
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
