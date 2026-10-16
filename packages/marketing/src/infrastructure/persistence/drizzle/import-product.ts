import { randomUUID } from 'node:crypto'
import {
  type ImportProductBind,
  type ImportProductBinding,
  importProductAllowed,
  importProductBindingSchema,
} from '@sistemazero/marketing-contracts'
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { payloadHash } from '../../../application/workspace/workspace.service'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import {
  projectAccess,
  receipt,
  recordChange,
  type WorkspaceTransaction,
} from './workspace.repository'
import {
  editorialImportProducts as bindings,
  editorialImportEntries as entries,
  editorialReceipts as receipts,
  editorialImports as runs,
} from './workspace-schema'

const conflict = (message: string) => new WorkspaceError('IMPORT_CONFLICT', message)
const view = (row: typeof bindings.$inferSelect) =>
  importProductBindingSchema.parse({ ...row, updatedAt: row.updatedAt.toISOString() })

export async function requireImportProduct(
  tx: WorkspaceTransaction,
  projectId: string,
  origin: ImportProductBinding['origin'],
  product: string,
) {
  const [binding] = await tx
    .select()
    .from(bindings)
    .where(and(eq(bindings.projectId, projectId), eq(bindings.origin, origin)))
  if (!binding)
    throw conflict('Vincule o produto desta origem ao projeto antes de carregar seu conteúdo')
  if (!importProductAllowed(binding, product))
    throw conflict(
      `O produto ${product} não pertence ao vínculo deste projeto. Use um projeto separado ou confira as referências compartilhadas.`,
    )
}

/** Original import receipts remain authoritative even when a reference is edited or archived. */
export async function requireImportedSourceProduct(
  tx: WorkspaceTransaction,
  source: {
    projectId: string
    origin: ImportProductBinding['origin']
    sourcePath: string
    sourceHash: string
  },
) {
  const products = await tx
    .selectDistinct({ product: sql<string>`${entries.source}->>'product'` })
    .from(entries)
    .innerJoin(runs, eq(runs.id, entries.runId))
    .where(
      and(
        eq(runs.projectId, source.projectId),
        eq(runs.origin, source.origin),
        eq(entries.sourcePath, source.sourcePath),
        sql`${entries.source}->>'sha256'=${source.sourceHash}`,
        isNotNull(entries.result),
      ),
    )
  if (!products.length)
    throw conflict('A origem não tem registro de carga confirmado neste projeto')
  for (const { product } of products)
    await requireImportProduct(tx, source.projectId, source.origin, product)
}

export async function listImportProducts(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
) {
  await projectAccess(tx, actorId, projectId, 'read')
  return (await tx.select().from(bindings).where(eq(bindings.projectId, projectId))).map(view)
}

export async function bindImportProduct(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  input: ImportProductBind,
) {
  await projectAccess(tx, actorId, projectId, 'admin')
  const hash = payloadHash({ action: 'bind-import-product', input })
  const saved = await receipt(tx, projectId, actorId, input.operationId, hash)
  if (saved) return importProductBindingSchema.parse(saved.result)
  const [current] = await tx
    .select()
    .from(bindings)
    .where(and(eq(bindings.projectId, projectId), eq(bindings.origin, input.origin)))
  if ((current?.revisionId ?? null) !== input.expectedRevisionId)
    throw conflict('O vínculo foi alterado por outra pessoa. Atualize antes de salvar.')
  const existing = await tx
    .selectDistinct({ product: sql<string>`${entries.source}->>'product'` })
    .from(entries)
    .innerJoin(runs, eq(runs.id, entries.runId))
    .where(
      and(eq(runs.projectId, projectId), eq(runs.origin, input.origin), isNotNull(entries.result)),
    )
  const outside = existing.filter(({ product }) => !importProductAllowed(input, product))
  if (outside.length)
    throw conflict(
      `Este projeto já recebeu conteúdo de ${outside.map(({ product }) => product).join(', ')}. Preserve-o e prepare um projeto separado; trocar o vínculo não move nem reclassifica conteúdos.`,
    )
  const row = {
    projectId,
    origin: input.origin,
    product: input.product,
    includeShared: input.includeShared,
    revisionId: randomUUID(),
    updatedBy: actorId,
    updatedAt: new Date(),
  }
  await tx
    .insert(bindings)
    .values(row)
    .onConflictDoUpdate({ target: [bindings.projectId, bindings.origin], set: row })
  const result = view(row)
  await tx
    .insert(receipts)
    .values({ projectId, actorId, operationId: input.operationId, hash, result })
  await recordChange(tx, projectId, actorId, 'import', projectId, null)
  return result
}
