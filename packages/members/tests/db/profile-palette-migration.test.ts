import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { prepareTestDatabase } from './test-database'

/**
 * A migração 0088 é a única do lote que MEXE EM DADOS: ela renomeia a coluna do tema e normaliza
 * o antigo `'padrao'` — que era o "desligado", não uma escolha — para NULL.
 *
 * ⚠️⚠️ Duas coisas que só um banco de verdade prova, e que o resto da suíte não tocava:
 * as linhas `'padrao'` são ANULADAS, nunca APAGADAS (elas guardam a relação perfil↔conta, lida em
 * SQL cru pelo `challenge-lifecycle.repository`), e o CHECK novo é de FORMA, não de vocabulário —
 * a régua de quais cores existem mora no `@sistemazero/core/palette`, para uma cor nova não pedir
 * migração.
 */
const url = await prepareTestDatabase()
test.skipIf(!url)(
  '0088 anula o tema antigo sem apagar linha e troca o CHECK por um de forma',
  async () => {
    if (!url) throw new Error('Test database unavailable')
    const conn = createDbConnection(url)
    const schema = `test_palette_${randomUUID().replaceAll('-', '')}`
    const ddl = async (arquivo: string) => {
      const texto = await Bun.file(
        new URL(
          `../../src/infrastructure/persistence/drizzle/migrations/${arquivo}`,
          import.meta.url,
        ),
      ).text()
      await conn.sql.unsafe(texto.replaceAll('"members"', `"${schema}"`))
    }
    try {
      await conn.sql.unsafe(`create schema "${schema}"`)
      await ddl('0086_round_captain_stacy.sql')

      const antigo = randomUUID()
      const rosa = randomUUID()
      const padraoImplicito = randomUUID()
      const conta = randomUUID()
      await conn.sql.unsafe(
        `insert into "${schema}".profile_preferences (user_id, account_id, kids_theme, updated_at) values
       ('${antigo}', '${conta}', 'padrao', now()),
       ('${rosa}', '${conta}', 'pink', now())`,
      )
      // A coluna tinha DEFAULT 'padrao': quem nunca abriu o perfil também tem a linha.
      await conn.sql.unsafe(
        `insert into "${schema}".profile_preferences (user_id, account_id, updated_at) values ('${padraoImplicito}', '${conta}', now())`,
      )

      await ddl('0088_profile_palette.sql')

      const linhas = await conn.sql.unsafe(
        `select user_id::text as id, palette from "${schema}".profile_preferences order by palette nulls first, user_id`,
      )
      // ⚠️ TRÊS linhas: nenhuma foi apagada, duas foram anuladas.
      expect(linhas).toHaveLength(3)
      expect(
        linhas
          .filter((l) => l.palette === null)
          .map((l) => l.id)
          .sort(),
      ).toEqual([antigo, padraoImplicito].sort())
      expect(linhas.find((l) => l.palette === 'pink')?.id).toBe(rosa)

      // A coluna ficou anulável, sem default e com o tipo novo.
      const [coluna] = await conn.sql.unsafe(
        `select is_nullable, column_default, data_type, character_maximum_length
         from information_schema.columns
        where table_schema = '${schema}' and table_name = 'profile_preferences' and column_name = 'palette'`,
      )
      expect(coluna).toMatchObject({
        is_nullable: 'YES',
        column_default: null,
        data_type: 'character varying',
        character_maximum_length: 32,
      })

      // O CHECK novo é de FORMA: uma cor que ainda não existe hoje entra sem migração…
      const inserir = (palette: string | null) =>
        conn.sql`insert into ${conn.sql(schema)}.profile_preferences
          (user_id, account_id, palette, updated_at)
          values (${randomUUID()}, ${conta}, ${palette}, now())`
      await inserir('amarelo-queimado')
      await inserir(null)
      // …e lixo continua barrado no banco.
      for (const ruim of ['Pink', 'cor com espaço', "'; drop table --", 'x'.repeat(33)]) {
        let recusada = false
        try {
          await inserir(ruim)
        } catch {
          recusada = true
        }
        expect({ ruim, recusada }).toEqual({ ruim, recusada: true })
      }
    } finally {
      await conn.sql.unsafe(`drop schema if exists "${schema}" cascade`)
      await conn.close()
    }
  },
  60_000,
)
