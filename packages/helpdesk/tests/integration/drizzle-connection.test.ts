import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { DrizzleConnectionRepository } from '../../src/infrastructure/persistence/drizzle/connection.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'

const databaseUrl = process.env.HELPDESK_TEST_DATABASE_URL
const integration = databaseUrl ? describe : describe.skip

if (databaseUrl && !/helpdesk_test/i.test(databaseUrl)) {
  throw new Error('HELPDESK_TEST_DATABASE_URL deve apontar para um banco descartável helpdesk_test')
}

function makeConnection(overrides: { id?: string; externalId?: string } = {}) {
  const now = new Date('2026-09-02T12:00:00.000Z')
  return {
    id: overrides.id ?? randomUUID(),
    version: 0,
    emailAddress: 'contato@sistemazero.com.br',
    externalId: overrides.externalId ?? `google-${randomUUID()}`,
    accessTokenEnc: 'sealed(access)',
    refreshTokenEnc: 'sealed(refresh)',
    tokenExpiresAt: new Date(now.getTime() + 3_600_000),
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],
    status: 'connected' as const,
    lastHistoryId: null,
    lastSyncAt: null,
    syncNextAt: now,
    syncAttempts: 0,
    lastSyncError: null,
    connectedBy: '11111111-1111-4111-8111-111111111111',
    connectedByName: 'Helena Oliveira',
    metadata: {},
    createdAt: now,
    updatedAt: now,
  }
}

integration('DrizzleConnectionRepository', () => {
  let connection: DbConnection
  let repository: DrizzleConnectionRepository

  beforeAll(() => {
    if (!databaseUrl) return
    connection = createDbConnection(databaseUrl)
    repository = new DrizzleConnectionRepository(connection)
  })

  beforeEach(async () => {
    await connection.sql`truncate table helpdesk.gmail_connections`
  })

  afterAll(async () => {
    await connection.close()
  })

  it('ativa uma nova caixa sem deixar tokens válidos na conexão anterior', async () => {
    const first = makeConnection({ externalId: 'google-first' })
    const second = makeConnection({ externalId: 'google-second' })
    await repository.activate(first)
    await repository.activate(second)

    const firstStored = await repository.byId(first.id)
    const secondStored = await repository.byId(second.id)
    expect(firstStored).toMatchObject({
      status: 'disabled',
      accessTokenEnc: null,
      refreshTokenEnc: null,
      tokenExpiresAt: null,
    })
    expect(secondStored).toMatchObject({ status: 'connected' })
    expect(await repository.current()).toMatchObject({ id: second.id })
  })
})
