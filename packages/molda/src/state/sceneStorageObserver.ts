import type { createScenePersistence } from './scenePersistence'
import type { SceneStorageSubscription } from './sceneStorageChannel'

export interface SceneStorageSnapshot {
  readonly issue: null | 'changed' | 'deleted' | 'unreadable'
  readonly notifications: 'connecting' | 'available' | 'unavailable'
}

const initial: SceneStorageSnapshot = { issue: null, notifications: 'connecting' }

export interface SceneStorageObserver {
  getSnapshot(): SceneStorageSnapshot
  getServerSnapshot(): SceneStorageSnapshot
  subscribe(listener: () => void): () => void
  refresh(): Promise<void>
}

/**
 * Subscription-owned observation, separate from editable content/history/save status.
 * Index reads are serialized/coalesced. Messages merely request a fresh read; their
 * revision is never adopted, even if forged, duplicated, late or out of order.
 */
export function createSceneStorageObserver(
  id: string,
  persistence: Pick<ReturnType<typeof createScenePersistence>, 'readIndexRevision' | 'subscribe'>,
  getExpectedRevision: () => number,
  isSaving: () => boolean,
): SceneStorageObserver {
  let snapshot = initial
  const listeners = new Set<() => void>()
  let active: AbortController | null = null
  let connection: SceneStorageSubscription | null = null
  let wanted = false
  let inflight: Promise<void> | null = null

  function update(next: SceneStorageSnapshot) {
    if (next.issue === snapshot.issue && next.notifications === snapshot.notifications) return
    snapshot = next
    for (const listener of listeners) listener()
  }

  async function drain() {
    while (active && wanted && !isSaving()) {
      wanted = false
      const owner = active
      const expected = getExpectedRevision()
      let issue: SceneStorageSnapshot['issue']
      try {
        const read = await persistence.readIndexRevision(id)
        issue =
          read.status === 'indexed'
            ? read.revision === expected
              ? null
              : 'changed'
            : read.status === 'deleted'
              ? 'deleted'
              : 'unreadable'
      } catch {
        // Storage can be unavailable; this is observation, not a replacement document.
        issue = 'unreadable'
      }
      if (active !== owner) continue
      if (isSaving() || getExpectedRevision() !== expected) {
        wanted = true
        continue
      }
      update({ ...snapshot, issue })
    }
  }

  function refresh(): Promise<void> {
    if (!active) return Promise.resolve()
    wanted = true
    if (inflight) return inflight
    // Defer the drain until ownership is installed, including synchronous reentry.
    const run: Promise<void> = Promise.resolve()
      .then(drain)
      .finally(() => {
        if (inflight === run) inflight = null
        if (active && wanted && !isSaving()) return refresh()
      })
    inflight = run
    return run
  }

  function start() {
    const owner = new AbortController()
    active = owner
    update({ ...snapshot, notifications: 'connecting' })
    void persistence
      .subscribe((change) => {
        if (active === owner && change.id === id) void refresh()
      }, owner.signal)
      .then(
        (subscription) => {
          if (active !== owner) {
            subscription.unsubscribe()
            return
          }
          connection = subscription
          update({
            ...snapshot,
            notifications: subscription.available ? 'available' : 'unavailable',
          })
          // Subscribe BEFORE checking: closes the read-to-listen opening race.
          void refresh()
        },
        () => {
          if (active !== owner) return
          update({ ...snapshot, notifications: 'unavailable' })
          void refresh()
        },
      )
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    refresh,
    subscribe(listener) {
      const notify = () => listener()
      listeners.add(notify)
      if (listeners.size === 1) start()
      let subscribed = true
      return () => {
        if (!subscribed) return
        subscribed = false
        listeners.delete(notify)
        if (listeners.size) return
        const previous = active
        active = null
        wanted = false
        const previousConnection = connection
        connection = null
        previousConnection?.unsubscribe()
        previous?.abort()
      }
    },
  }
}
