import 'server-only'
import { isStudioPublicationId, STUDIO_PRO_PUBLICATION_LIMITS } from '@sistemazero/core/studio'
import {
  bufferFromStream,
  r2CreateObjectPrivate,
  r2GetObjectPrivate,
  r2PutObjectPrivate,
} from './r2'
import { StudioPublicationError } from './studio-publication'

function keyOf(playId: string) {
  if (!isStudioPublicationId(playId)) throw new Error('Publicação inválida.')
  return `studio/play/${playId}.json`
}

/** The initial snapshot is immutable; retained revision updates live in the runtime service. */
export async function createStudioPublicationSnapshot(playId: string, bytes: Buffer) {
  const key = keyOf(playId)
  if (await r2CreateObjectPrivate({ key, body: bytes, contentType: 'application/json' })) return
  const object = await r2GetObjectPrivate(key)
  const previous = await bufferFromStream(object.body, STUDIO_PRO_PUBLICATION_LIMITS.maxSourceBytes)
  if (!previous.equals(bytes))
    throw new StudioPublicationError(
      409,
      'Esta publicação mudou ou foi retirada. Crie uma nova publicação.',
    )
}

export function isRetiredStudioPublicationSnapshot(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'studioPublicationState' in value &&
      value.studioPublicationState === 'retired',
  )
}

/** Keep the fence at the same conditional-write key, without retaining source or personal data. */
export async function retireStudioPublicationSnapshot(playId: string) {
  await r2PutObjectPrivate({
    key: keyOf(playId),
    body: Buffer.from(JSON.stringify({ studioPublicationState: 'retired', playId })),
    contentType: 'application/json',
  })
}
