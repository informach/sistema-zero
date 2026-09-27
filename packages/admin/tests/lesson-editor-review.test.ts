import { expect, test } from 'bun:test'

test('full editor regression scenarios use real state and isolated storage/HTTP boundaries', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/lesson-editor-review.fixture.tsx'],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const [output, errors, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(status, output + errors).toBe(0)
}, 30_000)
// ⚠️ Teto explícito: este cenário monta o editor inteiro e leva ~7 s numa máquina carregada,
// contra os 5 s padrão do bun. Sem o teto ele é cara ou coroa — verde sozinho, vermelho na
// suíte — que é a pior forma de vermelho.
