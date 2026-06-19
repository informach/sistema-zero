import { and, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm'
import type {
  CreatePasswordResetTokenInput,
  PasswordResetTokenRecord,
  PasswordResetTokenRepository,
} from '../../../domain/ports/password-reset-token-repository.port'
import type { Database } from './db'
import { passwordResetTokens } from './schema'

type ResetRow = typeof passwordResetTokens.$inferSelect

/** Teto por DELETE da purga (bounded sob o statement_timeout — ver refresh-token.repository). */
const PURGE_BATCH_SIZE = 5_000

/** Repositório de tokens de redefinição de senha (Drizzle/Postgres). */
export class DrizzlePasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreatePasswordResetTokenInput): Promise<void> {
    await this.db.insert(passwordResetTokens).values({
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    })
  }

  async createReplacingActive(
    input: CreatePasswordResetTokenInput,
    at: Date,
    cooldownSeconds = 0,
  ): Promise<boolean> {
    return await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`password-reset:${input.userId}`}, 0))`,
      )

      if (cooldownSeconds > 0) {
        const [last] = await tx
          .select({ createdAt: passwordResetTokens.createdAt })
          .from(passwordResetTokens)
          .where(eq(passwordResetTokens.userId, input.userId))
          .orderBy(desc(passwordResetTokens.createdAt))
          .limit(1)
        if (last && at.getTime() - last.createdAt.getTime() < cooldownSeconds * 1000) {
          return false
        }
      }

      await tx
        .update(passwordResetTokens)
        .set({ consumedAt: at })
        .where(
          and(eq(passwordResetTokens.userId, input.userId), isNull(passwordResetTokens.consumedAt)),
        )

      await tx.insert(passwordResetTokens).values({
        id: input.id,
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        createdAt: at,
      })
      return true
    })
  }

  async findByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    const [row] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1)
    return row ? toRecord(row) : null
  }

  async consume(id: string, at: Date): Promise<boolean> {
    const consumed = await this.db
      .update(passwordResetTokens)
      .set({ consumedAt: at })
      .where(and(eq(passwordResetTokens.id, id), isNull(passwordResetTokens.consumedAt)))
      .returning({ id: passwordResetTokens.id })
    return consumed.length === 1
  }

  async consumeAllForUser(userId: string, at: Date): Promise<void> {
    // Só os ainda vigentes (consumedAt IS NULL) — usa o índice `password_reset_tokens_user_idx`.
    await this.db
      .update(passwordResetTokens)
      .set({ consumedAt: at })
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.consumedAt)))
  }

  async lastIssuedAt(userId: string): Promise<Date | null> {
    // Todas as linhas (consumidas ou não) — usa o índice `password_reset_tokens_user_idx`.
    const [row] = await this.db
      .select({ createdAt: passwordResetTokens.createdAt })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId))
      .orderBy(desc(passwordResetTokens.createdAt))
      .limit(1)
    return row?.createdAt ?? null
  }

  async deleteExpired(before: Date): Promise<number> {
    // Em LOTES (subquery LIMIT) — usa o índice `password_reset_tokens_expires_idx`.
    let total = 0
    for (;;) {
      const batch = this.db
        .select({ id: passwordResetTokens.id })
        .from(passwordResetTokens)
        .where(lt(passwordResetTokens.expiresAt, before))
        .limit(PURGE_BATCH_SIZE)
      const deleted = await this.db
        .delete(passwordResetTokens)
        .where(inArray(passwordResetTokens.id, batch))
        .returning({ id: passwordResetTokens.id })
      total += deleted.length
      if (deleted.length < PURGE_BATCH_SIZE) return total
    }
  }
}

function toRecord(row: ResetRow): PasswordResetTokenRecord {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
  }
}
