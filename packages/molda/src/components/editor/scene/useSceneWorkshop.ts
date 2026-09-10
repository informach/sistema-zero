import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import type { MoldaSceneDocument } from '../../../scene/document'
import { indexSceneDocument } from '../../../scene/documentIndex'
import { SceneGraphError, selectSceneSubtrees } from '../../../scene/graph'
import type { ScenePaintTarget } from '../../../scene/imagePaint'
import type { AffineMatrix } from '../../../scene/matrix'
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import { createSceneTransformGesture } from '../../../state/sceneTransformGesture'
import { useSceneAnimationPlayer } from './useSceneAnimationPlayer'
import { useSceneAnimationPoseGesture } from './useSceneAnimationPoseGesture'
import { useSceneComponents } from './useSceneComponents'
import { useSceneFlipbookPlayer } from './useSceneFlipbookPlayer'
import { useScenePaint } from './useScenePaint'
import { useSceneSkinPaint } from './useSceneSkinPaint'

export function useSceneWorkshop(editor: EditorStore<MoldaSceneDocument>) {
  const activeTransform = useRef<'components' | 'nodes' | null>(null)
  const document = useStore(editor, (state) => state.asset)
  const [chosen, setChosen] = useState<readonly string[]>([])
  const [additive, setAdditive] = useState(false)
  const [isolation, setIsolation] = useState<readonly string[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const paint = useScenePaint(editor)
  const skinPaint = useSceneSkinPaint(editor)
  const flipbook = useSceneFlipbookPlayer(editor)
  const animation = useSceneAnimationPlayer(editor)
  const animationPose = useSceneAnimationPoseGesture(editor, animation)
  const closePaint = paint.close
  const gesture = useMemo(
    () =>
      createSceneTransformGesture(editor, (error) =>
        setMessage(
          error instanceof SceneValidationError ? error.message : COPY.scene.commandFailed,
        ),
      ),
    [editor],
  )
  useEffect(() => () => gesture.cancel(), [gesture])
  const index = useMemo(() => indexSceneDocument(document), [document])
  const selected = useMemo(() => chosen.filter((id) => index.scene.nodes.has(id)), [chosen, index])
  const covered = useMemo(
    () => selectSceneSubtrees(index.scene, selected).covered,
    [selected, index],
  )
  const select = useCallback(
    (id: string | null, add: boolean) => {
      skinPaint.cancel()
      animationPose.cancel()
      animation.cancelPreview()
      animation.pause()
      closePaint()
      gesture.cancel()
      if (id === null) {
        setChosen([])
        return
      }
      if (!editor.getState().asset.nodes.some((node) => node.id === id)) return
      setChosen((before) =>
        add || additive
          ? before.includes(id)
            ? before.filter((entry) => entry !== id)
            : [...before, id]
          : [id],
      )
    },
    [editor, additive, gesture, closePaint, animation, animationPose, skinPaint],
  )
  const run = useCallback(
    (
      command: (source: MoldaSceneDocument) => MoldaSceneDocument,
      selection?: 'created' | 'clear',
    ) => {
      skinPaint.cancel()
      animationPose.cancel()
      animation.cancelPreview()
      animation.pause()
      closePaint()
      gesture.cancel()
      const before = editor.getState().asset
      try {
        const next = command(before)
        if (next !== before) editor.getState().commit(next)
        setMessage(null)
        if (selection === 'clear') setChosen([])
        if (selection === 'created') {
          const oldIds = new Set(before.nodes.map((node) => node.id))
          const created = new Set(
            next.nodes.filter((node) => !oldIds.has(node.id)).map((node) => node.id),
          )
          setChosen(
            next.nodes
              .filter(
                (node) =>
                  created.has(node.id) && (node.parentId === null || !created.has(node.parentId)),
              )
              .map((node) => node.id),
          )
        }
        return next
      } catch (error) {
        setMessage(
          error instanceof SceneValidationError
            ? error.message
            : error instanceof SceneGraphError && error.code === 'cycle'
              ? COPY.scene.cycle
              : COPY.scene.commandFailed,
        )
        return null
      }
    },
    [editor, gesture, closePaint, animation, animationPose, skinPaint],
  )
  const selectMany = useCallback(
    (ids: readonly string[], add: boolean) => {
      skinPaint.cancel()
      animationPose.cancel()
      animation.cancelPreview()
      animation.pause()
      closePaint()
      gesture.cancel()
      const alive = new Set(editor.getState().asset.nodes.map((node) => node.id))
      const next = ids.filter((id) => alive.has(id))
      setChosen((before) => [
        ...new Set(add || additive ? [...before.filter((id) => alive.has(id)), ...next] : next),
      ])
    },
    [editor, additive, gesture, closePaint, animation, animationPose, skinPaint],
  )
  const components = useSceneComponents({
    editor,
    index,
    selected,
    covered,
    additive,
    cancel: () => {
      skinPaint.cancel()
      gesture.cancel()
    },
    run,
  })
  return {
    editor,
    paint,
    skinPaint,
    flipbook,
    animation,
    animationPose,
    openPaint: (target: ScenePaintTarget) => {
      skinPaint.cancel()
      animation.pause()
      flipbook.pause()
      components.close()
      gesture.cancel()
      return paint.open(target)
    },
    document,
    index,
    selected,
    covered,
    select: (id: string | null, additive: boolean) => {
      flipbook.setImage(null)
      components.close()
      select(id, additive)
    },
    selectMany: (ids: readonly string[], additive: boolean) => {
      flipbook.setImage(null)
      components.close()
      selectMany(ids, additive)
    },
    run: (command: Parameters<typeof run>[0], selection?: Parameters<typeof run>[1]) => {
      flipbook.pause()
      components.close()
      return run(command, selection)
    },
    components: {
      ...components,
      open: (...args: Parameters<typeof components.open>) => {
        skinPaint.cancel()
        flipbook.setImage(null)
        closePaint()
        components.open(...args)
      },
    },
    additive,
    setAdditive,
    isolation,
    setIsolation,
    message,
    setMessage,
    transform: {
      begin: () => {
        skinPaint.cancel()
        animation.pause()
        flipbook.pause()
        const kind = components.selection ? 'components' : 'nodes'
        const accepted =
          kind === 'components' ? components.transform.begin() : gesture.begin(selected)
        activeTransform.current = accepted ? kind : null
        return accepted
      },
      preview: (delta: AffineMatrix) =>
        activeTransform.current === 'components'
          ? components.transform.preview(delta)
          : activeTransform.current === 'nodes' && gesture.preview(delta),
      end: (commit: boolean) => {
        const kind = activeTransform.current
        activeTransform.current = null
        if (kind === 'components') components.transform.end(commit)
        else if (kind === 'nodes') gesture.end(commit)
      },
    },
    cancelGesture: () => {
      skinPaint.cancel()
      animationPose.cancel()
      animation.cancelPreview()
      animation.pause()
      flipbook.pause()
      paint.cancel()
      components.check.cancel()
      gesture.cancel()
      components.preview.cancel()
      components.transform.cancel()
      activeTransform.current = null
    },
    primary: selected.length === 1 ? index.scene.nodes.get(selected[0] ?? '') : undefined,
  }
}
