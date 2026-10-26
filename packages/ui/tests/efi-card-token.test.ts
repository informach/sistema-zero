import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('tokenização isolada não propaga dados da operadora', async () => {
  const child = Bun.spawn([process.execPath, 'test', './qa/efi-card-token.fixture.ts'], {
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
}, 10_000)
