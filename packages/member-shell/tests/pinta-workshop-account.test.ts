import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

// The fixture installs the global idb-keyval mock of the Pinta package; bun's module-mock
// registry is shared by the whole suite, so it runs in an isolated realm like the local authority.
test('a oficina com leitor A guarda a autoria pela conta em realm isolado', async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      'test',
      resolve(import.meta.dir, 'fixtures/pinta-workshop-account.fixture.ts'),
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
    expect(stdout + stderr).toMatch(/\b2 pass\b/)
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
  }
}, 18_000)
