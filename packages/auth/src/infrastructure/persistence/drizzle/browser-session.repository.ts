import { randomUUID } from 'node:crypto'
import { and, eq, gt, inArray, isNull } from 'drizzle-orm'
import type { BrowserSessionRepository } from '../../../domain/ports/browser-session-repository.port'
import type { Database } from './db'
import { browserSessions, refreshTokenFamilies as families, refreshTokens, users } from './schema'

export class DrizzleBrowserSessionRepository implements BrowserSessionRepository {
  constructor(private readonly db: Database) {}
  async exchange(refreshHash: string, credentialHash: string, now: Date) {
    return this.db.transaction(async (tx) => {
      const [candidate] = await tx
        .select({ familyId: refreshTokens.familyId })
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, refreshHash))
        .limit(1)
      if (!candidate) return null
      // Canonical family before the consumable token, matching revocation order.
      const [family] = await tx
        .select()
        .from(families)
        .where(
          and(
            eq(families.id, candidate.familyId),
            isNull(families.revokedAt),
            gt(families.expiresAt, now),
            isNull(families.kidsContext),
            isNull(families.desktopContext),
            isNull(families.impersonatorUserId),
          ),
        )
        .for('update')
      if (!family) return null
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, family.userId),
            eq(users.status, 'active'),
            inArray(users.role, ['staff', 'admin', 'superadmin']),
          ),
        )
        .limit(1)
      if (!user) return null
      const [consumed] = await tx
        .update(refreshTokens)
        .set({ rotatedAt: now, revokedAt: now })
        .where(
          and(
            eq(refreshTokens.tokenHash, refreshHash),
            eq(refreshTokens.familyId, family.id),
            eq(refreshTokens.userId, user.id),
            isNull(refreshTokens.rotatedAt),
            isNull(refreshTokens.revokedAt),
            isNull(refreshTokens.activeProfileId),
            isNull(refreshTokens.impersonatorUserId),
            gt(refreshTokens.expiresAt, now),
          ),
        )
        .returning({ expiresAt: refreshTokens.expiresAt })
      if (!consumed) return null
      const session = {
        id: randomUUID(),
        userId: user.id,
        familyId: family.id,
        expiresAt: new Date(Math.min(consumed.expiresAt.getTime(), family.expiresAt.getTime())),
      }
      await tx.insert(browserSessions).values({ ...session, credentialHash, createdAt: now })
      return session
    })
  }
  async find(credentialHash: string, now: Date) {
    const [row] = await this.db
      .select({
        id: browserSessions.id,
        userId: browserSessions.userId,
        familyId: browserSessions.familyId,
        expiresAt: browserSessions.expiresAt,
      })
      .from(browserSessions)
      .innerJoin(
        families,
        and(eq(families.id, browserSessions.familyId), eq(families.userId, browserSessions.userId)),
      )
      .where(
        and(
          eq(browserSessions.credentialHash, credentialHash),
          gt(browserSessions.expiresAt, now),
          isNull(families.revokedAt),
          gt(families.expiresAt, now),
          isNull(families.kidsContext),
          isNull(families.desktopContext),
          isNull(families.impersonatorUserId),
        ),
      )
      .limit(1)
    return row ?? null
  }
  async disconnect(credentialHash: string, now: Date) {
    await this.db
      .update(families)
      .set({ revokedAt: now, updatedAt: now })
      .where(
        and(
          inArray(
            families.id,
            this.db
              .select({ id: browserSessions.familyId })
              .from(browserSessions)
              .where(eq(browserSessions.credentialHash, credentialHash)),
          ),
          isNull(families.revokedAt),
        ),
      )
  }
}
