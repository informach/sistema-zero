import {
  batchOperationSchema,
  batchResultSchema,
  createPieceBatch,
  type LearningPiece,
} from '@sistemazero/marketing-contracts'
import { and, eq } from 'drizzle-orm'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { Database } from './db'
import { DrizzleWorkspaceRepository, projectAccess, receipt } from './workspace.repository'
import { editorialItems } from './workspace-schema'

/** One transaction links the next draft to the exact reviewed analysis revision.
 * A retry returns its receipt; a later analysis or a competing proposal cannot overwrite it. */
export function createLearningPiece(
  db: Database,
  actorId: string,
  projectId: string,
  input: LearningPiece,
  hash: string,
) {
  return db.transaction(async (tx) => {
    await projectAccess(tx, actorId, projectId, 'edit')
    const previous = await receipt(tx, projectId, actorId, input.operationId, hash)
    if (previous) return batchResultSchema.parse(previous.result)
    const [analysis] = await tx
      .select()
      .from(editorialItems)
      .where(
        and(
          eq(editorialItems.id, input.analysisId),
          eq(editorialItems.projectId, projectId),
          eq(editorialItems.archived, false),
        ),
      )
    if (analysis?.document.kind !== 'analysis')
      throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Análise não disponível neste projeto')
    if (analysis.revisionId !== input.expectedRevisionId || analysis.document.proposedPieceId)
      throw new WorkspaceError(
        'CONTEXT_CHANGED',
        'Esta análise mudou ou já possui uma pauta proposta. Confira a versão atual.',
      )
    const batch = createPieceBatch({
      projectId,
      title: input.title,
      format: input.format,
      medium: input.medium,
      brief: `${input.brief}\n\nHipótese a testar:\n${input.hypothesis}\n\nCritério de avaliação:\n${input.criterion}`,
    })
    const piece = batch.changes[0]
    if (piece?.document?.kind !== 'piece') throw new Error('A pauta não foi criada')
    piece.document = {
      ...piece.document,
      objective: input.objective,
      evidenceIds: analysis.document.evidenceIds,
      originAnalysis: { entityId: analysis.id, revisionId: analysis.revisionId },
    }
    batch.operationId = input.operationId
    batch.changes.push({
      entityId: analysis.id,
      baseRevisionId: analysis.revisionId,
      action: 'save',
      document: {
        ...analysis.document,
        hypothesis: input.hypothesis,
        evaluationCriterion: input.criterion,
        proposedPieceId: piece.entityId,
      },
    })
    return new DrizzleWorkspaceRepository(db).applyBatchInTransaction(
      tx,
      actorId,
      batchOperationSchema.parse(batch),
      hash,
    )
  })
}
