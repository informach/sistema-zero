import { randomUUID } from 'node:crypto'
import { PINTA_INVENTORY_READER_VERSION } from '@sistemazero/core/creations'
import {
  PINTA_CAUSAL_LIMITS,
  type PintaCausalArchivePage,
  type PintaCausalBackfillAttestation,
  type PintaCausalEntry,
  type PintaCausalSnapshotPage,
  pintaCausalBlobKey,
} from '@sistemazero/core/creations/pinta-causal'
import { and, eq, gt, isNotNull, isNull, ne, sql } from 'drizzle-orm'
import { PALETTE_LIBRARY_ITEM_ID } from '../../../domain/creations/palette-library'
import { PintaCausalError } from '../../../domain/creations/pinta-causal-graph'
import type { Database } from './db'
import { retirePintaPointer, trackPintaObjects } from './pinta-causal-retirement'
import { bumpPintaEpoch, type PintaCausalActor, pintaScope } from './pinta-causal-scope'
import { accountDeletionFences, creations as c, pintaCausalUnits as units } from './schema'

export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]
export type Actor = PintaCausalActor
export const namespace = (a: Actor) => ({
  userId: a.userId,
  audience: a.audience,
  tool: 'pinta' as const,
})
export const wherePersonal = (a: Actor) =>
  and(
    eq(c.userId, a.userId),
    eq(c.accountId, a.accountId),
    eq(c.audience, a.audience),
    eq(c.tool, 'pinta'),
    ne(c.itemId, PALETTE_LIBRARY_ITEM_ID),
  )
export const whereUnit = (a: Actor, opId: string) =>
  and(
    eq(units.userId, a.userId),
    eq(units.accountId, a.accountId),
    eq(units.audience, a.audience),
    eq(units.opId, opId),
  )
export const alive = () => and(isNull(c.deletedAt), isNotNull(c.storageRef))
export const entryColumns = {
  itemId: c.itemId,
  name: c.name,
  kind: c.kind,
  revision: c.revision,
  formatVersion: c.formatVersion,
  bytes: c.bytes,
  itemUpdatedAt: c.itemUpdatedAt,
  sha256: c.causalSha256,
  layout: c.layoutRevision,
}
export type EntryRow = Pick<
  typeof c.$inferSelect,
  'itemId' | 'name' | 'kind' | 'revision' | 'formatVersion' | 'bytes' | 'itemUpdatedAt'
> & { sha256: string | null; layout: bigint | null }
export const entry = (r: EntryRow): PintaCausalEntry => ({
  itemId: r.itemId,
  name: r.name,
  kind: r.kind,
  revision: r.revision,
  formatVersion: r.formatVersion,
  bytes: r.bytes,
  itemUpdatedAt: r.itemUpdatedAt.toISOString(),
  sha256: r.sha256,
  layoutRevision: r.layout?.toString() ?? null,
  coverage: r.sha256 ? 'certified' : 'unknown',
})

export async function lock(tx: Tx, a: Actor) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${a.userId}`},0))`,
  )
  await tx.execute(sql`select set_config('members.pinta_graph_writer','unit-v1',true)`)
  const [fence] = await tx
    .select({ id: accountDeletionFences.accountId })
    .from(accountDeletionFences)
    .where(eq(accountDeletionFences.accountId, a.accountId))
  if (fence) throw new PintaCausalError('account-deleting')
}

export async function checkEpoch(
  tx: Tx,
  a: Actor,
  expected?: string,
  reader: number | 'archive' = PINTA_INVENTORY_READER_VERSION,
) {
  const state = await pintaScope(tx, a.userId, a.audience)
  if (state.accountId && state.accountId !== a.accountId) throw new PintaCausalError('not-found')
  if (
    reader !== 'archive' &&
    (!Number.isInteger(reader) || reader < state.floor || reader > PINTA_INVENTORY_READER_VERSION)
  )
    throw new PintaCausalError('client-outdated')
  if (expected !== undefined && state.epoch.toString() !== expected)
    throw new PintaCausalError('epoch-changed')
  return state
}

export class DrizzlePintaGraphRepository {
  constructor(
    protected readonly db: Database,
    protected readonly clock: () => Date = () => new Date(),
  ) {}

  async page(
    a: Actor,
    p: { epoch?: string; cursor?: string; reader: number },
  ): Promise<PintaCausalSnapshotPage> {
    return { protocol: 1, ...(await this.readPage(a, p, p.reader)) }
  }

  async archivePage(
    a: Actor,
    p: { epoch?: string; cursor?: string },
  ): Promise<PintaCausalArchivePage> {
    return { archive: await this.readPage(a, p, 'archive') }
  }

  private readPage(a: Actor, p: { epoch?: string; cursor?: string }, mode: number | 'archive') {
    return this.db.transaction(async (tx) => {
      await lock(tx, a)
      if (p.cursor && !p.epoch) throw new PintaCausalError('epoch-changed')
      const state = await checkEpoch(tx, a, p.epoch, mode)
      const key = sql<string>`${c.itemId} collate "C"`
      const rows = await tx
        .select(entryColumns)
        .from(c)
        .where(and(wherePersonal(a), alive(), p.cursor ? gt(key, p.cursor) : undefined))
        .orderBy(key)
        .limit(PINTA_CAUSAL_LIMITS.page + 1)
      const entries = rows.slice(0, PINTA_CAUSAL_LIMITS.page).map(entry)
      return {
        epoch: state.epoch.toString(),
        requiredFormat: state.floor,
        entries,
        nextCursor: rows.length > entries.length ? entries.at(-1)!.itemId : null,
      }
    })
  }

  item(a: Actor, p: { epoch: string; itemId: string; revision: number; reader: number }) {
    return this.readItem(a, p, p.reader)
  }
  async archiveItem(a: Actor, p: { epoch: string; itemId: string; revision: number }) {
    return { archive: await this.readItem(a, p, 'archive') }
  }
  private readItem(
    a: Actor,
    p: { epoch: string; itemId: string; revision: number },
    mode: number | 'archive',
  ) {
    return this.db.transaction(async (tx) => {
      await lock(tx, a)
      await checkEpoch(tx, a, p.epoch, mode)
      const [row] = await tx
        .select({ ...entryColumns, storageRef: c.storageRef })
        .from(c)
        .where(and(wherePersonal(a), eq(c.itemId, p.itemId), alive(), eq(c.revision, p.revision)))
      if (!row?.storageRef) throw new PintaCausalError('stale-base', p.itemId)
      if (mode !== 'archive' && !row.sha256)
        throw new PintaCausalError('unverified-content', p.itemId)
      return { entry: entry(row), storageRef: row.storageRef }
    })
  }

  backfillTicket(a: Actor, p: { epoch: string; itemId: string; revision: number; reader: number }) {
    return this.db.transaction(async (tx) => {
      await lock(tx, a)
      await checkEpoch(tx, a, p.epoch, p.reader)
      const [row] = await tx
        .select({ ...entryColumns, storageRef: c.storageRef, ticket: c.backfillTicket })
        .from(c)
        .where(and(wherePersonal(a), eq(c.itemId, p.itemId), alive(), eq(c.revision, p.revision)))
        .for('update')
      if (!row?.storageRef || row.sha256) throw new PintaCausalError('stale-base', p.itemId)
      const now = this.clock()
      const prev = row.ticket
      const binding =
        prev &&
        prev.storageRef === row.storageRef &&
        prev.binding.revision === p.revision &&
        prev.binding.baseEpoch === p.epoch &&
        Date.parse(prev.binding.expiresAt) > now.getTime()
          ? prev.binding
          : {
              namespace: namespace(a),
              itemId: p.itemId,
              revision: p.revision,
              nonce: randomUUID(),
              baseEpoch: p.epoch,
              expiresAt: new Date(now.getTime() + 600_000).toISOString(),
            }
      if (binding !== prev?.binding) {
        await trackPintaObjects(tx, a, binding)
        await tx
          .update(c)
          .set({ backfillTicket: { binding, storageRef: row.storageRef } })
          .where(and(wherePersonal(a), eq(c.itemId, p.itemId)))
      }
      return { binding, storageRef: row.storageRef, entry: entry(row) }
    })
  }

  backfillAttest(a: Actor, p: PintaCausalBackfillAttestation) {
    return this.db.transaction(async (tx) => {
      await lock(tx, a)
      const b = p.binding
      if (b.namespace.userId !== a.userId || b.namespace.audience !== a.audience)
        throw new PintaCausalError('unverified-content')
      const [row] = await tx
        .select({ ...entryColumns, ticket: c.backfillTicket, storageRef: c.storageRef })
        .from(c)
        .where(and(wherePersonal(a), eq(c.itemId, b.itemId), eq(c.revision, b.revision), alive()))
        .for('update')
      if (row?.storageRef === pintaCausalBlobKey(b, 'sealed') && row.sha256 === p.sha256)
        return { entry: entry(row) }
      await checkEpoch(tx, a, b.baseEpoch)
      if (
        !row?.ticket ||
        row.ticket.storageRef !== row.storageRef ||
        row.ticket.binding.nonce !== b.nonce ||
        row.ticket.binding.expiresAt !== b.expiresAt ||
        row.ticket.binding.baseEpoch !== b.baseEpoch ||
        Date.parse(b.expiresAt) <= this.clock().getTime() ||
        p.manifest.name !== row.name ||
        p.manifest.kind !== row.kind ||
        p.manifest.itemId !== row.itemId
      )
        throw new PintaCausalError('unverified-content', b.itemId)
      await retirePintaPointer(tx, a, b.itemId, b.revision, row.storageRef, this.clock())
      const epoch = await bumpPintaEpoch(tx, a)
      const [verified] = await tx
        .update(c)
        .set({
          storageRef: pintaCausalBlobKey(b, 'sealed'),
          causalSha256: p.sha256,
          causalManifest: p.manifest,
          layoutRevision: p.manifest.sheet ? epoch : null,
          backfillTicket: null,
        })
        .where(and(wherePersonal(a), eq(c.itemId, b.itemId)))
        .returning(entryColumns)
      if (!verified) throw new PintaCausalError('stale-base', b.itemId)
      return { entry: entry(verified) }
    })
  }
}
