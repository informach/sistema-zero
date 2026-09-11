import { type ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { SCENE_SHELL_COPY } from '../../../core/sceneShellCopy'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { ScenePaintTarget } from '../../../scene/imagePaint'
import type { SceneComponentSelection } from '../../../scene/meshComponents'
import type { SceneSkinPaintSettings } from '../../../scene/skinPaint'
import type { SceneAnimationPlayer } from '../../../state/SceneAnimationPlayer'
import type { SceneAnimationPoseGesture } from '../../../state/SceneAnimationPoseGesture'
import type { SceneFlipbookPlayer } from '../../../state/SceneFlipbookPlayer'
import type { SceneSkinPaintSession } from '../../../state/sceneSkinPaintSession'
import type { SceneSkinWeightTarget } from '../../../viewport/SceneSkinWeightOverlay'
import type {
  ScenePaintActions,
  SceneTransformActions,
  SceneTransformTool,
  SceneViewportFactory,
  SceneViewportPort,
} from '../../../viewport/sceneViewportTypes'
import { CAMERA_VIEWS, type CameraView } from '../../../viewport/types'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { isMoldaDialogOpen } from '../../ui/Dialog'
import { isTypingTarget } from '../../ui/interaction'
import { ReferenceImageGuide } from '../model/ReferenceImageGuide'
import { SceneAnimationPoseControls } from './SceneAnimationPoseControls'
import { SceneFirstSteps } from './SceneFirstSteps'
import { type SceneSkinBrushMode, SceneSkinPaintControls } from './SceneSkinPaintControls'
import { SceneSkinWeightMapControls } from './SceneSkinWeightMapControls'
import { useSceneViewport } from './useSceneViewport'

interface Props {
  document: MoldaSceneDocument
  selection: readonly string[]
  isolation: readonly string[] | null
  /** Em Pintar, o toque numa peça traz a face: `detail.faceId`. */
  onSelect(id: string | null, additive: boolean, detail?: { faceId?: string }): void
  onSelectMany?(ids: readonly string[], additive: boolean): void
  factory?: SceneViewportFactory
  transform?: SceneTransformActions
  transformTools?: readonly Exclude<SceneTransformTool, 'select'>[]
  componentSelection?: SceneComponentSelection | null
  facePreviewOpen?: boolean
  onSelectComponent?(id: string | null, additive: boolean): void
  onSelectComponents?(ids: readonly string[], additive: boolean): void
  onEndFaces?(): void
  onInterrupt?(): void
  paintTarget?: ScenePaintTarget | null
  paint?: ScenePaintActions
  flipbook: SceneFlipbookPlayer
  animation?: SceneAnimationPlayer
  animationPose?: SceneAnimationPoseGesture
  mode?: 'model' | 'paint' | 'animation'
  /** Espelho de pintura ligado na caixa de ferramentas da aba Pintar. */
  paintMirror?: boolean
  /** O que cobre o palco por um tempo, como a face de perto da aba Pintar. */
  overlay?: ReactNode
  onEndPaint?(): void
  skinPaint?: SceneSkinPaintSession
  /** Foto da criação para a galeria; o palco decide quando ela vale. */
  onThumb?(thumb: string | undefined): void
  onViewport?(viewport: SceneViewportPort | null): void
}

const inactiveSubscription = () => () => {}

export function SceneCanvas(props: Props) {
  const [attempt, setAttempt] = useState(0)
  return (
    <SceneCanvasAttempt key={attempt} {...props} onRetry={() => setAttempt((value) => value + 1)} />
  )
}

function SceneCanvasAttempt({
  document,
  selection,
  isolation,
  onSelect,
  onSelectMany,
  factory,
  onRetry,
  transform,
  transformTools = ['move', 'rotate', 'scale'],
  componentSelection = null,
  facePreviewOpen = false,
  onSelectComponent,
  onSelectComponents,
  onEndFaces,
  onInterrupt,
  paint,
  flipbook,
  animation,
  animationPose,
  mode = 'model',
  paintTarget = null,
  paintMirror = false,
  overlay = null,
  onEndPaint,
  skinPaint,
  onThumb,
  onViewport,
}: Props & { onRetry(): void }) {
  const [tool, setTool] = useState<SceneTransformTool | 'box' | 'lasso'>('select')
  const [through, setThrough] = useState(false)
  const [look, setLook] = useState(false)
  const [supportGuides, setSupportGuides] = useState(false)
  const [brushMode, setBrushMode] = useState<SceneSkinBrushMode>('off')
  const [brushRadius, setBrushRadius] = useState('1')
  const [brushStrength, setBrushStrength] = useState(25)
  const [weightFocus, setWeightFocus] = useState<
    (SceneSkinWeightTarget & { documentId: string }) | null
  >(null)
  const componentNodeId = componentSelection?.nodeId
  const weightSkin = useMemo(
    () =>
      componentNodeId ? document.skins?.find((skin) => skin.nodeId === componentNodeId) : undefined,
    [document.skins, componentNodeId],
  )
  const weightTarget = useMemo(
    () =>
      mode === 'model' &&
      !paintTarget &&
      weightFocus?.documentId === document.id &&
      weightSkin?.nodeId === weightFocus?.nodeId &&
      weightSkin?.joints.some((joint) => joint.nodeId === weightFocus?.jointId)
        ? { nodeId: weightFocus.nodeId, jointId: weightFocus.jointId }
        : null,
    [mode, paintTarget, weightFocus, weightSkin, document.id],
  )
  useEffect(() => {
    if (weightFocus && !weightTarget) setWeightFocus(null)
    if (!weightTarget) setBrushMode('off')
  }, [weightFocus, weightTarget])
  const hasWeightTarget = weightTarget !== null
  const skinPaintSettings = useMemo<SceneSkinPaintSettings | null>(() => {
    const radius = Number(brushRadius)
    return skinPaint &&
      hasWeightTarget &&
      !facePreviewOpen &&
      brushMode !== 'off' &&
      Number.isFinite(radius) &&
      radius > 0 &&
      Number.isFinite(brushStrength)
      ? { mode: brushMode, radius, strength: brushStrength / 100 }
      : null
  }, [skinPaint, hasWeightTarget, facePreviewOpen, brushMode, brushRadius, brushStrength])
  const canAnimate = useSyncExternalStore(
    animation?.subscribe ?? inactiveSubscription,
    () => {
      const snapshot = animation?.getSnapshot()
      return (
        mode === 'animation' &&
        !!animationPose &&
        snapshot?.source?.document === document &&
        !snapshot.source.preview &&
        !snapshot.playing &&
        !snapshot.error
      )
    },
    () => false,
  )
  const assisting = useSyncExternalStore(
    animationPose?.subscribe ?? inactiveSubscription,
    () => canAnimate && !!animationPose?.getSnapshot().pose?.twoBoneGuide,
    () => false,
  )
  const reviewingSet = useSyncExternalStore(
    animationPose?.subscribe ?? inactiveSubscription,
    () => canAnimate && animationPose?.getSnapshot().kind === 'pose-set',
    () => false,
  )
  // O portão: Mover, Girar e Mudar tamanho são `model.pieces` no Modelar e as alças de pose do
  // Animar (`animate.create`); a caixa e o laço, `model.area-select`. Uma ferramenta guardada
  // de outra aba nunca acende a alça numa família trancada (o estado não vaza).
  const { can } = useMoldaToolAccess()
  const allowedTool = (name: SceneTransformTool | 'box' | 'lasso') =>
    name === 'select' ||
    (name === 'box' || name === 'lasso'
      ? can('model.area-select')
      : can(mode === 'animation' ? 'animate.create' : 'model.pieces'))
  const activeTool =
    mode === 'paint' ||
    !allowedTool(tool) ||
    reviewingSet ||
    (mode === 'animation' && (!canAnimate || tool === 'box' || tool === 'lasso')) ||
    facePreviewOpen ||
    skinPaintSettings ||
    paintTarget
      ? 'select'
      : (tool === 'move' || tool === 'rotate' || tool === 'scale') && !transformTools.includes(tool)
        ? (transformTools[0] ?? 'select')
        : assisting && (tool === 'rotate' || tool === 'scale')
          ? 'move'
          : tool
  const areaTool = activeTool === 'box' || activeTool === 'lasso' ? activeTool : 'point'
  const view = useSceneViewport({
    document,
    selection,
    isolation,
    select: onSelect,
    selectMany: onSelectMany,
    factory,
    transform,
    tool: activeTool === 'box' || activeTool === 'lasso' ? 'select' : activeTool,
    areaTool,
    through,
    componentSelection,
    selectComponent: onSelectComponent,
    selectComponents: onSelectComponents,
    onInterrupt,
    paint,
    flipbook,
    animation,
    animationPose: mode === 'animation' ? animationPose : undefined,
    paintTarget: look ? null : paintTarget,
    paintMode: mode === 'paint' ? (look ? 'look' : 'paint') : 'off',
    paintMirror: mode === 'paint' && paintMirror,
    supportGuides: supportGuides && mode !== 'paint' && !paintTarget && !componentSelection,
    weightTarget,
    skinPaint,
    skinPaintSettings,
    onThumb,
  })
  useEffect(() => {
    onViewport?.(view.viewport)
    return () => onViewport?.(null)
  }, [view.viewport, onViewport])
  const cancelPaint = () => {
    skinPaint?.cancel()
    view.viewport?.cancelGesture()
  }
  const [gridVisible, setGridVisible] = useState(true)
  const [movementStep, setMovementStep] = useState<number | null>(null)
  const [camera, setCamera] = useState<CameraView>('free')
  const copy = COPY.scene
  useEffect(() => {
    view.viewport?.setGridVisible?.(gridVisible)
    view.viewport?.setMovementStep?.(movementStep)
  }, [view.viewport, gridVisible, movementStep])
  return (
    <section
      aria-label={componentSelection ? copy.componentViewport : copy.viewport}
      className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-mld-bg"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return
        // O Esc de um diálogo aberto por cima do palco (a "Imagem de apoio") é do diálogo, e o de
        // um campo (o "Passo do movimento") é do campo: soltar a peça atrás deles é surpresa.
        if (isMoldaDialogOpen() || isTypingTarget(event.target)) return
        let handled = false
        if (mode === 'animation') {
          animation?.pause()
          animationPose?.cancel()
          handled = true
        }
        cancelPaint()
        if (brushMode !== 'off') setBrushMode('off')
        else if (mode === 'paint' || paintTarget) onEndPaint?.()
        else if (componentSelection) onEndFaces?.()
        else if (!handled) return
        event.preventDefault()
      }}
    >
      {/*
       * Uma PILHA flutuante no canto do palco: as ferramentas e, abaixo delas, as faixas do
       * momento (gravar pose, forma-base, forças dos ossos). Antes as faixas ficavam no fluxo, no
       * alto do palco, e as ferramentas flutuantes as cobriam: "Gravar pose ajustada" não recebia
       * clique. A pilha deixa passar o toque onde não há cartão.
       */}
      <div className="pointer-events-none absolute top-3 left-3 z-20 flex max-h-[calc(100%-1.5rem)] max-w-[calc(100%-10rem)] flex-col items-start gap-1 overflow-y-auto lg:max-w-[calc(100%-1.5rem)]">
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-mld-border bg-mld-surface/95 p-1.5 shadow-sm">
          {mode === 'paint' && !paintTarget && (
            <p className="text-sm font-bold">{SCENE_PAINT_COPY.choosePiece}</p>
          )}
          {paintTarget && (
            <>
              <Button
                className="text-sm"
                aria-pressed={!look}
                disabled={!view.viewport}
                onClick={() => {
                  view.viewport?.cancelGesture()
                  setLook(false)
                }}
              >
                {copy.paintOnModel}
              </Button>
              <Button
                className="text-sm"
                aria-pressed={look}
                disabled={!view.viewport}
                onClick={() => {
                  view.viewport?.cancelGesture()
                  setLook(true)
                }}
              >
                {copy.paintLook}
              </Button>
              {/* No celular a dica ocuparia o palco: ela mora nos Primeiros passos também. */}
              <p className="hidden text-xs text-mld-muted md:block">
                {look ? copy.paintLookHint : SCENE_PAINT_COPY.modelHint}
              </p>
            </>
          )}
          {mode !== 'paint' &&
            !paintTarget &&
            (['select', 'box', 'lasso', 'move', 'rotate', 'scale'] as const)
              .filter(
                (name) =>
                  (mode === 'model' || (name !== 'box' && name !== 'lasso')) && allowedTool(name),
              )
              .map((name) => (
                <Button
                  key={name}
                  variant="ghost"
                  className="px-3 text-sm"
                  aria-pressed={!skinPaintSettings && activeTool === name}
                  disabled={
                    !view.viewport ||
                    (reviewingSet && name !== 'select') ||
                    (assisting && (name === 'rotate' || name === 'scale')) ||
                    (mode === 'animation' && name !== 'select' && !canAnimate) ||
                    (facePreviewOpen && name !== 'select') ||
                    ((name === 'move' || name === 'rotate' || name === 'scale') &&
                      !transformTools.includes(name)) ||
                    (componentSelection !== null &&
                      (name === 'move' || name === 'rotate' || name === 'scale') &&
                      !componentSelection.ids.length) ||
                    ((name === 'move' || name === 'rotate' || name === 'scale') &&
                      !selection.length)
                  }
                  onClick={() => {
                    cancelPaint()
                    setBrushMode('off')
                    setTool(name)
                  }}
                >
                  {name === 'select'
                    ? copy.selectTool
                    : name === 'box'
                      ? copy.selectBox
                      : name === 'lasso'
                        ? copy.selectLasso
                        : copy[name]}
                </Button>
              ))}

          {mode !== 'paint' && !paintTarget && (
            <span className="text-mld-muted text-xs">
              {skinPaintSettings
                ? copy.skinPaint.hint
                : mode === 'animation'
                  ? reviewingSet
                    ? copy.poseSet.review
                    : assisting
                      ? copy.twoBone.drag
                      : copy.animationViewportHint
                  : componentSelection
                    ? areaTool !== 'point'
                      ? copy.componentAreaHint
                      : activeTool === 'select'
                        ? componentSelection.mode === 'face'
                          ? copy.faceHint
                          : copy.componentPickHints[componentSelection.mode]
                        : copy.componentTransformHint
                    : areaTool === 'point'
                      ? copy.gizmoHint
                      : copy.areaHint}
            </span>
          )}
          {(areaTool !== 'point' || componentSelection) && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="selectThrough"
                checked={through}
                onChange={(event) => setThrough(event.target.checked)}
                className="size-5 accent-mld-accent"
              />
              {skinPaintSettings
                ? copy.skinPaint.through
                : componentSelection
                  ? copy.componentThrough
                  : copy.selectThrough}
            </label>
          )}
        </div>
        {componentSelection &&
          document.skins?.some((skin) => skin.nodeId === componentSelection.nodeId) && (
            <p
              role="status"
              className="pointer-events-auto rounded-xl border border-mld-border bg-mld-surface/95 p-3 text-sm text-mld-muted shadow-sm"
            >
              {copy.skinBaseHint}
            </p>
          )}
        {mode === 'animation' && animationPose && (
          <SceneAnimationPoseControls gesture={animationPose} enabled={canAnimate} />
        )}
        {weightSkin && mode === 'model' && !paintTarget && (
          <SceneSkinWeightMapControls
            skin={weightSkin}
            nodes={document.nodes}
            jointId={weightTarget?.jointId ?? null}
            painting={brushMode !== 'off'}
            onChange={(jointId) => {
              cancelPaint()
              setWeightFocus(
                jointId ? { documentId: document.id, nodeId: weightSkin.nodeId, jointId } : null,
              )
            }}
          />
        )}
        {weightTarget && skinPaint && !facePreviewOpen && (
          <SceneSkinPaintControls
            session={skinPaint}
            mode={brushMode}
            radius={brushRadius}
            strength={brushStrength}
            enabled={!!view.viewport && !view.error && !view.lost}
            onMode={(mode) => {
              cancelPaint()
              setTool('select')
              setBrushMode(mode)
            }}
            onRadius={(radius) => {
              cancelPaint()
              setBrushRadius(radius)
            }}
            onStrength={(strength) => {
              cancelPaint()
              setBrushStrength(strength)
            }}
          />
        )}
      </div>
      <section
        className="absolute right-3 bottom-3 z-20 flex max-w-[calc(100%-12rem)] flex-wrap items-center justify-end gap-1 rounded-xl border border-mld-border bg-mld-surface/95 p-1.5 shadow-sm"
        aria-label={COPY.editor.model.viewControls}
      >
        <Button
          variant="ghost"
          className="px-3 text-sm"
          aria-pressed={gridVisible}
          disabled={!view.viewport?.setGridVisible}
          onClick={() => setGridVisible((visible) => !visible)}
        >
          {copy.showGrid}
        </Button>
        <Button
          variant="ghost"
          className="px-3 text-sm"
          disabled={!view.viewport}
          onClick={() => {
            skinPaint?.cancel()
            view.viewport?.frame(true)
          }}
        >
          {COPY.editor.model.views.selection}
        </Button>
        {/*
         * As seis vistas atrás de UM botão. Deitadas elas pediam 432px de largura, e era
         * isso que fazia a fileira virar uma tampa sobre o palco. O rótulo leva a vista
         * ATUAL: a criança lê de onde está olhando sem precisar abrir nada.
         */}
        <details className="relative">
          <summary className="flex min-h-11 cursor-pointer items-center rounded-xl px-3 font-bold text-mld-text text-sm hover:bg-mld-border/40">
            {SCENE_SHELL_COPY.camera(COPY.editor.model.views[camera])}
          </summary>
          <div className="absolute right-0 bottom-full z-30 mb-1 flex w-56 flex-col gap-1 rounded-xl border border-mld-border bg-mld-surface p-2 shadow-lg">
            {CAMERA_VIEWS.map((name) => (
              <Button
                key={name}
                variant="ghost"
                className="px-3 text-sm"
                aria-pressed={camera === name}
                disabled={!view.viewport}
                onClick={() => {
                  skinPaint?.cancel()
                  view.viewport?.setView(name)
                  setCamera(name)
                }}
              >
                {COPY.editor.model.views[name]}
              </Button>
            ))}
          </div>
        </details>
        {/* Apoios e passo do movimento: pouco usados, e o passo é o mais abstrato daqui. */}
        <details className="relative">
          <summary className="flex min-h-11 cursor-pointer items-center rounded-xl px-3 font-bold text-mld-text text-sm hover:bg-mld-border/40">
            {SCENE_SHELL_COPY.stageSettings}
          </summary>
          <div className="absolute right-0 bottom-full z-30 mb-1 flex w-56 flex-col gap-1 rounded-xl border border-mld-border bg-mld-surface p-2 shadow-lg">
            {mode !== 'paint' && !paintTarget && !componentSelection && (
              <Button
                variant="ghost"
                className="px-3 text-sm"
                disabled={!view.viewport}
                aria-pressed={supportGuides}
                onClick={() => setSupportGuides((shown) => !shown)}
              >
                {copy.supportGuides}
              </Button>
            )}
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <span>{copy.movementStep}</span>
              <select
                name="molda-movement-step"
                value={movementStep ?? 'free'}
                disabled={!view.viewport?.setMovementStep}
                onChange={(event) =>
                  setMovementStep(event.target.value === 'free' ? null : Number(event.target.value))
                }
                className="min-h-11 rounded-lg border border-mld-border bg-mld-bg px-2"
              >
                <option value="free">{copy.movementFree}</option>
                {[0.1, 0.5, 1].map((step) => (
                  <option key={step} value={step}>
                    {step.toLocaleString('pt-BR')}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>
      </section>
      {supportGuides && mode !== 'paint' && !paintTarget && !componentSelection && (
        <p role="status" className="border-b border-mld-border px-3 py-2 text-sm text-mld-muted">
          {copy.supportGuidesHint}
        </p>
      )}
      <div className="relative flex min-h-0 flex-1">
        <ReferenceImageGuide
          view={camera}
          disabled={!view.viewport || !!view.error || view.lost}
          available={can('model.reference')}
          // Em cima de "Primeiros passos": o canto de cima é das ferramentas flutuantes.
          triggerPlacement="bottom-16 left-3"
        >
          <canvas
            ref={view.canvas}
            aria-label={componentSelection ? copy.componentViewport : copy.viewport}
            tabIndex={0}
            className="absolute inset-0 size-full touch-none"
          />
          {view.area.length > 1 && (
            <svg
              aria-hidden="true"
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 size-full overflow-visible"
            >
              <path
                d={`M ${view.area.map((point) => point.join(' ')).join(' L ')} Z`}
                fillRule="evenodd"
                vectorEffect="non-scaling-stroke"
                strokeWidth={2}
                className="fill-mld-accent/15 stroke-mld-accent"
              />
            </svg>
          )}
          {!view.viewport && !view.error && (
            <p role="status" className="absolute inset-x-3 top-4 text-center text-mld-muted">
              {copy.loading3d}
            </p>
          )}
          {(view.error || view.lost) && (
            <div
              role="alert"
              className="absolute inset-x-3 top-3 rounded-xl border border-mld-border bg-mld-surface p-4 text-sm text-mld-text"
            >
              <p>{view.error ?? copy.lost3d}</p>
              {view.error && (
                <Button className="mt-3 text-sm" onClick={onRetry}>
                  {copy.retry3d}
                </Button>
              )}
            </div>
          )}
          {view.issueCount > 0 && (
            <p
              role="status"
              className="absolute inset-x-3 bottom-3 rounded-xl bg-mld-surface p-3 text-sm text-mld-warn"
            >
              {copy.drawIssues(view.issueCount)}
            </p>
          )}
          {overlay}
          <SceneFirstSteps
            key={document.id}
            context={
              mode === 'animation'
                ? 'animation'
                : mode === 'paint' || paintTarget
                  ? 'paint'
                  : weightTarget
                    ? 'skin'
                    : 'model'
            }
          />
        </ReferenceImageGuide>
      </div>
    </section>
  )
}
