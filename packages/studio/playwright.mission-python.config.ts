import { defineConfig } from '@playwright/test'
import runtime from './playwright.python-runtime.config'

/** Product Worker/CSP probes on full Chromium; no simulation of CPython or stop. */
export default defineConfig(runtime, {
  testMatch: [
    'python-supervisor.spec.ts',
    'python-provider.spec.ts',
    'python-host-isolation.spec.ts',
    'python-classic.spec.ts',
    'python-games.spec.ts',
  ],
  retries: 0,
  projects: [{ name: 'chromium', use: { channel: 'chromium' } }],
})
