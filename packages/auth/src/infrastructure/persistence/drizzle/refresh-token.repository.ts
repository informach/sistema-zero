import { and, eq, exists, gt, inArray, isNotNull, isNull, lt, notExists } from 'drizzle-orm'
import type { CreateAuditLogInput } from '../../../domain/ports/audit-log-repository.port'
import type {
  CreateRefreshTokenInput,
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../../domain/ports/refresh-token-repository.port'
import { auditLogInsertValues } from './audit-log.repository'
import type { Database } from './db'
import { auditLogs, refreshTokenFamilies, refreshTokens } from './schema'

type RefreshRow = typeof refreshTokens.$inferSelect
type RefreshFamilyRow = typeof refreshTokenFamilies.$inferSelect

/**
 * Teto de linhas por DELETE da purga. Uma DELETE única num backlog grande (ex.:
 * purga parada por dias) estouraria o `statement_timeout` (30s) e NUNCA
 * completaria — cada lote fica bem abaixo do teto e o laço soma os totais.
 */
const PURGE_BATCH_SIZE = 5_000

/** Repositório de refresh tokens (Drizzle/Postgres). */
export class DrizzleRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreateRefreshTokenInput): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await tx
        .insert(refreshTokenFamilies)
        .values({
          id: input.familyId,
          userId: input.userId,
          impersonatorUserId: input.impersonatorUserId ?? null,
          impersonationWritable: input.impersonationWritable ?? false,
          expiresAt: input.expiresAt,
        })
        .onConflictDoNothing()

      // Sessão normal mantém o TTL deslizante histórico. Impersonação preserva
      // o deadline absoluto da família, mesmo após rotações sucessivas.
      if (!input.impersonatorUserId) {
        await tx
          .update(refreshTokenFamilies)
          .set({ expiresAt: input.expiresAt, updatedAt: new Date() })
          .where(
            and(
              eq(refreshTokenFamilies.id, input.familyId),
              isNull(refreshTokenFamilies.revokedAt),
            ),
          )
      }

      const [activeFamily] = await tx
        .select({ id: refreshTokenFamilies.id })
        .from(refreshTokenFamilies)
        .where(
          and(
            eq(refreshTokenFamilies.id, input.familyId),
            isNull(refreshTokenFamilies.revokedAt),
            gt(refreshTokenFamilies.expiresAt, new Date()),
          ),
        )
        .limit(1)
      if (!activeFamily) return false

      await tx.insert(refreshTokens).values({
        id: input.id,
        userId: input.userId,
        familyId: input.familyId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent ?? null,
        ip: input.ip ?? null,
        impersonatorUserId: input.impersonatorUserId ?? null,
        impersonationWritable: input.impersonationWritable ?? false,
        activeProfileId: input.activeProfileId ?? null,
      })
      return true
    })
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const [row] = await this.db
      .select({ token: refreshTokens, family: refreshTokenFamilies })
      .from(refreshTokens)
      .innerJoin(refreshTokenFamilies, eq(refreshTokenFamilies.id, refreshTokens.familyId))
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1)
    return row ? toRecord(row.token, row.family) : null
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
          exists(
            this.db
              .select({ id: refreshTokenFamilies.id })
              .from(refreshTokenFamilies)
              .where(
                and(
                  eq(refreshTokenFamilies.id, refreshTokens.familyId),
                  isNull(refreshTokenFamilies.revokedAt),
                  gt(refreshTokenFamilies.expiresAt, new Date()),
                ),
              ),
          ),
        ),
      )
      .returning({ id: refreshTokens.id })
    return claimed.length === 1
  }

  async setImpersonationMode(
    id: string,
    familyId: string,
    writable: boolean,
    audit?: CreateAuditLogInput,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // PRIMEIRO toca a mesma linha que `claimForRotation` consome. Os dois
      // comandos passam a disputar um lock físico comum: se o modo vence, o
      // refresh espera e depois relê a família; se o claim vence, este WHERE
      // reavaliado não casa e nenhuma auditoria é inserida.
      const current = await tx
        .update(refreshTokens)
        .set({ impersonationWritable: writable })
        .where(
          and(
            eq(refreshTokens.id, id),
            eq(refreshTokens.familyId, familyId),
            isNull(refreshTokens.rotatedAt),
            isNull(refreshTokens.revokedAt),
            exists(
              tx
                .select({ id: refreshTokenFamilies.id })
                .from(refreshTokenFamilies)
                .where(
                  and(
                    eq(refreshTokenFamilies.id, familyId),
                    isNotNull(refreshTokenFamilies.impersonatorUserId),
                    isNull(refreshTokenFamilies.revokedAt),
                    gt(refreshTokenFamilies.expiresAt, new Date()),
                  ),
                ),
            ),
          ),
        )
        .returning({ id: refreshTokens.id })
      if (current.length !== 1) return false

      const updatedFamily = await tx
        .update(refreshTokenFamilies)
        .set({ impersonationWritable: writable, updatedAt: new Date() })
        .where(
          and(
            eq(refreshTokenFamilies.id, familyId),
            isNotNull(refreshTokenFamilies.impersonatorUserId),
            isNull(refreshTokenFamilies.revokedAt),
            gt(refreshTokenFamilies.expiresAt, new Date()),
          ),
        )
        .returning({ id: refreshTokenFamilies.id })
      if (updatedFamily.length !== 1) {
        // Força rollback também do touch na linha rotativa.
        throw new Error('Família de impersonação mudou durante a troca de modo')
      }
      if (audit) await tx.insert(auditLogs).values(auditLogInsertValues(audit))
      return true
    })
  }

  async revokeFamily(familyId: string): Promise<void> {
    // Idem: preserva o revokedAt original das linhas já revogadas (e evita
    // reescrever a família inteira a cada detecção de reuso repetida).
    const now = new Date()
    await this.db.transaction(async (tx) => {
      await tx
        .update(refreshTokens)
        .set({ revokedAt: now })
        .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)))
      await tx
        .update(refreshTokenFamilies)
        .set({ revokedAt: now, updatedAt: now })
        .where(and(eq(refreshTokenFamilies.id, familyId), isNull(refreshTokenFamilies.revokedAt)))
    })
  }

  async revokeAllForUser(userId: string): Promise<void> {
    // Só os ainda vigentes (revokedAt IS NULL) — usa o índice `refresh_tokens_user_idx`.
    const now = new Date()
    await this.db.transaction(async (tx) => {
      await tx
        .update(refreshTokens)
        .set({ revokedAt: now })
        .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
      await tx
        .update(refreshTokenFamilies)
        .set({ revokedAt: now, updatedAt: now })
        .where(and(eq(refreshTokenFamilies.userId, userId), isNull(refreshTokenFamilies.revokedAt)))
    })
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
      if (deleted.length < PURGE_BATCH_SIZE) break
    }

    // A família só sai depois de todas as linhas rotativas. Manter famílias sem
    // tokens expirados para sempre trocaria uma fuga de segurança por fuga de dados.
    for (;;) {
      const batch = this.db
        .select({ id: refreshTokenFamilies.id })
        .from(refreshTokenFamilies)
        .where(
          and(
            lt(refreshTokenFamilies.expiresAt, before),
            notExists(
              this.db
                .select({ id: refreshTokens.id })
                .from(refreshTokens)
                .where(eq(refreshTokens.familyId, refreshTokenFamilies.id)),
            ),
          ),
        )
        .limit(PURGE_BATCH_SIZE)
      const deleted = await this.db
        .delete(refreshTokenFamilies)
        .where(inArray(refreshTokenFamilies.id, batch))
        .returning({ id: refreshTokenFamilies.id })
      if (deleted.length < PURGE_BATCH_SIZE) return total
    }
  }
}

function toRecord(row: RefreshRow, family: RefreshFamilyRow): RefreshTokenRecord {
  return {
    id: row.id,
    userId: row.userId,
    familyId: row.familyId,
    familyExpiresAt: family.expiresAt,
    familyRevokedAt: family.revokedAt,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    rotatedAt: row.rotatedAt,
    revokedAt: row.revokedAt,
    impersonatorUserId: family.impersonatorUserId,
    impersonationWritable: family.impersonationWritable,
    activeProfileId: row.activeProfileId,
  }
}
