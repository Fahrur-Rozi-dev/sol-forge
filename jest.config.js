module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: { module: 'commonjs' },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(rpc-websockets|@noble|@solana|bs58|uuid)/)',
  ],
};
