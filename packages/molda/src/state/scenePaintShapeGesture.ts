import { PALETTE_SIZE } from '../core/palette'
import type { PixelShape } from '../paint/shapeTexels'
import type { BrushSize, Texel } from '../paint/skinPaint'
import type { ScenePixelRegion } from '../scene/composite'
import type { MoldaSceneDocument } from '../scene/document'
import { readSceneGradientOperation, type SceneGradientOperation } from '../scene/imageGradient'
import type { SceneRgbaRaster } from '../scene/imageImport'
import type { SceneImageOperation } from '../scene/imageOperations'
import {
  resolveScenePaintTarget,
  type ScenePaintColor,
  type ScenePaintRgba,
  type ScenePaintSample,
  type ScenePaintTarget,
} from '../scene/imagePaint'
import { imagePointRegion, readImagePoint } from '../scene/imageRegion'
import { readSceneShapeOperation, type SceneShapeOperation } from '../scene/imageShapes'
import {
  readSceneStampOperation,
  type SceneStampOperation,
  type SceneStampSettings,
  sceneStampSize,
} from '../scene/imageStamp'
import { requireScene } from '../scene/validation'
import type { EditorStore } from './editorStore'

export interface ScenePaintDraft {
  tool: PixelShape | 'select' | 'gradient' | 'stamp'
  from: Texel
  to: Texel
  filled: boolean
  stampSize?: { width: number; height: number }
}
export interface ScenePaintScope {
  imageId: string
  width: number
  height: number
  region: ScenePixelRegion
}
export type ScenePaintDraftSettings =
  | { tool: 'select' }
  | ({ region?: ScenePixelRegion } & (
      | { tool: PixelShape; color: ScenePaintColor; brush: BrushSize; filled: boolean }
      | { tool: 'gradient'; color: ScenePaintRgba; endColor: ScenePaintRgba }
      | ({ tool: 'stamp'; raster: SceneRgbaRaster } & SceneStampSettings)
    ))

function draftOperation(
  settings: ScenePaintDraftSettings,
  image: ReturnType<typeof resolveScenePaintTarget>['image'],
  layerId: string,
  point: Texel,
  paletteSize: number,
) {
  if (settings.tool === 'select') return null
  const common = { layerId, ...(settings.region ? { region: settings.region } : {}) }
  if (settings.tool === 'gradient')
    return readSceneGradientOperation(
      {
        ...common,
        kind: 'gradient',
        from: point,
        to: point,
        color: settings.color,
        endColor: settings.endColor,
      },
      image,
    )
  if (settings.tool === 'stamp')
    return readSceneStampOperation(
      {
        ...common,
        kind: 'stamp',
        point,
        raster: settings.raster,
        scale: settings.scale,
        turns: settings.turns,
        flipX: settings.flipX,
        flipY: settings.flipY,
      },
      image,
    )
  return readSceneShapeOperation(
    {
      ...common,
      kind: 'shape',
      shape: settings.tool,
      from: point,
      to: point,
      color: settings.color,
      brush: settings.brush,
      filled: settings.filled,
    },
    image,
    paletteSize,
  )
}

/** Only an outline while dragging. Pixel work starts once, after an accepted release. */
export function createScenePaintShapeGesture(
  editor: EditorStore<MoldaSceneDocument>,
  ports: {
    preview(draft: ScenePaintDraft | null): void
    select(scope: ScenePaintScope): void
    error(error: unknown): void
    run(
      source: MoldaSceneDocument,
      imageId: string,
      operation: SceneImageOperation,
    ): Promise<boolean>
  },
) {
  let active: {
    source: MoldaSceneDocument
    imageId: string
    width: number
    height: number
    revision: number
    region: string
    draft: ScenePaintDraft
    operation: SceneShapeOperation | SceneGradientOperation | SceneStampOperation | null
    unsubscribe(): void
  } | null = null
  function cancel() {
    const current = active
    active = null
    current?.unsubscribe()
    if (current) ports.preview(null)
  }
  return {
    active: () => active !== null,
    cancel,
    begin(
      source: MoldaSceneDocument,
      target: ScenePaintTarget,
      sample: ScenePaintSample,
      settings: ScenePaintDraftSettings,
    ) {
      if (active) return false
      try {
        const state = editor.getState()
        requireScene(
          state.asset === source,
          'revision',
          'A imagem mudou. Comece o desenho novamente.',
        )
        const { image } = resolveScenePaintTarget(source, target)
        const point = readImagePoint(sample.point, image)
        const operation = draftOperation(
          settings,
          image,
          target.layerId,
          point,
          PALETTE_SIZE + (source.extraColors?.length ?? 0),
        )
        const revision = state.contentRevision
        const draft: ScenePaintDraft = {
          tool: settings.tool,
          from: point,
          to: point,
          filled: 'filled' in settings && settings.filled,
          ...(settings.tool === 'stamp'
            ? { stampSize: sceneStampSize(settings.raster, settings) }
            : {}),
        }
        active = {
          source,
          imageId: image.id,
          width: image.width,
          height: image.height,
          revision,
          region: sample.region,
          draft,
          operation,
          unsubscribe: editor.subscribe((state) => {
            if (state.contentRevision !== revision) cancel()
          }),
        }
        ports.preview(draft)
        return true
      } catch (error) {
        ports.error(error)
        return false
      }
    },
    move(sample: ScenePaintSample | null) {
      if (!active) return
      if (!sample || sample.region !== active.region) {
        cancel()
        return
      }
      try {
        const point = readImagePoint(sample.point, active)
        active.draft = { ...active.draft, to: point }
        ports.preview(active.draft)
      } catch (error) {
        cancel()
        ports.error(error)
      }
    },
    end(commit: boolean) {
      const current = active
      cancel()
      if (!commit || !current || editor.getState().contentRevision !== current.revision) return
      if (current.operation)
        void ports.run(
          current.source,
          current.imageId,
          current.operation.kind === 'stamp'
            ? {
                ...current.operation,
                point: current.draft.to,
              }
            : { ...current.operation, to: current.draft.to },
        )
      else
        ports.select({
          imageId: current.imageId,
          width: current.width,
          height: current.height,
          region: imagePointRegion(current.draft.from, current.draft.to),
        })
    },
  }
}
