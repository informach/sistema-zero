import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('a ponte de nuvem preserva a autoridade local em realm isolado', async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      'test',
      resolve(import.meta.dir, 'fixtures/pinta-local-authority.fixture.ts'),
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
    expect(stdout + stderr).toMatch(/\b16 pass\b/)
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
  }
}, 18_000)
