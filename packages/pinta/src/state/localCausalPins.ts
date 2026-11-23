import {
  PintaCausalMemberSchema,
  pintaCausalEpochSchema,
  pintaCausalRevisionSchema,
} from '@sistemazero/core/creations/pinta-causal'
import { PintaLocalStorageError } from '../core/localStorageErrors'
import type { LocalCausalState, PintaCandidateBytes, PintaPreparedPut } from './localCausalOutbox'

export const PINTA_CAUSAL_PIN_BLOBS_KEY = 'pinta:sync:observed-resources'
export interface PintaPinBasis {
  itemId: string
  localRevision: string | null
  remote?: { revision: number; sha256: string; layoutRevision?: string }
}
export interface PintaPinnedPut extends PintaPinBasis {
  put: PintaPreparedPut
}
export interface PintaPinDraft {
  bases: readonly PintaPinBasis[]
  candidate: PintaCandidateBytes
}

export type LocalPins = Map<string, readonly PintaPinnedPut[]>

/**
 * What a causal stage reads of the documents its writer left in the transaction: each member's new
 * revision and, for a pin, that the observed resource still has that revision with a body. A full
 * snapshot satisfies it; the focal writer passes its directories without decoding chunks.
 */
export interface LocalCausalDocuments {
  documents: ReadonlyMap<string, { revision: string; asset: unknown }>
}

function invalid(): never {
  throw new PintaLocalStorageError('Não consegui conferir as peças da versão guardada.')
}

export function validLocalPins(value: unknown, groups: ReadonlySet<string>): value is LocalPins {
  if (!(value instanceof Map)) return false
  const digests = new Map<string, number>()
  for (const [opId, pins] of value) {
    if (!groups.has(opId) || !Array.isArray(pins)) return false
    const ids = new Set<string>()
    for (const pin of pins) {
      if (
        !pin ||
        typeof pin !== 'object' ||
        !pin.put ||
        pin.itemId !== pin.put.itemId ||
        (pin.localRevision !== null &&
          (typeof pin.localRevision !== 'string' ||
            !pin.localRevision ||
            pin.localRevision.length > 128)) ||
        (!pin.remote && !pin.localRevision) ||
        ids.has(pin.itemId)
      )
        return false
      const item = PintaCausalMemberSchema.safeParse({
        ...pin.put,
        action: 'put',
        operation: { type: 'update' },
        baseRevision: 1,
      })
      if (!item.success) return false
      if (
        pin.remote &&
        (!pintaCausalRevisionSchema.safeParse(pin.remote.revision).success ||
          typeof pin.remote.sha256 !== 'string' ||
          !/^[0-9a-f]{64}$/.test(pin.remote.sha256) ||
          (pin.remote.layoutRevision !== undefined &&
            !pintaCausalEpochSchema.safeParse(pin.remote.layoutRevision).success))
      )
        return false
      const bytes = digests.get(pin.put.sha256)
      if (bytes !== undefined && bytes !== pin.put.bytes) return false
      digests.set(pin.put.sha256, pin.put.bytes)
      ids.add(pin.itemId)
    }
  }
  return true
}

function blobStore(records: ReadonlyMap<string, unknown>): Map<string, Blob> {
  const value = records.get(PINTA_CAUSAL_PIN_BLOBS_KEY)
  if (value === undefined) return new Map()
  if (!(value instanceof Map)) invalid()
  return new Map(value)
}

export function readPinnedCandidate(
  records: ReadonlyMap<string, unknown>,
  pins: readonly PintaPinnedPut[] | undefined,
): PintaCandidateBytes | null {
  if (!pins) return null
  const stored = blobStore(records)
  const blobs = new Map<string, Blob>()
  for (const { itemId, put } of pins) {
    const blob = stored.get(put.sha256)
    if (!(blob instanceof Blob) || blob.size !== put.bytes) invalid()
    blobs.set(itemId, blob)
  }
  return { puts: pins.map(({ put }) => put), blobs }
}

export function retainPinnedWrites(
  records: Map<string, unknown>,
  snapshot: LocalCausalDocuments,
  state: LocalCausalState,
  opId: string,
  draft: PintaPinDraft,
): LocalPins {
  const index = new Map(state.pins)
  const store = blobStore(records)
  const puts = new Map(draft.candidate.puts.map((put) => [put.itemId, put]))
  if (puts.size !== draft.bases.length || draft.candidate.blobs.size !== puts.size) invalid()
  let changedBlobs = false
  const pins = draft.bases.map((base) => {
    const put = puts.get(base.itemId)
    const blob = draft.candidate.blobs.get(base.itemId)
    const doc = snapshot.documents.get(base.itemId)
    if (
      !put ||
      !(blob instanceof Blob) ||
      blob.size !== put.bytes ||
      (base.localRevision !== null && (doc?.revision !== base.localRevision || !doc.asset))
    )
      invalid()
    const remote = base.remote
    if (base.localRevision && remote) {
      const mark = state.confirmed.get(base.itemId)
      if (
        !mark ||
        mark.deleted ||
        mark.localRevision !== base.localRevision ||
        mark.revision !== remote.revision ||
        mark.sha256 !== remote.sha256 ||
        (mark.layoutRevision ?? undefined) !== remote.layoutRevision
      )
        invalid()
    }
    if (!store.has(put.sha256)) {
      store.set(put.sha256, blob)
      changedBlobs = true
    }
    return { ...base, put }
  })
  index.set(opId, pins)
  if (changedBlobs) records.set(PINTA_CAUSAL_PIN_BLOBS_KEY, store)
  return index
}

export function uniquePinBytes(pins?: LocalPins): number {
  const unique = new Map(
    [...(pins?.values() ?? [])].flat().map(({ put }) => [put.sha256, put.bytes]),
  )
  return [...unique.values()].reduce((sum, bytes) => sum + bytes, 0)
}

export function keepLivePins(
  records: Map<string, unknown>,
  pins: LocalPins,
  groups: ReadonlySet<string>,
): LocalPins {
  const kept = new Map([...pins].filter(([opId]) => groups.has(opId)))
  const refs = new Map([...kept.values()].flat().map(({ put }) => [put.sha256, put.bytes]))
  if (!validLocalPins(kept, groups)) invalid()
  const stored = blobStore(records)
  if (!refs.size) {
    if (records.get(PINTA_CAUSAL_PIN_BLOBS_KEY) !== undefined)
      records.delete(PINTA_CAUSAL_PIN_BLOBS_KEY)
    return kept
  }
  for (const [sha, bytes] of refs) {
    const blob = stored.get(sha)
    if (!(blob instanceof Blob) || blob.size !== bytes) invalid()
  }
  if (stored.size !== refs.size)
    records.set(PINTA_CAUSAL_PIN_BLOBS_KEY, new Map([...stored].filter(([sha]) => refs.has(sha))))
  return kept
}
