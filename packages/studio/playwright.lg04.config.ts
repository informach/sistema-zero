import { defineConfig } from '@playwright/test'
import runtime from './playwright.python-runtime.config'

const server = runtime.webServer
if (!server || Array.isArray(server)) throw Error('O servidor de provas deve ser único.')

export default defineConfig({
  ...runtime,
  webServer: { ...server, env: { ...server.env, PYTHON_PROBE_EDITOR: '1' } },
  testMatch: ['pinta-public-bridge.spec.ts', 'pinta-project-regional-js.spec.ts'],
  retries: 0,
  projects: [
    {
      name: 'chromium',
      use: {
        channel: 'chromium',
        ...(process.env.PW_CHROMIUM
          ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } }
          : {}),
      },
    },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
})
