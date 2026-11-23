import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

// O mock transacional do Pinta não implementa o UseStore do Estúdio. O registro de
// módulos do Bun é compartilhado: esta fronteira pertence só à prova de paletas.
test('as paletas negociadas preservam as 19 provas sem substituir o IndexedDB do Estúdio', async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      'test',
      resolve(import.meta.dir, 'fixtures/pinta-palette-writer.fixture.ts'),
    ],
    {
      cwd: resolve(import.meta.dir, '..'),
      stdout: 'pipe',
      stderr: 'pipe',
      windowsHide: true,
    },
  )
  const deadline = setTimeout(() => child.kill(), 15_000)
  try {
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect(code, stdout + stderr).toBe(0)
    expect(stdout + stderr).toMatch(/\b19 pass\b/)
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
  }
}, 18_000)
