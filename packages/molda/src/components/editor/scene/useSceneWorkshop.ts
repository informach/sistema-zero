import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import type { SceneAnimationTarget } from '../../../scene/animationTarget'
import type { MoldaSceneDocument } from '../../../scene/document'
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
import { createSceneTransformGesture } from '../../../state/sceneTransformGesture'
import type { SceneTransformTool } from '../../../viewport/sceneViewportTypes'
import { useMoldaToolAccess } from '../../toolAccess'
import { useSceneAnimationPlayer } from './useSceneAnimationPlayer'
import { useSceneAnimationPoseGesture } from './useSceneAnimationPoseGesture'
import { useSceneComponents } from './useSceneComponents'
import { useSceneContextTransition } from './useSceneContextTransition'
import { useSceneFlipbookPlayer } from './useSceneFlipbookPlayer'
import { useSceneModelGuides } from './useSceneModelGuides'
import { useScenePaint } from './useScenePaint'
import { useScenePoseRecovery } from './useScenePoseRecovery'
import { useSceneSkinPaint } from './useSceneSkinPaint'

/** As três abas. O modo mora aqui para Pintar poder escolher a peça e preparar a tinta. */
export type SceneWorkshopMode = 'model' | 'paint' | 'animation'
export type SceneWorkshopTool = SceneTransformTool | 'box' | 'lasso' | 'pivot'

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
  const [tool, setTool] = useState<SceneWorkshopTool>(() => (fresh ? 'move' : 'select'))
  const [looking, setLooking] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [reveal, setReveal] = useState<readonly string[]>([])
  const [animationTarget, setAnimationTarget] = useState<SceneAnimationTarget>('piece')
  const [animationPreviewDocument, setAnimationPreviewDocument] =
    useState<MoldaSceneDocument | null>(null)
  const [placementPreview, setPlacementPreview] = useState<MoldaSceneDocument | null>(null)
  const placementTarget = useRef<string | null>(null)
  const [paintIssue, setPaintIssue] = useState<ScenePaintIssue | null>(null)
  const paint = useScenePaint(editor)
  const skinPaint = useSceneSkinPaint(editor)
  const flipbook = useSceneFlipbookPlayer(editor)
  const animation = useSceneAnimationPlayer(editor)
  const [showPreviousPose, setShowPreviousPose] = useState(false)
  const animationSnapshot = useSyncExternalStore(
    animation.subscribe,
    animation.getSnapshot,
    animation.getSnapshot,
  )
  const animationPose = useSceneAnimationPoseGesture(editor, animation)
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
    animation.setTransitionGuard(queueTransition)
    return () => animation.setTransitionGuard(null)
  }, [animation, queueTransition])
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
      if (mode === 'paint') {
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
  const currentModelGuides = useRef(modelGuides)
  currentModelGuides.current = modelGuides
  useEffect(
    () =>
      registerContext('model-guide', () => {
        const guide = currentModelGuides.current
        const owner = guide.pending()
        if (!owner) return null
        return {
          title:
            owner.kind === 'pivot'
              ? 'O pivô ainda está em prévia'
              : 'A divisão ainda está em prévia',
          applyLabel: owner.kind === 'pivot' ? 'Aplicar pivô' : 'Criar divisão',
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
      .filter((track) => influences.has(track.nodeId))
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
  const meshAllowed = can('model.mesh')
  const componentsOpen = components.selection !== null
  const closeComponents = useRef(components.close)
  closeComponents.current = components.close
  useEffect(() => {
    if (!meshAllowed && componentsOpen) closeComponents.current()
  }, [meshAllowed, componentsOpen])
  function cancelGesture() {
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
    setMode(next)
    if (next !== 'paint') return
    // Entrar em Pintar com UMA peça escolhida já deixa pintar nela; com várias, a criança escolhe.
    const ids = chosenRef.current
    const only = ids.length === 1 ? source.nodes.find((node) => node.id === ids[0]) : undefined
    if (only?.kind === 'mesh') choosePaint(only.id)
    else setMessage('Escolha uma peça para pintar.')
  }
  return {
    editor,
    modelGuides,
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
      if (animationPose.getSnapshot().pending || animationPose.getSnapshot().canRedo) {
        animationPose.undo()
        return
      }
      requestTransition(() => {
        cancelGesture()
        releasePrep()
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
        cancelModelGuide.current()
        gesture.cancel()
        setLooking(false)
        setTool(next)
      }
      if (!queueContext(choose)) choose()
    },
    looking,
    setLooking,
    placing,
    placementPreview,
    startPlacement: () => {
      gesture.cancel()
      setLooking(false)
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
    skinPaint,
    flipbook,
    animation,
    animationPose,
    /** "Pintar nesta camada", o caminho avançado: abre a aba Pintar com aquele alvo exato. */
    openPaint: (target: ScenePaintTarget) => {
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
