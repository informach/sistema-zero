import {
  studioProjectContinuityIssue,
  studioProjectContinuityReference,
} from '@sistemazero/core/studio/project-continuity'
import type { StudioBlock } from './types'

export interface StudioLessonContext {
  id: string
  blockId: string
  lessonId: string
  bound: boolean
  readOnly?: boolean
  configuration: Pick<
    StudioBlock,
    | 'initialProject'
    | 'level'
    | 'allowBlocks'
    | 'allowCategories'
    | 'allowedModes'
    | 'allowLevelReveal'
    | 'pythonLevel'
    | 'chain'
  >
}

export interface StudioLessonContextCache {
  read(key: string): Promise<StudioLessonContext | null>
  write(key: string, context: StudioLessonContext): Promise<void>
}

export function lessonContextScope(viewerId: string, lessonId: string, blockId: string): string {
  return JSON.stringify([viewerId, lessonId, blockId])
}

/** A cached authoring snapshot is only an offline editor seed, never an execution/access grant. */
export async function resolveStudioLessonContext(input: {
  key: string | null
  lessonId: string
  blockId: string
  fetchCurrent: () => Promise<StudioLessonContext>
  readLocal: () => Promise<unknown>
  cache: StudioLessonContextCache
}): Promise<{ context: StudioLessonContext; offline: boolean }> {
  const matches = (context: StudioLessonContext | null): context is StudioLessonContext =>
    Boolean(
      context &&
        /^[a-f0-9]{64}$/.test(context.id) &&
        context.blockId === input.blockId &&
        context.lessonId === input.lessonId &&
        typeof context.bound === 'boolean' &&
        context.configuration?.initialProject &&
        studioProjectContinuityIssue(
          context.configuration.initialProject,
          context.configuration.initialProject,
        ) === null,
    )
  let context: StudioLessonContext
  try {
    context = await input.fetchCurrent()
  } catch (error) {
    const status = (error as { status?: number } | null)?.status
    const name = (error as { name?: string } | null)?.name
    const unavailable =
      error instanceof TypeError ||
      name === 'TimeoutError' ||
      (typeof status === 'number' && status >= 500)
    if (!input.key || !unavailable) throw error
    const cached = await input.cache.read(input.key).catch(() => null)
    if (!matches(cached) || !cached.bound) throw error
    // Never manufacture a fresh offline project or switch an existing document's environment.
    const local = await input.readLocal()
    if (!local || studioProjectContinuityIssue(local, cached.configuration.initialProject))
      throw error
    return { context: cached, offline: true }
  }
  if (!matches(context)) throw new Error('Não foi possível conferir este projeto.')
  if (input.key && context.bound) await input.cache.write(input.key, context).catch(() => {})
  return { context, offline: false }
}

export class StudioLessonAdmissionError extends Error {}

/** Complete first admission only after local/cloud/submitted work has been checked. */
export async function confirmStudioLessonContext(input: {
  context: StudioLessonContext
  /** False when the host supplies an account channel that this browser cannot use. */
  accountAvailable: boolean
  project: unknown
  key: string | null
  cache: StudioLessonContextCache
  send: (confirm: { baselineId: string; environment: unknown }) => Promise<StudioLessonContext>
}): Promise<void> {
  if (studioProjectContinuityIssue(input.project, input.context.configuration.initialProject))
    throw new StudioLessonAdmissionError(
      'O projeto salvo usa outro ambiente. Ele continua preservado.',
    )
  if (input.context.bound || input.context.readOnly) return
  if (!input.accountAvailable)
    throw new StudioLessonAdmissionError(
      'Este navegador não consegue conferir seu projeto guardado na conta. Reabra o projeto em um navegador atualizado para continuar. Seu projeto foi preservado.',
    )
  const confirmed = await input.send({
    baselineId: input.context.id,
    environment: studioProjectContinuityReference(input.project),
  })
  if (
    !confirmed.bound ||
    confirmed.id !== input.context.id ||
    confirmed.blockId !== input.context.blockId ||
    confirmed.lessonId !== input.context.lessonId
  )
    throw new StudioLessonAdmissionError(
      'O vínculo deste projeto mudou. Reabra o ambiente para continuar.',
    )
  if (input.key) await input.cache.write(input.key, confirmed).catch(() => {})
}

const DATABASE = 'sz-studio-lesson-contexts'
const MAX_ENTRIES = 20
const MAX_BYTES = 2_000_000

async function openCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    let rejected = false
    request.onupgradeneeded = () => {
      request.result.createObjectStore('contexts')
      request.result.createObjectStore('order')
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => {
      rejected = true
      reject(new Error('Cache indisponível'))
    }
    request.onsuccess = () => {
      if (rejected) {
        request.result.close()
        return
      }
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
  })
}

export const studioLessonContextCache: StudioLessonContextCache = {
  async read(key) {
    const db = await openCache()
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('contexts', 'readonly')
        const request = tx.objectStore('contexts').get(key)
        tx.oncomplete = () => resolve(request.result ?? null)
        tx.onabort = () => reject(tx.error)
        tx.onerror = () => {}
      })
    } finally {
      db.close()
    }
  },
  async write(key, context) {
    if (new TextEncoder().encode(JSON.stringify(context)).byteLength > MAX_BYTES) return
    const db = await openCache()
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['contexts', 'order'], 'readwrite')
        tx.oncomplete = () => resolve()
        tx.onabort = () => reject(tx.error)
        tx.onerror = () => {}
        tx.objectStore('contexts').put(context, key)
        // Only small ordering records are scanned; large seeds/assets are never read to evict.
        const list = tx.objectStore('order').getAll()
        list.onsuccess = () => {
          const rows = (list.result as { key: string; at: number }[]).filter(
            (row) => row.key !== key,
          )
          const newest = { key, at: Math.max(Date.now(), ...rows.map((row) => row.at)) + 1 }
          tx.objectStore('order').put(newest, key)
          rows.push(newest)
          rows.sort((a, b) => b.at - a.at)
          for (const row of rows.slice(MAX_ENTRIES)) {
            tx.objectStore('order').delete(row.key)
            tx.objectStore('contexts').delete(row.key)
          }
        }
      })
    } finally {
      db.close()
    }
  },
}
