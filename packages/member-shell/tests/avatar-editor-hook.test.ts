import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

// A fixture registra um navegador de mentira (happy-dom) e troca o `fetch`: fica fora do processo
// dos testes do BFF, que precisam dos construtores HTTP nativos.
test('o salvar sozinho do "Meu avatar" roda num navegador isolado', async () => {
  const child = Bun.spawn([process.execPath, 'test', './qa/avatar-editor-hook.fixture.tsx'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(code, stdout + stderr).toBe(0)
}, 60_000)
