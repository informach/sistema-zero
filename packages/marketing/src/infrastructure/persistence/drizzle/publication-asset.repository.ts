import { asc, eq } from 'drizzle-orm'
import type { PublicationAssetRepository } from '../../../domain/ports/publication-asset-repository.port'
import type { Database } from './db'
import { publicationAssets } from './schema'

export class DrizzlePublicationAssetRepository implements PublicationAssetRepository {
  constructor(private readonly db: Database) {}

  async replaceForPublication(publicationId: string, assetIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(publicationAssets).where(eq(publicationAssets.publicationId, publicationId))
      if (assetIds.length > 0) {
        await tx.insert(publicationAssets).values(
          assetIds.map((mediaAssetId, position) => ({
            publicationId,
            mediaAssetId,
            position,
          })),
        )
      }
    })
  }

  async listByPublication(publicationId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: publicationAssets.mediaAssetId })
      .from(publicationAssets)
      .where(eq(publicationAssets.publicationId, publicationId))
      .orderBy(asc(publicationAssets.position))
    return rows.map((r) => r.id)
  }
}
