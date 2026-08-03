import { describe, expect, it } from 'bun:test'
import journal from '../../src/infrastructure/persistence/drizzle/migrations/meta/_journal.json'

/**
 * GUARDA (espelho do teste do members) do incidente 03/08/2026.
 *
 * O drizzle aplica só as migrations com `when` ACIMA da marca d'água (o
 * `created_at` da última registrada no journal do banco). Carimbo menor que o
 * da anterior = migration **pulada em silêncio**: `db:migrate` sai com código 0,
 * o deploy segue e o serviço vai ao ar contra um schema que não existe.
 *
 * ⚠️ O hub tem carimbos escritos à mão no FUTURO (até 06/08/2026 07:07). Isso
 * NÃO é corrigível baixando os números aqui: a marca d'água mora no BANCO
 * (`created_at` das linhas já aplicadas), não neste arquivo. Enquanto o relógio
 * real não passar daquele instante, TODA migration nova gerada aqui nasce
 * abaixo da marca — gere e depois SUBA o `when` à mão. Este teste é a rede.
 */
describe('journal de migrations', () => {
  const entries = journal.entries as Array<{ idx: number; when: number; tag: string }>

  it('tem carimbos ESTRITAMENTE crescentes (senão o drizzle pula em silêncio)', () => {
    const foraDeOrdem = entries
      .map((entry, i) => ({ entry, anterior: entries[i - 1] }))
      .filter(({ entry, anterior }) => anterior !== undefined && entry.when <= anterior.when)
      .map(
        ({ entry, anterior }) =>
          `${entry.tag} (when=${entry.when}) não é maior que ${anterior?.tag} (when=${anterior?.when})`,
      )
    expect(foraDeOrdem).toEqual([])
  })

  it('numera na mesma ordem dos carimbos', () => {
    expect(entries.map((e) => e.idx)).toEqual(
      [...entries].sort((a, b) => a.when - b.when).map((e) => e.idx),
    )
  })
})
