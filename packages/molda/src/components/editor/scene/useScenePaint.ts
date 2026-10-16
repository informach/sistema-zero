import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { hexToRgb, rgbToHex } from '../../../core/color'
import { COPY } from '../../../core/copy'
import { resolvePaletteColors } from '../../../core/sanitize'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import type { BrushSize, Texel } from '../../../paint/skinPaint'
import type { ScenePixelRegion } from '../../../scene/composite'
import type { MoldaSceneDocument } from '../../../scene/document'
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
import { prepareScenePaintContact } from '../../../scene/paintContact'
import {
  type ScenePaintFaceView,
  scenePaintFaceView,
  sceneSheetView,
} from '../../../scene/paintFaceView'
import { prepareSceneInk, sampleSceneInk, sceneInkRgba } from '../../../scene/paintInk'
import { rotateScenePaintFace } from '../../../scene/paintRegionRotate'
import { scenePaintFaceFillsBounds } from '../../../scene/paintSurfaceBounds'
import { patchScenePieceAppearance } from '../../../scene/pieceAppearance'
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import { createScenePaintGesture } from '../../../state/scenePaintGesture'
import {
  createScenePaintShapeGesture,
  type ScenePaintDraft,
  type ScenePaintScope,
} from '../../../state/scenePaintShapeGesture'
import type { ScenePaintActions } from '../../../viewport/sceneViewportTypes'
import { useMoldaToolAccess } from '../../toolAccess'
import { isMoldaDialogOpen } from '../../ui/Dialog'
import { isTypingTarget } from '../../ui/interaction'
import { usePaintFavorites } from './usePaintFavorites'
import { useSceneImageTask } from './useSceneImageTask'
import { useSceneRasterFile } from './useSceneRasterFile'

export type { ScenePaintActions } from '../../../viewport/sceneViewportTypes'

/** A região das amostras que vêm da face de perto (`ScenePaintCloseUp`), e não do palco. */
export const SCENE_CLOSE_UP_REGION = 'perto'

/** As superfícies que dão a volta (o lado do cilindro e do tubo, a bola): a UV corre em volta. */
const WRAPS = new Set(['side', 'around'])

/**
 * ⚠️ A volta do cilindro e da bola é UMA face com emenda: de um lado a UV vale quase 1, do outro
 * quase 0. Ligar esses dois pontos riscaria a folha inteira; um salto de mais de meia face na
 * direção que dá a volta é a emenda, e o traço recomeça do outro lado. Só nessas superfícies e só
 * nessa direção: na caixa, ou de cima a baixo, o salto é um rabisco rápido e o traço continua.
 */
const sameRegion = (a: ScenePixelRegion, b: ScenePixelRegion) =>
  a.x0 === b.x0 && a.y0 === b.y0 && a.x1 === b.x1 && a.y1 === b.y1

export function crossesSeam(previous: ScenePaintSample, next: ScenePaintSample): boolean {
  const bounds = next.bounds
  if (!bounds || next.faceId === undefined || !WRAPS.has(next.faceId)) return false
  return Math.abs(previous.point[0] - next.point[0]) * 2 > bounds.x1 - bounds.x0 + 1
}

export function useScenePaint(editor: EditorStore<MoldaSceneDocument>, active = false) {
  const { can } = useMoldaToolAccess()
  const document = useStore(editor, (state) => state.content)
  /** `quiet`: a sessão que a aba Pintar abriu sozinha fecha sem alerta quando o alvo some. */
  const [session, setSession] = useState<{
    documentId: string
    target: ScenePaintTarget
    quiet?: boolean
  } | null>(null)
  const [chosenColor, setColor] = useState<ScenePaintRgba>(() => sceneInkRgba(document, 7))
  const [recentColors, setRecentColors] = useState<ScenePaintRgba[]>([])
  const favoriteColors = usePaintFavorites()
  const [fillScope, setFillScope] = useState<'area' | 'base'>('area')
  const [pieceScope, setPieceScope] = useState<'all' | 'selected'>('all')
  const [grid, setGrid] = useState(false)
  const pushRecent = useCallback(
    (ink: ScenePaintRgba) =>
      setRecentColors((before) =>
        [ink, ...before.filter((entry) => entry.some((channel, i) => channel !== ink[i]))].slice(
          0,
          6,
        ),
      ),
    [],
  )
  const rememberColor = (color: ScenePaintColor) => {
    const ink = sceneInkRgba(editor.getState().content, color)
    setColor(ink)
  }
  /**
   * Pegar cor lê a cor que a criança VÊ: um ponto sem tinta nenhuma (transparente sobre fundo
   * transparente, comum em modelo importado) não vira tinta invisível, que faria o Pincel apagar.
   * Fica a tinta de antes; o resto ganha alfa cheio.
   */
  const rememberSampled = (sampled: ScenePaintRgba) => {
    if (sampled[3] === 0) return
    rememberColor([sampled[0], sampled[1], sampled[2], 255])
  }
  const [brush, setBrush] = useState<BrushSize>(2)
  const [tool, setTool] = useState<
    'pencil' | 'eraser' | 'fill' | 'picker' | 'rotate' | 'closeup' | ScenePaintDraft['tool']
  >('pencil')
  const [temporaryPicker, setTemporaryPicker] = useState(false)
  const straight = useRef(false)
  const eraser = tool === 'eraser'
  const fill = tool === 'fill'
  const picker = tool === 'picker' || temporaryPicker
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
  const runShape = useCallback<Parameters<typeof createScenePaintShapeGesture>[1]['run']>(
    async (...args) => {
      const [source, , operation, prepared] = args
      const inks =
        operation.kind === 'gradient'
          ? [operation.endColor, operation.color]
          : operation.kind === 'shape'
            ? [sceneInkRgba(prepared ?? source, operation.color)]
            : []
      const applied = await runImage(...args)
      if (applied) for (const ink of inks) if (ink[3] > 0) pushRecent(ink)
      return applied
    },
    [runImage, pushRecent],
  )
  const shapeGesture = useMemo(
    () =>
      createScenePaintShapeGesture(editor, {
        preview: setDraft,
        select: setSelection,
        run: runShape,
        error: (error) =>
          setError(error instanceof SceneValidationError ? error.message : COPY.scene.paintFailed),
      }),
    [editor, runShape],
  )
  const stroke = useRef<{
    last: ScenePaintSample | null
    lastMirror: ScenePaintSample | null
    line?: { start: ScenePaintSample; checkpoint: MoldaSceneDocument }
  } | null>(null)
  const publishing = useRef(false)
  const gesture = useMemo(
    () =>
      createScenePaintGesture(editor, (error) =>
        setError(error instanceof SceneValidationError ? error.message : COPY.scene.paintFailed),
      ),
    [editor],
  )
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
    stopStroke()
  }, [stopStroke])
  useEffect(() => {
    if (!active) return
    const down = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || isMoldaDialogOpen()) return
      if (event.key === 'Alt') {
        event.preventDefault()
        stopStroke()
        setTemporaryPicker(true)
      }
      if (event.key === 'Shift') straight.current = true
    }
    const up = (event: KeyboardEvent) => {
      if (event.key === 'Alt') setTemporaryPicker(false)
      if (event.key === 'Shift') straight.current = false
    }
    const reset = () => {
      straight.current = false
      setTemporaryPicker(false)
    }
    const hidden = () => {
      if (window.document.hidden) reset()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', reset)
    window.document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', reset)
      window.document.removeEventListener('visibilitychange', hidden)
      reset()
    }
  }, [active, stopStroke])
  const close = useCallback(() => {
    cancel()
    clearFile()
    setCloseUp(null)
    setSession(null)
    // O aviso era da pintura que fechou (a paleta cheia, por exemplo): não fica na tela.
    setError(null)
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
  const paletteColors = resolvePaletteColors(document)
  const inkIndex =
    chosenColor[3] === 255
      ? paletteColors.indexOf(rgbToHex(chosenColor[0], chosenColor[1], chosenColor[2]))
      : -1
  const color: ScenePaintColor =
    data?.image.encoding === 'indexed' && inkIndex > 0 ? inkIndex : chosenColor
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
    }
  }, [editor, gesture, shapeGesture, stopStroke])
  const publish = (sample: ScenePaintSample) => {
    const current = stroke.current
    if (!current) return false
    publishing.current = true
    try {
      if (!straight.current || current.line?.start.region !== sample.region)
        current.line = undefined
      if (straight.current && !current.line)
        current.line = {
          start: current.last?.region === sample.region ? current.last : sample,
          checkpoint: gesture.checkpoint() ?? editor.getState().content,
        }
      if (current.line && !gesture.restore(current.line.checkpoint)) return false
      const last = current.line?.start ?? current.last
      const from =
        last?.region === sample.region && !crossesSeam(last, sample) ? last.point : sample.point
      // O limite vale por amostra: o traço atravessa faces e cada pedaço fica na face dele.
      if (!gesture.segment(from, sample.point, sample.bounds, sample.target)) {
        cancel()
        return false
      }
      current.last = sample
      // O espelho entra no MESMO gesto: um traço, um desfazer, dos dois lados.
      const reflected = sample.mirror
      if (reflected) {
        const before = current.line?.start.mirror ?? current.lastMirror
        const start =
          before?.region === reflected.region && !crossesSeam(before, reflected)
            ? before.point
            : reflected.point
        if (!gesture.segment(start, reflected.point, reflected.bounds, reflected.target)) {
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
    begin(input) {
      if (stroke.current || shapeGesture.active() || imageTask.busy || stampFile.busy) return false
      let prepared: ReturnType<typeof prepareScenePaintContact> | null = null
      if ('kind' in input) {
        try {
          prepared = prepareScenePaintContact(editor.getState().content, input)
        } catch (error) {
          setError(error instanceof Error ? error.message : COPY.scene.paintFailed)
          return false
        }
      }
      const sample = prepared?.sample ?? ('kind' in input ? null : input)
      if (!sample) return false
      const document = prepared?.document ?? editor.getState().content
      const activeSession = prepared ? { target: prepared.target } : session
      const activeData = prepared ? resolveScenePaintTarget(document, prepared.target) : data
      if (!activeSession || !activeData) return false
      const { target } = activeSession
      const { image, material, imageKind } = activeData
      const selectedRegion = prepared ? undefined : scope
      let region = selectedRegion
      if (!picker && shape !== 'select' && sample.bounds) {
        const clipped = selectedRegion
          ? intersectImageRegions(sample.bounds, selectedRegion)
          : sample.bounds
        if (!clipped) return false
        region = clipped
      }
      if (closeupTool && sample.region === SCENE_CLOSE_UP_REGION) {
        // Já está de perto: o toque na própria face ampliada só devolve o lápis.
        setTool('pencil')
        return false
      }
      // Girar e "Pintar de perto" são da FACE: sem o limite dela (a folha inteira do caminho
      // avançado), girariam a imagem toda ou abririam a folha crua.
      if ((closeupTool || rotate) && !sample.bounds) {
        setError(SCENE_PAINT_COPY.faceOnly)
        return false
      }
      const node = document.nodes.find((entry) => entry.id === target.nodeId)
      const geometry =
        node?.kind === 'mesh'
          ? document.geometries.find((entry) => entry.id === node.geometryId)
          : undefined
      if (closeupTool && sample.bounds) {
        // O toque escolhe a face; a pintura continua com o lápis, agora de perto.
        const region = sample.bounds
        // Na pintura que se mexe a UV corre pela célula: o em pé é medido no tamanho dela.
        const cell = image.flipbook
          ? { width: image.flipbook.frameWidth, height: image.flipbook.frameHeight }
          : image
        setCloseUp({
          imageId: target.imageId,
          view:
            (geometry &&
              sample.faceId !== undefined &&
              scenePaintFaceView(geometry, sample.faceId, cell, region)) ||
            sceneSheetView(region),
        })
        setTool('pencil')
        setError(null)
        return false
      }
      if (rotate && sample.bounds) {
        // Um toque gira a pintura da face tocada, em todas as camadas e nos mapas do material:
        // um passo de desfazer. Com o espelho, o outro lado gira no sentido oposto, como no
        // editor antigo.
        const fills = (faceId?: string) =>
          !geometry || faceId === undefined || scenePaintFaceFillsBounds(geometry, faceId)
        if (!fills(sample.faceId)) {
          setError(SCENE_PAINT_COPY.rotateOnlyRect)
          return false
        }
        try {
          const source = editor.getState().asset
          const face = { materialId: target.materialId, imageId: target.imageId }
          let next = rotateScenePaintFace(source, face, sample.bounds)
          const reflected = sample.mirror
          if (
            reflected?.bounds &&
            !sameRegion(reflected.bounds, sample.bounds) &&
            fills(reflected.faceId)
          )
            next = rotateScenePaintFace(next, face, reflected.bounds, 3)
          if (next !== source) editor.getState().commit(next)
          setError(null)
        } catch (error) {
          setError(error instanceof SceneValidationError ? error.message : COPY.scene.paintFailed)
        }
        return false
      }
      if (picker) {
        try {
          const sampled = sampleSceneInk(document, material, image, sample.point, imageKind)
          rememberSampled(sampled)
          if (!temporaryPicker) setTool('pencil')
          setError(null)
        } catch (error) {
          setError(error instanceof SceneValidationError ? error.message : COPY.scene.paintFailed)
        }
        return false
      }
      const chosen = eraser
        ? image.encoding === 'indexed'
          ? 0
          : ([0, 0, 0, 0] as ScenePaintColor)
        : chosenColor
      if (shape) {
        setError(null)
        if (shape === 'select')
          return shapeGesture.begin(document, target, sample, { tool: 'select' })
        if (shape === 'stamp') {
          if (!stampFile.data) {
            setError(COPY.scene.paintStampMissing)
            return false
          }
          return shapeGesture.begin(document, target, sample, {
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
          return shapeGesture.begin(document, target, sample, {
            tool: shape,
            color: chosen,
            endColor,
            region,
          })
        }
        return shapeGesture.begin(document, target, sample, {
          tool: shape,
          color: chosen,
          brush,
          filled,
          region,
        })
      }
      if (fill) {
        setError(null)
        if (fillScope === 'base' && imageKind === 'color') {
          if (!can('model.finish')) {
            setError('A cor de fundo não está disponível nesta oficina. Use Área desta face.')
            return false
          }
          try {
            const next = patchScenePieceAppearance(editor.getState().content, target.nodeId, {
              baseColor: {
                kind: 'rgba',
                value: [
                  chosenColor[0] / 255,
                  chosenColor[1] / 255,
                  chosenColor[2] / 255,
                  chosenColor[3] / 255,
                ],
              },
            })
            if (next !== editor.getState().content) {
              editor.getState().commit(next)
              pushRecent(chosenColor)
            }
          } catch (error) {
            setError(error instanceof Error ? error.message : COPY.scene.paintFailed)
          }
          return false
        }
        try {
          let prepared = prepareSceneInk(document, target.imageId, chosen)
          const fillAt = (
            point: Texel,
            area?: ScenePixelRegion,
            layerId = target.layerId,
            color = prepared.color,
            encoding = image.encoding,
          ) => ({
            kind: 'fill' as const,
            layerId,
            point,
            color,
            tolerance: encoding === 'indexed' ? 0 : tolerance,
            ...(area ? { region: area } : {}),
          })
          const requests = [{ imageId: target.imageId, operations: [fillAt(sample.point, region)] }]
          // Com o espelho, o balde enche também o outro lado, no mesmo passo de desfazer.
          const reflected = sample.mirror
          const other =
            reflected?.bounds &&
            (scope ? intersectImageRegions(reflected.bounds, scope) : reflected.bounds)
          if (reflected && other) {
            const reflectedTarget = reflected.target ?? target
            const ink = prepareSceneInk(prepared.document, reflectedTarget.imageId, chosen)
            prepared = ink
            const reflectedImage = resolveScenePaintTarget(prepared.document, reflectedTarget).image
            requests.push({
              imageId: reflectedTarget.imageId,
              operations: [
                fillAt(
                  reflected.point,
                  other,
                  reflectedTarget.layerId,
                  ink.color,
                  reflectedImage.encoding,
                ),
              ],
            })
          }
          void imageTask
            .runBatch(editor.getState().content, requests, prepared.document)
            .then((applied) => {
              if (applied && !eraser) pushRecent(chosenColor)
            })
        } catch (error) {
          setError(error instanceof Error ? error.message : COPY.scene.paintFailed)
        }
        return false
      }
      if (!gesture.begin(target, chosen, brush, image, prepared ? undefined : scope, document))
        return false
      stroke.current = { last: null, lastMirror: null }
      setError(null)
      setDrawing(true)
      return publish(sample)
    },
    move(input) {
      let sample = input && 'kind' in input ? null : input
      if (input && 'kind' in input) {
        publishing.current = true
        try {
          sample = gesture.surface(input)
        } finally {
          publishing.current = false
        }
        if (!sample) {
          stopStroke()
          return
        }
      }
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
      const applied = gesture.end(commit)
      if (commit && applied && !eraser) pushRecent(chosenColor)
      setDrawing(false)
    },
  }
  return {
    session: data ? session : null,
    /** An explicitly chosen layer/map keeps that exact target until the user leaves it. */
    surfaceMode: !session || !!session.quiet,
    data,
    color,
    ink: chosenColor,
    recentColors,
    favorites: favoriteColors.colors,
    favoritesUnavailable: favoriteColors.unavailable,
    favoritesFull: favoriteColors.full,
    fillScope,
    pieceScope,
    setPieceScope: (value: 'all' | 'selected') => {
      cancel()
      setPieceScope(value)
    },
    grid,
    setGrid,
    setFillScope,
    toggleFavorite: () => favoriteColors.remember(chosenColor),
    sample: (sampled: ScenePaintRgba) => {
      rememberSampled(sampled)
      if (!temporaryPicker) setTool('pencil')
      setError(null)
    },
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
        rememberColor(value)
        if (eraser || picker || rotate || closeupTool) setTool('pencil')
      }
    },
    /** Choosing ink changes tool state only. Palette preparation joins the next stroke. */
    newColorStep: (hex: string) => {
      if (stroke.current || imageTask.busy) return
      const ink: ScenePaintRgba = [...hexToRgb(hex), 255]
      setColor(ink)
      if (eraser || picker || rotate || closeupTool) setTool('pencil')
      setError(null)
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
        const { imageKind } = resolveScenePaintTarget(document, target)
        setSession({
          documentId: document.id,
          target: { ...target },
          ...(options.quiet ? { quiet: true } : {}),
        })
        if (imageKind !== 'color')
          setColor(imageKind === 'normal' ? [128, 128, 255, 255] : [255, 255, 255, 255])
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
