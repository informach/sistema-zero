import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('challenge dialog saves, verifies and returns only confirmed completion', async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      'test',
      resolve(import.meta.dirname, 'fixtures/arquipelago-challenge-dialog.fixture.tsx'),
    ],
    { cwd: resolve(import.meta.dirname, '..'), stdout: 'pipe', stderr: 'pipe', windowsHide: true },
  )
  const timer = setTimeout(() => child.kill(), 20_000)
  try {
    const [code, out, err] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect(code, out + err).toBe(0)
    expect(out + err).toMatch(/6 pass/)
  } finally {
    clearTimeout(timer)
    if (child.exitCode === null) child.kill()
  }
}, 25_000)
