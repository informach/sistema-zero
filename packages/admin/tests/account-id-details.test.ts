import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

// Moderação e ficha da conta montadas de verdade precisam de um `next/navigation` trocado.
// `mock.module` vale para o processo inteiro, então a prova roda num processo só dela.
test('Moderação e ficha da conta: o ID da conta mora nos detalhes técnicos', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/account-id-details.fixture.tsx'],
    {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
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
