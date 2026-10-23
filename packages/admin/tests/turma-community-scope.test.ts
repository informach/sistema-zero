import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

// Projetos e Recados montados de verdade precisam de um `next/navigation` trocado (endereço e
// roteador). `mock.module` vale para o processo inteiro, então a prova roda num processo só dela.
test('Turma: filtro Comunidade em Projetos e Recados, e o nome fora do endereço', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/turma-community-scope.fixture.tsx'],
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
