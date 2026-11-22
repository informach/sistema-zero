import {
  PINTA_CAUSAL_LIMITS,
  type PintaCausalIntent,
  PintaCausalIntentSchema,
  type PintaCausalOperation,
  PintaCausalOperationSchema,
  type PintaCausalRead,
  PintaCausalReadSchema,
  type PintaCausalResult,
  PintaCausalResultSchema,
  pintaCausalEpochSchema,
  pintaCausalItemIdSchema,
  pintaCausalOpIdSchema,
  pintaCausalRevisionSchema,
} from '@sistemazero/core/creations/pinta-causal'
import { pintaValuesEqual } from '../core/assetEquality'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { PintaLocalStorageError } from '../core/localStorageErrors'
import { isTilesetKind, pintaAssetDependencyIds } from '../core/project'
import { pintaDoorBindings } from '../core/sceneMapClosure'
import { PINTA_CAUSAL_OUTBOX_KEY } from './assetAuthorityKeys'
import type { LocalAssetTransition, LocalSnapshot } from './localAssetAuthority'
import {
  initialRecoveryClosure,
  initialRecoverySeeds,
  recoverInitialLocalAssets,
} from './localCausalRecovery'

export { PINTA_CAUSAL_OUTBOX_KEY } from './assetAuthorityKeys'
export const PINTA_CAUSAL_BLOBS_KEY = 'pinta:sync:sealed-blobs'

interface PintaCausalDraftMember {
  itemId: string
  baseRevision: number
  operation?: PintaCausalOperation
  baseAfter?: PintaCausalPredecessor
}

interface PintaCausalPredecessor {
  opId: string
  localRevision: string
  sha256: string | null
}

export type PintaLocalCausalRead =
  | PintaCausalRead
  | { source: 'predecessor'; consumerId: string; targetId: string; base: PintaCausalPredecessor }

export interface PintaCausalLocalDraft<Asset extends PintaMemoryAsset> {
  opId: string
  baseEpoch: string
  inverseOf?: string
  readSet: readonly PintaLocalCausalRead[]
  follows?: string
  transitions: readonly (LocalAssetTransition<Asset> & Omit<PintaCausalDraftMember, 'itemId'>)[]
  /** Exact queued preparations this draft supersedes. Every member must follow. */
  replaces?: readonly { opId: string; preparation: string }[]
  requireKnownInventory?: boolean
}

interface PintaLocalUnbasedRead {
  consumerId: string
  targetId: string
  localRevision: string | null
}

export interface PintaLocalUnbasedDraft<Asset extends PintaMemoryAsset> {
  transitions: readonly LocalAssetTransition<Asset>[]
  readSet: readonly PintaLocalUnbasedRead[]
  requireKnownInventory?: boolean
}

interface PintaLocalUnbased {
  opId: string
  members: readonly { itemId: string; localRevision: string; deleted: boolean }[]
  readSet: readonly PintaLocalUnbasedRead[]
}

export interface PintaCausalPendingMember extends PintaCausalDraftMember {
  action: 'put' | 'delete'
  localRevision: string
}

export interface PintaCausalPending {
  opId: string
  /** Changes on a replacement, including ones that deliberately keep the operation ID. */
  preparation: string
  baseEpoch: string
  inverseOf?: string
  readSet: readonly PintaLocalCausalRead[]
  follows?: string
  members: readonly PintaCausalPendingMember[]
}

export interface PintaCausalSealed {
  local: PintaCausalPending
  intent: PintaCausalIntent
  intentHash: string
  bytes: number
}

export interface PintaCausalConfirmed {
  revision: number
  localRevision: string
  deleted: boolean
  sha256: string | null
  layoutRevision: string | null
  opId?: string
}

export interface PintaCausalLocalPull<Asset extends PintaMemoryAsset> {
  fromEpoch: string | null
  epoch: string
  coveredIds?: readonly string[]
  recoverInitial?: true
  transitions: readonly (LocalAssetTransition<Asset> & {
    remote: Pick<PintaCausalConfirmed, 'revision' | 'sha256' | 'layoutRevision'> | null
  })[]
}

export class PintaCausalPullDeferred extends Error {}

export interface LocalCausalState {
  version: 1
  protocolKnown: boolean
  epoch: string | null
  /** A complete read epoch followed by this device's consecutive confirmed writes. */
  writeEpoch?: string
  unbased?: PintaLocalUnbased
  /** Exact revisions of recovery copies that still live only in this gallery. */
  recovered?: Map<string, string>
  pending: PintaCausalPending[]
  sealed: PintaCausalSealed | null
  confirmed: Map<string, PintaCausalConfirmed>
}

function invalid(): never {
  throw new PintaLocalStorageError('Não consegui conferir as mudanças guardadas para sincronizar.')
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function localRevision(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128
}

function digest(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

function predecessor(value: unknown): value is PintaCausalPredecessor {
  return (
    object(value) &&
    pintaCausalOpIdSchema.safeParse(value.opId).success &&
    localRevision(value.localRevision) &&
    (value.sha256 === null || digest(value.sha256))
  )
}

function pendingState(value: unknown): value is PintaCausalPending {
  if (
    !object(value) ||
    !pintaCausalOpIdSchema.safeParse(value.opId).success ||
    !pintaCausalOpIdSchema.safeParse(value.preparation).success ||
    !pintaCausalEpochSchema.safeParse(value.baseEpoch).success ||
    (value.follows !== undefined && !pintaCausalOpIdSchema.safeParse(value.follows).success) ||
    (value.inverseOf !== undefined && !pintaCausalOpIdSchema.safeParse(value.inverseOf).success) ||
    !Array.isArray(value.readSet) ||
    value.readSet.length > PINTA_CAUSAL_LIMITS.readEdges ||
    !Array.isArray(value.members) ||
    value.members.length === 0 ||
    value.members.length > PINTA_CAUSAL_LIMITS.members
  )
    return false
  const memberIds = new Set<string>()
  const puts = new Set<string>()
  for (const raw of value.members as unknown[]) {
    if (!object(raw)) return false
    const id = pintaCausalItemIdSchema.safeParse(raw.itemId)
    const base = pintaCausalRevisionSchema.safeParse(raw.baseRevision)
    if (!id.success || !base.success || !localRevision(raw.localRevision) || memberIds.has(id.data))
      return false
    memberIds.add(id.data)
    if (
      raw.baseAfter !== undefined &&
      (!predecessor(raw.baseAfter) || raw.baseAfter.opId !== value.follows)
    )
      return false
    if (raw.action === 'delete') {
      if ((base.data === 0 && !raw.baseAfter) || raw.operation !== undefined) return false
      continue
    }
    if (raw.action !== 'put') return false
    const operation = PintaCausalOperationSchema.safeParse(raw.operation)
    if (
      !operation.success ||
      (!raw.baseAfter && (base.data === 0) !== (operation.data.type === 'create'))
    )
      return false
    puts.add(id.data)
  }
  const edges = new Set<string>()
  for (const raw of value.readSet as unknown[]) {
    const edge = PintaCausalReadSchema.safeParse(raw)
    const data = edge.success ? edge.data : raw
    if (!object(data)) return false
    const consumer = pintaCausalItemIdSchema.safeParse(data.consumerId)
    const target = pintaCausalItemIdSchema.safeParse(data.targetId)
    if (!consumer.success || !target.success) return false
    const consumerId = consumer.data
    const targetId = target.data
    const source = data.source
    if (
      !edge.success &&
      (source !== 'predecessor' || !predecessor(data.base) || data.base.opId !== value.follows)
    )
      return false
    const key = `${consumerId}/${targetId}`
    if (!puts.has(consumerId) || (source === 'unit' && !puts.has(targetId)) || edges.has(key))
      return false
    edges.add(key)
  }
  return true
}

function sealedState(value: unknown): value is PintaCausalSealed {
  if (!object(value) || !pendingState(value.local) || !digest(value.intentHash)) return false
  const intent = PintaCausalIntentSchema.safeParse(value.intent)
  if (
    !intent.success ||
    intent.data.opId !== value.local.opId ||
    intent.data.baseEpoch !== value.local.baseEpoch ||
    intent.data.inverseOf !== value.local.inverseOf ||
    !pintaValuesEqual(intent.data.readSet, value.local.readSet) ||
    intent.data.members.length !== value.local.members.length
  )
    return false
  const members = new Map(value.local.members.map((member) => [member.itemId, member]))
  return (
    intent.data.members.every((member) => {
      const stored = members.get(member.itemId)
      return (
        stored?.action === member.action &&
        stored.baseRevision === member.baseRevision &&
        (member.action !== 'put' || pintaValuesEqual(stored.operation, member.operation))
      )
    }) &&
    value.bytes ===
      intent.data.members.reduce((n, member) => n + (member.action === 'put' ? member.bytes : 0), 0)
  )
}

function confirmedState(value: unknown): value is Map<string, PintaCausalConfirmed> {
  if (!(value instanceof Map)) return false
  for (const [id, mark] of value) {
    if (
      !pintaCausalItemIdSchema.safeParse(id).success ||
      !object(mark) ||
      !pintaCausalRevisionSchema.safeParse(mark.revision).success ||
      mark.revision === 0 ||
      !localRevision(mark.localRevision) ||
      typeof mark.deleted !== 'boolean' ||
      (mark.sha256 !== null && !digest(mark.sha256)) ||
      (mark.deleted && (mark.sha256 !== null || mark.layoutRevision !== null)) ||
      (mark.layoutRevision !== null &&
        !pintaCausalEpochSchema.safeParse(mark.layoutRevision).success) ||
      (mark.opId !== undefined && !pintaCausalOpIdSchema.safeParse(mark.opId).success)
    )
      return false
  }
  return true
}

function unbasedState(value: unknown): value is PintaLocalUnbased {
  if (
    !object(value) ||
    !pintaCausalOpIdSchema.safeParse(value.opId).success ||
    !Array.isArray(value.members) ||
    value.members.length === 0 ||
    value.members.length > PINTA_CAUSAL_LIMITS.members ||
    !Array.isArray(value.readSet) ||
    value.readSet.length > PINTA_CAUSAL_LIMITS.readEdges
  )
    return false
  const memberIds = new Set<string>()
  for (const member of value.members) {
    if (
      !object(member) ||
      typeof member.itemId !== 'string' ||
      !pintaCausalItemIdSchema.safeParse(member.itemId).success ||
      memberIds.has(member.itemId) ||
      !localRevision(member.localRevision) ||
      typeof member.deleted !== 'boolean'
    )
      return false
    memberIds.add(member.itemId)
  }
  const edges = new Set<string>()
  for (const edge of value.readSet) {
    if (
      !object(edge) ||
      typeof edge.consumerId !== 'string' ||
      !memberIds.has(edge.consumerId) ||
      typeof edge.targetId !== 'string' ||
      !pintaCausalItemIdSchema.safeParse(edge.targetId).success ||
      (edge.localRevision !== null && !localRevision(edge.localRevision))
    )
      return false
    const key = `${edge.consumerId}\u0000${edge.targetId}`
    if (edges.has(key)) return false
    edges.add(key)
  }
  return true
}

function recoveryState(value: unknown): value is Map<string, string> {
  if (!(value instanceof Map)) return false
  for (const [id, revision] of value)
    if (!pintaCausalItemIdSchema.safeParse(id).success || !localRevision(revision)) return false
  return true
}

export function readLocalCausalState(records: ReadonlyMap<string, unknown>): LocalCausalState {
  const value = records.get(PINTA_CAUSAL_OUTBOX_KEY)
  if (value === undefined)
    return {
      version: 1,
      protocolKnown: false,
      epoch: null,
      pending: [],
      sealed: null,
      confirmed: new Map(),
    }
  if (
    !object(value) ||
    value.version !== 1 ||
    (value.protocolKnown !== undefined && typeof value.protocolKnown !== 'boolean') ||
    (value.epoch != null && !pintaCausalEpochSchema.safeParse(value.epoch).success) ||
    (value.writeEpoch !== undefined &&
      !pintaCausalEpochSchema.safeParse(value.writeEpoch).success) ||
    (value.unbased !== undefined && !unbasedState(value.unbased)) ||
    (value.recovered !== undefined && !recoveryState(value.recovered)) ||
    !Array.isArray(value.pending) ||
    value.pending.length > PINTA_CAUSAL_LIMITS.members ||
    !value.pending.every(pendingState) ||
    (value.sealed !== null && !sealedState(value.sealed)) ||
    !confirmedState(value.confirmed)
  )
    invalid()
  const ids = new Set<string>()
  const owners = new Set<string>()
  for (const unit of value.pending) {
    if (ids.has(unit.opId) || unit.opId === value.sealed?.local.opId) invalid()
    ids.add(unit.opId)
    for (const member of unit.members) {
      if (owners.has(member.itemId)) invalid()
      owners.add(member.itemId)
    }
  }
  return {
    version: 1,
    protocolKnown: value.protocolKnown === true,
    epoch: typeof value.epoch === 'string' ? value.epoch : null,
    ...(typeof value.writeEpoch === 'string' ? { writeEpoch: value.writeEpoch } : {}),
    ...(unbasedState(value.unbased) ? { unbased: value.unbased } : {}),
    ...(recoveryState(value.recovered) ? { recovered: value.recovered } : {}),
    pending: value.pending,
    sealed: value.sealed,
    confirmed: value.confirmed,
  }
}

export function ownsLocalCausalMember(
  state: LocalCausalState,
  id: string,
  beforeBasis = true,
): boolean {
  return (
    (beforeBasis && (state.unbased?.members.some((member) => member.itemId === id) ?? false)) ||
    state.pending.some((unit) => unit.members.some((member) => member.itemId === id)) ||
    (state.sealed?.local.members.some((member) => member.itemId === id) ?? false)
  )
}

export function stageLocalUnbasedDraft<Asset extends PintaMemoryAsset>(
  records: Map<string, unknown>,
  draft: PintaLocalUnbasedDraft<Asset>,
  write: () => LocalSnapshot<Asset>,
): LocalSnapshot<Asset> {
  const state = readLocalCausalState(records)
  if (
    state.epoch !== null ||
    state.writeEpoch !== undefined ||
    draft.transitions.some(({ id }) => ownsLocalCausalMember(state, id, false))
  )
    invalid()
  const snapshot = write()
  const updated = new Set(draft.transitions.map(({ id }) => id))
  const members = [...(state.unbased?.members.filter(({ itemId }) => !updated.has(itemId)) ?? [])]
  for (const { id, after } of draft.transitions) {
    const revision = snapshot.documents.get(id)?.revision
    if (!revision) invalid()
    members.push({ itemId: id, localRevision: revision, deleted: after === null })
  }
  const unbased = {
    opId: state.unbased?.opId ?? crypto.randomUUID(),
    members,
    readSet: [
      ...(state.unbased?.readSet.filter(({ consumerId }) => !updated.has(consumerId)) ?? []),
      ...draft.readSet.map((edge) => ({
        ...edge,
        localRevision:
          updated.has(edge.targetId) && snapshot.assets.has(edge.targetId)
            ? (snapshot.documents.get(edge.targetId)?.revision ?? null)
            : edge.localRevision,
      })),
    ],
  }
  if (!unbasedState(unbased)) invalid()
  saveState(records, { ...state, unbased })
  return snapshot
}

export function localCausalBytes(records: ReadonlyMap<string, unknown>): number {
  if (records.get(PINTA_CAUSAL_OUTBOX_KEY) === undefined) return 0
  const state = readLocalCausalState(records)
  const metadata = JSON.stringify({
    ...state,
    confirmed: [...state.confirmed],
    ...(state.recovered ? { recovered: [...state.recovered] } : {}),
  })
  return new TextEncoder().encode(metadata).length + (state.sealed?.bytes ?? 0)
}

function saveState(records: Map<string, unknown>, state: LocalCausalState): void {
  records.set(PINTA_CAUSAL_OUTBOX_KEY, state)
}

export function rememberLocalCausalProtocol(records: Map<string, unknown>): void {
  const state = readLocalCausalState(records)
  if (!state.protocolKnown) saveState(records, { ...state, protocolKnown: true })
}

export function localCausalPullImpact<Asset extends PintaMemoryAsset>(
  pull: PintaCausalLocalPull<Asset>,
  state: LocalCausalState,
  snapshot: LocalSnapshot<Asset>,
): { ids: string[]; blocked: boolean; recover?: string[] } {
  const written = new Set(pull.transitions.map(({ id }) => id))
  const changedLayout = new Set<string>()
  let hasSelectorChange = false
  const projected = new Map(snapshot.assets)
  for (const { id, before, after, remote } of pull.transitions) {
    if (after) projected.set(id, after)
    else projected.delete(id)
    if (
      !before ||
      !after ||
      ((before.kind === 'tilemap' || after.kind === 'tilemap') &&
        (before.name !== after.name || before.kind !== after.kind))
    )
      hasSelectorChange = true
    const mark = state.confirmed.get(id)
    const kindChanged = before && before.kind !== after?.kind
    const layoutChanged =
      before &&
      isTilesetKind(before) &&
      (mark ? mark.layoutRevision !== remote?.layoutRevision : !pintaValuesEqual(before, after))
    if (kindChanged || layoutChanged) changedLayout.add(id)
  }
  const mayRecover =
    pull.recoverInitial === true &&
    state.epoch === null &&
    !state.confirmed.size &&
    !state.sealed &&
    !state.pending.length
  const seeds = mayRecover ? initialRecoverySeeds(pull, snapshot.assets) : new Set<string>()
  let blocked = (hasSelectorChange || changedLayout.size > 0) && snapshot.issues.length > 0
  const affected = new Set(written)
  if (!hasSelectorChange && !changedLayout.size && !seeds.size)
    return { ids: [...affected], blocked }
  for (const asset of snapshot.assets.values()) {
    if (written.has(asset.id)) continue
    const usesChangedLayout = pintaAssetDependencyIds(asset).some((id) => changedLayout.has(id))
    const doorChanged =
      hasSelectorChange &&
      !pintaValuesEqual(
        pintaDoorBindings(asset, snapshot.assets),
        pintaDoorBindings(asset, projected),
      )
    if (!usesChangedLayout && !doorChanged) continue
    affected.add(asset.id)
    const mark = state.confirmed.get(asset.id)
    if (
      !mark ||
      mark.deleted ||
      mark.localRevision !== snapshot.documents.get(asset.id)?.revision
    ) {
      if (mayRecover) seeds.add(asset.id)
      else blocked = true
    }
  }
  if (seeds.size) {
    const closure = initialRecoveryClosure(seeds, snapshot.assets)
    for (const id of closure.ids) affected.add(id)
    return {
      ids: [...affected],
      blocked: blocked || closure.incomplete || snapshot.issues.length > 0,
      recover: closure.ids,
    }
  }
  return { ids: [...affected], blocked }
}

export function installLocalCausalPull<Asset extends PintaMemoryAsset>(
  records: Map<string, unknown>,
  pull: PintaCausalLocalPull<Asset>,
  write: (
    authorize: (snapshot: LocalSnapshot<Asset>) => readonly LocalAssetTransition<Asset>[],
  ) => LocalSnapshot<Asset>,
): LocalSnapshot<Asset> | null {
  const state = readLocalCausalState(records)
  if (!pintaCausalEpochSchema.safeParse(pull.epoch).success) invalid()
  const knownEpoch = state.writeEpoch ?? state.epoch
  if (
    state.epoch !== pull.fromEpoch ||
    (knownEpoch !== null && BigInt(pull.epoch) < BigInt(knownEpoch))
  )
    return null
  const covered = new Set(pull.coveredIds ?? pull.transitions.map(({ id }) => id))
  let copies: Asset[] = []
  let moved = new Set<string>()
  const snapshot = write((before) => {
    const impact = localCausalPullImpact(pull, state, before)
    if (impact.blocked || impact.ids.some((id) => !covered.has(id)))
      throw new PintaCausalPullDeferred()
    moved = new Set(impact.recover ?? [])
    for (const change of pull.transitions) {
      if (Boolean(change.after) !== Boolean(change.remote)) invalid()
      if (ownsLocalCausalMember(state, change.id, false)) throw new PintaCausalPullDeferred()
      const mark = state.confirmed.get(change.id)
      if (
        (change.before !== null || change.beforeRevision !== null) &&
        mark?.localRevision !== change.beforeRevision
      ) {
        // A weak mark never authorizes replacement of distinct local content.
        if (
          !change.remote ||
          (!pintaValuesEqual(change.before, change.after) && !moved.has(change.id))
        )
          throw new PintaCausalPullDeferred()
      } else if (!change.remote && !mark) throw new PintaCausalPullDeferred()
    }
    if (!moved.size) return []
    const recovery = recoverInitialLocalAssets([...moved], pull, before)
    if (!recovery) throw new PintaCausalPullDeferred()
    copies = recovery.copies
    return recovery.writes
  })
  const confirmed = new Map(state.confirmed)
  for (const change of pull.transitions) {
    const localRevision = snapshot.documents.get(change.id)?.revision
    if (!localRevision) invalid()
    const previous = confirmed.get(change.id)
    const revision = change.remote?.revision ?? previous?.revision
    if (!revision) invalid()
    confirmed.set(change.id, {
      localRevision,
      revision,
      deleted: change.remote === null,
      sha256: change.remote?.sha256 ?? null,
      layoutRevision: change.remote?.layoutRevision ?? null,
    })
  }
  const recovered = new Map(state.recovered)
  for (const copy of copies) {
    const saved = snapshot.assets.get(copy.id)
    const revision = snapshot.documents.get(copy.id)?.revision
    if (!saved || !revision) invalid()
    recovered.set(copy.id, revision)
    snapshot.recovered.push(saved)
  }
  const { unbased, ...account } = state
  const stillUnbased = unbased && {
    ...unbased,
    members: unbased.members.filter(({ itemId }) => !moved.has(itemId)),
    readSet: unbased.readSet.filter(({ consumerId }) => !moved.has(consumerId)),
  }
  const local = prepareUnbasedCreates(stillUnbased, pull, snapshot, confirmed)
  if (stillUnbased?.members.length && !local) throw new PintaCausalPullDeferred()
  saveState(records, {
    ...account,
    protocolKnown: true,
    epoch: pull.epoch,
    writeEpoch: pull.epoch,
    confirmed,
    ...(recovered.size ? { recovered } : {}),
    ...(local?.members.length ? { pending: [...state.pending, local] } : {}),
  })
  return snapshot
}

function prepareUnbasedCreates<Asset extends PintaMemoryAsset>(
  unbased: PintaLocalUnbased | undefined,
  pull: PintaCausalLocalPull<Asset>,
  snapshot: LocalSnapshot<Asset>,
  confirmed: ReadonlyMap<string, PintaCausalConfirmed>,
): PintaCausalPending | null {
  if (!unbased) return null
  const transitions = new Map(pull.transitions.map((change) => [change.id, change]))
  const members: PintaCausalPendingMember[] = []
  for (const draft of unbased.members) {
    const change = transitions.get(draft.itemId)
    const mark = confirmed.get(draft.itemId)
    if (mark && !mark.deleted) {
      if (
        change?.beforeRevision !== draft.localRevision ||
        !pintaValuesEqual(change.before, change.after)
      )
        return null
      continue
    }
    if (snapshot.documents.get(draft.itemId)?.revision !== draft.localRevision) return null
    if (!draft.deleted)
      members.push({
        itemId: draft.itemId,
        localRevision: draft.localRevision,
        action: 'put',
        baseRevision: 0,
        operation: { type: 'create' },
      })
  }
  const creates = new Map(members.map((member) => [member.itemId, member.localRevision]))
  const readSet: PintaCausalRead[] = []
  for (const read of unbased.readSet) {
    if (!creates.has(read.consumerId)) continue
    if (creates.has(read.targetId)) {
      if (creates.get(read.targetId) !== read.localRevision) return null
      readSet.push({ source: 'unit', consumerId: read.consumerId, targetId: read.targetId })
      continue
    }
    const mark = confirmed.get(read.targetId)
    const change = transitions.get(read.targetId)
    if (
      !mark?.sha256 ||
      mark.deleted ||
      !read.localRevision ||
      (mark.localRevision !== read.localRevision &&
        (change?.beforeRevision !== read.localRevision ||
          !pintaValuesEqual(change.before, change.after)))
    )
      return null
    readSet.push({
      source: 'snapshot',
      consumerId: read.consumerId,
      targetId: read.targetId,
      revision: mark.revision,
      sha256: mark.sha256,
      ...(mark.layoutRevision ? { layoutRevision: mark.layoutRevision } : {}),
    })
  }
  readSet.sort((a, b) => {
    const left = `${a.consumerId}\u0000${a.targetId}`
    const right = `${b.consumerId}\u0000${b.targetId}`
    return left < right ? -1 : left > right ? 1 : 0
  })
  return {
    opId: unbased.opId,
    preparation: crypto.randomUUID(),
    baseEpoch: pull.epoch,
    readSet,
    members,
  }
}

export function stageLocalCausalDraft<Asset extends PintaMemoryAsset>(
  records: Map<string, unknown>,
  draft: PintaCausalLocalDraft<Asset>,
  write: () => LocalSnapshot<Asset>,
): { snapshot: LocalSnapshot<Asset>; pending: PintaCausalPending } {
  const state = readLocalCausalState(records)
  const items = new Set(draft.transitions.map(({ id }) => id))
  if (items.size === 0 || draft.opId === state.sealed?.local.opId) invalid()
  const replacing = state.pending.filter(
    (unit) => unit.opId === draft.opId || unit.members.some((member) => items.has(member.itemId)),
  )
  const expected = new Map(draft.replaces?.map((unit) => [unit.opId, unit.preparation]))
  if (
    replacing.length !== expected.size ||
    replacing.some(
      (unit) =>
        expected.get(unit.opId) !== unit.preparation ||
        unit.members.some((member) => !items.has(member.itemId)),
    )
  )
    invalid()
  if (
    draft.follows &&
    (state.sealed?.local.opId !== draft.follows ||
      state.sealed.intent.baseEpoch !== draft.baseEpoch)
  )
    invalid()
  const hasBasis = (id: string, base: PintaCausalPredecessor) => {
    const source = state.sealed?.local.members.find((member) => member.itemId === id)
    const sent = state.sealed?.intent.members.find((member) => member.itemId === id)
    return (
      source?.localRevision === base.localRevision &&
      base.opId === state.sealed?.local.opId &&
      sent !== undefined &&
      base.sha256 === (sent.action === 'put' ? sent.sha256 : null)
    )
  }
  for (const member of draft.transitions) {
    if (!member.baseAfter) continue
    const previous = replacing
      .flatMap((group) => group.members)
      .find((item) => item.itemId === member.id)
    if (
      !hasBasis(member.id, member.baseAfter) ||
      (member.beforeRevision !== member.baseAfter.localRevision &&
        !pintaValuesEqual(previous?.baseAfter, member.baseAfter))
    )
      invalid()
  }
  if (
    draft.readSet.some(
      (edge) => edge.source === 'predecessor' && !hasBasis(edge.targetId, edge.base),
    )
  )
    invalid()
  const snapshot = write()
  const members = draft.transitions.map(({ id, after, baseRevision, operation, baseAfter }) => {
    const localRevision = snapshot.documents.get(id)?.revision
    if (!localRevision || Boolean(after) !== Boolean(operation)) invalid()
    return {
      itemId: id,
      localRevision,
      baseRevision,
      action: after ? ('put' as const) : ('delete' as const),
      ...(operation ? { operation } : {}),
      ...(baseAfter ? { baseAfter } : {}),
    }
  })
  const pending = {
    opId: draft.opId,
    preparation: crypto.randomUUID(),
    baseEpoch: draft.baseEpoch,
    ...(draft.inverseOf ? { inverseOf: draft.inverseOf } : {}),
    ...(draft.follows ? { follows: draft.follows } : {}),
    readSet: draft.readSet,
    members,
  }
  if (!pendingState(pending)) invalid()
  const recovered = new Map(state.recovered)
  for (const id of items) recovered.delete(id)
  saveState(records, {
    ...state,
    protocolKnown: true,
    ...(state.recovered ? { recovered } : {}),
    pending: [...state.pending.filter((unit) => !expected.has(unit.opId)), pending],
  })
  return { snapshot, pending }
}

export function sealLocalCausalDraft(
  records: Map<string, unknown>,
  preparation: string,
  intent: PintaCausalIntent,
  intentHash: string,
  blobs: ReadonlyMap<string, Blob>,
  matchesRevision: (member: PintaCausalPendingMember) => boolean,
): boolean {
  const state = readLocalCausalState(records)
  const local = state.pending.find((pending) => pending.opId === intent.opId)
  if (state.sealed || !local || local.preparation !== preparation) return false
  if (local.follows) return false
  if (!PintaCausalIntentSchema.safeParse(intent).success) invalid()
  if (
    !local.members.every(matchesRevision) ||
    intent.baseEpoch !== local.baseEpoch ||
    intent.inverseOf !== local.inverseOf ||
    intent.members.length !== local.members.length ||
    !pintaValuesEqual(intent.readSet, local.readSet)
  )
    return false
  let bytes = 0
  const members = new Map(local.members.map((member) => [member.itemId, member]))
  let blobCount = 0
  for (const member of intent.members) {
    const current = members.get(member.itemId)
    if (current?.action !== member.action || current.baseRevision !== member.baseRevision) invalid()
    if (member.action === 'put') {
      const blob = blobs.get(member.itemId)
      if (
        !blob ||
        blob.size !== member.bytes ||
        !pintaValuesEqual(current.operation, member.operation)
      )
        invalid()
      bytes += blob.size
      blobCount++
    }
    members.delete(member.itemId)
  }
  if (blobs.size !== blobCount || members.size !== 0) invalid()
  saveState(records, {
    ...state,
    pending: state.pending.filter((pending) => pending !== local),
    sealed: { local, intent, intentHash, bytes },
  })
  records.set(PINTA_CAUSAL_BLOBS_KEY, new Map(blobs))
  return true
}

export function readLocalCausalUpload(
  records: ReadonlyMap<string, unknown>,
): { sealed: PintaCausalSealed; blobs: ReadonlyMap<string, Blob> } | null {
  const { sealed } = readLocalCausalState(records)
  if (!sealed) return null
  const stored = records.get(PINTA_CAUSAL_BLOBS_KEY)
  if (!(stored instanceof Map) || !PintaCausalIntentSchema.safeParse(sealed.intent).success)
    invalid()
  const blobs = new Map<string, Blob>()
  let bytes = 0
  for (const member of sealed.intent.members) {
    if (member.action === 'delete') continue
    const blob: unknown = stored.get(member.itemId)
    if (!(blob instanceof Blob) || blob.size !== member.bytes) invalid()
    blobs.set(member.itemId, blob)
    bytes += blob.size
  }
  if (stored.size !== blobs.size || bytes !== sealed.bytes) invalid()
  return { sealed, blobs }
}

/** The exact same frozen candidate can get a fresh ticket after proof its remote basis is unchanged. */
export function renewLocalCausalUpload(
  records: Map<string, unknown>,
  previous: Pick<PintaCausalSealed, 'intentHash' | 'intent'>,
  next: PintaCausalIntent,
  intentHash: string,
): boolean {
  const state = readLocalCausalState(records)
  const sealed = state.sealed
  if (
    !sealed ||
    sealed.intent.opId !== previous.intent.opId ||
    sealed.intentHash !== previous.intentHash
  )
    return false
  const { opId, baseEpoch, ...body } = sealed.intent
  const { opId: renewed, baseEpoch: newEpoch, ...newBody } = next
  if (
    !PintaCausalIntentSchema.safeParse(next).success ||
    !digest(intentHash) ||
    renewed === opId ||
    newEpoch !== baseEpoch ||
    !pintaValuesEqual(body, newBody)
  )
    invalid()
  const pending = state.pending.map((unit) => {
    if (unit.follows !== opId) return unit
    return {
      ...unit,
      follows: renewed,
      members: unit.members.map((member) =>
        member.baseAfter
          ? { ...member, baseAfter: { ...member.baseAfter, opId: renewed } }
          : member,
      ),
      readSet: unit.readSet.map((edge) =>
        edge.source === 'predecessor' ? { ...edge, base: { ...edge.base, opId: renewed } } : edge,
      ),
    }
  })
  saveState(records, {
    ...state,
    pending,
    sealed: {
      ...sealed,
      local: { ...sealed.local, opId: renewed, baseEpoch: newEpoch },
      intent: next,
      intentHash,
    },
  })
  return true
}

function followVerifiedReceipt(
  pending: PintaCausalPending,
  sealed: PintaCausalSealed,
  receipt: PintaCausalResult,
  confirmed: Map<string, PintaCausalConfirmed>,
): PintaCausalPending {
  if (
    pending.follows !== receipt.opId ||
    pending.baseEpoch !== sealed.intent.baseEpoch ||
    BigInt(receipt.epoch) !== BigInt(pending.baseEpoch) + 1n
  )
    return pending
  const touched = new Set(receipt.members.map(({ itemId }) => itemId))
  const planned = new Set(pending.members.map(({ itemId }) => itemId))
  const topology = new Set(
    pending.members
      .filter((member) => member.action === 'delete' || member.operation?.type === 'remap')
      .map(({ itemId }) => itemId),
  )
  if (
    sealed.intent.readSet.some(
      (edge) => topology.has(edge.targetId) && !planned.has(edge.consumerId),
    )
  )
    return pending
  const resultOf = (id: string, observation: PintaCausalPredecessor) => {
    const mark = confirmed.get(id)
    return touched.has(id) &&
      mark?.opId === observation.opId &&
      mark.localRevision === observation.localRevision &&
      mark.sha256 === observation.sha256 &&
      !mark.deleted
      ? mark
      : undefined
  }
  const members: PintaCausalPendingMember[] = []
  for (const { baseAfter, ...member } of pending.members) {
    if (!baseAfter) {
      if (touched.has(member.itemId)) return pending
      members.push(member)
      continue
    }
    const mark = resultOf(member.itemId, baseAfter)
    if (!mark || member.operation?.type === 'create') return pending
    members.push({ ...member, baseRevision: mark.revision })
  }
  const readSet: PintaCausalRead[] = []
  for (const edge of pending.readSet) {
    if (edge.source !== 'predecessor') {
      if (edge.source === 'snapshot' && touched.has(edge.targetId)) return pending
      readSet.push(edge)
      continue
    }
    const mark = resultOf(edge.targetId, edge.base)
    if (!mark?.sha256) return pending
    readSet.push({
      source: 'snapshot',
      consumerId: edge.consumerId,
      targetId: edge.targetId,
      revision: mark.revision,
      sha256: mark.sha256,
      ...(mark.layoutRevision ? { layoutRevision: mark.layoutRevision } : {}),
    })
  }
  const { follows: _previous, ...rest } = pending
  return { ...rest, baseEpoch: receipt.epoch, preparation: crypto.randomUUID(), members, readSet }
}

/** Acknowledges the revision sent, even when a successor is already on disk. */
export function acknowledgeLocalCausalDraft(
  records: Map<string, unknown>,
  receipt: PintaCausalResult,
): boolean {
  const state = readLocalCausalState(records)
  const sealed = state.sealed
  if (!sealed || receipt.opId !== sealed.local.opId) return false
  if (
    !PintaCausalResultSchema.safeParse(receipt).success ||
    receipt.intentHash !== sealed.intentHash ||
    BigInt(receipt.epoch) <= BigInt(sealed.intent.baseEpoch) ||
    receipt.members.length !== sealed.local.members.length
  )
    invalid()
  const confirmed = new Map(state.confirmed)
  const local = new Map(sealed.local.members.map((member) => [member.itemId, member]))
  const sent = new Map(sealed.intent.members.map((member) => [member.itemId, member]))
  for (const member of receipt.members) {
    const snapshot = local.get(member.itemId)
    const written = sent.get(member.itemId)
    if (
      !snapshot ||
      !written ||
      member.revision <= written.baseRevision ||
      (confirmed.get(member.itemId)?.revision ?? 0) >= member.revision ||
      member.deleted !== (written.action === 'delete') ||
      member.sha256 !== (written.action === 'put' ? written.sha256 : null)
    )
      invalid()
    confirmed.set(member.itemId, {
      revision: member.revision,
      localRevision: snapshot.localRevision,
      deleted: member.deleted,
      sha256: member.sha256,
      layoutRevision: member.layoutRevision,
      opId: receipt.opId,
    })
    local.delete(member.itemId)
  }
  if (local.size) invalid()
  saveState(records, {
    ...state,
    ...((state.writeEpoch ?? state.epoch) === sealed.intent.baseEpoch &&
    BigInt(receipt.epoch) === BigInt(sealed.intent.baseEpoch) + 1n
      ? { writeEpoch: receipt.epoch }
      : {}),
    confirmed,
    sealed: null,
    pending: state.pending.map((pending) =>
      followVerifiedReceipt(pending, sealed, receipt, confirmed),
    ),
  })
  records.delete(PINTA_CAUSAL_BLOBS_KEY)
  return true
}
