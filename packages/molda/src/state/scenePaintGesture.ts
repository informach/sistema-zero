import { createGestureCoordinator, type GestureToken } from '../core/gesture'
import { PALETTE_SIZE } from '../core/palette'
import type { BrushSize, Texel } from '../paint/skinPaint'
import type { ScenePixelRegion } from '../scene/composite'
import type { MoldaSceneDocument, SceneImage } from '../scene/document'
import {
  paintSceneImage,
  resolveScenePaintTarget,
  type ScenePaintColor,
  type ScenePaintTarget,
  validateScenePaintColor,
} from '../scene/imagePaint'
import { intersectImageRegions, readImageRegion } from '../scene/imageRegion'
import { requireScene, SceneValidationError } from '../scene/validation'
import type { EditorStore } from './editorStore'

/** 2D and 3D share this revision-owned stroke. A pointer path produces one history entry. */
export function createScenePaintGesture(
  editor: EditorStore<MoldaSceneDocument>,
  onError: (error: unknown) => void,
) {
  const gestures = createGestureCoordinator({
    current: () => editor.getState().asset,
    revision: () => editor.getState().contentRevision,
    preview: (next: MoldaSceneDocument) => editor.getState().replace(next),
    cancel: (before) => editor.getState().cancelGesture(before),
    commit: (before, after) => editor.getState().commitGesture(before, after),
  })
  let active: {
    token: GestureToken<MoldaSceneDocument>
    target: ScenePaintTarget
    color: ScenePaintColor
    brush: BrushSize
    revision: number
    region?: ScenePixelRegion
  } | null = null
  function cancel() {
    const current = active
    active = null
    if (current) gestures.cancel(current.token)
  }
  return {
    begin(
      target: ScenePaintTarget,
      color: ScenePaintColor,
      brush: BrushSize,
      expected?: SceneImage,
      region?: ScenePixelRegion,
    ) {
      cancel()
      try {
        const document = editor.getState().asset
        const { image } = resolveScenePaintTarget(document, target)
        requireScene(
          !expected || image === expected,
          'paint',
          'A imagem mudou. Escolha a camada novamente.',
        )
        validateScenePaintColor(
          image,
          color,
          brush,
          PALETTE_SIZE + (document.extraColors?.length ?? 0),
        )
        const selectedRegion = region ? readImageRegion(region, image) : undefined
        active = {
          token: gestures.begin(),
          target: { ...target },
          color: typeof color === 'number' ? color : [...color],
          brush,
          revision: editor.getState().contentRevision,
          ...(selectedRegion ? { region: selectedRegion } : {}),
        }
        return true
      } catch (error) {
        onError(error)
        return false
      }
    },
    /**
     * `clip` é o limite desta AMOSTRA (a face tocada, o quadro da pintura que se mexe), somado à
     * área escolhida do começo do traço. O traço atravessa faces, e cada pedaço fica na sua.
     */
    segment(from: Texel, to: Texel, clip?: ScenePixelRegion) {
      if (!active) return false
      if (active.revision !== editor.getState().contentRevision) {
        cancel()
        onError(
          new SceneValidationError(
            'revision',
            'A criação mudou durante o traço. Comece a pintar novamente.',
          ),
        )
        return false
      }
      const region = clip
        ? active.region
          ? intersectImageRegions(active.region, clip)
          : clip
        : active.region
      // Pedaço fora da área escolhida: nada a pintar, e o traço segue.
      if (clip && !region) return true
      try {
        const next = paintSceneImage(editor.getState().asset, active.target, {
          from,
          to,
          color: active.color,
          brush: active.brush,
          ...(region ? { region } : {}),
        })
        if (!gestures.preview(active.token, next)) {
          active = null
          return false
        }
        active.revision = editor.getState().contentRevision
        return true
      } catch (error) {
        cancel()
        onError(error)
        return false
      }
    },
    end(commit: boolean) {
      if (!commit) {
        cancel()
        return true
      }
      const current = active
      active = null
      return current !== null && gestures.commit(current.token)
    },
    cancel,
  }
}
