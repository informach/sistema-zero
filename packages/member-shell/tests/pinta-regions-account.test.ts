import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

// A fixture instala o mock global (IndexedDB físico do Pinta (codec ligado)); o registro de mocks do bun é
// compartilhado pela suíte inteira, então ela roda num realm isolado.
test('as regiões sobem pela fila causal e o cliente antigo encontra o dado regional sem apagar nem regravar', async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      'test',
      resolve(import.meta.dir, 'fixtures/pinta-regions-account.fixture.ts'),
    ],
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
    expect(stdout + stderr).toMatch(/\b8 pass\b/)
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
  }
}, 35_000)
