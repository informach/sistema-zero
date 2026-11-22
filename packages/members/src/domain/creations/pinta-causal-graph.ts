import { isDeepStrictEqual } from 'node:util'
import type {
  PintaCausalAttestation,
  PintaCausalFailure,
  PintaCausalIntent,
  PintaCausalManifest,
  PintaCausalMember,
} from '@sistemazero/core/creations/pinta-causal'
import {
  pintaCausalMaskFits,
  pintaCausalMaskHasSlot,
} from '@sistemazero/core/creations/pinta-causal'

export interface PintaGraphItem {
  itemId: string
  kind: string
  name: string
  revision: number
  sha256: string | null
  layoutRevision: string | null
  manifest: PintaCausalManifest | null
}

export class PintaCausalError extends Error {
  constructor(
    readonly reason: PintaCausalFailure,
    readonly itemId?: string,
  ) {
    super(reason)
  }
}

type Reference = PintaCausalManifest['refs'][number]
type Put = Extract<PintaCausalMember, { action: 'put' }>
type Graph = ReadonlyMap<string, PintaGraphItem>

function slotUsed(ref: Reference, slot: number) {
  if (slot === 0 && ref.implicitArtSlotZero) return true
  if (!ref.indices) return false
  return pintaCausalMaskHasSlot(ref.indices, slot)
}

function layout(item: PintaGraphItem | undefined) {
  return item?.manifest?.sheet
    ? { kind: item.kind, tileSize: item.manifest.sheet.tileSize }
    : undefined
}

function validReference(
  ref: Reference,
  target: PintaGraphItem | undefined,
  base: ReturnType<typeof layout>,
) {
  if (!target?.manifest) return false
  const sheet = target.manifest.sheet
  if (ref.roles.includes('default-sheet') && !sheet) return false
  if (
    ref.roles.includes('layer-sheet') &&
    (!sheet || !base || base.kind !== target.kind || base.tileSize !== sheet.tileSize)
  )
    return false
  if (ref.roles.includes('set') && target.kind !== 'map-set') return false
  if (ref.roles.includes('art') && (target.kind === 'tilemap' || target.kind === 'map-set'))
    return false
  if (ref.indices && sheet)
    for (let slot = sheet.count; slot < 256; slot++) if (slotUsed(ref, slot)) return false
  return true
}

function mapNames(items: Graph) {
  const names = new Map<string, string | null>()
  for (const item of items.values())
    if (item.kind === 'tilemap') names.set(item.name, names.has(item.name) ? null : item.itemId)
  return names
}

function resolveDoor(selector: string, items: Graph, names: ReadonlyMap<string, string | null>) {
  const exact = items.get(selector)
  if (exact) return exact.kind === 'tilemap' ? exact.itemId : undefined
  return names.get(selector)
}

function sheetOperation(
  member: Put,
  previous: PintaGraphItem | undefined,
  next: PintaCausalManifest,
) {
  const op = member.operation
  if (op.type === 'create') {
    if (previous || member.baseRevision !== 0)
      throw new PintaCausalError('stale-base', member.itemId)
    return
  }
  if (!previous?.manifest) throw new PintaCausalError('unverified-content', member.itemId)
  const was = previous.manifest.sheet
  const now = next.sheet
  if (op.type === 'update') {
    if (
      (was || now) &&
      (!was ||
        !now ||
        was.count !== now.count ||
        was.tileSize !== now.tileSize ||
        previous.kind !== next.kind)
    )
      throw new PintaCausalError('unverified-content', member.itemId)
    return
  }
  if (!was || !now || previous.kind !== next.kind || was.tileSize !== now.tileSize)
    throw new PintaCausalError('unverified-content', member.itemId)
  if (
    (op.type === 'paint' &&
      (now.count !== was.count || !pintaCausalMaskFits(op.slots, now.count))) ||
    (op.type === 'append' && (op.count !== now.count || now.count <= was.count)) ||
    (op.type === 'remap' && (op.count !== now.count || was.count !== op.oldToNew.length))
  )
    throw new PintaCausalError('unverified-content', member.itemId)
}

/** All arguments are exact revisions selected under the profile lock. Only live rows enter before. */
export function verifyPintaGraph(
  before: Graph,
  intent: PintaCausalIntent,
  proofs: ReadonlyMap<string, PintaCausalAttestation>,
  nextEpoch: string,
  verifiedInverse = false,
) {
  const after = new Map(before)
  const writes = new Map(intent.members.map((m) => [m.itemId, m]))
  const changedIdentity = new Set<string>()
  const originalNames = mapNames(before)
  const remaps = new Map<string, number[]>()
  for (const member of intent.members) {
    const id = member.itemId
    const proof = proofs.get(id)
    if (!proof) throw new PintaCausalError('unverified-content', id)
    const previous = before.get(id)
    if (member.action === 'delete') {
      if (!previous || proof.manifest) throw new PintaCausalError('stale-base', id)
      changedIdentity.add(id)
      after.delete(id)
      continue
    }
    const m = proof.manifest
    if (!m || m.itemId !== id || m.kind !== member.kind || m.name !== member.name)
      throw new PintaCausalError('unverified-content', id)
    // A verified undo of deletion restores bytes from an absent live row. The stored receipt
    // already matched both digests and the exact tombstone revision for every member.
    if (
      !(
        verifiedInverse &&
        !previous &&
        member.baseRevision > 0 &&
        proof.binding.baseSha256 === null
      )
    )
      sheetOperation(member, previous, m)
    if (
      previous &&
      (previous.kind !== m.kind || (previous.name !== m.name && m.kind === 'tilemap'))
    )
      changedIdentity.add(id)
    if (!previous && (m.kind === 'tilemap' || originalNames.has(id))) changedIdentity.add(id)
    if (member.operation.type === 'remap') remaps.set(id, member.operation.oldToNew)
    after.set(id, {
      itemId: id,
      name: m.name,
      kind: m.kind,
      manifest: m,
      sha256: member.sha256,
      revision: proof.binding.revision,
      layoutRevision: m.sheet
        ? member.operation.type === 'remap' || !previous
          ? nextEpoch
          : previous.layoutRevision
        : null,
    })
  }

  const reads = new Map(intent.readSet.map((r) => [`${r.consumerId}~${r.targetId}`, r]))
  for (const read of intent.readSet) {
    if (read.source === 'unit') continue
    const target = before.get(read.targetId)
    if (
      !target?.sha256 ||
      read.sha256 !== target.sha256 ||
      read.revision !== target.revision ||
      read.layoutRevision !== (target.layoutRevision ?? undefined)
    )
      throw new PintaCausalError('layout-stale', read.targetId)
  }
  const requireRead = (owner: string, target: string) => {
    // Its verified PUT already pins this target to the author's exact output in the same unit.
    if (owner === target && writes.get(owner)?.action === 'put') return
    const read = reads.get(`${owner}~${target}`)
    if (!read || (writes.has(target) && read.source !== 'unit'))
      throw new PintaCausalError('layout-stale', target)
  }
  const oldNames = originalNames,
    newNames = mapNames(after)
  for (const old of before.values()) {
    if (writes.get(old.itemId)?.action === 'delete') continue
    if (!old.manifest) {
      if (remaps.size || changedIdentity.size)
        throw new PintaCausalError('unknown-consumer', old.itemId)
      continue
    }
    for (const ref of old.manifest.refs) {
      const mapping = remaps.get(ref.id)
      if (
        mapping?.some((dest, src) => dest !== src && slotUsed(ref, src)) &&
        !(verifiedInverse && writes.has(old.itemId)) &&
        !proofs.get(old.itemId)?.transitions.some((t) => t.sheetId === ref.id)
      )
        throw new PintaCausalError('missing-consumer', old.itemId)
      if (
        !writes.has(old.itemId) &&
        before.has(ref.id) &&
        (!after.has(ref.id) || before.get(ref.id)?.kind !== after.get(ref.id)?.kind)
      )
        throw new PintaCausalError('missing-consumer', old.itemId)
    }
  }
  for (const item of after.values()) {
    const manifest = item.manifest
    if (!manifest) continue
    const previous = before.get(item.itemId)?.manifest
    const wrote = writes.has(item.itemId)
    const oldSelectors = new Set(previous?.doorSelectors)
    for (const selector of manifest.doorSelectors) {
      const was = resolveDoor(selector, before, oldNames),
        target = resolveDoor(selector, after, newNames)
      const changed = !oldSelectors.has(selector) || was !== target
      if (changed && (!wrote || !target))
        throw new PintaCausalError('missing-consumer', item.itemId)
      if (changed && target) requireRead(item.itemId, target)
    }
    if (!wrote) continue
    const previousRefs = new Map(previous?.refs.map((r) => [r.id, r]))
    const defaultId = manifest.refs.find((ref) => ref.roles.includes('default-sheet'))?.id
    const base =
      manifest.embeddedDefaultLayout ?? layout(defaultId ? after.get(defaultId) : undefined)
    for (const ref of manifest.refs) {
      const target = after.get(ref.id)
      const oldRef = previousRefs.get(ref.id)
      // Exact unchanged unresolved historical drafts may be saved. Newly introduced or invalidated
      // edges require an observed, certified target. Ranges in dated documents are never clamped.
      if (!validReference(ref, target, base)) {
        const oldDefault = previous?.refs.find((r) => r.roles.includes('default-sheet'))?.id
        const oldBase =
          previous?.embeddedDefaultLayout ?? layout(oldDefault ? before.get(oldDefault) : undefined)
        if (
          oldRef &&
          isDeepStrictEqual(oldRef, ref) &&
          !validReference(oldRef, before.get(ref.id), oldBase) &&
          !writes.has(ref.id)
        )
          continue
        throw new PintaCausalError('missing-consumer', item.itemId)
      }
      // A plain cell edit can use a different slot while leaving the same bitset. Require the
      // source seen by the editor also when the old and new index masks happen to coincide.
      requireRead(item.itemId, ref.id)
    }
  }
  return after
}
