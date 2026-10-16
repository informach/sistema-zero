import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { editSceneAnimationPoses, markSceneAnimationChannel } from '../../../scene/animationArrival'
import type { SceneAnimationKeyRef } from '../../../scene/animationCommands'
import type { SceneAnimationTarget } from '../../../scene/animationTarget'
import type { MoldaSceneDocument } from '../../../scene/document'
import { sameSceneContent } from '../../../scene/documentContent'
import { indexSceneDocument } from '../../../scene/documentIndex'
import { SceneGraphError, selectSceneSubtrees } from '../../../scene/graph'
import type { ScenePaintTarget } from '../../../scene/imagePaint'
import type { AffineMatrix } from '../../../scene/matrix'
import { ensureScenePaintSurface } from '../../../scene/paintSurface'
import { placeSceneNodesOnSupport } from '../../../scene/placement'
import { prepareSceneAnimation } from '../../../scene/sampleAnimation'
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import { newModelIntent } from '../../../state/newModelIntent'
import { createScenePivotGesture } from '../../../state/scenePivotGesture'
import { createSceneTransformGesture } from '../../../state/sceneTransformGesture'
import type { SceneTransformTool } from '../../../viewport/sceneViewportTypes'
import { useMoldaToolAccess } from '../../toolAccess'
import { useSceneAnimationEditPreview } from './useSceneAnimationEditPreview'
import { useSceneAnimationPlayer } from './useSceneAnimationPlayer'
import { useSceneAnimationPoseGesture } from './useSceneAnimationPoseGesture'
import { useSceneComponents } from './useSceneComponents'
import { useSceneContextTransition } from './useSceneContextTransition'
import { useSceneFlipbookPlayer } from './useSceneFlipbookPlayer'
import { useSceneModelGuides } from './useSceneModelGuides'
import { useScenePaint } from './useScenePaint'
import { useScenePaintIndicators } from './useScenePaintIndicators'
import { useScenePoseRecovery } from './useScenePoseRecovery'
import { useSceneSkinPaint } from './useSceneSkinPaint'
import { useSceneSolidCut } from './useSceneSolidCut'
import { SCENE_WORKSPACE_AREAS, type SceneWorkspaceArea } from './workspaceAreaRegistry'

/** As três abas. O modo mora aqui para Pintar poder escolher a peça e preparar a tinta. */
export type SceneWorkshopMode = 'model' | 'paint' | 'animation'
export type SceneWorkshopTool = SceneTransformTool | 'box' | 'lasso' | 'pivot' | 'cut'

/** A peça tem faces tortas: pintar pede o consentimento de dividi-las em triângulos. */
export interface ScenePaintIssue {
  nodeId: string
  faceId?: string
  faces: readonly string[]
}

export function useSceneWorkshop(editor: EditorStore<MoldaSceneDocument>) {
  const activeTransform = useRef<'components' | 'nodes' | null>(null)
  const cancelModelGuide = useRef<() => void>(() => {})
  const document = useStore(editor, (state) => state.content)
  const [fresh] = useState(() => newModelIntent.has(document.id))
  const [chosen, setChosenState] = useState<readonly string[]>(() =>
    fresh
      ? document.nodes
          .filter((node) => node.kind === 'mesh')
          .slice(0, 1)
          .map((node) => node.id)
      : [],
  )
  // Uma decisão pode confirmar um grupo e retomar Pintar no mesmo evento, antes do render.
  const chosenRef = useRef(chosen)
  const setChosen = useCallback(
    (next: readonly string[] | ((before: readonly string[]) => readonly string[])) => {
      chosenRef.current = typeof next === 'function' ? next(chosenRef.current) : next
      setChosenState(chosenRef.current)
    },
    [],
  )
  useEffect(() => newModelIntent.consume(document.id), [document.id])
  const [additive, setAdditive] = useState(false)
  const [isolation, setIsolation] = useState<readonly string[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [mode, setMode] = useState<SceneWorkshopMode>('model')
  const [workspaceArea, setWorkspaceArea] = useState<SceneWorkspaceArea | null>(null)
  const [tool, setTool] = useState<SceneWorkshopTool>(() => (fresh ? 'move' : 'select'))
  const [looking, setLooking] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [pivotVertical, setPivotVertical] = useState(false)
  const [pivotSnap, setPivotSnap] = useState(false)
  const [reveal, setReveal] = useState<readonly string[]>([])
  const [animationTarget, setAnimationTarget] = useState<SceneAnimationTarget>('piece')
  const [animationPreviewDocument, setAnimationPreviewDocument] =
    useState<MoldaSceneDocument | null>(null)
  const [placementPreview, setPlacementPreview] = useState<MoldaSceneDocument | null>(null)
  const placementTarget = useRef<string | null>(null)
  // O conteúdo em que "Colocar em cima" começou: qualquer mudança nele (desfazer, apagar,
  // adicionar) encerra a preparação, senão o palco mostraria uma prévia de outra criação.
  const placementSource = useRef<MoldaSceneDocument | null>(null)
  // Pivô é de UMA peça: com várias (ou nenhuma) escolhidas, a ferramenta volta a Escolher em vez
  // de deixar o cartão com botões desligados e sem motivo.
  useEffect(() => {
    if (tool === 'pivot' && chosen.length !== 1) setTool('select')
  }, [tool, chosen.length])
  useEffect(() => {
    const source = placementSource.current
    if (!placing || !source || sameSceneContent(source, document)) return
    placementSource.current = null
    placementTarget.current = null
    setPlacing(false)
    setPlacementPreview(null)
  }, [placing, document])
  const [paintIssue, setPaintIssue] = useState<ScenePaintIssue | null>(null)
  const paint = useScenePaint(editor, mode === 'paint')
  const committedPaint = editor.getState().saveSnapshot()
  const paintIndicators = useScenePaintIndicators(mode === 'paint' ? committedPaint : null)
  const skinPaint = useSceneSkinPaint(editor)
  const flipbook = useSceneFlipbookPlayer(editor)
  const animation = useSceneAnimationPlayer(editor)
  const [showPreviousPose, setShowPreviousPose] = useState(true)
  const [poseSelection, setPoseSelection] = useState<
    (SceneAnimationKeyRef & { clipId: string }) | null
  >(null)
  const [poseCopy, setPoseCopy] = useState<{
    source: MoldaSceneDocument
    clipId: string
    ref: SceneAnimationKeyRef
    target: number
  } | null>(null)
  const animationSnapshot = useSyncExternalStore(
    animation.subscribe,
    animation.getSnapshot,
    animation.getSnapshot,
  )
  const poseCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const track of animationSnapshot.source?.clip.tracks ?? [])
      counts.set(track.nodeId, (counts.get(track.nodeId) ?? 0) + track.keys.length)
    return counts
  }, [animationSnapshot.source?.clip])
  const animationPose = useSceneAnimationPoseGesture(editor, animation, (clipId, time) => {
    const nodeId = chosenRef.current.length === 1 ? chosenRef.current[0] : null
    if (!nodeId) return
    const clip = editor.getState().content.animations?.find((entry) => entry.id === clipId)
    const tracks =
      clip?.tracks.filter(
        (track) => track.nodeId === nodeId && track.keys.some((key) => key.time === time),
      ) ?? []
    const preferred = tool === 'rotate' ? 'rotation' : tool === 'scale' ? 'scale' : 'translation'
    const track = tracks.find((track) => track.channel === preferred) ?? tracks[0]
    if (track) setPoseSelection({ clipId, nodeId, time, channel: track.channel })
  })
  const poseRef = useMemo(
    () =>
      poseSelection
        ? {
            nodeId: poseSelection.nodeId,
            channel: poseSelection.channel,
            time: poseSelection.time,
          }
        : null,
    [poseSelection],
  )
  const selectedPose =
    poseSelection &&
    chosen.length === 1 &&
    chosen[0] === poseSelection.nodeId &&
    animationSnapshot.source?.clip.id === poseSelection.clipId &&
    animationSnapshot.time === poseSelection.time &&
    animationSnapshot.source.clip.tracks.some(
      (track) =>
        track.nodeId === poseSelection.nodeId &&
        track.channel === poseSelection.channel &&
        track.keys.some((key) => key.time === poseSelection.time),
    )
      ? poseRef
      : null
  useEffect(() => {
    if (
      poseSelection &&
      (animationSnapshot.source?.clip.id !== poseSelection.clipId ||
        animationSnapshot.time !== poseSelection.time)
    )
      setPoseSelection(null)
  }, [poseSelection, animationSnapshot.source?.clip.id, animationSnapshot.time])
  useEffect(() => {
    if (
      poseCopy &&
      (poseCopy.source !== document ||
        mode !== 'animation' ||
        poseCopy.clipId !== animationSnapshot.source?.clip.id ||
        chosen.length !== 1 ||
        chosen[0] !== poseCopy.ref.nodeId)
    )
      setPoseCopy(null)
  }, [poseCopy, document, mode, animationSnapshot.source?.clip.id, chosen])
  const poseRecovery = useScenePoseRecovery(editor, animationPose)
  const contextTransition = useSceneContextTransition()
  const { queue: queueContext, register: registerContext } = contextTransition
  const [transition, setTransition] = useState<(() => void) | null>(null)
  const transitionRef = useRef<(() => void) | null>(null)
  const rememberedAnimation = useRef<{ id: string; time: number } | null>(null)
  const queueTransition = useCallback(
    (action: (current?: MoldaSceneDocument) => void) => {
      const source = animation.getSnapshot().source
      if (source?.document !== editor.getState().content) return false
      animationPose.interrupt()
      if (!animationPose.getSnapshot().pending) return false
      if (!transitionRef.current) {
        const resume = () => action(editor.getState().content)
        transitionRef.current = resume
        setTransition(() => resume)
      }
      return true
    },
    [animation, animationPose, editor],
  )
  useEffect(() => {
    animation.setTransitionGuard((action, reason) => {
      if (reason === 'navigation') {
        animationPose.cancel()
        return false
      }
      return queueTransition(action)
    })
    return () => animation.setTransitionGuard(null)
  }, [animation, animationPose, queueTransition])
  const requestTransition = (action: () => void) => {
    if (!queueTransition(action) && !queueContext(action)) action()
  }
  const resolveTransition = (choice: 'mark' | 'discard' | 'continue') => {
    const action = transitionRef.current
    if (choice === 'mark' && !animationPose.record()) return
    if (choice === 'discard') animationPose.cancel()
    transitionRef.current = null
    setTransition(null)
    if (choice !== 'continue') action?.()
  }
  const closePaint = paint.close
  const cancelPaint = paint.cancel
  const retargetPaint = paint.retarget
  // Sem o pincel liberado (`paint.brush`), escolher a peça em Pintar só escolhe: nada de preparar
  // a tinta, que muda o documento.
  const { can } = useMoldaToolAccess()
  const areaAllowed = !workspaceArea || can(SCENE_WORKSPACE_AREAS[workspaceArea].family)
  const area =
    workspaceArea && areaAllowed && SCENE_WORKSPACE_AREAS[workspaceArea].mode === mode
      ? workspaceArea
      : null
  const animationEdit = useSceneAnimationEditPreview(
    editor,
    animation,
    contextTransition,
    can('animate.batch') || can('animate.pro'),
  )
  const brush = can('paint.brush')
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
  const pivotGesture = useMemo(
    () =>
      createScenePivotGesture(editor, (error) =>
        setMessage(error instanceof Error ? error.message : COPY.scene.commandFailed),
      ),
    [editor],
  )
  useEffect(() => () => pivotGesture.cancel(), [pivotGesture])
  const index = useMemo(() => indexSceneDocument(document), [document])
  const selected = useMemo(() => chosen.filter((id) => index.scene.nodes.has(id)), [chosen, index])
  const covered = useMemo(
    () => selectSceneSubtrees(index.scene, selected).covered,
    [selected, index],
  )
  /**
   * O preparo da tinta que ainda não virou passo de desfazer. Escolher a peça prepara o lugar da
   * tinta com `stage` (sem histórico nem persistência). O primeiro traço, balde, giro ou vestir faz o commit, e o
   * histórico grava a partir do último estado GRAVADO (o de antes do preparo): os dois viram UM
   * passo. Sair sem pintar devolve o documento de antes. Assim olhar a aba Pintar não apaga o
   * Refazer nem muda a criação, o que vale também para a regra de ouro do nível de entrada.
   */
  const pendingPrep = useRef<{
    nodeId: string
    base: MoldaSceneDocument
    prepared: MoldaSceneDocument
  } | null>(null)
  /** Desfaz o preparo que ninguém usou (`keep`: a peça que continua sendo o alvo). */
  const releasePrep = useCallback(
    (keep?: string) => {
      const pending = pendingPrep.current
      if (!pending || pending.nodeId === keep) return
      pendingPrep.current = null
      const state = editor.getState()
      // Um traço, uma cor ou um comando por cima já levou o preparo junto no passo dele.
      if (state.content === pending.prepared) state.cancelGesture(pending.base)
    },
    [editor],
  )
  useEffect(() => () => releasePrep(), [releasePrep])
  /**
   * Pintar no clique: escolher a peça prepara o lugar da tinta (sem mudar a aparência) e abre a
   * pintura nela, mantendo a cor, a ferramenta e a largura da criança.
   */
  const choosePaint = useCallback(
    (nodeId: string | null, faceId?: string, split = false) => {
      // O gesto da cor nova fecha antes de tudo, no passo dele (a lição do editor antigo).
      cancelPaint()
      skinPaint.cancel()
      animationPose.interrupt()
      animation.cancelPreview()
      animation.pause()
      gesture.cancel()
      setPaintIssue(null)
      releasePrep(nodeId ?? undefined)
      if (nodeId === null) {
        closePaint()
        setChosen([])
        return
      }
      const source = editor.getState().asset
      if (!source.nodes.some((node) => node.id === nodeId)) return
      setChosen([nodeId])
      if (!brush) {
        closePaint()
        return
      }
      try {
        const result = ensureScenePaintSurface(source, {
          nodeId,
          ...(faceId === undefined ? {} : { faceId }),
          ...(split ? { splitCrookedFaces: true } : {}),
        })
        if (result.status === 'crooked') {
          closePaint()
          setPaintIssue({
            nodeId,
            ...(faceId === undefined ? {} : { faceId }),
            faces: result.faces,
          })
          return
        }
        if (result.created) {
          const state = editor.getState()
          const pending = pendingPrep.current
          const base =
            pending?.nodeId === nodeId && state.content === pending.prepared ? pending.base : source
          state.stage(result.document)
          pendingPrep.current = { nodeId, base, prepared: result.document }
        }
        setMessage(null)
        retargetPaint(result.target)
      } catch (error) {
        closePaint()
        setMessage(
          error instanceof SceneValidationError
            ? // O erro aponta o caminho avançado ("pinte pelo caminho avançado", "mostre uma
              // camada"): trancado, ele diz o que a criança pode fazer agora.
              error.path === 'material.maps' && !can('paint.maps')
              ? SCENE_PAINT_COPY.lockedMaps
              : error.path === 'layer' && !can('paint.layers')
                ? SCENE_PAINT_COPY.lockedLayers
                : error.message
            : COPY.scene.paintFailed,
        )
      }
    },
    [
      editor,
      gesture,
      closePaint,
      cancelPaint,
      retargetPaint,
      releasePrep,
      animation,
      animationPose,
      skinPaint,
      brush,
      can,
      setChosen,
    ],
  )
  const select = useCallback(
    (id: string | null, add: boolean, faceId?: string) => {
      if (mode === 'paint' && area !== 'uv' && area !== 'materials') {
        choosePaint(id, faceId)
        return
      }
      skinPaint.cancel()
      animationPose.retainAssisted()
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
    [
      editor,
      additive,
      gesture,
      closePaint,
      animation,
      animationPose,
      skinPaint,
      mode,
      area,
      choosePaint,
      setChosen,
    ],
  )
  const run = useCallback(
    function execute(
      command: (source: MoldaSceneDocument) => MoldaSceneDocument,
      selection?: 'created' | 'clear',
    ): MoldaSceneDocument | null {
      if (
        queueTransition(() => {
          execute(command, selection)
        })
      )
        return null
      if (queueContext(() => execute(command, selection))) return null
      cancelModelGuide.current()
      skinPaint.cancel()
      animationPose.interrupt()
      animation.cancelPreview()
      animation.pause()
      // Um comando na aba Pintar cancela o traço em vez de fechar a pintura.
      if (mode === 'paint') cancelPaint()
      else closePaint()
      gesture.cancel()
      const before = editor.getState().asset
      try {
        const next = command(before)
        if (next !== before) editor.getState().commit(next)
        setMessage(null)
        if (selection === 'clear') setChosen([])
        if (selection === 'created') {
          // A peça nova chega pronta para Mover: o próximo arrasto nela a move, não gira a câmera.
          setLooking(false)
          setTool('move')
          const oldIds = new Set(before.nodes.map((node) => node.id))
          const created = new Set(
            next.nodes.filter((node) => !oldIds.has(node.id)).map((node) => node.id),
          )
          setReveal([...created])
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
    [
      editor,
      gesture,
      closePaint,
      cancelPaint,
      animation,
      animationPose,
      skinPaint,
      mode,
      queueTransition,
      queueContext,
      setChosen,
    ],
  )
  const selectMany = useCallback(
    (ids: readonly string[], add: boolean) => {
      if (mode === 'paint') return
      skinPaint.cancel()
      animationPose.retainAssisted()
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
    [editor, additive, gesture, closePaint, animation, animationPose, skinPaint, mode, setChosen],
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
  const modelGuides = useSceneModelGuides(editor, (next) => !!run(() => next))
  const solidCut = useSceneSolidCut(editor, (next) => !!run(() => next))
  const cutLive = useRef(solidCut)
  cutLive.current = solidCut
  useEffect(() => {
    const cut = cutLive.current
    if (
      cut.owner &&
      (mode !== 'model' ||
        tool !== 'cut' ||
        selected.length !== 1 ||
        selected[0] !== cut.owner.nodeId)
    )
      cut.cancel()
    if (
      mode === 'model' &&
      tool === 'cut' &&
      selected.length === 1 &&
      cut.owner?.nodeId !== selected[0]
    )
      cut.start(selected[0]!)
  }, [mode, tool, selected])
  const currentModelGuides = useRef(modelGuides)
  currentModelGuides.current = modelGuides
  useEffect(
    () =>
      registerContext('model-guide', () => {
        const guide = currentModelGuides.current
        const owner = guide.pending()
        if (!owner) return null
        return {
          title: 'A divisão ainda está em prévia',
          applyLabel: 'Criar divisão',
          canApply: !!owner.candidate && owner.candidate !== owner.source && !guide.error,
          apply: guide.confirm,
          discard: guide.cancel,
        }
      }),
    [registerContext],
  )
  const previousPose = useMemo(() => {
    const source = animationSnapshot.source
    if (
      !showPreviousPose ||
      animationSnapshot.playing ||
      mode !== 'animation' ||
      !source ||
      source.preview ||
      source.document !== document ||
      !selected.length
    )
      return null
    const influences = new Set(covered)
    for (const id of selected) {
      let parent = index.scene.nodes.get(id)?.parentId
      while (parent) {
        influences.add(parent)
        parent = index.scene.nodes.get(parent)?.parentId
      }
    }
    const times = source.clip.tracks
      .filter(
        (track) =>
          influences.has(track.nodeId) &&
          (selectedPose
            ? track.nodeId === selectedPose.nodeId && track.channel === selectedPose.channel
            : track.channel ===
              (tool === 'rotate' ? 'rotation' : tool === 'scale' ? 'scale' : 'translation')),
      )
      .flatMap((track) => track.keys.map((key) => key.time))
      .filter((time) => time < animationSnapshot.time)
    if (!times.length) return null
    try {
      return prepareSceneAnimation(document, source.clip.id).sample(Math.max(...times), false)
    } catch {
      return null
    }
  }, [
    showPreviousPose,
    mode,
    animationSnapshot.source,
    animationSnapshot.time,
    animationSnapshot.playing,
    document,
    selected,
    covered,
    index,
    selectedPose,
    tool,
  ])
  cancelModelGuide.current = modelGuides.cancel
  const guideContext = JSON.stringify([selected, mode, tool])
  const previousGuideContext = useRef(guideContext)
  useEffect(() => {
    if (previousGuideContext.current !== guideContext) cancelModelGuide.current()
    previousGuideContext.current = guideContext
  }, [guideContext])
  // O portão pode fechar com a oficina aberta (a prévia da equipe, um posto que muda): o modo de
  // malha trancado fecha, em vez de continuar aberto sem os botões dele.
  const meshAllowed = can('model.components') || can('model.mesh')
  const componentsOpen = components.selection !== null
  const closeComponents = useRef(components.close)
  closeComponents.current = components.close
  useEffect(() => {
    if ((!meshAllowed || !areaAllowed) && componentsOpen) closeComponents.current()
  }, [meshAllowed, areaAllowed, componentsOpen])
  useEffect(() => {
    if (areaAllowed) return
    animationEdit.cancel()
    cancelPaint()
    setWorkspaceArea(null)
  }, [areaAllowed, animationEdit, cancelPaint])
  function cancelGesture() {
    pivotGesture.cancel()
    skinPaint.cancel()
    animationPose.interrupt()
    animation.cancelPreview()
    animation.pause()
    flipbook.pause()
    paint.cancel()
    components.check.cancel()
    gesture.cancel()
    components.preview.cancel()
    components.transform.cancel()
    activeTransform.current = null
  }
  function changeMode(next: SceneWorkshopMode) {
    if (next === mode) return
    if (queueTransition(() => changeMode(next))) return
    if (queueContext(() => changeMode(next))) return
    const currentAnimation = animation.getSnapshot()
    if (mode === 'animation' && currentAnimation.source && !currentAnimation.source.preview)
      rememberedAnimation.current = {
        id: currentAnimation.source.clip.id,
        time: currentAnimation.time,
      }
    setLooking(false)
    setPlacing(false)
    setPlacementPreview(null)
    // O recado de uma aba não atravessa para a outra (o vermelho do Pintar ficava no Modelar).
    setMessage(null)
    cancelGesture()
    releasePrep()
    closePaint()
    components.close()
    flipbook.setImage(null)
    setPaintIssue(null)
    const source = editor.getState().content
    const remembered = rememberedAnimation.current
    const clip =
      next === 'animation'
        ? (source.animations?.find((clip) => clip.id === remembered?.id) ?? source.animations?.[0])
        : null
    try {
      animation.setClip(clip ? source : null, clip?.id ?? null)
      if (clip && remembered?.id === clip.id)
        animation.seek(Math.min(remembered.time, clip.duration))
    } catch (error) {
      animation.reportError(error)
    }
    setWorkspaceArea(null)
    setMode(next)
    if (next !== 'paint') return
    // Entrar em Pintar com UMA peça escolhida já deixa pintar nela; com várias, a criança escolhe.
    const ids = chosenRef.current
    const only = ids.length === 1 ? source.nodes.find((node) => node.id === ids[0]) : undefined
    // Sem uma peça só, a dica do palco já pede a escolha ("Toque numa peça…"): não é um erro.
    if (only?.kind === 'mesh') choosePaint(only.id)
  }
  return {
    editor,
    area,
    openArea: (next: SceneWorkspaceArea | null) => {
      if (next && !can(SCENE_WORKSPACE_AREAS[next].family)) return
      requestTransition(() => {
        if (next) changeMode(SCENE_WORKSPACE_AREAS[next].mode)
        cancelGesture()
        setLooking(false)
        setTool('select')
        if (next === 'mesh' || next === 'uv' || next === 'skin') {
          closePaint()
          releasePrep()
          const componentMode = next === 'skin' ? 'vertex' : 'face'
          components.open(
            componentMode,
            components.selection?.mode === componentMode ? components.selection.ids : [],
          )
        } else {
          components.close()
          if (next === 'materials') {
            closePaint()
            releasePrep()
          }
        }
        setWorkspaceArea(next)
        if (!next && mode === 'paint' && chosenRef.current.length === 1)
          choosePaint(chosenRef.current[0]!)
      })
    },
    modelGuides,
    pivotGesture,
    pivotVertical: can('model.precise') && pivotVertical,
    setPivotVertical,
    pivotSnap: can('model.precise') && pivotSnap,
    setPivotSnap,
    showPreviousPose,
    setShowPreviousPose,
    previousPose,
    reveal,
    poseRecovery,
    restorePose: () =>
      requestTransition(() => {
        changeMode('animation')
        poseRecovery.restore()
      }),
    animationTarget,
    animationEdit,
    setAnimationTarget: (target: SceneAnimationTarget) =>
      requestTransition(() => {
        animation.cancelPreview()
        setAnimationPreviewDocument(null)
        setAnimationTarget(target)
      }),
    animationPreviewDocument,
    setAnimationPreviewDocument,
    transition,
    contextTransition,
    requestTransition,
    resolveTransition,
    undo: () => {
      // O rascunho da pose responde enquanto tem passos para desfazer; sem eles, o próximo
      // Desfazer age no histórico confirmado (antes, um rascunho com só Refazer travava o botão).
      const draft = animationPose.getSnapshot()
      if (draft.pending || draft.dragging || draft.canUndo) {
        animationPose.undo()
        return
      }
      requestTransition(() => {
        cancelGesture()
        releasePrep()
        if (draft.canRedo) animationPose.cancel()
        editor.getState().undo()
      })
    },
    redo: () => {
      if (animationPose.getSnapshot().pending || animationPose.getSnapshot().canRedo) {
        animationPose.redo()
        return
      }
      requestTransition(() => {
        cancelGesture()
        releasePrep()
        editor.getState().redo()
      })
    },
    mode,
    tool,
    setTool: (next: SceneWorkshopTool) => {
      const choose = () => {
        pivotGesture.cancel()
        setPivotSnap(false)
        cancelModelGuide.current()
        solidCut.cancel()
        if (next === 'cut') {
          components.close()
          if (chosenRef.current.length === 1) solidCut.start(chosenRef.current[0]!)
        }
        gesture.cancel()
        setLooking(false)
        setTool(next)
      }
      if (next === 'pivot')
        requestTransition(() => {
          animation.pause()
          choose()
        })
      else if (!queueContext(choose)) choose()
    },
    looking,
    setLooking,
    placing,
    placementPreview,
    startPlacement: () => {
      gesture.cancel()
      setLooking(false)
      placementSource.current = editor.getState().content
      placementTarget.current = null
      setPlacementPreview(null)
      setPlacing(true)
      setMessage(null)
    },
    cancelPlacement: () => {
      setPlacing(false)
      setPlacementPreview(null)
      placementTarget.current = null
      setMessage(null)
    },
    previewPlacement: (id: string | null) => {
      if (!placing || id === placementTarget.current) return
      placementTarget.current = id
      if (!id) {
        setPlacementPreview(null)
        return
      }
      try {
        setPlacementPreview(placeSceneNodesOnSupport(editor.getState().content, selected, id))
        setMessage(null)
      } catch (error) {
        setPlacementPreview(null)
        setMessage(error instanceof Error ? error.message : COPY.scene.commandFailed)
      }
    },
    changeMode,
    choosePaint,
    paintIssue,
    /** O consentimento: dividir as faces tortas em triângulos e pintar, num passo só. */
    splitCrookedAndPaint: () => {
      if (paintIssue) choosePaint(paintIssue.nodeId, paintIssue.faceId, true)
    },
    /** Esc na aba Pintar: com traço, cancela o traço; sem traço, solta a peça. */
    endPaint: () => {
      if (paint.drawing || paint.busy) {
        paint.cancel()
        return
      }
      if (paint.closeUp) {
        paint.closeCloseUp()
        return
      }
      closePaint()
      releasePrep()
      setPaintIssue(null)
      setChosen([])
    },
    /** O preparo da tinta ainda sem traço: a foto do cartão espera (nada mudou à vista). */
    paintPreparationPending: () => {
      const pending = pendingPrep.current
      return pending !== null && editor.getState().content === pending.prepared
    },
    /** Sair da oficina: o preparo que ninguém usou não vai para o disco. */
    releasePaintPreparation: () => releasePrep(),
    paint,
    paintColors: paintIndicators.colors,
    paintColorsStatus: paintIndicators.status,
    solidCut,
    skinPaint,
    flipbook,
    animation,
    animationPose,
    selectedPose,
    poseCopy,
    poseCounts,
    beginPoseCopy: () => {
      if (selectedPose && poseSelection)
        requestTransition(() =>
          setPoseCopy({
            source: editor.getState().content,
            clipId: poseSelection.clipId,
            ref: selectedPose,
            target: selectedPose.time,
          }),
        )
    },
    setPoseCopyTime: (target: number) =>
      setPoseCopy((before) => (before ? { ...before, target } : null)),
    cancelPoseCopy: () => setPoseCopy(null),
    confirmPoseCopy: () => {
      if (!poseCopy || poseCopy.source !== editor.getState().content) return
      const next = run((source) =>
        editSceneAnimationPoses(
          source,
          poseCopy.clipId,
          [poseCopy.ref],
          'copy',
          poseCopy.target - poseCopy.ref.time,
        ),
      )
      if (next) {
        animation.seek(poseCopy.target)
        setPoseSelection({ ...poseCopy.ref, clipId: poseCopy.clipId, time: poseCopy.target })
        setPoseCopy(null)
      }
    },
    removeSelectedPose: () => {
      if (selectedPose && poseSelection)
        requestTransition(() => {
          const next = run((source) =>
            editSceneAnimationPoses(source, poseSelection.clipId, [selectedPose], 'remove'),
          )
          if (next) setPoseSelection(null)
        })
    },
    selectAnimationPose: (ref: SceneAnimationKeyRef | null) => {
      setPoseCopy(null)
      const source = animation.getSnapshot().source
      if (!ref || !source) {
        setPoseSelection(null)
        return
      }
      animation.seek(ref.time)
      setChosen([ref.nodeId])
      setPoseSelection({ ...ref, clipId: source.clip.id })
    },
    recordAnimationPose: () => {
      if (animationPose.getSnapshot().pending) return animationPose.record()
      const snapshot = animation.getSnapshot()
      const id = chosenRef.current.length === 1 ? chosenRef.current[0] : null
      if (!id || !snapshot.source || snapshot.source.preview || snapshot.playing) return false
      if (tool !== 'move' && tool !== 'rotate' && tool !== 'scale') return false
      const channel = tool === 'rotate' ? 'rotation' : tool === 'scale' ? 'scale' : 'translation'
      const ref: SceneAnimationKeyRef = { nodeId: id, channel, time: snapshot.time }
      const next = run((source) => markSceneAnimationChannel(source, snapshot.source!.clip.id, ref))
      if (next) setPoseSelection({ ...ref, clipId: snapshot.source.clip.id })
      return !!next
    },
    /** "Pintar nesta camada", o caminho avançado: abre a aba Pintar com aquele alvo exato. */
    openPaint: (target: ScenePaintTarget) => {
      setWorkspaceArea(null)
      skinPaint.cancel()
      animation.pause()
      flipbook.pause()
      components.close()
      gesture.cancel()
      if (mode !== 'paint') {
        animation.cancelPreview()
        try {
          animation.setClip(null, null)
        } catch (error) {
          animation.reportError(error)
        }
        setMode('paint')
      }
      setPaintIssue(null)
      releasePrep(target.nodeId)
      setChosen([target.nodeId])
      return paint.open(target)
    },
    document,
    index,
    selected,
    covered,
    select: (id: string | null, additive: boolean, detail?: { faceId?: string }) => {
      if (placing) {
        const supportId = id && covered.has(id) ? placementTarget.current : id
        if (supportId && run((source) => placeSceneNodesOnSupport(source, selected, supportId))) {
          setReveal([...selected])
          setPlacing(false)
          setPlacementPreview(null)
          placementTarget.current = null
        }
        return
      }
      const choose = () => {
        flipbook.setImage(null)
        components.close()
        select(id, additive, detail?.faceId)
      }
      if (!queueContext(choose)) choose()
    },
    selectMany: (ids: readonly string[], additive: boolean) => {
      const choose = () => {
        flipbook.setImage(null)
        components.close()
        selectMany(ids, additive)
      }
      if (!queueContext(choose)) choose()
    },
    run: (command: Parameters<typeof run>[0], selection?: Parameters<typeof run>[1]) => {
      if (queueContext(() => run(command, selection))) return null
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
    cancelGesture,
    primary: selected.length === 1 ? index.scene.nodes.get(selected[0] ?? '') : undefined,
  }
}
