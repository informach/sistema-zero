import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm'
import type {
  CreateOtpCodeInput,
  OtpCodeRecord,
  OtpCodeRepository,
  OtpPurpose,
} from '../../../domain/ports/otp-code-repository.port'
import type { Database } from './db'
import { otpCodes } from './schema'

type OtpRow = typeof otpCodes.$inferSelect

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

  async consume(id: string, at: Date): Promise<void> {
    await this.db
      .update(otpCodes)
      .set({ consumedAt: at })
      .where(and(eq(otpCodes.id, id), isNull(otpCodes.consumedAt)))
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
      .where(eq(otpCodes.id, id))
      .returning({ attempts: otpCodes.attempts })
    return row?.attempts ?? 0
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
