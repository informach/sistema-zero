import { useCallback, useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneMeshGeometry } from '../../../scene/document'
import { SceneValidationError } from '../../../scene/validation'
import { autoUvInWorker } from '../../../workers/sceneUv'
import type { SceneUvRequest } from '../../../workers/sceneUvProtocol'

interface Owner {
  mesh: SceneMeshGeometry
  sourceKey: string
  selectionKey: string
  controller: AbortController
  result?: SceneMeshGeometry
}
export function useSceneUvPreview(
  mesh: SceneMeshGeometry,
  sourceKey: string,
  ids: readonly string[],
  onApply: (mesh: SceneMeshGeometry) => void,
  disabled: boolean,
) {
  const selectionKey = JSON.stringify(ids)
  const live = useRef({ mesh, sourceKey, selectionKey, onApply, disabled })
  live.current = { mesh, sourceKey, selectionKey, onApply, disabled }
  const pending = useRef<Owner | null>(null)
  const [session, setSession] = useState<Owner | null>(null)
  const [error, setError] = useState<{
    sourceKey: string
    selectionKey: string
    message: string
  } | null>(null)
  const cancel = useCallback(() => {
    const owner = pending.current
    pending.current = null
    owner?.controller.abort()
    setSession(null)
    setError(null)
  }, [])
  const matches = (owner: Owner) =>
    !live.current.disabled &&
    owner.mesh === live.current.mesh &&
    owner.sourceKey === live.current.sourceKey &&
    owner.selectionKey === live.current.selectionKey
  useEffect(() => {
    if (
      pending.current &&
      (pending.current.mesh !== mesh ||
        pending.current.sourceKey !== sourceKey ||
        pending.current.selectionKey !== selectionKey)
    )
      cancel()
  }, [mesh, sourceKey, selectionKey, cancel])
  useEffect(() => {
    if (disabled) cancel()
  }, [disabled, cancel])
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) cancel()
    }
    const onEscape = (event: KeyboardEvent) => {
      if (pending.current && event.key === 'Escape') {
        event.preventDefault()
        cancel()
      }
    }
    window.addEventListener('blur', cancel)
    window.addEventListener('keydown', onEscape, true)
    document.addEventListener('visibilitychange', hidden)
    document.addEventListener('webglcontextlost', cancel, true)
    return () => {
      window.removeEventListener('blur', cancel)
      window.removeEventListener('keydown', onEscape, true)
      document.removeEventListener('visibilitychange', hidden)
      document.removeEventListener('webglcontextlost', cancel, true)
      const owner = pending.current
      pending.current = null
      owner?.controller.abort()
    }
  }, [cancel])
  async function prepare(padding: number, unfold?: SceneUvRequest['unfold']) {
    if (disabled) return
    cancel()
    const owner: Owner = { mesh, sourceKey, selectionKey, controller: new AbortController() }
    pending.current = owner
    setSession(owner)
    try {
      const result = await autoUvInWorker(
        {
          mesh,
          sourceKey,
          faceIds: [...ids],
          padding,
          ...(unfold === undefined ? {} : { unfold: { ...unfold, cuts: [...unfold.cuts] } }),
        },
        owner.controller.signal,
      )
      if (pending.current !== owner || !matches(owner)) return
      const ready = { ...owner, result }
      pending.current = ready
      setSession(ready)
    } catch (error) {
      if (pending.current !== owner || !matches(owner)) return
      pending.current = null
      setSession(null)
      setError({
        sourceKey,
        selectionKey,
        message: error instanceof SceneValidationError ? error.message : COPY.scene.uvAutoFailed,
      })
    }
  }
  function confirm() {
    const owner = pending.current
    if (!owner?.result || !matches(owner)) {
      cancel()
      return
    }
    const apply = live.current.onApply
    cancel()
    apply(owner.result)
  }
  return {
    result: session && matches(session) ? session.result : undefined,
    busy: session !== null && !session.result && matches(session),
    error:
      error?.sourceKey === sourceKey && error.selectionKey === selectionKey ? error.message : null,
    prepare,
    confirm,
    cancel,
  }
}
