import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { hexToRgb } from '../../../core/color'
import { COPY } from '../../../core/copy'
import { resolvePaletteColors } from '../../../core/sanitize'
import type { BrushSize } from '../../../paint/skinPaint'
import type { MoldaSceneDocument } from '../../../scene/document'
import { sceneLayerColor } from '../../../scene/imageColor'
import { captureSceneLayerRaster } from '../../../scene/imageImport'
import {
  resolveScenePaintTarget,
  type ScenePaintColor,
  type ScenePaintRgba,
  type ScenePaintSample,
  type ScenePaintTarget,
} from '../../../scene/imagePaint'
import { intersectImageRegions } from '../../../scene/imageRegion'
import type { SceneStampSettings } from '../../../scene/imageStamp'
import {
  type ScenePaintFaceView,
  scenePaintFaceView,
  sceneSheetView,
} from '../../../scene/paintFaceView'
import { rotateScenePaintRegion } from '../../../scene/paintRegionRotate'
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import { createScenePaintGesture } from '../../../state/scenePaintGesture'
import {
  createScenePaintShapeGesture,
  type ScenePaintDraft,
  type ScenePaintScope,
} from '../../../state/scenePaintShapeGesture'
import { createScenePaletteGesture } from '../../../state/scenePaletteGesture'
import type { ScenePaintActions } from '../../../viewport/sceneViewportTypes'
import { useSceneImageTask } from './useSceneImageTask'
import { useSceneRasterFile } from './useSceneRasterFile'

export type { ScenePaintActions } from '../../../viewport/sceneViewportTypes'

/** A região das amostras que vêm da face de perto (`ScenePaintCloseUp`), e não do palco. */
export const SCENE_CLOSE_UP_REGION = 'perto'

/**
 * ⚠️ A volta do cilindro e da bola é UMA face com emenda: de um lado a UV vale quase 1, do outro
 * quase 0. Ligar esses dois pontos riscaria a folha inteira; um salto de mais de meia face
 * entre duas amostras seguidas é a emenda, e o traço recomeça do outro lado.
 */
export function crossesSeam(previous: ScenePaintSample, next: ScenePaintSample): boolean {
  const bounds = next.bounds
  if (!bounds) return false
  return (
    Math.abs(previous.point[0] - next.point[0]) * 2 > bounds.x1 - bounds.x0 + 1 ||
    Math.abs(previous.point[1] - next.point[1]) * 2 > bounds.y1 - bounds.y0 + 1
  )
}

export function useScenePaint(editor: EditorStore<MoldaSceneDocument>) {
  const document = useStore(editor, (state) => state.content)
  /** `quiet`: a sessão que a aba Pintar abriu sozinha fecha sem alerta quando o alvo some. */
  const [session, setSession] = useState<{
    documentId: string
    target: ScenePaintTarget
    quiet?: boolean
  } | null>(null)
  const [chosenColor, setColor] = useState<ScenePaintColor>(7)
  const [brush, setBrush] = useState<BrushSize>(1)
  const [tool, setTool] = useState<
    'pencil' | 'eraser' | 'fill' | 'picker' | 'rotate' | 'closeup' | ScenePaintDraft['tool']
  >('pencil')
  const eraser = tool === 'eraser'
  const fill = tool === 'fill'
  const picker = tool === 'picker'
  /** Girar a pintura da face: cada toque numa face gira a pintura dela 90°. */
  const rotate = tool === 'rotate'
  /** Espelho de pintura: o traço pinta também o ponto refletido no meio, na mesma peça. */
  const [mirror, setMirror] = useState(false)
  /** Pintar de perto: a face tocada, ampliada e em pé por cima do palco, com o traço preso a ela. */
  const closeupTool = tool === 'closeup'
  const [closeUp, setCloseUp] = useState<{ imageId: string; view: ScenePaintFaceView } | null>(null)
  const [tolerance, setTolerance] = useState(0)
  const imageTask = useSceneImageTask(editor)
  const cancelImage = imageTask.cancel
  const runImage = imageTask.run
  const stampFile = useSceneRasterFile(document.id)
  const cancelFile = stampFile.cancel,
    clearFile = stampFile.clear
  const [stampSettings, setStampSettings] = useState<SceneStampSettings>({
    scale: 1,
    turns: 0,
    flipX: false,
    flipY: false,
  })
  const shape =
    tool === 'pencil' ||
    tool === 'eraser' ||
    tool === 'fill' ||
    tool === 'picker' ||
    tool === 'rotate' ||
    tool === 'closeup'
      ? null
      : tool
  const [filled, setFilled] = useState(false)
  const [endColor, setEndColor] = useState<ScenePaintRgba>([81, 141, 255, 255])
  const [draft, setDraft] = useState<ScenePaintDraft | null>(null)
  const [selection, setSelection] = useState<ScenePaintScope | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shapeGesture = useMemo(
    () =>
      createScenePaintShapeGesture(editor, {
        preview: setDraft,
        select: setSelection,
        run: runImage,
        error: (error) =>
          setError(error instanceof SceneValidationError ? error.message : COPY.scene.paintFailed),
      }),
    [editor, runImage],
  )
  const stroke = useRef<{
    last: ScenePaintSample | null
    lastMirror: ScenePaintSample | null
  } | null>(null)
  const publishing = useRef(false)
  const gesture = useMemo(
    () =>
      createScenePaintGesture(editor, (error) =>
        setError(error instanceof SceneValidationError ? error.message : COPY.scene.paintFailed),
      ),
    [editor],
  )
  const palette = useMemo(() => createScenePaletteGesture(editor), [editor])
  /** Só o traço e o trabalho em andamento; o gesto de cor segue (o seletor nativo tira o foco). */
  const stopStroke = useCallback(() => {
    cancelImage()
    cancelFile()
    shapeGesture.cancel()
    stroke.current = null
    gesture.cancel()
    setDrawing(false)
  }, [gesture, cancelImage, cancelFile, shapeGesture])
  const cancel = useCallback(() => {
    // O gesto do "+ Nova cor" fecha ANTES de qualquer outra coisa (a lição do editor antigo):
    // o Esc no seletor não manda `change`, e um passo velho entraria no histórico depois.
    palette.end()
    stopStroke()
  }, [palette, stopStroke])
  const close = useCallback(() => {
    cancel()
    clearFile()
    setCloseUp(null)
    setSession(null)
  }, [cancel, clearFile])
  const data = useMemo(() => {
    if (!session || session.documentId !== document.id) return null
    try {
      return resolveScenePaintTarget(document, session.target)
    } catch {
      return null
    }
  }, [document, session])
  const scope =
    data &&
    selection?.imageId === data.image.id &&
    selection.width === data.image.width &&
    selection.height === data.image.height
      ? selection.region
      : undefined
  // Undo/import can change encoding while this panel remains open. Tool state is not image data.
  // Desfazer a cor nova tira a extra da paleta: o lápis volta à cor de sempre, que existe.
  const colorCount = resolvePaletteColors(document).length
  const color: ScenePaintColor =
    data?.image.encoding === 'rgba'
      ? typeof chosenColor === 'number'
        ? [120, 220, 82, 255]
        : chosenColor
      : typeof chosenColor === 'number' && chosenColor < colorCount
        ? chosenColor
        : 7
  useEffect(() => {
    if (session && !data) {
      cancel()
      setSession(null)
      // Desfazer o preparo da superfície é a criança voltando atrás, não um problema.
      if (!session.quiet) setError(COPY.scene.paintTargetChanged)
    }
  }, [session, data, cancel])
  useEffect(() => {
    const unsubscribe = editor.subscribe((state, previous) => {
      if (
        state.contentRevision !== previous.contentRevision &&
        stroke.current &&
        !publishing.current
      )
        stopStroke()
    })
    const hidden = () => {
      if (window.document.hidden) stopStroke()
    }
    // Abrir o seletor nativo de cor tira o foco da janela: o blur cancela o traço, não o gesto
    // da cor nova, que fecha pelo `change` (ou pelo blur) do próprio campo.
    window.addEventListener('blur', stopStroke)
    window.document.addEventListener('visibilitychange', hidden)
    return () => {
      unsubscribe()
      window.removeEventListener('blur', stopStroke)
      window.document.removeEventListener('visibilitychange', hidden)
      stroke.current = null
      gesture.cancel()
      shapeGesture.cancel()
      palette.end()
    }
  }, [editor, gesture, shapeGesture, stopStroke, palette])
  const publish = (sample: ScenePaintSample) => {
    const current = stroke.current
    if (!current) return false
    publishing.current = true
    try {
      const last = current.last
      const from =
        last?.region === sample.region && !crossesSeam(last, sample) ? last.point : sample.point
      // O limite vale por amostra: o traço atravessa faces e cada pedaço fica na face dele.
      if (!gesture.segment(from, sample.point, sample.bounds)) {
        cancel()
        return false
      }
      current.last = sample
      // O espelho entra no MESMO gesto: um traço, um desfazer, dos dois lados.
      const reflected = sample.mirror
      if (reflected) {
        const before = current.lastMirror
        const start =
          before?.region === reflected.region && !crossesSeam(before, reflected)
            ? before.point
            : reflected.point
        if (!gesture.segment(start, reflected.point, reflected.bounds)) {
          cancel()
          return false
        }
      }
      current.lastMirror = reflected ?? null
      return true
    } finally {
      publishing.current = false
    }
  }
  const actions: ScenePaintActions = {
    begin(sample) {
      palette.end()
      if (
        stroke.current ||
        shapeGesture.active() ||
        imageTask.busy ||
        stampFile.busy ||
        !session ||
        !data
      )
        return false
      let region = scope
      if (!picker && shape !== 'select' && sample.bounds) {
        const clipped = scope ? intersectImageRegions(sample.bounds, scope) : sample.bounds
        if (!clipped) return false
        region = clipped
      }
      if (closeupTool && sample.region === SCENE_CLOSE_UP_REGION) {
        // Já está de perto: o toque na própria face ampliada só devolve o lápis.
        setTool('pencil')
        return false
      }
      if (closeupTool) {
        // O toque escolhe a face; a pintura continua com o lápis, agora de perto.
        const region = sample.bounds ?? {
          x0: 0,
          y0: 0,
          x1: data.image.width - 1,
          y1: data.image.height - 1,
        }
        const node = document.nodes.find((entry) => entry.id === session.target.nodeId)
        const geometry =
          node?.kind === 'mesh'
            ? document.geometries.find((entry) => entry.id === node.geometryId)
            : undefined
        setCloseUp({
          imageId: session.target.imageId,
          view:
            (geometry &&
              sample.faceId !== undefined &&
              scenePaintFaceView(geometry, sample.faceId, data.image, region)) ||
            sceneSheetView(region),
        })
        setTool('pencil')
        setError(null)
        return false
      }
      if (rotate) {
        // Um toque gira a pintura da face tocada, em todas as camadas: um passo de desfazer.
        try {
          const source = editor.getState().asset
          const whole = { x0: 0, y0: 0, x1: data.image.width - 1, y1: data.image.height - 1 }
          const next = rotateScenePaintRegion(
            source,
            session.target.imageId,
            sample.bounds ?? whole,
          )
          if (next !== source) editor.getState().commit(next)
          setError(null)
        } catch (error) {
          setError(error instanceof SceneValidationError ? error.message : COPY.scene.paintFailed)
        }
        return false
      }
      if (picker) {
        try {
          const sampled = sceneLayerColor(data.image, data.layer.id, sample.point)
          if (sampled === 0) setTool('eraser')
          else {
            setColor(sampled)
            setTool('pencil')
          }
          setError(null)
        } catch (error) {
          setError(error instanceof SceneValidationError ? error.message : COPY.scene.paintFailed)
        }
        return false
      }
      const chosen = eraser
        ? data.image.encoding === 'indexed'
          ? 0
          : ([0, 0, 0, 0] as ScenePaintColor)
        : color
      if (shape) {
        setError(null)
        if (shape === 'select')
          return shapeGesture.begin(document, session.target, sample, { tool: 'select' })
        if (shape === 'stamp') {
          if (!stampFile.data) {
            setError(COPY.scene.paintStampMissing)
            return false
          }
          return shapeGesture.begin(document, session.target, sample, {
            tool: 'stamp',
            raster: stampFile.data.raster,
            ...stampSettings,
            region,
          })
        }
        if (shape === 'gradient') {
          if (typeof chosen === 'number') {
            setError(COPY.scene.paintGradientNeedsRgba)
            return false
          }
          return shapeGesture.begin(document, session.target, sample, {
            tool: shape,
            color: chosen,
            endColor,
            region,
          })
        }
        return shapeGesture.begin(document, session.target, sample, {
          tool: shape,
          color: chosen,
          brush,
          filled,
          region,
        })
      }
      if (fill) {
        setError(null)
        void imageTask.run(document, session.target.imageId, {
          kind: 'fill',
          layerId: session.target.layerId,
          point: sample.point,
          color: chosen,
          tolerance: data.image.encoding === 'indexed' ? 0 : tolerance,
          ...(region ? { region } : {}),
        })
        return false
      }
      if (!gesture.begin(session.target, chosen, brush, data.image, scope)) return false
      stroke.current = { last: null, lastMirror: null }
      setError(null)
      setDrawing(true)
      return publish(sample)
    },
    move(sample) {
      if (shapeGesture.active()) {
        shapeGesture.move(sample)
        return
      }
      if (sample) publish(sample)
      else if (stroke.current) {
        stroke.current.last = null
        stroke.current.lastMirror = null
      }
    },
    end(commit) {
      if (shapeGesture.active()) {
        shapeGesture.end(commit)
        return
      }
      stroke.current = null
      gesture.end(commit)
      setDrawing(false)
    },
  }
  return {
    session: data ? session : null,
    data,
    color,
    brush,
    eraser,
    fill,
    picker,
    rotate,
    mirror,
    closeupTool,
    /** A face de perto, quando ainda é da folha aberta (desfazer ou outra peça a fecham). */
    closeUp:
      closeUp &&
      data &&
      closeUp.imageId === data.image.id &&
      closeUp.view.region.x1 < data.image.width &&
      closeUp.view.region.y1 < data.image.height
        ? closeUp.view
        : null,
    closeCloseUp: () => {
      cancel()
      setCloseUp(null)
    },
    shape,
    filled,
    endColor,
    stampFile,
    stampSettings,
    setStampSettings,
    captureStamp: () => {
      if (!data || !scope) return
      cancel()
      try {
        stampFile.setRaster({
          name: data.layer.name,
          raster: captureSceneLayerRaster(data.image, data.layer.id, scope),
        })
        setTool('stamp')
        setError(null)
      } catch (error) {
        setError(error instanceof SceneValidationError ? error.message : COPY.scene.paintFailed)
      }
    },
    draft,
    scope,
    tolerance,
    imageTask,
    busy: imageTask.busy || stampFile.busy,
    drawing: drawing || draft !== null,
    error: error ?? imageTask.error,
    actions,
    cancel,
    setColor: (value: ScenePaintColor) => {
      if (!stroke.current && !imageTask.busy) {
        palette.end()
        setColor(value)
        if (eraser || picker || rotate || closeupTool) setTool('pencil')
      }
    },
    /** Um passo do seletor do "+ Nova cor": a cor nova já vira a cor do lápis. */
    newColorStep: (hex: string) => {
      if (stroke.current || imageTask.busy) return
      const step = palette.step(hex)
      if (!step) return
      if ('full' in step) {
        setError(COPY.editor.model.colorsFull)
        return
      }
      const chosen = resolvePaletteColors(editor.getState().asset)[step.index] ?? hex
      setColor(
        data?.image.encoding === 'rgba'
          ? ([...hexToRgb(chosen), 255] as ScenePaintRgba)
          : step.index,
      )
      if (eraser || picker) setTool('pencil')
      setError(null)
    },
    /** O seletor fechou: UM passo de desfazer para a cor nova. */
    newColorEnd: () => palette.end(),
    setBrush: (value: BrushSize) => {
      if (!stroke.current) setBrush(value)
    },
    setEraser: (value: boolean) => {
      if (!stroke.current && !imageTask.busy) {
        setTool(value ? 'eraser' : 'pencil')
      }
    },
    setFill: () => {
      if (!stroke.current && !imageTask.busy) {
        setTool('fill')
      }
    },
    setPicker: () => {
      cancel()
      setTool('picker')
    },
    setRotate: () => {
      cancel()
      setTool('rotate')
    },
    setMirror: (value: boolean) => {
      cancel()
      setMirror(value)
    },
    setCloseUpTool: () => {
      cancel()
      setTool('closeup')
    },
    setTolerance,
    setShape: (value: ScenePaintDraft['tool']) => {
      cancel()
      setTool(value)
    },
    setFilled,
    setEndColor,
    convert: () => {
      if (session) {
        cancel()
        void imageTask.run(document, session.target.imageId, { kind: 'rgba' })
      }
    },
    clearSelection: () => {
      cancel()
      setSelection(null)
    },
    /**
     * Troca o alvo sem recomeçar: a cor, a ferramenta e a largura continuam as da criança. É o
     * toque em outra peça (ou em outra face) na aba Pintar. Sem sessão, abre uma quieta.
     */
    retarget(target: ScenePaintTarget) {
      cancel()
      setCloseUp(null)
      try {
        const document = editor.getState().content
        resolveScenePaintTarget(document, target)
        setSession({ documentId: document.id, target: { ...target }, quiet: true })
        setSelection(null)
        setError(null)
        return true
      } catch (error) {
        setError(error instanceof SceneValidationError ? error.message : COPY.scene.paintFailed)
        return false
      }
    },
    open(target: ScenePaintTarget, options: { quiet?: boolean } = {}) {
      cancel()
      clearFile()
      setCloseUp(null)
      try {
        const document = editor.getState().content
        const { image, imageKind } = resolveScenePaintTarget(document, target)
        setSession({
          documentId: document.id,
          target: { ...target },
          ...(options.quiet ? { quiet: true } : {}),
        })
        setColor(
          image.encoding === 'indexed'
            ? 7
            : imageKind === 'normal'
              ? [128, 128, 255, 255]
              : imageKind === 'color'
                ? [120, 220, 82, 255]
                : [255, 255, 255, 255],
        )
        setTool('pencil')
        setSelection(null)
        setError(null)
        return true
      } catch (error) {
        setError(error instanceof SceneValidationError ? error.message : COPY.scene.paintFailed)
        return false
      }
    },
    close,
  }
}
