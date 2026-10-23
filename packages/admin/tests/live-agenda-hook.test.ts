import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('a agenda real cerca paginação, atualização e saída em um navegador isolado', async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      '--no-env-file',
      'test',
      resolve(import.meta.dirname, 'fixtures/live-agenda-hook.fixture.tsx'),
    ],
    { cwd: resolve(import.meta.dirname, '..'), stdout: 'pipe', stderr: 'pipe', windowsHide: true },
  )
  const deadline = setTimeout(() => child.kill(), 15_000)
  try {
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect(code, stdout + stderr).toBe(0)
    expect(stdout + stderr).toMatch(/\b4 pass\b/)
    expect(stdout + stderr).toMatch(/\b0 fail\b/)
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
    await child.exited
  }
}, 18_000)
