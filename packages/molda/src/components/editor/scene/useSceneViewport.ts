import { useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { MoldaSceneDocument, Vec2 } from '../../../scene/document'
import type { ScenePaintTarget } from '../../../scene/imagePaint'
import type { SceneComponentSelection } from '../../../scene/meshComponents'
import type { SceneSkinPaintSettings } from '../../../scene/skinPaint'
import { SceneValidationError } from '../../../scene/validation'
import type { SceneAnimationPlayer } from '../../../state/SceneAnimationPlayer'
import type { SceneAnimationPoseGesture } from '../../../state/SceneAnimationPoseGesture'
import type { SceneFlipbookPlayer } from '../../../state/SceneFlipbookPlayer'
import type { SceneSkinPaintSession } from '../../../state/sceneSkinPaintSession'
import type { SceneAreaTool } from '../../../viewport/SceneAreaSelection'
import type { SceneSkinWeightTarget } from '../../../viewport/SceneSkinWeightOverlay'
import type {
  ScenePaintActions,
  ScenePaintMode,
  SceneSelectDetail,
  SceneSkinPaintActions,
  SceneTransformActions,
  SceneTransformTool,
  SceneViewportFactory,
  SceneViewportPort,
} from '../../../viewport/sceneViewportTypes'

/** Espera o desenho assentar antes da foto; o mesmo ritmo do editor antigo. */
const SCENE_THUMB_DELAY_MS = 700

export function useSceneViewport({
  document,
  selection,
  isolation,
  select,
  selectMany,
  factory,
  transform,
  tool,
  areaTool,
  through,
  componentSelection,
  selectComponent,
  selectComponents,
  onInterrupt,
  paint,
  paintTarget,
  flipbook,
  animation,
  animationPose,
  supportGuides = false,
  weightTarget = null,
  skinPaint,
  skinPaintSettings = null,
  onThumb,
  paintMode,
  paintMirror = false,
}: {
  document: MoldaSceneDocument
  selection: readonly string[]
  isolation: readonly string[] | null
  /** Em Pintar, `detail.faceId` diz em que face a peça foi tocada. */
  select(id: string | null, additive: boolean, detail?: SceneSelectDetail): void
  selectMany?(ids: readonly string[], additive: boolean): void
  factory?: SceneViewportFactory
  transform?: SceneTransformActions
  tool: SceneTransformTool
  areaTool: SceneAreaTool
  through: boolean
  componentSelection: SceneComponentSelection | null
  selectComponent?(id: string | null, additive: boolean): void
  selectComponents?(ids: readonly string[], additive: boolean): void
  onInterrupt?(): void
  paint?: ScenePaintActions
  paintTarget: ScenePaintTarget | null
  flipbook: SceneFlipbookPlayer
  animation?: SceneAnimationPlayer
  animationPose?: SceneAnimationPoseGesture
  supportGuides?: boolean
  weightTarget?: SceneSkinWeightTarget | null
  skinPaint?: SceneSkinPaintSession
  skinPaintSettings?: SceneSkinPaintSettings | null
  /** Foto da criação para a galeria. Chamado fora de gesto, sem histórico. */
  onThumb?(thumb: string | undefined): void
  /** A aba Pintar. Ausente: o palco deduz a pintura do alvo, como antes. */
  paintMode?: ScenePaintMode
  /** Espelho de pintura, ligado pela criança na caixa de ferramentas. */
  paintMirror?: boolean
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const onSelect = useRef(select)
  onSelect.current = select
  const onSelectMany = useRef(selectMany)
  onSelectMany.current = selectMany
  const onSelectComponent = useRef(selectComponent)
  onSelectComponent.current = selectComponent
  const onSelectComponents = useRef(selectComponents)
  onSelectComponents.current = selectComponents
  const onTransform = useRef(transform)
  const onPaint = useRef(paint)
  const onAnimation = useRef(animation)
  onAnimation.current = animation
  onPaint.current = paint
  const interrupt = useRef(onInterrupt)
  interrupt.current = onInterrupt
  onTransform.current = transform
  const [viewport, setViewport] = useState<SceneViewportPort | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [lost, setLost] = useState(false)
  const [issueCount, setIssueCount] = useState(0)
  const [area, setArea] = useState<readonly Vec2[]>([])
  const displayed = useRef<MoldaSceneDocument | null>(null)
  const skinActions = useRef<SceneSkinPaintActions | null>(null)
  useEffect(() => {
    let cancelled = false
    let contextUnavailable = false
    let instance: SceneViewportPort | null = null
    let activeTransform: SceneTransformActions | null = null
    let activeSkinPaint: SceneSkinPaintActions | null = null
    const endSkinPaint = (commit: boolean) => {
      const actions = activeSkinPaint
      activeSkinPaint = null
      actions?.end(!cancelled && commit)
    }
    const endTransform = (commit: boolean) => {
      const actions = activeTransform
      activeTransform = null
      actions?.end(!cancelled && commit)
    }
    const target = canvas.current
    if (!target) return
    setError(null)
    setLost(false)
    const reducedMotion =
      target.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
      false
    const open = async () => {
      let create: SceneViewportFactory
      if (factory) create = factory
      else {
        const { SceneViewport } = await import('../../../viewport/SceneViewport')
        create = (canvas, callbacks, motion) => new SceneViewport(canvas, callbacks, motion)
      }
      if (cancelled) return
      const callbacks = {
        select: (id: string | null, additive: boolean, detail?: SceneSelectDetail) => {
          if (cancelled) return
          if (detail) onSelect.current(id, additive, detail)
          else onSelect.current(id, additive)
        },
        selectMany: (ids: readonly string[], additive: boolean) => {
          if (!cancelled) onSelectMany.current?.(ids, additive)
        },
        selectComponent: (id: string | null, additive: boolean) => {
          if (!cancelled) onSelectComponent.current?.(id, additive)
        },
        selectComponents: (ids: readonly string[], additive: boolean) => {
          if (!cancelled) onSelectComponents.current?.(ids, additive)
        },
        areaChanged: (points: readonly Vec2[]) => {
          if (!cancelled) setArea(points)
        },
        contextLost: (value: boolean) => {
          if (!cancelled) {
            contextUnavailable = value
            if (value) endSkinPaint(false)
            if (value) onAnimation.current?.pause()
            if (value) interrupt.current?.()
            setLost(value)
          }
        },
        transform: {
          begin: () => {
            if (cancelled) return false
            endTransform(false)
            const actions = onTransform.current
            if (!actions) return false
            activeTransform = actions
            const accepted = actions.begin()
            if (!accepted && activeTransform === actions) endTransform(false)
            return accepted && !cancelled && activeTransform === actions
          },
          preview: (delta: Parameters<SceneTransformActions['preview']>[0]) => {
            const actions = activeTransform
            if (cancelled || !actions) return false
            const accepted = actions.preview(delta)
            return accepted && !cancelled && activeTransform === actions
          },
          end: endTransform,
        },
        paint: {
          begin: (sample: Parameters<ScenePaintActions['begin']>[0]) =>
            !cancelled && (onPaint.current?.begin(sample) ?? false),
          move: (sample: Parameters<ScenePaintActions['move']>[0]) => {
            if (!cancelled) onPaint.current?.move(sample)
          },
          end: (commit: boolean) => onPaint.current?.end(commit),
        },
        skinPaint: {
          begin: (sample: Parameters<SceneSkinPaintActions['begin']>[0]) => {
            if (cancelled || contextUnavailable || target.ownerDocument.hidden) return false
            endSkinPaint(false)
            const actions = skinActions.current
            if (!actions) return false
            activeSkinPaint = actions
            const accepted = actions.begin(sample)
            if (!accepted && activeSkinPaint === actions) endSkinPaint(false)
            return accepted && !cancelled && activeSkinPaint === actions
          },
          move: (sample: Parameters<SceneSkinPaintActions['move']>[0]) => {
            if (!cancelled) activeSkinPaint?.move(sample)
          },
          end: endSkinPaint,
        },
      }
      instance = create(target, callbacks, reducedMotion)
      setViewport(instance)
    }
    void open().catch(() => {
      if (!cancelled) setError(COPY.scene.failed3d)
    })
    return () => {
      cancelled = true
      onAnimation.current?.pause()
      endTransform(false)
      endSkinPaint(false)
      instance?.dispose()
      setViewport(null)
    }
  }, [factory])
  useEffect(() => {
    if (!viewport || lost) return
    try {
      setIssueCount(viewport.setDocument(document).length)
      displayed.current = document
      const { source, step } = flipbook.getSnapshot()
      if (
        source &&
        document.images.find((i) => i.id === source.imageId)?.flipbook === source.flipbook
      )
        viewport.setImageFrame(source.imageId, source.flipbook.frames[step]!)
      setError(null)
    } catch (error) {
      setError(error instanceof SceneValidationError ? error.message : COPY.scene.failed3d)
    }
  }, [document, viewport, flipbook, lost])
  const takeThumb = useRef(onThumb)
  takeThumb.current = onThumb
  useEffect(() => {
    // A foto é derivada: sai depois que o desenho assenta e nunca durante um arrasto.
    if (!viewport || lost || !takeThumb.current) return
    const timer = setTimeout(() => {
      // Fotografa só o que o palco realmente desenhou: uma revisão que falhou ao
      // ser aplicada não vira retrato da criação guardada.
      if (displayed.current !== document) return
      const photo = viewport.renderThumb()
      // ⚠️ `null` é RECUSA de fotografar (isolamento ligado, contexto perdido, palco
      // descartado), não "esta criação não tem foto". Convertê-la em valor APAGAVA o
      // retrato que já existia: bastava isolar uma peça e mexer nela para a criança
      // perder a foto do cartão. O contrato de `renderThumb` sempre disse o contrário.
      if (photo) takeThumb.current?.(photo)
    }, SCENE_THUMB_DELAY_MS)
    return () => clearTimeout(timer)
  }, [document, viewport, lost])
  useEffect(() => {
    if (!viewport) return
    try {
      viewport.setSelection(selection)
      viewport.setIsolation(isolation)
      viewport.setComponentSelection(componentSelection)
      viewport.setSupportGuides(supportGuides)
      viewport.setSkinWeightTarget(weightTarget)
      setSelectionError(null)
    } catch (error) {
      setSelectionError(error instanceof SceneValidationError ? error.message : COPY.scene.failed3d)
    }
  }, [viewport, selection, isolation, componentSelection, supportGuides, weightTarget])
  useEffect(() => {
    viewport?.setTransformTool(tool)
  }, [viewport, tool])
  useEffect(() => {
    viewport?.setAreaTool(areaTool, through)
  }, [viewport, areaTool, through])
  useEffect(() => {
    if (paintMode) viewport?.setPaintMode?.(paintMode)
  }, [viewport, paintMode])
  useEffect(() => {
    viewport?.setPaintMirror?.(paintMirror)
  }, [viewport, paintMirror])
  useEffect(() => {
    viewport?.setPaintTarget(paintTarget)
  }, [viewport, paintTarget])
  const paintSkinId = weightTarget
    ? document.skins?.find((skin) => skin.nodeId === weightTarget.nodeId)?.id
    : undefined
  const paintJointId = weightTarget?.jointId
  const paintNodeId = weightTarget?.nodeId
  useEffect(() => {
    if (
      !viewport ||
      lost ||
      !skinPaint ||
      !skinPaintSettings ||
      !paintSkinId ||
      !paintJointId ||
      componentSelection?.nodeId !== paintNodeId
    )
      return
    const attachment = skinPaint.connect(
      {
        skinId: paintSkinId,
        jointId: paintJointId,
        settings: skinPaintSettings,
        displayed: () => displayed.current,
      },
      (preview) => viewport.setSkinPaintPreview(preview),
    )
    skinActions.current = attachment.actions
    viewport.setSkinPaintEnabled(true, skinPaintSettings.radius)
    return () => {
      if (skinActions.current === attachment.actions) skinActions.current = null
      attachment.dispose()
      viewport.setSkinPaintEnabled(false)
      viewport.setSkinPaintPreview(null)
    }
  }, [
    viewport,
    lost,
    skinPaint,
    skinPaintSettings,
    paintSkinId,
    paintNodeId,
    paintJointId,
    componentSelection,
  ])
  useEffect(() => {
    if (!viewport) return
    let previous: string | null = null
    const update = () => {
      const { source, step } = flipbook.getSnapshot()
      if (previous && previous !== source?.imageId) viewport.setImageFrame(previous, null)
      if (
        source &&
        displayed.current?.images.find((i) => i.id === source.imageId)?.flipbook === source.flipbook
      )
        viewport.setImageFrame(source.imageId, source.flipbook.frames[step]!)
      previous = source?.imageId ?? null
    }
    update()
    const unsubscribe = flipbook.subscribe(update)
    return () => {
      unsubscribe()
      if (previous) viewport.setImageFrame(previous, null)
    }
  }, [viewport, flipbook])
  useEffect(() => {
    if (!viewport || !animation || lost) return
    let failed = false
    const update = () => {
      const snapshot = animation.getSnapshot()
      const draft = animationPose?.getSnapshot().pose
      const editing =
        !!animationPose &&
        snapshot.source?.document === document &&
        !snapshot.source.preview &&
        !snapshot.playing &&
        !snapshot.error
      viewport.setAnimationEditing(editing)
      const pose =
        editing &&
        draft?.source === document &&
        draft.clipId === snapshot.source?.clip.id &&
        draft.time === snapshot.time
          ? draft
          : snapshot.pose
      if (snapshot.error || displayed.current !== document || (pose && pose.source !== document))
        return
      try {
        viewport.setPose(pose)
        if (failed) {
          setError(null)
          failed = false
        }
      } catch (error) {
        failed = true
        setError(error instanceof SceneValidationError ? error.message : COPY.scene.failed3d)
        if (draft && pose === draft) animationPose?.reportError(error)
        else animation.reportError(error)
      }
    }
    update()
    const unsubscribe = animation.subscribe(update)
    const unsubscribePose = animationPose?.subscribe(update)
    return () => {
      unsubscribe()
      unsubscribePose?.()
      animationPose?.cancel()
      animation.pause()
      viewport.setAnimationEditing(false)
      viewport.setPose(null)
    }
  }, [viewport, animation, animationPose, document, lost])
  return {
    canvas,
    viewport,
    error: error ?? selectionError,
    lost,
    issueCount,
    area,
  }
}
