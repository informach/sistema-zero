import { mkdirSync } from 'node:fs'
import { defineConfig } from '@playwright/test'
import runtime from './playwright.python-runtime.config'

/**
 * Reference games (Pac-Man and Space Arena portable) on the local qualification server,
 * pinned to one explicit prebuilt distribution:
 *
 *   PYTHON_PROBE_DISTRIBUTION_DIRECTORY=<dir> PYTHON_PROBE_DISTRIBUTION_SHA256=<hash>
 *   SZ_PACMAN_QA_DISTRIBUTION=<same hash>
 *   node node_modules/@playwright/test/cli.js test --config=playwright.python-games.config.ts
 *
 * The server verifies every distribution file before listening; the games compare the
 * served runtime with the recorded local authority. Not hosted or production evidence.
 */
const port = process.env.PYTHON_PROBE_PORT ?? '5297'
process.env.SZ_GAMES_LOCAL_URL = `http://127.0.0.1:${port}`
// globalSetup writes the authority here before any worker starts.
mkdirSync(process.env.PYTHON_PROBE_OUTPUT_DIR as string, { recursive: true })

export default defineConfig({
  ...runtime,
  testMatch: [
    'python-games.spec.ts',
    'python-pacman-portable.spec.ts',
    'python-pacman-render.spec.ts',
    'python-space-arena-portable.spec.ts',
    'python-space-arena-input.spec.ts',
    'python-space-arena-performance.spec.ts',
    'python-f3-performance.spec.ts',
  ],
  globalSetup: '../../experiments/studio-python-runtime/qualification/local_games_host.ts',
  timeout: 90_000,
  expect: { timeout: 35_000 },
})
