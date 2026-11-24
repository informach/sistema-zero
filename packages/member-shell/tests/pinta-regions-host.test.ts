import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

// A fixture instala o mock global (DOM e módulos externos simulados do host); o registro de mocks do bun é
// compartilhado pela suíte inteira, então ela roda num realm isolado.
test('o host do Pinta solto monta a oficina regional quando a conta pode guardar o regional', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', resolve(import.meta.dir, 'fixtures/pinta-regions-host.fixture.tsx')],
    {
      cwd: resolve(import.meta.dir, '..'),
      stdout: 'pipe',
      stderr: 'pipe',
      windowsHide: true,
    },
  )
  const deadline = setTimeout(() => child.kill(), 30_000)
  try {
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect(code, stdout + stderr).toBe(0)
    expect(stdout + stderr).toMatch(/\b6 pass\b/)
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
  }
}, 35_000)
