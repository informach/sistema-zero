import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ACCESS_ENDED_WINDOW_MS } from '../../src/application/renewal-reminder/send-access-ended-messages.service'
import { expiresOnKey } from '../../src/domain/ports/renewal-reminder-repository.port'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRenewalReminderRepository } from '../../src/infrastructure/persistence/drizzle/renewal-reminder.repository'
import { prepareTestDatabase } from './test-database'

/**
 * As consultas do fim do acesso (presente de 7 dias e assinatura da Comunidade) no SQL de verdade.
 * Relógio em 2031: nenhum fixture de outro arquivo cai nas janelas daqui (o banco é compartilhado).
 */
const url = await prepareTestDatabase()
describe.skipIf(!url)('fim do acesso: consultas no Postgres real', () => {
  let conn: DbConnection
  let repo: DrizzleRenewalReminderRepository
  const NOW = new Date('2031-03-10T15:00:00Z') // 12:00 em São Paulo
  const HOUR = 3_600_000
  const WINDOW = ACCESS_ENDED_WINDOW_MS
  const users: string[] = Array.from({ length: 18 }, () => randomUUID())
  const mine = new Set(users)
  const u = (index: number) => users[index] as string

  beforeAll(async () => {
    conn = createDbConnection(url as string)
    repo = new DrizzleRenewalReminderRepository(conn.db)
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
    await conn.sql.unsafe(`create table if not exists members.entitlement_lifecycle_messages_sent (
      entitlement_id uuid not null, expires_on date not null, message_kind text not null,
      sent_at timestamp with time zone not null default now(),
      primary key (entitlement_id, expires_on, message_kind))`)
  })

  afterAll(async () => {
    await cleanup()
    await conn.sql.end()
  })

  async function cleanup() {
    await conn.sql`delete from members.entitlement_lifecycle_messages_sent where entitlement_id in (
      select id from members.entitlements where user_id in ${conn.sql(users)})`
    await conn.sql`delete from members.entitlements where user_id in ${conn.sql(users)}`
  }
  beforeEach(cleanup)

  async function insert(row: {
    userId: string
    sourceKind?: string
    sourceId?: string
    accessType?: string
    courseRef?: string | null
    status?: string
    subscriptionId?: string | null
    expiresAt?: Date | null
    updatedAt?: Date
    offerSlug?: string
  }) {
    const id = randomUUID()
    await conn.sql`insert into members.entitlements
      (id, user_id, product_id, source_kind, source_id, access_type, course_ref, status, subscription_id,
       expires_at, updated_at, snapshot)
      values (${id}, ${row.userId}, ${randomUUID()}, ${row.sourceKind ?? 'payment'}, ${row.sourceId ?? 'ae-test'},
        ${row.accessType ?? 'course'}, ${row.courseRef ?? null}, ${row.status ?? 'active'},
        ${row.subscriptionId ?? null}, ${row.expiresAt?.toISOString() ?? null},
        ${(row.updatedAt ?? NOW).toISOString()},
        ${JSON.stringify(row.offerSlug ? { offerSlug: row.offerSlug } : {})}::jsonb)`
    return id
  }
  const giftRow = (userId: string, source: string, expiresAt: Date | null, courseRef: string) =>
    insert({
      userId,
      sourceKind: 'manual',
      sourceId: `scholarship:${source}`,
      courseRef,
      accessType: courseRef === 'cade-todo-mundo' ? 'course' : 'community',
      expiresAt,
      status: expiresAt && expiresAt <= NOW ? 'expired' : 'active',
    })

  test('presente: 2 dias antes (São Paulo) e no dia, por resgate, com janela e acesso mais forte', async () => {
    const twoDays = new Date('2031-03-12T14:00:00Z')
    const course = await giftRow(u(0), 'a', twoDays, 'cade-todo-mundo')
    const mural = await giftRow(u(0), 'a', twoDays, 'mural-dos-criadores')
    await giftRow(u(0), 'a', null, 'mural-visitante') // visita permanente do mesmo resgate
    await giftRow(u(1), 'b', new Date('2031-03-13T14:00:00Z'), 'cade-todo-mundo') // 3 dias
    const today = await giftRow(u(2), 'c', new Date(NOW.getTime() - 5 * HOUR), 'cade-todo-mundo')
    // Ciclos perdidos (deploys, serviço fora): ainda dentro das 72 h, o aviso sai atrasado.
    const missed = await giftRow(u(6), 'm', new Date(NOW.getTime() - 50 * HOUR), 'cade-todo-mundo')
    await giftRow(u(3), 'd', new Date(NOW.getTime() - 80 * HOUR), 'cade-todo-mundo') // antigo
    // "Vai terminar" só com o presente ativo: vencido/revogado antes da hora não recebe.
    await insert({
      userId: u(14),
      sourceKind: 'manual',
      sourceId: 'scholarship:x',
      courseRef: 'cade-todo-mundo',
      expiresAt: twoDays,
      status: 'expired',
    })
    await insert({
      userId: u(15),
      sourceKind: 'manual',
      sourceId: 'scholarship:y',
      courseRef: 'cade-todo-mundo',
      expiresAt: twoDays,
      status: 'revoked',
    })
    await giftRow(u(4), 'e', twoDays, 'cade-todo-mundo')
    await insert({ userId: u(4), accessType: 'all_kids_courses', subscriptionId: 'sub-e' })
    await insert({ userId: u(5), sourceKind: 'manual', sourceId: 'admin:x', expiresAt: twoDays })

    const listed = (await repo.listGiftLifecycleEntitlements(NOW, WINDOW, 50)).filter((row) =>
      mine.has(row.userId),
    )
    expect(listed.map((row) => [row.id, row.messageKind]).sort()).toEqual(
      [
        [course, 'gift_expiry_2d'],
        [mural, 'gift_expiry_2d'],
        [today, 'gift_expired'],
        [missed, 'gift_expired'],
      ].sort(),
    )
    expect(listed.find((row) => row.id === course)?.sourceId).toBe('scholarship:a')

    // Dedupe por matrícula + vencimento + tipo; no dia do vencimento, o aviso seguinte aparece.
    for (const row of listed)
      await repo.markAccessEndedMessageSent(
        row.id,
        expiresOnKey(row.expiresAt),
        row.messageKind,
        NOW,
      )
    expect(
      (await repo.listGiftLifecycleEntitlements(NOW, WINDOW, 50)).filter((row) =>
        mine.has(row.userId),
      ),
    ).toEqual([])
    const dayOf = new Date('2031-03-12T16:00:00Z')
    await conn.sql`update members.entitlements set status = 'expired' where id in (${course}, ${mural})`
    const later = (await repo.listGiftLifecycleEntitlements(dayOf, WINDOW, 50)).filter(
      (row) => row.userId === u(0),
    )
    expect(later.map((row) => row.messageKind)).toEqual(['gift_expired', 'gift_expired'])
  })

  test('presente: o limite conta resgates, sem separar curso e Mural', async () => {
    const twoDays = new Date('2031-03-12T14:00:00Z')
    await giftRow(u(0), 'a', twoDays, 'cade-todo-mundo')
    await giftRow(u(0), 'a', twoDays, 'mural-dos-criadores')
    await giftRow(u(1), 'b', new Date('2031-03-12T15:00:00Z'), 'cade-todo-mundo')
    const limited = (await repo.listGiftLifecycleEntitlements(NOW, WINDOW, 1)).filter((row) =>
      mine.has(row.userId),
    )
    expect(limited.map((row) => row.userId)).toEqual([u(0), u(0)])
  })

  test('assinatura: só Comunidade vencida agora, por audiência, sem outro acesso ativo', async () => {
    const recent = new Date(NOW.getTime() - 2 * HOUR)
    const kidsSub = (userId: string, sub: string, extra: Partial<Parameters<typeof insert>[0]>) =>
      insert({
        userId,
        subscriptionId: sub,
        sourceKind: 'subscription',
        offerSlug: 'comunidade-dos-criadores-mensal',
        status: 'expired',
        expiresAt: new Date(NOW.getTime() - 3 * HOUR),
        updatedAt: recent,
        ...extra,
      })
    const kids = [
      await kidsSub(u(7), 's7', { accessType: 'all_kids_courses' }),
      await kidsSub(u(7), 's7', { accessType: 'community', courseRef: 'estudio-completo' }),
      await kidsSub(u(7), 's7', { accessType: 'community', courseRef: 'pinta' }),
    ]
    const adult = [
      await kidsSub(u(8), 's8', { offerSlug: 'comunidade-dos-criadores-adulto-mensal' }),
      await kidsSub(u(8), 's8', {
        offerSlug: 'comunidade-dos-criadores-adulto-anual',
        accessType: 'all_courses',
      }),
    ]
    await kidsSub(u(9), 's9', { updatedAt: new Date(NOW.getTime() - 80 * HOUR) }) // histórico
    // Venceu há 50 h (ciclos perdidos): ainda dentro da janela de 72 h.
    const missed = await kidsSub(u(16), 's16', {
      expiresAt: new Date(NOW.getTime() - 52 * HOUR),
      updatedAt: new Date(NOW.getTime() - 50 * HOUR),
    })
    await kidsSub(u(10), 's10', {})
    await kidsSub(u(10), 's10b', { status: 'active', expiresAt: new Date('2031-04-10T00:00:00Z') })
    await kidsSub(u(11), 's11', { offerSlug: 'clube-mensal' }) // não é Comunidade
    await kidsSub(u(12), 's12', { status: 'revoked' }) // cancelado
    const crossAudience = await kidsSub(u(13), 's13', {
      offerSlug: 'comunidade-dos-criadores-adulto-mensal',
    })
    await kidsSub(u(13), 's13k', { status: 'active', expiresAt: null }) // Kids ativa não segura adulto

    const listed = (await repo.listEndedCommunitySubscriptions(NOW, WINDOW, 50)).filter((row) =>
      mine.has(row.userId),
    )
    const byId = new Map(listed.map((row) => [row.id, row]))
    expect(new Set(byId.keys())).toEqual(new Set([...kids, ...adult, crossAudience, missed]))
    expect(kids.every((id) => byId.get(id)?.audience === 'kids')).toBe(true)
    expect(adult.every((id) => byId.get(id)?.audience === 'adult')).toBe(true)
    expect(byId.get(crossAudience)?.audience).toBe('adult')
    expect(byId.get(kids[0] as string)?.subscriptionId).toBe('s7')

    // Limite por grupo: o combo inteiro sai junto.
    const one = await repo.listEndedCommunitySubscriptions(NOW, WINDOW, 1)
    expect(new Set(one.map((row) => row.subscriptionId)).size).toBe(1)

    for (const row of listed)
      await repo.markAccessEndedMessageSent(
        row.id,
        expiresOnKey(row.endedAt),
        'subscription_ended',
        NOW,
      )
    expect(
      (await repo.listEndedCommunitySubscriptions(NOW, WINDOW, 50)).filter((row) =>
        mine.has(row.userId),
      ),
    ).toEqual([])
  })
})
