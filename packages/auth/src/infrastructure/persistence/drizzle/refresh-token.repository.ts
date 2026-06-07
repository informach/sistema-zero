import { and, eq, inArray, isNull, lt } from 'drizzle-orm'
import type {
  CreateRefreshTokenInput,
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../../domain/ports/refresh-token-repository.port'
import type { Database } from './db'
import { refreshTokens } from './schema'

type RefreshRow = typeof refreshTokens.$inferSelect

/**
 * Teto de linhas por DELETE da purga. Uma DELETE única num backlog grande (ex.:
 * purga parada por dias) estouraria o `statement_timeout` (30s) e NUNCA
 * completaria — cada lote fica bem abaixo do teto e o laço soma os totais.
 */
const PURGE_BATCH_SIZE = 5_000

/** Repositório de refresh tokens (Drizzle/Postgres). */
export class DrizzleRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreateRefreshTokenInput): Promise<void> {
    await this.db.insert(refreshTokens).values({
      id: input.id,
      userId: input.userId,
      familyId: input.familyId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
      impersonatorUserId: input.impersonatorUserId ?? null,
    })
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1)
    return row ? toRecord(row) : null
  }

  async claimForRotation(id: string, rotatedAt: Date): Promise<boolean> {
    // Claim ATÔMICO: o WHERE só casa se o token ainda estiver vigente — duas
    // rotações concorrentes disputam o UPDATE e só uma leva a linha (a outra
    // recebe `false` e é tratada como reuso). Rotacionar = consumir: marca
    // rotatedAt E revokedAt (não pode mais ser usado).
    const claimed = await this.db
      .update(refreshTokens)
      .set({ rotatedAt, revokedAt: rotatedAt })
      .where(
        and(
          eq(refreshTokens.id, id),
          isNull(refreshTokens.rotatedAt),
          isNull(refreshTokens.revokedAt),
        ),
      )
      .returning({ id: refreshTokens.id })
    return claimed.length === 1
  }

  async revoke(id: string): Promise<void> {
    // Só se ainda vigente: re-revogar sobrescreveria o timestamp ORIGINAL da
    // revogação (trilha de auditoria da reuse-detection).
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)))
  }

  async revokeFamily(familyId: string): Promise<void> {
    // Idem: preserva o revokedAt original das linhas já revogadas (e evita
    // reescrever a família inteira a cada detecção de reuso repetida).
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)))
  }

  async revokeAllForUser(userId: string): Promise<void> {
    // Só os ainda vigentes (revokedAt IS NULL) — usa o índice `refresh_tokens_user_idx`.
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
  }

  async deleteExpired(before: Date): Promise<number> {
    // Em LOTES (subquery LIMIT): cada DELETE fica bounded sob o statement_timeout.
    // Usa o índice `refresh_tokens_expires_idx`.
    let total = 0
    for (;;) {
      const batch = this.db
        .select({ id: refreshTokens.id })
        .from(refreshTokens)
        .where(lt(refreshTokens.expiresAt, before))
        .limit(PURGE_BATCH_SIZE)
      const deleted = await this.db
        .delete(refreshTokens)
        .where(inArray(refreshTokens.id, batch))
        .returning({ id: refreshTokens.id })
      total += deleted.length
      if (deleted.length < PURGE_BATCH_SIZE) return total
    }
  }
}

function toRecord(row: RefreshRow): RefreshTokenRecord {
  return {
    id: row.id,
    userId: row.userId,
    familyId: row.familyId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    rotatedAt: row.rotatedAt,
    revokedAt: row.revokedAt,
    impersonatorUserId: row.impersonatorUserId,
  }
}
