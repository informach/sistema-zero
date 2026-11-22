import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { pintaInventoryFloor } from '@sistemazero/core/creations'
import {
  PINTA_CAUSAL_LIMITS as L,
  type PintaCausalAttestation,
  type PintaCausalAuthoredFingerprint,
  type PintaCausalBinding,
  type PintaCausalIntent,
  PintaCausalIntentSchema,
  type PintaCausalManifest,
  type PintaCausalOperation,
  type PintaCausalReservePage,
  type PintaCausalResult,
  type PintaCausalStatus,
  pintaCausalBlobKey,
  pintaCausalIntentHash,
} from '@sistemazero/core/creations/pinta-causal'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { CREATION_LIMITS } from '../../../domain/creations/creation'
import {
  PintaCausalError,
  type PintaGraphItem,
  verifyPintaGraph,
} from '../../../domain/creations/pinta-causal-graph'
import { raiseInventoryFloor, usageWith } from './creations.repository'
import { clearPending, expirePintaUnits as expire } from './pinta-causal-leases'
import { retirePintaPointer, trackPintaObjects } from './pinta-causal-retirement'
import { bumpPintaEpoch } from './pinta-causal-scope'
import {
  type Actor,
  alive,
  checkEpoch,
  DrizzlePintaGraphRepository,
  entry,
  entryColumns,
  lock,
  namespace,
  type Tx,
  wherePersonal,
  whereUnit,
} from './pinta-causal-store'
import { creations as c, pintaCausalUnits as u } from './schema'

type Unit = typeof u.$inferSelect
type Row = typeof c.$inferSelect
const LEASE_MS = 600_000
const MAX_ACTIVE = 8
// Aggregate manifests and attestations, independent of the (up to 1 GiB) document bytes on R2.
const GRAPH_WORK_BYTES = 32 * 1024 * 1024
const byScope = (a: Actor) =>
  and(eq(u.userId, a.userId), eq(u.accountId, a.accountId), eq(u.audience, a.audience))

async function unit(tx: Tx, a: Actor, id: string) {
  const [op] = await tx.select().from(u).where(whereUnit(a, id))
  if (!op) throw new PintaCausalError('not-found')
  return op
}

async function status(
  tx: Tx,
  a: Actor,
  op: Unit,
  cursor?: string,
): Promise<{ status: PintaCausalStatus; uploadBytes: Record<string, number> }> {
  const { opId, intentHash, state } = op
  if (state === 'committed' && op.result)
    return { status: { state, result: op.result.receipt }, uploadBytes: {} }
  if (state === 'collecting')
    return {
      status: {
        state,
        opId,
        intentHash,
        receivedPages: (Array.isArray(op.pages) ? op.pages : []).map((p) => p.page),
      },
      uploadBytes: {},
    }
  if (state === 'aborted' || state === 'expired')
    return { status: { state, opId, intentHash }, uploadBytes: {} }
  if (state !== 'reserved') throw new PintaCausalError('operation-conflict')
  const key = sql<string>`${c.itemId} collate "C"`
  const rows = await tx
    .select({ binding: c.pendingBinding, bytes: c.pendingBytes })
    .from(c)
    .where(
      and(wherePersonal(a), eq(c.pendingUnit, opId), cursor ? sql`${key} > ${cursor}` : undefined),
    )
    .orderBy(key)
    .limit(L.page + 1)
  const selected = rows.slice(0, L.page)
  const tickets = selected.map((r) => {
    if (!r.binding) throw new PintaCausalError('operation-conflict')
    return r.binding
  })
  return {
    status: {
      state,
      opId,
      intentHash,
      tickets,
      nextCursor: rows.length > selected.length ? tickets.at(-1)!.itemId : null,
    },
    uploadBytes: Object.fromEntries(
      selected
        .filter((r) => r.binding?.candidateSha256 && r.bytes !== null)
        .map((r) => [r.binding!.itemId, r.bytes!]),
    ),
  }
}

async function quota(
  tx: Tx,
  a: Actor,
  intent: PintaCausalIntent,
  rows: Map<string, Pick<Row, 'storageRef' | 'deletedAt' | 'bytes'>>,
) {
  const usage = await usageWith(tx, a.userId, a.audience)
  let count = usage.countByTool.pinta,
    bytes = usage.totalBytes
  for (const m of intent.members) {
    const r = rows.get(m.itemId)
    if (r?.storageRef && !r.deletedAt) {
      count--
      bytes -= r.bytes
    }
    if (m.action === 'put') {
      count++
      bytes += m.bytes
    }
  }
  if (count > CREATION_LIMITS.maxItemsPerTool || bytes > CREATION_LIMITS.maxTotalBytes)
    throw new PintaCausalError('quota')
}

// The written sheet maps old slots to new. The receipt keeps the projection in the other
// direction, including newly authored positions that disappear when the edit is undone.
function inverseSlots(operation: PintaCausalOperation, beforeCount: number) {
  if (operation.type !== 'remap' && operation.type !== 'append') return undefined
  const slots: number[] = Array(operation.count).fill(-1)
  for (let from = 0; from < beforeCount; from++) {
    const to = operation.type === 'remap' ? operation.oldToNew[from]! : from
    if (to >= 0) slots[to] = from
  }
  return slots
}

function matchesHistoricalSlots(operation: PintaCausalOperation, count: number, slots?: number[]) {
  if (slots && slots.length !== count) return false
  for (let from = 0; from < count; from++) {
    const historical = slots?.[from] ?? from
    const proposed = operation.type === 'remap' ? operation.oldToNew[from] : from
    if (historical !== proposed) return false
  }
  return true
}

const revisionColumns = {
  rowId: c.id,
  itemId: c.itemId,
  kind: c.kind,
  name: c.name,
  revision: c.revision,
  formatVersion: c.formatVersion,
  storageRef: c.storageRef,
  deletedAt: c.deletedAt,
  bytes: c.bytes,
  pendingUnit: c.pendingUnit,
  pendingRevision: c.pendingRevision,
  pendingFormat: c.pendingFormatVersion,
  lastReservedRevision: c.lastReservedRevision,
  sha: c.causalSha256,
}
async function revisions(tx: Tx, a: Actor, intent: PintaCausalIntent) {
  const rows = await tx
    .select(revisionColumns)
    .from(c)
    .where(
      and(
        wherePersonal(a),
        inArray(
          c.itemId,
          intent.members.map((m) => m.itemId),
        ),
      ),
    )
    .for('update')
  return new Map(rows.map((r) => [r.itemId, r]))
}

export class DrizzlePintaCausalRepository extends DrizzlePintaGraphRepository {
  reserve(a: Actor, page: PintaCausalReservePage) {
    return this.db.transaction(async (tx) => {
      await lock(tx, a)
      const now = this.clock()
      await expire(tx, a, now)
      let [op] = await tx.select().from(u).where(whereUnit(a, page.opId))
      if (op && op.intentHash !== page.intentHash) throw new PintaCausalError('operation-conflict')
      if (op && op.state !== 'collecting') return status(tx, a, op)
      await checkEpoch(tx, a, page.baseEpoch, page.reader)
      if (!op) {
        const [active] = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(u)
          .where(and(byScope(a), inArray(u.state, ['collecting', 'reserved'])))
        if ((active?.n ?? 0) >= MAX_ACTIVE) throw new PintaCausalError('quota')
        ;[op] = await tx
          .insert(u)
          .values({
            ...a,
            opId: page.opId,
            intentHash: page.intentHash,
            state: 'collecting',
            pages: [],
            expiresAt: new Date(now.getTime() + LEASE_MS),
          })
          .returning()
      }
      if (!op) throw new PintaCausalError('operation-conflict')
      const pages = Array.isArray(op.pages) ? op.pages : []
      const first = pages[0]
      if (
        first &&
        (first.pages !== page.pages ||
          first.reader !== page.reader ||
          first.baseEpoch !== page.baseEpoch ||
          first.inverseOf !== page.inverseOf)
      )
        throw new PintaCausalError('operation-conflict')
      const prior = pages.find((p) => p.page === page.page)
      if (prior && !isDeepStrictEqual(prior, page)) throw new PintaCausalError('operation-conflict')
      if (!prior) pages.push(page)
      if (Buffer.byteLength(JSON.stringify(pages)) > L.intentBytes + pages.length * 384)
        throw new PintaCausalError('quota')
      if (pages.length < page.pages) {
        await tx.update(u).set({ pages }).where(whereUnit(a, page.opId))
        return status(tx, a, { ...op, pages })
      }
      pages.sort((a, b) => a.page - b.page)
      const parsed = PintaCausalIntentSchema.safeParse({
        protocol: 1,
        opId: page.opId,
        baseEpoch: page.baseEpoch,
        reader: page.reader,
        ...(page.inverseOf ? { inverseOf: page.inverseOf } : {}),
        members: pages.flatMap((p) => p.members),
        readSet: pages.flatMap((p) => p.readSet),
      })
      if (!parsed.success || (await pintaCausalIntentHash(parsed.data)) !== page.intentHash)
        throw new PintaCausalError('operation-conflict')
      const intent = parsed.data
      const rows = await revisions(tx, a, intent)
      await quota(tx, a, intent, rows)
      const [staged] = await tx
        .select({ bytes: sql<string>`coalesce(sum(${c.pendingBytes}),0)` })
        .from(c)
        .where(and(wherePersonal(a), sql`${c.pendingUnit} is not null`))
      const candidateBytes = intent.members.reduce(
        (sum, m) => sum + (m.action === 'put' ? m.bytes : 0),
        0,
      )
      if (Number(staged?.bytes ?? 0) + candidateBytes > CREATION_LIMITS.maxTotalBytes)
        throw new PintaCausalError('quota')
      let floor = 1
      for (const m of intent.members) {
        const r = rows.get(m.itemId)
        if (
          (r?.revision ?? 0) !== m.baseRevision ||
          (m.action === 'delete' && (!r?.storageRef || r.deletedAt))
        )
          throw new PintaCausalError('stale-base', m.itemId)
        if (r?.pendingUnit) throw new PintaCausalError('operation-conflict', m.itemId)
        if (r?.storageRef && !r.deletedAt && !r.sha)
          throw new PintaCausalError('unverified-content', m.itemId)
        if (
          page.reader < Math.max(r?.formatVersion ?? 1, r?.pendingFormat ?? 1) ||
          (m.action === 'put' &&
            (m.formatVersion > page.reader || m.formatVersion < (r?.formatVersion ?? 1)))
        )
          throw new PintaCausalError('client-outdated', m.itemId)
        // Older or imported index rows can predate a reservation counter synchronized with revision.
        const revision =
          Math.max(r?.revision ?? 0, r?.pendingRevision ?? 0, r?.lastReservedRevision ?? 0) + 1
        if (revision > 2_147_483_647) throw new PintaCausalError('quota', m.itemId)
        const binding: PintaCausalBinding = {
          namespace: namespace(a),
          opId: op.opId,
          intentHash: op.intentHash,
          baseEpoch: intent.baseEpoch,
          itemId: m.itemId,
          baseRevision: m.baseRevision,
          revision,
          nonce: randomUUID(),
          baseSha256: r?.sha ?? null,
          candidateSha256: m.action === 'put' ? m.sha256 : null,
          expiresAt: op.expiresAt.toISOString(),
        }
        const pending = {
          ...clearPending(),
          pendingRevision: revision,
          pendingUnit: op.opId,
          pendingBinding: binding,
          lastReservedRevision: revision,
          ...(m.action === 'put'
            ? {
                pendingFormatVersion: m.formatVersion,
                pendingBytes: m.bytes,
                pendingName: m.name,
                pendingKind: m.kind,
                pendingItemUpdatedAt: new Date(m.itemUpdatedAt),
                pendingInventoryReader: { revision, version: intent.reader },
                pendingThumb: m.thumb?.startsWith('data:image/') ? m.thumb : null,
              }
            : {}),
        }
        if (r)
          await tx
            .update(c)
            .set(pending)
            .where(and(wherePersonal(a), eq(c.itemId, m.itemId)))
        else if (m.action === 'put')
          await tx.insert(c).values({
            ...a,
            id: randomUUID(),
            tool: 'pinta',
            itemId: m.itemId,
            name: m.name,
            kind: m.kind,
            itemUpdatedAt: new Date(m.itemUpdatedAt),
            createdAt: now,
            syncedAt: now,
            ...pending,
          })
        if (m.action === 'put') {
          await trackPintaObjects(tx, a, binding)
          floor = Math.max(floor, pintaInventoryFloor('pinta', m.kind, m.formatVersion))
        }
      }
      if (floor > 1) await raiseInventoryFloor(tx, { ...a, tool: 'pinta' }, a.audience, floor)
      await tx
        .update(u)
        .set({ state: 'reserved', intent, pages: null })
        .where(whereUnit(a, op.opId))
      return status(tx, a, { ...op, state: 'reserved', intent, pages: null })
    })
  }

  status(a: Actor, p: { opId: string; cursor?: string }) {
    return this.db.transaction(async (tx) => {
      await lock(tx, a)
      await expire(tx, a, this.clock())
      return status(tx, a, await unit(tx, a, p.opId), p.cursor)
    })
  }

  member(a: Actor, p: { opId: string; itemId: string }) {
    return this.db.transaction(async (tx) => {
      await lock(tx, a)
      const op = await unit(tx, a, p.opId)
      if (op.state !== 'reserved' || !op.intent || op.expiresAt <= this.clock())
        throw new PintaCausalError('operation-expired')
      await checkEpoch(tx, a, op.intent.baseEpoch, op.intent.reader)
      const member = op.intent.members.find((m) => m.itemId === p.itemId)
      const [row] = await tx
        .select({
          ...entryColumns,
          storageRef: c.storageRef,
          binding: c.pendingBinding,
          manifest: c.causalManifest,
        })
        .from(c)
        .where(and(wherePersonal(a), eq(c.pendingUnit, p.opId), eq(c.itemId, p.itemId)))
      if (!member || !row?.binding) throw new PintaCausalError('not-found')
      const original = op.intent.inverseOf ? (await unit(tx, a, op.intent.inverseOf)).result : null
      const oldMember = original?.receipt.members.find((m) => m.itemId === p.itemId)
      const inverse =
        original && oldMember
          ? {
              baseRevision: oldMember.revision,
              baseSha256: oldMember.sha256,
              restoredSha256: original.priorDigests[p.itemId] ?? null,
              ...(original.priorAuthored?.[p.itemId]
                ? { restoredAuthoredFingerprint: original.priorAuthored[p.itemId] }
                : {}),
            }
          : null
      const refs = new Set(row.manifest?.refs.map((r) => r.id))
      const remaps = op.intent.members.flatMap((m) =>
        m.action === 'put' && m.operation.type === 'remap' && refs.has(m.itemId)
          ? [{ sheetId: m.itemId, operation: m.operation }]
          : [],
      )
      return {
        member,
        binding: row.binding,
        baseStorageRef: row.storageRef,
        baseEntry: row.storageRef ? entry(row) : null,
        remaps,
        remapSheetIds: remaps.map((r) => r.sheetId),
        ...(op.intent.inverseOf ? { inverseOf: op.intent.inverseOf, inverse } : {}),
      }
    })
  }

  attest(a: Actor, p: PintaCausalAttestation) {
    return this.db.transaction(async (tx) => {
      await lock(tx, a)
      const b = p.binding
      const [row] = await tx
        .select({ binding: c.pendingBinding, proof: c.pendingAttestation })
        .from(c)
        .where(and(wherePersonal(a), eq(c.pendingUnit, b.opId), eq(c.itemId, b.itemId)))
      if (
        !row?.binding ||
        !isDeepStrictEqual(row.binding, b) ||
        Date.parse(b.expiresAt) <= this.clock().getTime()
      )
        throw new PintaCausalError('unverified-content', b.itemId)
      if (row.proof && !isDeepStrictEqual(row.proof, p))
        throw new PintaCausalError('operation-conflict', b.itemId)
      if (!row.proof) {
        const bytes = Buffer.byteLength(JSON.stringify(p))
        const used = sql<number>`coalesce((${u.pages}->>'proofBytes')::integer,0)+${bytes}`
        const [accepted] = await tx
          .update(u)
          .set({ pages: sql`jsonb_build_object('proofBytes',${used})` })
          .where(
            and(whereUnit(a, b.opId), eq(u.state, 'reserved'), sql`${used}<=${GRAPH_WORK_BYTES}`),
          )
          .returning({ opId: u.opId })
        if (!accepted) throw new PintaCausalError('quota')
        await tx
          .update(c)
          .set({ pendingAttestation: p })
          .where(and(wherePersonal(a), eq(c.pendingUnit, b.opId), eq(c.itemId, b.itemId)))
      }
      return { verified: true }
    })
  }

  abort(a: Actor, p: { opId: string }) {
    return this.db.transaction(async (tx) => {
      await lock(tx, a)
      await expire(tx, a, this.clock())
      const op = await unit(tx, a, p.opId)
      if (op.state === 'collecting' || op.state === 'reserved') {
        await tx
          .update(c)
          .set(clearPending())
          .where(and(wherePersonal(a), eq(c.pendingUnit, p.opId)))
        await tx
          .update(u)
          .set({ state: 'aborted', intent: null, pages: null })
          .where(whereUnit(a, p.opId))
        return status(tx, a, { ...op, state: 'aborted' })
      }
      return status(tx, a, op)
    })
  }

  commit(a: Actor, p: { opId: string }) {
    return this.db.transaction(async (tx) => {
      await lock(tx, a)
      const now = this.clock()
      const op = await unit(tx, a, p.opId)
      if (op.state === 'committed') return status(tx, a, op)
      if (op.expiresAt <= now) throw new PintaCausalError('operation-expired')
      const intent = op.intent
      if (op.state !== 'reserved' || !intent) throw new PintaCausalError('operation-conflict')
      const state = await checkEpoch(tx, a, intent.baseEpoch, intent.reader)
      const rows = await revisions(tx, a, intent)
      await quota(tx, a, intent, rows)
      // Keep complete old manifests for writers. On unchanged consumers only references to
      // affected IDs and selectors whose resolution could change participate in the proof.
      // Unknown stays SQL NULL, so absence of coverage can never look like an empty manifest.
      const ids = Object.fromEntries(intent.members.map((m) => [m.itemId, true]))
      const selectors = Object.fromEntries(
        intent.members.flatMap((m) =>
          [m.itemId, rows.get(m.itemId)?.name, m.action === 'put' ? m.name : undefined]
            .filter((s): s is string => !!s)
            .map((s) => [s, true]),
        ),
      )
      const idSet = JSON.stringify(ids),
        selectorSet = JSON.stringify(selectors)
      const projected = sql<PintaCausalManifest | null>`case when ${c.causalManifest} is null or ${idSet}::jsonb ? ${c.itemId} then ${c.causalManifest}
       else ${c.causalManifest} || jsonb_build_object(
         'refs',coalesce((select jsonb_agg(edge) from jsonb_array_elements(${c.causalManifest}->'refs') edge
           where ${idSet}::jsonb ? (edge->>'id')),'[]'::jsonb),
         'doorSelectors',coalesce((select jsonb_agg(value) from jsonb_array_elements_text(${c.causalManifest}->'doorSelectors') value
           where ${selectorSet}::jsonb ? value),'[]'::jsonb)) end`
      const [size] = await tx
        .select({
          bytes: sql<string>`coalesce(sum(coalesce(octet_length((${projected})::text),0) + case when ${c.pendingUnit}=${p.opId} then coalesce(octet_length(${c.pendingAttestation}::text),0) else 0 end),0)`,
        })
        .from(c)
        .where(wherePersonal(a))
      if (Number(size?.bytes ?? 0) > GRAPH_WORK_BYTES) throw new PintaCausalError('quota')
      const items = await tx
        .select({ ...entryColumns, manifest: projected })
        .from(c)
        .where(and(wherePersonal(a), alive()))
      const before = new Map<string, PintaGraphItem>(
        items.map((r) => [r.itemId, { ...entry(r), manifest: r.manifest }]),
      )
      const pending = await tx
        .select({ itemId: c.itemId, b: c.pendingBinding, p: c.pendingAttestation })
        .from(c)
        .where(and(wherePersonal(a), eq(c.pendingUnit, op.opId)))
      const proofs = new Map<string, PintaCausalAttestation>()
      for (const r of pending) {
        if (!r.p || !r.b || !isDeepStrictEqual(r.b, r.p.binding))
          throw new PintaCausalError('unverified-content', r.itemId)
        proofs.set(r.itemId, r.p)
      }
      for (const m of intent.members) {
        const row = rows.get(m.itemId),
          proof = proofs.get(m.itemId)
        if (
          !row ||
          !proof ||
          row.pendingUnit !== op.opId ||
          row.revision !== m.baseRevision ||
          row.pendingRevision !== proof?.binding.revision ||
          row.sha !== proof.binding.baseSha256
        )
          throw new PintaCausalError('stale-base', m.itemId)
      }
      if (intent.inverseOf) {
        const source = await unit(tx, a, intent.inverseOf)
        if (
          !source.result ||
          source.state !== 'committed' ||
          source.result.receipt.members.length !== intent.members.length
        )
          throw new PintaCausalError('operation-conflict')
        const members = new Map(intent.members.map((m) => [m.itemId, m]))
        for (const previous of source.result.receipt.members) {
          const proof = proofs.get(previous.itemId)
          const member = members.get(previous.itemId)
          const guard = source.result.undoGuards?.[previous.itemId]
          if (!guard || rows.get(previous.itemId)?.rowId !== guard.rowId)
            throw new PintaCausalError('stale-base', previous.itemId)
          const currentSheet = before.get(previous.itemId)?.manifest?.sheet
          if (
            member?.action === 'put' &&
            currentSheet &&
            !matchesHistoricalSlots(member.operation, currentSheet.count, guard.slots)
          )
            throw new PintaCausalError('unverified-content', previous.itemId)
          const originalSha = source.result.priorDigests[previous.itemId]
          const originalAuthored = source.result.priorAuthored?.[previous.itemId]
          const repacked =
            typeof originalSha === 'string' &&
            !!proof?.binding.candidateSha256 &&
            !!originalAuthored &&
            isDeepStrictEqual(originalAuthored, proof.manifest?.authoredFingerprint)
          if (
            !proof ||
            previous.revision !== proof.binding.baseRevision ||
            previous.sha256 !== proof.binding.baseSha256 ||
            (proof.binding.candidateSha256 !== originalSha && !repacked)
          )
            throw new PintaCausalError('stale-base', previous.itemId)
        }
      }
      const nextEpoch = (state.epoch + 1n).toString()
      const after = verifyPintaGraph(before, intent, proofs, nextEpoch, !!intent.inverseOf)
      const result: PintaCausalResult = {
        opId: op.opId,
        intentHash: op.intentHash,
        epoch: nextEpoch,
        members: [],
      }
      const undoGuards: Record<string, { rowId: string; slots?: number[] }> = Object.create(null)
      const priorDigests: Record<string, string | null> = Object.create(null)
      const priorAuthored: Record<string, PintaCausalAuthoredFingerprint> = Object.create(null)
      for (const m of intent.members) {
        const proof = proofs.get(m.itemId)!,
          b = proof.binding
        await retirePintaPointer(
          tx,
          a,
          m.itemId,
          b.baseRevision,
          rows.get(m.itemId)?.storageRef ?? null,
          now,
        )
        const layoutRevision = after.get(m.itemId)?.layoutRevision ?? null
        const oldSheet = before.get(m.itemId)?.manifest?.sheet
        const slots =
          oldSheet && m.action === 'put' ? inverseSlots(m.operation, oldSheet.count) : undefined
        undoGuards[m.itemId] = { rowId: rows.get(m.itemId)!.rowId, ...(slots ? { slots } : {}) }
        priorDigests[m.itemId] = b.baseSha256
        const prevFingerprint = before.get(m.itemId)?.manifest?.authoredFingerprint
        if (prevFingerprint) priorAuthored[m.itemId] = prevFingerprint
        result.members.push({
          itemId: m.itemId,
          revision: b.revision,
          deleted: m.action === 'delete',
          sha256: b.candidateSha256,
          layoutRevision,
        })
        const value =
          m.action === 'delete'
            ? { deletedAt: now, storageRef: null, bytes: 0, thumb: null }
            : {
                deletedAt: null,
                storageRef: pintaCausalBlobKey(b, 'sealed'),
                bytes: m.bytes,
                formatVersion: m.formatVersion,
                name: m.name,
                kind: m.kind,
                itemUpdatedAt: new Date(m.itemUpdatedAt),
                thumb: m.thumb?.startsWith('data:image/') ? m.thumb : null,
              }
        await tx
          .update(c)
          .set({
            ...clearPending(),
            ...value,
            revision: b.revision,
            causalManifest: proof.manifest,
            causalSha256: b.candidateSha256,
            layoutRevision: layoutRevision === null ? null : BigInt(layoutRevision),
            backfillTicket: null,
            contentFingerprint: null,
            parts: [],
            syncedAt: now,
          })
          .where(and(wherePersonal(a), eq(c.itemId, m.itemId), eq(c.pendingUnit, p.opId)))
      }
      // A protocol-aware commit publishes certified links. A queued single-item upload can no longer supersede them.
      await bumpPintaEpoch(tx, a, true)
      await tx
        .update(u)
        .set({
          state: 'committed',
          result: { receipt: result, priorDigests, priorAuthored, undoGuards },
          pages: null,
          intent: null,
        })
        .where(whereUnit(a, p.opId))
      return { status: { state: 'committed' as const, result }, uploadBytes: {} }
    })
  }
}
