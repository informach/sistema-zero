import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('o Estúdio de desafio confere no serviço, devolve cumprido ou cancelado e protege o jogo', async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      'test',
      resolve(import.meta.dirname, 'fixtures/arquipelago-desafio-dialog.fixture.tsx'),
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
    expect(stdout + stderr).toMatch(/\b14 pass\b/)
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
  }
}, 18_000)
