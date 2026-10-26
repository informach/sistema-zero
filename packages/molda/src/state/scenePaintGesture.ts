import { createGestureCoordinator, type GestureToken } from '../core/gesture'
import { paletteBaseSize } from '../core/sanitize'
import type { BrushSize, Texel } from '../paint/skinPaint'
import type { ScenePixelRegion } from '../scene/composite'
import type { MoldaSceneDocument, SceneImage } from '../scene/document'
import {
  paintSceneImage,
  resolveScenePaintTarget,
  type ScenePaintColor,
  type ScenePaintContact,
  type ScenePaintTarget,
  validateScenePaintColor,
} from '../scene/imagePaint'
import { intersectImageRegions, readImageRegion } from '../scene/imageRegion'
import { prepareScenePaintContact } from '../scene/paintContact'
import { eraseScenePaintCutout } from '../scene/paintCutout'
import { prepareSceneInk } from '../scene/paintInk'
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
    preview: (next: MoldaSceneDocument) => editor.getState().stage(next),
    cancel: (before) => editor.getState().cancelGesture(before),
    commit: (before, after) => editor.getState().commitGesture(before, after),
  })
  let active: {
    token: GestureToken<MoldaSceneDocument>
    target: ScenePaintTarget
    color: ScenePaintColor
    ink: ScenePaintColor
    brush: BrushSize
    revision: number
    prepared: MoldaSceneDocument
    region?: ScenePixelRegion
    cutout: boolean
  } | null = null
  function cancel() {
    const current = active
    active = null
    if (current) gestures.cancel(current.token)
  }
  return {
    checkpoint: () => active?.prepared ?? null,
    restore(document: MoldaSceneDocument) {
      if (!active || !gestures.preview(active.token, document)) return false
      active.prepared = document
      active.revision = editor.getState().contentRevision
      return true
    },
    begin(
      target: ScenePaintTarget,
      color: ScenePaintColor,
      brush: BrushSize,
      expected?: SceneImage,
      region?: ScenePixelRegion,
      preparedDocument?: MoldaSceneDocument,
      cutout = false,
    ) {
      cancel()
      try {
        const document = preparedDocument ?? editor.getState().asset
        const { image } = resolveScenePaintTarget(document, target)
        requireScene(
          !expected || image === expected,
          'paint',
          'A imagem mudou. Escolha a camada novamente.',
        )
        const prepared = prepareSceneInk(document, image.id, color)
        validateScenePaintColor(
          resolveScenePaintTarget(prepared.document, target).image,
          prepared.color,
          brush,
          paletteBaseSize(prepared.document) + (prepared.document.extraColors?.length ?? 0),
        )
        const selectedRegion = region ? readImageRegion(region, image) : undefined
        active = {
          token: gestures.begin(),
          target: { ...target },
          color: prepared.color,
          ink: color,
          prepared: prepared.document,
          brush,
          revision: editor.getState().contentRevision,
          cutout,
          ...(selectedRegion ? { region: selectedRegion } : {}),
        }
        return true
      } catch (error) {
        onError(error)
        return false
      }
    },
    /** A new piece or material joins the same revision-owned stroke. */
    surface(contact: ScenePaintContact) {
      if (!active) return null
      if (active.revision !== editor.getState().contentRevision) {
        cancel()
        onError(
          new SceneValidationError(
            'revision',
            'A criação mudou durante o traço. Comece a pintar novamente.',
          ),
        )
        return null
      }
      try {
        const result = prepareScenePaintContact(active.prepared, contact)
        const prepared = prepareSceneInk(result.document, result.target.imageId, active.ink)
        active.target = result.target
        active.prepared = prepared.document
        active.color = prepared.color
        return result.sample
      } catch (error) {
        cancel()
        onError(error)
        return null
      }
    },
    /**
     * `clip` é o limite desta AMOSTRA (a face tocada, o quadro da pintura que se mexe), somado à
     * área escolhida do começo do traço. O traço atravessa faces, e cada pedaço fica na sua.
     */
    segment(from: Texel, to: Texel, clip?: ScenePixelRegion, target?: ScenePaintTarget) {
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
        if (target) {
          const prepared = prepareSceneInk(active.prepared, target.imageId, active.ink)
          active.prepared = prepared.document
          active.color = prepared.color
          active.target = target
        }
        const segment = {
          from,
          to,
          color: active.color,
          brush: active.brush,
          ...(region ? { region } : {}),
        }
        const next = active.cutout
          ? eraseScenePaintCutout(active.prepared, active.target, segment)
          : paintSceneImage(active.prepared, active.target, segment)
        if (!gestures.preview(active.token, next)) {
          active = null
          return false
        }
        active.revision = editor.getState().contentRevision
        active.prepared = next
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
