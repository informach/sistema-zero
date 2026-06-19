import { and, desc, eq, gt, inArray, isNull, lt, sql } from 'drizzle-orm'
import type {
  CreateOtpCodeInput,
  OtpCodeRecord,
  OtpCodeRepository,
  OtpPurpose,
} from '../../../domain/ports/otp-code-repository.port'
import type { Database } from './db'
import { otpCodes } from './schema'

type OtpRow = typeof otpCodes.$inferSelect

/** Teto por DELETE da purga (bounded sob o statement_timeout — ver refresh-token.repository). */
const PURGE_BATCH_SIZE = 5_000

/** Repositório de códigos OTP (Drizzle/Postgres). Guarda só o hash do código. */
export class DrizzleOtpCodeRepository implements OtpCodeRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreateOtpCodeInput): Promise<void> {
    await this.db.insert(otpCodes).values({
      id: input.id,
      userId: input.userId,
      purpose: input.purpose,
      codeHash: input.codeHash,
      expiresAt: input.expiresAt,
    })
  }

  async createReplacingActive(
    input: CreateOtpCodeInput,
    at: Date,
    cooldownSeconds = 0,
  ): Promise<boolean> {
    return await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`otp:${input.userId}:${input.purpose}`}, 0))`,
      )

      if (cooldownSeconds > 0) {
        const [last] = await tx
          .select({ createdAt: otpCodes.createdAt })
          .from(otpCodes)
          .where(and(eq(otpCodes.userId, input.userId), eq(otpCodes.purpose, input.purpose)))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1)
        if (last && at.getTime() - last.createdAt.getTime() < cooldownSeconds * 1000) {
          return false
        }
      }

      await tx
        .update(otpCodes)
        .set({ consumedAt: at })
        .where(
          and(
            eq(otpCodes.userId, input.userId),
            eq(otpCodes.purpose, input.purpose),
            isNull(otpCodes.consumedAt),
          ),
        )

      await tx.insert(otpCodes).values({
        id: input.id,
        userId: input.userId,
        purpose: input.purpose,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        createdAt: at,
      })
      return true
    })
  }

  async findActive(userId: string, purpose: OtpPurpose, now: Date): Promise<OtpCodeRecord | null> {
    const [row] = await this.db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.userId, userId),
          eq(otpCodes.purpose, purpose),
          isNull(otpCodes.consumedAt),
          gt(otpCodes.expiresAt, now),
        ),
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1)
    return row ? toRecord(row) : null
  }

  async consume(id: string, at: Date): Promise<boolean> {
    const consumed = await this.db
      .update(otpCodes)
      .set({ consumedAt: at })
      .where(and(eq(otpCodes.id, id), isNull(otpCodes.consumedAt)))
      .returning({ id: otpCodes.id })
    return consumed.length === 1
  }

  async consumeAllForUser(userId: string, purpose: OtpPurpose, at: Date): Promise<void> {
    await this.db
      .update(otpCodes)
      .set({ consumedAt: at })
      .where(
        and(
          eq(otpCodes.userId, userId),
          eq(otpCodes.purpose, purpose),
          isNull(otpCodes.consumedAt),
        ),
      )
  }

  async incrementAttempts(id: string): Promise<number> {
    const [row] = await this.db
      .update(otpCodes)
      .set({ attempts: sql`${otpCodes.attempts} + 1` })
      .where(and(eq(otpCodes.id, id), isNull(otpCodes.consumedAt)))
      .returning({ attempts: otpCodes.attempts })
    return row?.attempts ?? 0
  }

  async lastIssuedAt(userId: string, purpose: OtpPurpose): Promise<Date | null> {
    // Todas as linhas (consumidas ou não) — usa o índice `otp_codes_user_purpose_idx`.
    const [row] = await this.db
      .select({ createdAt: otpCodes.createdAt })
      .from(otpCodes)
      .where(and(eq(otpCodes.userId, userId), eq(otpCodes.purpose, purpose)))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1)
    return row?.createdAt ?? null
  }

  async deleteExpired(before: Date): Promise<number> {
    // Em LOTES (subquery LIMIT) — usa o índice `otp_codes_expires_idx`.
    let total = 0
    for (;;) {
      const batch = this.db
        .select({ id: otpCodes.id })
        .from(otpCodes)
        .where(lt(otpCodes.expiresAt, before))
        .limit(PURGE_BATCH_SIZE)
      const deleted = await this.db
        .delete(otpCodes)
        .where(inArray(otpCodes.id, batch))
        .returning({ id: otpCodes.id })
      total += deleted.length
      if (deleted.length < PURGE_BATCH_SIZE) return total
    }
  }
}

function toRecord(row: OtpRow): OtpCodeRecord {
  return {
    id: row.id,
    userId: row.userId,
    purpose: row.purpose,
    codeHash: row.codeHash,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
    attempts: row.attempts,
  }
}
