import { createHash, randomUUID } from 'node:crypto'
import {
  type ApprovedEdition,
  type ApproveEdition,
  approvedEditionSchema,
  canonicalJson,
  editionSummarySchema,
  revisionSchema,
} from '@sistemazero/marketing-contracts'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { ApprovalRepository } from '../../../domain/ports/approval-repository.port'
import { editionSnapshot } from '../../../domain/workspace/approval'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { Database } from './db'
import {
  projectAccess,
  receipt,
  recordChange,
  type WorkspaceTransaction,
} from './workspace.repository'
import {
  editorialAssets as assets,
  editorialEditions as editions,
  editorialItems as items,
  editorialReceipts as receipts,
  editorialRevisions as revisions,
} from './workspace-schema'

async function candidate(tx: WorkspaceTransaction, projectId: string, representationId: string) {
  const current = async (ids: string[]) => {
    const distinct = [...new Set(ids)]
    if (!distinct.length) return []
    const rows = await tx
      .select()
      .from(items)
      .where(
        and(eq(items.projectId, projectId), eq(items.archived, false), inArray(items.id, distinct)),
      )
    if (rows.length !== distinct.length)
      throw new WorkspaceError(
        'DEPENDENCY_MISSING',
        'Uma peça ou referência da entrega foi removida',
      )
    return rows
  }
  const representation = (await current([representationId]))[0]
  if (representation?.document.kind !== 'representation')
    throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Formato não disponível')
  const piece = (await current([representation.document.pieceId]))[0]
  if (piece?.document.kind !== 'piece')
    throw new WorkspaceError('DEPENDENCY_MISSING', 'Peça não disponível')
  const components = await current(representation.document.componentIds)
  const directions = await tx
    .select()
    .from(items)
    .where(
      and(
        eq(items.projectId, projectId),
        eq(items.archived, false),
        eq(items.kind, 'direction'),
        sql`coalesce(${items.document}->>'status','current')='current'`,
      ),
    )
    .limit(6)
  if (directions.length > 5)
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'Consolide a direção vigente em até cinco documentos antes de aprovar',
    )
  const referenceIds = [
    ...piece.document.evidenceIds,
    ...directions.flatMap((item) =>
      item.document.kind === 'direction' ? item.document.referenceIds : [],
    ),
  ]
  const sources = await current(referenceIds)
  const all = [
    ...new Map(
      [representation, piece, ...components, ...directions, ...sources].map((item) => [
        item.id,
        item,
      ]),
    ).values(),
  ]
  if (all.length > 250)
    throw new WorkspaceError('INVALID_OPERATION', 'A entrega tem mais de 250 revisões de contexto')
  const frozen = await tx
    .select()
    .from(revisions)
    .where(
      and(
        eq(revisions.projectId, projectId),
        inArray(
          revisions.id,
          all.map((item) => item.revisionId),
        ),
      ),
    )
  if (frozen.length !== all.length)
    throw new WorkspaceError('DEPENDENCY_MISSING', 'Uma revisão da entrega não está disponível')
  const finalIds = [
    ...new Set(
      components.flatMap((item) =>
        item.document.kind === 'component' || item.document.kind === 'video'
          ? (item.document.assetIds ?? [])
          : [],
      ),
    ),
  ]
  const confirmed = finalIds.length
    ? await tx
        .select()
        .from(assets)
        .where(
          and(
            eq(assets.projectId, projectId),
            eq(assets.confirmed, true),
            inArray(assets.id, finalIds),
          ),
        )
    : []
  const snapshot = editionSnapshot(
    projectId,
    representationId,
    frozen.map((revision) =>
      revisionSchema.parse({ ...revision, createdAt: revision.createdAt.toISOString() }),
    ),
    confirmed.map((row) => row.manifest),
  )
  return { snapshot, hash: createHash('sha256').update(canonicalJson(snapshot)).digest('hex') }
}

export class DrizzleApprovalRepository implements ApprovalRepository {
  constructor(private readonly db: Database) {}
  get(actorId: string, projectId: string, editionId: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      const [row] = await tx
        .select({ edition: editions.edition })
        .from(editions)
        .where(and(eq(editions.projectId, projectId), eq(editions.id, editionId)))
      if (!row) throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Edição não disponível')
      return approvedEditionSchema.parse(row.edition)
    })
  }
  preview(actorId: string, projectId: string, representationId: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      return candidate(tx, projectId, representationId)
    })
  }
  approve(actorId: string, projectId: string, input: ApproveEdition, requestHash: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'approve')
      const previous = await receipt(tx, projectId, actorId, input.operationId, requestHash)
      if (previous) return approvedEditionSchema.parse(previous.result)
      const current = await candidate(tx, projectId, input.representationId)
      if (current.hash !== input.expectedHash)
        throw new WorkspaceError(
          'CONTEXT_CHANGED',
          'A entrega mudou durante a conferência. Carregue a revisão atual antes de aprovar.',
        )
      const [clock] = await tx
        .select({ now: sql<string>`clock_timestamp()::text` })
        .from(sql`(select 1) as clock`)
      if (!clock) throw new Error('Relógio do banco indisponível')
      const edition: ApprovedEdition = approvedEditionSchema.parse({
        schemaVersion: 1,
        id: randomUUID(),
        ...current,
        approvedBy: actorId,
        approvedAt: new Date(clock.now).toISOString(),
        checks: input.checks,
      })
      await tx.insert(editions).values({
        id: edition.id,
        projectId,
        representationId: input.representationId,
        hash: edition.hash,
        edition,
        approvedBy: actorId,
        approvedAt: new Date(edition.approvedAt),
      })
      await tx.insert(receipts).values({
        projectId,
        actorId,
        operationId: input.operationId,
        hash: requestHash,
        result: edition,
      })
      await recordChange(tx, projectId, actorId, 'approval', input.representationId, null)
      return edition
    })
  }
  list(actorId: string, projectId: string, representationId: string, before?: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      const cursor = before
        ? (
            await tx
              .select({ id: editions.id, approvedAt: editions.approvedAt })
              .from(editions)
              .where(
                and(
                  eq(editions.projectId, projectId),
                  eq(editions.representationId, representationId),
                  eq(editions.id, before),
                ),
              )
          )[0]
        : undefined
      if (before && !cursor)
        throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Edição não disponível')
      const page = await tx
        .select({
          id: editions.id,
          hash: editions.hash,
          approvedBy: editions.approvedBy,
          approvedAt: editions.approvedAt,
          assetCount: sql<number>`jsonb_array_length(${editions.edition}->'snapshot'->'orderedAssets')`,
        })
        .from(editions)
        .where(
          and(
            eq(editions.projectId, projectId),
            eq(editions.representationId, representationId),
            cursor
              ? sql`(${editions.approvedAt},${editions.id})<(${cursor.approvedAt.toISOString()}::timestamptz,${cursor.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(editions.approvedAt), desc(editions.id))
        .limit(26)
      return {
        items: page
          .slice(0, 25)
          .map((row) =>
            editionSummarySchema.parse({ ...row, approvedAt: row.approvedAt.toISOString() }),
          ),
        nextCursor: page.length > 25 ? (page[24]?.id ?? null) : null,
      }
    })
  }
}
