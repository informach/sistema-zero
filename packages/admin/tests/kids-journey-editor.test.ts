import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('editor Kids usa o contrato real em processo isolado de navegação/API', async () => {
  const child = Bun.spawn([process.execPath, 'test', './tests/fixtures/kids-journey-editor.tsx'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  expect({ exitCode, output: exitCode === 0 ? '' : stdout + stderr }).toEqual({
    exitCode: 0,
    output: '',
  })
}, 30_000)
