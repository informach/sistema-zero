import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

test('hosted export proofs install the exact runtime Chromium after its frozen dependencies', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8')
  const runtimeInstall = workflow.indexOf(
    'npm ci --ignore-scripts --no-audit --no-fund --prefix packages/studio-runtime/runtime',
  )
  const browserInstall = workflow.indexOf(
    'node packages/studio-runtime/runtime/node_modules/playwright-core/cli.js install --with-deps chromium --only-shell',
  )
  const exports = workflow.indexOf('bun run verify:grid-export')
  expect(runtimeInstall).toBeGreaterThan(-1)
  expect(browserInstall).toBeGreaterThan(runtimeInstall)
  expect(browserInstall).toBeLessThan(exports)
  const runtime = JSON.parse(
    readFileSync(
      new URL('../../packages/studio-runtime/runtime/package.json', import.meta.url),
      'utf8',
    ),
  )
  expect(runtime.dependencies['playwright-core']).toMatch(/^\d+\.\d+\.\d+$/)
})
