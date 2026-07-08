import { and, asc, count, desc, eq, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm'
import type { MediaAsset } from '../../../domain/media/media-asset'
import type {
  ListAssetsFilter,
  MediaAssetRepository,
} from '../../../domain/ports/media-asset-repository.port'
import type { Database } from './db'
import { contents, mediaAssets } from './schema'

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

  async claimDueTransfers(now: Date, limit: number, leaseMs: number): Promise<MediaAsset[]> {
    // Claim com lease (padrão messaging): usa o índice parcial
    // media_assets_transfer_idx; crash entre o claim e o `ready`/backoff devolve
    // a linha à fila quando o lease em transfer_next_at vence.
    return this.db.transaction(async (tx) => {
      const due = await tx
        .select()
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.status, 'importing'),
            or(isNull(mediaAssets.transferNextAt), lte(mediaAssets.transferNextAt, now)),
          ),
        )
        .orderBy(asc(mediaAssets.createdAt), asc(mediaAssets.id))
        .limit(limit)
        .for('update', { skipLocked: true })
      if (due.length === 0) return []
      const leaseUntil = new Date(now.getTime() + leaseMs)
      await tx
        .update(mediaAssets)
        .set({
          transferAttempts: sql`${mediaAssets.transferAttempts} + 1`,
          transferNextAt: leaseUntil,
          version: sql`${mediaAssets.version} + 1`,
          updatedAt: now,
        })
        .where(
          inArray(
            mediaAssets.id,
            due.map((r) => r.id),
          ),
        )
      return due.map((r) => ({
        ...r,
        transferAttempts: r.transferAttempts + 1,
        transferNextAt: leaseUntil,
        version: r.version + 1,
        updatedAt: now,
      }))
    })
  }

  async claimDueArchives(input: {
    now: Date
    limit: number
    leaseMs: number
    afterDays: number
  }): Promise<MediaAsset[]> {
    const { now } = input
    const cutoff = new Date(now.getTime() - input.afterDays * 86_400_000)
    return this.db.transaction(async (tx) => {
      const due = await tx
        .select({ asset: mediaAssets })
        .from(mediaAssets)
        .innerJoin(contents, eq(mediaAssets.contentId, contents.id))
        .where(
          or(
            // Elegível: pronto, com objeto no R2, conteúdo PUBLICADO há 30d+.
            and(
              eq(mediaAssets.status, 'ready'),
              isNotNull(mediaAssets.r2Key),
              eq(contents.stage, 'published'),
              lte(contents.updatedAt, cutoff),
              or(isNull(mediaAssets.transferNextAt), lte(mediaAssets.transferNextAt, now)),
            ),
            // Reaper: preso em `archiving` com lease vencido (crash no meio).
            and(eq(mediaAssets.status, 'archiving'), lte(mediaAssets.transferNextAt, now)),
          ),
        )
        .orderBy(asc(mediaAssets.createdAt), asc(mediaAssets.id))
        .limit(input.limit)
        // Trava SÓ os assets (o join olha contents, mas ninguém disputa a linha).
        .for('update', { of: mediaAssets, skipLocked: true })
      if (due.length === 0) return []
      const leaseUntil = new Date(now.getTime() + input.leaseMs)
      await tx
        .update(mediaAssets)
        .set({
          status: 'archiving',
          transferAttempts: sql`${mediaAssets.transferAttempts} + 1`,
          transferNextAt: leaseUntil,
          version: sql`${mediaAssets.version} + 1`,
          updatedAt: now,
        })
        .where(
          inArray(
            mediaAssets.id,
            due.map((r) => r.asset.id),
          ),
        )
      return due.map((r) => ({
        ...r.asset,
        status: 'archiving' as const,
        transferAttempts: r.asset.transferAttempts + 1,
        transferNextAt: leaseUntil,
        version: r.asset.version + 1,
        updatedAt: now,
      }))
    })
  }
}
