import { type ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
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
import {
  Camera,
  ChevronDown,
  Grid3x3,
  Info,
  Lasso,
  type LucideIcon,
  MousePointer2,
  Move3d,
  Rotate3d,
  Scale3d,
  Scan,
  SlidersHorizontal,
  SquareDashedMousePointer,
} from '../../ui/icons'
import { isTypingTarget } from '../../ui/interaction'
import { ReferenceImageGuide } from '../model/ReferenceImageGuide'
import { SceneAnimationPoseControls } from './SceneAnimationPoseControls'
import { SceneFirstSteps } from './SceneFirstSteps'
import { type SceneSkinBrushMode, SceneSkinPaintControls } from './SceneSkinPaintControls'
import { SceneSkinWeightMapControls } from './SceneSkinWeightMapControls'
import { SceneTile } from './SceneTile'
import { useSceneViewport } from './useSceneViewport'

type SceneCanvasTool = SceneTransformTool | 'box' | 'lasso'

/**
 * Onde a CASCA quer cada grupo de controles do palco (11/09/2026, as telas-modelo). O palco
 * continua DONO de todo o estado (a ferramenta, a grade, a vista, o passo): ele só desenha os
 * controles por `createPortal` no lugar que a casca preparou. Assim o "Abrir o 3D de novo"
 * (a remontagem do palco) zera tudo como antes, e o Esc do palco segue valendo, porque o
 * evento do React sobe pela árvore de componentes e não pela do DOM.
 *
 * Cada chave tem três estados: AUSENTE (o grupo fica sobre o palco, como no teste que monta o
 * palco sozinho e na aba Animar), `null` (o lugar ainda não montou: nada aparece, para não
 * piscar sobre o palco) e o elemento (o portal).
 */
export interface SceneCanvasSlots {
  /** Os ladrilhos Escolher, Mover, Girar e Mudar tamanho. */
  tools?: HTMLElement | null
  /** A caixa de seleção e o laço ("Mais ferramentas"). Ausente, vão junto das ferramentas. */
  areaTools?: HTMLElement | null
  /** "Mostrar grade" e "Mais ajustes do palco". */
  toggles?: HTMLElement | null
  /** "Vista" e "Enquadrar seleção". */
  view?: HTMLElement | null
}

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
  /** Onde a casca quer os controles; sem ele, tudo flutua sobre o palco (o desenho antigo). */
  slots?: SceneCanvasSlots
  /** O que entra no fim da lista das vistas ("Isolar seleção", que é estado da oficina). */
  viewExtras?: ReactNode
}

const TOOL_ICONS: Record<SceneCanvasTool, LucideIcon> = {
  select: MousePointer2,
  box: SquareDashedMousePointer,
  lasso: Lasso,
  move: Move3d,
  rotate: Rotate3d,
  scale: Scale3d,
}

const inactiveSubscription = () => () => {}

export function SceneCanvas(props: Props) {
  const [attempt, setAttempt] = useState(0)
  return (
    <SceneCanvasAttempt key={attempt} {...props} onRetry={() => setAttempt((value) => value + 1)} />
  )
}

/** Desenha no lugar da casca; ausente, fica onde está; `null` = ainda não montou. */
function place(
  slot: HTMLElement | null | undefined,
  node: ReactNode,
  inline: () => ReactNode,
): ReactNode {
  if (slot === undefined) return inline()
  return slot ? createPortal(node, slot) : null
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
  slots,
  viewExtras = null,
}: Props & { onRetry(): void }) {
  const [tool, setTool] = useState<SceneCanvasTool>('select')
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
  const allowedTool = (name: SceneCanvasTool) =>
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

  // ── as ferramentas ──────────────────────────────────────────────────────────────────────
  const showTools = mode !== 'paint' && !paintTarget
  const tools = (['select', 'box', 'lasso', 'move', 'rotate', 'scale'] as const).filter(
    (name) => (mode === 'model' || (name !== 'box' && name !== 'lasso')) && allowedTool(name),
  )
  const toolLabel = (name: SceneCanvasTool) =>
    name === 'select'
      ? copy.selectTool
      : name === 'box'
        ? copy.selectBox
        : name === 'lasso'
          ? copy.selectLasso
          : copy[name]
  const toolDisabled = (name: SceneCanvasTool) =>
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
    ((name === 'move' || name === 'rotate' || name === 'scale') && !selection.length)
  const chooseTool = (name: SceneCanvasTool) => {
    cancelPaint()
    setBrushMode('off')
    setTool(name)
  }
  const toolTile = (name: SceneCanvasTool) => (
    <SceneTile
      key={name}
      icon={TOOL_ICONS[name]}
      label={toolLabel(name)}
      pressed={!skinPaintSettings && activeTool === name}
      disabled={toolDisabled(name)}
      onClick={() => chooseTool(name)}
    />
  )
  const toolButton = (name: SceneCanvasTool) => (
    <Button
      key={name}
      variant="ghost"
      className="px-3 text-sm"
      aria-pressed={!skinPaintSettings && activeTool === name}
      disabled={toolDisabled(name)}
      onClick={() => chooseTool(name)}
    >
      {toolLabel(name)}
    </Button>
  )
  const isArea = (name: SceneCanvasTool) => name === 'box' || name === 'lasso'
  const mainTools = slots?.areaTools === undefined ? tools : tools.filter((name) => !isArea(name))
  const areaTools = slots?.areaTools === undefined ? [] : tools.filter(isArea)

  // ── a dica do momento ───────────────────────────────────────────────────────────────────
  const hint = skinPaintSettings
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
          : copy.areaHint
  const throughBox = (areaTool !== 'point' || componentSelection) && (
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
  )
  const paintModes = paintTarget && (
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
    </>
  )

  // ── olhar o modelo: grade, ajustes, vista, enquadrar ─────────────────────────────────────
  const shell = slots !== undefined
  // Com a casca, as pílulas chapadas das telas-modelo (sem as variantes do `Button`, que
  // somariam anel e borda grossa ao "ligado"); sem ela, os botões de sempre.
  const gridButton = shell ? (
    <button
      type="button"
      className="sz-tool-pill sz-tool-pill--outline mld-toggle px-3 text-[0.8125rem]"
      aria-pressed={gridVisible}
      disabled={!view.viewport?.setGridVisible}
      onClick={() => setGridVisible((visible) => !visible)}
    >
      <Grid3x3 aria-hidden="true" />
      {copy.showGrid}
    </button>
  ) : (
    <Button
      variant="ghost"
      className="px-3 text-sm"
      aria-pressed={gridVisible}
      disabled={!view.viewport?.setGridVisible}
      onClick={() => setGridVisible((visible) => !visible)}
    >
      {copy.showGrid}
    </Button>
  )
  const frame = () => {
    skinPaint?.cancel()
    view.viewport?.frame(true)
  }
  const frameButton = shell ? (
    <button
      type="button"
      className="sz-tool-pill mld-pill-sun px-3 text-[0.8125rem]"
      disabled={!view.viewport}
      onClick={frame}
    >
      <Scan aria-hidden="true" />
      {COPY.editor.model.views.selection}
    </button>
  ) : (
    <Button variant="ghost" className="px-3 text-sm" disabled={!view.viewport} onClick={frame}>
      {COPY.editor.model.views.selection}
    </Button>
  )
  const summaryClass = shell
    ? 'sz-tool-pill sz-tool-pill--outline list-none px-3 text-[0.8125rem] [&::-webkit-details-marker]:hidden'
    : 'flex min-h-11 cursor-pointer items-center rounded-xl px-3 font-bold text-mld-text text-sm hover:bg-mld-border/40'
  // Na barra de cima o menu DESCE; flutuando sobre o palco (o desenho antigo, no pé), ele SOBE.
  // `right` = o grupo da direita da barra, que só vai para a direita a partir de `sm`: abaixo
  // disso ele cai numa linha própria, colado à esquerda, e o menu ancorado à direita abria com
  // os rótulos fora da tela. `left` estreita no celular: o resumo não começa na borda, e os
  // 240px do menu passavam da tela.
  // `stage` = a vista flutuando no palco (o Animar): o palco recorta o que passa do pé dele, e
  // no celular em pé as sete vistas em fila passavam; em duas colunas elas cabem.
  const DROP_ALIGN = {
    right: 'left-0 sm:right-0 sm:left-auto',
    left: 'left-0 max-sm:w-52',
    stage: 'left-0 grid w-[min(18rem,calc(100vw-2rem))] grid-cols-2',
  } as const
  const dropClass = (align: keyof typeof DROP_ALIGN) =>
    shell
      ? `mld-drop top-full mt-2 ${DROP_ALIGN[align]}`
      : 'absolute right-0 bottom-full z-30 mb-1 flex w-56 flex-col gap-1 rounded-xl border border-mld-border bg-mld-surface p-2 shadow-lg'
  const cameraMenu = (
    // As seis vistas atrás de UM botão: deitadas elas pediam 432px. O rótulo leva a vista ATUAL.
    <details className="relative">
      <summary className={summaryClass}>
        {shell && <Camera aria-hidden="true" className="size-4" />}
        {SCENE_SHELL_COPY.camera(COPY.editor.model.views[camera])}
        {shell && <ChevronDown aria-hidden="true" className="size-4" />}
      </summary>
      {/* Flutuando no palco (o Animar) o grupo fica à ESQUERDA: o menu abre para a direita. */}
      <div className={dropClass(shell && slots.view === undefined ? 'stage' : 'right')}>
        {CAMERA_VIEWS.map((name) => (
          <Button
            key={name}
            variant="ghost"
            className="justify-start px-3 text-sm"
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
        {viewExtras}
      </div>
    </details>
  )
  const settingsMenu = (
    // Apoios e passo do movimento: pouco usados, e o passo é o mais abstrato daqui.
    <details className="relative">
      <summary className={summaryClass}>
        {shell && <SlidersHorizontal aria-hidden="true" className="size-4" />}
        {SCENE_SHELL_COPY.stageSettings}
        {shell && <ChevronDown aria-hidden="true" className="size-4" />}
      </summary>
      <div className={dropClass('left')}>
        {mode !== 'paint' && !paintTarget && !componentSelection && (
          <Button
            variant="ghost"
            className="justify-start px-3 text-sm"
            disabled={!view.viewport}
            aria-pressed={supportGuides}
            onClick={() => setSupportGuides((shown) => !shown)}
          >
            {copy.supportGuides}
          </Button>
        )}
        <label className="flex min-h-11 items-center gap-2 px-1 text-sm">
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
  )
  // Sem slots (o desenho antigo e o teste que monta o palco sozinho): a faixa no pé do palco.
  const legacyViewBar = (
    <section
      className="absolute right-3 bottom-3 z-20 flex max-w-[calc(100%-12rem)] flex-wrap items-center justify-end gap-1 rounded-xl border border-mld-border bg-mld-surface/95 p-1.5 shadow-sm"
      aria-label={COPY.editor.model.viewControls}
    >
      {gridButton}
      {frameButton}
      {cameraMenu}
      {settingsMenu}
    </section>
  )
  // Com slots, o que a casca não pediu (a aba Animar) vira uma barra no alto do palco.
  const floatingView = shell && (slots.toggles === undefined || slots.view === undefined) && (
    <section
      aria-label={COPY.editor.model.viewControls}
      className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1.5"
    >
      {slots.view === undefined && (
        <>
          {cameraMenu}
          {frameButton}
        </>
      )}
      {slots.toggles === undefined && (
        <>
          {gridButton}
          {settingsMenu}
        </>
      )}
    </section>
  )

  const hintCard = (
    <div className="mld-stage-card pointer-events-auto flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2">
      {mode === 'paint' && !paintTarget && (
        // Região viva: o recado muda com o toque, e quem usa leitor de tela precisa ouvir.
        <p role="status" className="flex items-center gap-2 text-sm font-bold">
          <Info aria-hidden="true" className="size-4 shrink-0 text-mld-accent" />
          {SCENE_PAINT_COPY.choosePiece}
        </p>
      )}
      {paintModes}
      {paintTarget && (
        // No celular a dica ocuparia o palco: ela mora nos Primeiros passos também.
        <p className="hidden text-xs text-mld-muted md:block">
          {look ? copy.paintLookHint : SCENE_PAINT_COPY.modelHint}
        </p>
      )}
      {/* A casca que não preparou lugar para as ferramentas recebe-as aqui, no palco. */}
      {showTools && shell && slots.tools === undefined && tools.map(toolButton)}
      {showTools && (
        <p className="flex items-center gap-2 text-sm text-mld-text">
          <Info aria-hidden="true" className="size-4 shrink-0 text-mld-accent" />
          <span>{hint}</span>
        </p>
      )}
      {throughBox}
    </div>
  )

  const stageCards = (
    <>
      {componentSelection &&
        document.skins?.some((skin) => skin.nodeId === componentSelection.nodeId) && (
          <p
            role="status"
            className="pointer-events-auto rounded-xl border border-mld-border bg-mld-surface/95 p-3 text-sm text-mld-muted shadow-sm"
          >
            {copy.skinBaseHint}
          </p>
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
    </>
  )
  const poseCard = mode === 'animation' && animationPose && (
    <SceneAnimationPoseControls gesture={animationPose} enabled={canAnimate} />
  )

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
      {/* Sem o lugar pedido, o `inline` não desenha nada: o grupo sai no palco, mais abaixo. */}
      {showTools && place(slots?.tools, mainTools.map(toolTile), () => null)}
      {showTools &&
        areaTools.length > 0 &&
        place(slots?.areaTools, areaTools.map(toolTile), () => null)}
      {place(
        slots?.toggles,
        <>
          {gridButton}
          {settingsMenu}
        </>,
        () => null,
      )}
      {place(
        slots?.view,
        <>
          {cameraMenu}
          {frameButton}
        </>,
        () => null,
      )}
      {shell ? (
        <>
          {/*
           * A COLUNA da esquerda do palco, de cima a baixo: a vista (no Animar), a dica do momento
           * e os cartões que aparecem por um tempo (forma-base, forças dos ossos) em cima; a pose
           * embaixo. O canto de cima à direita é do gatilho "Peças e cores" e o pé da direita, da
           * ajuda. É UMA coluna de propósito: no celular em pé, com a pilha e a pose em caixas
           * separadas, a pose cobria o "Mais ajustes do palco". Quem cede no aperto é a parte que
           * rola (a dica e os cartões); a vista flutuante fica FORA dela, porque um contêiner de
           * rolagem recorta o menu que abre da vista.
           */}
          <div className="pointer-events-none absolute top-3 bottom-3 left-3 z-20 flex max-w-[calc(100%-4.25rem)] flex-col items-start justify-between gap-2 md:max-w-[calc(100%-13.5rem)]">
            <div className="flex min-h-0 max-w-full flex-col items-start gap-2">
              {floatingView}
              <div className="flex min-h-0 max-w-full flex-col items-start gap-2 overflow-y-auto">
                {hintCard}
                {stageCards}
              </div>
            </div>
            {poseCard && (
              <div className="flex max-h-[60%] max-w-full shrink-0 flex-col items-start overflow-y-auto">
                {poseCard}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/*
           * Uma PILHA flutuante no canto do palco: as ferramentas e, abaixo delas, as faixas do
           * momento (gravar pose, forma-base, forças dos ossos). Antes as faixas ficavam no fluxo,
           * no alto do palco, e as ferramentas flutuantes as cobriam: "Gravar pose ajustada" não
           * recebia clique. A pilha deixa passar o toque onde não há cartão.
           */}
          <div className="pointer-events-none absolute top-3 left-3 z-20 flex max-h-[calc(100%-1.5rem)] max-w-[calc(100%-10rem)] flex-col items-start gap-1 overflow-y-auto lg:max-w-[calc(100%-1.5rem)]">
            <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-mld-border bg-mld-surface/95 p-1.5 shadow-sm">
              {mode === 'paint' && !paintTarget && (
                <p role="status" className="text-sm font-bold">
                  {SCENE_PAINT_COPY.choosePiece}
                </p>
              )}
              {paintModes}
              {paintTarget && (
                <p className="hidden text-xs text-mld-muted md:block">
                  {look ? copy.paintLookHint : SCENE_PAINT_COPY.modelHint}
                </p>
              )}
              {showTools && tools.map(toolButton)}
              {showTools && <span className="text-mld-muted text-xs">{hint}</span>}
              {throughBox}
            </div>
            {stageCards}
            {poseCard}
          </div>
          {legacyViewBar}
        </>
      )}
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
          // O canto de cima é das ferramentas flutuantes (no desenho antigo) e da dica (na casca).
          triggerPlacement={shell ? 'right-3 bottom-17' : 'bottom-16 left-3'}
          compactTrigger={shell}
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
              className="absolute inset-x-3 top-3 z-30 rounded-xl border border-mld-border bg-mld-surface p-4 text-sm text-mld-text"
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
              className={
                shell
                  ? 'mld-stage-card absolute right-17 bottom-3 left-3 z-10 p-3 text-sm text-mld-warn md:right-auto md:max-w-md'
                  : 'absolute inset-x-3 bottom-3 rounded-xl bg-mld-surface p-3 text-sm text-mld-warn'
              }
            >
              {copy.drawIssues(view.issueCount)}
            </p>
          )}
          {overlay}
          <SceneFirstSteps
            key={document.id}
            side={shell ? 'right' : 'left'}
            compact={shell}
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
