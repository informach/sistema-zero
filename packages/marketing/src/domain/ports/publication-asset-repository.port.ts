import type { Publication } from '../publication/publication-record'
/**
 * Ordem dos assets de uma publicação (tabela `publication_assets`) — hoje é o
 * CARROSSEL do Instagram: as imagens saem exatamente nesta ordem no post.
 */
export interface PublicationAssetRepository {
  /** CAS da publicação e troca ordenada na mesma transação. Recusa estado/versão/checkpoint incompatível. */
  replaceForPublication(
    publicationId: string,
    assetIds: string[],
    expectedVersion: number,
    at: Date,
  ): Promise<Publication | null>
  /** Ids de asset na ordem de `position`. */
  listByPublication(publicationId: string): Promise<string[]>
}
