/** SVG autocontido: o mesmo documento alimenta download e rasterizações. */
import { vectorFontCssForShapes } from './fonts'
import type { VectorShape } from './model'
import { type VectorDoc, vectorToSvg } from './svg'

export async function embedVectorFonts(
  svg: string,
  shapes: readonly VectorShape[],
): Promise<string> {
  const css = await vectorFontCssForShapes(shapes)
  if (!css) return svg
  const rootEnd = svg.indexOf('>')
  if (rootEnd < 0) return svg
  return `${svg.slice(0, rootEnd + 1)}\n  <style>${css}</style>${svg.slice(rootEnd + 1)}`
}

export async function vectorToPortableSvg(doc: VectorDoc): Promise<string> {
  return embedVectorFonts(vectorToSvg(doc), doc.shapes)
}
