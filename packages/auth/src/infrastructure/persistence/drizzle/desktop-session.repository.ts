import { randomUUID } from 'node:crypto'
import type { DesktopSessionClaim } from '@sistemazero/core/security'
import { and, desc, eq, gt, inArray, isNull, lt } from 'drizzle-orm'
import type {
  DesktopPairing,
  DesktopSessionRepository,
} from '../../../domain/ports/desktop-session-repository.port'
import type { Database } from './db'
import {
  desktopDevices,
  desktopPairings,
  refreshTokenFamilies,
  refreshTokens,
  users,
} from './schema'
export class DrizzleDesktopSessionRepository implements DesktopSessionRepository {
  constructor(private readonly db: Database) {}
  async createPairing(input: DesktopPairing) {
    await this.db.insert(desktopPairings).values(input)
  }
  async describe(userCodeHash: string, now: Date) {
    const [row] = await this.db
      .select({ label: desktopPairings.label, expiresAt: desktopPairings.expiresAt })
      .from(desktopPairings)
      .where(
        and(
          eq(desktopPairings.userCodeHash, userCodeHash),
          gt(desktopPairings.expiresAt, now),
          isNull(desktopPairings.consumedAt),
          isNull(desktopPairings.approvedBy),
        ),
      )
    return row ?? null
  }
  async approve(userCodeHash: string, userId: string, now: Date) {
    const rows = await this.db
      .update(desktopPairings)
      .set({ approvedBy: userId })
      .where(
        and(
          eq(desktopPairings.userCodeHash, userCodeHash),
          gt(desktopPairings.expiresAt, now),
          isNull(desktopPairings.consumedAt),
          isNull(desktopPairings.approvedBy),
        ),
      )
      .returning({ id: desktopPairings.id })
    return rows.length === 1
  }
  async consume(deviceCodeHash: string, challenge: string, credentialHash: string, now: Date) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(desktopPairings)
        .where(
          and(
            eq(desktopPairings.deviceCodeHash, deviceCodeHash),
            eq(desktopPairings.challenge, challenge),
            gt(desktopPairings.expiresAt, now),
            isNull(desktopPairings.consumedAt),
          ),
        )
        .for('update')
      if (!row) return null
      if (!row.approvedBy) return { status: 'pending' as const }
      const device = {
        id: randomUUID(),
        userId: row.approvedBy,
        sessionId: randomUUID(),
        label: row.label,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: null,
      }
      await tx
        .update(desktopPairings)
        .set({ consumedAt: now })
        .where(eq(desktopPairings.id, row.id))
      await tx.insert(refreshTokenFamilies).values({
        id: device.sessionId,
        userId: device.userId,
        desktopContext: { app: 'marketing', deviceId: device.id, sessionId: device.sessionId },
        expiresAt: device.expiresAt,
      })
      await tx.insert(desktopDevices).values({ ...device, credentialHash })
      return { status: 'approved' as const, device }
    })
  }
  async findByCredential(credentialHash: string, now: Date) {
    const [device] = await this.db
      .select()
      .from(desktopDevices)
      .where(
        and(
          eq(desktopDevices.credentialHash, credentialHash),
          gt(desktopDevices.expiresAt, now),
          isNull(desktopDevices.revokedAt),
        ),
      )
      .limit(1)
    return device &&
      (await this.validate(
        { app: 'marketing', deviceId: device.id, sessionId: device.sessionId },
        device.userId,
        now,
      ))
      ? device
      : null
  }
  list(userId: string) {
    return this.db
      .select()
      .from(desktopDevices)
      .where(eq(desktopDevices.userId, userId))
      .orderBy(desc(desktopDevices.createdAt))
      .limit(100)
  }
  async revoke(userId: string, deviceId: string, now: Date) {
    return this.db.transaction(async (tx) => {
      const [device] = await tx
        .select()
        .from(desktopDevices)
        .where(and(eq(desktopDevices.id, deviceId), eq(desktopDevices.userId, userId)))
        .for('update')
      if (!device) return false
      if (!device.revokedAt)
        await tx
          .update(desktopDevices)
          .set({ revokedAt: now })
          .where(eq(desktopDevices.id, deviceId))
      await tx
        .update(refreshTokenFamilies)
        .set({ revokedAt: now, updatedAt: now })
        .where(
          and(
            eq(refreshTokenFamilies.id, device.sessionId),
            isNull(refreshTokenFamilies.revokedAt),
          ),
        )
      await tx
        .update(refreshTokens)
        .set({ revokedAt: now })
        .where(and(eq(refreshTokens.familyId, device.sessionId), isNull(refreshTokens.revokedAt)))
      return true
    })
  }
  async validate(claim: DesktopSessionClaim, userId: string, now: Date) {
    const [row] = await this.db
      .select({ id: desktopDevices.id })
      .from(desktopDevices)
      .innerJoin(users, eq(users.id, desktopDevices.userId))
      .innerJoin(
        refreshTokenFamilies,
        and(
          eq(refreshTokenFamilies.id, desktopDevices.sessionId),
          eq(refreshTokenFamilies.userId, desktopDevices.userId),
        ),
      )
      .where(
        and(
          eq(desktopDevices.id, claim.deviceId),
          eq(desktopDevices.sessionId, claim.sessionId),
          eq(desktopDevices.userId, userId),
          gt(desktopDevices.expiresAt, now),
          isNull(desktopDevices.revokedAt),
          eq(users.status, 'active'),
          inArray(users.role, ['staff', 'admin', 'superadmin']),
          isNull(refreshTokenFamilies.revokedAt),
          gt(refreshTokenFamilies.expiresAt, now),
        ),
      )
      .limit(1)
    return Boolean(row)
  }
  async purgePairings(before: Date) {
    const selected = this.db
      .select({ id: desktopPairings.id })
      .from(desktopPairings)
      .where(lt(desktopPairings.expiresAt, before))
      .limit(5000)
    return (
      await this.db
        .delete(desktopPairings)
        .where(inArray(desktopPairings.id, selected))
        .returning({ id: desktopPairings.id })
    ).length
  }
}
