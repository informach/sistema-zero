import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('Python classic lease reconciliation is isolated from other editor module mocks', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './src/modes/python/__tests__/classic-lease.fixture.tsx'],
    {
      cwd: fileURLToPath(new URL('../../../', import.meta.url)),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const [out, errors, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(code, out + errors).toBe(0)
}, 30_000)
