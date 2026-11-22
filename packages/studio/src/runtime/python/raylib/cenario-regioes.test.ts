import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { casosDasRegioes } from '../../../../scripts/gen-raylib-region-cases'

/**
 * As regiões do `cenario.py` seguem as do núcleo (lote 7b da conclusão, 22/11/2026): o arquivo de
 * casos que o teste Python lê é o que o núcleo TypeScript calcula hoje. Mudou a pertença ou o
 * plano da carga no núcleo? Este teste reprova até o arquivo ser regravado
 * (`bun scripts/gen-raylib-region-cases.ts`), e aí o teste Python confere a cópia dele.
 */
test('os casos das regiões do Raylib são os que o núcleo calcula', () => {
  const gravado = JSON.parse(
    readFileSync(new URL('./__tests__/regioes-casos.json', import.meta.url), 'utf8'),
  )
  expect(gravado).toEqual(JSON.parse(JSON.stringify(casosDasRegioes())))
  // Os casos cobrem o que importa: a borda, a água pela pegada, o que é de todas e as entradas.
  const [vila, praia] = gravado.pertenca.esperado
  expect(vila.nos).toContain('na-borda')
  expect(praia.nos).toContain('na-borda')
  expect(praia.colisoes).toContain('lago-col')
  for (const id of ['fora', 'ator', 'bau-no', 'lote', 'mar-no'])
    expect([...vila.nos, ...praia.nos]).not.toContain(id)
  const entradas = gravado.plano[0].passos.flatMap(
    (p: { esperado: { entradas: string[] } }) => p.esperado.entradas,
  )
  expect(entradas).toEqual(['Vila', 'Floresta', 'Vila', 'Vila'])
})
