import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'url';

function join(path: string) {
  return fileURLToPath(new URL(path, import.meta.url));
}

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    alias: {
      '@': join('./src'),
    }
  },
});
