import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('live Pro lifetime uses an isolated browser realm', async () => {
  const child = Bun.spawn([process.execPath, 'test', './qa/live-pro-runtime-hook.fixture.tsx'], {
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
