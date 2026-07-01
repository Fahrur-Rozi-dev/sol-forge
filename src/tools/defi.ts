import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const JUPITER_API = 'https://quote-api.jup.ag/v6';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

const KNOWN_TOKENS: Record<string, { mint: string; decimals: number; symbol: string }> = {
  SOL: { mint: SOL_MINT, decimals: 9, symbol: 'SOL' },
  USDC: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, symbol: 'USDC' },
  USDT: { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, symbol: 'USDT' },
  BONK: { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5, symbol: 'BONK' },
  JUP: { mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, symbol: 'JUP' },
  RAY: { mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', decimals: 6, symbol: 'RAY' },
  ORCA: { mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', decimals: 6, symbol: 'ORCA' },
  WIF: { mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', decimals: 6, symbol: 'WIF' },
  PYTH: { mint: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', decimals: 6, symbol: 'PYTH' },
};

function resolveMint(tokenOrMint: string): string {
  const upper = tokenOrMint.toUpperCase();
  if (KNOWN_TOKENS[upper]) return KNOWN_TOKENS[upper].mint;
  if (tokenOrMint.length >= 32) return tokenOrMint;
  throw new Error(`Unknown token: ${tokenOrMint}. Use symbol or full mint address.`);
}

export function registerDeFiTools(server: McpServer) {

  server.tool(
    'get_token_price',
    'Get current price of a Solana token by symbol or mint address.',
    {
      token: z.string().describe('Token symbol (SOL, USDC, BONK) or mint address'),
    },
    async ({ token }) => {
      try {
        const mint = resolveMint(token);
        const resp = await fetch(`https://price.jup.ag/v6/price?ids=${mint}`);
        const data = await resp.json() as any;
        const priceData = data.data?.[mint];

        if (!priceData) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `Price not found for ${token}`, mint }) }] };
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          symbol: priceData.symbol || token, mint,
          price: priceData.price,
          priceChange24h: priceData.priceChange24h || null,
          source: 'Jupiter',
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_multi_prices',
    'Get prices for multiple tokens at once.',
    {
      tokens: z.array(z.string()).describe('List of token symbols or mint addresses'),
    },
    async ({ tokens }) => {
      try {
        const mints = tokens.map(t => resolveMint(t));
        const resp = await fetch(`https://price.jup.ag/v6/price?ids=${mints.join(',')}`);
        const data = await resp.json() as any;

        const prices = mints.map((mint, i) => ({
          symbol: tokens[i].toUpperCase(), mint,
          price: data.data?.[mint]?.price || null,
          priceChange24h: data.data?.[mint]?.priceChange24h || null,
        }));

        return { content: [{ type: 'text' as const, text: JSON.stringify({ count: prices.length, prices, source: 'Jupiter' }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_swap_quote',
    'Get a swap quote between two tokens via Jupiter aggregator.',
    {
      inputToken: z.string().describe('Input token symbol or mint address'),
      outputToken: z.string().describe('Output token symbol or mint address'),
      amount: z.number().positive().describe('Amount of input token (in UI units)'),
      slippageBps: z.number().min(1).max(500).default(50).describe('Slippage tolerance in basis points (default: 50 = 0.5%)'),
    },
    async ({ inputToken, outputToken, amount, slippageBps }) => {
      try {
        const inputMint = resolveMint(inputToken);
        const outputMint = resolveMint(outputToken);
        const inputDecimals = KNOWN_TOKENS[inputToken.toUpperCase()]?.decimals || 9;
        const rawAmount = BigInt(Math.round(amount * Math.pow(10, inputDecimals)));

        const resp = await fetch(
          `${JUPITER_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${rawAmount.toString()}&slippageBps=${slippageBps}`
        );
        const data = await resp.json() as any;

        if (!data || data.error) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: data.error || 'No route found' }) }] };
        }

        const outputDecimals = KNOWN_TOKENS[outputToken.toUpperCase()]?.decimals || 9;
        const outputAmountUI = Number(data.outAmount) / Math.pow(10, outputDecimals);

        return { content: [{ type: 'text' as const, text: JSON.stringify({
          inputToken, outputToken, inputAmount: amount,
          outputAmount: outputAmountUI,
          rawInputAmount: data.inAmount,
          rawOutputAmount: data.outAmount,
          priceImpactPct: parseFloat(data.priceImpactPct || '0'),
          slippageBps,
          route: data.routePlan?.map((r: any) => r.swapInfo?.label || 'unknown') || [],
          source: 'Jupiter V6',
        }, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'list_known_tokens',
    'List all built-in known token symbols and their mint addresses.',
    {},
    async () => {
      const tokens = Object.entries(KNOWN_TOKENS).map(([symbol, info]) => ({
        symbol, mint: info.mint, decimals: info.decimals,
      }));
      return { content: [{ type: 'text' as const, text: JSON.stringify({ count: tokens.length, tokens }, null, 2) }] };
    }
  );
}
