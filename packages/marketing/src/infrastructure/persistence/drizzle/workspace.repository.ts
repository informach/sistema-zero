import { randomUUID } from 'node:crypto'
import {
  type BatchResult,
  batchResultSchema,
  type ChangeEvent,
  type ChangePage,
  documentSchema,
  type EditorialBatch,
  type EditorialItem,
  type EditorialOperation,
  type Handoff,
  handoffSchema,
  type OperationResult,
  operationResultSchema,
  type Permission,
  type Project,
  permissions,
  projectSchema,
  type Revision,
} from '@sistemazero/marketing-contracts'
import { and, asc, desc, eq, gt, inArray, sql } from 'drizzle-orm'
import type {
  ProjectInput,
  WorkspaceRepository,
} from '../../../domain/ports/workspace-repository.port'
import { assertArtifactFreshness } from '../../../domain/workspace/artifact-freshness'
import { validateEditorialGraph } from '../../../domain/workspace/editorial-graph'
import { references } from '../../../domain/workspace/references'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import { freezeAnalysisBasis } from './analysis-basis'
import type { Database } from './db'
import { readEditorialGraph } from './editorial-graph-query'
import { createLearningPiece } from './learning-piece'
import { readProduction, recordProduction, voidProduction } from './production'
import { readProjectAnalytics } from './project-analytics'
import { readRevisionHistoryPage } from './revision-history-page'
import { readSnapshotPage } from './snapshot-page'
import {
  editorialAssets as assets,
  editorialChanges as changes,
  editorialHandoffs as handoffs,
  editorialItems as items,
  editorialMembers as members,
  editorialProjects as projects,
  editorialReceipts as receipts,
  editorialRevisions as revisions,
  editorialRuns as runs,
} from './workspace-schema'
export type WorkspaceTransaction = Parameters<Parameters<Database['transaction']>[0]>[0]
const inaccessible = () =>
  new WorkspaceError('OBJECT_INACCESSIBLE', 'Projeto ou objeto não disponível para esta conta')
const date = (value: Date) => new Date(value).toISOString()
export async function projectAccess(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  permission: Permission,
) {
  return resolveProjectAccess(tx, actorId, projectId, permission, true)
}
/** Read-only repeatable-read projections authorize against their own consistent
 * snapshot. Waiting on FOR UPDATE would instead cause serialization failures
 * when an import commits while the reader is waiting for the project lock. */
export async function snapshotProjectAccess(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
) {
  return resolveProjectAccess(tx, actorId, projectId, 'read', false)
}
async function resolveProjectAccess(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  permission: Permission,
  lock: boolean,
) {
  const query = tx.select().from(projects).where(eq(projects.id, projectId))
  const [project] = await (lock ? query.for('update') : query)
  if (!project) throw inaccessible()
  const [membership] = await tx
    .select()
    .from(members)
    .where(and(eq(members.projectId, projectId), eq(members.userId, actorId)))
  if (!membership?.permissions.includes(permission)) throw inaccessible()
  return { project, permissions: membership.permissions }
}
export async function receipt(
  tx: WorkspaceTransaction,
  projectId: string,
  actorId: string,
  operationId: string,
  hash: string,
) {
  const [saved] = await tx
    .select()
    .from(receipts)
    .where(
      and(
        eq(receipts.projectId, projectId),
        eq(receipts.actorId, actorId),
        eq(receipts.operationId, operationId),
      ),
    )
  if (saved && saved.hash !== hash)
    throw new WorkspaceError('OPERATION_REUSED', 'Esta operação já foi usada com outro conteúdo')
  return saved
}
export async function recordChange(
  tx: WorkspaceTransaction,
  projectId: string,
  actorId: string,
  type: ChangeEvent['type'],
  entityId: string | null,
  revisionId: string | null,
) {
  const [updated] = await tx
    .update(projects)
    .set({ sequence: sql`${projects.sequence}+1` })
    .where(eq(projects.id, projectId))
    .returning({ sequence: projects.sequence })
  if (!updated) throw inaccessible()
  await tx
    .insert(changes)
    .values({ projectId, actorId, type, entityId, revisionId, sequence: updated.sequence })
  return updated.sequence
}
function projectView(row: typeof projects.$inferSelect, granted: Permission[]): Project {
  return { ...row, createdAt: date(row.createdAt), permissions: granted }
}
function itemView(row: typeof items.$inferSelect, authorId?: string): EditorialItem {
  return {
    ...row,
    document: documentSchema.parse(row.document),
    updatedAt: date(row.updatedAt),
    ...(authorId ? { authorId } : {}),
  }
}
export class DrizzleWorkspaceRepository implements WorkspaceRepository {
  voidProduction(
    actorId: string,
    projectId: string,
    input: { operationId: string; recordId: string },
    hash: string,
  ) {
    return voidProduction(this.db, actorId, projectId, input, hash)
  }
  production(actorId: string, projectId: string, days: number) {
    return readProduction(this.db, actorId, projectId, days)
  }
  recordProduction(
    actorId: string,
    projectId: string,
    input: import('@sistemazero/marketing-contracts').RecordProduction,
    hash: string,
  ) {
    return recordProduction(this.db, actorId, projectId, input, hash)
  }
  analytics(actorId: string, projectId: string, days: number) {
    return readProjectAnalytics(this.db, actorId, projectId, days)
  }
  proposePiece(
    actorId: string,
    projectId: string,
    input: import('@sistemazero/marketing-contracts').LearningPiece,
    hash: string,
  ) {
    return createLearningPiece(this.db, actorId, projectId, input, hash)
  }
  constructor(private db: Database) {}
  actionReceipt(actorId: string, projectId: string, operationId: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      const [saved] = await tx
        .select({ result: receipts.result })
        .from(receipts)
        .where(
          and(
            eq(receipts.projectId, projectId),
            eq(receipts.actorId, actorId),
            eq(receipts.operationId, operationId),
          ),
        )
      return saved ? { found: true as const, result: saved.result } : { found: false as const }
    })
  }
  createHandoff(actorId: string, input: Handoff) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, input.projectId, 'read')
      const [revision] = await tx
        .select({ id: revisions.id })
        .from(revisions)
        .where(
          and(
            eq(revisions.id, input.revisionId),
            eq(revisions.entityId, input.entityId),
            eq(revisions.projectId, input.projectId),
          ),
        )
      if (!revision) throw inaccessible()
      if (input.runId) {
        const [run] = await tx
          .select()
          .from(runs)
          .where(
            and(
              eq(runs.id, input.runId),
              eq(runs.projectId, input.projectId),
              eq(runs.createdBy, actorId),
            ),
          )
        if (
          !run ||
          run.request.entityId !== input.entityId ||
          run.request.revisionId !== input.revisionId ||
          run.request.intent !== input.intent ||
          JSON.stringify(run.request.selection) !== JSON.stringify(input.selection)
        )
          throw inaccessible()
      }
      if (input.selection.length) {
        const selected = await tx
          .select({ id: items.id })
          .from(items)
          .where(
            and(
              eq(items.projectId, input.projectId),
              inArray(items.id, [...new Set(input.selection)]),
              eq(items.archived, false),
            ),
          )
        if (selected.length !== new Set(input.selection).size) throw inaccessible()
      }
      const id = randomUUID()
      await tx.insert(handoffs).values({
        id,
        projectId: input.projectId,
        userId: actorId,
        selection: input,
        expiresAt: new Date(input.expiresAt),
      })
      return { id, expiresAt: input.expiresAt }
    })
  }
  async resolveHandoff(actorId: string, id: string) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(handoffs)
        .where(
          and(
            eq(handoffs.id, id),
            eq(handoffs.userId, actorId),
            gt(handoffs.expiresAt, new Date()),
          ),
        )
      if (!row) throw inaccessible()
      await projectAccess(tx, actorId, row.projectId, 'read')
      return handoffSchema.parse(row.selection)
    })
  }
  async createProject(actorId: string, input: ProjectInput, hash: string): Promise<Project> {
    return this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(projects)
        .values({ id: input.id, name: input.name, product: input.product, createdBy: actorId })
        .onConflictDoNothing()
        .returning()
      if (inserted.length)
        await tx
          .insert(members)
          .values({ projectId: input.id, userId: actorId, permissions: [...permissions] })
      const { project, permissions: granted } = await projectAccess(tx, actorId, input.id, 'admin')
      const saved = await receipt(tx, input.id, actorId, input.operationId, hash)
      if (saved) return projectSchema.parse(saved.result)
      if (!inserted.length)
        throw new WorkspaceError('OPERATION_REUSED', 'Identificador do projeto já utilizado')
      const sequence = await recordChange(tx, input.id, actorId, 'project', input.id, null)
      const result = projectView({ ...project, sequence }, granted)
      await tx
        .insert(receipts)
        .values({ projectId: input.id, actorId, operationId: input.operationId, hash, result })
      return result
    })
  }
  async listProjects(actorId: string) {
    const rows = await this.db
      .select({ project: projects, permissions: members.permissions })
      .from(projects)
      .innerJoin(members, and(eq(members.projectId, projects.id), eq(members.userId, actorId)))
      .orderBy(asc(projects.name))
    return rows
      .filter((row) => row.permissions.includes('read'))
      .map((row) => projectView(row.project, row.permissions))
  }
  async snapshot(actorId: string, projectId: string) {
    return this.db.transaction(async (tx) => {
      const { project, permissions: granted } = await projectAccess(tx, actorId, projectId, 'read')
      const rows = await tx
        .select({ item: items, authorId: revisions.createdBy })
        .from(items)
        .innerJoin(revisions, eq(revisions.id, items.revisionId))
        .where(eq(items.projectId, projectId))
        .orderBy(asc(items.id))
      return {
        items: rows.map((row) => itemView(row.item, row.authorId)),
        cursor: project.sequence,
        permissions: granted,
      }
    })
  }
  async history(actorId: string, projectId: string, entityId: string): Promise<Revision[]> {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      const rows = await tx
        .select()
        .from(revisions)
        .where(and(eq(revisions.projectId, projectId), eq(revisions.entityId, entityId)))
        .orderBy(desc(revisions.createdAt), desc(revisions.id))
        .limit(200)
      return rows.map((row) => ({
        ...row,
        document: documentSchema.parse(row.document),
        createdAt: date(row.createdAt),
      }))
    })
  }
  async historyPage(actorId: string, projectId: string, entityId: string, before: string | null) {
    return this.db.transaction(
      async (tx) => {
        await snapshotProjectAccess(tx, actorId, projectId)
        return readRevisionHistoryPage(tx, projectId, entityId, before)
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
  async changes(actorId: string, projectId: string, cursor: number): Promise<ChangePage> {
    return this.db.transaction(async (tx) => {
      const { project, permissions: granted } = await projectAccess(tx, actorId, projectId, 'read')
      if (cursor > project.sequence)
        return {
          events: [],
          items: [],
          permissions: granted,
          cursor: project.sequence,
          hasMore: false,
          resetRequired: true,
        }
      const rows = await tx
        .select()
        .from(changes)
        .where(and(eq(changes.projectId, projectId), gt(changes.sequence, cursor)))
        .orderBy(asc(changes.sequence))
        .limit(26)
      const page = rows.slice(0, 25)
      const ids = page.flatMap((row) => (row.revisionId ? [row.revisionId] : []))
      const documents = ids.length
        ? await tx
            .select()
            .from(revisions)
            .where(and(eq(revisions.projectId, projectId), inArray(revisions.id, ids)))
        : []
      const byRevision = new Map(documents.map((row) => [row.id, row]))
      const latest = new Map<string, ChangePage['items'][number]>()
      for (const event of page) {
        if (!event.revisionId || !event.entityId || !['revision', 'archive'].includes(event.type))
          continue
        const revision = byRevision.get(event.revisionId)
        if (!revision) throw new Error('Histórico editorial inconsistente: revisão ausente')
        latest.set(event.entityId, {
          id: event.entityId,
          projectId,
          revisionId: revision.id,
          kind: revision.document.kind,
          document: documentSchema.parse(revision.document),
          archived: event.type === 'archive',
          updatedAt: date(revision.createdAt),
          authorId: revision.createdBy,
          sequence: event.sequence,
        })
      }
      return {
        events: page.map((row) => ({
          schemaVersion: 1 as const,
          ...row,
          createdAt: date(row.createdAt),
        })),
        items: [...latest.values()],
        permissions: granted,
        cursor: page.at(-1)?.sequence ?? cursor,
        hasMore: rows.length > 25,
        resetRequired: false,
      }
    })
  }
  async snapshotPage(
    actorId: string,
    projectId: string,
    cursor: import('@sistemazero/marketing-contracts').SnapshotCursor | null,
  ) {
    return this.db.transaction(
      async (tx) => {
        const { project, permissions } = await snapshotProjectAccess(tx, actorId, projectId)
        const at = cursor?.at ?? project.sequence
        if (at > project.sequence)
          throw new WorkspaceError(
            'CONTEXT_CHANGED',
            'O retrato não existe nesta sequência; reinicie a sincronização',
          )
        return readSnapshotPage(tx, projectId, at, permissions, cursor)
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
  async apply(actorId: string, op: EditorialOperation, hash: string): Promise<OperationResult> {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, op.projectId, 'edit')
      const saved = await receipt(tx, op.projectId, actorId, op.operationId, hash)
      if (saved) return operationResultSchema.parse(saved.result)
      const [current] = await tx.select().from(items).where(eq(items.id, op.entityId))
      if (current && current.projectId !== op.projectId) throw inaccessible()
      let result: OperationResult
      if ((current?.revisionId ?? null) !== op.baseRevisionId) {
        result = {
          status: 'conflict',
          code: 'REVISION_CONFLICT',
          operationId: op.operationId,
          entityId: op.entityId,
          baseRevisionId: op.baseRevisionId,
          currentRevisionId: current?.revisionId ?? null,
        }
      } else {
        const document =
          op.action === 'archive'
            ? current?.document
            : op.document
              ? await freezeAnalysisBasis(tx, op.projectId, op.document)
              : undefined
        if (!document) throw new WorkspaceError('VALIDATION_ERROR', 'Documento ausente')
        if (current && document.kind !== current.kind)
          throw new WorkspaceError('VALIDATION_ERROR', 'Adaptação exige uma nova representação')
        if (op.action === 'save') assertArtifactFreshness(current?.document, document)
        const revisionId = randomUUID()
        const updatedAt = new Date()
        const row = {
          id: op.entityId,
          projectId: op.projectId,
          kind: document.kind,
          revisionId,
          document,
          archived: op.action === 'archive',
          updatedAt,
        }
        if (current)
          await tx
            .update(items)
            .set(row)
            .where(and(eq(items.id, op.entityId), eq(items.projectId, op.projectId)))
        else await tx.insert(items).values(row)
        if (op.action === 'save') await this.validateReferences(tx, op.projectId, document)
        await this.validateGraph(tx, op.projectId, new Set([op.entityId]))
        await tx.insert(revisions).values({
          id: revisionId,
          projectId: op.projectId,
          entityId: op.entityId,
          parentRevisionId: op.baseRevisionId,
          document,
          createdBy: actorId,
          createdAt: updatedAt,
        })
        const sequence = await recordChange(
          tx,
          op.projectId,
          actorId,
          op.action === 'archive' ? 'archive' : 'revision',
          op.entityId,
          revisionId,
        )
        result = {
          status: 'applied',
          operationId: op.operationId,
          revisionId,
          sequence,
          entityId: op.entityId,
          item: itemView(row, actorId),
        }
      }
      await tx
        .insert(receipts)
        .values({ projectId: op.projectId, actorId, operationId: op.operationId, hash, result })
      return result
    })
  }
  private async validateReferences(
    tx: WorkspaceTransaction,
    projectId: string,
    document: import('@sistemazero/marketing-contracts').EditorialDocument,
  ) {
    const refs = references(document)
    if (refs.items.length) {
      const rows = await tx
        .select({ id: items.id, archived: items.archived })
        .from(items)
        .where(and(eq(items.projectId, projectId), inArray(items.id, refs.items)))
      if (rows.length !== refs.items.length || rows.some((r) => r.archived))
        throw new WorkspaceError(
          'DEPENDENCY_MISSING',
          'Uma referência está ausente, arquivada ou pertence a outro projeto',
        )
    }
    if (refs.revisions.length) {
      const rows = await tx
        .select({ id: revisions.id, entityId: revisions.entityId, document: revisions.document })
        .from(revisions)
        .where(and(eq(revisions.projectId, projectId), inArray(revisions.id, refs.revisions)))
      if (rows.length !== refs.revisions.length)
        throw new WorkspaceError('DEPENDENCY_MISSING', 'Revisão de origem indisponível')
      if (
        document.kind === 'piece' &&
        document.originAnalysis &&
        !rows.some(
          (row) =>
            row.id === document.originAnalysis?.revisionId &&
            row.entityId === document.originAnalysis.entityId &&
            row.document.kind === 'analysis',
        )
      )
        throw new WorkspaceError(
          'DEPENDENCY_MISSING',
          'A origem da pauta precisa apontar para a revisão da análise',
        )
      if (
        document.kind === 'analysis' &&
        (document.basis ?? []).some(
          (source) =>
            !rows.some((row) => row.id === source.revisionId && row.entityId === source.entityId),
        )
      )
        throw new WorkspaceError(
          'DEPENDENCY_MISSING',
          'A fonte do resumo não corresponde à revisão informada',
        )
      if (
        (document.kind === 'component' || document.kind === 'representation') &&
        document.sourceRevisionId &&
        rows.some(
          (row) => row.id === document.sourceRevisionId && row.document.kind !== document.kind,
        )
      )
        throw new WorkspaceError(
          'DEPENDENCY_MISSING',
          'A versão de origem precisa ter o mesmo tipo editorial',
        )
      if (
        document.kind === 'analysis' &&
        ['summary', 'decision'].includes(document.analysisType ?? '') &&
        rows.some((row) => row.document.kind === 'analysis')
      )
        throw new WorkspaceError(
          'DEPENDENCY_MISSING',
          'Vincule o resumo ou a decisão às fontes originais',
        )
    }
    if (refs.assets.length) {
      const rows = await tx
        .select({ id: assets.id, confirmed: assets.confirmed })
        .from(assets)
        .where(and(eq(assets.projectId, projectId), inArray(assets.id, refs.assets)))
      if (rows.length !== refs.assets.length || rows.some((r) => !r.confirmed))
        throw new WorkspaceError(
          'ASSET_UNCONFIRMED',
          'Confirme o envio dos arquivos antes de sincronizar a peça',
        )
    }
  }
  private async validateGraph(tx: WorkspaceTransaction, projectId: string, changed: Set<string>) {
    validateEditorialGraph(await readEditorialGraph(tx, projectId, changed), changed)
  }
  async applyBatch(actorId: string, input: EditorialBatch, hash: string): Promise<BatchResult> {
    return this.db.transaction((tx) => this.applyBatchInTransaction(tx, actorId, input, hash))
  }
  async applyBatchInTransaction(
    tx: WorkspaceTransaction,
    actorId: string,
    input: EditorialBatch,
    hash: string,
    guards: Array<{ entityId: string; id: string }> = [],
  ): Promise<BatchResult> {
    await projectAccess(tx, actorId, input.projectId, 'edit')
    const saved = await receipt(tx, input.projectId, actorId, input.operationId, hash)
    if (saved) return batchResultSchema.parse(saved.result)
    const rows = await tx
      .select()
      .from(items)
      .where(
        inArray(
          items.id,
          input.changes.map((change) => change.entityId),
        ),
      )
    if (rows.some((row) => row.projectId !== input.projectId)) throw inaccessible()
    const current = new Map(rows.map((row) => [row.id, row]))
    const conflicts = input.changes
      .filter(
        (change) => (current.get(change.entityId)?.revisionId ?? null) !== change.baseRevisionId,
      )
      .map((change) => ({
        entityId: change.entityId,
        baseRevisionId: change.baseRevisionId,
        currentRevisionId: current.get(change.entityId)?.revisionId ?? null,
      }))
    if (guards.length) {
      const guarded = await tx
        .select()
        .from(items)
        .where(
          and(
            eq(items.projectId, input.projectId),
            inArray(
              items.id,
              guards.map((guard) => guard.entityId),
            ),
          ),
        )
      for (const guard of guards) {
        const actual = guarded.find((item) => item.id === guard.entityId)
        if (
          (!actual || actual.archived || actual.revisionId !== guard.id) &&
          !conflicts.some((conflict) => conflict.entityId === guard.entityId)
        )
          conflicts.push({
            entityId: guard.entityId,
            baseRevisionId: guard.id,
            currentRevisionId: actual?.revisionId ?? null,
          })
      }
    }
    let result: BatchResult
    if (conflicts.length) result = { status: 'conflict', operationId: input.operationId, conflicts }
    else {
      const updates = input.changes.map((change) => {
        const before = current.get(change.entityId),
          document = change.action === 'archive' ? before?.document : change.document
        if (!document) throw new WorkspaceError('VALIDATION_ERROR', 'Documento ausente')
        if (before && before.kind !== document.kind)
          throw new WorkspaceError('VALIDATION_ERROR', 'Adaptação exige uma nova representação')
        if (change.action === 'save') assertArtifactFreshness(before?.document, document)
        return {
          change,
          row: {
            id: change.entityId,
            projectId: input.projectId,
            revisionId: randomUUID(),
            kind: document.kind,
            document,
            archived: change.action === 'archive',
            updatedAt: new Date(),
          },
        }
      })
      for (const { change, row } of updates) {
        if (change.action === 'save')
          row.document = await freezeAnalysisBasis(
            tx,
            input.projectId,
            row.document,
            updates.map((update) => update.row),
          )
      }
      for (const { row } of updates) {
        if (current.has(row.id))
          await tx
            .update(items)
            .set(row)
            .where(and(eq(items.id, row.id), eq(items.projectId, input.projectId)))
        else await tx.insert(items).values(row)
      }
      await this.validateGraph(
        tx,
        input.projectId,
        new Set(input.changes.map((change) => change.entityId)),
      )
      for (const { change, row } of updates) {
        await tx.insert(revisions).values({
          id: row.revisionId,
          projectId: input.projectId,
          entityId: row.id,
          parentRevisionId: change.baseRevisionId,
          document: row.document,
          createdBy: actorId,
          createdAt: row.updatedAt,
        })
      }
      let cursor = 0
      for (const { change, row } of updates) {
        if (change.action === 'save')
          await this.validateReferences(tx, input.projectId, row.document)
        cursor = await recordChange(
          tx,
          input.projectId,
          actorId,
          change.action === 'archive' ? 'archive' : 'revision',
          row.id,
          row.revisionId,
        )
      }
      result = {
        status: 'applied',
        operationId: input.operationId,
        items: updates.map(({ row }) => itemView(row, actorId)),
        cursor,
      }
    }
    await tx.insert(receipts).values({
      projectId: input.projectId,
      actorId,
      operationId: input.operationId,
      hash,
      result,
    })
    return result
  }
  async setMember(
    actorId: string,
    projectId: string,
    input: { operationId: string; userId: string; permissions: Permission[] },
    hash: string,
  ): Promise<{ updated: true }> {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'admin')
      const saved = await receipt(tx, projectId, actorId, input.operationId, hash)
      if (saved) return { updated: true }
      const granted = [...new Set(input.permissions)]
      if (granted.length && !granted.includes('read'))
        throw new WorkspaceError('VALIDATION_ERROR', 'Permissões de trabalho exigem leitura')
      if (!granted.includes('admin')) {
        const admins = await tx.select().from(members).where(eq(members.projectId, projectId))
        if (!admins.some((row) => row.userId !== input.userId && row.permissions.includes('admin')))
          throw new WorkspaceError(
            'VALIDATION_ERROR',
            'O projeto precisa manter ao menos um administrador',
          )
      }
      await tx
        .insert(members)
        .values({ projectId, userId: input.userId, permissions: granted })
        .onConflictDoUpdate({
          target: [members.projectId, members.userId],
          set: { permissions: granted },
        })
      await recordChange(tx, projectId, actorId, 'member', input.userId, null)
      await tx.insert(receipts).values({
        projectId,
        actorId,
        operationId: input.operationId,
        hash,
        result: { updated: true },
      })
      return { updated: true }
    })
  }
  members(actorId: string, projectId: string, permission: 'read' | 'admin' = 'read') {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, permission)
      return tx
        .select({ userId: members.userId, permissions: members.permissions })
        .from(members)
        .where(eq(members.projectId, projectId))
    })
  }
}
