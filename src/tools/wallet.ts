import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  SystemProgram, LAMPORTS_PER_SOL,
  PublicKey, Transaction
} from '@solana/web3.js';
import { createWallet, listWallets, loadWalletFromPrivateKey } from '../utils/keypair.js';
import { getConnection } from '../utils/connection.js';
import { simulateTx, estimateFee } from '../utils/safety.js';

export function registerWalletTools(server: McpServer) {

  server.tool(
    'create_wallet',
    'Generate a new Solana wallet (keypair). Stores locally.',
    {
      name: z.string().optional().describe('Optional wallet name (auto-generated if omitted)'),
    },
    async ({ name }) => {
      try {
        const wallet = createWallet(name);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({
            success: true,
            name: wallet.name,
            address: wallet.address,
            message: `Wallet "${wallet.name}" created. Address: ${wallet.address}`,
          }, null, 2) }],
        };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'list_wallets',
    'List all locally stored wallets.',
    {},
    async () => {
      try {
        const wallets = listWallets();
        return { content: [{ type: 'text' as const, text: JSON.stringify({ count: wallets.length, wallets }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_balance',
    'Get SOL balance for a wallet address.',
    {
      address: z.string().describe('Solana wallet address (base58)'),
    },
    async ({ address }) => {
      try {
        const conn = getConnection();
        const pubkey = new PublicKey(address);
        const balanceLamports = await conn.getBalance(pubkey);
        const balanceSol = balanceLamports / LAMPORTS_PER_SOL;

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          address,
          balanceLamports,
          balanceSol: balanceSol.toFixed(9),
          balanceFormatted: `${balanceSol.toFixed(4)} SOL`,
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_wallet_info',
    'Get detailed wallet info: SOL balance, token accounts, executable status.',
    {
      address: z.string().describe('Solana wallet address (base58)'),
    },
    async ({ address }) => {
      try {
        const conn = getConnection();
        const pubkey = new PublicKey(address);

        const [balance, accountInfo, tokenAccounts] = await Promise.all([
          conn.getBalance(pubkey),
          conn.getAccountInfo(pubkey),
          conn.getParsedTokenAccountsByOwner(pubkey, { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }),
        ]);

        const tokens = tokenAccounts.value.map(t => ({
          mint: t.account.data.parsed.info.mint,
          amount: t.account.data.parsed.info.tokenAmount.amount,
          decimals: t.account.data.parsed.info.tokenAmount.decimals,
          uiAmount: t.account.data.parsed.info.tokenAmount.uiAmount,
        }));

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          address,
          solBalance: (balance / LAMPORTS_PER_SOL).toFixed(9),
          solBalanceLamports: balance,
          executable: accountInfo?.executable || false,
          owner: accountInfo?.owner.toBase58() || 'unknown',
          tokenAccounts: tokens,
          tokenCount: tokens.length,
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'transfer_sol',
    'Transfer SOL from one wallet to another. Requires sender private key (base58).',
    {
      fromPrivateKey: z.string().describe('Sender wallet private key (base58)'),
      toAddress: z.string().describe('Recipient wallet address (base58)'),
      amountSol: z.number().positive().describe('Amount of SOL to transfer'),
      simulateOnly: z.boolean().optional().default(false).describe('If true, only simulate (no actual transfer)'),
    },
    async ({ fromPrivateKey, toAddress, amountSol, simulateOnly }) => {
      try {
        const conn = getConnection();
        const sender = loadWalletFromPrivateKey(fromPrivateKey);
        const recipient = new PublicKey(toAddress);
        const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: sender.publicKey,
            toPubkey: recipient,
            lamports,
          })
        );

        const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = sender.publicKey;

        const feeEstimate = await estimateFee(tx, conn);

        if (simulateOnly) {
          const sim = await simulateTx(tx, conn);
          return { content: [{ type: 'text' as const, text: JSON.stringify({
            simulation: true,
            success: sim.success,
            logs: sim.logs,
            feeEstimate,
            from: sender.publicKey.toBase58(),
            to: toAddress,
            amountSol, lamports,
          }, null, 2) }] };
        }

        tx.sign(sender);
        const signature = await conn.sendRawTransaction(tx.serialize());
        await conn.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        });

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          success: true,
          signature,
          from: sender.publicKey.toBase58(),
          to: toAddress,
          amountSol, lamports,
          feeEstimate,
          explorerUrl: `https://explorer.solana.com/tx/${signature}`,
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'request_airdrop',
    'Request SOL airdrop on devnet/testnet (max 2 SOL per request).',
    {
      address: z.string().describe('Wallet address to receive airdrop'),
      amountSol: z.number().max(2).default(1).describe('Amount of SOL (max 2)'),
    },
    async ({ address, amountSol }) => {
      try {
        const conn = getConnection();
        const pubkey = new PublicKey(address);
        const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

        const sig = await conn.requestAirdrop(pubkey, lamports);
        await conn.confirmTransaction(sig);

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          success: true, signature: sig, address, amountSol,
          message: `Airdrop of ${amountSol} SOL successful`,
          explorerUrl: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
