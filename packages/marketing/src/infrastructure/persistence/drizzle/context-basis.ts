import {
  demonstrationSources,
  type EditorialDocument,
  type Revision,
  revisionSchema,
} from '@sistemazero/marketing-contracts'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { WorkspaceTransaction } from './workspace.repository'
import { editorialRevisions as revisions } from './workspace-schema'

/** Historical basis is read by immutable revision, including the analysis that
 * originated a new cycle. Editing that analysis later cannot rewrite the brief's source. */
export async function loadContextBasis(
  tx: WorkspaceTransaction,
  projectId: string,
  source: EditorialDocument,
  ancestors: { document: EditorialDocument }[],
): Promise<Revision[]> {
  let refs = source.kind === 'analysis' ? (source.basis ?? []) : []
  if (source.kind === 'video')
    refs = demonstrationSources(source.timeline).map((reference) => ({
      entityId: reference.evidenceId,
      revisionId: reference.evidenceRevisionId,
    }))
  const origin = [source, ...ancestors.map((item) => item.document)].flatMap((doc) =>
    doc.kind === 'piece' && doc.originAnalysis ? [doc.originAnalysis] : [],
  )[0]
  const basis: Revision[] = []
  if (origin) {
    const [row] = await tx
      .select()
      .from(revisions)
      .where(
        and(
          eq(revisions.projectId, projectId),
          eq(revisions.id, origin.revisionId),
          eq(revisions.entityId, origin.entityId),
        ),
      )
    if (row?.document.kind !== 'analysis')
      throw new WorkspaceError(
        'DEPENDENCY_MISSING',
        'A análise de origem da pauta não está disponível',
      )
    basis.push(revisionSchema.parse({ ...row, createdAt: row.createdAt.toISOString() }))
    refs = [...refs, ...(row.document.basis ?? [])]
  }
  const rows = refs.length
    ? await tx
        .select()
        .from(revisions)
        .where(
          and(
            eq(revisions.projectId, projectId),
            inArray(revisions.id, [...new Set(refs.map((row) => row.revisionId))]),
          ),
        )
        .orderBy(asc(revisions.id))
    : []
  if (
    refs.some(
      (ref) => !rows.some((row) => row.id === ref.revisionId && row.entityId === ref.entityId),
    )
  )
    throw new WorkspaceError(
      'DEPENDENCY_MISSING',
      'Uma revisão de origem da análise não está disponível',
    )
  for (const row of rows)
    if (!basis.some((item) => item.id === row.id))
      basis.push(revisionSchema.parse({ ...row, createdAt: row.createdAt.toISOString() }))
  if (basis.length > 200)
    throw new WorkspaceError(
      'CONTEXT_TOO_LARGE',
      'A análise contém referências demais para um único pedido',
    )
  return basis
}
