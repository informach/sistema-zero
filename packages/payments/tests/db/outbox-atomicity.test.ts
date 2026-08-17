import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { PaymentAggregate } from '../../src/domain/payment/payment.aggregate'
import { DomainEvent } from '../../src/domain/shared/domain-event'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import { PaymentMethod } from '../../src/domain/value-objects/payment-method'
import { ConcurrencyConflictError } from '../../src/infrastructure/persistence/drizzle/concurrency.error'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleIdempotencyStore } from '../../src/infrastructure/persistence/drizzle/idempotency.store'
import { DrizzleMetricsRepository } from '../../src/infrastructure/persistence/drizzle/metrics.repository'
import { DrizzlePaymentRepository } from '../../src/infrastructure/persistence/drizzle/payment.repository'
import { DrizzleSubscriptionRepository } from '../../src/infrastructure/persistence/drizzle/subscription.repository'
import { prepareTestDatabase } from './test-database'

/**
 * Testes de ATOMICIDADE contra um Postgres REAL — as únicas invariantes que os
 * fakes em memória não conseguem provar (não há transação para dar rollback):
 *
 *  1. `save` grava agregado + eventos do outbox na MESMA transação (CLAUDE.md
 *     item 3): uma falha entre as duas escritas reverte AMBAS.
 *  2. O perdedor da concorrência otimista não deixa evento órfão no outbox real.
 *  3. A unique parcial `payments_txid_uq` vale no banco (migration 0002).
 *  4. A reciclagem de reserva de idempotência expirada é atômica sob concorrência.
 *
 * Usa o Postgres de dev (Docker, porta 5433) num banco DEDICADO
 * `sistemazero_test` (criado aqui; nunca toca os dados de dev do `sistemazero`).
 * Sem Postgres alcançável, a suíte é PULADA (skip) — `bun test` continua verde
 * em ambientes sem Docker/CI sem infra. Override: `TEST_DATABASE_URL`.
 */
const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn(
    '[tests/db] Postgres indisponível (porta 5433?) — testes de atomicidade PULADOS. ' +
      'Suba o Docker do banco ou defina TEST_DATABASE_URL para rodá-los.',
  )
}

/**
 * Evento envenenado: `event_name = null` viola a NOT NULL de `payments.outbox`
 * DENTRO da transação do `save`, DEPOIS da escrita do pagamento — exatamente a
 * falha-no-meio que prova (ou refuta) o rollback conjunto.
 */
class PoisonEvent extends DomainEvent {
  readonly eventName = null as unknown as string
  toPayload(): Record<string, unknown> {
    return { poison: true }
  }
}

/** `addEvent` é protected (restrição só de compile-time) — o teste injeta a falha por cast. */
function addPoisonEvent(payment: PaymentAggregate): void {
  ;(payment as unknown as { addEvent(event: DomainEvent): void }).addEvent(
    new PoisonEvent(payment.id),
  )
}

function newPixPayment(): PaymentAggregate {
  return PaymentAggregate.create({
    consumerId: 'sys-test',
    amount: Money.fromCents(1000),
    method: PaymentMethod.pix(),
    idempotencyKey: IdempotencyKey.create(`idem-${crypto.randomUUID()}`),
  })
}

/**
 * ⚠️ NÃO use `expect(...).rejects` com promises do drizzle/postgres-js aqui:
 * o postgres-js usa THENABLES preguiçosos e o `.rejects` do bun:test interage
 * mal com eles quando a falha vem de uma query dentro de transação — a rejeição
 * só era entregue quando o pool morria no teardown (timeout de 5s no teste +
 * "(unnamed)" fantasma + CONNECTION_ENDED). try/catch é determinístico.
 */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
    return null
  } catch (error) {
    return error
  }
}

describe.skipIf(!testDatabaseUrl)('Atomicidade no Postgres real (outbox/version/unique)', () => {
  let conn: DbConnection
  let repo: DrizzlePaymentRepository

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string, { max: 5 })
    // Mesmo journal do drizzle-kit (drizzle.config.ts): tabela própria do package
    // no schema `drizzle`. A migration 0000 cria o schema `payments` do zero.
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
      migrationsTable: 'payments_migrations',
      migrationsSchema: 'drizzle',
    })
    repo = new DrizzlePaymentRepository(conn.db)
  })

  afterAll(async () => {
    await conn?.close()
  })

  beforeEach(async () => {
    await conn.sql`
      truncate table payments.subscriptions, payments.payments, payments.outbox,
                     payments.idempotency_keys, payments.webhook_deliveries
      restart identity cascade
    `
  })

  test('save grava pagamento + evento do outbox juntos (commit conjunto)', async () => {
    const payment = newPixPayment()
    await repo.save(payment)

    const [row] = await conn.sql`
      select status, version from payments.payments where id = ${payment.id}`
    expect(row?.status).toBe('PENDING')
    const events = await conn.sql`
      select event_name from payments.outbox where aggregate_id = ${payment.id}`
    expect(events.map((e) => e.event_name)).toEqual(['payment.created'])
  })

  test('falha no meio da transação (INSERT novo) → NADA fica gravado (rollback conjunto)', async () => {
    const payment = newPixPayment()
    addPoisonEvent(payment) // o INSERT do outbox vai violar NOT NULL após o INSERT do pagamento

    expect(await rejectionOf(repo.save(payment))).toBeInstanceOf(Error)

    const payments = await conn.sql`select 1 from payments.payments where id = ${payment.id}`
    const events = await conn.sql`select 1 from payments.outbox where aggregate_id = ${payment.id}`
    expect(payments.length).toBe(0) // o pagamento NÃO sobrou sem evento
    expect(events.length).toBe(0)
  })

  test('falha após o UPDATE (markPaid) → status NÃO muda e nenhum evento vaza', async () => {
    const payment = newPixPayment()
    await repo.save(payment) // seed limpo (PENDING, version 0)

    const loaded = await repo.findById(payment.id)
    expect(loaded).not.toBeNull()
    loaded?.markPaid()
    if (loaded) addPoisonEvent(loaded)

    expect(await rejectionOf(repo.save(loaded as PaymentAggregate))).toBeInstanceOf(Error)

    // A invariante central: o UPDATE p/ PAID foi REVERTIDO junto com o outbox —
    // não existe "pagamento pago sem evento" nem "evento sem pagamento pago".
    const [row] = await conn.sql`
      select status, version from payments.payments where id = ${payment.id}`
    expect(row?.status).toBe('PENDING')
    expect(row?.version).toBe(0)
    const paid = await conn.sql`
      select 1 from payments.outbox
      where aggregate_id = ${payment.id} and event_name = 'payment.paid'`
    expect(paid.length).toBe(0)
  })

  test('corrida de version no banco real: perdedor não grava evento duplicado', async () => {
    const payment = newPixPayment()
    await repo.save(payment)

    const a = await repo.findById(payment.id)
    const b = await repo.findById(payment.id)
    a?.markPaid()
    await repo.save(a as PaymentAggregate) // vence (version 0 → 1)

    b?.markPaid()
    expect(await rejectionOf(repo.save(b as PaymentAggregate))).toBeInstanceOf(
      ConcurrencyConflictError,
    )

    const paid = await conn.sql`
      select 1 from payments.outbox
      where aggregate_id = ${payment.id} and event_name = 'payment.paid'`
    expect(paid.length).toBe(1) // exatamente UM payment.paid
    const [row] = await conn.sql`
      select status, version from payments.payments where id = ${payment.id}`
    expect(row?.status).toBe('PAID')
    expect(row?.version).toBe(1)
  })

  test('payments_txid_uq: 2º pagamento com o MESMO txid falha (23505); txid NULL não colide', async () => {
    const txid = `txid${crypto.randomUUID().replaceAll('-', '')}`.slice(0, 32)
    const p1 = newPixPayment()
    p1.registerProviderCharge({ providerPaymentId: txid, txid })
    await repo.save(p1)

    const p2 = newPixPayment()
    p2.registerProviderCharge({ providerPaymentId: 'outro', txid })
    // O drizzle embrulha o erro do driver em DrizzleQueryError → o código PG
    // (23505 unique_violation) fica em `cause`.
    const error = await rejectionOf(repo.save(p2))
    expect(error).toMatchObject({ cause: { code: '23505' } })

    // Controle do índice PARCIAL (WHERE txid IS NOT NULL): vários NULL convivem.
    await repo.save(newPixPayment())
    await repo.save(newPixPayment())
  })

  test('idempotência: reciclagem CONCORRENTE de reserva expirada → exatamente UMA adquire', async () => {
    const store = new DrizzleIdempotencyStore(conn.db)
    const input = {
      consumerId: 'sys-test',
      key: 'idem-recycle-1',
      requestHash: 'hash-a',
      inFlightTtlSeconds: 60,
    }
    const first = await store.reserve(input)
    expect(first.kind).toBe('acquired')

    // A request "morreu": expira a reserva na marra.
    await conn.sql`
      update payments.idempotency_keys set expires_at = now() - interval '1 minute'
      where consumer_id = ${input.consumerId} and key = ${input.key}`

    // Duas réplicas reciclam ao mesmo tempo: o DELETE condicional + INSERT ON
    // CONFLICT garantem UM único vencedor (sem duas reservas vivas).
    const results = await Promise.all([store.reserve(input), store.reserve(input)])
    const acquired = results.filter((r) => r.kind === 'acquired')
    expect(acquired.length).toBe(1)

    const rows = await conn.sql`
      select state from payments.idempotency_keys
      where consumer_id = ${input.consumerId} and key = ${input.key}`
    expect(rows.length).toBe(1)
    expect(rows[0]?.state).toBe('IN_FLIGHT')
  })

  test('fim de mês da Efí não é contado como atraso antes do último dia', async () => {
    await conn.sql`
      insert into payments.subscriptions (
        id, consumer_id, status, provider, provider_subscription_id,
        provider_plan_id, interval_months, amount_in_cents, currency, card,
        idempotency_key, cycles_completed, metadata, last_charge_at,
        created_at, updated_at
      ) values (
        gen_random_uuid(), 'sys-test', 'ACTIVE', 'EFI', 'sub-eom',
        'plan-1', 1, 9700, 'BRL', '{"brand":"visa","last4":"4242"}'::jsonb,
        'idem-eom', 2, '{}'::jsonb, '2026-02-28T15:00:00Z',
        '2026-01-31T15:00:00Z', '2026-02-28T15:00:00Z'
      )
    `
    // Move o `now()` real para o ponto médio entre o cálculo antigo (28/03)
    // e o calendário correto da Efí (31/03), sem relógio fake no código de produção.
    const [clock] = await conn.sql<{ grace_days: number }[]>`
      select (
        extract(epoch from (now() - timestamptz '2026-03-30T03:00:00Z')) / 86400
      )::float8 as grace_days
    `
    if (!clock) throw new Error('relógio do Postgres esperado')

    const metrics = await new DrizzleMetricsRepository(conn.db, clock.grace_days).getMetrics()

    expect(metrics.subscriptionsOverdue).toBe(0)
  })

  test('claim de assinatura rotaciona quando o total excede o lote', async () => {
    for (let i = 1; i <= 4; i += 1) {
      await conn.sql`
        insert into payments.subscriptions (
          id, consumer_id, status, provider, provider_subscription_id,
          provider_plan_id, interval_months, amount_in_cents, currency, card,
          idempotency_key, cycles_completed, metadata, last_charge_at,
          created_at, updated_at
        ) values (
          gen_random_uuid(), 'sys-test', 'ACTIVE', 'EFI', ${`sub-rotation-${i}`},
          'plan-1', 1, 9700, 'BRL', '{"brand":"visa","last4":"4242"}'::jsonb,
          ${`idem-rotation-${i}`}, 1, '{}'::jsonb, '2026-01-01T12:00:00Z',
          '2026-01-01T12:00:00Z', '2026-01-01T12:00:00Z'
        )
      `
    }
    const subscriptions = new DrizzleSubscriptionRepository(conn.db)

    const first = await subscriptions.claimActiveForReconcile(2)
    const second = await subscriptions.claimActiveForReconcile(2)
    const visited = new Set([...first, ...second].map((subscription) => subscription.id))

    expect(first).toHaveLength(2)
    expect(second).toHaveLength(2)
    expect(visited.size).toBe(4)
    const [marked] = await conn.sql<{ count: number }[]>`
      select count(*)::int as count
        from payments.subscriptions
       where last_reconciled_at is not null
    `
    expect(marked?.count).toBe(4)
  })
})
