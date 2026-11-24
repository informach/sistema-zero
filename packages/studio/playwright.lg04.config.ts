import { defineConfig } from '@playwright/test'
import runtime from './playwright.python-runtime.config'

export default defineConfig(runtime, {
  testMatch: ['pinta-public-bridge.spec.ts', 'pinta-project-regional-js.spec.ts'],
  retries: 0,
  projects: [{ name: 'chromium', use: { channel: 'chromium' } }],
})
