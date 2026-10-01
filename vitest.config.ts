import { defineConfig } from 'vitest/config'

// Testes unitários (rápidos, sem Firebase): `npm test`
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
