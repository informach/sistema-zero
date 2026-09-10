import { useCallback, useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { MoldaSceneDocument } from '../../../scene/document'
import {
  applySceneImageAtlas,
  prepareSceneImageAtlas,
  type SceneImageAtlasPlan,
} from '../../../scene/imageAtlasCommands'
import type { SceneRgbaRaster } from '../../../scene/imageImport'
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import { bakeAtlasInWorker } from '../../../workers/sceneAtlas'

interface AtlasSession {
  controller: AbortController
  revision: number
  plan: SceneImageAtlasPlan
  raster?: SceneRgbaRaster
}

/** Preview is session-only; store subscription invalidates ownership before any late result/commit. */
export function useSceneImageAtlas(
  editor: EditorStore<MoldaSceneDocument>,
  nodeId: string,
  before: () => void,
) {
  const pending = useRef<AtlasSession | null>(null)
  const [session, setSession] = useState<AtlasSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancel = useCallback(() => {
    const owner = pending.current
    pending.current = null
    owner?.controller.abort()
    setSession(null)
    setError(null)
  }, [])
  useEffect(() => {
    const unsubscribe = editor.subscribe((state) => {
      if (pending.current && state.contentRevision !== pending.current.revision) cancel()
    })
    const hidden = () => {
      if (document.hidden) cancel()
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && pending.current) {
        event.preventDefault()
        cancel()
      }
    }
    window.addEventListener('blur', cancel)
    window.addEventListener('keydown', onEscape, true)
    document.addEventListener('visibilitychange', hidden)
    document.addEventListener('webglcontextlost', cancel, true)
    return () => {
      unsubscribe()
      window.removeEventListener('blur', cancel)
      window.removeEventListener('keydown', onEscape, true)
      document.removeEventListener('visibilitychange', hidden)
      document.removeEventListener('webglcontextlost', cancel, true)
      const owner = pending.current
      pending.current = null
      owner?.controller.abort()
    }
  }, [editor, cancel])
  useEffect(() => {
    if (pending.current && pending.current.plan.node.id !== nodeId) cancel()
  }, [nodeId, cancel])
  async function prepare() {
    cancel()
    before()
    let owner: AtlasSession | null = null
    try {
      const state = editor.getState()
      const plan = prepareSceneImageAtlas(state.asset, nodeId)
      owner = { controller: new AbortController(), revision: state.contentRevision, plan }
      pending.current = owner
      setSession(owner)
      const raster = await bakeAtlasInWorker(
        {
          documentId: plan.document.id,
          revision: owner.revision,
          images: plan.images,
          palette: plan.palette,
          tiles: plan.tiles,
        },
        owner.controller.signal,
      )
      if (pending.current !== owner) return
      const ready = { ...owner, raster }
      pending.current = ready
      setSession(ready)
    } catch (error) {
      if (owner && pending.current !== owner) return
      pending.current = null
      setSession(null)
      setError(error instanceof SceneValidationError ? error.message : COPY.scene.atlasFailed)
    }
  }
  function confirm() {
    const owner = pending.current
    if (!owner?.raster) return
    const state = editor.getState()
    cancel()
    if (state.contentRevision !== owner.revision || owner.plan.node.id !== nodeId) return
    try {
      state.commit(applySceneImageAtlas(state.asset, owner.plan, owner.raster))
    } catch (error) {
      setError(error instanceof SceneValidationError ? error.message : COPY.scene.atlasFailed)
    }
  }
  return { session, busy: session !== null && !session.raster, error, prepare, confirm, cancel }
}
