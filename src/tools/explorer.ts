import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';
import { getConnection } from '../utils/connection.js';

export function registerExplorerTools(server: McpServer) {

  server.tool(
    'get_transaction',
    'Get detailed transaction information by signature.',
    {
      signature: z.string().describe('Transaction signature (base58)'),
    },
    async ({ signature }) => {
      try {
        const conn = getConnection();
        const tx = await conn.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Transaction not found', signature }) }] };
        }

        const instructions = tx.transaction.message.instructions.map((ix: any) => ({
          program: ix.program || ix.programId?.toBase58() || 'unknown',
          type: ix.parsed?.type || 'unknown',
          info: ix.parsed?.info || {},
        }));

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          signature, slot: tx.slot, blockTime: tx.blockTime,
          success: !tx.meta?.err, fee: tx.meta?.fee,
          error: tx.meta?.err || null,
          signer: tx.transaction.message.accountKeys[0]?.pubkey?.toBase58() || 'unknown',
          instructionCount: instructions.length, instructions,
          explorerUrl: `https://explorer.solana.com/tx/${signature}`,
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_account_info',
    'Get account info: owner, data size, executable status, SOL balance.',
    {
      address: z.string().describe('Account address (base58)'),
    },
    async ({ address }) => {
      try {
        const conn = getConnection();
        const pubkey = new PublicKey(address);

        const [accountInfo, balance] = await Promise.all([
          conn.getParsedAccountInfo(pubkey),
          conn.getBalance(pubkey),
        ]);

        const info = accountInfo.value;
        if (!info) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Account not found', address }) }] };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          address, owner: info.owner.toBase58(),
          solBalance: (balance / 1e9).toFixed(9),
          lamports: balance, executable: info.executable,
          rentEpoch: info.rentEpoch,
          explorerUrl: `https://explorer.solana.com/address/${address}`,
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_recent_blocks',
    'Get recent block information (last N blocks).',
    {
      count: z.number().min(1).max(10).default(5).describe('Number of blocks to fetch (1-10)'),
    },
    async ({ count }) => {
      try {
        const conn = getConnection();
        const currentSlot = await conn.getSlot();
        const blocks: any[] = [];

        for (let i = 0; i < count; i++) {
          try {
            const slot = currentSlot - i;
            const block = await conn.getBlock(slot, {
              maxSupportedTransactionVersion: 0,
              transactionDetails: 'none',
              rewards: false,
            });
            if (block) {
              blocks.push({
                slot,
                blockHeight: (block as any).blockHeight ?? null,
                blockTime: block.blockTime,
                parentSlot: block.parentSlot,
              });
            }
          } catch { break; }
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          currentSlot, blocksRequested: count, blocksReturned: blocks.length, blocks,
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_slot',
    'Get current Solana slot, block height, and cluster info.',
    {},
    async () => {
      try {
        const conn = getConnection();
        const [slot, blockHeight, epochInfo, version] = await Promise.all([
          conn.getSlot(),
          conn.getBlockHeight(),
          conn.getEpochInfo(),
          conn.getVersion(),
        ]);

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          currentSlot: slot, blockHeight,
          epoch: epochInfo.epoch, slotIndex: epochInfo.slotIndex,
          slotsInEpoch: epochInfo.slotsInEpoch,
          solanaVersion: version['solana-core'],
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_signatures_for_address',
    'Get recent transaction signatures for an address.',
    {
      address: z.string().describe('Address to query (base58)'),
      limit: z.number().min(1).max(50).default(10).describe('Max signatures (1-50)'),
    },
    async ({ address, limit }) => {
      try {
        const conn = getConnection();
        const pubkey = new PublicKey(address);
        const sigs = await conn.getSignaturesForAddress(pubkey, { limit });

        const signatures = sigs.map(s => ({
          signature: s.signature, slot: s.slot,
          blockTime: s.blockTime, err: s.err,
          confirmationStatus: s.confirmationStatus,
          explorerUrl: `https://explorer.solana.com/tx/${s.signature}`,
        }));

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          address, count: signatures.length, signatures,
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
