import type { UseStore } from 'idb-keyval'
import { isMoldaAssetId } from '../core/id'

/** An invalidation hint, never a document or a token granting permission to write. */
export interface SceneStorageChange {
  protocol: 1
  type: 'scene-storage-changed'
  id: string
  revision: number
  status: 'indexed' | 'deleted'
}

export interface SceneStorageSubscription {
  available: boolean
  unsubscribe(): void
}

export function sceneStorageChannelName(database: string, store: string): string {
  // Tuple encoding avoids collisions when either IDB name contains separators.
  return `molda:scene-storage:${JSON.stringify([database, store])}`
}

function open(name: string): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  try {
    return new BroadcastChannel(name)
  } catch {
    // Optional browser transport; a blocked channel must not undo a committed save.
    return null
  }
}

function readChange(raw: unknown): SceneStorageChange | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  if (
    Object.keys(raw).length !== 5 ||
    !('protocol' in raw) ||
    raw.protocol !== 1 ||
    !('type' in raw) ||
    raw.type !== 'scene-storage-changed' ||
    !('id' in raw) ||
    !isMoldaAssetId(raw.id) ||
    !('revision' in raw) ||
    typeof raw.revision !== 'number' ||
    !Number.isSafeInteger(raw.revision) ||
    raw.revision < 1 ||
    !('status' in raw) ||
    (raw.status !== 'indexed' && raw.status !== 'deleted')
  )
    return null
  return {
    protocol: 1,
    type: 'scene-storage-changed',
    id: raw.id,
    revision: raw.revision,
    status: raw.status,
  }
}

/** Call only from IDB transaction completion, never a request's success event. */
export function notifySceneStorageCommit(store: IDBObjectStore, change: SceneStorageChange): void {
  const channel = open(sceneStorageChannelName(store.transaction.db.name, store.name))
  if (!channel) return
  try {
    channel.postMessage(change)
  } catch {
    // Best-effort invalidation. The commit has already succeeded; CAS still protects writes.
  } finally {
    channel.close()
  }
}

/** Each subscription owns its channel; no ambient namespace or retained global sender. */
export async function subscribeSceneStorageChanges(
  withStore: UseStore,
  listener: (change: SceneStorageChange) => void,
  signal?: AbortSignal,
): Promise<SceneStorageSubscription> {
  signal?.throwIfAborted()
  const name = await withStore(
    'readonly',
    (store) =>
      new Promise<string>((resolve, reject) => {
        const tx = store.transaction
        const name = sceneStorageChannelName(tx.db.name, store.name)
        tx.oncomplete = () => resolve(name)
        tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Storage unavailable'))
      }),
  )
  signal?.throwIfAborted()
  const channel = open(name)
  if (!channel) return { available: false, unsubscribe() {} }
  let closed = false
  const onMessage = (event: MessageEvent<unknown>) => {
    if (closed) return
    const change = readChange(event.data)
    if (change) listener(change)
  }
  const unsubscribe = () => {
    if (closed) return
    closed = true
    signal?.removeEventListener('abort', unsubscribe)
    channel.removeEventListener('message', onMessage)
    channel.close()
  }
  channel.addEventListener('message', onMessage)
  signal?.addEventListener('abort', unsubscribe, { once: true })
  return { available: true, unsubscribe }
}
