# SOL Forge

SOL Forge is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that enables any AI agent to interact with the Solana blockchain. It provides 20 tools covering wallet management, SPL token operations, blockchain exploration, DeFi integration via Jupiter, and built-in safety guards.

---

## Why SOL Forge?

The Solana ecosystem has powerful tools — `@solana/web3.js`, SPL Token library, Jupiter aggregator — but they require developers to write custom integration code. SOL Forge wraps these into a standardized MCP interface, meaning **any AI agent can interact with Solana with zero custom code**.

### Key Features

1. **First Comprehensive Solana MCP Server**: Exposes the full Solana interaction surface (wallets, tokens, explorer, DeFi) through MCP, the emerging standard for AI-tool interop.

2. **Safety-First Design**: Every destructive operation supports `simulateOnly` mode. Transaction simulation and fee estimation happen before execution. Critical for autonomous agents.

3. **Zero API Keys Required for Queries**: Price data via Jupiter is free (no key). Explorer queries use public Solana RPC. Only on-chain transactions require a funded wallet.

---

## How Solana Is Used

SOL Forge uses Solana **meaningfully** across multiple layers:

| Layer | How |
|-------|-----|
| **RPC** | Full connection management to any Solana cluster (mainnet, devnet, testnet) via `@solana/web3.js` |
| **On-chain Programs** | Interacts with System Program (SOL transfers) and SPL Token Program (token creation, minting, transfers, burns) |
| **Transactions** | Constructs, simulates, signs, and confirms real on-chain transactions |
| **Indexing** | Reads parsed transactions, token accounts, block data, and account info from Solana's indexer |
| **DeFi** | Integrates with Jupiter V6 aggregator for real-time pricing and swap quotes across all Solana DEXs |

---

## Tools (20 Total)

### Wallet Operations (6 tools)
| Tool | Description |
|------|-------------|
| `create_wallet` | Generate new Solana keypair, stored locally |
| `list_wallets` | List all locally stored wallets |
| `get_balance` | Get SOL balance for any address |
| `get_wallet_info` | Full wallet info: SOL, tokens, executable status |
| `transfer_sol` | Send SOL with simulation-first safety |
| `request_airdrop` | Devnet SOL airdrop (max 2 SOL) |

### SPL Token Operations (6 tools)
| Tool | Description |
|------|-------------|
| `create_token` | Create new SPL token with configurable decimals |
| `mint_tokens` | Mint tokens to any wallet |
| `transfer_token` | Transfer SPL tokens between wallets |
| `get_token_info` | Token mint info: supply, decimals, authorities |
| `get_token_accounts` | List all token accounts for a wallet |
| `burn_tokens` | Burn tokens permanently |

### Blockchain Explorer (5 tools)
| Tool | Description |
|------|-------------|
| `get_transaction` | Detailed parsed transaction info |
| `get_account_info` | Account data: owner, balance, data size |
| `get_recent_blocks` | Recent block information |
| `get_slot` | Current slot, block height, epoch info |
| `get_signatures_for_address` | Recent tx signatures for any address |

### DeFi & Prices (4 tools)
| Tool | Description |
|------|-------------|
| `get_token_price` | Real-time price via Jupiter (no API key) |
| `get_multi_prices` | Batch price queries for multiple tokens |
| `get_swap_quote` | Swap quote between any two Solana tokens |
| `list_known_tokens` | Built-in token registry (SOL, USDC, BONK, JUP, etc.) |

### Safety (built into transfer tools)
- `simulateOnly` flag on all destructive operations
- Automatic fee estimation before execution
- LAMPORTS_PER_SOL precision handling

---

## Quick Start

### Install

```bash
git clone https://github.com/Fahrur-Rozi-dev/sol-forge.git
cd sol-forge
npm install
npm run build
```

### Use with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sol-forge": {
      "command": "node",
      "args": ["/path/to/sol-forge/dist/index.js"],
      "env": {
        "SOLANA_RPC_URL": "https://api.mainnet-beta.solana.com"
      }
    }
  }
}
```

### Use with Any MCP Client

```bash
# Start the MCP server (stdio transport)
node dist/index.js

# Or set custom RPC
SOLANA_RPC_URL="https://api.devnet.solana.com" node dist/index.js
```

### Use Programmatically

```typescript
import { createSolForgeServer } from './src/server.js';

const server = createSolForgeServer({
  rpcUrl: 'https://api.devnet.solana.com',
  commitment: 'confirmed',
});

// Server is now ready with all 20 tools registered
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | Solana RPC endpoint |
| `SOLANA_COMMITMENT` | `confirmed` | Transaction commitment level |

---

## Architecture

```
sol-forge/
├── src/
│   ├── index.ts              # Entry point — stdio MCP transport
│   ├── server.ts             # MCP server factory with tool registration
│   ├── types.ts              # TypeScript interfaces
│   ├── tools/
│   │   ├── index.ts          # Re-exports all tool categories
│   │   ├── wallet.ts         # Wallet CRUD + transfer + airdrop
│   │   ├── token.ts          # SPL token lifecycle (create/mint/transfer/burn)
│   │   ├── explorer.ts       # Blockchain data queries
│   │   └── defi.ts           # Jupiter price + swap quotes
│   └── utils/
│       ├── connection.ts     # Solana RPC connection singleton
│       ├── keypair.ts        # Wallet file storage (~/.sol-forge-wallets/)
│       └── safety.ts         # Transaction simulation + fee estimation
├── tests/
│   └── core.test.ts          # Unit tests
├── package.json
├── tsconfig.json
├── jest.config.js
├── LICENSE                   # MIT
└── README.md
```

---

## Development

```bash
# Build
npm run build

# Test
npm test

# Dev mode (auto-recompile)
npm run dev
```

---

## License

MIT — use it for anything. Attribution appreciated but not required.
