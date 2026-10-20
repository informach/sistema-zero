import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AccessCheckService } from '../../src/application/access-check/access-check.service'
import { DrizzleAdultJourneyRepository } from '../../src/infrastructure/persistence/drizzle/adult-journey.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleEntitlementRepository } from '../../src/infrastructure/persistence/drizzle/entitlement.repository'
import { DrizzleStudioUnlockRepository } from '../../src/infrastructure/persistence/drizzle/studio-unlock.repository'
import { prepareTestDatabase } from './test-database'

/**
 * O fim do acesso pelo SQL de verdade: a varredura `expireLapsed`, o `expired` e o `canceled` da
 * assinatura só mexem em `entitlements`. A jornada adulta (capacidades congeladas e piso), o
 * posto Kids (`kids_journey_earned`) e a paleta do Estúdio (`studio_block_grants`) ficam iguais.
 *
 * ⚠️ O relógio é 1985 de propósito: a varredura é GLOBAL e o banco de tests/db é compartilhado
 * (ver `expire-lapsed.test.ts`, que usa 1999/2000). As linhas daqui são apagadas no fim.
 */
const url = await prepareTestDatabase()
describe.skipIf(!url)('jornada sobrevive ao fim do acesso (Postgres real)', () => {
  let conn: DbConnection
  let entitlements: DrizzleEntitlementRepository
  const marca = '1985-journey-'
  const adult = randomUUID()
  const account = randomUUID()
  const child = randomUUID()
  const course = randomUUID()
  const now = new Date('1985-06-01T00:00:00Z')
  // A política só é apagada no fim se ESTE arquivo a criou (o banco é compartilhado).
  let insertedPolicy = false

  beforeAll(async () => {
    conn = createDbConnection(url as string)
    entitlements = new DrizzleEntitlementRepository(conn.db)
    await conn.sql.unsafe(`create table if not exists members.entitlements (
      id uuid primary key, user_id uuid not null)`)
    await conn.sql.unsafe(`alter table members.entitlements
      add column if not exists version integer not null default 0,
      add column if not exists product_id uuid not null default gen_random_uuid(),
      add column if not exists product_kind text not null default 'course',
      add column if not exists access_type text not null default 'course',
      add column if not exists course_ref text,
      add column if not exists offer_id uuid,
      add column if not exists snapshot jsonb not null default '{}'::jsonb,
      add column if not exists status text not null default 'active',
      add column if not exists source_kind text not null default 'payment',
      add column if not exists source_id text not null default 'seed',
      add column if not exists subscription_id text,
      add column if not exists granted_at timestamp with time zone not null default now(),
      add column if not exists expires_at timestamp with time zone,
      add column if not exists revoked_at timestamp with time zone,
      add column if not exists idempotency_key text not null default gen_random_uuid()::text,
      add column if not exists created_at timestamp with time zone not null default now(),
      add column if not exists updated_at timestamp with time zone not null default now()`)
    // `audience` é enum no schema real; texto basta (mesmo DDL de studio-unlock.repository.test).
    await conn.sql.unsafe(`create table if not exists members.studio_block_grants (
      id uuid primary key, user_id uuid not null, audience text not null default 'kids',
      course_id uuid not null, blocks jsonb not null, granted_at timestamptz not null)`)
    await conn.sql.unsafe(`create unique index if not exists studio_block_grants_user_course_uq
      on members.studio_block_grants (user_id, audience, course_id)`)
    await conn.sql.unsafe(`create table if not exists members.account_deletion_fences (
      account_id uuid primary key, created_at timestamptz not null)`)
  })

  afterAll(async () => {
    await conn.sql`delete from members.entitlements where source_id like ${`${marca}%`}`
    await conn.sql`delete from members.adult_journey_grants where user_id = ${adult}`
    await conn.sql`delete from members.adult_journey_reached where user_id = ${adult}`
    await conn.sql`delete from members.kids_journey_earned where user_id = ${child}`
    await conn.sql`delete from members.studio_block_grants where user_id in (${adult}, ${child})`
    if (insertedPolicy)
      await conn.sql`delete from members.adult_journey_policy
        where id = 'adult' and version = 1 and updated_at = ${now.toISOString()}`
    await conn.sql.end()
  })

  async function journeyRows() {
    return {
      grants: await conn.sql`select user_id, capability, policy_version, granted_at
        from members.adult_journey_grants where user_id = ${adult} order by capability`,
      reached: await conn.sql`select * from members.adult_journey_reached where user_id = ${adult}`,
      kids: await conn.sql`select * from members.kids_journey_earned where user_id = ${child}`,
      palette: await conn.sql`select user_id, audience, course_id, blocks::text, granted_at
        from members.studio_block_grants where user_id in (${adult}, ${child}) order by user_id`,
    }
  }

  test('expireLapsed, expired e canceled da assinatura não tocam em jornada nem paleta', async () => {
    const seed = async (
      userId: string,
      ref: string,
      subscriptionId: string,
      expiresAt: string,
      label: string,
    ) => {
      await conn.sql`insert into members.entitlements
        (id, user_id, access_type, product_kind, course_ref, status, source_kind, source_id,
         subscription_id, expires_at, idempotency_key, snapshot)
        values (${randomUUID()}, ${userId}, 'community', 'tool', ${ref}, 'active', 'payment',
          ${`${marca}${label}`}, ${subscriptionId}, ${expiresAt}, ${`${marca}${label}`},
          ${JSON.stringify({ sku: ref, accessType: 'community', courseRef: ref })}::jsonb)`
    }
    await seed(adult, 'adult-estudio-completo', `${marca}sub-adult`, '1985-05-01T00:00:00Z', 'a1')
    await seed(account, 'estudio-completo', `${marca}sub-kids`, '1985-07-01T00:00:00Z', 'k1')
    await seed(account, 'pinta', `${marca}sub-kids-2`, '1985-07-01T00:00:00Z', 'k2')

    // Estado conquistado: capacidades e piso adultos pelo repositório real, posto Kids e paleta.
    const inserted = await conn.sql`insert into members.adult_journey_policy
      (id, version, policy, updated_at)
      values ('adult', 1, '{"schemaVersion":1,"stages":[]}'::jsonb, ${now.toISOString()})
      on conflict (id) do nothing
      returning id`
    insertedPolicy = inserted.length > 0
    const [policy] = await conn.sql<{ version: number }[]>`
      select version from members.adult_journey_policy where id = 'adult'`
    const adultJourney = new DrizzleAdultJourneyRepository(conn.db)
    expect(
      await adultJourney.freezeGranted(adult, policy!.version, ['studio', 'pinta'], now, 2),
    ).toBe(true)
    await conn.sql`insert into members.kids_journey_earned
      (user_id, account_id, level, capabilities, entry_tiers, policy_version, updated_at)
      values (${child}, ${account}, 'hacker', '["studio","pinta","molda"]'::jsonb,
        array['primeiros-passos-2d','iniciante-2d']::text[], 1, ${now.toISOString()})`
    const unlocks = new DrizzleStudioUnlockRepository(conn.db)
    await unlocks.saveGrants(adult, 'adult', [{ courseId: course, blocks: ['sz_a'] }])
    await unlocks.saveGrants(child, 'kids', [{ courseId: course, blocks: ['sz_k'] }])
    const before = await journeyRows()
    expect(before.grants).toHaveLength(2)
    expect(before.reached[0]?.position).toBe(2)
    expect(before.kids).toHaveLength(1)
    expect(before.palette).toHaveLength(2)

    const access = (userId: string, ref: string, at: Date) =>
      new AccessCheckService(entitlements, () => at).execute(userId, [ref])
    expect((await access(account, 'estudio-completo', now)).communities).toContain(
      'estudio-completo',
    )

    // 1) A varredura do ciclo de retenção vence a assinatura adulta (fim do período pago).
    await entitlements.expireLapsed(now, 1000)
    // 2) O provedor expira uma assinatura Kids; 3) cancela a outra.
    await entitlements.expireBySubscriptionId(`${marca}sub-kids`, now)
    await entitlements.revokeBySubscriptionId(`${marca}sub-kids-2`, now)
    const statuses = await conn.sql<{ source_id: string; status: string }[]>`
      select source_id, status from members.entitlements where source_id like ${`${marca}%`}
      order by source_id`
    expect(statuses.map((row) => row.status)).toEqual(['expired', 'expired', 'revoked'])

    // Ferramentas voltam a exigir licença...
    expect((await access(adult, 'adult-estudio-completo', now)).communities).toEqual([])
    expect((await access(account, 'estudio-completo', now)).communities).toEqual([])
    // ...e nada do que foi conquistado mudou.
    expect(await journeyRows()).toEqual(before)
    expect(await adultJourney.listGranted(adult)).toEqual(
      expect.arrayContaining(['studio', 'pinta']),
    )
    expect(await adultJourney.getReached(adult)).toBe(2)
    expect((await unlocks.listGrants(adult, 'adult'))[0]?.blocks).toEqual(['sz_a'])
  })
})
