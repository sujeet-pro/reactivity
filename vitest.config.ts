import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'library/**/*.{test,spec}.{js,ts}',
      'library/**/benchmarks/**/*.{js,ts}'
    ],
    exclude: [
      'node_modules', 
      'dist', 
      'examples',
      '**/*.config.*'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'examples/',
        '**/*.config.*',
        '**/*.test.*',
        '**/*.spec.*',
        '**/benchmarks/**'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
}); 