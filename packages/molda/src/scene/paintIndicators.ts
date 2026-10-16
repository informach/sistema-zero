import { rgbToHex } from '../core/color'
import { sceneAppearanceUsage } from './appearanceUsage'
import {
  compositeSceneImageRegion,
  type SceneRgba,
  sceneBaseColor,
  scenePalette,
} from './composite'
import type { MoldaSceneDocument, SceneImage } from './document'

const imageColors = new WeakMap<SceneImage, Map<string, readonly string[]>>()
const colorKey = (palette: SceneRgba[], base: SceneRgba) => JSON.stringify([palette, base])
export interface ScenePaintColorJob {
  image: SceneImage
  palette: SceneRgba[]
  base: SceneRgba
}
export function cacheScenePaintColors(job: ScenePaintColorJob, colors: readonly string[]) {
  let cache = imageColors.get(job.image)
  if (!cache) {
    cache = new Map()
    imageColors.set(job.image, cache)
  }
  const key = colorKey(job.palette, job.base)
  if (!cache.has(key) && cache.size >= 32) cache.delete(cache.keys().next().value!)
  cache.set(key, colors)
}
/** Bounded histogram: each swatch is an actual composed pixel, never a lighting/selection color. */
export function sceneImagePaintColors(
  image: SceneImage,
  palette: SceneRgba[],
  base: SceneRgba,
): readonly string[] {
  const found = imageColors.get(image)?.get(colorKey(palette, base))
  if (found) return found
  const counts = new Uint32Array(32768),
    representatives = new Uint32Array(32768)
  for (let y = 0; y < image.height; y += 32) {
    const pixels = compositeSceneImageRegion(image, palette, base, {
      x0: 0,
      y0: y,
      x1: image.width - 1,
      y1: Math.min(image.height - 1, y + 31),
    })
    for (let p = 0; p < pixels.length; p += 4) {
      if (!pixels[p + 3]) continue
      const r = pixels[p]!,
        g = pixels[p + 1]!,
        b = pixels[p + 2]!
      const bucket = (r >> 3) * 1024 + (g >> 3) * 32 + (b >> 3)
      if (!counts[bucket]) representatives[bucket] = (r << 16) | (g << 8) | b
      counts[bucket]!++
    }
  }
  const top: number[] = []
  for (let i = 0; i < counts.length; i++)
    if (counts[i]) {
      top.push(i)
      top.sort((a, b) => counts[b]! - counts[a]! || a - b)
      if (top.length > 3) top.pop()
    }
  const result = top.map((bucket) => {
    const rgb = representatives[bucket]!
    return rgbToHex(rgb >> 16, (rgb >> 8) & 255, rgb & 255)
  })
  cacheScenePaintColors({ image, palette, base }, result)
  return result
}

/** Call with the committed snapshot: moving a brush does not rescan the document's textures. */
export function scenePaintIndicators(
  document: MoldaSceneDocument,
  resolve: (
    image: SceneImage,
    palette: SceneRgba[],
    base: SceneRgba,
  ) => readonly string[] | undefined = sceneImagePaintColors,
) {
  const usage = sceneAppearanceUsage(document),
    palette = scenePalette(document)
  const result = new Map<string, string[]>()
  for (const node of document.nodes) {
    if (node.kind !== 'mesh') continue
    const colors = new Set<string>()
    let complete = true
    for (const id of usage.byNode.get(node.id) ?? []) {
      const material = usage.index.materials.get(id)!
      const base = sceneBaseColor(material, palette)
      const image = material.colorImageId
        ? usage.index.images.get(material.colorImageId)
        : undefined
      const composed = image
        ? resolve(image, palette, base)
        : base[3] > 0
          ? [rgbToHex(base[0] * 255, base[1] * 255, base[2] * 255)]
          : []
      if (!composed) complete = false
      for (const color of composed ?? []) colors.add(color)
      if (complete && colors.size >= 3) break
    }
    if (complete) result.set(node.id, [...colors].slice(0, 3))
  }
  return result
}

/** One total pixel-layer budget per render, not one allowance per image. Large jobs leave no
 * misleading swatches while pending. Shared images/base colors are scanned only once. */
export function prepareScenePaintIndicators(document: MoldaSceneDocument, budget = 65_536) {
  const pending: ScenePaintColorJob[] = []
  const jobs = new Map<SceneImage, Map<string, ScenePaintColorJob>>()
  const ready = new Map<ScenePaintColorJob, readonly string[]>()
  let remaining = budget
  const colors = scenePaintIndicators(document, (image, palette, base) => {
    const key = colorKey(palette, base)
    let variants = jobs.get(image)
    if (!variants) {
      variants = new Map()
      jobs.set(image, variants)
    }
    const known = variants.get(key)
    if (known) return ready.get(known)
    const job = { image, palette, base }
    variants.set(key, job)
    const found = imageColors.get(image)?.get(key)
    if (found) {
      ready.set(job, found)
      return found
    }
    const cost =
      image.width *
      image.height *
      Math.max(1, image.layers.filter((layer) => layer.visible && layer.opacity > 0).length)
    if (cost <= remaining) {
      remaining -= cost
      const colors = sceneImagePaintColors(image, palette, base)
      ready.set(job, colors)
      return colors
    }
    pending.push(job)
    return undefined
  })
  return {
    colors,
    pending,
    finish(completed: ReadonlyMap<ScenePaintColorJob, readonly string[]>) {
      return scenePaintIndicators(document, (image, palette, base) => {
        const job = jobs.get(image)?.get(colorKey(palette, base))
        return job ? (ready.get(job) ?? completed.get(job)) : undefined
      })
    },
  }
}
