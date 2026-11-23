import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

// The fixture installs the global idb-keyval mock of the Pinta package (in its physical codec
// mode); bun's module-mock registry is shared by the whole suite, so it runs in an isolated realm.
test('a janela focal grava pela conta: falha do PUT, duas abas, rede, recibo e retomada', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', resolve(import.meta.dir, 'fixtures/pinta-focal-account.fixture.ts')],
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
    expect(stdout + stderr).toMatch(/\b5 pass\b/)
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
  }
}, 18_000)
