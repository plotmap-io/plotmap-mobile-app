import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Unit tests run in plain Node — no Metro, no simulator, no device.
 *
 * That means only modules free of React Native imports can be tested here:
 * `src/types/api.ts`, and anything else kept pure on purpose. Logic worth
 * testing should live in such a module rather than inside a component.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
