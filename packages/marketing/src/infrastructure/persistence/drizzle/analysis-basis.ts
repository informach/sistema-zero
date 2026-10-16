import type { EditorialDocument } from '@sistemazero/marketing-contracts'
import { and, eq, inArray } from 'drizzle-orm'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { WorkspaceTransaction } from './workspace.repository'
import { editorialItems } from './workspace-schema'

/** Freeze newly attached observations at the revision accepted in this transaction.
 * Explicit historical references stay historical; retries recover the original receipt. */
export async function freezeAnalysisBasis(
  tx: WorkspaceTransaction,
  projectId: string,
  document: EditorialDocument,
  pending: Array<{
    id: string
    revisionId: string
    document: EditorialDocument
    archived: boolean
  }> = [],
): Promise<EditorialDocument> {
  if (document.kind !== 'analysis') return document
  const basis = document.basis ?? []
  const missing = [
    ...new Set(document.evidenceIds.filter((id) => !basis.some((ref) => ref.entityId === id))),
  ]
  if (!missing.length) return document
  const rows = await tx
    .select()
    .from(editorialItems)
    .where(and(eq(editorialItems.projectId, projectId), inArray(editorialItems.id, missing)))
  const additions = missing.map((id) => {
    const row = pending.find((item) => item.id === id) ?? rows.find((item) => item.id === id)
    if (!row || row.archived || row.document.kind !== 'evidence')
      throw new WorkspaceError(
        'DEPENDENCY_MISSING',
        'A análise exige uma evidência disponível no projeto',
      )
    return { entityId: id, revisionId: row.revisionId }
  })
  if (basis.length + additions.length > 200)
    throw new WorkspaceError(
      'CONTEXT_TOO_LARGE',
      'Divida a análise para preservar todas as revisões de origem',
    )
  return { ...document, basis: [...basis, ...additions] }
}
