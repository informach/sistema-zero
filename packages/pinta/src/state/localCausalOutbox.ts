import {
  PINTA_CAUSAL_LIMITS,
  type PintaCausalIntent,
  PintaCausalIntentSchema,
  type PintaCausalMember,
  PintaCausalMemberSchema,
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
import { copyArchivedRecovery, planArchivedRecovery } from './localCausalArchive'
import {
  keepLivePins,
  type LocalPins,
  type PintaPinDraft,
  retainPinnedWrites,
  uniquePinBytes,
  validLocalPins,
} from './localCausalPins'
import { localRecoveryClosure, localRecoverySeeds, recoverLocalAssets } from './localCausalRecovery'

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
  independent?: true
  shadow?: PintaCandidateBytes
  authors?: ReadonlyMap<string, Asset>
  pins?: PintaPinDraft
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
  /** These puts retain the observed tile identities even though their artwork changed. */
  stableTilesets?: readonly string[]
  migrations?: readonly { itemId: string; localRevision: string }[]
  shadow?: PintaCandidateBytes
  authors?: ReadonlyMap<string, Asset>
  pins?: PintaPinDraft
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
  originalOpId?: string
  /** Changes on a replacement, including ones that deliberately keep the operation ID. */
  preparation: string
  baseEpoch: string
  inverseOf?: string
  readSet: readonly PintaLocalCausalRead[]
  follows?: string
  independent?: true
  members: readonly PintaCausalPendingMember[]
}

export type PintaPreparedPut = Omit<
  Extract<PintaCausalMember, { action: 'put' }>,
  'action' | 'baseRevision' | 'operation'
>

export interface PintaCausalPrepared {
  puts: readonly PintaPreparedPut[]
  bytes: number
}

export interface PintaCandidateBytes {
  puts: readonly PintaPreparedPut[]
  blobs: ReadonlyMap<string, Blob>
}

export function localPreparedKey(opId: string): string {
  return `pinta:sync:prepared:${opId}`
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
  originalOpId?: string
}

export interface PintaCausalLocalPull<Asset extends PintaMemoryAsset> {
  fromEpoch: string | null
  epoch: string
  coveredIds?: readonly string[]
  recoverInitial?: true
  recoverDiverged?: true
  archived?: readonly { opId: string; localRevision: string; sha256: string; asset: Asset }[]
  archivedPins?: readonly { opId: string; sha256: string; asset: Asset }[]
  recoverUnit?: {
    opId: string
    intentHash: string
    terminal: 'aborted' | 'expired' | 'unknown'
    pending: readonly { opId: string; preparation: string }[]
  }
  transitions: readonly (LocalAssetTransition<Asset> & {
    remote: Pick<PintaCausalConfirmed, 'revision' | 'sha256' | 'layoutRevision'> | null
  })[]
}

export class PintaCausalPullDeferred extends Error {}

export interface LocalCausalState {
  version: 1 | 2 | 3 | 4
  pins?: LocalPins
  protocolKnown: boolean
  epoch: string | null
  /** A complete read epoch followed by this device's consecutive confirmed writes. */
  writeEpoch?: string
  unbased?: PintaLocalUnbased
  /** Exact revisions of recovery copies that still live only in this gallery. */
  recovered?: Map<string, string>
  prepared?: Map<string, PintaCausalPrepared>
  shadows?: Map<string, PintaCausalPrepared>
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
    (value.originalOpId !== undefined &&
      !pintaCausalOpIdSchema.safeParse(value.originalOpId).success) ||
    !pintaCausalOpIdSchema.safeParse(value.preparation).success ||
    !pintaCausalEpochSchema.safeParse(value.baseEpoch).success ||
    (value.follows !== undefined && !pintaCausalOpIdSchema.safeParse(value.follows).success) ||
    (value.independent !== undefined && value.independent !== true) ||
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
    if (raw.baseAfter !== undefined && (!predecessor(raw.baseAfter) || !value.follows)) return false
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
    if (!edge.success && (source !== 'predecessor' || !predecessor(data.base) || !value.follows))
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
      (mark.opId !== undefined && !pintaCausalOpIdSchema.safeParse(mark.opId).success) ||
      (mark.originalOpId !== undefined &&
        !pintaCausalOpIdSchema.safeParse(mark.originalOpId).success)
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

function preparedState(
  value: unknown,
  groups: readonly PintaCausalPending[],
): value is Map<string, PintaCausalPrepared> {
  if (!(value instanceof Map) || value.size > groups.length) return false
  for (const [index, group] of groups.entries()) {
    if (!value.has(group.opId)) return index === value.size
    const putIds = new Set(
      group.members.filter((member) => member.action === 'put').map(({ itemId }) => itemId),
    )
    if (!candidateState(value.get(group.opId), putIds)) return false
  }
  return true
}

function candidateState(candidate: unknown, putIds: Set<string>): candidate is PintaCausalPrepared {
  if (!object(candidate) || !Array.isArray(candidate.puts)) return false
  let sum = 0
  for (const put of candidate.puts) {
    if (!object(put)) return false
    const wire = PintaCausalMemberSchema.safeParse({
      ...put,
      action: 'put',
      operation: { type: 'update' },
      baseRevision: 1,
    })
    if (!wire.success || wire.data.action !== 'put' || !putIds.delete(wire.data.itemId))
      return false
    sum += wire.data.bytes
  }
  return putIds.size === 0 && candidate.bytes === sum
}

function shadowState(
  raw: unknown,
  groups: readonly PintaCausalPending[],
  prepared: ReadonlyMap<string, PintaCausalPrepared> | undefined,
  unbased: PintaLocalUnbased | undefined,
): raw is Map<string, PintaCausalPrepared> {
  if (!(raw instanceof Map)) return false
  for (const [opId, source] of raw) {
    if (prepared?.has(opId)) return false
    const group = groups.find((item) => item.opId === opId)
    if (group) {
      if (
        !candidateState(
          source,
          new Set(
            group.members.filter(({ action }) => action === 'put').map(({ itemId }) => itemId),
          ),
        )
      )
        return false
    } else if (
      !unbased ||
      unbased.opId !== opId ||
      !candidateState(
        source,
        new Set(unbased.members.filter(({ deleted }) => !deleted).map(({ itemId }) => itemId)),
      )
    )
      return false
  }
  return true
}

export function readLocalCausalState(records: ReadonlyMap<string, unknown>): LocalCausalState {
  const value = records.get(PINTA_CAUSAL_OUTBOX_KEY)
  if (value === undefined)
    return {
      version: 4,
      protocolKnown: false,
      epoch: null,
      pending: [],
      sealed: null,
      confirmed: new Map(),
    }
  if (
    !object(value) ||
    (value.version !== 1 && value.version !== 2 && value.version !== 3 && value.version !== 4) ||
    (value.protocolKnown !== undefined && typeof value.protocolKnown !== 'boolean') ||
    (value.epoch != null && !pintaCausalEpochSchema.safeParse(value.epoch).success) ||
    (value.writeEpoch !== undefined &&
      !pintaCausalEpochSchema.safeParse(value.writeEpoch).success) ||
    (value.unbased !== undefined && !unbasedState(value.unbased)) ||
    (value.recovered !== undefined && !recoveryState(value.recovered)) ||
    !Array.isArray(value.pending) ||
    value.pending.length > PINTA_CAUSAL_LIMITS.members ||
    !value.pending.every(pendingState) ||
    (value.prepared !== undefined && !preparedState(value.prepared, value.pending)) ||
    (value.shadows !== undefined &&
      ((value.version !== 3 && value.version !== 4) ||
        !shadowState(value.shadows, value.pending, value.prepared, value.unbased))) ||
    (value.sealed !== null && !sealedState(value.sealed)) ||
    !confirmedState(value.confirmed)
  )
    invalid()
  const ownerIds = pinOwners(value.pending, value.sealed, value.unbased)
  if (value.pins !== undefined && (value.version !== 4 || !validLocalPins(value.pins, ownerIds)))
    invalid()
  const ids = new Set<string>()
  const mutableOwners = new Set<string>()
  for (const unit of value.pending) {
    if (ids.has(unit.opId) || unit.opId === value.sealed?.local.opId) invalid()
    ids.add(unit.opId)
    if (!value.prepared?.has(unit.opId)) {
      for (const member of unit.members) {
        if (mutableOwners.has(member.itemId)) invalid()
        mutableOwners.add(member.itemId)
      }
    }
  }
  return {
    version: value.version,
    ...(validLocalPins(value.pins, ownerIds) ? { pins: value.pins } : {}),
    protocolKnown: value.protocolKnown === true,
    epoch: typeof value.epoch === 'string' ? value.epoch : null,
    ...(typeof value.writeEpoch === 'string' ? { writeEpoch: value.writeEpoch } : {}),
    ...(unbasedState(value.unbased) ? { unbased: value.unbased } : {}),
    ...(recoveryState(value.recovered) ? { recovered: value.recovered } : {}),
    ...(preparedState(value.prepared, value.pending) ? { prepared: value.prepared } : {}),
    ...(shadowState(value.shadows, value.pending, value.prepared, value.unbased)
      ? { shadows: value.shadows }
      : {}),
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
  for (const { itemId, localRevision } of draft.migrations ?? []) {
    if (
      !state.unbased?.members.some(
        (member) =>
          member.itemId === itemId && member.localRevision === localRevision && !member.deleted,
      ) ||
      snapshot.documents.get(itemId)?.revision !== localRevision ||
      updated.has(itemId)
    )
      invalid()
  }
  const stable = new Map<string, { before: string; after: string }>()
  for (const id of draft.stableTilesets ?? []) {
    const change = draft.transitions.find((transition) => transition.id === id)
    const before = change?.before
    const after = change?.after
    const afterRevision = snapshot.documents.get(id)?.revision
    if (
      !change?.beforeRevision ||
      !afterRevision ||
      !before ||
      !after ||
      !isTilesetKind(before) ||
      !isTilesetKind(after) ||
      before.kind !== after.kind ||
      before.tileSize !== after.tileSize ||
      before.tiles.length !== after.tiles.length
    )
      invalid()
    stable.set(id, { before: change.beforeRevision, after: afterRevision })
  }
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
      ...(state.unbased?.readSet
        .filter(({ consumerId }) => !updated.has(consumerId))
        .map((edge) => {
          const revision = stable.get(edge.targetId)
          return revision && revision.before === edge.localRevision
            ? { ...edge, localRevision: revision.after }
            : edge
        }) ?? []),
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
  const shadows = new Map(state.shadows)
  if (shadows.has(unbased.opId) && !draft.shadow) invalid()
  if (draft.shadow) {
    const before = readLocalCausalRetained(records, unbased.opId)
    const puts = [
      ...(before?.puts.filter(({ itemId }) => !updated.has(itemId)) ?? []),
      ...draft.shadow.puts,
    ]
    const blobs = new Map(before?.blobs)
    for (const id of updated) blobs.delete(id)
    for (const [id, blob] of draft.shadow.blobs) blobs.set(id, blob)
    shadows.set(
      unbased.opId,
      storeCandidate(
        records,
        unbased.opId,
        { puts, blobs },
        unbased.members.filter(({ deleted }) => !deleted).map(({ itemId }) => itemId),
      ),
    )
  }
  const pins = draft.pins
    ? retainPinnedWrites(records, snapshot, state, unbased.opId, draft.pins)
    : state.pins
  if (draft.pins) {
    const authored = new Map(members.map((member) => [member.itemId, member]))
    const resources = new Map(pins?.get(unbased.opId)?.map((entry) => [entry.itemId, entry]))
    for (const { targetId, localRevision } of unbased.readSet) {
      if (!localRevision || authored.get(targetId)?.localRevision === localRevision) continue
      if (resources.get(targetId)?.localRevision !== localRevision) invalid()
    }
  }
  saveState(records, {
    ...state,
    unbased,
    ...(pins ? { pins } : {}),
    ...(draft.shadow ? { shadows } : {}),
  })
  return snapshot
}

export function localCausalBytes(records: ReadonlyMap<string, unknown>): number {
  if (records.get(PINTA_CAUSAL_OUTBOX_KEY) === undefined) return 0
  const state = readLocalCausalState(records)
  const metadata = JSON.stringify({
    ...state,
    confirmed: [...state.confirmed],
    ...(state.recovered ? { recovered: [...state.recovered] } : {}),
    ...(state.prepared ? { prepared: [...state.prepared] } : {}),
    ...(state.shadows ? { shadows: [...state.shadows] } : {}),
    ...(state.pins ? { pins: [...state.pins] } : {}),
  })
  return (
    new TextEncoder().encode(metadata).length +
    (state.sealed?.bytes ?? 0) +
    uniquePinBytes(state.pins) +
    [...(state.prepared?.values() ?? []), ...(state.shadows?.values() ?? [])].reduce(
      (total, entry) => total + entry.bytes,
      0,
    )
  )
}

function pinOwners(
  pending: readonly PintaCausalPending[],
  sealed: PintaCausalSealed | null,
  unbased: unknown,
): Set<string> {
  return new Set([
    ...pending.map(({ opId }) => opId),
    ...(sealed ? [sealed.local.opId] : []),
    ...(unbasedState(unbased) ? [unbased.opId] : []),
  ])
}

function saveState(records: Map<string, unknown>, state: LocalCausalState): void {
  const pins =
    state.pins &&
    keepLivePins(records, state.pins, pinOwners(state.pending, state.sealed, state.unbased))
  records.set(PINTA_CAUSAL_OUTBOX_KEY, { ...state, ...(pins ? { pins } : {}), version: 4 })
}

export function rememberLocalCausalProtocol(records: Map<string, unknown>): void {
  const state = readLocalCausalState(records)
  if (!state.protocolKnown) saveState(records, { ...state, protocolKnown: true })
}

function officialProjection<Asset extends PintaMemoryAsset>(
  pull: PintaCausalLocalPull<Asset>,
  state: LocalCausalState,
  snapshot: LocalSnapshot<Asset>,
): Map<string, Asset> | null {
  const official = new Map<string, Asset>()
  const written = new Set(pull.transitions.map(({ id }) => id))
  for (const [id, mark] of state.confirmed) {
    if (mark.deleted || written.has(id)) continue
    const current = snapshot.assets.get(id)
    if (!current || mark.localRevision !== snapshot.documents.get(id)?.revision) return null
    official.set(id, current)
  }
  for (const { id, after } of pull.transitions) if (after) official.set(id, after)
  return official
}

function terminalLocalMembers<Asset extends PintaMemoryAsset>(
  pull: PintaCausalLocalPull<Asset>,
  state: LocalCausalState,
): ReadonlyMap<string, PintaCausalPendingMember> | null {
  const proof = pull.recoverUnit
  const sealed = state.sealed
  if (
    !proof ||
    !sealed ||
    !pintaCausalEpochSchema.safeParse(pull.epoch).success ||
    sealed.intent.opId !== proof.opId ||
    sealed.intentHash !== proof.intentHash ||
    state.pending.length !== proof.pending.length ||
    state.pending.some(
      (unit, index) =>
        unit.opId !== proof.pending[index]?.opId ||
        unit.preparation !== proof.pending[index]?.preparation,
    ) ||
    (proof.terminal === 'unknown' && BigInt(pull.epoch) <= BigInt(sealed.intent.baseEpoch))
  )
    return null
  return new Map(
    [sealed.local, ...state.pending].flatMap((group) =>
      group.members.map((member) => [member.itemId, member] as const),
    ),
  )
}

export function localCausalPullImpact<Asset extends PintaMemoryAsset>(
  pull: PintaCausalLocalPull<Asset>,
  state: LocalCausalState,
  snapshot: LocalSnapshot<Asset>,
): { ids: string[]; blocked: boolean; recover?: string[]; needsArchive?: true } {
  const written = new Set(pull.transitions.map(({ id }) => id))
  const changedLayout = new Set<string>()
  let hasSelectorChange = false
  const projected = new Map(snapshot.assets)
  const terminal = terminalLocalMembers(pull, state)
  const archived = planArchivedRecovery(pull, state, snapshot)
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
    terminal ||
    (((pull.recoverInitial && state.epoch === null && !state.confirmed.size) ||
      (pull.recoverDiverged && state.epoch !== null && !state.unbased)) &&
      !state.sealed &&
      !state.pending.length)
  const official =
    pull.transitions.length || terminal ? officialProjection(pull, state, snapshot) : undefined
  const seeds =
    mayRecover && official
      ? localRecoverySeeds(
          pull,
          snapshot.assets,
          official,
          (id) => state.confirmed.get(id)?.localRevision !== snapshot.documents.get(id)?.revision,
        )
      : new Set<string>()
  let blocked =
    ((hasSelectorChange || changedLayout.size > 0) && snapshot.issues.length > 0) ||
    (pull.recoverUnit !== undefined && !terminal) ||
    archived.incomplete
  const affected = new Set([...written, ...archived.ids])
  for (const id of archived.displacedResources) if (snapshot.assets.has(id)) seeds.add(id)
  for (const id of archived.diverged) if (snapshot.assets.has(id)) seeds.add(id)
  for (const member of terminal?.values() ?? []) {
    affected.add(member.itemId)
    if (member.action !== 'put') continue
    if (snapshot.assets.has(member.itemId)) {
      seeds.add(member.itemId)
    } else if (!archived.diverged.has(member.itemId)) blocked = true
  }
  if (state.epoch !== null && official === null) blocked = true
  if (!mayRecover && state.epoch !== null && official) {
    for (const asset of official.values()) {
      if (
        !pintaValuesEqual(pintaDoorBindings(asset, official), pintaDoorBindings(asset, projected))
      ) {
        affected.add(asset.id)
        blocked = true
      }
    }
  }
  const archiveIssue = archived.incomplete ? { needsArchive: true as const } : {}
  if (!hasSelectorChange && !changedLayout.size && !seeds.size)
    return { ids: [...affected], blocked, ...archiveIssue }
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
    const closure = localRecoveryClosure(seeds, snapshot.assets)
    for (const id of closure.ids) affected.add(id)
    return {
      ids: [...affected],
      blocked: blocked || closure.incomplete || snapshot.issues.length > 0,
      recover: closure.ids,
      ...archiveIssue,
    }
  }
  return { ids: [...affected], blocked, ...archiveIssue }
}

/** A removal made before observing the account cannot delete its now-certified document. */
export function localRemovalsReturnedByPull<Asset extends PintaMemoryAsset>(
  state: LocalCausalState,
  pull: PintaCausalLocalPull<Asset>,
): readonly { id: string; name: string }[] {
  const initial = pull.recoverInitial && state.epoch === null
  const divergent =
    pull.recoverDiverged && state.epoch !== null && !state.pending.length && !state.sealed
  const terminal = terminalLocalMembers(pull, state)
  if (!initial && !divergent && !terminal) return []
  const removed = new Map(
    state.unbased?.members
      .filter(({ deleted }) => deleted)
      .map(({ itemId, localRevision }) => [itemId, localRevision]),
  )
  return pull.transitions.flatMap(({ id, before, beforeRevision, after, remote }) => {
    if (before || !beforeRevision || !after || !remote?.sha256) return []
    const confirmed = state.confirmed.get(id)
    return (initial && beforeRevision === removed.get(id)) ||
      (divergent &&
        confirmed &&
        !confirmed.deleted &&
        confirmed.localRevision !== beforeRevision) ||
      terminal?.has(id)
      ? [{ id, name: after.name }]
      : []
  })
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
  const terminal = terminalLocalMembers(pull, state)
  if (pull.recoverUnit && !terminal) return null
  if (terminal) {
    if (!readLocalCausalUpload(records)) invalid()
    for (const opId of [...(state.prepared?.keys() ?? []), ...(state.shadows?.keys() ?? [])])
      readLocalCausalRetained(records, opId)
  }
  const returned = new Set(localRemovalsReturnedByPull(state, pull).map(({ id }) => id))
  let copies: Asset[] = []
  let moved = new Set<string>()
  const snapshot = write((before) => {
    const impact = localCausalPullImpact(pull, state, before)
    if (impact.blocked || impact.ids.some((id) => !covered.has(id)))
      throw new PintaCausalPullDeferred()
    moved = new Set(impact.recover ?? [])
    const archive = planArchivedRecovery(pull, state, before)
    for (const id of archive.diverged) moved.add(id)
    for (const change of pull.transitions) {
      if (Boolean(change.after) !== Boolean(change.remote)) invalid()
      if (!terminal && ownsLocalCausalMember(state, change.id, false))
        throw new PintaCausalPullDeferred()
      const mark = state.confirmed.get(change.id)
      if (
        (change.before !== null || change.beforeRevision !== null) &&
        mark?.localRevision !== change.beforeRevision
      ) {
        if (
          !moved.has(change.id) &&
          !returned.has(change.id) &&
          (!pintaValuesEqual(change.before, change.after) || (!change.remote && !mark))
        )
          throw new PintaCausalPullDeferred()
      } else if (!change.remote && !mark) throw new PintaCausalPullDeferred()
    }
    if (!moved.size) return []
    const official = officialProjection(pull, state, before)
    if (!official) throw new PintaCausalPullDeferred()
    const recovery = recoverLocalAssets(
      [...moved].filter((id) => before.assets.has(id)),
      pull,
      before,
      official,
    )
    if (!recovery) throw new PintaCausalPullDeferred()
    const retained = copyArchivedRecovery(archive, recovery.catalog)
    if (!retained) throw new PintaCausalPullDeferred()
    copies = [...recovery.copies, ...retained.copies]
    return [...recovery.writes, ...retained.writes]
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
  const resolved = new Set([...moved, ...returned])
  const stillUnbased = unbased && {
    ...unbased,
    members: unbased.members.filter(({ itemId }) => !resolved.has(itemId)),
    readSet: unbased.readSet.filter(({ consumerId }) => !resolved.has(consumerId)),
  }
  const local = prepareUnbasedCreates(stillUnbased, pull, snapshot, confirmed)
  if (stillUnbased?.members.length && !local) throw new PintaCausalPullDeferred()
  if (pull.recoverInitial || pull.recoverDiverged) {
    const promoting = new Set(local?.members.map(({ itemId }) => itemId))
    for (const [id, doc] of snapshot.documents) {
      const mark = confirmed.get(id)
      if (
        !doc.asset ||
        (mark && !mark.deleted) ||
        promoting.has(id) ||
        (!terminal && ownsLocalCausalMember(state, id))
      )
        recovered.delete(id)
      else recovered.set(id, doc.revision)
    }
  }
  const shadows = new Map(state.shadows)
  if (unbased && shadows.has(unbased.opId)) {
    const candidate = readLocalCausalRetained(records, unbased.opId)
    if (!candidate) invalid()
    if (local?.members.length)
      shadows.set(
        unbased.opId,
        keepCandidatePuts(
          records,
          unbased.opId,
          candidate,
          local.members.filter(({ action }) => action === 'put').map(({ itemId }) => itemId),
        ),
      )
    else {
      shadows.delete(unbased.opId)
      records.delete(localPreparedKey(unbased.opId))
    }
  }
  saveState(records, {
    ...account,
    ...(state.shadows ? { shadows: terminal ? new Map() : shadows } : {}),
    protocolKnown: true,
    epoch: pull.epoch,
    writeEpoch: pull.epoch,
    confirmed,
    ...(recovered.size || state.recovered ? { recovered } : {}),
    ...(local?.members.length ? { pending: [...state.pending, local] } : {}),
    ...(terminal ? { pending: [], sealed: null, prepared: new Map() } : {}),
  })
  if (terminal) {
    records.delete(PINTA_CAUSAL_BLOBS_KEY)
    for (const id of [...(state.prepared?.keys() ?? []), ...(state.shadows?.keys() ?? [])])
      records.delete(localPreparedKey(id))
  }
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
    (unit) =>
      !state.prepared?.has(unit.opId) &&
      (unit.opId === draft.opId || unit.members.some((member) => items.has(member.itemId))),
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
  if (state.prepared?.has(draft.opId)) invalid()
  const tail =
    state.pending.filter(({ opId }) => state.prepared?.has(opId)).at(-1) ?? state.sealed?.local
  if (draft.follows && (tail?.opId !== draft.follows || tail.baseEpoch !== draft.baseEpoch))
    invalid()
  const hasBasis = (id: string, base: PintaCausalPredecessor) => {
    const frozen = state.prepared?.get(base.opId)
    const sealed = state.sealed?.local.opId === base.opId ? state.sealed : null
    const source = (
      frozen ? state.pending.find(({ opId }) => opId === base.opId) : sealed?.local
    )?.members.find((member) => member.itemId === id)
    const put =
      frozen?.puts.find((member) => member.itemId === id) ??
      sealed?.intent.members.find((member) => member.itemId === id && member.action === 'put')
    return (
      source?.localRevision === base.localRevision &&
      base.sha256 === (put && 'sha256' in put ? put.sha256 : null)
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
    ...(draft.independent ? { independent: true as const } : {}),
    readSet: draft.readSet,
    members,
  }
  if (!pendingState(pending)) invalid()
  const shadows = new Map(state.shadows)
  if (replacing.some((group) => shadows.has(group.opId)) && !draft.shadow) invalid()
  for (const group of replacing)
    if (shadows.delete(group.opId) && group.opId !== pending.opId)
      records.delete(localPreparedKey(group.opId))
  if (draft.shadow)
    shadows.set(
      pending.opId,
      storeCandidate(
        records,
        pending.opId,
        draft.shadow,
        members.filter(({ action }) => action === 'put').map(({ itemId }) => itemId),
      ),
    )
  const recovered = new Map(state.recovered)
  for (const id of items) recovered.delete(id)
  const pins = draft.pins
    ? retainPinnedWrites(records, snapshot, state, pending.opId, draft.pins)
    : state.pins
  if (draft.pins) {
    const resources = new Map(pins?.get(pending.opId)?.map((entry) => [entry.itemId, entry]))
    for (const read of pending.readSet) {
      if (read.source === 'unit') continue
      const entry = resources.get(read.targetId)
      if (!entry) invalid()
      if (read.source === 'predecessor') {
        if (entry.localRevision !== read.base.localRevision) invalid()
        continue
      }
      if (
        entry.remote?.revision !== read.revision ||
        entry.remote.sha256 !== read.sha256 ||
        entry.remote.layoutRevision !== read.layoutRevision
      )
        invalid()
    }
  }
  saveState(records, {
    ...state,
    ...(pins ? { pins } : {}),
    protocolKnown: true,
    ...(state.recovered ? { recovered } : {}),
    ...(draft.shadow ? { shadows } : {}),
    pending: [...state.pending.filter((unit) => !expected.has(unit.opId)), pending],
  })
  return { snapshot, pending }
}

/** The item has never had a remote reservation, so dropping it requires no remote action. */
export function discardLocalCausalCreation<Asset extends PintaMemoryAsset>(
  records: Map<string, unknown>,
  id: string,
  write: (
    authorize: (snapshot: LocalSnapshot<Asset>) => readonly LocalAssetTransition<Asset>[],
  ) => LocalSnapshot<Asset>,
): LocalSnapshot<Asset> | null {
  const state = readLocalCausalState(records)
  const mark = state.confirmed.get(id)
  if (
    state.epoch === null ||
    (mark && !mark.deleted) ||
    state.sealed?.local.members.some(({ itemId }) => itemId === id) ||
    state.unbased?.members.some(({ itemId }) => itemId === id)
  )
    return null
  const queued = state.pending.find((group) => group.members.some(({ itemId }) => itemId === id))
  if (
    queued &&
    (state.prepared?.has(queued.opId) ||
      !queued.members.some(
        (member) => member.itemId === id && member.operation?.type === 'create',
      ) ||
      queued.readSet.some((edge) => edge.targetId === id))
  )
    return null
  const snapshot = write((before) => {
    for (const asset of before.assets.values()) {
      if (asset.id === id) continue
      if (
        pintaAssetDependencyIds(asset).includes(id) ||
        pintaDoorBindings(asset, before.assets).some(
          ({ binding }) => binding.type === 'target' && binding.id === id,
        )
      )
        throw new PintaLocalStorageError('Este desenho ainda é usado por um mapa ou conjunto.')
    }
    return []
  })
  const recovered = new Map(state.recovered)
  recovered.delete(id)
  const pending = state.pending.flatMap((group) => {
    if (group.opId !== queued?.opId) return [group]
    const members = group.members.filter((member) => member.itemId !== id)
    return members.length
      ? [
          {
            ...group,
            members,
            preparation: crypto.randomUUID(),
            readSet: group.readSet.filter((edge) => edge.consumerId !== id),
          },
        ]
      : []
  })
  const shadows = new Map(state.shadows)
  if (queued && shadows.has(queued.opId)) {
    const candidate = readLocalCausalRetained(records, queued.opId)
    if (!candidate) invalid()
    const surviving = pending.find(({ opId }) => opId === queued.opId)
    if (surviving)
      shadows.set(
        queued.opId,
        keepCandidatePuts(
          records,
          queued.opId,
          candidate,
          surviving.members.filter(({ action }) => action === 'put').map(({ itemId }) => itemId),
        ),
      )
    else {
      shadows.delete(queued.opId)
      records.delete(localPreparedKey(queued.opId))
    }
  }
  saveState(records, {
    ...state,
    pending,
    ...(state.recovered ? { recovered } : {}),
    ...(state.shadows ? { shadows } : {}),
  })
  return snapshot
}

export function freezeLocalCausalDraft(
  records: Map<string, unknown>,
  opId: string,
  preparation: string,
  puts: readonly PintaPreparedPut[],
  blobs: ReadonlyMap<string, Blob>,
  matchesRevision: (member: PintaCausalPendingMember) => boolean,
): boolean {
  const state = readLocalCausalState(records)
  const prepared = new Map(state.prepared)
  const shadows = new Map(state.shadows)
  const retained = readLocalCausalRetained(records, opId)
  const head = state.pending[prepared.size]
  if (
    !head ||
    head.opId !== opId ||
    head.preparation !== preparation ||
    (!retained && !head.members.every(matchesRevision))
  )
    return false
  if (retained && !pintaValuesEqual(retained.puts, puts)) return false
  prepared.set(
    opId,
    shadows.get(opId) ??
      storeCandidate(
        records,
        opId,
        { puts, blobs },
        head.members.filter(({ action }) => action === 'put').map(({ itemId }) => itemId),
      ),
  )
  if (!preparedState(prepared, state.pending)) invalid()
  shadows.delete(opId)
  saveState(records, { ...state, prepared, ...(state.shadows ? { shadows } : {}) })
  return true
}

function storeCandidate(
  records: Map<string, unknown>,
  opId: string,
  bytes: PintaCandidateBytes,
  ids: readonly string[],
): PintaCausalPrepared {
  const candidate = {
    puts: bytes.puts,
    bytes: bytes.puts.reduce((sum, member) => sum + member.bytes, 0),
  }
  if (!candidateState(candidate, new Set(ids))) invalid()
  readCandidateBlobs(bytes.blobs, candidate.puts, candidate.bytes)
  records.set(localPreparedKey(opId), new Map(bytes.blobs))
  return candidate
}

function keepCandidatePuts(
  records: Map<string, unknown>,
  opId: string,
  candidate: PintaCandidateBytes,
  ids: readonly string[],
): PintaCausalPrepared {
  const keep = new Set(ids)
  return storeCandidate(
    records,
    opId,
    {
      puts: candidate.puts.filter(({ itemId }) => keep.has(itemId)),
      blobs: new Map([...candidate.blobs].filter(([id]) => keep.has(id))),
    },
    ids,
  )
}

function readCandidateBlobs(
  stored: unknown,
  puts: readonly PintaPreparedPut[],
  expectedBytes: number,
): ReadonlyMap<string, Blob> {
  if (!(stored instanceof Map)) invalid()
  const blobs = new Map<string, Blob>()
  let bytes = 0
  for (const member of puts) {
    const blob: unknown = stored.get(member.itemId)
    if (!(blob instanceof Blob) || blob.size !== member.bytes) invalid()
    blobs.set(member.itemId, blob)
    bytes += blob.size
  }
  if (stored.size !== blobs.size || bytes !== expectedBytes) invalid()
  return blobs
}

export function readLocalCausalPrepared(
  records: ReadonlyMap<string, unknown>,
  opId: string,
): { puts: readonly PintaPreparedPut[]; blobs: ReadonlyMap<string, Blob> } | null {
  return readLocalCausalRetained(records, opId, false)
}

export function readLocalCausalRetained(
  records: ReadonlyMap<string, unknown>,
  opId: string,
  includeShadow = true,
): PintaCandidateBytes | null {
  const state = readLocalCausalState(records)
  const candidate =
    state.prepared?.get(opId) ?? (includeShadow ? state.shadows?.get(opId) : undefined)
  if (!candidate) return null
  return {
    puts: candidate.puts,
    blobs: readCandidateBlobs(records.get(localPreparedKey(opId)), candidate.puts, candidate.bytes),
  }
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
  const local = state.pending[0]
  if (state.sealed || !local || local.opId !== intent.opId || local.preparation !== preparation)
    return false
  if (local.follows) return false
  if (!PintaCausalIntentSchema.safeParse(intent).success) invalid()
  if (
    (!state.prepared?.has(local.opId) &&
      !state.shadows?.has(local.opId) &&
      !local.members.every(matchesRevision)) ||
    intent.baseEpoch !== local.baseEpoch ||
    intent.inverseOf !== local.inverseOf ||
    intent.members.length !== local.members.length ||
    !pintaValuesEqual(intent.readSet, local.readSet)
  )
    return false
  let bytes = 0
  const members = new Map(local.members.map((member) => [member.itemId, member]))
  let blobCount = 0
  const frozen = readLocalCausalRetained(records, local.opId)
  const frozenPuts = new Map(frozen?.puts.map((put) => [put.itemId, put]))
  for (const member of intent.members) {
    const current = members.get(member.itemId)
    if (current?.action !== member.action || current.baseRevision !== member.baseRevision) invalid()
    if (member.action === 'put') {
      const blob = blobs.get(member.itemId)
      if (frozen) {
        const { action: _action, operation: _operation, baseRevision: _revision, ...put } = member
        if (!pintaValuesEqual(put, frozenPuts.get(member.itemId))) invalid()
      }
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
  const prepared = new Map(state.prepared)
  const shadows = new Map(state.shadows)
  if (prepared.delete(local.opId) || shadows.delete(local.opId))
    records.delete(localPreparedKey(local.opId))
  saveState(records, {
    ...state,
    ...(state.prepared ? { prepared } : {}),
    ...(state.shadows ? { shadows } : {}),
    pending: state.pending.filter((pending) => pending !== local),
    sealed: { local, intent, intentHash, bytes },
  })
  records.set(PINTA_CAUSAL_BLOBS_KEY, new Map(frozen?.blobs ?? blobs))
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
    return {
      ...unit,
      ...(unit.follows === opId ? { follows: renewed } : {}),
      ...(unit.inverseOf === opId ? { inverseOf: renewed } : {}),
      members: unit.members.map((member) =>
        member.baseAfter?.opId === opId
          ? { ...member, baseAfter: { ...member.baseAfter, opId: renewed } }
          : member,
      ),
      readSet: unit.readSet.map((edge) =>
        edge.source === 'predecessor' && edge.base.opId === opId
          ? { ...edge, base: { ...edge.base, opId: renewed } }
          : edge,
      ),
    }
  })
  const pins = new Map(state.pins)
  const retained = pins.get(opId)
  if (retained) {
    pins.delete(opId)
    pins.set(renewed, retained)
  }
  saveState(records, {
    ...state,
    ...(state.pins ? { pins } : {}),
    pending,
    sealed: {
      ...sealed,
      local: {
        ...sealed.local,
        originalOpId: sealed.local.originalOpId ?? opId,
        opId: renewed,
        baseEpoch: newEpoch,
      },
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
    !pending.follows ||
    pending.baseEpoch !== sealed.intent.baseEpoch ||
    BigInt(receipt.epoch) !== BigInt(pending.baseEpoch) + 1n
  )
    return pending
  const touched = new Set(receipt.members.map(({ itemId }) => itemId))
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
    if (baseAfter.opId !== receipt.opId) {
      members.push({ ...member, baseAfter })
      continue
    }
    const mark = resultOf(member.itemId, baseAfter)
    if (!mark || member.operation?.type === 'create') return pending
    members.push({ ...member, baseRevision: mark.revision })
  }
  const readSet: PintaLocalCausalRead[] = []
  for (const edge of pending.readSet) {
    if (edge.source !== 'predecessor') {
      if (edge.source === 'snapshot' && touched.has(edge.targetId)) return pending
      readSet.push(edge)
      continue
    }
    if (edge.base.opId !== receipt.opId) {
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
  const updated = {
    ...rest,
    ...(pending.follows === receipt.opId ? {} : { follows: pending.follows }),
    baseEpoch: receipt.epoch,
    preparation: crypto.randomUUID(),
    members,
    readSet,
  }
  return pendingState(updated) ? updated : pending
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
    const previous = confirmed.get(member.itemId)
    const newIdentity =
      previous?.deleted &&
      written?.action === 'put' &&
      written.baseRevision === 0 &&
      written.operation.type === 'create'
    if (
      !snapshot ||
      !written ||
      member.revision <= written.baseRevision ||
      (!newIdentity && (previous?.revision ?? 0) >= member.revision) ||
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
      ...(sealed.local.originalOpId ? { originalOpId: sealed.local.originalOpId } : {}),
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
