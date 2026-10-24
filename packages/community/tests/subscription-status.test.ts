import { expect, test } from 'bun:test'

test('assinaturas adultas na UI real em DOM isolado', async () => {
  const child = Bun.spawn([process.execPath, 'test', './tests/fixtures/subscription-status.tsx'], {
    cwd: `${import.meta.dir}/..`,
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
