import 'server-only'
import { creationStorageKey } from '@sistemazero/core/creations'
import {
  type PintaCausalAttestation,
  type PintaCausalBackfillAttestation,
  type PintaCausalEntry,
  pintaCausalBlobKey,
} from '@sistemazero/core/creations/pinta-causal'
import type { AnyTilesetAsset } from '@sistemazero/pinta/assets'
import {
  type PintaCausalDocument,
  pintaCausalPinSourceIds,
  provePintaCausalConsumerRemaps,
  provePintaCausalMutation,
} from '@sistemazero/pinta/assets/causal'
import { z } from 'zod'
import { CREATION_BLOB_CONTENT_TYPE } from './creation-download'
import {
  type PintaCausalBlobExpectation,
  PintaCausalUnverifiedContent,
  readPintaCausalBlob,
  type VerifiedPintaCausalBlob,
} from './pinta-causal-content'
import {
  belongsToPintaActor,
  type PintaBackfillPlan,
  type PintaCausalActor,
  type PintaMemberPlan,
} from './pinta-causal-protocol'
import type { r2CreateObjectUgc, r2GetObjectUgc } from './r2'

export type PintaCausalStorage = {
  open: typeof r2GetObjectUgc
  create: typeof r2CreateObjectUgc
}

export function isPintaPointer(
  storageRef: string,
  actor: PintaCausalActor,
  entry: PintaCausalEntry,
  allowHistorical: boolean,
): boolean {
  const { userId, audience } = actor
  const legacy = creationStorageKey(userId, 'pinta', entry.itemId, entry.revision, audience)
  if (allowHistorical && storageRef === legacy) return true
  const prefix = `${legacy.slice(0, legacy.lastIndexOf('/') + 1)}units/`
  if (!storageRef.startsWith(prefix)) return false
  const [nonce, file, ...rest] = storageRef.slice(prefix.length).split('/')
  return (
    rest.length === 0 && z.uuid().safeParse(nonce).success && file === `${entry.revision}.sealed.gz`
  )
}

async function read(
  storage: PintaCausalStorage,
  key: string,
  expected: PintaCausalBlobExpectation,
  signal: AbortSignal,
): Promise<VerifiedPintaCausalBlob> {
  const blob = await storage.open(key, signal)
  if (!blob)
    throw new PintaCausalUnverifiedContent('O arquivo da revisão ainda não está disponível.')
  return readPintaCausalBlob(blob, expected, signal)
}

function reservationSignal(signal: AbortSignal, expiresAt: string): AbortSignal {
  const milliseconds = Date.parse(expiresAt) - Date.now()
  if (milliseconds <= 0) throw new PintaCausalUnverifiedContent('A reserva expirou.')
  return AbortSignal.any([signal, AbortSignal.timeout(milliseconds)])
}

async function seal(
  storage: PintaCausalStorage,
  key: string,
  verified: VerifiedPintaCausalBlob,
  expected: PintaCausalBlobExpectation,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted()
  const created = await storage.create(
    {
      key,
      body: verified.gzip,
      contentType: CREATION_BLOB_CONTENT_TYPE,
    },
    signal,
  )
  if (!created) await read(storage, key, { ...expected, sha256: verified.sha256 }, signal)
  signal.throwIfAborted()
}

async function readBase(
  storage: PintaCausalStorage,
  actor: PintaCausalActor,
  plan: PintaMemberPlan,
  signal: AbortSignal,
): Promise<Pick<PintaCausalDocument, 'asset' | 'manifest'> | null> {
  const { baseEntry: entry, baseStorageRef, binding } = plan
  if (binding.baseRevision === 0 || (!entry && !baseStorageRef && binding.baseSha256 === null))
    return null
  if (
    !entry ||
    !baseStorageRef ||
    !binding.baseSha256 ||
    entry.coverage !== 'certified' ||
    !isPintaPointer(baseStorageRef, actor, entry, false)
  )
    throw new PintaCausalUnverifiedContent('A revisão de origem ainda precisa ser conferida.')
  const { asset, manifest } = await read(
    storage,
    baseStorageRef,
    { ...entry, sha256: binding.baseSha256 },
    signal,
  )
  return { asset, manifest }
}

export async function attestPintaMember(
  storage: PintaCausalStorage,
  actor: PintaCausalActor,
  plan: PintaMemberPlan,
  loadRelated: (itemId: string) => Promise<PintaMemberPlan>,
  signal: AbortSignal,
): Promise<PintaCausalAttestation> {
  const { binding, member } = plan
  if (!belongsToPintaActor(binding.namespace, actor) || Date.parse(binding.expiresAt) <= Date.now())
    throw new PintaCausalUnverifiedContent('A reserva já não corresponde à sessão.')
  signal = reservationSignal(signal, binding.expiresAt)
  const inverse = plan.inverseOf && plan.inverse
  if (
    plan.inverseOf &&
    (!inverse ||
      inverse.baseRevision !== binding.baseRevision ||
      inverse.baseSha256 !== binding.baseSha256)
  )
    throw new PintaCausalUnverifiedContent('A unidade de desfazer precisa da prova histórica.')

  if (member.action === 'delete') {
    if (
      inverse &&
      (inverse.restoredSha256 !== null || !(await readBase(storage, actor, plan, signal)))
    )
      throw new PintaCausalUnverifiedContent('A revisão que será removida não foi conferida.')
    return { purpose: 'pinta-unit-content-v1', binding, manifest: null, transitions: [] }
  }

  const expected = {
    itemId: member.itemId,
    kind: member.kind,
    formatVersion: member.formatVersion,
    bytes: member.bytes,
    sha256: member.sha256,
  }
  const sealedKey = pintaCausalBlobKey(binding, 'sealed')
  const existing = await storage.open(sealedKey, signal)
  const proposed = existing
    ? await readPintaCausalBlob(existing, expected, signal)
    : await read(storage, pintaCausalBlobKey(binding, 'upload'), expected, signal)
  const before = await readBase(storage, actor, plan, signal)
  if (inverse) {
    const historical = inverse.restoredAuthoredFingerprint
    const actual = proposed.manifest.authoredFingerprint
    const equivalent =
      actual &&
      historical &&
      actual.version === historical.version &&
      actual.sha256 === historical.sha256
    if (
      inverse.restoredSha256 === null ||
      (inverse.restoredSha256 !== proposed.sha256 && !equivalent)
    )
      throw new PintaCausalUnverifiedContent('O desenho não corresponde à revisão histórica.')
  }
  if (
    proposed.manifest.name !== member.name ||
    (!inverse && !provePintaCausalMutation(before?.asset ?? null, proposed.asset, member.operation))
  )
    throw new PintaCausalUnverifiedContent('Os bytes recebidos diferem da alteração reservada.')

  let transitions: PintaCausalAttestation['transitions'] = []
  if (!inverse && before && plan.remaps.length) {
    let proof = provePintaCausalConsumerRemaps(before, proposed.asset, plan.remaps)
    if (!proof) {
      const pinBases = new Map<string, AnyTilesetAsset>()
      for (const id of pintaCausalPinSourceIds(before, proposed.asset, plan.remaps)) {
        const related = await loadRelated(id)
        const other = related.binding
        if (
          !belongsToPintaActor(other.namespace, actor) ||
          related.member.itemId !== id ||
          related.member.action !== 'put' ||
          related.member.operation.type !== 'remap' ||
          other.opId !== binding.opId ||
          other.intentHash !== binding.intentHash ||
          other.baseEpoch !== binding.baseEpoch ||
          Date.parse(other.expiresAt) <= Date.now()
        )
          throw new PintaCausalUnverifiedContent('A folha reservada pertence a outra revisão.')
        const baseSheet = (await readBase(storage, actor, related, signal))?.asset
        if (!baseSheet || (baseSheet.kind !== 'tileset' && baseSheet.kind !== 'vector-tileset'))
          throw new PintaCausalUnverifiedContent(
            'A folha de origem da versão privada não foi conferida.',
          )
        pinBases.set(id, baseSheet)
      }
      if (pinBases.size)
        proof = provePintaCausalConsumerRemaps(before, proposed.asset, plan.remaps, pinBases)
    }
    if (!proof)
      throw new PintaCausalUnverifiedContent('O desenho vinculado não acompanha o remapeamento.')
    transitions = proof
  }

  if (!existing) await seal(storage, sealedKey, proposed, expected, signal)
  return { purpose: 'pinta-unit-content-v1', binding, manifest: proposed.manifest, transitions }
}

export async function attestPintaBackfill(
  storage: PintaCausalStorage,
  actor: PintaCausalActor,
  plan: z.infer<typeof PintaBackfillPlan>,
  signal: AbortSignal,
): Promise<PintaCausalBackfillAttestation> {
  const { binding, entry, storageRef } = plan
  if (
    binding.itemId !== entry.itemId ||
    binding.revision !== entry.revision ||
    !belongsToPintaActor(binding.namespace, actor) ||
    Date.parse(binding.expiresAt) <= Date.now() ||
    !isPintaPointer(storageRef, actor, entry, true)
  )
    throw new PintaCausalUnverifiedContent('O arquivo histórico já não corresponde à revisão.')
  signal = reservationSignal(signal, binding.expiresAt)
  const expected = { ...entry, sha256: entry.sha256 ?? undefined }
  const verified = await read(storage, storageRef, expected, signal)
  await seal(storage, pintaCausalBlobKey(binding, 'sealed'), verified, expected, signal)
  return {
    purpose: 'pinta-backfill-content-v1',
    binding,
    manifest: verified.manifest,
    sha256: verified.sha256,
  }
}
