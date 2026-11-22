import {
  type PintaCausalIntent,
  PintaCausalIntentSchema,
  type PintaCausalOperation,
  type PintaCausalRead,
  type PintaCausalResult,
  PintaCausalResultSchema,
} from '@sistemazero/core/creations/pinta-causal'
import { pintaValuesEqual } from '../core/assetEquality'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { PintaLocalStorageError, PintaStorageBudgetError } from '../core/localStorageErrors'
import { MAX_BACKUP_FILE_BYTES } from '../export/projectJson'
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
  transitions: readonly (LocalAssetTransition<Asset> & {
    remote: Pick<PintaCausalConfirmed, 'revision' | 'sha256' | 'layoutRevision'> | null
    /** An exact native revision authenticated before this client started using the outbox. */
    confirmedLegacy?: { revision: number; localRevision: string }
  })[]
}

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

function pendingState(value: unknown): value is PintaCausalPending {
  return (
    object(value) &&
    typeof value.opId === 'string' &&
    typeof value.preparation === 'string' &&
    typeof value.baseEpoch === 'string' &&
    (value.inverseOf === undefined || typeof value.inverseOf === 'string') &&
    Array.isArray(value.readSet) &&
    Array.isArray(value.members) &&
    value.members.length > 0 &&
    value.members.every(
      (member: unknown) =>
        object(member) &&
        typeof member.itemId === 'string' &&
        typeof member.localRevision === 'string' &&
        typeof member.baseRevision === 'number' &&
        (member.action === 'delete' || member.action === 'put'),
    )
  )
}

function sealedState(value: unknown): value is PintaCausalSealed {
  return (
    object(value) &&
    pendingState(value.local) &&
    object(value.intent) &&
    value.intent.opId === value.local.opId &&
    Array.isArray(value.intent.members) &&
    typeof value.intentHash === 'string' &&
    typeof value.bytes === 'number' &&
    Number.isSafeInteger(value.bytes) &&
    value.bytes >= 0
  )
}

function confirmedState(value: unknown): value is Map<string, PintaCausalConfirmed> {
  if (!(value instanceof Map)) return false
  for (const [id, mark] of value) {
    if (
      typeof id !== 'string' ||
      !object(mark) ||
      typeof mark.revision !== 'number' ||
      typeof mark.localRevision !== 'string' ||
      typeof mark.deleted !== 'boolean' ||
      (mark.sha256 !== null && typeof mark.sha256 !== 'string') ||
      (mark.layoutRevision !== null && typeof mark.layoutRevision !== 'string') ||
      (mark.opId !== undefined && typeof mark.opId !== 'string')
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
    (value.epoch != null && typeof value.epoch !== 'string') ||
    !Array.isArray(value.pending) ||
    !value.pending.every(pendingState) ||
    (value.sealed !== null && !sealedState(value.sealed)) ||
    !confirmedState(value.confirmed)
  )
    invalid()
  return {
    version: 1,
    protocolKnown: value.protocolKnown === true,
    epoch: value.epoch ?? null,
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

function saveState(records: Map<string, unknown>, state: LocalCausalState): void {
  const metadata = JSON.stringify({ ...state, confirmed: [...state.confirmed] })
  const bytes = new TextEncoder().encode(metadata).length + (state.sealed?.bytes ?? 0)
  if (bytes > MAX_BACKUP_FILE_BYTES) throw new PintaStorageBudgetError(bytes)
  records.set(PINTA_CAUSAL_OUTBOX_KEY, state)
}

export function rememberLocalCausalProtocol(records: Map<string, unknown>): void {
  const state = readLocalCausalState(records)
  if (!state.protocolKnown) saveState(records, { ...state, protocolKnown: true })
}

export function installLocalCausalPull<Asset extends PintaMemoryAsset>(
  records: Map<string, unknown>,
  pull: PintaCausalLocalPull<Asset>,
  write: () => LocalSnapshot<Asset>,
): LocalSnapshot<Asset> | null {
  const state = readLocalCausalState(records)
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
  const snapshot = write()
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
