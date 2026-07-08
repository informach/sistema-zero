/**
 * Ordem dos assets de uma publicação (tabela `publication_assets`) — hoje é o
 * CARROSSEL do Instagram: as imagens saem exatamente nesta ordem no post.
 */
export interface PublicationAssetRepository {
  /** Substitui a lista INTEIRA (delete+insert atômico; posição = índice). */
  replaceForPublication(publicationId: string, assetIds: string[]): Promise<void>
  /** Ids de asset na ordem de `position`. */
  listByPublication(publicationId: string): Promise<string[]>
}
