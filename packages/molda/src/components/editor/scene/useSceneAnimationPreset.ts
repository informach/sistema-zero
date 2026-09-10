import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import {
  createSceneAnimationPreset,
  type SceneAnimationPresetOptions,
} from '../../../scene/animationPresets'
import type { MoldaSceneDocument } from '../../../scene/document'
import { requireScene } from '../../../scene/validation'
import type { SceneAnimationSnapshot } from '../../../state/SceneAnimationPlayer'
import type { useSceneWorkshop } from './useSceneWorkshop'

interface Preview {
  document: MoldaSceneDocument
  selectionKey: string
  next: MoldaSceneDocument
  playerSource: NonNullable<SceneAnimationSnapshot['source']>
}

/** One revision/selection-owned draft; the player previews it without replacing the editor's asset. */
export function useSceneAnimationPreset(workshop: ReturnType<typeof useSceneWorkshop>) {
  const { animation, document: source, editor, selected } = workshop
  const selectionKey = JSON.stringify(selected)
  const live = useRef(workshop)
  live.current = workshop
  const pending = useRef<Preview | null>(null)
  const [session, setSession] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const playbackError = useSyncExternalStore(
    animation.subscribe,
    () => animation.getSnapshot().error,
    () => null,
  )
  const cancel = useCallback(() => {
    const owner = pending.current
    pending.current = null
    setSession(null)
    setError(null)
    if (owner?.playerSource === animation.getSnapshot().source) animation.cancelPreview()
  }, [animation])
  useEffect(() => {
    if (
      pending.current &&
      (pending.current.document !== source || pending.current.selectionKey !== selectionKey)
    )
      cancel()
  }, [source, selectionKey, cancel])
  useEffect(() => {
    const off = animation.subscribe(() => {
      if (pending.current && pending.current.playerSource !== animation.getSnapshot().source) {
        pending.current = null
        setSession(null)
      }
    })
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
      off()
      window.removeEventListener('blur', cancel)
      window.removeEventListener('keydown', onEscape, true)
      document.removeEventListener('visibilitychange', hidden)
      document.removeEventListener('webglcontextlost', cancel, true)
      const owner = pending.current
      pending.current = null
      if (owner?.playerSource === animation.getSnapshot().source) animation.cancelPreview()
    }
  }, [animation, cancel])
  const matches = (owner: Preview) =>
    owner.document === editor.getState().asset &&
    owner.selectionKey === JSON.stringify(live.current.selected) &&
    owner.playerSource === animation.getSnapshot().source
  function prepare(options: SceneAnimationPresetOptions) {
    cancel()
    try {
      const current = live.current
      requireScene(
        current.document === editor.getState().asset,
        'source',
        COPY.scene.animationChanged,
      )
      const next = createSceneAnimationPreset(current.document, current.selected, options)
      animation.setPreview(current.document, next.animations!.at(-1)!)
      const playerSource = animation.getSnapshot().source
      requireScene(
        playerSource?.preview &&
          playerSource.document === current.document &&
          editor.getState().asset === current.document &&
          playerSource.clip.id === next.animations!.at(-1)!.id,
        'source',
        COPY.scene.animationChanged,
      )
      const owner = {
        document: current.document,
        selectionKey: JSON.stringify(current.selected),
        next,
        playerSource,
      }
      pending.current = owner
      setSession(owner)
    } catch (error) {
      setError(error instanceof Error ? error.message : COPY.scene.commandFailed)
    }
  }
  function confirm() {
    const owner = pending.current
    if (!owner || !matches(owner) || animation.getSnapshot().error) {
      cancel()
      return false
    }
    animation.pause()
    if (animation.getSnapshot().error) return false
    const time = animation.getSnapshot().time
    pending.current = null
    setSession(null)
    const next = live.current.run((source) => {
      requireScene(source === owner.document, 'source', COPY.scene.animationChanged)
      return owner.next
    })
    if (!next) {
      animation.cancelPreview()
      return false
    }
    try {
      animation.setClip(editor.getState().asset, owner.playerSource.clip.id)
      const source = animation.getSnapshot().source
      if (
        source?.document === editor.getState().asset &&
        source.clip.id === owner.playerSource.clip.id &&
        !source.preview
      )
        animation.seek(time)
    } catch (error) {
      animation.reportError(error)
    }
    return true
  }
  return {
    active: !!session && matches(session),
    error,
    canConfirm: !playbackError,
    prepare,
    confirm,
    cancel,
  }
}
