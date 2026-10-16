import { randomUUID } from 'node:crypto'
import { type ImportDecisionApply, importDecisionSchema } from '@sistemazero/marketing-contracts'
import { and, eq } from 'drizzle-orm'
import { payloadHash } from '../../../application/workspace/workspace.service'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import { requireImportProduct } from './import-product'
import {
  projectAccess,
  receipt,
  recordChange,
  type WorkspaceTransaction,
} from './workspace.repository'
import {
  editorialImportDecisions as decisions,
  editorialImportEntries as entries,
  editorialReceipts as receipts,
  editorialImports as runs,
} from './workspace-schema'

/** Serialize with imports and other reviewers on the project lock. Every
 * superseded decision remains in its operation receipt; clearing uses a new
 * revision instead of deleting the CAS token and creating an ABA race. */
export async function decideImportSource(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  runId: string,
  input: ImportDecisionApply,
) {
  await projectAccess(tx, actorId, projectId, 'edit')
  const hash = payloadHash({ action: 'decide-import-source', runId, input })
  const saved = await receipt(tx, projectId, actorId, input.operationId, hash)
  if (saved) return importDecisionSchema.parse(saved.result)
  const [run] = await tx
    .select()
    .from(runs)
    .where(and(eq(runs.id, runId), eq(runs.projectId, projectId)))
  if (run?.state !== 'inventoried')
    throw new WorkspaceError(
      'IMPORT_CONFLICT',
      'Confirme um inventário ativo antes de decidir sobre a origem',
    )
  const [entry] = await tx
    .select()
    .from(entries)
    .where(and(eq(entries.runId, runId), eq(entries.ordinal, input.ordinal)))
  if (!entry) throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Origem não disponível nesta carga')
  await requireImportProduct(tx, projectId, run.origin, entry.source.product)
  if (!['eligible', 'review'].includes(entry.source.disposition))
    throw new WorkspaceError(
      'IMPORT_CONFLICT',
      'A política de segurança desta origem não pode ser substituída por uma decisão editorial',
    )
  if (entry.result && input.state !== 'pending')
    throw new WorkspaceError(
      'IMPORT_CONFLICT',
      'A origem já foi preservada. Abra sua referência para continuar o trabalho; uma decisão de carga não remove conteúdo',
    )
  const [current] = await tx
    .select()
    .from(decisions)
    .where(and(eq(decisions.runId, runId), eq(decisions.ordinal, input.ordinal)))
  if ((current?.decision.revisionId ?? null) !== input.expectedRevisionId)
    throw new WorkspaceError(
      'IMPORT_CONFLICT',
      'Outra pessoa decidiu sobre esta origem. Atualize a cobertura antes de salvar',
    )
  const result = importDecisionSchema.parse({
    inventoryId: runId,
    ordinal: input.ordinal,
    revisionId: randomUUID(),
    state: input.state,
    reason: input.reason,
    decidedBy: actorId,
    decidedAt: new Date().toISOString(),
  })
  await tx
    .insert(decisions)
    .values({ runId, ordinal: input.ordinal, decision: result })
    .onConflictDoUpdate({ target: [decisions.runId, decisions.ordinal], set: { decision: result } })
  await tx
    .insert(receipts)
    .values({ projectId, actorId, operationId: input.operationId, hash, result })
  await recordChange(tx, projectId, actorId, 'import', runId, null)
  return result
}
