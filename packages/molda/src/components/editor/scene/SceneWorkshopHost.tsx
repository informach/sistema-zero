import type { UseStore } from 'idb-keyval'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { copySceneProject } from '../../../import/sceneProjectFile'
import { createSceneProject, type SceneProjectStart } from '../../../scene/createProject'
import type { MoldaSceneDocument } from '../../../scene/document'
import { openSceneWorkshop } from '../../../state/openSceneWorkshop'
import type { SceneEditorStore } from '../../../state/sceneEditorStore'
import { createScenePersistence } from '../../../state/scenePersistence'
import type { SceneViewportFactory } from '../../../viewport/sceneViewportTypes'
import { Button } from '../../ui/Button'
import type { ResyncToStudio } from '../useStudioResync'
import type { RestoreSceneProject } from './SceneProjectRestore'
import { SceneStart } from './SceneStart'
import { SceneWorkshop } from './SceneWorkshop'

/** Internal host only. Public v1 writer/cloud rollout is deliberately not activated here. */
export function SceneWorkshopHost({
  store,
  initialId = null,
  onRouteChange,
  viewportFactory,
  theme = 'light',
  resyncToStudio,
}: {
  store: UseStore
  initialId?: string | null
  onRouteChange?: (id: string | null) => void
  viewportFactory?: SceneViewportFactory
  theme?: 'light' | 'dark'
  /** Ausente = host interno sem ponte; é o que decide o aviso de oficina em desenvolvimento. */
  resyncToStudio?: ResyncToStudio
}) {
  const scope = useMemo(
    () => ({ store, persistence: createScenePersistence(store), active: false }),
    [store],
  )
  const routeCallback = useRef(onRouteChange)
  useLayoutEffect(() => {
    routeCallback.current = onRouteChange
  }, [onRouteChange])
  useLayoutEffect(() => {
    scope.active = true
    return () => {
      scope.active = false
    }
  }, [scope])
  const [route, setRoute] = useState({ scope, id: initialId })
  const id = route.scope === scope ? route.id : initialId
  type Opened = { scope: typeof scope; id: string; editor: SceneEditorStore; flushOnClose: boolean }
  const [opened, setOpened] = useState<Opened | null>(null)
  const [failure, setFailure] = useState<{ scope: typeof scope; id: string } | null>(null)
  const current = opened?.scope === scope && opened.id === id ? opened : null
  const failed = failure?.scope === scope && failure.id === id
  const root = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    // Only navigation/ready transitions move focus, not edits or list updates.
    const target = id === null || current ? 'h1' : failed ? '[role="alert"]' : null
    if (target) root.current?.querySelector<HTMLElement>(target)?.focus()
  }, [id, current, failed])
  useEffect(() => {
    const abort = new AbortController()
    let owned: Opened | null = null
    setOpened(null)
    setFailure(null)
    if (id === null) return
    void openSceneWorkshop(scope.store, id, { signal: abort.signal }).then(
      (editor) => {
        if (abort.signal.aborted) {
          editor.getState().dispose()
          return
        }
        owned = { scope, id, editor, flushOnClose: true }
        setOpened(owned)
      },
      () => {
        if (!abort.signal.aborted) setFailure({ scope, id })
      },
    )
    return () => {
      abort.abort()
      if (!owned) return
      const state = owned.editor.getState()
      if (owned.flushOnClose) void state.flush().finally(() => state.dispose())
      else state.dispose()
    }
  }, [scope, id])
  const choose = useCallback(
    (next: string | null) => {
      if (!scope.active) return
      setRoute({ scope, id: next })
      routeCallback.current?.(next)
    },
    [scope],
  )
  const saveNew = useCallback(
    async (build: () => MoldaSceneDocument, signal: AbortSignal) => {
      signal.throwIfAborted()
      if (!scope.active) throw new DOMException('Closed workspace', 'AbortError')
      const document = build()
      const result = await scope.persistence.save(document, null)
      if (result.status !== 'saved') throw new Error('Project creation conflicted')
      // A commit cannot be undone by cancelling navigation: the new project remains in the list.
      signal.throwIfAborted()
      if (scope.active) choose(document.id)
    },
    [scope, choose],
  )
  const create = useCallback(
    (input: SceneProjectStart, signal: AbortSignal) =>
      saveNew(() => createSceneProject(input), signal),
    [saveNew],
  )
  const leave = useCallback(() => {
    if (!current || !scope.active) return
    // Exit control either finished the flush or obtained explicit discard consent.
    // In particular, unmount must NOT retry a save the child chose to discard.
    current.flushOnClose = false
    choose(null)
  }, [current, scope, choose])
  const restore: RestoreSceneProject = useCallback(
    (source, name, signal) => saveNew(() => copySceneProject(source, name), signal),
    [saveNew],
  )
  return (
    <div
      ref={root}
      data-molda-theme={theme}
      className="flex min-h-0 flex-1 flex-col bg-mld-bg text-mld-text"
    >
      {/* Sem ponte com o Estúdio, isto é o host interno: o aviso continua verdadeiro.
          Com ela, a oficina é o editor de verdade da criança e o aviso mentiria. */}
      {resyncToStudio ? null : (
        <p className="border-b border-mld-border px-4 py-2 text-sm text-mld-muted">
          {COPY.scene.development}
        </p>
      )}
      {id === null ? (
        <SceneStart
          persistence={scope.persistence}
          onCreate={create}
          onOpen={choose}
          onRestore={restore}
          viewportFactory={viewportFactory}
        />
      ) : current ? (
        <SceneWorkshop
          key={current.id}
          editor={current.editor}
          storage={current.editor.storage}
          viewportFactory={viewportFactory}
          theme={theme}
          onExit={leave}
          {...(resyncToStudio ? { resyncToStudio } : {})}
        />
      ) : failed ? (
        <div className="space-y-4 p-6">
          <p role="alert" tabIndex={-1}>
            {COPY.scene.openError}
          </p>
          <Button onClick={() => choose(null)}>{COPY.scene.exit.open}</Button>
        </div>
      ) : (
        <p role="status" className="p-6">
          {COPY.scene.starting}
        </p>
      )}
    </div>
  )
}
