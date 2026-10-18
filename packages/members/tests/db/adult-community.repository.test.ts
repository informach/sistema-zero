import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ForbiddenError } from '@sistemazero/core/http'
import { DrizzleAdultProfileRepository } from '../../src/infrastructure/persistence/drizzle/adult-profile.repository'
import { DrizzleChallengeConfigRepository } from '../../src/infrastructure/persistence/drizzle/challenge-config.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { prepareTestDatabase } from './test-database'

const url = await prepareTestDatabase()
describe.skipIf(!url)('preferências e desafios adultos (Postgres real)', () => {
  let conn: DbConnection
  const monthKey = 'm:2098-07'
  const userId = randomUUID()
  const kidsThemeId = randomUUID()
  const adultThemeId = randomUUID()
  const now = new Date('2026-10-18T12:00:00Z')
  beforeAll(async () => {
    conn = createDbConnection(url as string)
    const [existing] =
      await conn.sql`select to_regclass('members.challenge_month_overrides') as name`
    if (!existing?.name) {
      const source = await Bun.file(
        new URL(
          '../../src/infrastructure/persistence/drizzle/migrations/0043_bouncy_the_renegades.sql',
          import.meta.url,
        ),
      ).text()
      for (const statement of source.split('--> statement-breakpoint'))
        if (statement.trim()) await conn.sql.unsafe(statement)
    }
    const [legacyColumn] =
      await conn.sql`select 1 from information_schema.columns where table_schema = 'members' and table_name = 'challenge_custom_themes' and column_name = 'suggested_kit'`
    if (legacyColumn)
      await conn.sql.unsafe(
        await Bun.file(
          new URL(
            '../../src/infrastructure/persistence/drizzle/migrations/0046_light_runaways.sql',
            import.meta.url,
          ),
        ).text(),
      )
    await conn.sql.unsafe(
      'create table if not exists members.account_deletion_fences (account_id uuid primary key, created_at timestamptz not null)',
    )
  })
  afterAll(async () => {
    for (const table of ['challenge_month_overrides', 'adult_challenge_month_overrides'])
      await conn.sql.unsafe(`delete from members.${table} where month_key = $1`, [monthKey])
    await conn.sql`delete from members.challenge_custom_themes where id = ${kidsThemeId}`
    await conn.sql`delete from members.adult_challenge_custom_themes where id = ${adultThemeId}`
    await conn.sql`delete from members.adult_profiles where user_id = ${userId}`
    await conn.sql`delete from members.account_deletion_fences where account_id = ${userId}`
    await conn.sql.end()
  })
  test('mesmo mês recebe temas distintos; SQL legado Kids continua válido e exclusão adulta não o altera', async () => {
    const repo = new DrizzleChallengeConfigRepository(conn.db)
    await repo.createCustomTheme({
      id: kidsThemeId,
      emoji: '🎮',
      title: 'Kids',
      description: 'Kids',
      now,
    })
    await repo.createCustomTheme({
      id: adultThemeId,
      audience: 'adult',
      emoji: '🎮',
      title: 'Adulto',
      description: 'Adulto',
      now,
    })
    expect(await repo.findCustomTheme(adultThemeId)).toBeNull()
    expect(await repo.findCustomTheme(kidsThemeId, 'adult')).toBeNull()
    const input = { monthKey, builtinSlug: null, updatedByUserId: null, now }
    await repo.upsertOverride({ ...input, customThemeId: kidsThemeId })
    await repo.upsertOverride({ ...input, audience: 'adult', customThemeId: adultThemeId })
    expect((await repo.findOverrideWithTheme(monthKey))?.customTheme?.title).toBe('Kids')
    expect((await repo.findOverrideWithTheme(monthKey, 'adult'))?.customTheme?.title).toBe('Adulto')
    await conn.sql`insert into members.challenge_month_overrides (month_key, custom_theme_id, updated_at)
      values (${monthKey}, ${kidsThemeId}, ${now.toISOString()}) on conflict (month_key) do update set custom_theme_id = excluded.custom_theme_id`
    await repo.deleteOverride(monthKey, 'adult')
    expect((await repo.findOverrideWithTheme(monthKey))?.customTheme?.title).toBe('Kids')
    expect(await repo.findOverrideWithTheme(monthKey, 'adult')).toBeNull()
  })
  test('perfil privado não entra no lote público e conta em exclusão não recupera preferências', async () => {
    const repo = new DrizzleAdultProfileRepository(conn.db)
    const preferences = {
      displayName: 'Criador de jogos',
      publicEnabled: false,
      voiceEnabled: false,
    }
    await repo.save(userId, preferences, now)
    expect(await repo.listPublic([userId])).toEqual([])
    await repo.save(userId, { ...preferences, publicEnabled: true }, now)
    expect(await repo.listPublic([userId, randomUUID()])).toEqual([
      { userId, displayName: preferences.displayName },
    ])
    await conn.sql`insert into members.account_deletion_fences (account_id, created_at) values (${userId}, ${now.toISOString()})`
    let rejected: unknown
    try {
      await repo.save(userId, preferences, now)
    } catch (error) {
      rejected = error
    }
    expect(rejected).toBeInstanceOf(ForbiddenError)
  })
})
