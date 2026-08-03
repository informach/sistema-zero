import { describe, expect, it } from 'bun:test'
import journal from '../../src/infrastructure/persistence/drizzle/migrations/meta/_journal.json'

/**
 * GUARDA do incidente 03/08/2026 (aulas fora do ar em staging E produção).
 *
 * O drizzle aplica só as migrations com `when` ACIMA da marca d'água (o
 * `created_at` da última registrada em `drizzle.members_migrations`). Uma
 * migration com carimbo MENOR que a anterior é **pulada em silêncio**: o
 * `db:migrate` do preDeploy sai com código 0, o deploy segue, e o serviço vai
 * ao ar consultando uma coluna que não existe.
 *
 * Foi exatamente o que houve: as `0055`–`0058` foram carimbadas à mão com data
 * no FUTURO e a `0059`, gerada com o relógio real, nasceu ~26h abaixo delas.
 *
 * Este teste transforma essa falha silenciosa de RUNTIME num vermelho de CI.
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
