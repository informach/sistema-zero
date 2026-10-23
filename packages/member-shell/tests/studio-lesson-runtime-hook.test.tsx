import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

// This fixture owns a browser document and its HTTP constructors. Keep it out of
// the native BFF test realm; preserve every original case and its timeout inside it.
test('studio-lesson-runtime-hook uses an isolated browser realm', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './qa/studio-lesson-runtime-hook.fixture.tsx'],
    {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(code, stdout + stderr).toBe(0)
}, 30_000)
