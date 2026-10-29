import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// テストでも .env の接続先を使う
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  test: { testTimeout: 30_000, hookTimeout: 60_000, fileParallelism: false },
});
