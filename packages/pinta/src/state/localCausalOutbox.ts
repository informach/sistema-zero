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
import { pintaDoorDependencyIds, SceneMapClosureError } from '../core/sceneMapClosure'
import type { LocalAssetTransition, LocalSnapshot } from './localAssetAuthority'

export const PINTA_CAUSAL_OUTBOX_KEY = 'pinta:sync:causal'
export const PINTA_CAUSAL_BLOBS_KEY = 'pinta:sync:sealed-blobs'

interface PintaCausalDraftMember {
  itemId: string
  baseRevision: number
  operation?: PintaCausalOperation
}

export interface PintaCausalLocalDraft<Asset extends PintaMemoryAsset> {
  opId: string
  baseEpoch: string
  inverseOf?: string
  readSet: readonly PintaCausalRead[]
  transitions: readonly (LocalAssetTransition<Asset> & Omit<PintaCausalDraftMember, 'itemId'>)[]
  /** Exact queued preparations this draft supersedes. Every member must follow. */
  replaces?: readonly { opId: string; preparation: string }[]
  requireKnownInventory?: boolean
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
  readSet: readonly PintaCausalRead[]
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
  transitions: readonly (LocalAssetTransition<Asset> & {
    remote: Pick<PintaCausalConfirmed, 'revision' | 'sha256' | 'layoutRevision'> | null
    /** An exact native revision authenticated before this client started using the outbox. */
    confirmedLegacy?: { revision: number; localRevision: string }
  })[]
}

export class PintaCausalPullDeferred extends Error {}

export interface LocalCausalState {
  version: 1
  protocolKnown: boolean
  epoch: string | null
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

function pendingState(value: unknown): value is PintaCausalPending {
  if (
    !object(value) ||
    !pintaCausalOpIdSchema.safeParse(value.opId).success ||
    !pintaCausalOpIdSchema.safeParse(value.preparation).success ||
    !pintaCausalEpochSchema.safeParse(value.baseEpoch).success ||
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
    if (raw.action === 'delete') {
      if (base.data === 0 || raw.operation !== undefined) return false
      continue
    }
    if (raw.action !== 'put') return false
    const operation = PintaCausalOperationSchema.safeParse(raw.operation)
    if (!operation.success || (base.data === 0) !== (operation.data.type === 'create')) return false
    puts.add(id.data)
  }
  const edges = new Set<string>()
  for (const raw of value.readSet as unknown[]) {
    const edge = PintaCausalReadSchema.safeParse(raw)
    if (!edge.success) return false
    const { consumerId, targetId, source } = edge.data
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
    pending: value.pending,
    sealed: value.sealed,
    confirmed: value.confirmed,
  }
}

export function ownsLocalCausalMember(state: LocalCausalState, id: string): boolean {
  return (
    state.pending.some((unit) => unit.members.some((member) => member.itemId === id)) ||
    (state.sealed?.local.members.some((member) => member.itemId === id) ?? false)
  )
}

export function localCausalBytes(records: ReadonlyMap<string, unknown>): number {
  if (records.get(PINTA_CAUSAL_OUTBOX_KEY) === undefined) return 0
  const state = readLocalCausalState(records)
  const metadata = JSON.stringify({ ...state, confirmed: [...state.confirmed] })
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
): { ids: string[]; blocked: boolean } {
  const written = new Set(pull.transitions.map(({ id }) => id))
  const changedLayout = new Set<string>()
  let hasNameChange = false
  const projected = new Map(snapshot.assets)
  for (const { id, before, after, remote } of pull.transitions) {
    if (after) projected.set(id, after)
    else projected.delete(id)
    if (before?.name !== after?.name && (before?.kind === 'tilemap' || after?.kind === 'tilemap'))
      hasNameChange = true
    const mark = state.confirmed.get(id)
    const kindChanged = before && before.kind !== after?.kind
    const layoutChanged =
      before &&
      isTilesetKind(before) &&
      (mark ? mark.layoutRevision !== remote?.layoutRevision : !pintaValuesEqual(before, after))
    if (kindChanged || layoutChanged) changedLayout.add(id)
  }
  let blocked = (hasNameChange || changedLayout.size > 0) && snapshot.issues.length > 0
  const affected = new Set(written)
  if (!hasNameChange && changedLayout.size === 0) return { ids: [...affected], blocked }
  const doorsIn = (asset: Asset, catalog: ReadonlyMap<string, Asset>): string[] | null => {
    try {
      return pintaDoorDependencyIds(asset, catalog).sort()
    } catch (error) {
      if (!(error instanceof SceneMapClosureError)) throw error
      return null
    }
  }
  for (const asset of snapshot.assets.values()) {
    if (written.has(asset.id)) continue
    const usesChangedLayout = pintaAssetDependencyIds(asset).some((id) => changedLayout.has(id))
    const doorChanged =
      hasNameChange && !pintaValuesEqual(doorsIn(asset, snapshot.assets), doorsIn(asset, projected))
    if (!usesChangedLayout && !doorChanged) continue
    affected.add(asset.id)
    const mark = state.confirmed.get(asset.id)
    if (!mark || mark.deleted || mark.localRevision !== snapshot.documents.get(asset.id)?.revision)
      blocked = true
  }
  return { ids: [...affected], blocked }
}

export function installLocalCausalPull<Asset extends PintaMemoryAsset>(
  records: Map<string, unknown>,
  pull: PintaCausalLocalPull<Asset>,
  write: (authorize: (snapshot: LocalSnapshot<Asset>) => void) => LocalSnapshot<Asset>,
): LocalSnapshot<Asset> | null {
  const state = readLocalCausalState(records)
  if (!pintaCausalEpochSchema.safeParse(pull.epoch).success) invalid()
  if (
    state.epoch !== pull.fromEpoch ||
    (state.epoch !== null && BigInt(pull.epoch) < BigInt(state.epoch))
  )
    return null
  for (const change of pull.transitions) {
    if (ownsLocalCausalMember(state, change.id)) return null
    const mark = state.confirmed.get(change.id) ?? change.confirmedLegacy
    if (Boolean(change.after) !== Boolean(change.remote)) invalid()
    if (
      (change.before !== null || change.beforeRevision !== null) &&
      mark?.localRevision !== change.beforeRevision
    ) {
      // A first download can adopt an identical local file. It never overwrites a different one.
      if (!change.remote || !pintaValuesEqual(change.before, change.after)) return null
    } else if (!change.remote && !mark) return null
  }
  const covered = new Set(pull.coveredIds ?? pull.transitions.map(({ id }) => id))
  const snapshot = write((before) => {
    const impact = localCausalPullImpact(pull, state, before)
    if (impact.blocked || impact.ids.some((id) => !covered.has(id)))
      throw new PintaCausalPullDeferred()
  })
  const confirmed = new Map(state.confirmed)
  for (const change of pull.transitions) {
    const localRevision = snapshot.documents.get(change.id)?.revision
    if (!localRevision) invalid()
    const previous = confirmed.get(change.id) ?? change.confirmedLegacy
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
  saveState(records, { ...state, protocolKnown: true, epoch: pull.epoch, confirmed })
  return snapshot
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
  const snapshot = write()
  const members = draft.transitions.map(({ id, after, baseRevision, operation }) => {
    const localRevision = snapshot.documents.get(id)?.revision
    if (!localRevision || Boolean(after) !== Boolean(operation)) invalid()
    return {
      itemId: id,
      localRevision,
      baseRevision,
      action: after ? ('put' as const) : ('delete' as const),
      ...(operation ? { operation } : {}),
    }
  })
  const pending = {
    opId: draft.opId,
    preparation: crypto.randomUUID(),
    baseEpoch: draft.baseEpoch,
    ...(draft.inverseOf ? { inverseOf: draft.inverseOf } : {}),
    readSet: draft.readSet,
    members,
  }
  if (!pendingState(pending)) invalid()
  saveState(records, {
    ...state,
    protocolKnown: true,
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
  saveState(records, { ...state, confirmed, sealed: null })
  records.delete(PINTA_CAUSAL_BLOBS_KEY)
  return true
}
