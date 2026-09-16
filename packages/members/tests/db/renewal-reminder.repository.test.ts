import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRenewalReminderRepository } from '../../src/infrastructure/persistence/drizzle/renewal-reminder.repository'
import { prepareTestDatabase } from './test-database'

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — teste de lembrete PULADO.')
}

describe.skipIf(!testDatabaseUrl)('DrizzleRenewalReminderRepository no Postgres real', () => {
  let conn: DbConnection

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    await conn.sql.unsafe(`
      create table if not exists members.entitlements (
        id uuid primary key,
        user_id uuid not null
      )
    `)
    await conn.sql.unsafe(`
      alter table members.entitlements
        add column if not exists snapshot jsonb not null default '{}'::jsonb,
        add column if not exists status text not null default 'active',
        add column if not exists source_kind text not null default 'payment',
        add column if not exists subscription_id text,
        add column if not exists expires_at timestamp with time zone,
        add column if not exists access_type text not null default 'course',
        add column if not exists course_ref text,
        add column if not exists granted_at timestamp with time zone not null default now()
    `)
    await conn.sql.unsafe(`
      create table if not exists members.renewal_reminders_sent (
        entitlement_id uuid not null,
        expires_on date not null,
        primary key (entitlement_id, expires_on)
      )
    `)
    await conn.sql.unsafe(`
      create table if not exists members.entitlement_lifecycle_messages_sent (
        entitlement_id uuid not null,
        expires_on date not null,
        message_kind text not null,
        sent_at timestamp with time zone not null default now(),
        primary key (entitlement_id, expires_on, message_kind)
      )
    `)
  })

  afterAll(async () => {
    await conn?.close()
  })

  beforeEach(async () => {
    // Janela exclusiva deste fixture; evita que uma execução anterior do teste
    // influencie qual grupo o LIMIT escolhe no banco persistente de testes.
    await conn.sql`
      delete from members.entitlement_lifecycle_messages_sent
      where entitlement_id in (
        select id from members.entitlements
        where expires_at >= '2027-05-20T00:00:00Z'
          and expires_at <= '2027-05-31T00:00:00Z'
      )
    `
    await conn.sql`
      delete from members.renewal_reminders_sent
      where entitlement_id in (
        select id from members.entitlements
        where expires_at >= '2027-05-25T00:00:00Z'
          and expires_at <= '2027-05-31T00:00:00Z'
      )
    `
    await conn.sql`
      delete from members.entitlements
      where expires_at >= '2027-05-20T00:00:00Z'
        and expires_at <= '2027-05-31T00:00:00Z'
    `
  })

  test('limita grupos sem separar as matrículas de uma compra', async () => {
    const samePurchaseUserId = randomUUID()
    const nextPurchaseUserId = randomUUID()
    const samePurchaseIds = [randomUUID(), randomUUID(), randomUUID()]
    const nextPurchaseId = randomUUID()
    const expiresAt = '2027-05-30T00:00:00Z'
    const nextExpiresAt = '2027-05-31T00:00:00Z'
    const snapshot = JSON.stringify({ offerSlug: 'clube-anual', name: 'Clube dos Criadores' })

    for (const id of samePurchaseIds) {
      await conn.sql`
        insert into members.entitlements
          (id, user_id, snapshot, status, source_kind, subscription_id, expires_at)
        values (${id}, ${samePurchaseUserId}, ${snapshot}::jsonb, 'active', 'payment', null, ${expiresAt})
      `
    }
    await conn.sql`
      insert into members.entitlements
        (id, user_id, snapshot, status, source_kind, subscription_id, expires_at)
      values (${nextPurchaseId}, ${nextPurchaseUserId}, ${snapshot}::jsonb, 'active', 'payment', null, ${nextExpiresAt})
    `

    const rows = await new DrizzleRenewalReminderRepository(conn.db).listExpiringTermEntitlements(
      new Date('2027-05-25T00:00:00Z'),
      new Date('2027-05-31T00:00:00Z'),
      1,
    )

    expect(rows).toHaveLength(3)
    expect(new Set(rows.map((row) => row.id))).toEqual(new Set(samePurchaseIds))
  })

  test('fixed/days usa as faixas próprias e o mark torna cada aviso one-shot', async () => {
    const accountId = randomUUID()
    const entitlementId = randomUUID()
    const snapshot = JSON.stringify({
      offerSlug: 'desafio-primeiro-jogo-30-dias',
      name: 'Desafio do Primeiro Jogo',
      accessPolicy: { mode: 'fixed', durationValue: 30, durationUnit: 'days' },
    })
    await conn.sql`
      insert into members.entitlements
        (id, user_id, snapshot, status, source_kind, subscription_id, expires_at,
         access_type, course_ref, granted_at)
      values (${entitlementId}, ${accountId}, ${snapshot}::jsonb, 'active', 'payment', null,
        '2027-05-30T00:00:00Z', 'course', 'desafio-primeiro-jogo', '2027-04-30T00:00:00Z')
    `

    const repo = new DrizzleRenewalReminderRepository(conn.db)
    const rows = await repo.listFixedAccessLifecycleEntitlements(
      new Date('2027-05-25T12:00:00Z'),
      10,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.messageKind).toBe('expiry_7d')

    await repo.markLifecycleMessageSent(entitlementId, '2027-05-30', 'expiry_7d', new Date())
    expect(
      await repo.listFixedAccessLifecycleEntitlements(new Date('2027-05-25T12:00:00Z'), 10),
    ).toHaveLength(0)

    // Ao entrar na faixa seguinte, a chave muda e o aviso de 3 dias fica elegível.
    const threeDays = await repo.listFixedAccessLifecycleEntitlements(
      new Date('2027-05-28T00:00:00Z'),
      10,
    )
    expect(threeDays[0]?.messageKind).toBe('expiry_3d')

    // O lembrete anual genérico nunca captura um contrato fixed/days.
    expect(
      await repo.listExpiringTermEntitlements(
        new Date('2027-05-25T00:00:00Z'),
        new Date('2027-05-31T00:00:00Z'),
        10,
      ),
    ).toHaveLength(0)
  })

  test('vitalício é ignorado e assinatura ou chave-mestra mais forte bloqueiam aviso', async () => {
    const accountId = randomUUID()
    const fixedId = randomUUID()
    const lifetimeId = randomUUID()
    const subscriptionId = randomUUID()
    const masterId = randomUUID()
    const fixedSnapshot = JSON.stringify({
      offerSlug: 'desafio-primeiro-jogo-30-dias',
      name: 'Desafio do Primeiro Jogo',
      accessPolicy: { mode: 'fixed', durationValue: 30, durationUnit: 'days' },
    })

    await conn.sql`
      insert into members.entitlements
        (id, user_id, snapshot, status, source_kind, subscription_id, expires_at,
         access_type, course_ref, granted_at)
      values
        (${fixedId}, ${accountId}, ${fixedSnapshot}::jsonb, 'active', 'payment', null,
          '2027-05-30T00:00:00Z', 'course', 'desafio-primeiro-jogo', '2027-04-30T00:00:00Z'),
        (${lifetimeId}, ${randomUUID()}, ${JSON.stringify({ accessPolicy: { mode: 'lifetime' } })}::jsonb,
          'active', 'payment', null, null, 'course', 'desafio-primeiro-jogo', now()),
        (${subscriptionId}, ${accountId}, '{}'::jsonb, 'active', 'subscription', 'sub-1',
          '2027-06-30T00:00:00Z', 'course', 'desafio-primeiro-jogo', now()),
        (${masterId}, ${accountId}, '{}'::jsonb, 'active', 'manual', null, null,
          'all_kids_courses', null, now())
    `

    const rows = await new DrizzleRenewalReminderRepository(
      conn.db,
    ).listFixedAccessLifecycleEntitlements(new Date('2027-05-25T00:00:00Z'), 10)
    expect(rows).toHaveLength(0)
  })
})
