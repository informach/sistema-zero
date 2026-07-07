import { and, asc, count, desc, eq, inArray } from 'drizzle-orm'
import type { MediaAsset } from '../../../domain/media/media-asset'
import type {
  ListAssetsFilter,
  MediaAssetRepository,
} from '../../../domain/ports/media-asset-repository.port'
import type { Database } from './db'
import { mediaAssets } from './schema'

export class DrizzleMediaAssetRepository implements MediaAssetRepository {
  constructor(private readonly db: Database) {}

  async create(asset: MediaAsset): Promise<void> {
    await this.db.insert(mediaAssets).values(asset)
  }

  async byId(id: string): Promise<MediaAsset | null> {
    const [row] = await this.db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1)
    return row ?? null
  }

  async update(asset: MediaAsset, expectedVersion: number): Promise<boolean> {
    const updated = await this.db
      .update(mediaAssets)
      .set({
        version: asset.version,
        contentId: asset.contentId,
        kind: asset.kind,
        r2Key: asset.r2Key,
        driveFileId: asset.driveFileId,
        status: asset.status,
        transferAttempts: asset.transferAttempts,
        transferNextAt: asset.transferNextAt,
        transferError: asset.transferError,
        archivedAt: asset.archivedAt,
        r2DeletedAt: asset.r2DeletedAt,
        updatedAt: asset.updatedAt,
      })
      .where(and(eq(mediaAssets.id, asset.id), eq(mediaAssets.version, expectedVersion)))
      .returning({ id: mediaAssets.id })
    return updated.length > 0
  }

  async list(filter: ListAssetsFilter): Promise<{ items: MediaAsset[]; total: number }> {
    const conditions = []
    if (filter.contentId) conditions.push(eq(mediaAssets.contentId, filter.contentId))
    const where = conditions.length > 0 ? and(...conditions) : undefined
    const [items, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(mediaAssets)
        .where(where)
        .orderBy(desc(mediaAssets.createdAt), asc(mediaAssets.id))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db.select({ value: count() }).from(mediaAssets).where(where),
    ])
    return { items, total: totalRow?.value ?? 0 }
  }

  async byIds(ids: string[]): Promise<Map<string, MediaAsset>> {
    const map = new Map<string, MediaAsset>()
    if (ids.length === 0) return map
    const rows = await this.db.select().from(mediaAssets).where(inArray(mediaAssets.id, ids))
    for (const row of rows) map.set(row.id, row)
    return map
  }
}
