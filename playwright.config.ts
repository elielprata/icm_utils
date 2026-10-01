import { defineConfig } from '@playwright/test'

/**
 * Testes de ponta a ponta no Chrome instalado: `npm run test:e2e`
 * (sobe os emuladores do Firebase e o site em modo emulador automaticamente).
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5199/icm_utils/',
    channel: 'chrome',
    locale: 'pt-BR',
    acceptDownloads: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --mode emulador --port 5199 --strictPort',
    url: 'http://localhost:5199/icm_utils/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
