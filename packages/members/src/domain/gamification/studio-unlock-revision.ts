import { createHash } from 'node:crypto'

/**
 * Entrada mínima que muda quando a união de ferramentas PODE mudar.
 *
 * Não carregamos `metadata.studioUnlockBlocks` no chrome global: a revisão usa os
 * cursos elegíveis e o `updatedAt` do curso vivo. Um update sem relação com a
 * paleta pode causar uma única revalidação extra, mas nunca transfere centenas de
 * ids em toda navegação.
 */
export interface StudioUnlockRevisionSource {
  courseId: string
  completedAt: Date
  /** `null` para bônus Kids, cuja publicação não participa do desbloqueio. */
  showcasedAt: Date | null
  courseUpdatedAt: Date | null
}

export function studioUnlockRevision(sources: readonly StudioUnlockRevisionSource[]): string {
  const canonical = [...sources]
    .sort((a, b) => a.courseId.localeCompare(b.courseId))
    .map((source) => [
      source.courseId,
      source.completedAt.toISOString(),
      source.showcasedAt?.toISOString() ?? null,
      source.courseUpdatedAt?.toISOString() ?? null,
    ])
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}
