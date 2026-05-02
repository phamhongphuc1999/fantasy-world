import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    pool: 'threads',
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
      app: path.resolve(__dirname, 'app'),
      public: path.resolve(__dirname, 'public'),
    },
  },
});
