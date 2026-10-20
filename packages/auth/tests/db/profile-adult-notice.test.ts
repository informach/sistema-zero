import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type { Logger } from '@sistemazero/core/logging'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import {
  ADULT_AREA_URL,
  NotifyAdultProfilesService,
} from '../../src/application/maintenance/notify-adult-profiles.service'
import { adultNoticeBirthDateRange } from '../../src/domain/profile/adult-notice'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { Email } from '../../src/domain/value-objects/email'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleProfileAdultNoticeRepository } from '../../src/infrastructure/persistence/drizzle/profile-adult-notice.repository'
import { withSessionAdvisoryLock } from '../../src/infrastructure/persistence/drizzle/session-advisory-lock'
import { DrizzleUserRepository } from '../../src/infrastructure/persistence/drizzle/user.repository'
import { FakeMessagingClient } from '../fakes/in-memory'

/**
 * Aviso de 18 anos contra Postgres REAL: consulta dos candidatos (ativo, com nascimento na
 * faixa, conta ativa, sem aviso), perfil-padrão legado (`id = id da conta`), dedupe para
 * sempre, payload do e-mail e o advisory lock de sessão. Mesmo banco/skip do
 * `repositories.test.ts` (`TEST_DATABASE_URL` ou `sistemazero_test` na :5433), e só LOCAL.
 */
const TEST_DB_NAME = 'sistemazero_test'
const FALLBACK_URL = 'postgres://postgres:postgres@localhost:5433/sistemazero'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

async function prepareTestDatabase(): Promise<string | null> {
  const override = process.env.TEST_DATABASE_URL
  const baseUrl = override ?? process.env.DATABASE_URL ?? FALLBACK_URL
  // Nunca escreve fora da máquina local (staging/produção).
  if (!LOCAL_HOSTS.has(new URL(baseUrl).hostname)) return null
  const admin = postgres(baseUrl, { max: 1, connect_timeout: 2, onnotice: () => {} })
  try {
    await admin`select 1`
    if (override) return override
    try {
      await admin.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`)
    } catch (error) {
      if ((error as { code?: string }).code !== '42P04') throw error
    }
    const url = new URL(baseUrl)
    url.pathname = `/${TEST_DB_NAME}`
    return url.toString()
  } catch {
    return null
  } finally {
    await admin.end({ timeout: 1 }).catch(() => {})
  }
}

const testDatabaseUrl = await prepareTestDatabase()
const silentLogger: Logger = { debug() {}, info() {}, warn() {}, error() {} }
/** 12:00 em São Paulo do dia pedido. */
const noonSaoPaulo = (day: string) => new Date(`${day}T15:00:00Z`)

describe.skipIf(!testDatabaseUrl)('aviso de 18 anos no Postgres real', () => {
  let conn: DbConnection
  let users: DrizzleUserRepository
  let notices: DrizzleProfileAdultNoticeRepository

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string, { max: 5 })
    await migrate(conn.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '..',
        '..',
        'src',
        'infrastructure',
        'persistence',
        'drizzle',
        'migrations',
      ),
      migrationsTable: 'auth_migrations',
      migrationsSchema: 'drizzle',
    })
    users = new DrizzleUserRepository(conn.db)
    notices = new DrizzleProfileAdultNoticeRepository(conn.db)
  }, 30_000)

  afterAll(async () => {
    await conn?.close()
  })

  beforeEach(async () => {
    await conn.sql`truncate table auth.users, auth.profiles, auth.profile_adult_notices cascade`
  })

  async function guardian(
    firstName: string,
    status: 'active' | 'blocked' = 'active',
    id: string = randomUUID(),
  ): Promise<{ id: string; email: string }> {
    const email = `resp-${id}@example.com`
    const user = UserAggregate.register({
      id,
      email: Email.create(email),
      passwordHash: 'hash:x',
      firstName,
      lastName: 'Silva',
    })
    await users.create(user)
    if (status !== 'active')
      await conn.sql`update auth.users set status = ${status} where id = ${id}`
    return { id, email }
  }

  async function profile(input: {
    accountUserId: string
    name: string
    birthDate: string | null
    status?: 'active' | 'archived'
    id?: string
  }): Promise<string> {
    const id = input.id ?? randomUUID()
    await conn.sql`
      insert into auth.profiles
        (id, account_user_id, name, birth_date, status, admission_state, sort_order, created_at, updated_at)
      values
        (${id}, ${input.accountUserId}, ${input.name}, ${input.birthDate},
         ${input.status ?? 'active'}, 'ready', 0, now(), now())`
    return id
  }

  test('candidatos: só ativo, com nascimento na faixa, conta ativa e sem aviso', async () => {
    const mae = await guardian('Ana')
    const bloqueada = await guardian('Bia', 'blocked')
    const due = await profile({ accountUserId: mae.id, name: 'Lia', birthDate: '2008-10-18' })
    await profile({
      accountUserId: mae.id,
      name: 'Arquivada',
      birthDate: '2008-10-18',
      status: 'archived',
    })
    await profile({ accountUserId: mae.id, name: 'Sem data', birthDate: null })
    await profile({ accountUserId: mae.id, name: 'Antiga', birthDate: '2008-10-01' })
    await profile({ accountUserId: mae.id, name: 'Amanhã', birthDate: '2008-10-21' })
    await profile({ accountUserId: bloqueada.id, name: 'Conta bloqueada', birthDate: '2008-10-18' })

    const range = adultNoticeBirthDateRange('2026-10-20')
    const rows = await notices.listCandidates({
      birthDateFrom: range.from,
      birthDateTo: range.to,
      limit: 50,
    })
    expect(rows).toEqual([
      {
        profileId: due,
        profileName: 'Lia',
        birthDate: '2008-10-18',
        accountUserId: mae.id,
        guardianEmail: mae.email,
        guardianFirstName: 'Ana',
      },
    ])
  })

  test('perfil-padrão legado (id = id da conta) recebe no e-mail da própria conta', async () => {
    const accountId = randomUUID()
    const conta = await guardian('Carla', 'active', accountId)
    await profile({
      id: accountId,
      accountUserId: accountId,
      name: 'Theo',
      birthDate: '2008-10-20',
    })
    const messaging = new FakeMessagingClient()
    await new NotifyAdultProfilesService(
      notices,
      messaging,
      () => noonSaoPaulo('2026-10-20'),
      silentLogger,
    ).runCycle()
    expect(messaging.sent).toEqual([
      {
        templateKey: 'profile-turned-18',
        recipient: { name: 'Carla', email: conta.email },
        variables: { nome: 'Carla', nome_perfil: 'Theo', link: ADULT_AREA_URL },
        idempotencyKey: `profile-turned-18-${accountId}`,
      },
    ])
  })

  test('ciclo completo: um e-mail por perfil, registro durável e nunca de novo', async () => {
    const mae = await guardian('Ana')
    const lia = await profile({ accountUserId: mae.id, name: 'Lia', birthDate: '2008-02-29' })
    const messaging = new FakeMessagingClient()
    const day = { value: '2026-02-28' }
    const service = new NotifyAdultProfilesService(
      notices,
      messaging,
      () => noonSaoPaulo(day.value),
      silentLogger,
    )

    await service.runCycle()
    expect(messaging.sent).toHaveLength(0) // 29/02 só completa 18 em 01/03

    day.value = '2026-03-02' // job atrasado um dia
    expect(await service.runCycle()).toEqual({ sent: 1, failed: 0 })
    expect(messaging.sent[0]?.variables).toEqual({
      nome: 'Ana',
      nome_perfil: 'Lia',
      link: ADULT_AREA_URL,
    })
    const [row] = await conn.sql`
      select account_user_id, turned_adult_on::text as turned_adult_on
        from auth.profile_adult_notices where profile_id = ${lia}`
    expect(row).toEqual({ account_user_id: mae.id, turned_adult_on: '2026-03-01' })

    day.value = '2026-03-03'
    expect(await service.runCycle()).toEqual({ sent: 0, failed: 0 })
    expect(messaging.sent).toHaveLength(1)

    // O perfil segue ativo e intocado.
    const [stillActive] = await conn.sql`select status from auth.profiles where id = ${lia}`
    expect(stillActive?.status).toBe('active')
  })

  test('falha de envio não registra; markNotified é idempotente; sai com o perfil', async () => {
    const mae = await guardian('Ana')
    const lia = await profile({ accountUserId: mae.id, name: 'Lia', birthDate: '2008-10-20' })
    const messaging = new FakeMessagingClient()
    const service = new NotifyAdultProfilesService(
      notices,
      messaging,
      () => noonSaoPaulo('2026-10-20'),
      silentLogger,
    )
    messaging.failNext = true
    expect(await service.runCycle()).toEqual({ sent: 0, failed: 1 })
    const [none] = await conn.sql`select count(*)::int as n from auth.profile_adult_notices`
    expect(none?.n).toBe(0)

    expect(await service.runCycle()).toEqual({ sent: 1, failed: 0 })
    await notices.markNotified({
      profileId: lia,
      accountUserId: mae.id,
      turnedAdultOn: '2026-10-20',
      notifiedAt: new Date(),
    })
    const [one] = await conn.sql`select count(*)::int as n from auth.profile_adult_notices`
    expect(one?.n).toBe(1)

    await conn.sql`delete from auth.profiles where id = ${lia}`
    const [gone] = await conn.sql`select count(*)::int as n from auth.profile_adult_notices`
    expect(gone?.n).toBe(0)
  })

  test('advisory lock de sessão: só uma réplica por vez', async () => {
    const key = '1635430518'
    const inner: boolean[] = []
    const outer = await withSessionAdvisoryLock(conn.sql, key, async () => {
      inner.push(await withSessionAdvisoryLock(conn.sql, key, async () => {}))
    })
    expect(outer).toBe(true)
    expect(inner).toEqual([false])
    // Liberado ao fim: o próximo ciclo pega.
    expect(await withSessionAdvisoryLock(conn.sql, key, async () => {})).toBe(true)
  })
})
