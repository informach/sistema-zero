import { and, eq, isNull } from 'drizzle-orm'
import type {
  CreateRefreshTokenInput,
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../../domain/ports/refresh-token-repository.port'
import type { Database } from './db'
import { refreshTokens } from './schema'

type RefreshRow = typeof refreshTokens.$inferSelect

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

  async markRotated(id: string, rotatedAt: Date): Promise<void> {
    // Rotacionar = consumir: marca rotatedAt E revokedAt (não pode mais ser usado).
    await this.db
      .update(refreshTokens)
      .set({ rotatedAt, revokedAt: rotatedAt })
      .where(eq(refreshTokens.id, id))
  }

  async revoke(id: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, id))
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.familyId, familyId))
  }

  async revokeAllForUser(userId: string): Promise<void> {
    // Só os ainda vigentes (revokedAt IS NULL) — usa o índice `refresh_tokens_user_idx`.
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
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
  }
}
