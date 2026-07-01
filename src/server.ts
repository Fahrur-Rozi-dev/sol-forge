import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initConnection } from './utils/connection.js';
import { registerWalletTools } from './tools/wallet.js';
import { registerTokenTools } from './tools/token.js';
import { registerExplorerTools } from './tools/explorer.js';
import { registerDeFiTools } from './tools/defi.js';
import { SolForgeConfig } from './types.js';

export function createSolForgeServer(config?: SolForgeConfig): McpServer {
  initConnection(config);

  const server = new McpServer({
    name: 'sol-forge',
    version: '1.0.0',
  });

  registerWalletTools(server);
  registerTokenTools(server);
  registerExplorerTools(server);
  registerDeFiTools(server);

  return server;
}
