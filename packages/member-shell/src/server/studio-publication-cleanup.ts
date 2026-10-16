import 'server-only'
import { isStudioPublicationId, STUDIO_PRO_PUBLICATION_LIMITS } from '@sistemazero/core/studio'
import { getEnv } from '../lib/env'
import { coverKeyFromPublicUrl } from '../lib/studio-cleanup'
import {
  bufferFromStream,
  r2DeleteObjectPrivate,
  r2DeleteObjects,
  r2GetObjectPrivate,
  r2HeadObjectPrivate,
  r2ListPrivatePage,
  r2PutObjectPrivate,
} from './r2'
import { callStudioPublication } from './studio-publication'

const PREFIX = 'studio/publication-cleanup/'
const CHECKPOINT = 'studio/maintenance/publication-cleanup.json'
const keyOf = (playId: string) => `${PREFIX}${playId}.json`

/** Persist intent before attempting remote deletion; the queue contains only object identifiers. */
export async function enqueueStudioPublicationCleanup(playId: string, coverUrl?: unknown) {
  if (!isStudioPublicationId(playId)) throw new Error('Publicação inválida.')
  const coverKey =
    typeof coverUrl === 'string' ? coverKeyFromPublicUrl(getEnv().R2_PUBLIC_URL, coverUrl) : null
  let runtime = Boolean(getEnv().STUDIO_PRO_RUNTIME_URL || getEnv().STUDIO_PRO_RUNTIME_TOKEN)
  // A configuration outage must never turn an existing Pro publication into a classic one.
  const sourceKey = `studio/play/${playId}.json`
  if (!runtime && (await r2HeadObjectPrivate(sourceKey))) {
    const source = await r2GetObjectPrivate(sourceKey)
    const project: unknown = JSON.parse(
      (await bufferFromStream(source.body, STUDIO_PRO_PUBLICATION_LIMITS.maxSourceBytes)).toString(
        'utf8',
      ),
    )
    runtime = Boolean(
      project && typeof project === 'object' && 'kind' in project && project.kind === 'pro',
    )
  }
  const intent = { playId, coverKey, runtime }
  await r2PutObjectPrivate({
    key: keyOf(playId),
    body: Buffer.from(JSON.stringify(intent)),
    contentType: 'application/json',
    cacheControl: 'private, no-store',
  })
  return intent
}

export async function performStudioPublicationCleanup(
  playId: string,
  coverKey: string | null,
  signal?: AbortSignal,
  requiresRuntime = false,
) {
  const env = getEnv()
  // Classic installations need no runtime. Pro publications always require it.
  if (requiresRuntime || env.STUDIO_PRO_RUNTIME_URL || env.STUDIO_PRO_RUNTIME_TOKEN)
    await callStudioPublication({ operation: 'purge', playId }, signal)
  await r2DeleteObjectPrivate(`studio/play/${playId}.json`)
  if (coverKey) await r2DeleteObjects([coverKey])
  await r2DeleteObjectPrivate(keyOf(playId))
}

/** Four independent idempotent jobs per invocation. Failure retains the durable intent. */
export async function drainStudioPublicationCleanup() {
  let cursor: string | undefined
  if (await r2HeadObjectPrivate(CHECKPOINT)) {
    const checkpoint = await r2GetObjectPrivate(CHECKPOINT)
    const saved: unknown = JSON.parse(
      (await bufferFromStream(checkpoint.body, 4096)).toString('utf8'),
    )
    if (saved && typeof saved === 'object' && 'cursor' in saved && typeof saved.cursor === 'string')
      cursor = saved.cursor
  }
  const page = await r2ListPrivatePage(PREFIX, 4, cursor)
  let completed = 0,
    pending = 0
  await Promise.all(
    page.keys.map(async (key) => {
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
  // Advance even when a task fails. Wrap after the last page; failed intents remain for retry.
  await r2PutObjectPrivate({
    key: CHECKPOINT,
    body: Buffer.from(JSON.stringify({ cursor: page.cursor })),
    contentType: 'application/json',
  })
  return { completed, pending }
}
