import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleStudioAiAccountRepository } from '../../src/infrastructure/persistence/drizzle/studio-ai-account.repository'
import { openStudioReviewDatabase } from './studio-review-database'

// This test must target an explicitly selected, disposable database. No fallback to DATABASE_URL.
const url = process.env.STUDIO_REVIEW_DATABASE_URL
describe.skipIf(!url)('OpenRouter account — real Postgres concurrency', () => {
  let connection: DbConnection
  let repo: DrizzleStudioAiAccountRepository
  const accounts: string[] = []
  beforeAll(async () => {
    connection = await openStudioReviewDatabase(url!)
    repo = new DrizzleStudioAiAccountRepository(connection.db)
  })
  afterAll(async () => {
    if (!connection) return
    for (const accountId of accounts) {
      await connection.sql`delete from members.studio_ai_accounts where account_id = ${accountId}`
      await connection.sql`delete from members.account_deletion_fences where account_id = ${accountId}`
    }
    await connection.close()
  })
  const state = (accountId: string) => ({
    accountId,
    stateHash: createHash('sha256').update(accountId).digest('hex'),
    bindingHash: 'b'.repeat(64),
    verifier: 'encrypted-test-only',
    callbackUrl: 'https://kids.test/api/parents/openrouter/callback',
    expiresAt: new Date(Date.now() + 600_000),
  })
  function account() {
    const id = randomUUID()
    accounts.push(id)
    return id
  }
  test('exactly one concurrent callback consumes a state, and late exchange cannot undo disconnect', async () => {
    const id = account(),
      pending = state(id)
    await repo.begin(pending, new Date())
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        repo.consume(id, pending.stateHash, pending.bindingHash, new Date()),
      ),
    )
    const accepted = results.filter((result) => result !== null)
    expect(accepted).toHaveLength(1)
    await repo.disconnect(id, new Date())
    expect(
      await repo.connect(id, accepted[0]!.revision, 'encrypted-key', 'c'.repeat(64), new Date()),
    ).toBe(false)
    expect((await repo.get(id))?.credential).toBeNull()
  })
  test('a fresh connection supersedes earlier states; account fence prevents creation and clears no other account', async () => {
    const id = account(),
      pending = state(id)
    await repo.begin(pending, new Date())
    await repo.begin({ ...pending, stateHash: 'c'.repeat(64) }, new Date())
    expect(await repo.consume(id, pending.stateHash, pending.bindingHash, new Date())).toBeNull()
    const other = account()
    await connection.sql`insert into members.account_deletion_fences values (${other}, now())`
    await expect(repo.begin(state(other), new Date())).rejects.toThrow('excluída')
    expect(await repo.get(other)).toBeNull()
    expect(await repo.consume(id, 'c'.repeat(64), pending.bindingHash, new Date())).not.toBeNull()
  })
})
