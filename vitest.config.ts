import { defineConfig } from 'vitest/config'

// Testes unitários (rápidos, sem Firebase): `npm test`
export default defineConfig({
  test: {
    // tests/unit: testes que leem arquivos do projeto (Node), fora do código do site
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
