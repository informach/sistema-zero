import { describe, expect, it } from 'bun:test'
import journal from '../../src/infrastructure/persistence/drizzle/migrations/meta/_journal.json'

/**
 * GUARDA do incidente 03/08/2026 do monorepo (migration pulada em silêncio).
 *
 * O drizzle aplica só as migrations com `when` ACIMA da marca d'água (o
 * `created_at` da última registrada em `drizzle.arquipelago_migrations`). Uma
 * migration com carimbo MENOR que a anterior é **pulada em silêncio**: o
 * `db:migrate` do preDeploy sai com código 0, o deploy segue, e o serviço vai
 * ao ar consultando uma coluna que não existe.
 *
 * Este teste transforma essa falha silenciosa de RUNTIME num vermelho de CI.
 * (Cópia do guard do referrals: carimbo é RELÓGIO, não numeração.)
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

/**
 * GUARDA das lacunas (01/11/2026): os três percursos do L3 entraram no contrato sem migration, e a
 * trava `fantasmas_percurso_check` do banco recusaria o fantasma deles. A foto da última migration
 * precisa ter todos os percursos do contrato.
 */
describe('a trava dos percursos acompanha o contrato', () => {
  it('a última foto do banco aceita todos os PERCURSOS', async () => {
    const { PERCURSOS } = await import('@sistemazero/arquipelago-contracts')
    const ultima = (journal.entries as Array<{ idx: number }>).at(-1)?.idx ?? 0
    const foto = (await Bun.file(
      new URL(
        `../../src/infrastructure/persistence/drizzle/migrations/meta/${String(ultima).padStart(4, '0')}_snapshot.json`,
        import.meta.url,
      ),
    ).json()) as {
      tables: Record<string, { checkConstraints: Record<string, { value: string }> }>
    }
    const trava =
      foto.tables['arquipelago.fantasmas']?.checkConstraints.fantasmas_percurso_check?.value ?? ''
    expect(trava).not.toBe('')
    for (const percurso of PERCURSOS) expect(trava, percurso).toContain(`'${percurso}'`)
  })
})
