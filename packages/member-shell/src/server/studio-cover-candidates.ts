import 'server-only'
import { createHash } from 'node:crypto'
import { isStudioPublicationId } from '@sistemazero/core/studio'
import { getEnv } from '../lib/env'
import {
  bufferFromStream,
  r2DeleteObjectPrivate,
  r2GetObjectPrivate,
  r2HeadObjectPrivate,
  r2ListPrivatePage,
  r2PutObjectPrivate,
} from './r2'
import { retireStudioPublicationCover } from './studio-publication-cover'

const PREFIX = 'studio/cover-candidates/'
const RECEIPT_PREFIX = 'studio/cover-receipts/'
const RECONCILE_AFTER_MS = 60 * 60 * 1000
type Audience = 'kids' | 'adult'

function validCoverKey(coverKey: string) {
  return /^studio\/cover\/[A-Za-z0-9_./-]+$/.test(coverKey) && !coverKey.includes('..')
}

function intentKey(audience: Audience, playId: string, coverKey: string) {
  const digest = createHash('sha256').update(coverKey).digest('hex')
  return `${PREFIX}${audience}/${playId}/${digest}.json`
}

function receiptKey(audience: Audience, playId: string) {
  return `${RECEIPT_PREFIX}${audience}/${playId}.json`
}

function validCoverUrl(url: string, coverKey: string) {
  try {
    const parsed = new URL(url)
    return (
      (parsed.protocol === 'https:' ||
        (parsed.protocol === 'http:' &&
          ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname))) &&
      parsed.search === '' &&
      parsed.hash === '' &&
      parsed.pathname.endsWith(`/${coverKey}`)
    )
  } catch {
    return false
  }
}

/** Keep the canonical key after publication so a later CDN-domain change cannot orphan it. */
export async function commitStudioCoverCandidate(
  audience: Audience,
  playId: string,
  coverKey: string,
) {
  const key = intentKey(audience, playId, coverKey)
  const object = await r2GetObjectPrivate(key)
  const raw: unknown = JSON.parse((await bufferFromStream(object.body, 4096)).toString('utf8'))
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('playId' in raw) ||
    raw.playId !== playId ||
    !('coverKey' in raw) ||
    raw.coverKey !== coverKey ||
    !validCoverKey(coverKey) ||
    !('coverUrl' in raw) ||
    typeof raw.coverUrl !== 'string' ||
    !validCoverUrl(raw.coverUrl, coverKey)
  )
    throw new Error('Registro de capa candidata inválido.')
  await r2PutObjectPrivate({
    key: receiptKey(audience, playId),
    body: Buffer.from(JSON.stringify({ playId, coverKey, coverUrl: raw.coverUrl })),
    contentType: 'application/json',
    cacheControl: 'private, no-store',
  })
  await r2DeleteObjectPrivate(key)
}

export async function readStudioCoverReceipt(audience: Audience, playId: string) {
  const key = receiptKey(audience, playId)
  if (!(await r2HeadObjectPrivate(key))) return null
  const object = await r2GetObjectPrivate(key)
  const raw: unknown = JSON.parse((await bufferFromStream(object.body, 4096)).toString('utf8'))
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('playId' in raw) ||
    raw.playId !== playId ||
    !('coverKey' in raw) ||
    typeof raw.coverKey !== 'string' ||
    !validCoverKey(raw.coverKey) ||
    !('coverUrl' in raw) ||
    typeof raw.coverUrl !== 'string' ||
    !validCoverUrl(raw.coverUrl, raw.coverKey)
  )
    throw new Error('Recibo de capa inválido.')
  return { key, coverKey: raw.coverKey, coverUrl: raw.coverUrl }
}

/** The intent is durable before the public PUT, including when its outcome is unknown. */
export async function enqueueStudioCoverCandidate(
  audience: Audience,
  playId: string,
  coverKey: string,
) {
  if (!isStudioPublicationId(playId) || !validCoverKey(coverKey))
    throw new Error('Capa candidata inválida.')
  const publicBase = getEnv().R2_PUBLIC_URL?.replace(/\/+$/, '')
  if (!publicBase) throw new Error('URL pública das capas indisponível.')
  await r2PutObjectPrivate({
    key: intentKey(audience, playId, coverKey),
    body: Buffer.from(
      JSON.stringify({
        playId,
        coverKey,
        coverUrl: `${publicBase}/${coverKey}`,
        createdAt: Date.now(),
      }),
    ),
    contentType: 'application/json',
    cacheControl: 'private, no-store',
  })
}

export async function acknowledgeStudioCoverCandidate(
  audience: Audience,
  playId: string,
  coverKey: string,
) {
  await r2DeleteObjectPrivate(intentKey(audience, playId, coverKey))
}

type CoverResolution = {
  status: number
  body?: unknown
}

/** Reconcile an uncertain Hub commit against the canonical, audience-scoped thread. */
export async function drainStudioCoverCandidates(
  audience: Audience,
  resolve: (playId: string) => Promise<CoverResolution>,
  now = Date.now(),
) {
  const checkpointKey = `studio/maintenance/cover-candidates-${audience}.json`
  let cursor: string | undefined
  if (await r2HeadObjectPrivate(checkpointKey)) {
    const checkpoint = await r2GetObjectPrivate(checkpointKey)
    const saved: unknown = JSON.parse(
      (await bufferFromStream(checkpoint.body, 4096)).toString('utf8'),
    )
    if (saved && typeof saved === 'object' && 'cursor' in saved && typeof saved.cursor === 'string')
      cursor = saved.cursor
  }
  const page = await r2ListPrivatePage(`${PREFIX}${audience}/`, 4, cursor)
  let completed = 0,
    pending = 0,
    waiting = 0
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
          typeof raw.playId !== 'string' ||
          !isStudioPublicationId(raw.playId) ||
          !('coverKey' in raw) ||
          typeof raw.coverKey !== 'string' ||
          !validCoverKey(raw.coverKey) ||
          key !== intentKey(audience, raw.playId, raw.coverKey) ||
          !('coverUrl' in raw) ||
          typeof raw.coverUrl !== 'string' ||
          !validCoverUrl(raw.coverUrl, raw.coverKey) ||
          !('createdAt' in raw) ||
          typeof raw.createdAt !== 'number' ||
          !Number.isSafeInteger(raw.createdAt) ||
          raw.createdAt > now
        )
          throw new Error('Registro de capa candidata inválido.')
        if (now - raw.createdAt < RECONCILE_AFTER_MS) {
          waiting++
          return
        }
        const canonical = await resolve(raw.playId)
        if (
          canonical.status !== 200 ||
          !canonical.body ||
          typeof canonical.body !== 'object' ||
          !('status' in canonical.body) ||
          typeof canonical.body.status !== 'string' ||
          !['absent', 'pending', 'visible', 'hidden', 'deleted', 'rejected'].includes(
            canonical.body.status,
          ) ||
          !('coverImageUrl' in canonical.body) ||
          !(
            canonical.body.coverImageUrl === null ||
            typeof canonical.body.coverImageUrl === 'string'
          )
        )
          throw new Error('Estado canônico indisponível.')
        // A reservation can still adopt this object. Age and a not-yet-selected
        // canonical URL are not evidence of abandonment.
        if (canonical.body.status === 'pending') {
          waiting++
          return
        }
        if (
          ['absent', 'deleted', 'rejected'].includes(canonical.body.status) ||
          canonical.body.coverImageUrl !== raw.coverUrl
        ) {
          await retireStudioPublicationCover(raw.coverKey)
          await r2DeleteObjectPrivate(key)
        } else {
          await commitStudioCoverCandidate(audience, raw.playId, raw.coverKey)
        }
        completed++
      } catch {
        pending++
      }
    }),
  )
  await r2PutObjectPrivate({
    key: checkpointKey,
    body: Buffer.from(JSON.stringify({ cursor: page.cursor })),
    contentType: 'application/json',
  })
  return { completed, pending, waiting }
}
