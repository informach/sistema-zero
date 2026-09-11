import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
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
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import { createScenePaintGesture } from '../../../state/scenePaintGesture'
import {
  createScenePaintShapeGesture,
  type ScenePaintDraft,
  type ScenePaintScope,
} from '../../../state/scenePaintShapeGesture'
import type { ScenePaintActions } from '../../../viewport/sceneViewportTypes'
import { useSceneImageTask } from './useSceneImageTask'
import { useSceneRasterFile } from './useSceneRasterFile'

export type { ScenePaintActions } from '../../../viewport/sceneViewportTypes'

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
  const [session, setSession] = useState<{ documentId: string; target: ScenePaintTarget } | null>(
    null,
  )
  const [chosenColor, setColor] = useState<ScenePaintColor>(7)
  const [brush, setBrush] = useState<BrushSize>(1)
  const [tool, setTool] = useState<
    'pencil' | 'eraser' | 'fill' | 'picker' | ScenePaintDraft['tool']
  >('pencil')
  const eraser = tool === 'eraser'
  const fill = tool === 'fill'
  const picker = tool === 'picker'
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
    tool === 'pencil' || tool === 'eraser' || tool === 'fill' || tool === 'picker' ? null : tool
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
  const stroke = useRef<{ last: ScenePaintSample | null } | null>(null)
  const publishing = useRef(false)
  const gesture = useMemo(
    () =>
      createScenePaintGesture(editor, (error) =>
        setError(error instanceof SceneValidationError ? error.message : COPY.scene.paintFailed),
      ),
    [editor],
  )
  const cancel = useCallback(() => {
    cancelImage()
    cancelFile()
    shapeGesture.cancel()
    stroke.current = null
    gesture.cancel()
    setDrawing(false)
  }, [gesture, cancelImage, cancelFile, shapeGesture])
  const close = useCallback(() => {
    cancel()
    clearFile()
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
  const color: ScenePaintColor =
    data?.image.encoding === 'rgba'
      ? typeof chosenColor === 'number'
        ? [120, 220, 82, 255]
        : chosenColor
      : typeof chosenColor === 'number'
        ? chosenColor
        : 7
  useEffect(() => {
    if (session && !data) {
      cancel()
      setSession(null)
      setError(COPY.scene.paintTargetChanged)
    }
  }, [session, data, cancel])
  useEffect(() => {
    const unsubscribe = editor.subscribe((state, previous) => {
      if (
        state.contentRevision !== previous.contentRevision &&
        stroke.current &&
        !publishing.current
      )
        cancel()
    })
    const hidden = () => {
      if (window.document.hidden) cancel()
    }
    window.addEventListener('blur', cancel)
    window.document.addEventListener('visibilitychange', hidden)
    return () => {
      unsubscribe()
      window.removeEventListener('blur', cancel)
      window.document.removeEventListener('visibilitychange', hidden)
      stroke.current = null
      gesture.cancel()
      shapeGesture.cancel()
    }
  }, [editor, gesture, shapeGesture, cancel])
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
      return true
    } finally {
      publishing.current = false
    }
  }
  const actions: ScenePaintActions = {
    begin(sample) {
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
      stroke.current = { last: null }
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
      else if (stroke.current) stroke.current.last = null
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
        setColor(value)
        if (eraser || picker) setTool('pencil')
      }
    },
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
    open(target: ScenePaintTarget) {
      cancel()
      clearFile()
      try {
        const document = editor.getState().content
        const { image, imageKind } = resolveScenePaintTarget(document, target)
        setSession({ documentId: document.id, target: { ...target } })
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
