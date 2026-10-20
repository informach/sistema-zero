import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('o /pensa liga a leitura da sessão de suporte desde o primeiro quadro', async () => {
  // O bun divide o cache de módulos entre os arquivos: a página com o Members e a sessão falsos
  // roda num processo separado para os falsos não vazarem para as outras suítes.
  const child = Bun.spawn([Bun.which('bun')!, 'test', './tests/fixtures/pensa-page-support.tsx'], {
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
