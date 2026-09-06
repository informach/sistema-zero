/**
 * A bancada do modelo: MONTAR e PINTAR. Caixa de ferramentas à esquerda (muda
 * com o modo), palco no centro, coluna da direita (Peças → Cores →
 * Propriedades; em tela estreita vira um disclosure abaixo do palco). Toda
 * mudança passa pelas operações puras de `model/partOps.ts` e `paint/stroke.ts`
 * e entra no editor por `commit` (um passo de desfazer) ou, durante um gesto,
 * por `replace` + `commitGesture` no soltar.
 *
 * A miniatura do modelo é uma foto do palco: refeita com atraso depois de cada
 * mudança nas peças e guardada no asset (`setThumb`, sem histórico).
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { MOLDA_LIMITS, type TexelsPerUnit } from '../../../core/limits'
import type {
  MeshFaceKey,
  MoldaMesh,
  MoldaModelAsset,
  MoldaTextureAsset,
  ShapeId,
  Vec3,
} from '../../../core/model'
import type { PaletteId } from '../../../core/palette'
import { firstPaintableIndex, remapActiveColorAfterRemoval } from '../../../core/palette'
import { resolvePaletteColors } from '../../../core/sanitize'
import { triggerDownload } from '../../../export/download'
import { exportModelGlb, GLB_MIME } from '../../../export/modelGlb'
import {
  type ArrangeResult,
  alignParts,
  centerPartsOnStage,
  putPartsOnFloor,
  repeatPartsInLine,
} from '../../../model/arrange'
import { modelTriangleCount } from '../../../model/geometry'
import { type MeshIssue, meshIssues } from '../../../model/mesh'
import { deleteMeshSelection, moveMeshVertices } from '../../../model/meshOps'
import {
  type MeshPick,
  selectedEdges,
  selectedFaces,
  selectionNormal,
  selectionVertices,
} from '../../../model/meshSelection'
import {
  applyMeshFix,
  canConnectVertices,
  canInsetFace,
  connectVertices,
  createFace,
  extrudeEdges,
  extrudeFaces,
  flipFaces,
  insetFace,
  loopCut,
  type MeshToolResult,
  mergeVertices,
  splitQuads,
} from '../../../model/meshTools'
import {
  addExtraColor,
  addPart,
  addPartAtSurface,
  boxToMesh,
  duplicatePart,
  findPart,
  movePartBy,
  movePartsBy,
  removeExtraColor,
  removePart,
  setPartSize,
  setSnap,
  setTexelsPerUnit,
  trySetMirrorX,
  updateExtraColor,
  updatePart,
} from '../../../model/partOps'
import { type FacePaintTarget, facePaintCanvas } from '../../../paint/facePaint'
import type { BrushSize } from '../../../paint/skinPaint'
import type { PaintTool } from '../../../paint/stroke'
import type { EditorStore } from '../../../state/editorStore'
import {
  createSessionStore,
  type EditorMode,
  type TransformTool,
} from '../../../state/sessionStore'
import { type ApplyMode, applyTextureToPart } from '../../../texture/ops'
import type { ViewName } from '../../../viewport/types'
import { Button, ToolButton } from '../../ui/Button'
import { CircleHelp, Download } from '../../ui/icons'
import { useToast } from '../../ui/Toast'
import { useMediaQuery } from '../../ui/useMediaQuery'
import { EditorTopBar } from '../EditorTopBar'
import { ApplyTextureDialog } from './ApplyTextureDialog'
import { ArrangePanel, type RepeatAdjustmentValue } from './ArrangePanel'
import { ColorsPanel } from './ColorsPanel'
import { ContextHelpDialog } from './ContextHelpDialog'
import {
  contextualModelCommands,
  MESH_ACTION_COMMAND,
  type ModelCommandContext,
  type ModelCommandId,
  type ModelCommandState as RegistryCommandState,
} from './commandRegistry'
import { FacePaintDialog } from './FacePaintDialog'
import { type MeshAdjust, MeshToolbox } from './MeshToolbox'
import type { MeshCommandId, MeshCommandState } from './meshCommands'
import { useModelEditorShortcuts, useModelThumbnail } from './modelEditorHooks'
import { PaintToolbox } from './PaintToolbox'
import { PartsPanel } from './PartsPanel'
import { PropertiesPanel } from './PropertiesPanel'
import { Toolbox } from './Toolbox'
import { useModelViewportController } from './useModelViewportController'
import { useSnapController } from './useSnapController'
import { ViewportPane } from './ViewportPane'

function issueKey(issue: MeshIssue): string {
  return issue.kind === 'overlap'
    ? `${issue.kind}:${issue.vertices.join(',')}`
    : `${issue.kind}:${issue.face}`
}

function ModeTabs({
  mode,
  onMode,
}: {
  mode: EditorMode
  onMode: (mode: EditorMode) => void
}): JSX.Element {
  const modes: EditorMode[] = ['build', 'paint']
  return (
    <div className="flex rounded-full border-2 border-mld-border bg-mld-bg p-0.5">
      {modes.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={mode === item}
          onClick={() => onMode(item)}
          className={clsx(
            'min-h-11 rounded-full px-4 text-sm font-bold transition',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
            mode === item
              ? 'bg-mld-accent text-mld-accent-fg'
              : 'text-mld-text hover:bg-mld-border/40',
          )}
        >
          {COPY.editor.model.mode[item]}
        </button>
      ))}
    </div>
  )
}

type MeshAdjustment = {
  before: MoldaModelAsset
  /** Revisão exata produzida pela última execução desta ferramenta. */
  afterRevision: number
  partId: string
  selection: MeshPick[]
  kind: 'extrude-faces' | 'extrude-edges' | 'inset'
  value: number
  faceKey?: MeshFaceKey
}

type RepeatAdjustment = {
  before: MoldaModelAsset
  afterRevision: number
  sourceIds: string[]
  addedIds: string[]
  value: RepeatAdjustmentValue
}

function replayMeshAdjustment(adjustment: MeshAdjustment, value: number): MeshToolResult | null {
  const mesh = findPart(adjustment.before, adjustment.partId)?.mesh
  if (!mesh) return null
  switch (adjustment.kind) {
    case 'extrude-faces':
      return extrudeFaces(
        adjustment.before,
        adjustment.partId,
        selectedFaces(mesh, adjustment.selection),
        value,
      )
    case 'extrude-edges':
      return extrudeEdges(
        adjustment.before,
        adjustment.partId,
        selectedEdges(mesh, adjustment.selection),
        value,
      )
    case 'inset':
      return adjustment.faceKey
        ? insetFace(adjustment.before, adjustment.partId, adjustment.faceKey, value)
        : null
  }
}

export function ModelEditor({
  editor,
  onBack,
}: {
  editor: EditorStore
  onBack: () => void
}): JSX.Element {
  const { showToast } = useToast()
  const [session] = useState(() => createSessionStore())
  const asset = useStore(editor, (state) => state.asset) as MoldaModelAsset
  const contentRevision = useStore(editor, (state) => state.contentRevision)
  const mode = useStore(session, (state) => state.mode)
  const tool = useStore(session, (state) => state.tool)
  const selectedId = useStore(session, (state) => state.selectedId)
  const extraIds = useStore(session, (state) => state.extraIds)
  const partsAdditive = useStore(session, (state) => state.partsAdditive)
  const edgesVisible = useStore(session, (state) => state.edgesVisible)
  const gridVisible = useStore(session, (state) => state.gridVisible)
  const paintTool = useStore(session, (state) => state.paintTool)
  const paintColor = useStore(session, (state) => state.paintColor)
  const brushSize = useStore(session, (state) => state.brushSize)
  const mirrorPaint = useStore(session, (state) => state.mirrorPaint)
  const placingShape = useStore(session, (state) => state.placingShape)
  const meshEditId = useStore(session, (state) => state.meshEditId)
  const meshSelectMode = useStore(session, (state) => state.meshSelectMode)
  const meshSelection = useStore(session, (state) => state.meshSelection)
  const selectedMesh = meshEditId ? findPart(asset, meshEditId)?.mesh : undefined
  const meshVertices = useMemo(
    () => (selectedMesh ? selectionVertices(selectedMesh, meshSelection) : []),
    [selectedMesh, meshSelection],
  )
  const meshAdditive = useStore(session, (state) => state.meshAdditive)
  const wide = useMediaQuery('(min-width: 768px)')
  const gestureBefore = useRef<MoldaModelAsset | null>(null)
  // O gesto do "+ Nova cor" (seletor nativo) tem o SEU "antes": o `gestureBefore` do palco não
  // serve, porque um `pointerdown` no canvas pode chegar antes do `blur` que fecha o seletor.
  const colorGesture = useRef<{
    before: MoldaModelAsset
    /** A extra criada pelo gesto (os passos seguintes a trocam no lugar); `null` até criar. */
    index: number | null
    /** Teto batido no meio do gesto: um toast só, e os passos seguintes são ignorados. */
    full: boolean
  } | null>(null)
  const [applyOpen, setApplyOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [faceTarget, setFaceTarget] = useState<FacePaintTarget | null>(null)
  // O "Ajustar" reexecuta a última ação contínua sobre o `before` (um passo no desfazer).
  const [meshAdjust, setMeshAdjust] = useState<MeshAdjustment | null>(null)
  const [repeatAdjust, setRepeatAdjust] = useState<RepeatAdjustment | null>(null)
  const repeatAdjustRef = useRef<RepeatAdjustment | null>(null)
  repeatAdjustRef.current = repeatAdjust

  const model = useCallback(
    (): MoldaModelAsset => editor.getState().asset as MoldaModelAsset,
    [editor],
  )
  /**
   * Fecha o gesto do "+ Nova cor" (UM `commitGesture` sobre o `before` dele). Chamado no
   * fim natural (`change`/`blur`) e, de forma DEFENSIVA, antes de qualquer outro commit ou
   * gesto do palco: o Esc no seletor não manda `change`, e um `pointerdown` de pintura
   * (com `preventDefault`) não tira o foco do input, então sem isto o `before` velho
   * entrava no histórico DEPOIS da pintura e o Desfazer andava para trás e para frente.
   */
  const closeColorGesture = useCallback(() => {
    const gesture = colorGesture.current
    colorGesture.current = null
    if (!gesture) return
    const after = editor.getState().asset as MoldaModelAsset
    if (after !== gesture.before) editor.getState().commitGesture(gesture.before, after)
  }, [editor])
  // As setas seguradas são UM gesto (`replace` a cada repetição, `commitGesture` no soltar).
  const nudgeGesture = useRef<{ before: MoldaModelAsset } | null>(null)
  const endNudge = useCallback(() => {
    const gesture = nudgeGesture.current
    nudgeGesture.current = null
    if (!gesture) return
    const after = editor.getState().asset as MoldaModelAsset
    if (after !== gesture.before) editor.getState().commitGesture(gesture.before, after)
  }, [editor])
  const commit = useCallback(
    (next: MoldaModelAsset) => {
      closeColorGesture()
      endNudge()
      if (next !== editor.getState().asset) editor.getState().commit(next)
    },
    [closeColorGesture, editor, endNudge],
  )
  const {
    state: snapState,
    instruction: snapInstruction,
    chooseTool,
    toggle: toggleSnapTool,
    cancel: cancelSnapTool,
    chooseSource: chooseSnapSource,
    chooseTarget: chooseSnapTarget,
  } = useSnapController({ session, model, commit, showToast })
  // Trocar a largura da janela remonta o painel de cores (e o input do seletor): o gesto
  // fecha aqui, senão a extra ficaria sem commit.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `wide` é o GATILHO (remonta o painel), não leitura
  useEffect(() => () => closeColorGesture(), [wide, closeColorGesture])
  useEffect(() => {
    window.addEventListener('blur', endNudge)
    return () => window.removeEventListener('blur', endNudge)
  }, [endNudge])
  // Desfazer/refazer podem apagar a cor extra que o lápis usa: o lápis volta à 1ª cor.
  useEffect(() => {
    const colors = resolvePaletteColors(asset)
    const active = session.getState().paintColor
    if (active >= colors.length || !colors[active]) {
      session.getState().setPaintColor(firstPaintableIndex(colors))
    }
  }, [asset, session])
  // Consertar DEPOIS e perguntar: um problema NOVO na malha (face virada, quad torto,
  // pontos sobrepostos) vira um toast com o conserto, Desfazer e Deixar.
  // `meshIssues` custa ~30 ms numa malha grande e o "antes" de uma ferramenta é o "depois"
  // da anterior: a resposta fica guardada por IDENTIDADE da malha.
  const issueCache = useRef(new WeakMap<MoldaMesh, MeshIssue[]>())
  const issuesOf = useCallback((mesh: MoldaMesh): MeshIssue[] => {
    const cached = issueCache.current.get(mesh)
    if (cached) return cached
    const computed = meshIssues(mesh)
    issueCache.current.set(mesh, computed)
    return computed
  }, [])
  const warnMeshIssues = useCallback(
    (before: MoldaModelAsset, after: MoldaModelAsset, partId: string | null) => {
      if (!partId) return
      const previous = findPart(before, partId)?.mesh
      const mesh = findPart(after, partId)?.mesh
      if (!mesh) return
      const known = new Set(previous ? issuesOf(previous).map(issueKey) : [])
      const issue = issuesOf(mesh).find((item) => !known.has(issueKey(item)))
      if (!issue) return
      const copy = COPY.editor.model.mesh
      const fixLabel =
        issue.kind === 'overlap'
          ? copy.fixes.merge
          : issue.kind === 'flipped'
            ? copy.fixes.flip
            : copy.fixes.split
      // As ações valem para a revisão que gerou o aviso. A miniatura não avança a
      // revisão de conteúdo, mas qualquer edição, desfazer ou refazer avança.
      const warnedAtRevision = editor.getState().contentRevision
      const still = (): boolean => editor.getState().contentRevision === warnedAtRevision
      showToast(copy.issues[issue.kind], [
        {
          label: fixLabel,
          onClick: () => {
            if (!still()) {
              showToast(copy.fixes.stale)
              return
            }
            const result = applyMeshFix(after, partId, issue)
            if (!result) return
            commit(result.model)
            const state = session.getState()
            const nextMode = result.selection[0]?.kind
            if (nextMode) state.setMeshSelectMode(nextMode)
            state.setMeshSelection(result.selection)
          },
        },
        {
          label: copy.fixes.undo,
          onClick: () => {
            if (still()) editor.getState().undo()
            else showToast(copy.fixes.stale)
          },
        },
        { label: copy.fixes.keep, onClick: () => undefined },
      ])
    },
    [commit, editor, issuesOf, session, showToast],
  )
  const placeAtSurface = useCallback(
    (shape: ShapeId, point: Vec3, normal: Vec3, nearId: string | null) => {
      const result = addPartAtSurface(model(), shape, point, normal, { nearId })
      session.getState().setPlacingShape(null)
      if (!result) {
        showToast(COPY.editor.model.partsFull)
        return
      }
      commit(result.model)
      session.getState().select(result.partId)
    },
    [commit, model, session, showToast],
  )

  const { canvasRef, viewport, unsupported, atlas } = useModelViewportController({
    editor,
    session,
    state: {
      asset,
      selectedId,
      extraIds,
      mode,
      tool,
      placingShape,
      paintTool,
      paintColor,
      brushSize,
      mirrorPaint,
      gridVisible,
      edgesVisible,
      meshEditId,
      meshSelectMode,
      meshVertices,
      snapState,
    },
    model,
    gestureBefore,
    closeColorGesture,
    endNudge,
    placeAtSurface,
    openFace: setFaceTarget,
    warnMeshIssues,
    showToast,
    chooseSnapSource,
    chooseSnapTarget,
  })

  // Uma edição externa (desfazer, nuvem/Estúdio) pode apagar a peça ou a face de malha.
  useEffect(() => {
    if (!faceTarget || facePaintCanvas(asset, faceTarget)) return
    setFaceTarget(null)
    showToast(COPY.editor.model.paint.faceEditor.stale)
  }, [asset, faceTarget, showToast])

  useModelThumbnail(editor, viewport, gestureBefore)

  // ── Ações ─────────────────────────────────────────────────────────────────

  const add = useCallback(
    (shape: ShapeId) => {
      const result = addPart(model(), shape, { nearId: session.getState().selectedId })
      if (!result) {
        showToast(COPY.editor.model.partsFull)
        return
      }
      commit(result.model)
      session.getState().select(result.partId)
    },
    [commit, model, session, showToast],
  )

  const startPlacement = useCallback(
    (shape: ShapeId) => {
      if (model().parts.length >= MOLDA_LIMITS.maxParts) {
        showToast(COPY.editor.model.partsFull)
        return
      }
      cancelSnapTool()
      session.getState().setPlacingShape(shape)
      showToast(COPY.editor.model.placeHint)
    },
    [cancelSnapTool, model, session, showToast],
  )

  // Duplicar/apagar valem para a seleção INTEIRA (a principal + as somadas).
  const duplicate = useCallback(() => {
    const state = session.getState()
    const ids = state.selectedId ? [state.selectedId, ...state.extraIds] : []
    if (ids.length === 0) return
    let next = model()
    const created: string[] = []
    for (const id of ids) {
      const result = duplicatePart(next, id)
      if (!result) break
      next = result.model
      created.push(result.partId)
    }
    if (created.length < ids.length) {
      showToast(
        next.parts.length >= MOLDA_LIMITS.maxParts
          ? COPY.editor.model.partsFull
          : COPY.editor.model.trianglesFull,
      )
    }
    if (created.length === 0) return
    commit(next)
    state.select(created[0] as string)
    if (created.length > 1) state.setExtraIds(created.slice(1))
  }, [commit, model, session, showToast])

  const remove = useCallback(() => {
    const state = session.getState()
    const ids = state.selectedId ? [state.selectedId, ...state.extraIds] : []
    if (ids.length === 0) return
    let next = model()
    for (const id of ids) next = removePart(next, id)
    commit(next)
    state.select(null)
  }, [commit, model, session])

  const selectedPartIds = useCallback((): string[] => {
    const state = session.getState()
    return state.selectedId ? [state.selectedId, ...state.extraIds] : []
  }, [session])

  const showArrangeFailure = useCallback(
    (result: Exclude<ArrangeResult, { ok: true }>) => {
      showToast(COPY.editor.model.arrange.errors[result.reason])
    },
    [showToast],
  )

  const arrangeSelection = useCallback(
    (run: (current: MoldaModelAsset, ids: readonly string[]) => ArrangeResult) => {
      const current = model()
      const result = run(current, selectedPartIds())
      if (!result.ok) {
        showArrangeFailure(result)
        return
      }
      commit(result.model)
    },
    [commit, model, selectedPartIds, showArrangeFailure],
  )

  const repeatSelection = useCallback(
    (value: RepeatAdjustmentValue) => {
      const active = repeatAdjustRef.current
      const adjusting = active && editor.getState().contentRevision === active.afterRevision
      const before = adjusting ? active.before : model()
      const sourceIds = adjusting ? active.sourceIds : selectedPartIds()
      const result = repeatPartsInLine(before, sourceIds, value)
      if (!result.ok) {
        showToast(COPY.editor.model.arrange.errors[result.reason])
        return
      }
      if (adjusting) editor.getState().amend(result.model)
      else commit(result.model)
      const state = session.getState()
      state.select(result.addedIds[0] ?? null)
      state.setExtraIds(result.addedIds.slice(1))
      const next: RepeatAdjustment = {
        before,
        afterRevision: editor.getState().contentRevision,
        sourceIds,
        addedIds: result.addedIds,
        value,
      }
      repeatAdjustRef.current = next
      setRepeatAdjust(next)
    },
    [commit, editor, model, selectedPartIds, session, showToast],
  )

  // Setas do teclado: um encaixe por toque (Shift = 5). No Editar malha empurram os
  // PONTOS escolhidos; fora dele, a seleção de peças (as trancadas ficam paradas).
  const nudge = useCallback(
    (steps: Vec3, repeat: boolean) => {
      const state = session.getState()
      const current = model()
      const delta: Vec3 = [
        steps[0] * current.snap,
        steps[1] * current.snap,
        steps[2] * current.snap,
      ]
      let next = current
      if (state.meshEditId) {
        const mesh = findPart(current, state.meshEditId)?.mesh
        if (!mesh) return
        const vertices = selectionVertices(mesh, state.meshSelection)
        if (vertices.length === 0) return
        next = moveMeshVertices(current, state.meshEditId, vertices, delta, current.snap)
      } else {
        if (!state.selectedId) return
        const ids = [state.selectedId, ...state.extraIds]
        next = movePartsBy(current, ids, delta)
        if (next === current && ids.every((id) => findPart(current, id)?.locked)) {
          showToast(COPY.editor.model.lockedHint)
        }
      }
      if (next === current) return
      // Toque ou tecla SEGURADA = um gesto só, do 1º keydown ao keyup (senão cada
      // repetição do teclado era um passo de desfazer e uma segurada de 2 s enchia o
      // histórico). Um toque novo depois de soltar abre outro gesto.
      if (!repeat) endNudge()
      if (!nudgeGesture.current) {
        closeColorGesture()
        nudgeGesture.current = { before: current }
      }
      editor.getState().replace(next)
    },
    [closeColorGesture, editor, endNudge, model, session, showToast],
  )

  const selectAllVertices = useCallback(() => {
    const state = session.getState()
    const part = state.meshEditId ? findPart(model(), state.meshEditId) : undefined
    if (!part?.mesh) return
    state.setMeshSelectMode('vertex')
    state.setMeshSelection(
      Object.keys(part.mesh.vertices).map((key) => ({ kind: 'vertex' as const, key })),
    )
  }, [model, session])

  const togglePartFlag = useCallback(
    (id: string, flag: 'locked' | 'hidden') => {
      const part = findPart(model(), id)
      if (!part) return
      const on = !part[flag]
      // Trancar/esconder a peça que está no Editar malha fecha a edição (o palco deixa de
      // enxergar a peça: seria um beco sem saída).
      if (on && session.getState().meshEditId === id) session.getState().exitMeshEdit()
      commit(updatePart(model(), id, { [flag]: on }))
    },
    [commit, model, session],
  )

  const toggleMirror = useCallback(() => {
    const current = model()
    const result = trySetMirrorX(current, !current.mirrorX)
    if (!result.ok) {
      showToast(
        result.reason === 'parts-full'
          ? COPY.editor.model.partsFull
          : COPY.editor.model.trianglesFull,
      )
      return
    }
    commit(result.model)
  }, [commit, model, showToast])

  const toggleSnap = useCallback(() => {
    const current = model()
    commit(setSnap(current, current.snap === 1 ? 0.5 : 1))
  }, [commit, model])

  // "Editar malha" / "Transformar em malha": a forma vira malha (um commit, com o aviso
  // das peles que não couberam) e a bancada abre a caixa de pontos/arestas/faces.
  const editMesh = useCallback(() => {
    cancelSnapTool()
    const state = session.getState()
    const id = state.selectedId
    const part = id ? findPart(model(), id) : undefined
    if (!id || !part || part.mirrorOf || state.mode !== 'build') return
    if (part.locked || part.hidden) {
      showToast(COPY.editor.model.lockedHint)
      return
    }
    if (part.shape === 'mesh') {
      state.enterMeshEdit(id)
      return
    }
    const result = boxToMesh(model(), id)
    if (!result) return
    commit(result.model)
    showToast(
      result.lostFaces.length > 0
        ? COPY.editor.model.mesh.convertedLostSkins(result.lostFaces.length)
        : COPY.editor.model.mesh.converted,
    )
    state.enterMeshEdit(id)
  }, [cancelSnapTool, commit, model, session, showToast])

  const deleteSelection = useCallback(() => {
    const state = session.getState()
    const id = state.meshEditId
    if (!id) return
    const before = model()
    const mesh = findPart(before, id)?.mesh
    if (!mesh) return
    const result = deleteMeshSelection(before, id, state.meshSelection)
    if (result.kind === 'updated') {
      commit(result.model)
      state.setMeshSelection([])
      warnMeshIssues(before, result.model, id)
    } else if (result.kind === 'empty') {
      state.exitMeshEdit()
      commit(removePart(model(), id))
      state.select(null)
      showToast(COPY.editor.model.mesh.emptied)
    }
  }, [commit, model, session, showToast, warnMeshIssues])

  const meshAdjustRef = useRef(meshAdjust)
  meshAdjustRef.current = meshAdjust
  const runMeshTool = useCallback(
    (
      run: (
        current: MoldaModelAsset,
        partId: string,
        selection: MeshPick[],
      ) => MeshToolResult | null,
      failure: string,
    ) => {
      const state = session.getState()
      const partId = state.meshEditId
      if (!partId) return null
      const before = model()
      const result = run(before, partId, state.meshSelection)
      if (!result) {
        showToast(failure)
        return null
      }
      commit(result.model)
      const nextMode = result.selection[0]?.kind
      if (nextMode) state.setMeshSelectMode(nextMode)
      state.setMeshSelection(result.selection)
      warnMeshIssues(before, result.model, partId)
      return { before, result }
    },
    [commit, model, session, showToast, warnMeshIssues],
  )
  const extrude = useCallback(() => {
    const state = session.getState()
    const partId = state.meshEditId
    const part = partId ? findPart(model(), partId) : undefined
    if (!partId || !part?.mesh) return
    const mesh = part.mesh
    const selection = state.meshSelection
    const kind =
      state.meshSelectMode === 'face'
        ? 'extrude-faces'
        : state.meshSelectMode === 'edge'
          ? 'extrude-edges'
          : null
    if (!kind) return
    const distance = model().snap
    const hasSelection =
      kind === 'extrude-faces'
        ? selectedFaces(mesh, selection).length > 0
        : selectedEdges(mesh, selection).length > 0
    const hasDirection = selectionNormal(mesh, selection) !== null
    const outcome = runMeshTool(
      (current, id, keys) =>
        kind === 'extrude-faces'
          ? extrudeFaces(current, id, selectedFaces(mesh, keys), distance)
          : extrudeEdges(current, id, selectedEdges(mesh, keys), distance),
      hasSelection && hasDirection
        ? COPY.editor.model.mesh.tooMany
        : COPY.editor.model.mesh.toolHints.extrude,
    )
    if (!outcome) return
    setMeshAdjust({
      before: outcome.before,
      afterRevision: editor.getState().contentRevision,
      partId,
      selection,
      kind,
      value: distance,
    })
  }, [editor, model, runMeshTool, session])
  const adjustMeshTool = useCallback(
    (value: number) => {
      const current = meshAdjustRef.current
      if (!current) return
      const result = replayMeshAdjustment(current, value)
      if (!result) return
      editor.getState().amend(result.model)
      session.getState().setMeshSelection(result.selection)
      setMeshAdjust({
        ...current,
        afterRevision: editor.getState().contentRevision,
        value,
      })
      warnMeshIssues(current.before, result.model, current.partId)
    },
    [editor, session, warnMeshIssues],
  )
  const loopCutSelection = useCallback(() => {
    let snapChanged = false
    let offGrid = false
    let hadEdge = false
    const outcome = runMeshTool((current, id, selection) => {
      const part = findPart(current, id)
      const edges = part?.mesh ? selectedEdges(part.mesh, selection) : []
      const edge = edges.length === 1 ? edges[0] : undefined
      if (!edge) return null
      hadEdge = true
      const result = loopCut(current, id, edge)
      snapChanged = result?.snapChanged ?? false
      offGrid = result?.offGrid ?? false
      return result
    }, COPY.editor.model.mesh.toolHints.loopCut)
    // Com UMA aresta escolhida e nada cortado, a razão é outra: não havia quad para atravessar.
    if (!outcome && hadEdge) showToast(COPY.editor.model.mesh.toolHints.loopCutQuad)
    if (outcome && snapChanged) showToast(COPY.editor.model.mesh.snapHalfOn)
    else if (outcome && offGrid) showToast(COPY.editor.model.mesh.cutOffGrid)
  }, [runMeshTool, showToast])
  const mergeSelection = useCallback(
    () =>
      runMeshTool((current, id, selection) => {
        const mesh = findPart(current, id)?.mesh
        return mesh ? mergeVertices(current, id, selectionVertices(mesh, selection)) : null
      }, COPY.editor.model.mesh.toolHints.merge),
    [runMeshTool],
  )
  const closeFace = useCallback(() => {
    const state = session.getState()
    const part = state.meshEditId ? findPart(model(), state.meshEditId) : undefined
    const vertices = part?.mesh ? selectionVertices(part.mesh, state.meshSelection) : []
    const wanted = new Set(vertices)
    const exists = Object.values(part?.mesh?.faces ?? {}).some(
      (face) => face.v.length === wanted.size && face.v.every((vertex) => wanted.has(vertex)),
    )
    runMeshTool(
      (current, id) => createFace(current, id, vertices),
      exists
        ? COPY.editor.model.mesh.toolHints.faceExists
        : COPY.editor.model.mesh.toolHints.createFace,
    )
  }, [model, runMeshTool, session])
  const connectSelection = useCallback(() => {
    runMeshTool((current, id, selection) => {
      const mesh = findPart(current, id)?.mesh
      return mesh ? connectVertices(current, id, selectionVertices(mesh, selection)) : null
    }, COPY.editor.model.mesh.toolHints.connect)
  }, [runMeshTool])
  const insetSelection = useCallback(() => {
    const state = session.getState()
    const partId = state.meshEditId
    const part = partId ? findPart(model(), partId) : undefined
    if (!partId || !part?.mesh) return
    const faces = selectedFaces(part.mesh, state.meshSelection)
    const faceKey = faces.length === 1 ? faces[0] : undefined
    if (!faceKey) {
      showToast(COPY.editor.model.mesh.toolHints.inset)
      return
    }
    const value = 25
    const selection = [...state.meshSelection]
    const outcome = runMeshTool(
      (current, id) => insetFace(current, id, faceKey, value),
      canInsetFace(part.mesh, faceKey)
        ? COPY.editor.model.mesh.tooMany
        : COPY.editor.model.mesh.toolHints.inset,
    )
    if (!outcome) return
    setMeshAdjust({
      before: outcome.before,
      afterRevision: editor.getState().contentRevision,
      partId,
      selection,
      kind: 'inset',
      value,
      faceKey,
    })
  }, [editor, model, runMeshTool, session, showToast])
  const flipSelection = useCallback(
    () =>
      runMeshTool((current, id, selection) => {
        const part = findPart(current, id)
        return flipFaces(current, id, part?.mesh ? selectedFaces(part.mesh, selection) : [])
      }, COPY.editor.model.mesh.toolHints.flip),
    [runMeshTool],
  )
  const splitSelection = useCallback(
    () =>
      runMeshTool((current, id, selection) => {
        const part = findPart(current, id)
        return splitQuads(current, id, part?.mesh ? selectedFaces(part.mesh, selection) : [])
      }, COPY.editor.model.mesh.toolHints.split),
    [runMeshTool],
  )
  // O "Ajustar" morre quando qualquer outra coisa muda o modelo (ou a edição fecha).
  useEffect(() => {
    if (meshAdjust && (!meshEditId || contentRevision !== meshAdjust.afterRevision)) {
      setMeshAdjust(null)
    }
  }, [contentRevision, meshAdjust, meshEditId])
  useEffect(() => {
    if (repeatAdjust && contentRevision !== repeatAdjust.afterRevision) {
      repeatAdjustRef.current = null
      setRepeatAdjust(null)
    }
  }, [contentRevision, repeatAdjust])

  const openApplyTexture = useCallback(() => {
    if (!session.getState().selectedId) {
      showToast(COPY.editor.model.paint.apply.selectPart)
      return
    }
    setApplyOpen(true)
  }, [session, showToast])

  const applyTexture = useCallback(
    (texture: MoldaTextureAsset, mode: ApplyMode) => {
      const id = session.getState().selectedId
      setApplyOpen(false)
      if (!id) return
      commit(applyTextureToPart(model(), id, texture, mode))
      showToast(COPY.editor.model.paint.apply.applied)
    },
    [commit, model, session, showToast],
  )

  const download = useCallback(() => {
    const result = exportModelGlb(model())
    if (!result.ok) {
      const copy = COPY.editor.model
      showToast(
        result.reason === 'empty'
          ? copy.download.empty
          : result.reason === 'atlas-full'
            ? copy.paint.atlasFull
            : copy.download.tooBig,
      )
      return
    }
    const blob = new Blob([result.bytes as BlobPart], { type: GLB_MIME })
    if (triggerDownload(blob, `${model().name}.glb`, GLB_MIME)) {
      showToast(COPY.editor.model.download.ready)
    } else {
      showToast(COPY.editor.model.download.failed)
    }
  }, [model, showToast])

  useModelEditorShortcuts({
    session,
    add,
    duplicate,
    remove,
    toggleMirror,
    editMesh,
    deleteMeshSelection: deleteSelection,
    nudge,
    endNudge,
    selectAllVertices,
    toggleSnap: toggleSnapTool,
    cancelSnap: cancelSnapTool,
  })

  const selectedPart = selectedId ? (findPart(asset, selectedId) ?? null) : null
  const meshEditPart = meshEditId ? (findPart(asset, meshEditId) ?? null) : null
  const meshEditMesh = meshEditPart?.mesh
  const meshSelectedEdges = meshEditMesh ? selectedEdges(meshEditMesh, meshSelection) : []
  const meshSelectedFaces = meshEditMesh ? selectedFaces(meshEditMesh, meshSelection) : []
  const meshSelectedCount =
    meshSelectMode === 'vertex'
      ? meshVertices.length
      : meshSelectMode === 'edge'
        ? meshSelectedEdges.length
        : meshSelectedFaces.length
  const wantedFace = new Set(meshVertices)
  const meshFaceAlreadyExists = Object.values(meshEditMesh?.faces ?? {}).some(
    (face) => face.v.length === wantedFace.size && face.v.every((vertex) => wantedFace.has(vertex)),
  )
  const meshCommands: Record<MeshCommandId, MeshCommandState> = {
    merge: {
      enabled: meshVertices.length >= 2,
      disabledMessage: COPY.editor.model.mesh.toolHints.merge,
      run: mergeSelection,
    },
    createFace: {
      enabled: meshVertices.length >= 3 && meshVertices.length <= 4 && !meshFaceAlreadyExists,
      disabledMessage: meshFaceAlreadyExists
        ? COPY.editor.model.mesh.toolHints.faceExists
        : COPY.editor.model.mesh.toolHints.createFace,
      run: closeFace,
    },
    connect: {
      enabled: meshEditMesh ? canConnectVertices(meshEditMesh, meshVertices) : false,
      disabledMessage: COPY.editor.model.mesh.toolHints.connect,
      run: connectSelection,
    },
    extrudeEdges: {
      enabled: meshSelectedEdges.length > 0,
      disabledMessage: COPY.editor.model.mesh.toolHints.extrudeEdges,
      run: extrude,
    },
    loopCut: {
      enabled: meshSelectedEdges.length === 1,
      disabledMessage: COPY.editor.model.mesh.toolHints.loopCut,
      run: loopCutSelection,
    },
    extrudeFaces: {
      enabled: meshSelectedFaces.length > 0,
      disabledMessage: COPY.editor.model.mesh.toolHints.extrudeFaces,
      run: extrude,
    },
    inset: {
      enabled: Boolean(
        meshEditMesh &&
          meshSelectedFaces.length === 1 &&
          canInsetFace(meshEditMesh, meshSelectedFaces[0]),
      ),
      disabledMessage: COPY.editor.model.mesh.toolHints.inset,
      run: insetSelection,
    },
    flip: {
      enabled: meshSelectedFaces.length > 0,
      disabledMessage: COPY.editor.model.mesh.toolHints.flip,
      run: flipSelection,
    },
    split: {
      enabled: meshSelectedFaces.some((key) => meshEditMesh?.faces[key]?.v.length === 4),
      disabledMessage: COPY.editor.model.mesh.toolHints.split,
      run: splitSelection,
    },
  }
  const helpContext: ModelCommandContext = meshEditId ? `mesh-${meshSelectMode}` : mode
  const helpStates: Partial<Record<ModelCommandId, RegistryCommandState>> = {}
  const chosenIds = selectedPartIds()
  const hasChosenParts = chosenIds.length > 0
  const chosenPartsLocked = chosenIds.some((id) => findPart(asset, id)?.locked)
  const noSelectionReason = COPY.editor.model.noSelection
  const partsFull = asset.parts.length >= MOLDA_LIMITS.maxParts
  helpStates['part.duplicate'] = {
    enabled: hasChosenParts && !partsFull,
    disabledReason: partsFull ? COPY.editor.model.partsFull : noSelectionReason,
    run: duplicate,
  }
  helpStates['part.remove'] = {
    enabled: hasChosenParts,
    disabledReason: noSelectionReason,
    run: remove,
  }
  helpStates['part.mesh'] = {
    enabled: Boolean(selectedPart && !selectedPart.locked && !selectedPart.hidden),
    disabledReason: selectedPart ? COPY.editor.model.lockedHint : noSelectionReason,
    run: editMesh,
  }
  for (const id of [
    'arrange.floor',
    'arrange.center',
    'arrange.align-x',
    'arrange.align-y',
    'arrange.align-z',
  ] as const) {
    const isAlign = id.startsWith('arrange.align-')
    helpStates[id] = {
      enabled: hasChosenParts && !chosenPartsLocked && (!isAlign || chosenIds.length >= 2),
      disabledReason: chosenPartsLocked
        ? COPY.editor.model.arrange.errors.locked
        : isAlign && hasChosenParts
          ? COPY.editor.model.arrange.alignSelection
          : noSelectionReason,
      run: () => undefined,
    }
  }
  helpStates['arrange.repeat'] = {
    enabled: hasChosenParts,
    disabledReason: noSelectionReason,
    run: () => undefined,
  }
  helpStates['mesh.delete'] = {
    enabled: meshSelectedCount > 0,
    disabledReason: COPY.editor.model.mesh.nothingSelected,
    run: deleteSelection,
  }
  for (const [id, command] of Object.entries(meshCommands) as [MeshCommandId, MeshCommandState][]) {
    helpStates[MESH_ACTION_COMMAND[id]] = {
      enabled: command.enabled,
      disabledReason: command.disabledMessage,
      run: command.run,
    }
  }
  const helpCommands = contextualModelCommands(helpContext, helpStates)
  const meshAdjustProps: MeshAdjust | null = meshAdjust
    ? meshAdjust.kind === 'inset'
      ? {
          label: COPY.editor.model.mesh.insetAmount,
          short: '%',
          value: meshAdjust.value,
          step: 5,
          min: 10,
          max: 80,
          onValue: adjustMeshTool,
        }
      : {
          label: COPY.editor.model.mesh.distance,
          value: meshAdjust.value,
          step: asset.snap,
          min: asset.snap,
          max: MOLDA_LIMITS.maxPartSize,
          onValue: adjustMeshTool,
        }
    : null
  const triangles = modelTriangleCount(asset)
  // Acima de metade do teto de triângulos (a malha é quem chega lá) o status mostra o teto.
  const statusBase =
    triangles > MOLDA_LIMITS.maxTriangles / 2
      ? `${COPY.editor.model.partsCount(asset.parts.length, MOLDA_LIMITS.maxParts)} peças · ${COPY.editor.model.statusTriangles(triangles, MOLDA_LIMITS.maxTriangles)}`
      : COPY.editor.model.status(asset.parts.length, MOLDA_LIMITS.maxParts, triangles)
  const status =
    atlas && atlas.size > 0
      ? `${statusBase} · ${COPY.editor.model.statusAtlas(atlas.size)}`
      : statusBase
  const onView = useCallback((view: ViewName) => viewport?.setView(view), [viewport])

  const panels = useMemo(
    () => (
      <>
        <PartsPanel
          model={asset}
          selectedId={selectedId}
          extraIds={extraIds}
          additive={partsAdditive}
          onSelect={(id) => {
            cancelSnapTool()
            session.getState().select(id)
          }}
          onToggle={(id) => {
            cancelSnapTool()
            session.getState().toggleExtra(id)
          }}
          onLock={(id) => togglePartFlag(id, 'locked')}
          onHide={(id) => togglePartFlag(id, 'hidden')}
          className="max-h-64 shrink-0"
        />
        <ColorsPanel
          palette={asset}
          activeIndex={mode === 'paint' ? paintColor : (selectedPart?.color ?? null)}
          canPick={mode === 'paint' || selectedPart !== null}
          onPick={(index) => {
            if (mode === 'paint') {
              session.getState().setPaintColor(index)
              return
            }
            if (selectedPart) commit(updatePart(model(), selectedPart.id, { color: index }))
          }}
          onAddColor={(hex) => {
            // GESTO do seletor nativo: cada passo do arrasto chega aqui. O 1º cria a extra (ou
            // só escolhe a cor, se ela já existe); os seguintes TROCAM a cor dessa extra no
            // lugar, ao vivo (`replace`); `onAddColorEnd` fecha tudo com UM desfazer.
            const gesture = colorGesture.current ?? { before: model(), index: null, full: false }
            colorGesture.current = gesture
            if (gesture.full) return
            if (gesture.index !== null) {
              const existing = resolvePaletteColors(model()).indexOf(hex)
              if (existing >= 0 && existing !== gesture.index) {
                // A cor escolhida JÁ existe (fixa ou outra extra): a extra deste gesto sai e a
                // peça/lápis passa a apontar para a existente (a mesma decisão do 1º passo).
                // Ignorar o passo deixava a extra com a cor ANTERIOR à escolhida.
                let next = removeExtraColor(model(), gesture.index) ?? model()
                if (mode === 'paint') session.getState().setPaintColor(existing)
                else if (selectedPart) {
                  next = updatePart(next, selectedPart.id, { color: existing })
                }
                if (next !== model()) editor.getState().replace(next)
                gesture.index = null
                return
              }
              const next = updateExtraColor(model(), gesture.index, hex)
              if (next !== model()) editor.getState().replace(next)
              return
            }
            const current = model()
            const result = addExtraColor(current, hex)
            if (!result) {
              gesture.full = true
              showToast(COPY.editor.model.colorsFull)
              return
            }
            let next = result.model
            if (mode === 'paint') session.getState().setPaintColor(result.index)
            else if (selectedPart) next = updatePart(next, selectedPart.id, { color: result.index })
            if (next !== current) editor.getState().replace(next)
            // Só uma extra CRIADA vira o alvo do gesto: cor que já existia (fixa ou extra de
            // outra peça) não pode ser trocada por tabela.
            if (result.model !== current) gesture.index = result.index
          }}
          onAddColorEnd={closeColorGesture}
          onRemoveColor={(index) => {
            const next = removeExtraColor(model(), index)
            if (!next) {
              showToast(COPY.editor.model.paint.removeColorBase)
              return
            }
            commit(next)
            const active = session.getState().paintColor
            session
              .getState()
              .setPaintColor(
                remapActiveColorAfterRemoval(active, index, resolvePaletteColors(next)),
              )
            showToast(COPY.editor.model.paint.removedColor)
          }}
          onPalette={(id: PaletteId) => {
            const { customPalette: _customPalette, ...current } = model()
            commit({ ...current, paletteId: id })
          }}
          className="shrink-0"
        />
        <PropertiesPanel
          model={asset}
          part={selectedPart}
          onRename={(name) => {
            if (selectedPart) commit(updatePart(model(), selectedPart.id, { name }))
          }}
          onMoveTo={(from: Vec3) => {
            if (!selectedPart) return
            const delta: Vec3 = [
              from[0] - selectedPart.from[0],
              from[1] - selectedPart.from[1],
              from[2] - selectedPart.from[2],
            ]
            commit(movePartBy(model(), selectedPart.id, delta))
          }}
          onResize={(size: Vec3) => {
            if (selectedPart) commit(setPartSize(model(), selectedPart.id, size))
          }}
          onRotate={(rotation: Vec3) => {
            if (selectedPart) commit(updatePart(model(), selectedPart.id, { rotation }))
          }}
          onPivot={(origin) => {
            if (selectedPart) commit(updatePart(model(), selectedPart.id, { origin }))
          }}
          extraCount={extraIds.length}
          className="shrink-0"
        />
        {mode === 'build' && selectedPart && !meshEditId ? (
          <ArrangePanel
            repeat={repeatAdjust?.value ?? null}
            selectedCount={chosenIds.length}
            movementLocked={chosenPartsLocked}
            onFloor={() => arrangeSelection(putPartsOnFloor)}
            onCenter={() => arrangeSelection(centerPartsOnStage)}
            onAlign={(axis) => arrangeSelection((current, ids) => alignParts(current, ids, axis))}
            onRepeat={repeatSelection}
          />
        ) : null}
      </>
    ),
    [
      asset,
      selectedId,
      extraIds,
      partsAdditive,
      selectedPart,
      session,
      commit,
      model,
      showToast,
      mode,
      paintColor,
      editor,
      togglePartFlag,
      closeColorGesture,
      meshEditId,
      repeatAdjust,
      cancelSnapTool,
      arrangeSelection,
      repeatSelection,
      chosenIds.length,
      chosenPartsLocked,
    ],
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EditorTopBar
        editor={editor}
        onBack={onBack}
        center={
          <ModeTabs
            mode={mode}
            onMode={(next) => {
              cancelSnapTool()
              setFaceTarget(null)
              session.getState().setMode(next)
              if (next === 'paint') session.getState().setPlacingShape(null)
            }}
          />
        }
        actions={
          <>
            <ToolButton
              icon={CircleHelp}
              label={COPY.editor.model.help.button}
              onClick={() => setHelpOpen(true)}
            />
            <Button
              variant="outline"
              onClick={download}
              aria-label={COPY.editor.model.download.glb}
              title={COPY.editor.model.download.glb}
              className="min-h-11 px-3 text-sm"
            >
              <Download aria-hidden="true" className="size-4" />
              <span className="hidden md:inline">{COPY.editor.model.download.glb}</span>
            </Button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1">
        {mode === 'paint' ? (
          <PaintToolbox
            tool={paintTool}
            onTool={(next: PaintTool) => session.getState().setPaintTool(next)}
            size={brushSize}
            onSize={(next: BrushSize) => session.getState().setBrushSize(next)}
            mirror={mirrorPaint}
            onToggleMirror={() => session.getState().toggleMirrorPaint()}
            texelsPerUnit={asset.texelsPerUnit}
            onTexels={(value: TexelsPerUnit) => commit(setTexelsPerUnit(model(), value))}
            onApplyTexture={openApplyTexture}
          />
        ) : meshEditPart?.mesh ? (
          <MeshToolbox
            mode={meshSelectMode}
            onMode={(next) => session.getState().setMeshSelectMode(next)}
            additive={meshAdditive}
            onToggleAdditive={() => session.getState().toggleMeshAdditive()}
            selectedCount={meshSelectedCount}
            commands={meshCommands}
            adjust={meshAdjustProps}
            onDeleteSelection={deleteSelection}
            onDone={() => session.getState().exitMeshEdit()}
          />
        ) : (
          <Toolbox
            tool={tool}
            onTool={(next: TransformTool) => {
              session.getState().setPlacingShape(null)
              chooseTool(next)
            }}
            onAdd={startPlacement}
            placingShape={placingShape}
            onDuplicate={duplicate}
            onRemove={remove}
            hasSelection={selectedPart !== null}
            partsFull={asset.parts.length >= MOLDA_LIMITS.maxParts}
            mirrorX={asset.mirrorX}
            onToggleMirror={toggleMirror}
            snapHalf={asset.snap === 0.5}
            onToggleSnap={toggleSnap}
            selectedIsMesh={selectedPart?.shape === 'mesh'}
            onEditMesh={editMesh}
            partsAdditive={partsAdditive}
            onTogglePartsAdditive={() => session.getState().togglePartsAdditive()}
          />
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ViewportPane
            canvasRef={canvasRef}
            unsupported={unsupported}
            onView={onView}
            gridVisible={gridVisible}
            onToggleGrid={() => session.getState().toggleGrid()}
            edgesVisible={edgesVisible}
            onToggleEdges={() => session.getState().toggleEdges()}
            status={status}
            snapInstruction={snapInstruction}
          />
          {!wide ? (
            <details className="max-h-72 shrink-0 overflow-y-auto border-t-2 border-mld-border bg-mld-surface">
              <summary className="min-h-11 cursor-pointer px-3 py-2 text-sm font-bold text-mld-text">
                {COPY.editor.model.panelsToggle}
              </summary>
              <div className="flex flex-col gap-2 p-2">{panels}</div>
            </details>
          ) : null}
        </div>
        {wide ? (
          <aside className="mld-scroll-y flex w-68 shrink-0 flex-col gap-2 overflow-y-auto border-l-2 border-mld-border bg-mld-bg p-2">
            {panels}
          </aside>
        ) : null}
      </div>
      <ApplyTextureDialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onApply={applyTexture}
      />
      <ContextHelpDialog
        open={helpOpen}
        context={helpContext}
        commands={helpCommands}
        onClose={() => setHelpOpen(false)}
      />
      <FacePaintDialog
        editor={editor}
        target={faceTarget}
        color={paintColor}
        brushSize={brushSize}
        mirror={mirrorPaint}
        onColor={(index) => session.getState().setPaintColor(index)}
        onBrushSize={(size) => session.getState().setBrushSize(size)}
        onToggleMirror={() => session.getState().toggleMirrorPaint()}
        onClose={() => setFaceTarget(null)}
      />
    </div>
  )
}
