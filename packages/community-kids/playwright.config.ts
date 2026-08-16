import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? 3008)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? './.cache/playwright-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'bun run build && node scripts/serve-e2e.mjs',
    env: {
      APP_PUBLIC_URL: baseURL,
      GATEWAY_URL: 'http://127.0.0.1:3000',
      HOSTNAME: '127.0.0.1',
      JWT_AUDIENCE: 'sistemazero-e2e',
      JWT_ISSUER: 'http://127.0.0.1:3000',
      JWT_JWKS_URL: 'http://127.0.0.1:3000/auth/.well-known/jwks.json',
      MEMBER_SHELL_HMAC_SECRET: 'community-kids-e2e-member-shell-secret',
      PARENT_GATE_HMAC_SECRET: 'community-kids-e2e-parent-gate-secret',
      PORT: String(port),
    },
    url: baseURL,
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
    stdout: 'ignore',
    stderr: 'pipe',
    // ⚠️ O comando inclui um `next build` COMPLETO do kids, não só subir o servidor.
    // 180s bastavam na máquina de desenvolvimento e estouravam no runner do GitHub
    // (medido: `Timed out waiting 180000ms from config.webServer`, com o build ainda
    // em andamento) — o job tem 20 minutos, então a folga aqui não esconde travamento.
    timeout: 900_000,
  },
})
