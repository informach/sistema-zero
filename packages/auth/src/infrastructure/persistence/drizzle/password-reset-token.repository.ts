import { and, desc, eq, isNull, lt } from 'drizzle-orm'
import type {
  CreatePasswordResetTokenInput,
  PasswordResetTokenRecord,
  PasswordResetTokenRepository,
} from '../../../domain/ports/password-reset-token-repository.port'
import type { Database } from './db'
import { passwordResetTokens } from './schema'

type ResetRow = typeof passwordResetTokens.$inferSelect

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

  async findByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    const [row] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1)
    return row ? toRecord(row) : null
  }

  async consume(id: string, at: Date): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ consumedAt: at })
      .where(and(eq(passwordResetTokens.id, id), isNull(passwordResetTokens.consumedAt)))
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
    const deleted = await this.db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, before))
      .returning({ id: passwordResetTokens.id })
    return deleted.length
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
