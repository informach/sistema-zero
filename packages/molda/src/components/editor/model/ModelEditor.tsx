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
  MoldaMesh,
  MoldaModelAsset,
  MoldaTextureAsset,
  ShapeId,
  Vec3,
} from '../../../core/model'
import type { PaletteId } from '../../../core/palette'
import { firstPaintableIndex } from '../../../core/palette'
import { resolvePaletteColors } from '../../../core/sanitize'
import { triggerDownload } from '../../../export/download'
import { exportModelGlb, GLB_MIME } from '../../../export/modelGlb'
import { modelTriangleCount } from '../../../model/geometry'
import { type MeshIssue, meshIssues } from '../../../model/mesh'
import { deleteMeshSelection, moveMeshVertices } from '../../../model/meshOps'
import {
  mergeMeshSelection,
  pickVertices,
  pruneMeshSelection,
  selectedEdges,
  selectedFaces,
} from '../../../model/meshSelection'
import {
  applyMeshFix,
  createFace,
  extrudeEdges,
  extrudeFaces,
  flipFaces,
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
  setMirrorX,
  setPartBox,
  setPartSize,
  setSnap,
  setTexelsPerUnit,
  updateExtraColor,
  updatePart,
} from '../../../model/partOps'
import type { BrushSize } from '../../../paint/skinPaint'
import type { PaintTool } from '../../../paint/stroke'
import type { EditorStore } from '../../../state/editorStore'
import {
  createSessionStore,
  type EditorMode,
  type TransformTool,
} from '../../../state/sessionStore'
import { type ApplyMode, applyTextureToPart } from '../../../texture/ops'
import { prefersReducedMotion } from '../../../viewport/reducedMotion'
import type { AtlasInfo, DragPatch, ViewName } from '../../../viewport/types'
import { useViewport } from '../../../viewport/useViewport'
import { Button } from '../../ui/Button'
import { Download } from '../../ui/icons'
import { useToast } from '../../ui/Toast'
import { useMediaQuery } from '../../ui/useMediaQuery'
import { EditorTopBar } from '../EditorTopBar'
import { ApplyTextureDialog } from './ApplyTextureDialog'
import { ColorsPanel } from './ColorsPanel'
import { type MeshAdjust, MeshToolbox } from './MeshToolbox'
import { useModelEditorShortcuts, useModelThumbnail } from './modelEditorHooks'
import { PaintToolbox } from './PaintToolbox'
import { PartsPanel } from './PartsPanel'
import { PropertiesPanel } from './PropertiesPanel'
import { Toolbox } from './Toolbox'
import { ViewportPane } from './ViewportPane'

function issueKey(issue: MeshIssue): string {
  return issue.kind === 'overlap'
    ? `${issue.kind}:${issue.vertices.join(',')}`
    : `${issue.kind}:${issue.face}`
}

function applyPatch(model: MoldaModelAsset, patch: DragPatch): MoldaModelAsset {
  let next = model
  // Grupo: cada peça leva a própria caixa de DESTINO (absoluta: nada acumula entre passos).
  for (const item of patch.parts ?? []) next = setPartBox(next, item.id, item.from, item.to)
  if (patch.from && patch.to) next = setPartBox(next, patch.id, patch.from, patch.to)
  if (patch.rotation) next = updatePart(next, patch.id, { rotation: patch.rotation })
  return next
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
  const meshVertices = useStore(session, (state) => state.meshVertices)
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
  const [atlas, setAtlas] = useState<AtlasInfo | null>(null)
  const atlasFullWarned = useRef(false)
  const [applyOpen, setApplyOpen] = useState(false)
  // O "Ajustar" do último Puxar: reexecuta sobre o `before` (um passo só no desfazer).
  const [meshAdjust, setMeshAdjust] = useState<{
    before: MoldaModelAsset
    afterParts: MoldaModelAsset['parts']
    partId: string
    selection: string[]
    byFaces: boolean
    distance: number
  } | null>(null)

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
      // As ações valem para o estado que gerou o aviso: se o modelo mudou (a criança
      // pintou, desfez, mexeu em outra coisa), o botão não mexe em nada e avisa.
      // O commit carimba `updatedAt` (objeto novo) mas preserva a referência de `parts`.
      const still = (): boolean =>
        (editor.getState().asset as MoldaModelAsset).parts === after.parts
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
            session.getState().setMeshVertices(result.vertices)
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

  const { canvasRef, viewport, unsupported } = useViewport(
    {
      onSelect: (id, additive) => {
        const state = session.getState()
        // No Pintar o toque só ESCOLHE a peça (o "Somar à seleção" é do Montar).
        if (state.mode === 'paint') {
          state.select(id)
          return
        }
        state.pick(id, additive || state.partsAdditive)
      },
      onPlace: placeAtSurface,
      onDragStart: () => {
        closeColorGesture()
        endNudge()
        gestureBefore.current = model()
      },
      onDragMove: (patch) => {
        const current = model()
        const next = applyPatch(current, patch)
        if (next !== current) editor.getState().replace(next)
      },
      onDragEnd: (patch) => {
        const before = gestureBefore.current
        gestureBefore.current = null
        let after = model()
        if (patch) after = applyPatch(after, patch)
        if (before && after !== before) editor.getState().commitGesture(before, after)
      },
      onPaintStart: () => {
        closeColorGesture()
        endNudge()
        gestureBefore.current = model()
      },
      onPaintEnd: (after) => {
        const before = gestureBefore.current ?? model()
        gestureBefore.current = null
        if (after !== before) editor.getState().commitGesture(before, after)
      },
      onPickColor: (index) => session.getState().setPaintColor(index),
      // "Editar malha": o toque vira vértices (a lista mestra) e o arrasto da alça é um
      // gesto sobre a BASE (delta total, sem deriva), fechado com um desfazer só.
      onMeshPick: (pick, additive) => {
        const state = session.getState()
        const part = state.meshEditId ? findPart(model(), state.meshEditId) : undefined
        if (!part?.mesh) return
        const picked = pick ? pickVertices(part.mesh, pick) : []
        state.setMeshVertices(
          mergeMeshSelection(state.meshVertices, picked, additive || state.meshAdditive),
        )
      },
      onMeshDragStart: () => {
        closeColorGesture()
        endNudge()
        gestureBefore.current = model()
      },
      onMeshDragMove: (delta) => {
        const before = gestureBefore.current
        const state = session.getState()
        if (!before || !state.meshEditId) return
        const next = moveMeshVertices(
          before,
          state.meshEditId,
          state.meshVertices,
          delta,
          before.snap,
        )
        // Delta de pelo menos um encaixe que não moveu nada = a grade barrou.
        const step = before.snap
        const wanted = delta.some((value) => Math.abs(Math.round(value / step) * step) > 0)
        if (next === before && wanted) meshDragBlocked.current = true
        if (next !== model()) editor.getState().replace(next)
      },
      onMeshDragEnd: () => {
        const before = gestureBefore.current
        gestureBefore.current = null
        const after = model()
        const blocked = meshDragBlocked.current
        meshDragBlocked.current = false
        if (before && after !== before) {
          editor.getState().commitGesture(before, after)
          warnMeshIssues(before, after, session.getState().meshEditId)
        } else if (before && blocked) {
          showToast(COPY.editor.model.mesh.cannotMove)
        }
      },
      onAtlas: (info) => {
        setAtlas(info)
        if (info.full && !atlasFullWarned.current) {
          atlasFullWarned.current = true
          showToast(COPY.editor.model.paint.atlasFull)
        }
        if (!info.full) atlasFullWarned.current = false
      },
    },
    { reducedMotion: prefersReducedMotion() },
  )

  // Palco ← estado.
  useEffect(() => {
    viewport?.setModel(asset)
  }, [viewport, asset])
  useEffect(() => {
    viewport?.setSelected(selectedId)
  }, [viewport, selectedId])
  useEffect(() => {
    viewport?.setMode(mode)
  }, [viewport, mode])
  useEffect(() => {
    viewport?.setTool(tool)
  }, [viewport, tool])
  useEffect(() => {
    viewport?.setPlacementShape(placingShape)
  }, [viewport, placingShape])
  useEffect(() => {
    viewport?.setPaint({ tool: paintTool, color: paintColor, size: brushSize, mirror: mirrorPaint })
  }, [viewport, paintTool, paintColor, brushSize, mirrorPaint])
  useEffect(() => {
    viewport?.setSnap(asset.snap)
  }, [viewport, asset.snap])
  useEffect(() => {
    viewport?.setGridVisible(gridVisible)
  }, [viewport, gridVisible])

  useEffect(() => {
    viewport?.setEdgesVisible(edgesVisible)
  }, [viewport, edgesVisible])
  useEffect(() => {
    viewport?.setExtraSelected(extraIds)
  }, [viewport, extraIds])

  // Seleção que sumiu (apagada, desfeita) volta a "nada"; as somadas são podadas.
  useEffect(() => {
    if (selectedId && !findPart(asset, selectedId)) session.getState().select(null)
    const alive = extraIds.filter((id) => findPart(asset, id))
    if (alive.length !== extraIds.length) session.getState().setExtraIds(alive)
  }, [asset, selectedId, extraIds, session])

  // Palco ← "Editar malha"; e a seleção de vértices acompanha a malha (um desfazer
  // pode tirar vértices dela; uma peça que deixou de ser malha fecha a edição).
  useEffect(() => {
    viewport?.setMeshEdit(
      meshEditId ? { partId: meshEditId, mode: meshSelectMode, vertices: meshVertices } : null,
    )
  }, [viewport, meshEditId, meshSelectMode, meshVertices])
  useEffect(() => {
    const state = session.getState()
    if (!state.meshEditId) return
    const part = findPart(asset, state.meshEditId)
    if (!part?.mesh) {
      state.exitMeshEdit()
      return
    }
    const pruned = pruneMeshSelection(part.mesh, state.meshVertices)
    if (pruned.length !== state.meshVertices.length) state.setMeshVertices(pruned)
  }, [asset, session])

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
      session.getState().setPlacingShape(shape)
      showToast(COPY.editor.model.placeHint)
    },
    [model, session, showToast],
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
        if (state.meshVertices.length === 0) return
        next = moveMeshVertices(current, state.meshEditId, state.meshVertices, delta, current.snap)
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
    state.setMeshVertices(Object.keys(part.mesh.vertices))
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
    commit(setMirrorX(current, !current.mirrorX))
  }, [commit, model])

  const toggleSnap = useCallback(() => {
    const current = model()
    commit(setSnap(current, current.snap === 1 ? 0.5 : 1))
  }, [commit, model])

  // "Editar malha" / "Transformar em malha": a forma vira malha (um commit, com o aviso
  // das peles que não couberam) e a bancada abre a caixa de pontos/arestas/faces.
  const editMesh = useCallback(() => {
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
  }, [commit, model, session, showToast])

  const deleteSelection = useCallback(() => {
    const state = session.getState()
    const id = state.meshEditId
    if (!id) return
    const before = model()
    const result = deleteMeshSelection(before, id, state.meshVertices, state.meshSelectMode)
    if (result.kind === 'updated') {
      commit(result.model)
      state.setMeshVertices([])
      warnMeshIssues(before, result.model, id)
    } else if (result.kind === 'empty') {
      state.exitMeshEdit()
      commit(removePart(model(), id))
      state.select(null)
      showToast(COPY.editor.model.mesh.emptied)
    }
  }, [commit, model, session, showToast, warnMeshIssues])

  const meshDragBlocked = useRef(false)
  const meshAdjustRef = useRef(meshAdjust)
  meshAdjustRef.current = meshAdjust
  const runMeshTool = useCallback(
    (
      run: (current: MoldaModelAsset, partId: string, selection: string[]) => MeshToolResult | null,
      failure: string,
    ) => {
      const state = session.getState()
      const partId = state.meshEditId
      if (!partId) return null
      const before = model()
      const result = run(before, partId, state.meshVertices)
      if (!result) {
        showToast(failure)
        return null
      }
      commit(result.model)
      state.setMeshVertices(result.vertices)
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
    const selection = state.meshVertices
    const byFaces = selectedFaces(part.mesh, selection).length > 0
    const distance = model().snap
    const outcome = runMeshTool(
      (current, id, keys) =>
        byFaces
          ? extrudeFaces(current, id, keys, distance)
          : extrudeEdges(current, id, keys, distance),
      byFaces || selectedEdges(part.mesh, selection).length > 0
        ? COPY.editor.model.mesh.tooMany
        : COPY.editor.model.mesh.toolHints.extrude,
    )
    if (!outcome) return
    setMeshAdjust({
      before: outcome.before,
      afterParts: outcome.result.model.parts,
      partId,
      selection,
      byFaces,
      distance,
    })
  }, [model, runMeshTool, session])
  const adjustDistance = useCallback(
    (distance: number) => {
      const current = meshAdjustRef.current
      if (!current) return
      const result = (current.byFaces ? extrudeFaces : extrudeEdges)(
        current.before,
        current.partId,
        current.selection,
        distance,
      )
      if (!result) return
      editor.getState().amend(result.model)
      session.getState().setMeshVertices(result.vertices)
      setMeshAdjust({ ...current, afterParts: result.model.parts, distance })
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
    () => runMeshTool(mergeVertices, COPY.editor.model.mesh.toolHints.merge),
    [runMeshTool],
  )
  const closeFace = useCallback(() => {
    const state = session.getState()
    const part = state.meshEditId ? findPart(model(), state.meshEditId) : undefined
    const wanted = new Set(state.meshVertices)
    const exists = Object.values(part?.mesh?.faces ?? {}).some(
      (face) => face.v.length === wanted.size && face.v.every((vertex) => wanted.has(vertex)),
    )
    runMeshTool(
      createFace,
      exists
        ? COPY.editor.model.mesh.toolHints.faceExists
        : COPY.editor.model.mesh.toolHints.createFace,
    )
  }, [model, runMeshTool, session])
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
    if (meshAdjust && (!meshEditId || asset.parts !== meshAdjust.afterParts)) setMeshAdjust(null)
  }, [asset, meshAdjust, meshEditId])

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
  })

  const selectedPart = selectedId ? (findPart(asset, selectedId) ?? null) : null
  const meshEditPart = meshEditId ? (findPart(asset, meshEditId) ?? null) : null
  const meshSelectedEdges = meshEditPart?.mesh ? selectedEdges(meshEditPart.mesh, meshVertices) : []
  const meshSelectedFaces = meshEditPart?.mesh ? selectedFaces(meshEditPart.mesh, meshVertices) : []
  const meshSelectedCount =
    meshSelectMode === 'vertex'
      ? meshVertices.length
      : meshSelectMode === 'edge'
        ? meshSelectedEdges.length
        : meshSelectedFaces.length
  const meshAdjustProps: MeshAdjust | null = meshAdjust
    ? { distance: meshAdjust.distance, snap: asset.snap, onDistance: adjustDistance }
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
          onSelect={(id) => session.getState().select(id)}
          onToggle={(id) => session.getState().toggleExtra(id)}
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
            if (session.getState().paintColor >= index) session.getState().setPaintColor(1)
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
              session.getState().setMode(next)
              if (next === 'paint') session.getState().setPlacingShape(null)
            }}
          />
        }
        actions={
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
            canExtrude={meshSelectedFaces.length > 0 || meshSelectedEdges.length > 0}
            canLoopCut={meshSelectedEdges.length === 1}
            canMerge={meshVertices.length >= 2}
            canCreateFace={meshVertices.length >= 3 && meshVertices.length <= 4}
            canFlip={meshSelectedFaces.length > 0}
            canSplit={meshSelectedFaces.some(
              (key) => meshEditPart?.mesh?.faces[key]?.v.length === 4,
            )}
            onExtrude={extrude}
            onLoopCut={loopCutSelection}
            onMerge={mergeSelection}
            onCreateFace={closeFace}
            onFlip={flipSelection}
            onSplit={splitSelection}
            adjust={meshAdjustProps}
            onDeleteSelection={deleteSelection}
            onDone={() => session.getState().exitMeshEdit()}
          />
        ) : (
          <Toolbox
            tool={tool}
            onTool={(next: TransformTool) => {
              session.getState().setPlacingShape(null)
              session.getState().setTool(next)
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
    </div>
  )
}
