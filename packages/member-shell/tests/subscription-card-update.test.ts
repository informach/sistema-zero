import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('alteração de cartão em DOM isolado', async () => {
  const child = Bun.spawn([process.execPath, 'test', './qa/subscription-card-update.fixture.tsx'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(code, stdout + stderr).toBe(0)
}, 30_000)
