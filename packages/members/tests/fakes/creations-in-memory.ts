import { randomUUID } from 'node:crypto'
import {
  type CreationPartRef,
  type CreationRecord,
  type CreationSummary,
  type CreationTool,
  emptyCountByTool,
} from '../../src/domain/creations/creation'
import {
  classifyPintaPaletteLibraryCreation,
  isPintaPaletteLibraryCreation,
} from '../../src/domain/creations/palette-library'
import type {
  CreationCommitResult,
  CreationListPage,
  CreationsRepository,
  CreationUploadInput,
  CreationUploadReservation,
  CreationUsage,
} from '../../src/domain/ports/creations-repository.port'
import { resolveParts } from '../../src/infrastructure/persistence/drizzle/creations.repository'

const key = (userId: string, tool: CreationTool, itemId: string): string =>
  `${userId}|${tool}|${itemId}`

const summaryOf = (row: CreationRecord): CreationSummary => {
  const summary: CreationSummary = {
    tool: row.tool,
    itemId: row.itemId,
    name: row.name,
    kind: row.kind,
    itemUpdatedAt: row.itemUpdatedAt,
    revision: row.revision,
    bytes: row.bytes,
    thumb: row.thumb,
    syncedAt: row.syncedAt,
  }
  if (row.deletedAt) summary.deletedAt = row.deletedAt
  return summary
}

const aliveCommitted = (row: CreationRecord): boolean =>
  row.deletedAt === null && row.storageRef !== null

/**
 * Espelho em memória do `DrizzleCreationsRepository` — as MESMAS regras: a reserva só
 * escreve em `pending`/`lastReservedRevision` (nada do que a lista mostra), a quota é
 * conferida na reserva, o commit promove a reserva e é idempotente para a revisão
 * corrente, o contador de revisões nunca volta.
 */
export class InMemoryCreationsRepository implements CreationsRepository {
  readonly rows = new Map<string, CreationRecord>()

  async list(userId: string, tool: CreationTool): Promise<CreationSummary[]> {
    return [...this.rows.values()]
      .filter(
        (r) =>
          r.userId === userId && r.tool === tool && (aliveCommitted(r) || r.deletedAt !== null),
      )
      .sort((a, b) => b.itemUpdatedAt.getTime() - a.itemUpdatedAt.getTime())
      .map(summaryOf)
  }

  async listPage(
    userId: string,
    tool: CreationTool,
    options: { limit: number; cursor?: { itemUpdatedAt: Date; itemId: string } },
  ): Promise<CreationListPage> {
    const all = (await this.list(userId, tool)).sort(
      (a, b) =>
        b.itemUpdatedAt.getTime() - a.itemUpdatedAt.getTime() || b.itemId.localeCompare(a.itemId),
    )
    const eligible = options.cursor
      ? all.filter(
          (item) =>
            item.itemUpdatedAt < options.cursor!.itemUpdatedAt ||
            (item.itemUpdatedAt.getTime() === options.cursor!.itemUpdatedAt.getTime() &&
              item.itemId < options.cursor!.itemId),
        )
      : all
    const items = eligible.slice(0, options.limit)
    const last = items.at(-1)
    return {
      items,
      nextCursor:
        eligible.length > options.limit && last
          ? { itemUpdatedAt: last.itemUpdatedAt, itemId: last.itemId }
          : null,
    }
  }

  async compactTombstones(cutoff: Date, limit: number): Promise<number> {
    const doomed = [...this.rows.entries()]
      .filter(([, row]) => row.deletedAt !== null && row.deletedAt < cutoff)
      .sort((a, b) => (a[1].deletedAt as Date).getTime() - (b[1].deletedAt as Date).getTime())
      .slice(0, limit)
    for (const [rowKey] of doomed) this.rows.delete(rowKey)
    return doomed.length
  }

  async get(userId: string, tool: CreationTool, itemId: string): Promise<CreationRecord | null> {
    const row = this.rows.get(key(userId, tool, itemId))
    return row ? { ...row, pending: row.pending ? { ...row.pending } : null } : null
  }

  async usage(userId: string): Promise<CreationUsage> {
    const countByTool = emptyCountByTool()
    let totalBytes = 0
    for (const row of this.rows.values()) {
      if (row.userId !== userId || !aliveCommitted(row)) continue
      // A biblioteca de paletas não ocupa vaga (os bytes contam) — espelho do SQL.
      if (!isPintaPaletteLibraryCreation(row)) countByTool[row.tool] += 1
      totalBytes += row.bytes
    }
    return { totalBytes, countByTool }
  }

  async reserveUpload(input: CreationUploadInput): Promise<CreationUploadReservation> {
    const k = key(input.userId, input.tool, input.itemId)
    const existing = this.rows.get(k)
    const nextIdentity = classifyPintaPaletteLibraryCreation(input)
    if (nextIdentity === 'invalid-partial') {
      return { ok: false, reason: 'palette-library-identity' }
    }
    const currentIdentity = existing ? classifyPintaPaletteLibraryCreation(existing) : null
    if (
      existing &&
      currentIdentity !== nextIdentity &&
      (currentIdentity === 'palette-library' || nextIdentity === 'palette-library')
    ) {
      return { ok: false, reason: 'palette-library-identity' }
    }
    const usage = await this.usage(input.userId)
    const alive = existing !== undefined && existing.deletedAt === null
    const committedParts = new Map(
      alive && existing.storageRef ? existing.parts.map((part) => [part.hash, part]) : [],
    )
    const revision = existing ? existing.lastReservedRevision + 1 : 1
    const resolved = resolveParts(input.parts ?? [], committedParts, revision)
    if (resolved.unsized.length > 0) {
      return { ok: false, reason: 'parts-need-bytes', hashes: resolved.unsized }
    }
    const totalBytes = input.bytes + resolved.all.reduce((sum, part) => sum + part.bytes, 0)
    if (totalBytes > input.limits.maxItemBytes) return { ok: false, reason: 'item-bytes' }
    const currentBytes = alive && existing.storageRef ? existing.bytes : 0
    if (usage.totalBytes - currentBytes + totalBytes > input.limits.maxTotalBytes) {
      return { ok: false, reason: 'total-bytes' }
    }
    const committedAlive = alive && existing.storageRef !== null
    const currentItemCount =
      committedAlive && existing && !isPintaPaletteLibraryCreation(existing) ? 1 : 0
    const nextItemCount = nextIdentity === 'palette-library' ? 0 : 1
    if (
      usage.countByTool[input.tool] - currentItemCount + nextItemCount >
      input.limits.maxItemsPerTool
    ) {
      return { ok: false, reason: 'items-per-tool' }
    }
    const currentRevision = existing?.revision ?? 0
    if (input.baseRevision !== undefined && input.baseRevision !== currentRevision) {
      return { ok: false, reason: 'stale-base', currentRevision }
    }
    const pending = {
      bytes: totalBytes,
      name: input.name,
      kind: input.kind,
      itemUpdatedAt: input.itemUpdatedAt,
      thumb: input.thumb,
      parts: resolved.all,
    }
    if (!existing) {
      this.rows.set(k, {
        id: randomUUID(),
        userId: input.userId,
        accountId: input.accountId,
        tool: input.tool,
        itemId: input.itemId,
        name: input.name,
        kind: input.kind,
        itemUpdatedAt: input.itemUpdatedAt,
        revision: 0,
        lastReservedRevision: 1,
        pending: { revision: 1, ...pending },
        bytes: 0,
        storageRef: null,
        thumb: null,
        parts: [],
        deletedAt: null,
        createdAt: input.now,
        syncedAt: input.now,
      })
      return { ok: true, revision: 1, missingParts: resolved.missing }
    }
    this.rows.set(k, {
      ...existing,
      lastReservedRevision: revision,
      pending: { revision, ...pending },
    })
    return { ok: true, revision, missingParts: resolved.missing }
  }

  async commit(input: {
    userId: string
    tool: CreationTool
    itemId: string
    revision: number
    storageRef: string
    uploadedParts?: readonly string[]
    now: Date
    limits: CreationUploadInput['limits']
  }): Promise<CreationCommitResult> {
    const k = key(input.userId, input.tool, input.itemId)
    const existing = this.rows.get(k)
    if (!existing) return { ok: false }
    // Idempotente MESMO com outra reserva em voo (igual ao Drizzle).
    if (existing.revision === input.revision && existing.storageRef) {
      return { ok: true, alreadyCommitted: true, previousStorageRef: null, releasedPartRefs: [] }
    }
    if (!existing.pending || existing.pending.revision !== input.revision) return { ok: false }
    const usage = await this.usage(input.userId)
    const committedAlive = existing.deletedAt === null && existing.storageRef !== null
    const currentBytes = committedAlive ? existing.bytes : 0
    const overBytes =
      usage.totalBytes - currentBytes + existing.pending.bytes > input.limits.maxTotalBytes
    const currentIdentity = classifyPintaPaletteLibraryCreation(existing)
    const pendingIdentity = classifyPintaPaletteLibraryCreation({
      tool: input.tool,
      itemId: input.itemId,
      kind: existing.pending.kind,
    })
    const invalidIdentity =
      pendingIdentity === 'invalid-partial' ||
      (currentIdentity !== pendingIdentity &&
        (currentIdentity === 'palette-library' || pendingIdentity === 'palette-library'))
    if (invalidIdentity) {
      this.rows.set(k, { ...existing, pending: null })
      return { ok: false, reason: 'palette-library-identity' }
    }
    const currentItemCount = committedAlive && currentIdentity !== 'palette-library' ? 1 : 0
    const nextItemCount = pendingIdentity === 'palette-library' ? 0 : 1
    const overItems =
      usage.countByTool[input.tool] - currentItemCount + nextItemCount >
      input.limits.maxItemsPerTool
    if (overBytes || overItems) {
      // Recusa por quota mata a reserva (o BFF apaga o blob dela): o cliente reserva de novo.
      this.rows.set(k, { ...existing, pending: null })
      return { ok: false, reason: overBytes ? 'total-bytes' : 'items-per-tool' }
    }
    const committed = committedAlive ? existing.parts : []
    const committedSet = new Set(committed.map((part) => part.hash))
    const uploaded = new Set(input.uploadedParts ?? [])
    const missing = existing.pending.parts
      .filter((part) => !committedSet.has(part.hash) && !uploaded.has(part.hash))
      .map((part) => part.hash)
    if (missing.length > 0) return { ok: false, reason: 'parts-missing', hashes: missing }
    const previous =
      existing.storageRef && existing.storageRef !== input.storageRef ? existing.storageRef : null
    const nextParts: CreationPartRef[] = existing.pending.parts.map((part) => ({ ...part }))
    const nextSet = new Set(nextParts.map((part) => part.hash))
    this.rows.set(k, {
      ...existing,
      revision: input.revision,
      storageRef: input.storageRef,
      bytes: existing.pending.bytes,
      name: existing.pending.name,
      kind: existing.pending.kind,
      itemUpdatedAt: existing.pending.itemUpdatedAt,
      thumb: existing.pending.thumb,
      parts: nextParts,
      pending: null,
      deletedAt: null,
      syncedAt: input.now,
    })
    return {
      ok: true,
      alreadyCommitted: false,
      previousStorageRef: previous,
      releasedPartRefs: committed.filter((part) => !nextSet.has(part.hash)),
    }
  }

  async softDelete(
    userId: string,
    tool: CreationTool,
    itemId: string,
    baseRevision: number,
    now: Date,
  ): ReturnType<CreationsRepository['softDelete']> {
    const k = key(userId, tool, itemId)
    const existing = this.rows.get(k)
    if (!existing) {
      return baseRevision === 0
        ? { ok: true, deleted: false, storageRef: null, partRefs: [], revision: 0 }
        : { ok: false, reason: 'stale-base', currentRevision: 0 }
    }
    if (baseRevision !== existing.revision) {
      return { ok: false, reason: 'stale-base', currentRevision: existing.revision }
    }
    if (existing.deletedAt !== null) {
      return {
        ok: true,
        deleted: false,
        storageRef: null,
        partRefs: [],
        revision: existing.revision,
      }
    }
    this.rows.set(k, {
      ...existing,
      deletedAt: now,
      pending: null,
      storageRef: null,
      parts: [],
      bytes: 0,
      thumb: null,
      syncedAt: now,
    })
    return {
      ok: true,
      deleted: true,
      storageRef: existing.storageRef,
      partRefs: existing.parts,
      revision: existing.revision,
    }
  }
}
