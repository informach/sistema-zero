import { describe, expect, it } from 'bun:test'
import journal from '../../src/infrastructure/persistence/drizzle/migrations/meta/_journal.json'

/**
 * GUARDA do incidente 03/08/2026 do monorepo (migration pulada em silêncio).
 *
 * O drizzle aplica só as migrations com `when` ACIMA da marca d'água (o
 * `created_at` da última registrada em `drizzle.referrals_migrations`). Uma
 * migration com carimbo MENOR que a anterior é **pulada em silêncio**: o
 * `db:migrate` do preDeploy sai com código 0, o deploy segue, e o serviço vai
 * ao ar consultando uma coluna que não existe.
 *
 * Este teste transforma essa falha silenciosa de RUNTIME num vermelho de CI.
 * (Cópia do guard do members/hub — regra: carimbo é RELÓGIO, não numeração.)
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
