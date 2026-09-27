import { createHash } from 'node:crypto'
import { stableJson } from '../../../domain/shared/stable-json'

/** Os mesmos campos que `publishedSnapshot` usa para proteger uma publicação concorrente. */
export interface PublishedRevisionSnapshot {
  title: string
  slug: string
  estimatedMinutes: number | null
  blocks: unknown[]
  attachments: unknown[]
  sections: unknown
}

export function publishedLessonFingerprint(
  snapshot: PublishedRevisionSnapshot & { supportBlockIds?: unknown },
): string {
  return createHash('sha256').update(stableJson(snapshot)).digest('hex')
}

/**
 * A release de materiais retirou `supportBlockIds` do hash, mas não atualizou o hash guardado
 * nos rascunhos anteriores. Só é seguro reconciliar quando o hash antigo confere EXATAMENTE com
 * o publicado atual acrescido daquele campo vazio. Qualquer outra divergência é conflito real
 * ou requer análise individual: nunca sobrescrevemos essa proteção por aproximação.
 */
export function classifyLessonDraftRevision(
  snapshot: PublishedRevisionSnapshot,
  storedRevision: string,
  hasStructure: boolean,
): { kind: 'current' | 'rebase' | 'conflict'; currentRevision: string } {
  const currentRevision = publishedLessonFingerprint(snapshot)
  if (storedRevision === currentRevision) return { kind: 'current', currentRevision }

  const previousRevision = publishedLessonFingerprint({
    ...snapshot,
    supportBlockIds: hasStructure ? [] : undefined,
  })
  return {
    kind: storedRevision === previousRevision ? 'rebase' : 'conflict',
    currentRevision,
  }
}
