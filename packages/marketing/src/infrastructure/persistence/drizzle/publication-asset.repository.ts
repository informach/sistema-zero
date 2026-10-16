import { and, asc, eq, inArray } from 'drizzle-orm'
import type { PublicationAssetRepository } from '../../../domain/ports/publication-asset-repository.port'
import { hasProviderCheckpoint, isEditable } from '../../../domain/publication/publication'
import type { Publication } from '../../../domain/publication/publication-record'
import type { Database } from './db'
import { legacyPublication } from './publication-scope'
import { mediaAssets, publicationAssets, publications } from './schema'

export class DrizzlePublicationAssetRepository implements PublicationAssetRepository {
  constructor(private readonly db: Database) {}

  async replaceForPublication(
    publicationId: string,
    assetIds: string[],
    expectedVersion: number,
    at: Date,
  ): Promise<Publication | null> {
    return this.db.transaction(async (tx) => {
      const [publication] = await tx
        .select()
        .from(publications)
        .where(and(eq(publications.id, publicationId), legacyPublication))
        .for('update')
      if (
        !publication ||
        publication.version !== expectedVersion ||
        !isEditable(publication.status) ||
        hasProviderCheckpoint(publication.providerSession)
      )
        return null
      if (assetIds.length < 1 || assetIds.length > 10 || new Set(assetIds).size !== assetIds.length)
        return null
      const assets = await tx
        .select()
        .from(mediaAssets)
        .where(inArray(mediaAssets.id, assetIds))
        .orderBy(asc(mediaAssets.id))
        .for('update')
      if (
        assets.length !== assetIds.length ||
        assets.some(
          (asset) => asset.status !== 'ready' || asset.contentId !== publication.contentId,
        )
      )
        return null
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
      const [updated] = await tx
        .update(publications)
        .set({ version: expectedVersion + 1, updatedAt: at })
        .where(eq(publications.id, publicationId))
        .returning()
      if (!updated) throw new Error('A publicação bloqueada desapareceu durante a troca de mídia')
      return updated
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
