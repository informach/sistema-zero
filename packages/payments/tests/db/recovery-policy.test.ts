import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRecoveryPolicyRepository } from '../../src/infrastructure/persistence/drizzle/recovery-policy.repository'
import {
  subscriptionRecoveryPolicy,
  subscriptionRecoveryPolicyAudit,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { prepareTestDatabase } from './test-database'

const databaseUrl = await prepareTestDatabase('sistemazero_recovery_policy_test')
const now = new Date('2026-10-24T12:00:00Z')
async function failureOf(task: Promise<unknown>): Promise<unknown> {
  try {
    await task
    return null
  } catch (error) {
    return error
  }
}

describe.skipIf(!databaseUrl)('Política de regularização — configuração e auditoria reais', () => {
  let connection: DbConnection
  let repository: DrizzleRecoveryPolicyRepository
  const update = (expectedVersion: number, enabled = true) => ({
    expectedVersion,
    windowDays: 7,
    reminderDays: [3, 6],
    enabled,
    actorId: 'operator-qa',
    now,
  })
  beforeAll(async () => {
    connection = createDbConnection(databaseUrl!, { max: 4 })
    await migrate(connection.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsSchema: 'drizzle',
      migrationsTable: 'payments_migrations',
    })
    repository = new DrizzleRecoveryPolicyRepository(connection.db)
  })
  async function cleanup() {
    await connection.db.delete(subscriptionRecoveryPolicyAudit)
    await connection.db.delete(subscriptionRecoveryPolicy)
  }
  beforeEach(cleanup)
  afterAll(async () => {
    await cleanup()
    await connection.close()
  })

  test('seed não ativa automação nem sobrescreve configuração existente', async () => {
    expect(await repository.get()).toBeNull()
    const initial = await repository.initialize(now)
    expect(initial.enabled).toBe(false)
    expect(initial.policy).toEqual({ version: 1, windowDays: 7, reminderDays: [3, 6] })
    const changed = await repository.update(update(1))
    expect(changed.enabled).toBe(true)
    expect(changed.activatedAt).toEqual(now)
    expect((await repository.initialize(new Date(now.getTime() + 1000))).policy.version).toBe(2)
    const rows = await connection.db.select().from(subscriptionRecoveryPolicyAudit)
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.actorId).sort()).toEqual(['operator-qa', 'system:initial-policy'])
  })

  test('dois operadores com a mesma versão não sobrescrevem a decisão um do outro', async () => {
    await repository.initialize(now)
    const outcomes = await Promise.allSettled([
      repository.update(update(1)),
      new DrizzleRecoveryPolicyRepository(connection.db).update({
        ...update(1),
        actorId: 'second-operator-qa',
        windowDays: 10,
      }),
    ])
    expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter((item) => item.status === 'rejected')).toHaveLength(1)
    expect((await repository.get())?.policy.version).toBe(2)
    expect(await connection.db.select().from(subscriptionRecoveryPolicyAudit)).toHaveLength(2)
  })

  test('falha de auditoria reverte a configuração na mesma transação', async () => {
    await repository.initialize(now)
    await connection.db.insert(subscriptionRecoveryPolicyAudit).values({
      version: 2,
      actorId: 'injected-conflict-qa',
      snapshot: { qa: true },
      createdAt: now,
    })
    expect(await failureOf(repository.update(update(1)))).toBeInstanceOf(Error)
    expect((await repository.get())?.policy.version).toBe(1)
    expect((await repository.get())?.enabled).toBe(false)
  })

  test('alteração incoerente ou sem autor é recusada sem versão nova', async () => {
    await repository.initialize(now)
    expect(
      await failureOf(repository.update({ ...update(1), reminderDays: [6, 3] })),
    ).toBeInstanceOf(Error)
    expect(await failureOf(repository.update({ ...update(1), actorId: ' ' }))).toBeInstanceOf(Error)
    expect((await repository.get())?.policy.version).toBe(1)
    expect(await connection.db.select().from(subscriptionRecoveryPolicyAudit)).toHaveLength(1)
  })
})
