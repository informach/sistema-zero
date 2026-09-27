import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import type { MoldaSceneDocument } from '../../../scene/document'
import { indexSceneDocument } from '../../../scene/documentIndex'
import { SceneGraphError, selectSceneSubtrees } from '../../../scene/graph'
import type { ScenePaintTarget } from '../../../scene/imagePaint'
import type { AffineMatrix } from '../../../scene/matrix'
import { ensureScenePaintSurface } from '../../../scene/paintSurface'
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import { createSceneTransformGesture } from '../../../state/sceneTransformGesture'
import { useMoldaToolAccess } from '../../toolAccess'
import { useSceneAnimationPlayer } from './useSceneAnimationPlayer'
import { useSceneAnimationPoseGesture } from './useSceneAnimationPoseGesture'
import { useSceneComponents } from './useSceneComponents'
import { useSceneFlipbookPlayer } from './useSceneFlipbookPlayer'
import { useScenePaint } from './useScenePaint'
import { useSceneSkinPaint } from './useSceneSkinPaint'

/** As três abas. O modo mora aqui para Pintar poder escolher a peça e preparar a tinta. */
export type SceneWorkshopMode = 'model' | 'paint' | 'animation'

/** A peça tem faces tortas: pintar pede o consentimento de dividi-las em triângulos. */
export interface ScenePaintIssue {
  nodeId: string
  faceId?: string
  faces: readonly string[]
}

export function useSceneWorkshop(editor: EditorStore<MoldaSceneDocument>) {
  const activeTransform = useRef<'components' | 'nodes' | null>(null)
  const document = useStore(editor, (state) => state.content)
  const [chosen, setChosen] = useState<readonly string[]>([])
  const [additive, setAdditive] = useState(false)
  const [isolation, setIsolation] = useState<readonly string[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [mode, setMode] = useState<SceneWorkshopMode>('model')
  const [paintIssue, setPaintIssue] = useState<ScenePaintIssue | null>(null)
  const paint = useScenePaint(editor)
  const skinPaint = useSceneSkinPaint(editor)
  const flipbook = useSceneFlipbookPlayer(editor)
  const animation = useSceneAnimationPlayer(editor)
  const animationPose = useSceneAnimationPoseGesture(editor, animation)
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
   * tinta com `replace` (sem histórico). O primeiro traço, balde, giro ou vestir faz o commit, e o
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
      animationPose.cancel()
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
          state.replace(result.document)
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
    ],
  )
  const select = useCallback(
    (id: string | null, add: boolean, faceId?: string) => {
      if (mode === 'paint') {
        choosePaint(id, faceId)
        return
      }
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
    [editor, additive, gesture, closePaint, animation, animationPose, skinPaint, mode, choosePaint],
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
    [editor, gesture, closePaint, cancelPaint, animation, animationPose, skinPaint, mode],
  )
  const selectMany = useCallback(
    (ids: readonly string[], add: boolean) => {
      if (mode === 'paint') return
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
    [editor, additive, gesture, closePaint, animation, animationPose, skinPaint, mode],
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
  }
  function changeMode(next: SceneWorkshopMode) {
    if (next === mode) return
    cancelGesture()
    releasePrep()
    closePaint()
    components.close()
    flipbook.setImage(null)
    setPaintIssue(null)
    const source = editor.getState().content
    const clip = next === 'animation' ? source.animations?.[0] : null
    try {
      animation.setClip(clip ? source : null, clip?.id ?? null)
    } catch (error) {
      animation.reportError(error)
    }
    setMode(next)
    if (next !== 'paint') return
    // Entrar em Pintar com UMA peça escolhida já deixa pintar nela; com várias, a criança escolhe.
    const only = selected.length === 1 ? index.scene.nodes.get(selected[0]!) : undefined
    if (only?.kind === 'mesh') choosePaint(only.id)
    else setChosen([])
  }
  return {
    editor,
    mode,
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
      flipbook.setImage(null)
      components.close()
      select(id, additive, detail?.faceId)
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
    cancelGesture,
    primary: selected.length === 1 ? index.scene.nodes.get(selected[0] ?? '') : undefined,
  }
}
