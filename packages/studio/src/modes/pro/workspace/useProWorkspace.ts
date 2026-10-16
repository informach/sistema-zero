import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ProjectTree } from '../../../core/proProject'
import { StudioStoresContext } from '../../../state/storesContext'
import {
  initialWorkspace,
  type ProWorkspacePreferences,
  parseWorkspace,
  reconcileWorkspace,
} from './model'

/** The mode is keyed by project. Async restoration cannot replace the learner's first action. */
export function useProWorkspace(projectId: string | undefined, tree: ProjectTree) {
  const adapter = useContext(StudioStoresContext)?.workspacePreferences
  const [state, setState] = useState(() => initialWorkspace(tree))
  const currentTree = useRef(tree)
  currentTree.current = tree
  const touched = useRef(false)
  const [loaded, setLoaded] = useState(!adapter)
  const [error, setError] = useState<string | null>(null)
  const change = useCallback(
    (update: (state: ProWorkspacePreferences) => ProWorkspacePreferences) => {
      touched.current = true
      setState(update)
    },
    [],
  )
  useEffect(() => {
    if (!adapter || !projectId) return
    let active = true
    void adapter
      .load(projectId)
      .then((stored) => {
        if (!active || touched.current) return
        const restored = parseWorkspace(stored, currentTree.current)
        if (restored) setState(restored)
        else if (stored !== undefined && stored !== null)
          setError(
            'Não consegui restaurar a organização da tela. Seus arquivos continuam disponíveis.',
          )
      })
      .catch(() => {
        if (active)
          setError(
            'Não consegui restaurar a organização da tela. Seus arquivos continuam disponíveis.',
          )
      })
      .finally(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [adapter, projectId])
  useEffect(() => {
    setState((previous) => reconcileWorkspace(previous, tree))
  }, [tree])
  const pendingWrite = useRef<null | { save: () => Promise<void> }>(null)
  const writing = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (!loaded || !adapter || !projectId) return
    pendingWrite.current = { save: () => adapter.save(projectId, state) }
    if (writing.current) return
    writing.current = true
    void (async () => {
      try {
        while (pendingWrite.current) {
          const next = pendingWrite.current
          pendingWrite.current = null
          try {
            await next.save()
          } catch {
            if (mounted.current)
              setError(
                'Não consegui guardar a organização da tela. O salvamento do jogo é separado.',
              )
          }
        }
      } finally {
        writing.current = false
      }
    })()
  }, [adapter, projectId, loaded, state])
  return { state, change, error, dismissError: () => setError(null) }
}
