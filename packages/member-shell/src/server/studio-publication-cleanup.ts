import 'server-only'
import { isStudioPublicationId, STUDIO_PRO_PUBLICATION_LIMITS } from '@sistemazero/core/studio'
import { getEnv } from '../lib/env'
import {
  bufferFromStream,
  r2DeleteObjectPrivate,
  r2GetObjectPrivate,
  r2HeadObjectPrivate,
  r2ListPrivatePage,
  r2PutObjectPrivate,
} from './r2'
import { readStudioCoverReceipt } from './studio-cover-candidates'
import { callStudioPublication } from './studio-publication'
import { retireStudioPublicationCover } from './studio-publication-cover'
import {
  readStudioPublicationOwner,
  retireStudioPublicationOwner,
} from './studio-publication-ownership'
import { retireStudioPublicationSnapshot } from './studio-publication-snapshot'

const PREFIX = 'studio/publication-cleanup/'
const COMPLETED_PREFIX = 'studio/publication-cleanup-completed/'
const CHECKPOINT = 'studio/maintenance/publication-cleanup.json'
const keyOf = (playId: string) => `${PREFIX}${playId}.json`
const completedKeyOf = (playId: string) => `${COMPLETED_PREFIX}${playId}.json`

/** Persist intent before attempting remote deletion; the queue contains only object identifiers. */
export async function enqueueStudioPublicationCleanup(
  playId: string,
  coverUrl?: unknown,
  audience: 'kids' | 'adult' = 'kids',
  authorId?: unknown,
) {
  if (!isStudioPublicationId(playId)) throw new Error('Publicação inválida.')
  if (await r2HeadObjectPrivate(completedKeyOf(playId)))
    return {
      playId,
      coverKey: null,
      runtime: false,
      coverReceiptKey: null,
      ownershipKey: null,
      alreadyCleaned: true,
    }
  if (!isStudioPublicationId(authorId)) throw new Error('Autor canônico inválido.')
  const ownership = await readStudioPublicationOwner(audience, playId)
  if (!ownership || ownership.authorId !== authorId)
    throw new Error('Propriedade da publicação não comprovada.')
  const receipt = await readStudioCoverReceipt(audience, playId)
  if (receipt && typeof coverUrl === 'string' && receipt.coverUrl !== coverUrl)
    throw new Error('A capa canônica diverge do recibo da publicação.')
  // Hub URLs are presentation data, never authorization to delete a public object.
  const coverKey = receipt?.coverKey ?? null
  let runtime = Boolean(getEnv().STUDIO_PRO_RUNTIME_URL || getEnv().STUDIO_PRO_RUNTIME_TOKEN)
  // A configuration outage cannot skip retained artifacts for Pro or Classic Python.
  const sourceKey = `studio/play/${playId}.json`
  if (!runtime && (await r2HeadObjectPrivate(sourceKey))) {
    const source = await r2GetObjectPrivate(sourceKey)
    const project: unknown = JSON.parse(
      (await bufferFromStream(source.body, STUDIO_PRO_PUBLICATION_LIMITS.maxSourceBytes)).toString(
        'utf8',
      ),
    )
    runtime = Boolean(
      project &&
        typeof project === 'object' &&
        (('kind' in project && project.kind === 'pro') ||
          ('programmingLanguage' in project && project.programmingLanguage === 'python')),
    )
  }
  const intent = {
    playId,
    coverKey,
    runtime,
    coverReceiptKey: receipt?.key ?? null,
    ownershipKey: ownership.key,
    alreadyCleaned: false,
  }
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
  coverReceiptKey: string | null = null,
  ownershipKey: string | null = null,
) {
  if (!ownershipKey) throw new Error('Propriedade da publicação não comprovada.')
  const audience =
    ownershipKey === `studio/publication-owners/kids/${playId}.json`
      ? 'kids'
      : ownershipKey === `studio/publication-owners/adult/${playId}.json`
        ? 'adult'
        : null
  if (!audience) throw new Error('Recibo de propriedade inválido.')
  // Fence the same keys used by conditional writers before any remote cleanup can finish.
  await retireStudioPublicationSnapshot(playId)
  await retireStudioPublicationOwner(audience, playId)
  const env = getEnv()
  // Classic installations need no runtime. Pro publications always require it.
  if (requiresRuntime || env.STUDIO_PRO_RUNTIME_URL || env.STUDIO_PRO_RUNTIME_TOKEN)
    await callStudioPublication({ operation: 'purge', playId }, signal)
  if (coverKey) await retireStudioPublicationCover(coverKey)
  if (coverReceiptKey) await r2DeleteObjectPrivate(coverReceiptKey)
  await r2PutObjectPrivate({
    key: completedKeyOf(playId),
    body: Buffer.from(JSON.stringify({ playId, completedAt: Date.now() })),
    contentType: 'application/json',
    cacheControl: 'private, no-store',
  })
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
          !('ownershipKey' in raw) ||
          typeof raw.ownershipKey !== 'string' ||
          ![
            `studio/publication-owners/kids/${raw.playId}.json`,
            `studio/publication-owners/adult/${raw.playId}.json`,
          ].includes(raw.ownershipKey) ||
          !(
            raw.coverKey === null ||
            (typeof raw.coverKey === 'string' &&
              /^studio\/cover\/[A-Za-z0-9_./-]+$/.test(raw.coverKey) &&
              !raw.coverKey.includes('..'))
          )
        )
          throw new Error('Registro de limpeza inválido.')
        const coverReceiptKey =
          'coverReceiptKey' in raw && typeof raw.coverReceiptKey === 'string'
            ? raw.coverReceiptKey
            : null
        if (
          coverReceiptKey &&
          ![
            `studio/cover-receipts/kids/${raw.playId}.json`,
            `studio/cover-receipts/adult/${raw.playId}.json`,
          ].includes(coverReceiptKey)
        )
          throw new Error('Recibo de capa inválido.')
        if (await r2HeadObjectPrivate(completedKeyOf(raw.playId))) {
          await r2DeleteObjectPrivate(key)
          completed++
          return
        }
        await performStudioPublicationCleanup(
          raw.playId,
          raw.coverKey,
          undefined,
          raw.runtime,
          coverReceiptKey,
          raw.ownershipKey,
        )
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
