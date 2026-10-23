import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import {
  createSceneAnimationPreset,
  type SceneAnimationPresetOptions,
} from '../../../scene/animationPresets'
import { prepareSceneAnimationTarget } from '../../../scene/animationTarget'
import type { MoldaSceneDocument } from '../../../scene/document'
import { keepSceneThumb, sameSceneContent } from '../../../scene/documentContent'
import { requireScene } from '../../../scene/validation'
import type { SceneAnimationSnapshot } from '../../../state/SceneAnimationPlayer'
import { isMoldaDialogOpen } from '../../ui/Dialog'
import type { useSceneWorkshop } from './useSceneWorkshop'

interface Preview {
  document: MoldaSceneDocument
  selectionKey: string
  next: MoldaSceneDocument
  playerSource: NonNullable<SceneAnimationSnapshot['source']>
  ids: readonly string[]
  options: SceneAnimationPresetOptions
}

/** One revision/selection-owned draft; the player previews it without replacing the editor's asset. */
export function useSceneAnimationPreset(workshop: ReturnType<typeof useSceneWorkshop>) {
  const { animation, document: source, editor, selected } = workshop
  const selectionKey = JSON.stringify([selected, workshop.animationTarget])
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
    live.current.setAnimationPreviewDocument(null)
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
        live.current.setAnimationPreviewDocument(null)
      }
    })
    const hidden = () => {
      if (document.hidden) cancel()
    }
    const onEscape = (event: KeyboardEvent) => {
      if (pending.current && event.key === 'Escape' && !isMoldaDialogOpen()) {
        event.preventDefault()
        event.stopPropagation()
        live.current.requestTransition(cancel)
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
      live.current.setAnimationPreviewDocument(null)
      if (owner?.playerSource === animation.getSnapshot().source) animation.cancelPreview()
    }
  }, [animation, cancel])
  const matches = useCallback(
    (owner: Preview) =>
      owner.document === editor.getState().content &&
      owner.selectionKey ===
        JSON.stringify([live.current.selected, live.current.animationTarget]) &&
      owner.playerSource === animation.getSnapshot().source,
    [editor, animation],
  )
  function prepare(options: SceneAnimationPresetOptions) {
    cancel()
    try {
      const current = live.current
      requireScene(
        current.document === editor.getState().content,
        'source',
        COPY.scene.animationChanged,
      )
      const target = prepareSceneAnimationTarget(
        current.document,
        current.selected,
        current.animationTarget,
      )
      const next = createSceneAnimationPreset(target.document, target.ids, options)
      current.setAnimationPreviewDocument(target.document)
      animation.setPreview(target.document, next.animations!.at(-1)!)
      const playerSource = animation.getSnapshot().source
      requireScene(
        playerSource?.preview &&
          playerSource.document === target.document &&
          editor.getState().content === current.document &&
          playerSource.clip.id === next.animations!.at(-1)!.id,
        'source',
        COPY.scene.animationChanged,
      )
      const owner = {
        document: current.document,
        selectionKey: JSON.stringify([current.selected, current.animationTarget]),
        next,
        ids: target.ids,
        options,
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
    live.current.setAnimationPreviewDocument(null)
    const next = live.current.run((source) => {
      requireScene(sameSceneContent(source, owner.document), 'source', COPY.scene.animationChanged)
      return keepSceneThumb(owner.next, source)
    })
    if (!next) {
      animation.cancelPreview()
      return false
    }
    try {
      animation.setClip(editor.getState().content, owner.playerSource.clip.id)
      live.current.selectMany(owner.ids, false)
      const source = animation.getSnapshot().source
      if (
        source?.document === editor.getState().content &&
        source.clip.id === owner.playerSource.clip.id &&
        !source.preview
      )
        animation.seek(time)
    } catch (error) {
      animation.reportError(error)
    }
    return true
  }
  const actions = useRef({ confirm, cancel })
  actions.current = { confirm, cancel }
  const registerContext = workshop.contextTransition.register
  useEffect(
    () =>
      registerContext('animation-preset', () => {
        const owner = pending.current
        if (!owner || !matches(owner)) return null
        return {
          title: 'Este movimento ainda está em prévia',
          applyLabel: 'Guardar este movimento',
          canApply: !animation.getSnapshot().error,
          apply: () => actions.current.confirm(),
          discard: () => actions.current.cancel(),
          pause: () => animation.pause(),
        }
      }),
    [registerContext, animation, matches],
  )
  return {
    active: !!session && matches(session),
    kind: session?.options.kind,
    error,
    canConfirm: !playbackError,
    prepare,
    confirm,
    cancel,
    adjust: (factor: number, property: 'duration' | 'amount') => {
      const owner = pending.current
      if (!owner || !matches(owner)) return
      const maximum = property === 'duration' ? 600 : owner.options.kind === 'sway' ? 90 : 1000
      const minimum = property === 'duration' ? 0.25 : 0
      const sign = property === 'amount' && owner.options.amount < 0 ? -1 : 1
      const value =
        sign * Math.max(minimum, Math.min(maximum, Math.abs(owner.options[property]) * factor))
      prepare({ ...owner.options, [property]: value })
      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) animation.play()
    },
  }
}
