import { createHash, randomUUID } from 'node:crypto'
import {
  batchOperationSchema,
  canonicalJson,
  type EditorialDocument,
  type ImportSourceLoad,
  type ImportSourceResult,
  importSourceResultSchema,
  isImportSourceAsset,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import { containsCredential } from '@sistemazero/marketing-import'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { Database } from './db'
import { requireImportProduct } from './import-product'
import {
  DrizzleWorkspaceRepository,
  projectAccess,
  receipt,
  recordChange,
  type WorkspaceTransaction,
} from './workspace.repository'
import {
  editorialAssets as assets,
  editorialImportDecisions as decisions,
  editorialImportEntries as entries,
  editorialItems as items,
  editorialReceipts as receipts,
  editorialRevisions as revisions,
  editorialImports as runs,
  editorialImportSourceTexts as sourceTexts,
  editorialImportSourceVersions as versions,
} from './workspace-schema'

const hash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex')
const invalid = (message: string) => new WorkspaceError('IMPORT_CONFLICT', message)
function fragments(text: string) {
  const result: string[] = []
  let rest = text
  while (rest.length > 99000) {
    let end = rest.lastIndexOf('\n', 99000) + 1
    if (end < 50000) end = 99000
    if (/^[\uD800-\uDBFF]$/.test(rest.charAt(end - 1))) end--
    result.push(rest.slice(0, end))
    rest = rest.slice(end)
  }
  result.push(rest)
  return result
}
/** Imported source versions are immutable. New source bytes never overwrite a team's edited item. */
export async function loadImportSource(
  db: Database,
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  runId: string,
  input: ImportSourceLoad,
): Promise<ImportSourceResult> {
  await projectAccess(tx, actorId, projectId, 'edit')
  const operationHash = hash({ runId, input }),
    saved = await receipt(tx, projectId, actorId, input.operationId, operationHash)
  if (saved) return importSourceResultSchema.parse(saved.result)
  const [run] = await tx
    .select()
    .from(runs)
    .where(and(eq(runs.id, runId), eq(runs.projectId, projectId)))
  if (run?.state !== 'inventoried')
    throw invalid('Confirme o inventário antes de carregar as origens')
  const [entry] = await tx
    .select()
    .from(entries)
    .where(and(eq(entries.runId, runId), eq(entries.ordinal, input.ordinal)))
  const source = entry?.source
  if (!entry || !source?.sha256 || !['eligible', 'review'].includes(source.disposition))
    throw invalid('Origem excluída, pendente ou ausente do inventário')
  await requireImportProduct(tx, projectId, run.origin, source.product)
  const [decision] = await tx
    .select()
    .from(decisions)
    .where(and(eq(decisions.runId, runId), eq(decisions.ordinal, input.ordinal)))
  if (decision && decision.decision.state !== 'pending')
    throw invalid(
      'Uma decisão registrada mantém esta origem fora da carga. Reabra a pendência antes de importar',
    )
  const identity = and(
    eq(versions.projectId, projectId),
    eq(versions.origin, run.origin),
    eq(versions.sourcePath, source.path),
  )
  let text: string | null = null,
    assetId: string | null = null
  if (input.content.kind === 'text') {
    const bytes = Buffer.from(input.content.base64, 'base64')
    if (
      bytes.toString('base64') !== input.content.base64 ||
      bytes.length !== source.bytes ||
      createHash('sha256').update(bytes).digest('hex') !== source.sha256
    )
      throw invalid('O conteúdo não corresponde aos bytes do inventário')
    try {
      text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
    } catch {
      throw invalid('O arquivo não é texto UTF-8 válido; preserve-o como arquivo de origem')
    }
    if (containsCredential(text))
      throw invalid('Possível credencial; esta origem não pode entrar na biblioteca')
  } else {
    const [asset] = await tx
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.projectId, projectId),
          eq(assets.id, input.content.assetId),
          eq(assets.confirmed, true),
        ),
      )
    if (
      !asset ||
      asset.manifest.projectId !== projectId ||
      !isImportSourceAsset(asset.manifest) ||
      asset.manifest.sha256 !== source.sha256 ||
      asset.manifest.size !== source.bytes
    )
      throw invalid('Confirme o arquivo original com o mesmo hash antes de vinculá-lo')
    assetId = asset.id
  }
  const [existing] = await tx
    .select()
    .from(versions)
    .where(and(identity, eq(versions.sourceHash, source.sha256)))
  let result: ImportSourceResult
  if (existing) {
    const originals = await tx
      .select({ document: revisions.document })
      .from(revisions)
      .where(
        and(
          eq(revisions.projectId, projectId),
          inArray(
            revisions.id,
            existing.destinations.map((destination) => destination.revisionId),
          ),
        ),
      )
    result = {
      status: 'reused',
      sourceVersionId: existing.id,
      sourceHash: source.sha256,
      destinations: existing.destinations,
      previousSourceVersion: existing.previousSourceVersion,
      classificationReview:
        originals.length !== existing.destinations.length ||
        originals.some(
          ({ document }) =>
            document.kind !== 'evidence' ||
            document.product !== source.product ||
            !document.tags.includes(source.category) ||
            document.validity !== (source.validity === 'historical' ? 'historical' : 'unverified'),
        ),
    }
  } else {
    const previous = await tx.select({ id: versions.id }).from(versions).where(identity).limit(1)
    const bodies =
      text === null ? [`Arquivo de origem: ${source.path}\n${source.reason}`] : fragments(text)
    const sourceKey = `${run.origin}:${source.path}`
    const documents: Array<{ id: string; document: EditorialDocument }> = []
    for (const [index, body] of bodies.entries())
      documents.push({
        id: await stableEditorialId(
          `${projectId}:import-source:${sourceKey}:${source.sha256}:${index}`,
        ),
        document: {
          schemaVersion: 1,
          kind: 'evidence',
          title:
            `${source.path.split('/').at(-1)}${bodies.length > 1 ? ` · parte ${index + 1}/${bodies.length}` : ''}`.slice(
              0,
              300,
            ),
          body,
          classification: 'reference',
          source: {
            label: source.path.slice(0, 500),
            sourceKey,
            sha256: source.sha256,
            observedAt: run.capturedAt.toISOString(),
          },
          product: source.product,
          validity: source.validity === 'historical' ? 'historical' : 'unverified',
          tags: ['acervo', 'carga-preparatoria', source.category, run.origin],
          ...(assetId ? { assetIds: [assetId] } : {}),
        },
      })
    // Adopt only the exact preparatory sample reference, never a similar or edited document.
    const legacy =
      bodies.length === 1 && text !== null
        ? await tx
            .select()
            .from(items)
            .where(
              and(
                eq(items.projectId, projectId),
                eq(items.kind, 'evidence'),
                eq(items.archived, false),
                sql`${items.document}->'source'->>'sourceKey'=${source.path}`,
                sql`${items.document}->'source'->>'sha256'=${source.sha256}`,
              ),
            )
            .limit(2)
        : []
    const match =
      legacy.length === 1 &&
      legacy[0]?.document.kind === 'evidence' &&
      legacy[0].document.body === text &&
      legacy[0].document.tags.includes('carga-preparatoria') &&
      !legacy[0].document.assetIds?.length
        ? legacy[0]
        : null
    let destinations: ImportSourceResult['destinations']
    if (match) destinations = [{ entityId: match.id, revisionId: match.revisionId }]
    else {
      const batch = batchOperationSchema.parse({
        schemaVersion: 1,
        projectId,
        operationId: await stableEditorialId(`${input.operationId}:source-batch`),
        changes: documents.map((value) => ({
          entityId: value.id,
          baseRevisionId: null,
          action: 'save',
          document: value.document,
        })),
      })
      const applied = await new DrizzleWorkspaceRepository(db).applyBatchInTransaction(
        tx,
        actorId,
        batch,
        hash(batch),
      )
      if (applied.status !== 'applied')
        throw invalid(
          'A identidade editorial já foi usada; os documentos existentes foram preservados',
        )
      destinations = applied.items.map((item) => ({
        entityId: item.id,
        revisionId: item.revisionId,
      }))
    }
    const id = randomUUID()
    await tx.insert(versions).values({
      id,
      projectId,
      origin: run.origin,
      sourcePath: source.path,
      sourceHash: source.sha256,
      destinations,
      previousSourceVersion: previous.length > 0,
    })
    result = {
      status: 'imported',
      sourceVersionId: id,
      sourceHash: source.sha256,
      destinations,
      previousSourceVersion: previous.length > 0,
    }
  }
  if (text !== null)
    await tx
      .insert(sourceTexts)
      .values({ sourceVersionId: result.sourceVersionId, text })
      .onConflictDoNothing()
  await tx
    .update(entries)
    .set({ result })
    .where(and(eq(entries.runId, runId), eq(entries.ordinal, input.ordinal)))
  await tx
    .insert(receipts)
    .values({ projectId, actorId, operationId: input.operationId, hash: operationHash, result })
  await recordChange(tx, projectId, actorId, 'import', runId, null)
  return result
}
