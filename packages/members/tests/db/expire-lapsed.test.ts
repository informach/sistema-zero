import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleEntitlementRepository } from '../../src/infrastructure/persistence/drizzle/entitlement.repository'
import { prepareTestDatabase } from './test-database'

/**
 * Prova o UPDATE que faz a COLUNA `status` parar de contradizer a régua de acesso.
 * Sem ela, uma matrícula vencida fica `'active'` para sempre (só cancelamento do
 * provedor ou ação manual mudavam) — e o painel dizia "Ativo" sobre acesso cortado,
 * exatamente o que escondeu o incidente de 08/2026. O fake reimplementa esse
 * predicado em JS; só aqui ele encosta no SQL de verdade.
 */

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — expireLapsed PULADO.')
}

describe.skipIf(!testDatabaseUrl)('expireLapsed no Postgres real', () => {
  let conn: DbConnection
  let repo: DrizzleEntitlementRepository
  /** Janela exclusiva deste arquivo (o banco de tests/db é compartilhado). */
  const marca = '2029-03-'

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    repo = new DrizzleEntitlementRepository(conn.db)
    await conn.sql`create schema if not exists members`
    await conn.sql.unsafe(`
      create table if not exists members.entitlements (
        id uuid primary key,
        user_id uuid not null
      )
    `)
    await conn.sql.unsafe(`
      alter table members.entitlements
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
        add column if not exists updated_at timestamp with time zone not null default now()
    `)
  })

  afterAll(async () => {
    await conn?.close()
  })

  beforeEach(async () => {
    await conn.sql`delete from members.entitlements where source_id like ${`${marca}%`}`
  })

  /** Semeia uma linha crua (o agregado não deixa montar estado "vencida ainda ativa"). */
  async function semear(opts: {
    status: string
    expiresAt: string | null
    rotulo: string
  }): Promise<string> {
    const id = randomUUID()
    await conn.sql`
      insert into members.entitlements (id, user_id, status, expires_at, source_id, idempotency_key)
      values (${id}, ${randomUUID()}, ${opts.status},
              ${opts.expiresAt}, ${`${marca}${opts.rotulo}`}, ${`${marca}${opts.rotulo}`})
    `
    return id
  }

  async function statusDe(id: string): Promise<{ status: string; version: number }> {
    const [row] = await conn.sql<{ status: string; version: number }[]>`
      select status, version from members.entitlements where id = ${id}
    `
    if (!row) throw new Error('linha esperada')
    return row
  }

  test('marca a vencida e NÃO toca na futura, na vitalícia nem na revogada', async () => {
    const vencida = await semear({
      status: 'active',
      expiresAt: '2029-03-01T00:00:00Z',
      rotulo: 'vencida',
    })
    const futura = await semear({
      status: 'active',
      expiresAt: '2099-01-01T00:00:00Z',
      rotulo: 'futura',
    })
    const vitalicia = await semear({ status: 'active', expiresAt: null, rotulo: 'vitalicia' })
    const revogada = await semear({
      status: 'revoked',
      expiresAt: '2029-03-01T00:00:00Z',
      rotulo: 'revogada',
    })

    const afetadas = await repo.expireLapsed(new Date('2029-03-10T00:00:00Z'), 100)

    expect(afetadas).toBe(1)
    expect((await statusDe(vencida)).status).toBe('expired')
    expect((await statusDe(futura)).status).toBe('active')
    expect((await statusDe(vitalicia)).status).toBe('active')
    // ⚠️ Revogada NUNCA vira vencida: cancelamento é mais forte que fim de prazo.
    expect((await statusDe(revogada)).status).toBe('revoked')
  })

  test('a versão sobe (concorrência otimista) e a 2ª volta é no-op', async () => {
    const vencida = await semear({
      status: 'active',
      expiresAt: '2029-03-01T00:00:00Z',
      rotulo: 'idem',
    })
    const antes = await statusDe(vencida)

    await repo.expireLapsed(new Date('2029-03-10T00:00:00Z'), 100)
    const depois = await statusDe(vencida)
    expect(depois.version).toBe(antes.version + 1)

    // Sem o no-op, cada ciclo de retenção bumparia a versão de toda vencida e
    // faria um grant concorrente perder a corrida à toa.
    const segunda = await repo.expireLapsed(new Date('2029-03-10T00:00:00Z'), 100)
    expect(segunda).toBe(0)
    expect((await statusDe(vencida)).version).toBe(depois.version)
  })

  test('respeita o teto do lote', async () => {
    await semear({ status: 'active', expiresAt: '2029-03-01T00:00:00Z', rotulo: 'lote-a' })
    await semear({ status: 'active', expiresAt: '2029-03-02T00:00:00Z', rotulo: 'lote-b' })
    await semear({ status: 'active', expiresAt: '2029-03-03T00:00:00Z', rotulo: 'lote-c' })

    expect(await repo.expireLapsed(new Date('2029-03-10T00:00:00Z'), 2)).toBe(2)
    expect(await repo.expireLapsed(new Date('2029-03-10T00:00:00Z'), 2)).toBe(1)
  })

  test('a validade EXATAMENTE agora conta como vencida (a carência já está embutida)', async () => {
    const limite = '2029-03-05T12:00:00Z'
    const id = await semear({ status: 'active', expiresAt: limite, rotulo: 'limite' })
    expect(await repo.expireLapsed(new Date(limite), 100)).toBe(1)
    expect((await statusDe(id)).status).toBe('expired')
  })
})
