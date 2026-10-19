import 'server-only'
import { isStudioPublicationId } from '@sistemazero/core/studio'
import type { StudioReservationRetirement } from '@sistemazero/core/studio/publication-reservation'
import {
  bufferFromStream,
  r2CreateObjectPrivate,
  r2GetObjectPrivate,
  r2HeadObjectPrivate,
  r2PutObjectPrivate,
} from './r2'
import { StudioPublicationError } from './studio-publication'
import { studioReservationFingerprint } from './studio-reservation-binding'

type Audience = 'kids' | 'adult'

const keyOf = (audience: Audience, playId: string) =>
  `studio/publication-owners/${audience}/${playId}.json`

/** The BFF writes this before publishing; Hub-supplied URLs or IDs cannot create it. */
export async function recordStudioPublicationOwner(
  audience: Audience,
  playId: string,
  authorId: string,
  reservation: StudioReservationRetirement,
) {
  if (!isStudioPublicationId(playId) || !isStudioPublicationId(authorId))
    throw new Error('Identidade da publicação inválida.')
  if (
    reservation.playId !== playId ||
    reservation.authorId !== authorId ||
    reservation.audience !== audience
  )
    throw new Error('Identidade da reserva divergente.')
  const bindingHash = studioReservationFingerprint(reservation)
  const previous = await readStudioPublicationOwner(audience, playId)
  if (previous) {
    if (previous.authorId !== authorId || previous.bindingHash !== bindingHash)
      throw new StudioPublicationError(409, 'Publicação pertence a outra reserva.')
    return previous
  }
  const key = keyOf(audience, playId)
  const created = await r2CreateObjectPrivate({
    key,
    body: Buffer.from(
      JSON.stringify({ playId, authorId, audience, bindingHash, createdAt: Date.now() }),
    ),
    contentType: 'application/json',
    cacheControl: 'private, no-store',
  })
  if (!created) {
    const current = await readStudioPublicationOwner(audience, playId)
    if (!current || current.authorId !== authorId || current.bindingHash !== bindingHash)
      throw new StudioPublicationError(
        409,
        'Esta publicação foi retirada ou pertence a outro autor.',
      )
    return current
  }
  return { key, playId, authorId, audience, bindingHash }
}

export async function readStudioPublicationOwner(audience: Audience, playId: string) {
  if (!isStudioPublicationId(playId)) throw new Error('Publicação inválida.')
  const key = keyOf(audience, playId)
  if (!(await r2HeadObjectPrivate(key))) return null
  const object = await r2GetObjectPrivate(key)
  const raw: unknown = JSON.parse((await bufferFromStream(object.body, 4096)).toString('utf8'))
  if (
    raw &&
    typeof raw === 'object' &&
    'playId' in raw &&
    raw.playId === playId &&
    'audience' in raw &&
    raw.audience === audience &&
    'retired' in raw &&
    raw.retired === true
  )
    return null
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('playId' in raw) ||
    raw.playId !== playId ||
    !('authorId' in raw) ||
    typeof raw.authorId !== 'string' ||
    !isStudioPublicationId(raw.authorId) ||
    !('audience' in raw) ||
    raw.audience !== audience
  )
    throw new Error('Recibo de propriedade inválido.')
  const bindingHash = 'bindingHash' in raw ? raw.bindingHash : undefined
  if (
    bindingHash !== undefined &&
    (typeof bindingHash !== 'string' || !/^[a-f0-9]{64}$/.test(bindingHash))
  )
    throw new Error('Vínculo da reserva inválido.')
  return { key, playId, authorId: raw.authorId, audience, bindingHash }
}

export async function retireStudioPublicationOwner(audience: Audience, playId: string) {
  if (!isStudioPublicationId(playId)) throw new Error('Publicação inválida.')
  await r2PutObjectPrivate({
    key: keyOf(audience, playId),
    body: Buffer.from(JSON.stringify({ playId, audience, retired: true })),
    contentType: 'application/json',
  })
}
