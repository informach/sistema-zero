import 'server-only'
import { isStudioPublicationId } from '@sistemazero/core/studio'
import { getEnv } from '../lib/env'
import { coverKeyFromPublicUrl } from '../lib/studio-cleanup'
import {
  bufferFromStream,
  r2DeleteObjectPrivate,
  r2DeleteObjects,
  r2GetObjectPrivate,
  r2ListPrivateKeys,
  r2PutObjectPrivate,
} from './r2'
import { callStudioPublication } from './studio-publication'

const PREFIX = 'studio/publication-cleanup/'
const keyOf = (playId: string) => `${PREFIX}${playId}.json`

/** Persist intent before attempting remote deletion; the queue contains only object identifiers. */
export async function enqueueStudioPublicationCleanup(playId: string, coverUrl?: unknown) {
  if (!isStudioPublicationId(playId)) throw new Error('Publicação inválida.')
  const coverKey =
    typeof coverUrl === 'string' ? coverKeyFromPublicUrl(getEnv().R2_PUBLIC_URL, coverUrl) : null
  await r2PutObjectPrivate({
    key: keyOf(playId),
    body: Buffer.from(
      JSON.stringify({
        playId,
        coverKey,
        runtime: Boolean(getEnv().STUDIO_PRO_RUNTIME_URL || getEnv().STUDIO_PRO_RUNTIME_TOKEN),
      }),
    ),
    contentType: 'application/json',
    cacheControl: 'private, no-store',
  })
}

export async function performStudioPublicationCleanup(
  playId: string,
  coverKey: string | null,
  signal?: AbortSignal,
  requiresRuntime = false,
) {
  const env = getEnv()
  // Classic installations need no runtime. Pro release requires both settings.
  if (requiresRuntime || env.STUDIO_PRO_RUNTIME_URL || env.STUDIO_PRO_RUNTIME_TOKEN)
    await callStudioPublication({ operation: 'purge', playId }, signal)
  await r2DeleteObjectPrivate(`studio/play/${playId}.json`)
  if (coverKey) await r2DeleteObjects([coverKey])
  await r2DeleteObjectPrivate(keyOf(playId))
}

/** Four independent idempotent jobs per invocation. Failure retains the durable intent. */
export async function drainStudioPublicationCleanup() {
  const keys = await r2ListPrivateKeys(PREFIX, 4)
  let completed = 0,
    pending = 0
  await Promise.all(
    keys.map(async (key) => {
      try {
        const object = await r2GetObjectPrivate(key)
        const raw: unknown = JSON.parse(
          (await bufferFromStream(object.body, 4096)).toString('utf8'),
        )
        if (
          !raw ||
          typeof raw !== 'object' ||
          !('playId' in raw) ||
          !isStudioPublicationId(raw.playId) ||
          key !== keyOf(raw.playId) ||
          !('runtime' in raw) ||
          typeof raw.runtime !== 'boolean' ||
          !('coverKey' in raw) ||
          !(
            raw.coverKey === null ||
            (typeof raw.coverKey === 'string' &&
              /^studio\/cover\/[A-Za-z0-9_./-]+$/.test(raw.coverKey) &&
              !raw.coverKey.includes('..'))
          )
        )
          throw new Error('Registro de limpeza inválido.')
        await performStudioPublicationCleanup(raw.playId, raw.coverKey, undefined, raw.runtime)
        completed++
      } catch {
        pending++
      }
    }),
  )
  return { completed, pending }
}
