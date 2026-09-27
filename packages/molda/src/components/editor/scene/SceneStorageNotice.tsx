import { useEffect, useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneStorageObserver } from '../../../state/sceneStorageObserver'
import { Button } from '../../ui/Button'

export function SceneStorageNotice({ observer }: { observer: SceneStorageObserver }) {
  const snapshot = useSyncExternalStore(
    observer.subscribe,
    observer.getSnapshot,
    observer.getServerSnapshot,
  )
  useEffect(() => {
    const refresh = () => {
      void observer.refresh()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [observer])
  const copy = COPY.scene.storage
  const message =
    snapshot.issue === 'changed'
      ? COPY.scene.conflict
      : snapshot.issue === 'deleted'
        ? copy.deleted
        : snapshot.issue === 'unreadable'
          ? copy.unreadable
          : snapshot.notifications === 'unavailable'
            ? copy.unavailable
            : null
  if (!message) return null
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-mld-border bg-mld-surface px-3 py-2">
      <p
        role={snapshot.issue ? 'alert' : 'status'}
        className="min-w-0 flex-1 text-sm text-mld-text"
      >
        {message}
      </p>
      <Button className="text-sm" onClick={() => void observer.refresh()}>
        {copy.check}
      </Button>
    </div>
  )
}
