import { and, eq, inArray, isNull, lt } from 'drizzle-orm'
import type {
  CreateImpersonationTokenInput,
  ImpersonationTokenRecord,
  ImpersonationTokenRepository,
} from '../../../domain/ports/impersonation-token-repository.port'
import type { Database } from './db'
import { impersonationTokens } from './schema'

type ImpersonationRow = typeof impersonationTokens.$inferSelect

/** Teto por DELETE da purga (bounded sob o statement_timeout — ver refresh-token.repository). */
const PURGE_BATCH_SIZE = 5_000

/** Repositório de tokens de handoff de impersonação (Drizzle/Postgres). */
export class DrizzleImpersonationTokenRepository implements ImpersonationTokenRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreateImpersonationTokenInput): Promise<void> {
    await this.db.insert(impersonationTokens).values({
      id: input.id,
      tokenHash: input.tokenHash,
      actorId: input.actorId,
      targetUserId: input.targetUserId,
      expiresAt: input.expiresAt,
    })
  }

  async findByHash(tokenHash: string): Promise<ImpersonationTokenRecord | null> {
    const [row] = await this.db
      .select()
      .from(impersonationTokens)
      .where(eq(impersonationTokens.tokenHash, tokenHash))
      .limit(1)
    return row ? toRecord(row) : null
  }

  async consume(id: string, at: Date): Promise<boolean> {
    // Consumo ATÔMICO (espelha o claimForRotation do refresh): o WHERE só casa se
    // ainda não consumido — dois exchanges concorrentes disputam e só um vence.
    const consumed = await this.db
      .update(impersonationTokens)
      .set({ consumedAt: at })
      .where(and(eq(impersonationTokens.id, id), isNull(impersonationTokens.consumedAt)))
      .returning({ id: impersonationTokens.id })
    return consumed.length === 1
  }

  async deleteExpired(before: Date): Promise<number> {
    // Em LOTES (subquery LIMIT) — usa o índice `impersonation_tokens_expires_idx`.
    let total = 0
    for (;;) {
      const batch = this.db
        .select({ id: impersonationTokens.id })
        .from(impersonationTokens)
        .where(lt(impersonationTokens.expiresAt, before))
        .limit(PURGE_BATCH_SIZE)
      const deleted = await this.db
        .delete(impersonationTokens)
        .where(inArray(impersonationTokens.id, batch))
        .returning({ id: impersonationTokens.id })
      total += deleted.length
      if (deleted.length < PURGE_BATCH_SIZE) return total
    }
  }
}

function toRecord(row: ImpersonationRow): ImpersonationTokenRecord {
  return {
    id: row.id,
    tokenHash: row.tokenHash,
    actorId: row.actorId,
    targetUserId: row.targetUserId,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
  }
}
