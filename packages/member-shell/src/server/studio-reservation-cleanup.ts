import 'server-only'
import { createHash } from 'node:crypto'
import { canonicalJson } from '@sistemazero/core/creations'
import { STUDIO_PRO_PUBLICATION_LIMITS } from '@sistemazero/core/studio'
import {
  type StudioReservationRetirement,
  StudioReservationRetirementSchema,
} from '@sistemazero/core/studio/publication-reservation'
import {
  bufferFromStream,
  r2CreateObjectPrivate,
  r2DeleteObjectPrivate,
  r2GetObjectPrivate,
  r2HeadObjectPrivate,
  r2ListPrivatePage,
  r2PutObjectPrivate,
  r2ReplaceObjectPrivate,
} from './r2'
import { callStudioPublication, studioPublicationOwner } from './studio-publication'
import { studioReservationFingerprint } from './studio-reservation-binding'

const PREFIX = 'studio/reservation-cleanup/'
const CHECKPOINT = 'studio/maintenance/reservation-cleanup.json'
const intentKey = (value: StudioReservationRetirement) =>
  `${PREFIX}${value.audience}/${value.reservationId}.json`
const completedKey = (value: StudioReservationRetirement) =>
  `studio/reservation-cleanup-completed/${value.audience}/${value.reservationId}.json`
const encode = (value: unknown) => Buffer.from(canonicalJson(value))

async function read(key: string, limit = 4096) {
  const head = await r2HeadObjectPrivate(key)
  if (!head) return null
  const object = await r2GetObjectPrivate(key)
  return { bytes: await bufferFromStream(object.body, limit), etag: head.etag }
}
function record(bytes: Buffer): Record<string, unknown> {
  const value: unknown = JSON.parse(bytes.toString('utf8'))
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Recibo inválido.')
  return value as Record<string, unknown>
}
async function createExact(key: string, bytes: Buffer) {
  if (await r2CreateObjectPrivate({ key, body: bytes, contentType: 'application/json' })) return
  const existing = await read(key)
  if (!existing?.bytes.equals(bytes)) throw new Error('A intenção pertence a outra reserva.')
}

async function fenceOwner(
  value: StudioReservationRetirement,
  bindingHash: string,
): Promise<boolean> {
  const key = `studio/publication-owners/${value.audience}/${value.playId}.json`
  const existing = await read(key)
  let hadOwner = false
  if (existing) {
    const owner = record(existing.bytes)
    if (
      owner.playId !== value.playId ||
      owner.audience !== value.audience ||
      owner.bindingHash !== bindingHash
    )
      throw new Error('Propriedade da reserva não comprovada.')
    if (owner.retired === true) {
      if (
        typeof owner.hadOwner !== 'boolean' ||
        Object.keys(owner).some(
          (key) => !['playId', 'audience', 'retired', 'bindingHash', 'hadOwner'].includes(key),
        )
      )
        throw new Error('Recibo terminal inválido.')
      return owner.hadOwner
    }
    if (owner.authorId !== value.authorId) throw new Error('Autor da reserva divergente.')
    hadOwner = true
  }
  const input = {
    key,
    body: encode({
      playId: value.playId,
      audience: value.audience,
      retired: true,
      bindingHash,
      hadOwner,
    }),
    contentType: 'application/json',
  }
  const won = existing
    ? existing.etag && (await r2ReplaceObjectPrivate(input, existing.etag))
    : await r2CreateObjectPrivate(input)
  if (!won) throw new Error('A propriedade mudou durante a retirada; repita a entrega.')
  return hadOwner
}

async function fenceSnapshot(
  value: StudioReservationRetirement,
  bindingHash: string,
  hadOwner: boolean,
) {
  const key = `studio/play/${value.playId}.json`
  const existing = await read(key, STUDIO_PRO_PUBLICATION_LIMITS.maxSourceBytes)
  if (existing) {
    const snapshot = record(existing.bytes)
    if (snapshot.studioPublicationState === 'retired' && snapshot.playId === value.playId) {
      if (
        Object.keys(snapshot).some(
          (key) => !['playId', 'studioPublicationState', 'bindingHash'].includes(key),
        )
      )
        throw new Error('Recibo terminal inválido.')
      if (snapshot.bindingHash !== undefined && snapshot.bindingHash !== bindingHash)
        throw new Error('A retirada pertence a outra reserva.')
      return
    }
    if (
      !hadOwner ||
      createHash('sha256').update(existing.bytes).digest('hex') !== value.snapshotHash
    )
      throw new Error('O projeto não tem proveniência compatível com a reserva.')
  }
  const input = {
    key,
    body: encode({ playId: value.playId, studioPublicationState: 'retired', bindingHash }),
    contentType: 'application/json',
  }
  const won = existing
    ? existing.etag && (await r2ReplaceObjectPrivate(input, existing.etag))
    : await r2CreateObjectPrivate(input)
  if (!won) throw new Error('O projeto mudou durante a retirada; repita a entrega.')
}

/** Durable intent precedes every fence. Completion never follows an unknown runtime result. */
export async function retireStudioReservation(
  input: StudioReservationRetirement,
  signal?: AbortSignal,
) {
  const value = StudioReservationRetirementSchema.parse(input)
  const bindingHash = studioReservationFingerprint(value)
  const completion = encode({
    reservationId: value.reservationId,
    playId: value.playId,
    audience: value.audience,
    bindingHash,
  })
  const completed = await read(completedKey(value))
  if (completed) {
    if (!completed.bytes.equals(completion))
      throw new Error('Entrega divergente da retirada concluída.')
    await r2DeleteObjectPrivate(intentKey(value))
    return
  }
  await createExact(intentKey(value), encode(value))
  const hadOwner = await fenceOwner(value, bindingHash)
  await fenceSnapshot(value, bindingHash, hadOwner)
  const retired = await callStudioPublication(
    {
      operation: 'retire-reservation',
      playId: value.playId,
      owner: studioPublicationOwner(value.authorId, value.accountId),
      snapshotHash: value.snapshotHash,
      retirementHash: bindingHash,
    },
    signal,
  )
  if (!retired || !('deleted' in retired) || retired.deleted !== true)
    throw new Error('O serviço não confirmou a retirada da reserva.')
  await createExact(completedKey(value), completion)
  await r2DeleteObjectPrivate(intentKey(value))
}

/** Bounded cursor avoids starving later jobs when an earlier reservation conflicts. */
export async function drainStudioReservationCleanup() {
  const checkpoint = await read(CHECKPOINT)
  const previous = checkpoint ? record(checkpoint.bytes) : null
  const cursor = typeof previous?.cursor === 'string' ? previous.cursor : undefined
  const page = await r2ListPrivatePage(PREFIX, 4, cursor)
  let completed = 0,
    pending = 0
  for (const key of page.keys) {
    try {
      const data = await read(key)
      if (!data) throw new Error('Intenção indisponível.')
      const value = StudioReservationRetirementSchema.parse(record(data.bytes))
      if (intentKey(value) !== key) throw new Error('Identidade da intenção divergente.')
      await retireStudioReservation(value)
      completed++
    } catch {
      pending++
    }
  }
  await r2PutObjectPrivate({
    key: CHECKPOINT,
    body: encode({ cursor: page.cursor ?? null }),
    contentType: 'application/json',
  })
  return { completed, pending }
}
