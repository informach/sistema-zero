import { useEffect } from 'react'
import { drainProBuilderDeletions, subscribeProBuilderDeletion } from '../state/proBuilderDeletion'
import { captureProjectStorageScope } from '../state/projectStorageRuntime'
import { useStudioTutor } from './tutor'

/** No inference: only owner-scoped deletion commands retained by the local delete transaction. */
export function ProBuilderDeletionReconciler() {
  const { config } = useStudioTutor()
  useEffect(() => {
    const remove = config?.adapter.builder?.removeProject
    if (!remove) return
    const scope = captureProjectStorageScope()
    const controller = new AbortController()
    let running = false
    const drain = async () => {
      if (
        running ||
        controller.signal.aborted ||
        navigator.onLine === false ||
        captureProjectStorageScope() !== scope
      )
        return
      running = true
      try {
        await drainProBuilderDeletions(scope, remove, controller.signal)
      } catch {
        /* The persisted request is retried after reconnection/opening; never reported as acknowledged. */
      } finally {
        running = false
      }
    }
    const onOnline = () => {
      void drain()
    }
    const unsubscribe = subscribeProBuilderDeletion((deletedScope) => {
      if (deletedScope.identity === scope.identity) void drain()
    })
    window.addEventListener('online', onOnline)
    const retry = window.setInterval(onOnline, 30_000)
    void drain()
    return () => {
      controller.abort()
      unsubscribe()
      window.removeEventListener('online', onOnline)
      window.clearInterval(retry)
    }
  }, [config])
  return null
}
