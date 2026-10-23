import type { WebContainer } from '@webcontainer/api'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import type { ProjectAsset } from '#core'
import {
  buildTerminalFileTree,
  type TerminalProjectSnapshot,
} from '../../components/terminal/terminalProjectFiles'
import {
  claimFsOwnership,
  currentFsOwner,
  getWebContainer,
  registerProMountTrigger,
  releaseFsOwnership,
  resetWebContainerFs,
  setMountedTemplateId,
  setProFsMounted,
} from '../../components/terminal/webContainerClient'
import { registerProjectOperation } from '../../state/projectOperations'
import { useProjectStoreApi } from '../../state/projectStore'
import { createProAssetSync } from './proAssetSync'
import { ignoredProFsPath } from './proFileSystem'
import { createProFsSync, type ProFsSync } from './proFsSync'

const NO_ASSETS: ProjectAsset[] = []

export type WcMountState = 'idle' | 'mounting' | 'mounted' | 'error' | 'busy'
export interface UseWebContainerSyncResult {
  state: WcMountState
  error: string | null
  syncError: string | null
  dependencyRevision: number
  ensureMounted: () => Promise<WebContainer | null>
  webcontainerRef: RefObject<WebContainer | null>
}

/** A single owner reconciles editor, shell and persistence for this Studio instance. */
export function useWebContainerSync(snapshot: TerminalProjectSnapshot): UseWebContainerSyncResult {
  const projectId = snapshot.id
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot
  const store = useProjectStoreApi()
  const owner = useRef(Symbol('sz-pro-webcontainer'))
  const webcontainerRef = useRef<WebContainer | null>(null)
  const mountedProject = useRef<string | null>(null)
  const generation = useRef(0)
  const mountPromise = useRef<Promise<WebContainer | null> | null>(null)
  const mountTarget = useRef<string | null>(null)
  const sync = useRef<ProFsSync | null>(null)
  const watcher = useRef<{ close(): void } | null>(null)
  const unregisterOperation = useRef<(() => void) | null>(null)
  const drain = useRef<Promise<void>>(Promise.resolve())
  const [state, setState] = useState<WcMountState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [dependencyRevision, setDependencyRevision] = useState(0)

  const stopSync = useCallback(() => {
    watcher.current?.close()
    watcher.current = null
    unregisterOperation.current?.()
    unregisterOperation.current = null
    const previous = sync.current
    sync.current = null
    const previousDrain = drain.current
    drain.current = Promise.all([previousDrain, previous?.dispose()]).then(() => undefined)
    return drain.current
  }, [])

  const ensureMounted = useCallback(async (): Promise<WebContainer | null> => {
    if (!projectId) return null
    if (mountedProject.current === projectId && webcontainerRef.current)
      return webcontainerRef.current
    if (mountPromise.current && mountTarget.current === projectId) return mountPromise.current
    const priorMount = mountPromise.current
    mountTarget.current = projectId
    const epoch = ++generation.current
    const fresh = () => generation.current === epoch && store.getState().project?.id === projectId
    setState('mounting')
    setError(null)
    setSyncError(null)
    const promise = (async () => {
      try {
        if (!claimFsOwnership(owner.current)) {
          if (fresh()) setState('busy')
          return null
        }
        await Promise.all([stopSync(), priorMount])
        if (!fresh()) return null
        const wc = await getWebContainer()
        if (!fresh()) return null
        const templateId = store.getState().project?.proMeta?.templateId ?? null
        await resetWebContainerFs(wc, { templateId })
        if (!fresh()) return null
        const mountedSnapshot = snapshotRef.current
        await wc.mount(buildTerminalFileTree(mountedSnapshot))
        if (!fresh()) return null
        webcontainerRef.current = wc
        mountedProject.current = projectId
        setMountedTemplateId(templateId)
        const assets = createProAssetSync(wc.fs, {
          active: fresh,
          get: () => ({
            assets: store.getState().project?.assets ?? NO_ASSETS,
            tree: store.getState().project?.tree ?? {},
            legacyRuntime: Boolean(store.getState().project?.proMeta?.origin),
          }),
          apply: (expected, next) => store.getState().reconcileProAssets(projectId, expected, next),
          report: (message) => {
            if (fresh()) setSyncError(message)
          },
        })
        const coordinator = createProFsSync(wc.fs, mountedSnapshot.tree ?? {}, {
          prepare: (changes) => assets.sync(changes),
          ingest: async (paths) => {
            const remaining = await assets.ingest(paths)
            if (paths.length !== remaining.length) await assets.sync(new Set(paths))
            return remaining
          },
          ignore: assets.owns,
          active: fresh,
          getTree: () => store.getState().project?.tree ?? null,
          applyTree: (expected, next) =>
            store.getState().reconcileProFiles(projectId, expected, next),
          report: (message) => {
            if (fresh()) setSyncError(message)
          },
        })
        sync.current = coordinator
        watcher.current = wc.fs.watch('.', { recursive: true }, (event, filename) => {
          if (!fresh()) return
          const name = typeof filename === 'string' ? filename : new TextDecoder().decode(filename)
          const path = name.replace(`${wc.workdir}/`, '').replace(/^\.\//, '')
          if (
            path === 'node_modules/.package-lock.json' ||
            path === 'package-lock.json' ||
            path === 'package.json'
          )
            setDependencyRevision((value) => value + 1)
          if (ignoredProFsPath(path)) return
          coordinator.changed(event === 'rename' ? '*' : path)
        })
        unregisterOperation.current = registerProjectOperation(store, {
          projectId,
          flush: () => coordinator.flush(),
        })
        await coordinator.flush()
        if (!fresh()) return null
        setState('mounted')
        setProFsMounted(projectId, store)
        return wc
      } catch (cause) {
        if (!fresh()) return null
        await stopSync()
        webcontainerRef.current = null
        mountedProject.current = null
        releaseFsOwnership(owner.current)
        setError(cause instanceof Error ? cause.message : String(cause))
        setState('error')
        return null
      }
    })()
    // Even a synchronous "busy" result settles after this reference is set.
    // Otherwise finally clears null before assignment and retries reuse a
    // completed busy promise forever.
    const tracked = promise.finally(() => {
      if (mountPromise.current === tracked) mountPromise.current = null
    })
    mountPromise.current = tracked
    return tracked
  }, [projectId, store, stopSync])

  const lastProjectId = useRef<string | null>(null)
  useEffect(() => {
    const previous = lastProjectId.current
    lastProjectId.current = projectId
    if (previous === null || previous === projectId) return
    // A child effect may already have started this project's mount.
    if (mountTarget.current === projectId) return
    generation.current++
    mountedProject.current = null
    void stopSync()
    if (currentFsOwner() === owner.current) setProFsMounted(null, store)
    setState('idle')
  }, [projectId, stopSync, store])

  useEffect(() => {
    return registerProMountTrigger(() => {
      void ensureMounted()
    }, store)
  }, [ensureMounted, store])

  useEffect(() => {
    const token = owner.current
    return () => {
      const epoch = ++generation.current
      const mounting = mountPromise.current
      mountPromise.current = null
      mountedProject.current = null
      webcontainerRef.current = null
      if (currentFsOwner() === token) setProFsMounted(null, store)
      drain.current = Promise.all([stopSync(), mounting]).then(() => undefined)
      void drain.current.then(() => {
        if (generation.current === epoch) releaseFsOwnership(token)
      })
    }
  }, [stopSync, store])

  useEffect(() => {
    if (state === 'mounted' && snapshot.id === mountedProject.current) sync.current?.changed('')
  }, [snapshot, state])

  useEffect(() => {
    // Browsers cannot await filesystem reads on unload. Warn only while an
    // observed shell edit is not reconciled; normal saves drain the queue first.
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!sync.current?.pending()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])

  return { state, error, syncError, dependencyRevision, ensureMounted, webcontainerRef }
}
