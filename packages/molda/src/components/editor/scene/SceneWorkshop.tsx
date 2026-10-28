import { type CSSProperties, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { NATIVE_IMPORT_COPY } from '../../../core/nativeImportCopy'
import { SCENE_SHELL_COPY } from '../../../core/sceneShellCopy'
import { triggerDownload } from '../../../export/download'
import { exportLoadedSceneForStudio, sameSceneStudioContent } from '../../../export/studioLibrary'
import { booleanSceneSolids, type SceneBooleanOperation } from '../../../scene/booleanSolids'
import { deleteSceneNodes } from '../../../scene/commands'
import { scenePalette } from '../../../scene/composite'
import type { ModelSceneNode, MoldaSceneDocument } from '../../../scene/document'
import { keepSceneThumb, sameSceneContent } from '../../../scene/documentContent'
import { sceneToJson } from '../../../scene/documentJson'
import { joinSceneMeshes } from '../../../scene/joinSceneMeshes'
import { sceneMaterialImageBase } from '../../../scene/materialImages'
import { transformPoint } from '../../../scene/matrix'
import { hasScenePaintableInteriorGap } from '../../../scene/paintableInterior'
import { setScenePalette } from '../../../scene/paletteCommands'
import {
  sceneNodePivot,
  scenePivotRotation,
  setSceneAuthoringPivot,
  setScenePivotAxisFromFace,
} from '../../../scene/pivot'
import { duplicateSceneNodesNearby } from '../../../scene/placement'
import { SCENE_RIG_NORMALS } from '../../../scene/rigBuilder'
import { SceneValidationError } from '../../../scene/validation'
import { sceneVisibleMesh } from '../../../scene/visibleMesh'
import type { EditorStore } from '../../../state/editorStore'
import type { SceneRecoveryController } from '../../../state/sceneRecoveryController'
import type { SceneStorageObserver } from '../../../state/sceneStorageObserver'
import type { SceneViewportFactory, SceneViewportPort } from '../../../viewport/sceneViewportTypes'
import { RequiresTool, useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { Dialog, isMoldaDialogOpen } from '../../ui/Dialog'
import { Crosshair, Focus, Ghost } from '../../ui/icons'
import { isTypingTarget } from '../../ui/interaction'
import { DeferredModule } from '../DeferredEditor'
import { WorkspaceInspector } from '../model/WorkspaceInspector'
import { type ResyncToStudio, useStudioResync } from '../useStudioResync'
import type { SceneBooleanPreview } from './SceneBooleanPanel'
import { SceneCanvas, type SceneCanvasSlots } from './SceneCanvas'
import { SceneComponentTools } from './SceneComponentTools'
import type { SceneExitMode } from './SceneExitControl'
import { SceneFirstSteps } from './SceneFirstSteps'
import { SceneGlbExportPanel } from './SceneGlbExportPanel'
import type { SceneHierarchyShape } from './SceneHierarchy'
import { SceneHierarchyPanel } from './SceneHierarchyPanel'
import { SceneInspectorSections } from './SceneInspectorSections'
import { SceneKnifePanel } from './SceneKnifePanel'
import { SceneModelColumn } from './SceneModelColumn'
import { SceneDivisionChoices, SceneModelGuideBar } from './SceneModelGuideControls'
import { SceneModeTabs } from './SceneModeTabs'
import { SceneNodeProperties } from './SceneNodeProperties'
import { ScenePaintCloseUp } from './ScenePaintCloseUp'
import { ScenePaintColorBar } from './ScenePaintColorBar'
import { ScenePaintColumn, ScenePaintPieceTextures } from './ScenePaintKid'
import { ScenePaintPalette } from './ScenePaintPalette'
import { ScenePaletteLibrary } from './ScenePaletteLibrary'
import { SceneRigPanel } from './SceneRigPanel'
import { SceneSaveProtection } from './SceneSaveProtection'
import { SceneSelectionModes } from './SceneSelectionModes'
import { SceneSolidCutBar } from './SceneSolidCutBar'
import { SceneStorageNotice } from './SceneStorageNotice'
import { SceneTile } from './SceneTile'
import { SceneUpcomingTools } from './SceneUpcomingTools'
import { SceneWorkshopBar } from './SceneWorkshopBar'
import { SceneWorkspaceAreas } from './SceneWorkspaceAreas'
import { SceneWorkspacePanel } from './SceneWorkspacePanel'
import { SCENE_PAINT_ADVANCED_FAMILIES } from './sceneCommandAccess'
import { sceneCommandForShortcut } from './sceneCommandRegistry'
import { runScenePaintShortcut } from './scenePaintShortcuts'
import { useScenePaintSheetView } from './useScenePaintSheetView'
import { useSceneWorkshop } from './useSceneWorkshop'

const loadPaint = () => import('./ScenePaintEditor').then((module) => module.ScenePaintEditor)
const loadImport = () => import('./SceneImportPanel').then((module) => module.SceneImportPanel)
const loadClips = () => import('./SceneAnimationClips').then((module) => module.SceneAnimationClips)
const loadTimeline = () =>
  import('./SceneAnimationTimeline').then((module) => module.SceneAnimationTimeline)
const loadAnimationInspector = () =>
  import('./SceneAnimationInspector').then((module) => module.SceneAnimationInspector)

/**
 * Cabeçalho com atividades, ferramentas à esquerda, palco central e peças/ajustes à direita.
 * A timeline ocupa apenas a coluna central. A oficina coordena ferramenta, seleção e transições;
 * os portais mantêm a mesma instância do palco enquanto os controles mudam de contexto.
 */
export function SceneWorkshop({
  editor,
  storage,
  recovery,
  onExit,
  viewportFactory,
  theme = 'light',
  resyncToStudio,
  canResyncToStudio,
}: {
  editor: EditorStore<MoldaSceneDocument>
  storage?: SceneStorageObserver
  recovery?: SceneRecoveryController
  onExit?: (mode: SceneExitMode) => void
  viewportFactory?: SceneViewportFactory
  theme?: 'light' | 'dark'
  /** A VOLTA da ponte: depois de SALVAR, reenvia a criação ao host já no formato do Estúdio. */
  resyncToStudio?: ResyncToStudio
  canResyncToStudio?: (id: string) => Promise<boolean>
}) {
  const workshop = useSceneWorkshop(editor)
  const sheetView = useScenePaintSheetView()
  const sheetOpen = workshop.area === 'sheet' || workshop.area === 'uv'
  const sheetStyle: CSSProperties & { '--mld-sheet-width': string } = {
    '--mld-sheet-width': `${sheetView.width}%`,
  }
  // Resync the exact saved snapshot, retaining its profile and explicit loss review.
  const savedAsset = useStore(editor, (state) => state.savedAsset)
  const setWorkshopMessage = workshop.setMessage
  const studioSync = useStudioResync({
    savedAsset,
    send: resyncToStudio,
    canSend: canResyncToStudio,
    exportAsset: exportLoadedSceneForStudio,
    sameContent: sameSceneStudioContent,
    // Sem isto a falha da ponte é MUDA aqui, enquanto o editor antigo avisa: o jogo ficaria
    // com o modelo velho para sempre e a criança não teria como saber.
    onFailure: (message) => setWorkshopMessage(message ?? COPY.editor.studioSyncFailed),
  })
  const { mode, changeMode } = workshop
  const { can } = useMoldaToolAccess()
  const editingComponents =
    mode === 'model' &&
    !!workshop.components.selection &&
    can('model.mesh') &&
    workshop.area !== 'skin'
  const editingKnife = mode === 'model' && workshop.tool === 'knife' && can('model.cut')
  const [exportViewport, setExportViewport] = useState<SceneViewportPort | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const importTrigger = useRef<HTMLButtonElement>(null)
  const exportTrigger = useRef<HTMLButtonElement>(null)
  const exportPoseHintId = useId()
  const importPoseHintId = useId()
  // Os LUGARES que a casca prepara para o palco (useState + callback ref: um `useRef` não
  // avisaria o palco quando o lugar monta, e o portal nunca sairia).
  const [toolsSlot, setToolsSlot] = useState<HTMLDivElement | null>(null)
  const [areaToolsSlot, setAreaToolsSlot] = useState<HTMLDivElement | null>(null)
  const [togglesSlot, setTogglesSlot] = useState<HTMLDivElement | null>(null)
  const [viewSlot, setViewSlot] = useState<HTMLDivElement | null>(null)
  const [contextSlot, setContextSlot] = useState<HTMLDivElement | null>(null)
  function hasPendingPose() {
    const { pending, dragging } = workshop.animationPose.getSnapshot()
    return pending || dragging
  }
  const pendingPose = useSyncExternalStore(
    workshop.animationPose.subscribe,
    hasPendingPose,
    () => false,
  )
  const poseHistory = useSyncExternalStore(
    workshop.animationPose.subscribe,
    workshop.animationPose.getSnapshot,
    workshop.animationPose.getSnapshot,
  )
  const previousPoseGuide = useMemo(
    () =>
      workshop.previousPose
        ? {
            size: 1,
            ghost: {
              document: workshop.document,
              ids: workshop.selected,
              pose: workshop.previousPose,
              wireframe: true,
              color: 0x8d96a3,
              opacity: 0.6,
              depthTest: true,
            },
          }
        : null,
    [workshop.document, workshop.selected, workshop.previousPose],
  )
  const displayedPose = workshop.animation.getSnapshot().pose
  const rigGuide = useMemo(() => {
    const draft = workshop.rigDraft
    if (!draft) return null
    return {
      size: 1,
      rig: {
        points: workshop.rig.points(),
        active:
          draft.editing ??
          (draft.prepared && draft.jointId ? draft.prepared.jointIds.indexOf(draft.jointId) : null),
      },
    }
  }, [workshop.rig, workshop.rigDraft])
  const pivotGuide = useMemo(() => {
    const node = workshop.primary
    if (workshop.tool !== 'pivot' || !node) return null
    const pose = displayedPose?.source === workshop.document ? displayedPose : undefined
    const world = (pose?.worldMatrices ?? workshop.index.scene.worldMatrices).get(node.id)
    if (!world) return null
    try {
      return {
        size: 1,
        snapPoints:
          workshop.pivotSnap && node.kind === 'mesh'
            ? Object.values(
                sceneVisibleMesh(workshop.index, node.id, pose?.worldMatrices)!.vertices,
              ).map((point) => transformPoint(world, point))
            : undefined,
        ghost: workshop.pivotSnap
          ? undefined
          : {
              document: workshop.document,
              ids: [node.id],
              pose,
              wireframe: true,
              color: 0x8b3fd9,
              opacity: 0.55,
              depthTest: false,
              label: 'Assim ela vai girar',
              worldDelta: scenePivotRotation(world, sceneNodePivot(node), 30, node.pivotAxis),
            },
      }
    } catch {
      return null
    }
  }, [
    workshop.tool,
    workshop.primary,
    workshop.index,
    workshop.document,
    displayedPose,
    workshop.pivotSnap,
  ])
  const faceToggle = useRef<HTMLButtonElement>(null)
  function closeFaces() {
    workshop.requestTransition(() => {
      if (workshop.area === 'mesh' || workshop.area === 'skin') workshop.openArea(null)
      else workshop.components.close()
      queueMicrotask(() => faceToggle.current?.focus())
    })
  }
  function escapeFaces() {
    if (workshop.components.operation.kind) workshop.components.operation.cancel()
    else if (workshop.components.check.busy || workshop.components.check.preview)
      workshop.components.check.cancel()
    else if (workshop.components.preview.tool) workshop.components.preview.cancel()
    else if (workshop.components.transform.dragging) workshop.components.transform.cancel()
    else closeFaces()
  }
  const { document, selected, run } = workshop
  // A ferramenta Puxar só vale com Faces ou Linhas; fixa as alças no modo de puxar desde antes do
  // arrasto, para a prévia que ele abre não trocar o modo do palco no meio do gesto.
  const pullTool =
    mode === 'model' &&
    workshop.tool === 'pull' &&
    (workshop.components.selection?.mode === 'face' ||
      workshop.components.selection?.mode === 'edge')
  // Unir peças é o Ctrl+J do Blender: junta as formas escolhidas numa peça, sem costurar.
  const joinReady =
    selected.length >= 2 &&
    selected.every((id) => workshop.index.scene.nodes.get(id)?.kind === 'mesh')
  function joinPieces() {
    if (!joinReady) return
    booleanRequest.current++
    setBooleanBusy(false)
    setBooleanPreview(null)
    const baseId = selected[0]!
    const result = run((source) => joinSceneMeshes(source, selected))
    if (result?.nodes.some((node) => node.id === baseId)) workshop.select(baseId, false)
  }
  const [booleanPreview, setBooleanPreview] = useState<SceneBooleanPreview | null>(null)
  const [booleanBusy, setBooleanBusy] = useState(false)
  const booleanRequest = useRef(0)
  const currentBooleanSelection = useRef(selected)
  currentBooleanSelection.current = selected
  const activeBoolean =
    mode === 'model' &&
    booleanPreview &&
    sameSceneContent(booleanPreview.source, document) &&
    selected.length === 2 &&
    selected[0] === booleanPreview.ids[0] &&
    selected[1] === booleanPreview.ids[1]
      ? booleanPreview
      : null
  const booleanTools = {
    preview: activeBoolean,
    busy: booleanBusy,
    async prepare(operation: SceneBooleanOperation) {
      if (selected.length !== 2) return
      const request = ++booleanRequest.current
      setBooleanBusy(true)
      setBooleanPreview(null)
      try {
        const result = await booleanSceneSolids(document, selected, operation)
        if (
          request !== booleanRequest.current ||
          !sameSceneContent(editor.getState().asset, document) ||
          currentBooleanSelection.current[0] !== selected[0] ||
          currentBooleanSelection.current[1] !== selected[1]
        )
          return
        setBooleanPreview({
          source: document,
          result,
          ids: [selected[0]!, selected[1]!],
          operation,
        })
        workshop.setMessage(null)
      } catch (error) {
        if (
          request !== booleanRequest.current ||
          !sameSceneContent(editor.getState().asset, document) ||
          currentBooleanSelection.current[0] !== selected[0] ||
          currentBooleanSelection.current[1] !== selected[1]
        )
          return
        setBooleanPreview(null)
        workshop.setMessage(
          error instanceof SceneValidationError
            ? error.message
            : 'Não foi possível combinar essas peças.',
        )
      } finally {
        if (request === booleanRequest.current) setBooleanBusy(false)
      }
    },
    confirm() {
      if (!activeBoolean) return
      const result = run((source) => {
        if (!sameSceneContent(source, activeBoolean.source)) return source
        return keepSceneThumb(activeBoolean.result, source)
      }, 'clear')
      if (result) workshop.select(activeBoolean.ids[0], false)
      setBooleanPreview(null)
    },
    cancel() {
      booleanRequest.current++
      setBooleanBusy(false)
      setBooleanPreview(null)
    },
  }
  // A face de perto redesenha quando a paleta ou a cor base mudam de verdade, não a cada render.
  const paintPalette = useMemo(() => scenePalette(document), [document])
  const paintData = workshop.paint.data
  const paintInteriorAvailable = useMemo(
    () =>
      workshop.primary?.kind === 'mesh' &&
      hasScenePaintableInteriorGap(document, workshop.primary.id),
    [document, workshop.primary],
  )
  const paintBase = useMemo(
    () =>
      paintData
        ? sceneMaterialImageBase(paintData.material, paintPalette, paintData.imageKind)
        : null,
    [paintData, paintPalette],
  )
  const copy = COPY.scene
  const canConvert = document.nodes.some(
    (node) =>
      node.kind === 'mesh' &&
      workshop.covered.has(node.id) &&
      workshop.index.geometries.get(node.geometryId)?.kind !== 'mesh',
  )
  const geometries = workshop.index.geometries
  const paintGeometry =
    workshop.primary?.kind === 'mesh' ? geometries.get(workshop.primary.geometryId) : undefined
  const paintPlane =
    paintGeometry?.kind === 'mesh' &&
    Object.keys(paintGeometry.faces).length === 1 &&
    !!paintGeometry.faces.plane
  const shapeOf = (node: ModelSceneNode): SceneHierarchyShape => {
    if (node.kind !== 'mesh') return node.kind
    const kind = geometries.get(node.geometryId)?.kind
    return kind === 'box' ||
      kind === 'wedge' ||
      kind === 'cylinder' ||
      kind === 'cone' ||
      kind === 'sphere' ||
      kind === 'torus' ||
      kind === 'path'
      ? kind
      : 'mesh'
  }
  function backup() {
    try {
      workshop.cancelGesture()
      const snapshot = editor.getState().saveSnapshot()
      if (
        !triggerDownload(
          JSON.stringify(sceneToJson(snapshot)),
          `${snapshot.id}.molda.json`,
          'application/json',
        )
      )
        throw new Error('Download unavailable')
      workshop.setMessage(null)
      return true
    } catch {
      workshop.setMessage(copy.backupError)
      return false
    }
  }
  function openFromBar(open: (value: boolean) => void) {
    workshop.requestTransition(() => {
      workshop.cancelGesture()
      workshop.paint.close()
      workshop.releasePaintPreparation()
      workshop.components.close()
      open(true)
    })
  }
  // Slots estáveis para ferramentas, câmera e instrução contextual.
  const slots: SceneCanvasSlots = {
    ...(mode === 'paint' ? {} : { tools: toolsSlot, areaTools: areaToolsSlot }),
    toggles: togglesSlot,
    view: viewSlot,
    context: contextSlot,
  }
  // "Isolar seleção" é um jeito de OLHAR: mora na lista das vistas, nas três abas.
  const isolate = (
    <Button
      variant="ghost"
      className="justify-start px-3 text-sm"
      disabled={!selected.length && workshop.isolation === null}
      aria-pressed={workshop.isolation !== null}
      onClick={() => workshop.setIsolation(workshop.isolation ? null : selected)}
    >
      <Focus aria-hidden="true" className="size-4" />
      {COPY.editor.model.isolation.toggle}
    </Button>
  )
  return (
    <section
      data-molda-theme={theme}
      aria-label={copy.title}
      onClickCapture={(event) => {
        if ((event.target as Element).closest?.('[data-paint-tool]')) workshop.setLooking(false)
      }}
      onKeyDown={(event) => {
        if (event.defaultPrevented || isTypingTarget(event.target) || isMoldaDialogOpen()) return
        // Activation belongs to the focused control. In particular, Space on a
        // checkbox must toggle it, and Enter on Cancel must not confirm a cut.
        if (
          (event.key === ' ' || event.key === 'Enter') &&
          (event.target as Element).closest?.(
            'button, input, select, textarea, summary, a[href], [role="button"], [role="checkbox"], [role="switch"]',
          )
        )
          return
        if (event.key === 'Escape' && workshop.tool === 'pivot' && workshop.pivotSnap) {
          event.preventDefault()
          workshop.setPivotSnap(false)
          return
        }
        if (workshop.rigDraft) {
          if (event.key === 'Escape') workshop.rig.cancel()
          else if (event.key === 'Backspace' && workshop.rigDraft.phase === 'mark')
            workshop.rig.back()
          event.stopPropagation()
          if (event.key !== 'Tab') event.preventDefault()
          return
        }
        if ((event.target as Element).closest?.('[data-workspace-area="skin"]')) {
          // Binding review owns its keyboard context; a Delete/undo shortcut must not edit
          // the scene behind a pending suggestion. The shared history buttons remain available.
          if (event.key === 'Escape') workshop.openArea(null)
          event.stopPropagation()
          if (
            event.key === 'Delete' ||
            event.key === 'Escape' ||
            (event.ctrlKey && event.key === 'z')
          )
            event.preventDefault()
          return
        }
        if (mode === 'animation' && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const state = workshop.animation.getSnapshot(),
            clip = state.source?.clip
          if (event.key === 'Escape' && workshop.poseCopy) {
            event.preventDefault()
            workshop.cancelPoseCopy()
            return
          }
          if (clip && [' ', 'Home', 'End', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault()
            if (event.key === ' ')
              state.playing ? workshop.animation.pause() : workshop.animation.play()
            else {
              workshop.selectAnimationPose(null)
              workshop.animation.seek(
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? clip.duration
                    : Math.max(
                        0,
                        Math.min(
                          clip.duration,
                          state.time + (event.key === 'ArrowRight' ? 0.05 : -0.05),
                        ),
                      ),
              )
            }
            return
          }
          if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault()
            if (can('animate.create')) workshop.removeSelectedPose()
            return
          }
        }
        if (
          mode === 'model' &&
          (workshop.tool === 'cut' || workshop.tool === 'knife') &&
          ['Escape', 'Enter', 'Backspace'].includes(event.key)
        ) {
          event.preventDefault()
          if (workshop.tool === 'knife') {
            if (event.key === 'Escape') workshop.cancelKnife()
            else if (event.key === 'Backspace') workshop.knife.back()
            else workshop.confirmKnife()
            return
          }
          if (event.key === 'Escape') workshop.setTool('select')
          else if (event.key === 'Backspace') workshop.solidCut.back()
          else void workshop.solidCut.confirm()
          return
        }
        if (
          mode === 'model' &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          event.key.toLowerCase() === 'k'
        ) {
          event.preventDefault()
          if (can('model.cut')) workshop.setTool('knife')
          return
        }
        if (mode === 'model' || mode === 'animation') {
          // Com Faces ou Linhas, os atalhos da malha (o E do Puxar) também valem.
          const meshContext =
            mode === 'model' && workshop.components.selection
              ? (`mesh-${workshop.components.selection.mode}` as const)
              : null
          const command =
            sceneCommandForShortcut(mode === 'model' ? 'model' : 'animate', event, can) ??
            (meshContext ? sceneCommandForShortcut(meshContext, event, can) : null)
          const transform =
            command === 'tool.select'
              ? 'select'
              : command === 'tool.move'
                ? 'move'
                : command === 'tool.pull'
                  ? 'pull'
                  : command === 'tool.rotate'
                    ? 'rotate'
                    : command === 'tool.scale'
                      ? 'scale'
                      : null
          if (transform) {
            event.preventDefault()
            workshop.setTool(transform)
            return
          }
        }
        if (event.key === 'Escape' && workshop.modelGuides.owner) {
          // Esc é o "Cancelar" da barra da prévia: descarta direto, sem perguntar de novo.
          event.preventDefault()
          workshop.modelGuides.cancel()
        } else if (event.key === 'Escape' && workshop.placing) {
          event.preventDefault()
          workshop.cancelPlacement()
        } else if (event.key === 'Escape' && workshop.looking) {
          event.preventDefault()
          workshop.setLooking(false)
        } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
          event.preventDefault()
          if (event.shiftKey) workshop.redo()
          else workshop.undo()
        } else if (mode === 'animation' && event.key === 'Escape') {
          event.preventDefault()
          workshop.animation.pause()
          workshop.animationPose.interrupt()
        } else if (
          (mode === 'model' || mode === 'animation') &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          event.key.toLowerCase() === 'p'
        ) {
          event.preventDefault()
          if (can('model.pivot') && selected.length === 1) workshop.setTool('pivot')
        } else if (mode === 'model' && event.key === 'Delete' && selected.length) {
          // Atalho de família trancada é da oficina: não age, e o navegador não o recebe.
          event.preventDefault()
          if (workshop.components.selection) {
            if (can('model.mesh')) workshop.components.remove()
          } else if (can('model.pieces'))
            run((source) => deleteSceneNodes(source, selected), 'clear')
        } else if (
          mode === 'model' &&
          !workshop.components.selection &&
          (event.ctrlKey || event.metaKey) &&
          !event.shiftKey &&
          !event.altKey &&
          event.key.toLowerCase() === 'd'
        ) {
          // Ctrl+D duplica, como no editor antigo (o registro já o prometia); sem isso, o
          // navegador guardava a página nos favoritos.
          event.preventDefault()
          if (can('model.pieces') && selected.length)
            run((source) => duplicateSceneNodesNearby(source, selected), 'created')
        } else if ((mode === 'paint' || workshop.paint.session) && event.key === 'Escape') {
          // O mesmo Esc do palco, venha de onde vier o foco: com a pergunta da face torta aberta
          // e sem pintura, ele solta a peça (antes só o palco fazia isso).
          event.preventDefault()
          workshop.endPaint()
        } else if (
          mode === 'paint' &&
          runScenePaintShortcut(workshop.paint, event, can, () => {
            if (workshop.area === 'uv') workshop.openArea('sheet')
          })
        ) {
          event.preventDefault()
        } else if (workshop.components.selection && event.key === 'Escape') {
          event.preventDefault()
          escapeFaces()
        } else if (
          workshop.components.selection &&
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 'a'
        ) {
          event.preventDefault()
          if (can('model.mesh')) workshop.components.choose('all')
        }
      }}
      // Rola na VERTICAL só quando a tela é baixa demais (o celular deitado): o palco tem um
      // piso, e sem a rolagem ele sumia (0px a 844×390, medido). Na altura normal nada rola.
      className="mld-workshop flex min-h-0 flex-1 flex-col overflow-hidden bg-mld-bg text-mld-text"
    >
      <SceneWorkshopBar
        requestTransition={workshop.requestTransition}
        help={<SceneFirstSteps key={document.id} compact inline context={mode} />}
        editor={editor}
        name={document.name}
        tabs={<SceneModeTabs mode={mode} onChange={changeMode} />}
        onExit={onExit}
        beforeExit={() => studioSync.prepareExit(editor.getState().savedAsset)}
        backup={backup}
        cancelPreview={() => {
          workshop.cancelGesture()
          workshop.releasePaintPreparation()
          workshop.paint.close()
          workshop.components.close()
          workshop.flipbook.setImage(null)
        }}
        onUndo={workshop.undo}
        onRedo={workshop.redo}
        pendingPose={pendingPose}
        draftCanUndo={poseHistory.canUndo}
        previewCanUndo={
          !!workshop.knife.owner?.points.length || !!workshop.components.operation.kind
        }
        draftCanRedo={poseHistory.canRedo}
        exportTrigger={exportTrigger}
        importTrigger={importTrigger}
        exportHintId={exportPoseHintId}
        importHintId={importPoseHintId}
        onExport={() => openFromBar(setExportOpen)}
        onImport={() => openFromBar(setImportOpen)}
      />
      <SceneSaveProtection editor={editor} recovery={recovery} backup={backup} />
      <Dialog
        open={!!workshop.transition}
        title="Esta pose ainda não foi marcada"
        onClose={() => workshop.resolveTransition('continue')}
      >
        <p className="text-sm">Quer guardar os ajustes das peças antes de continuar?</p>
        {poseHistory.error && (
          <p role="alert" className="mt-2 text-sm text-mld-danger">
            {poseHistory.error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => workshop.resolveTransition('mark')}>
            Marcar pose
          </Button>
          <Button onClick={() => workshop.resolveTransition('discard')}>Descartar ajustes</Button>
          <Button onClick={() => workshop.resolveTransition('continue')}>
            Continuar ajustando
          </Button>
        </div>
      </Dialog>
      {storage && <SceneStorageNotice observer={storage} />}
      <Dialog
        open={!!workshop.contextTransition.decision}
        title={workshop.contextTransition.decision?.title ?? 'Prévia em andamento'}
        onClose={() => workshop.contextTransition.resolve('continue')}
      >
        <p className="text-sm">Quer aplicar o resultado antes de continuar?</p>
        {workshop.contextTransition.error && (
          <p role="alert" className="mt-2 text-sm text-mld-danger">
            {workshop.contextTransition.error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={!workshop.contextTransition.canApply}
            onClick={() => workshop.contextTransition.resolve('apply')}
          >
            {workshop.contextTransition.decision?.applyLabel ?? 'Aplicar'}
          </Button>
          <Button onClick={() => workshop.contextTransition.resolve('discard')}>
            Descartar prévia
          </Button>
          <Button onClick={() => workshop.contextTransition.resolve('continue')}>
            Continuar ajustando
          </Button>
        </div>
      </Dialog>
      {workshop.poseRecovery.available && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 border-b border-mld-border bg-mld-surface px-4 py-2 text-sm"
        >
          Há uma pose que ainda não foi marcada.
          <Button onClick={workshop.restorePose}>Continuar a pose</Button>
          <Button onClick={workshop.poseRecovery.discard}>Descartar rascunho</Button>
        </div>
      )}
      {workshop.poseRecovery.error && (
        <p role="status" className="px-4 py-2 text-sm text-mld-warn">
          {workshop.poseRecovery.error}
        </p>
      )}
      {/* O erro da pintura mora na coluna da aba Pintar, junto das ferramentas. */}
      {workshop.message && (
        <p
          role="alert"
          className="border-b border-mld-border bg-mld-surface px-4 py-2 text-sm text-mld-danger"
        >
          {workshop.message}
        </p>
      )}
      {/* O piso do palco: em tela baixa quem cede é a rolagem da oficina, nunca o palco. */}
      <div
        data-activity={mode}
        className="mld-workshop-body relative flex min-h-0 flex-1 overflow-hidden"
      >
        {mode === 'model' && (
          <SceneModelColumn
            workshop={workshop}
            toolsSlot={setToolsSlot}
            areaToolsSlot={setAreaToolsSlot}
            canConvert={canConvert}
          />
        )}
        {mode === 'paint' && (
          <div className="mld-workshop-rail mld-bar">
            <ScenePaintColumn workshop={workshop} />
          </div>
        )}
        {mode === 'animation' && (
          <section
            aria-label={SCENE_SHELL_COPY.animationTools}
            className="mld-workshop-rail mld-bar"
          >
            <p aria-hidden="true" className="mld-kicker">
              {SCENE_SHELL_COPY.tools}
            </p>
            <div ref={setToolsSlot} className="flex flex-col gap-1.5" />
            {can('model.pivot') && selected.length === 1 && (
              <SceneTile
                icon={Crosshair}
                label="Pivô"
                aria-keyshortcuts="P"
                title="Onde gira (P)"
                pressed={workshop.tool === 'pivot' && !workshop.looking}
                onClick={() =>
                  workshop.requestTransition(() => {
                    workshop.animation.pause()
                    workshop.setTool('pivot')
                  })
                }
              />
            )}
          </section>
        )}
        {/*
         * Palco e inspetor num contêiner só: abaixo de lg a gaveta "Peças e cores" (e o gatilho
         * dela, em cima à direita) se posiciona por ele.
         */}
        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden max-[899px]:flex-col max-[899px]:overflow-y-auto">
          <div
            className={`mld-workshop-stage flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-[899px]:flex-none ${mode === 'animation' ? 'max-[899px]:h-[500px] max-[899px]:min-h-[500px]' : mode === 'paint' ? 'max-[899px]:h-[492px] max-[899px]:min-h-[492px]' : 'max-[899px]:h-[420px] max-[899px]:min-h-[420px]'}`}
          >
            <SceneWorkspaceAreas workshop={workshop} />
            <div
              className="mld-stage-workbench"
              data-paint-sheet={sheetOpen}
              data-sheet-expanded={sheetView.expanded}
              data-sheet-model={sheetView.showModel}
              style={sheetStyle}
              data-specialized={
                !!workshop.area &&
                workshop.area !== 'curves' &&
                workshop.area !== 'mesh' &&
                workshop.area !== 'skin'
              }
            >
              {sheetOpen && <SceneWorkspacePanel workshop={workshop} sheetView={sheetView} />}
              <div className="mld-stage-viewport" data-mode={mode}>
                {/* As ferramentas de OLHAR flutuam no alto do palco em dois cartões brancos. */}
                <div className="mld-stage-toolbar">
                  {mode === 'model' && !workshop.rigDraft && can('model.components') && (
                    <SceneSelectionModes workshop={workshop} />
                  )}
                  {mode === 'animation' && (
                    <label
                      className="mld-float mld-previous-pose mld-auto-key"
                      data-enabled={workshop.showPreviousPose}
                    >
                      <Ghost aria-hidden="true" className="size-4 text-mld-muted" />
                      Ver pose anterior
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={workshop.showPreviousPose}
                        name="showPreviousPose"
                        onChange={(event) => workshop.setShowPreviousPose(event.target.checked)}
                      />
                      <span aria-hidden="true" className="mld-auto-switch" />
                    </label>
                  )}
                  {workshop.isolation !== null && (
                    <button
                      type="button"
                      className="sz-tool-pill sz-tool-pill--outline text-[0.8125rem] shadow-(--mld-float-shadow)"
                      onClick={() => workshop.setIsolation(null)}
                    >
                      <Focus aria-hidden="true" />
                      Ver todas as peças
                    </button>
                  )}
                  <div className="mld-float ml-auto">
                    <div ref={setViewSlot} className="contents" />
                    <div ref={setTogglesSlot} className="contents" />
                  </div>
                </div>
                <SceneCanvas
                  measurementStep={workshop.measurementStep}
                  onMeasurementStepChange={workshop.setMeasurementStep}
                  guideInput={
                    workshop.rigDraft
                      ? {
                          rig: {
                            nodeId: workshop.rigDraft.nodeId,
                            enabled: workshop.rigDraft.phase === 'mark',
                            plane: {
                              origin:
                                workshop.rigDraft.editing === null
                                  ? workshop.rigDraft.center
                                  : workshop.rigDraft.points[workshop.rigDraft.editing]!,
                              normal: SCENE_RIG_NORMALS[workshop.rigDraft.view],
                            },
                            mark: (point) => workshop.rig.mark(point, workshop.measurementStep),
                          },
                        }
                      : workshop.tool === 'pivot' && workshop.primary
                        ? {
                            pivot: {
                              nodeId: workshop.primary.id,
                              vertical: workshop.pivotVertical,
                              snapVertex: workshop.pivotSnap,
                              markVertex: (_vertexId, point) => {
                                if (
                                  workshop.run((source) =>
                                    setSceneAuthoringPivot(source, workshop.primary!.id, point),
                                  )
                                )
                                  workshop.setPivotSnap(false)
                              },
                              begin: (world) =>
                                workshop.pivotGesture.begin(workshop.primary!.id, world),
                              preview: workshop.pivotGesture.preview,
                              end: workshop.pivotGesture.end,
                            },
                          }
                        : workshop.knife.owner
                          ? {
                              knife: {
                                nodeId: workshop.knife.owner.nodeId,
                                midpoint: workshop.knife.midpoint,
                                edgesOnly: workshop.knife.mode === 'loop',
                                closePoint: workshop.knife.closePoint,
                                mark: workshop.knife.mark,
                                hover: workshop.knife.hover,
                              },
                            }
                          : workshop.solidCut.owner
                            ? {
                                cut: {
                                  nodeId: workshop.solidCut.owner.nodeId,
                                  midpoint: workshop.solidCut.midpoint,
                                  mark: workshop.solidCut.point,
                                  hover: workshop.solidCut.hover,
                                },
                              }
                            : workshop.modelGuides.owner
                              ? (workshop.modelGuides.input ?? {})
                              : null
                  }
                  guidePoint={workshop.modelGuides.point}
                  previewGuide={
                    rigGuide ??
                    workshop.components.operation.guide ??
                    workshop.knife.guide ??
                    workshop.solidCut.guide ??
                    pivotGuide ??
                    workshop.modelGuides.guide ??
                    previousPoseGuide
                  }
                  cameraRequest={
                    workshop.rigDraft?.cameraRequest ?? workshop.modelGuides.cameraRequest
                  }
                  reveal={workshop.reveal}
                  onViewport={setExportViewport}
                  mode={workshop.area === 'uv' ? 'model' : mode}
                  showBones={workshop.area === 'skin' && Boolean(document.skins?.length)}
                  tool={workshop.tool}
                  onToolChange={workshop.setTool}
                  looking={workshop.looking}
                  onLookingChange={workshop.setLooking}
                  onHover={workshop.placing ? workshop.previewPlacement : undefined}
                  onSampleInk={workshop.paint.picker ? workshop.paint.sample : undefined}
                  document={
                    activeBoolean?.result ??
                    workshop.rigDraft?.preview ??
                    workshop.placementPreview ??
                    workshop.modelGuides.document ??
                    workshop.animationPreviewDocument ??
                    workshop.components.operation.document ??
                    document
                  }
                  selection={activeBoolean ? [activeBoolean.ids[0]] : selected}
                  isolation={workshop.isolation}
                  onSelect={workshop.select}
                  onSelectMany={workshop.selectMany}
                  factory={viewportFactory}
                  onThumb={(thumb) => {
                    if (
                      !activeBoolean &&
                      !workshop.paintPreparationPending() &&
                      !workshop.rigDraft &&
                      !workshop.placing &&
                      !workshop.components.operation.kind &&
                      !workshop.modelGuides.owner
                    )
                      workshop.editor.getState().setThumb(thumb)
                  }}
                  transform={
                    mode === 'animation'
                      ? workshop.animationPose.transformActions(selected)
                      : workshop.transform
                  }
                  transformTools={activeBoolean ? [] : workshop.components.transformTools}
                  componentSelection={
                    workshop.rigDraft
                      ? null
                      : (workshop.components.operation.selection ?? workshop.components.selection)
                  }
                  faceExtruding={
                    workshop.components.preview.tool === 'extrude' ||
                    (pullTool && workshop.components.selection?.mode === 'face')
                  }
                  directPull={
                    pullTool ||
                    workshop.components.preview.tool === 'extrude' ||
                    (workshop.components.operation.kind === 'extrude' &&
                      workshop.components.operation.owner?.selection.mode === 'edge')
                  }
                  facePreviewOpen={
                    !!activeBoolean ||
                    !!workshop.rigDraft ||
                    workshop.area === 'uv' ||
                    editingKnife ||
                    (!!workshop.components.operation.kind &&
                      workshop.components.transformTools.length === 0) ||
                    !!workshop.modelGuides.owner ||
                    workshop.placing ||
                    (workshop.components.preview.tool !== null &&
                      workshop.components.preview.tool !== 'extrude') ||
                    workshop.components.check.busy ||
                    !!workshop.components.check.preview
                  }
                  onSelectComponent={workshop.components.select}
                  onSelectComponents={workshop.components.selectMany}
                  onEndFaces={escapeFaces}
                  onInterrupt={workshop.cancelGesture}
                  skinPaint={workshop.skinPaint}
                  paintTarget={workshop.paint.session?.target ?? null}
                  paintScope={
                    can('paint.brush') &&
                    workshop.paint.surfaceMode &&
                    !workshop.paint.shape &&
                    !workshop.paint.closeupTool &&
                    !workshop.paint.rotate
                      ? { mode: workshop.paint.pieceScope, nodeId: workshop.primary?.id ?? null }
                      : null
                  }
                  paintMirror={workshop.paint.mirror}
                  paintGuides={{
                    grid: workshop.paint.grid,
                    brush: workshop.paint.brush,
                    ink: workshop.paint.ink,
                    cursor:
                      !workshop.paint.picker &&
                      !workshop.paint.fill &&
                      !workshop.paint.shape &&
                      !workshop.paint.rotate &&
                      !workshop.paint.closeupTool,
                  }}
                  onPaintGridChange={workshop.paint.setGrid}
                  onOrganizePaintMap={mode === 'paint' ? workshop.mapPaintUv : undefined}
                  canOrganizePaintMap={
                    workshop.primary?.kind === 'mesh' &&
                    workshop.components.canEdit &&
                    !workshop.paint.drawing &&
                    !workshop.paint.busy
                  }
                  detailPanel={
                    mode === 'paint' && workshop.paint.data && workshop.paint.closeUp ? (
                      <ScenePaintCloseUp
                        key={`${workshop.paint.data.image.id}:${Object.values(workshop.paint.closeUp.region).join(',')}`}
                        image={workshop.paint.data.image}
                        palette={paintPalette}
                        base={paintBase ?? [0, 0, 0, 0]}
                        view={workshop.paint.closeUp}
                        drawing={workshop.paint.drawing}
                        brush={workshop.paint.brush}
                        actions={workshop.paint.actions}
                        onClose={workshop.paint.closeCloseUp}
                      />
                    ) : null
                  }
                  paint={workshop.paint.actions}
                  flipbook={workshop.flipbook}
                  animation={workshop.animation}
                  animationPose={workshop.animationPose}
                  onEndPaint={workshop.endPaint}
                  slots={slots}
                  viewExtras={isolate}
                />
                <div
                  data-essential={workshop.tool === 'pivot' || !!workshop.components.selection}
                  className={
                    workshop.modelGuides.owner || workshop.tool === 'cut'
                      ? 'hidden'
                      : workshop.area === 'uv'
                        ? 'hidden'
                        : 'mld-stage-context'
                  }
                  ref={setContextSlot}
                />
                <SceneModelGuideBar workshop={workshop} />
                <SceneSolidCutBar workshop={workshop} />
                {workshop.placing && (
                  <div className="mld-placement-notice" role="status">
                    Escolha o apoio para colocar a peça em cima.
                    <Button className="text-sm" onClick={workshop.cancelPlacement}>
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
              {workshop.area !== 'mesh' && !sheetOpen && (
                <SceneWorkspacePanel workshop={workshop} sheetView={sheetView} />
              )}
            </div>
            {/* A tinta mora no pé da área central: debaixo do 3D e da Folha de pintura. */}
            {mode === 'paint' && <ScenePaintColorBar paint={workshop.paint} palette={document} />}
            {mode === 'animation' && (
              <DeferredModule
                load={loadTimeline}
                props={{ workshop }}
                onBack={() => changeMode('model')}
                backLabel={copy.glbExport.close}
              />
            )}
          </div>
          <WorkspaceInspector docked persistent flush onBeforeClose={() => {}}>
            {editingKnife ? (
              <SceneKnifePanel workshop={workshop} />
            ) : editingComponents ? (
              <SceneComponentTools
                key={`${workshop.components.selection?.nodeId}:${workshop.components.panelSession}`}
                {...workshop.components}
                measurementStep={workshop.measurementStep}
                close={closeFaces}
                onKnife={() => workshop.setTool('knife')}
                onSeparateLine={() => {
                  const selection = workshop.components.selection
                  if (selection?.mode === 'edge' && selection.ids.length > 0)
                    workshop.setTool('cut', [...selection.ids])
                }}
                onMove={() => workshop.setTool('move')}
                onAlignPivot={() => {
                  const selection = workshop.components.selection
                  if (selection?.mode !== 'face' || selection.ids.length !== 1) return
                  workshop.run((source) =>
                    setScenePivotAxisFromFace(source, selection.nodeId, selection.ids[0]!),
                  )
                }}
                visualCut={<SceneDivisionChoices workshop={workshop} />}
              />
            ) : (
              <SceneInspectorSections
                mode={mode}
                overview={
                  mode === 'animation' ? (
                    <DeferredModule
                      load={loadClips}
                      props={{ workshop }}
                      onBack={() => changeMode('model')}
                      backLabel={copy.glbExport.close}
                    />
                  ) : mode === 'paint' ? (
                    <ScenePaintPalette
                      paint={workshop.paint}
                      pieceName={
                        workshop.primary?.kind === 'mesh' ? workshop.primary.name : undefined
                      }
                      palette={document}
                      textures={<ScenePaintPieceTextures workshop={workshop} />}
                      applyPalette={(next) =>
                        workshop.run((source) => setScenePalette(source, next))
                      }
                      prepared={workshop.paintPreparationPending()}
                      plane={paintPlane}
                      openSheet={
                        can('paint.sheet') && !sheetOpen
                          ? () => workshop.openArea('sheet')
                          : undefined
                      }
                      interior={
                        paintInteriorAvailable
                          ? {
                              apply: workshop.makePaintableInterior,
                              disabled: !workshop.components.canEdit || workshop.paint.drawing,
                            }
                          : null
                      }
                      preparation={
                        workshop.paintIssue && {
                          faces: workshop.paintIssue.faces,
                          apply: workshop.splitCrookedAndPaint,
                        }
                      }
                    />
                  ) : null
                }
                pieces={
                  <SceneHierarchyPanel
                    workshop={workshop}
                    shapeOf={shapeOf}
                    joinPieces={
                      mode === 'model' && can('model.mesh') && joinReady ? joinPieces : undefined
                    }
                  />
                }
              >
                {mode === 'animation' ? (
                  <>
                    <DeferredModule
                      load={loadAnimationInspector}
                      props={{ workshop }}
                      onBack={() => changeMode('model')}
                      backLabel={copy.glbExport.close}
                    />
                    {/* No painel, que rola: na barra de cima ela roubaria altura do palco. */}
                    <SceneUpcomingTools tabs={['animate']} />
                  </>
                ) : mode === 'paint' ? (
                  <>
                    {/* No nível de entrada o painel ficaria vazio: nem baixa o módulo. */}
                    {SCENE_PAINT_ADVANCED_FAMILIES.some((family) => can(family)) && (
                      <DeferredModule
                        load={loadPaint}
                        props={{ workshop }}
                        onBack={() => changeMode('model')}
                        backLabel={copy.glbExport.close}
                      />
                    )}
                  </>
                ) : workshop.area === 'skin' ? (
                  <SceneRigPanel
                    key={`${workshop.document.id}:${workshop.primary?.id}`}
                    workshop={workshop}
                  />
                ) : workshop.components.selection ? (
                  <div className="p-3 text-sm text-mld-muted">
                    <p>
                      {workshop.components.selection.ids.length}{' '}
                      {workshop.components.selection.mode === 'vertex' ? 'pontos' : 'faces'}{' '}
                      escolhidos
                    </p>
                    <p className="mt-2">
                      Escolha Mover, Girar ou Tamanho e puxe uma alça para ajustar.
                    </p>
                  </div>
                ) : (
                  <>
                    <RequiresTool family="model.finish">
                      <div className="mx-1 mb-3 rounded-xl border border-mld-border bg-mld-surface p-3">
                        <ScenePaletteLibrary
                          palette={document}
                          busy={workshop.paint.drawing || workshop.paint.busy}
                          apply={(next) => workshop.run((source) => setScenePalette(source, next))}
                        />
                      </div>
                    </RequiresTool>
                    <SceneNodeProperties workshop={workshop} booleanTools={booleanTools} />
                  </>
                )}
              </SceneInspectorSections>
            )}
          </WorkspaceInspector>
        </div>
      </div>
      <Dialog
        open={exportOpen}
        title={copy.glbExport.title}
        onClose={() => setExportOpen(false)}
        returnFocusTo={exportTrigger}
      >
        {exportOpen && (
          <SceneGlbExportPanel
            viewport={exportViewport}
            key={document.id}
            editor={editor}
            onClose={() => setExportOpen(false)}
          />
        )}
      </Dialog>
      <Dialog
        open={importOpen}
        title={NATIVE_IMPORT_COPY.title}
        onClose={() => setImportOpen(false)}
        returnFocusTo={importTrigger}
        wide
      >
        {importOpen && (
          <DeferredModule
            key={document.id}
            load={loadImport}
            onBack={() => setImportOpen(false)}
            backLabel={copy.glbExport.close}
            props={{
              editor,
              viewportFactory,
              blocked: pendingPose,
              canAdopt: () => !hasPendingPose(),
              onClose: () => setImportOpen(false),
              onImported: () => {
                workshop.select(null, false)
                workshop.setIsolation(null)
                workshop.animation.setClip(null, null)
                setImportOpen(false)
              },
            }}
          />
        )}
      </Dialog>
      {studioSync.review && (
        <section aria-label={copy.glbExport.changes} className="border-t border-mld-border p-3">
          <p className="font-semibold">{copy.glbExport.studio.review}</p>
          <ul className="list-disc pl-5 text-sm">
            {studioSync.review.losses.map((loss) => (
              <li key={loss}>{loss}</li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={() => void studioSync.approveReview()}>
              {copy.glbExport.studio.accept}
            </Button>
            <Button variant="outline" onClick={studioSync.dismissReview}>
              {copy.glbExport.studio.keep}
            </Button>
          </div>
        </section>
      )}
    </section>
  )
}
