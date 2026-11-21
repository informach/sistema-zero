import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

test('scenario recordings install the FFmpeg revision belonging to their own Playwright', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8')
  const job = workflow.split('  molda-cenarios-e2e:')[1]?.split('\n  members-image:')[0]
  expect(job).toContain('working-directory: packages/molda-cenarios')
  expect(job).toContain('node node_modules/playwright-core/cli.js install --with-deps chrome ffmpeg')
  expect(job).not.toContain('working-directory: packages/studio')
})

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
