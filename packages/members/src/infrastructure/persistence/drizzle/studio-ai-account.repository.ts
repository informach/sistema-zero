import type { StudioAiPolicyInput } from '@sistemazero/core/ai-credits'
import { ForbiddenError } from '@sistemazero/core/http'
import { and, eq, gt, sql } from 'drizzle-orm'
import { StudioAiConflictError } from '../../../domain/ai-usage/studio-ai.errors'
import type {
  StudioAiAccountRepository,
  StudioAiOAuthState,
} from '../../../domain/ports/studio-ai-account.port'
import type { Database } from './db'
import { accountDeletionFences, studioAiAccounts, studioAiOAuthStates } from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
export async function lockStudioAiAccount(tx: Transaction, accountId: string) {
  // Same order as account purge; quota operations can acquire ai-usage after this lock.
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`members-account:${accountId}`}, 0))`,
  )
  const [fence] = await tx
    .select({ id: accountDeletionFences.accountId })
    .from(accountDeletionFences)
    .where(eq(accountDeletionFences.accountId, accountId))
    .limit(1)
  if (fence) throw new ForbiddenError('Esta conta foi excluída.')
}

export class DrizzleStudioAiAccountRepository implements StudioAiAccountRepository {
  constructor(private readonly db: Database) {}
  async get(accountId: string) {
    const [row] = await this.db
      .select()
      .from(studioAiAccounts)
      .where(eq(studioAiAccounts.accountId, accountId))
    return row ?? null
  }
  async begin(state: Omit<StudioAiOAuthState, 'revision'>, now: Date) {
    await this.db.transaction(async (tx) => {
      await lockStudioAiAccount(tx, state.accountId)
      await tx
        .insert(studioAiAccounts)
        .values({ accountId: state.accountId, updatedAt: now })
        .onConflictDoNothing()
      const [account] = await tx
        .update(studioAiAccounts)
        .set({ revision: sql`${studioAiAccounts.revision} + 1`, updatedAt: now })
        .where(eq(studioAiAccounts.accountId, state.accountId))
        .returning()
      await tx.delete(studioAiOAuthStates).where(eq(studioAiOAuthStates.accountId, state.accountId))
      await tx.insert(studioAiOAuthStates).values({ ...state, revision: account!.revision })
    })
    // Bounded maintenance; at most one live attempt per family.
    await this.db.execute(sql`delete from ${studioAiOAuthStates} where ${studioAiOAuthStates.stateHash} in
      (select ${studioAiOAuthStates.stateHash} from ${studioAiOAuthStates} where ${studioAiOAuthStates.expiresAt} < ${now.toISOString()}::timestamptz limit 100)`)
  }
  async consume(accountId: string, stateHash: string, bindingHash: string, now: Date) {
    return this.db.transaction(async (tx) => {
      await lockStudioAiAccount(tx, accountId)
      const [row] = await tx
        .delete(studioAiOAuthStates)
        .where(
          and(
            eq(studioAiOAuthStates.accountId, accountId),
            eq(studioAiOAuthStates.stateHash, stateHash),
            eq(studioAiOAuthStates.bindingHash, bindingHash),
            gt(studioAiOAuthStates.expiresAt, now),
          ),
        )
        .returning()
      return row ?? null
    })
  }
  async connect(
    accountId: string,
    revision: number,
    credential: string,
    keyHash: string,
    now: Date,
  ) {
    return this.db.transaction(async (tx) => {
      await lockStudioAiAccount(tx, accountId)
      const updated = await tx
        .update(studioAiAccounts)
        .set({
          credential,
          keyHash,
          connectedAt: now,
          updatedAt: now,
          revision: revision + 1,
        })
        .where(
          and(eq(studioAiAccounts.accountId, accountId), eq(studioAiAccounts.revision, revision)),
        )
        .returning({ id: studioAiAccounts.accountId })
      return updated.length === 1
    })
  }
  async policy(accountId: string, input: StudioAiPolicyInput, now: Date) {
    await this.db.transaction(async (tx) => {
      await lockStudioAiAccount(tx, accountId)
      const [account] = await tx
        .select()
        .from(studioAiAccounts)
        .where(eq(studioAiAccounts.accountId, accountId))
      if (input.source === 'openrouter' && !account?.credential) throw new StudioAiConflictError()
      await tx
        .insert(studioAiAccounts)
        .values({ ...input, accountId, updatedAt: now })
        .onConflictDoUpdate({
          target: studioAiAccounts.accountId,
          set: { ...input, revision: sql`${studioAiAccounts.revision} + 1`, updatedAt: now },
        })
    })
  }
  async disconnect(accountId: string, now: Date) {
    await this.db.transaction(async (tx) => {
      await lockStudioAiAccount(tx, accountId)
      await tx.delete(studioAiOAuthStates).where(eq(studioAiOAuthStates.accountId, accountId))
      await tx
        .update(studioAiAccounts)
        .set({
          credential: null,
          keyHash: null,
          connectedAt: null,
          revision: sql`${studioAiAccounts.revision} + 1`,
          updatedAt: now,
        })
        .where(eq(studioAiAccounts.accountId, accountId))
    })
  }
}
