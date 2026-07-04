import { randomUUID } from 'node:crypto'
import { and, eq, inArray } from 'drizzle-orm'
import { type AvatarConfig, defaultAvatarConfig } from '../../../domain/avatar/avatar-config'
import type { CourseAudience } from '../../../domain/course/course'
import type { AvatarRepository } from '../../../domain/ports/avatar-repository.port'
import type { Database } from './db'
import { avatarConfigs, avatarInventory } from './schema'

export class DrizzleAvatarRepository implements AvatarRepository {
  constructor(private readonly db: Database) {}

  async getConfig(userId: string, audience: CourseAudience): Promise<AvatarConfig | null> {
    const [row] = await this.db
      .select({ equipped: avatarConfigs.equipped })
      .from(avatarConfigs)
      .where(and(eq(avatarConfigs.userId, userId), eq(avatarConfigs.audience, audience)))
      .limit(1)
    return row?.equipped ?? null
  }

  async upsertConfig(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    config: AvatarConfig,
    now: Date,
  ): Promise<void> {
    await this.db
      .insert(avatarConfigs)
      .values({
        id: randomUUID(),
        userId,
        accountId,
        audience,
        equipped: config,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [avatarConfigs.userId, avatarConfigs.audience],
        // `accountId` fica de fora do update: IMUTÁVEL por perfil (gravado só no INSERT).
        set: { equipped: config, updatedAt: now },
      })
  }

  async listInventory(userId: string, audience: CourseAudience): Promise<string[]> {
    const rows = await this.db
      .select({ partId: avatarInventory.partId })
      .from(avatarInventory)
      .where(and(eq(avatarInventory.userId, userId), eq(avatarInventory.audience, audience)))
    return rows.map((r) => r.partId)
  }

  async addToInventory(
    userId: string,
    audience: CourseAudience,
    partId: string,
    now: Date,
  ): Promise<{ added: boolean }> {
    const inserted = await this.db
      .insert(avatarInventory)
      .values({ id: randomUUID(), userId, audience, partId, acquiredAt: now })
      .onConflictDoNothing({
        target: [avatarInventory.userId, avatarInventory.audience, avatarInventory.partId],
      })
      .returning({ id: avatarInventory.id })
    return { added: inserted.length > 0 }
  }

  async getPhotoUrl(userId: string, audience: CourseAudience): Promise<string | null> {
    const [row] = await this.db
      .select({ photoUrl: avatarConfigs.photoUrl })
      .from(avatarConfigs)
      .where(and(eq(avatarConfigs.userId, userId), eq(avatarConfigs.audience, audience)))
      .limit(1)
    return row?.photoUrl ?? null
  }

  async listPhotoUrlsByProfileIds(
    profileIds: string[],
    audience: CourseAudience,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    if (profileIds.length === 0) return map
    const rows = await this.db
      .select({ userId: avatarConfigs.userId, photoUrl: avatarConfigs.photoUrl })
      .from(avatarConfigs)
      .where(and(inArray(avatarConfigs.userId, profileIds), eq(avatarConfigs.audience, audience)))
    for (const row of rows) if (row.photoUrl) map.set(row.userId, row.photoUrl)
    return map
  }

  async setPhotoUrl(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    photoUrl: string,
    now: Date,
  ): Promise<void> {
    await this.db
      .insert(avatarConfigs)
      .values({
        id: randomUUID(),
        userId,
        accountId,
        audience,
        // A linha pode nascer pela FOTO (antes de equipar) → semeia a config default.
        equipped: defaultAvatarConfig(),
        photoUrl,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [avatarConfigs.userId, avatarConfigs.audience],
        // Só a foto: NÃO toca `equipped` (preserva o que a criança montou) nem `accountId`.
        set: { photoUrl, updatedAt: now },
      })
  }
}
