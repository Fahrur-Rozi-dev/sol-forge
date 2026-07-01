import { Transaction, Connection } from '@solana/web3.js';
import { getConnection } from './connection.js';

export type SimulationResult = {
  success: boolean;
  logs: string[];
  err: string | null;
  unitsConsumed: number | null;
  fee: number | null;
};

export async function simulateTx(
  transaction: Transaction,
  connection?: Connection
): Promise<SimulationResult> {
  const conn = connection || getConnection();

  try {
    const simulation = await conn.simulateTransaction(transaction, [], false);

    return {
      success: !simulation.value.err,
      logs: simulation.value.logs || [],
      err: simulation.value.err ? JSON.stringify(simulation.value.err) : null,
      unitsConsumed: simulation.value.unitsConsumed || null,
      fee: null,
    };
  } catch (error: any) {
    return {
      success: false,
      logs: [],
      err: error.message || 'Simulation failed',
      unitsConsumed: null,
      fee: null,
    };
  }
}

export async function estimateFee(
  transaction: Transaction,
  connection?: Connection
): Promise<{ feeLamports: number; feeSol: string }> {
  const conn = connection || getConnection();

  try {
    const message = transaction.compileMessage();
    const fee = await conn.getFeeForMessage(message);

    const lamports = fee.value || 5000;
    return {
      feeLamports: lamports,
      feeSol: (lamports / 1e9).toFixed(9),
    };
  } catch {
    return { feeLamports: 5000, feeSol: '0.000005000' };
  }
}
