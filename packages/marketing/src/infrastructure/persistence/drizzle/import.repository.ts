import { createHash } from 'node:crypto'
import {
  canonicalJson,
  type ImportChunk,
  type ImportStart,
  importRunSchema,
  inventoryDigestBoundary,
} from '@sistemazero/marketing-contracts'
import { and, asc, desc, eq, gte, lt } from 'drizzle-orm'
import type { ImportRepository } from '../../../domain/ports/import-repository.port'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { Database } from './db'
import { loadImportSource } from './import-source'
import { projectAccess, recordChange, type WorkspaceTransaction } from './workspace.repository'
import { editorialImportEntries as entries, editorialImports as runs } from './workspace-schema'

const conflict = (message: string) => new WorkspaceError('IMPORT_CONFLICT', message)
const view = (row: typeof runs.$inferSelect) =>
  importRunSchema.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
    capturedAt: row.capturedAt.toISOString(),
  })
async function run(tx: WorkspaceTransaction, projectId: string, runId: string) {
  const [row] = await tx
    .select()
    .from(runs)
    .where(and(eq(runs.projectId, projectId), eq(runs.id, runId)))
  if (!row) throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Carga não disponível neste projeto')
  return row
}
export class DrizzleImportRepository implements ImportRepository {
  constructor(private readonly db: Database) {}
  loadSource(
    actorId: string,
    projectId: string,
    runId: string,
    input: import('@sistemazero/marketing-contracts').ImportSourceLoad,
  ) {
    return this.db.transaction((tx) =>
      loadImportSource(this.db, tx, actorId, projectId, runId, input),
    )
  }
  start(actorId: string, projectId: string, input: ImportStart) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'edit')
      const [existing] = await tx.select().from(runs).where(eq(runs.id, input.id))
      if (existing) {
        if (
          existing.projectId !== projectId ||
          existing.createdBy !== actorId ||
          existing.digest !== input.digest ||
          existing.origin !== input.origin ||
          existing.entryCount !== input.entryCount ||
          existing.policyVersion !== input.policyVersion ||
          existing.capturedAt.getTime() !== new Date(input.capturedAt).getTime()
        )
          throw conflict('Identidade da carga já utilizada com outra origem ou conteúdo')
        return view(existing)
      }
      const active = await tx
        .select({ id: runs.id })
        .from(runs)
        .where(and(eq(runs.projectId, projectId), eq(runs.state, 'receiving')))
        .limit(5)
      if (active.length >= 5)
        throw conflict('Conclua ou desative as cargas pendentes antes de iniciar outra')
      const [created] = await tx
        .insert(runs)
        .values({ ...input, capturedAt: new Date(input.capturedAt), projectId, createdBy: actorId })
        .returning()
      if (!created) throw new Error('Carga não criada')
      await recordChange(tx, projectId, actorId, 'import', input.id, null)
      return view(created)
    })
  }
  chunk(actorId: string, projectId: string, runId: string, input: ImportChunk) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'edit')
      const row = await run(tx, projectId, runId)
      if (row.createdBy !== actorId)
        throw conflict('Somente o autor pode completar este inventário')
      if (row.state === 'retired')
        throw conflict('Carga desativada; preserve o histórico e inicie outra')
      if (input.offset < row.received) {
        const previous = await tx
          .select()
          .from(entries)
          .where(
            and(
              eq(entries.runId, runId),
              gte(entries.ordinal, input.offset),
              lt(entries.ordinal, input.offset + input.entries.length),
            ),
          )
          .orderBy(asc(entries.ordinal))
        if (canonicalJson(previous.map((e) => e.source)) !== canonicalJson(input.entries))
          throw conflict('Trecho já recebido com conteúdo diferente')
        return view(row)
      }
      if (
        row.state !== 'receiving' ||
        input.offset !== row.received ||
        input.offset + input.entries.length > row.entryCount
      )
        throw conflict('Trecho fora da sequência esperada; consulte a posição confirmada')
      const [last] = await tx
        .select({ sourcePath: entries.sourcePath })
        .from(entries)
        .where(eq(entries.runId, runId))
        .orderBy(desc(entries.ordinal))
        .limit(1)
      let previous = last?.sourcePath
      for (const source of input.entries) {
        if (previous !== undefined && source.path <= previous)
          throw conflict('Origens duplicadas ou fora de ordem')
        previous = source.path
      }
      await tx.insert(entries).values(
        input.entries.map((source, index) => ({
          runId,
          ordinal: input.offset + index,
          sourcePath: source.path,
          source,
        })),
      )
      const [updated] = await tx
        .update(runs)
        .set({ received: row.received + input.entries.length })
        .where(eq(runs.id, runId))
        .returning()
      if (!updated) throw new Error('Carga desapareceu')
      return view(updated)
    })
  }
  finish(actorId: string, projectId: string, runId: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'edit')
      const row = await run(tx, projectId, runId)
      if (row.createdBy !== actorId)
        throw conflict('Somente o autor pode confirmar este inventário')
      if (row.state === 'inventoried') return view(row)
      if (row.state !== 'receiving' || row.received !== row.entryCount)
        throw conflict('Inventário ainda incompleto ou desativado')
      const boundary = inventoryDigestBoundary(row.origin, row.policyVersion),
        hash = createHash('sha256').update(boundary.prefix)
      let count = 0
      for (;;) {
        const page = await tx
          .select({ ordinal: entries.ordinal, source: entries.source })
          .from(entries)
          .where(and(eq(entries.runId, runId), gte(entries.ordinal, count)))
          .orderBy(asc(entries.ordinal))
          .limit(500)
        for (const entry of page) {
          if (entry.ordinal !== count) throw conflict('Inventário contém uma lacuna')
          hash.update(`${count ? ',' : ''}${canonicalJson(entry.source)}`)
          count++
        }
        if (page.length < 500) break
      }
      const digest = hash.update(boundary.suffix).digest('hex')
      if (count !== row.entryCount || digest !== row.digest)
        throw conflict('O retrato recebido não corresponde ao hash do inventário')
      const [updated] = await tx
        .update(runs)
        .set({ state: 'inventoried' })
        .where(eq(runs.id, runId))
        .returning()
      if (!updated) throw new Error('Carga desapareceu')
      await recordChange(tx, projectId, actorId, 'import', runId, null)
      return view(updated)
    })
  }
  retire(actorId: string, projectId: string, runId: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'admin')
      const row = await run(tx, projectId, runId)
      if (row.state === 'retired') return view(row)
      const [updated] = await tx
        .update(runs)
        .set({ state: 'retired' })
        .where(eq(runs.id, runId))
        .returning()
      if (!updated) throw new Error('Carga desapareceu')
      await recordChange(tx, projectId, actorId, 'import', runId, null)
      return view(updated)
    })
  }
  list(actorId: string, projectId: string, before: string | null) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      return (
        await tx
          .select()
          .from(runs)
          .where(and(eq(runs.projectId, projectId), before ? lt(runs.id, before) : undefined))
          .orderBy(desc(runs.id))
          .limit(30)
      ).map(view)
    })
  }
  page(actorId: string, projectId: string, runId: string, cursor: number) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      const row = await run(tx, projectId, runId)
      const page = await tx
        .select({ ordinal: entries.ordinal, source: entries.source, result: entries.result })
        .from(entries)
        .where(and(eq(entries.runId, runId), gte(entries.ordinal, cursor)))
        .orderBy(asc(entries.ordinal))
        .limit(101)
      return { run: view(row), entries: page.slice(0, 100), nextCursor: page[100]?.ordinal ?? null }
    })
  }
}
