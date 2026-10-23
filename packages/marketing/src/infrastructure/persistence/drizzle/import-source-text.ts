import { createHash } from 'node:crypto'
import { and, eq, inArray } from 'drizzle-orm'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import { requireImportedSourceProduct } from './import-product'
import type { WorkspaceTransaction } from './workspace.repository'
import {
  editorialRevisions as revisions,
  editorialImportSourceVersions as sources,
  editorialImportSourceTexts as sourceTexts,
} from './workspace-schema'

/** Read immutable receipt revisions, not a reference that someone may have edited afterwards. */
export async function importSourceText(
  tx: WorkspaceTransaction,
  projectId: string,
  sourceId: string,
) {
  const [source] = await tx
    .select()
    .from(sources)
    .where(and(eq(sources.projectId, projectId), eq(sources.id, sourceId)))
  if (!source)
    throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Origem não disponível neste projeto')
  await requireImportedSourceProduct(tx, source)
  const [preserved] = await tx
    .select()
    .from(sourceTexts)
    .where(eq(sourceTexts.sourceVersionId, sourceId))
  const rows = await tx
    .select()
    .from(revisions)
    .where(
      and(
        eq(revisions.projectId, projectId),
        inArray(
          revisions.id,
          source.destinations.map((value) => value.revisionId),
        ),
      ),
    )
  let text = '',
    historical = false
  for (const destination of source.destinations) {
    const row = rows.find(
      (row) => row.id === destination.revisionId && row.entityId === destination.entityId,
    )
    if (row?.document.kind !== 'evidence' || (!preserved && row.document.assetIds?.length))
      throw new WorkspaceError(
        'IMPORT_CONFLICT',
        'A conversão requer uma fonte textual carregada e preservada',
      )
    if (!preserved) text += row.document.body
    historical ||= row.document.validity === 'historical'
  }
  if (preserved) text = preserved.text
  if (createHash('sha256').update(text, 'utf8').digest('hex') !== source.sourceHash)
    throw new WorkspaceError(
      'IMPORT_CONFLICT',
      'As revisões preservadas não correspondem ao hash da origem',
    )
  return { source, text, historical }
}
