/**
 * Dados e carregamento das cinco fontes dos textos vetoriais.
 *
 * O catálogo leve vive no modelo; os bytes WOFF2 ficam em módulos separados e
 * só são importados quando a família aparece no editor ou em um SVG portátil.
 */
import {
  fontFamilyOf,
  VECTOR_FONT_FAMILY_INFO,
  type VectorFontFamily,
  type VectorShape,
} from './model'

export interface VectorFontFaceData {
  family: VectorFontFamily
  weight: string
  unicodeRange: string
  base64: string
}

const LOADERS: Record<VectorFontFamily, () => Promise<{ FONT: VectorFontFaceData }>> = {
  'baloo-2': () => import('./fontData/baloo2'),
  nunito: () => import('./fontData/nunito'),
  'press-start-2p': () => import('./fontData/pressStart2P'),
  bungee: () => import('./fontData/bungee'),
  fredoka: () => import('./fontData/fredoka'),
}

const facePromises = new Map<VectorFontFamily, Promise<VectorFontFaceData>>()

export function loadVectorFontFace(family: VectorFontFamily): Promise<VectorFontFaceData> {
  const cached = facePromises.get(family)
  if (cached) return cached
  const loading = LOADERS[family]().then((module) => module.FONT)
  facePromises.set(family, loading)
  return loading
}

export function vectorFontFaceCss(face: VectorFontFaceData): string {
  const info = VECTOR_FONT_FAMILY_INFO[face.family]
  return (
    '@font-face{' +
    `font-family:'${info.label}';` +
    'font-style:normal;' +
    `font-weight:${face.weight};` +
    'font-display:block;' +
    `src:url(data:font/woff2;base64,${face.base64}) format('woff2');` +
    `unicode-range:${face.unicodeRange};` +
    '}'
  )
}

/** Famílias usadas por textos visíveis, na ordem estável do primeiro uso. */
export function vectorFontsIn(shapes: readonly VectorShape[]): VectorFontFamily[] {
  const found = new Set<VectorFontFamily>()
  for (const shape of shapes) {
    if (shape.hidden !== true && shape.type === 'text') found.add(fontFamilyOf(shape))
  }
  return [...found]
}

export async function vectorFontCssForShapes(shapes: readonly VectorShape[]): Promise<string> {
  const faces = await Promise.all(vectorFontsIn(shapes).map(loadVectorFontFace))
  return faces.map(vectorFontFaceCss).join('')
}

/**
 * Registra uma família no documento do editor. O SVG exportado não depende
 * deste registro: ele recebe a mesma face diretamente em `portableSvg.ts`.
 */
export async function ensureVectorFontLoaded(family: VectorFontFamily): Promise<void> {
  if (typeof document === 'undefined') return
  const id = `pinta-vector-font-${family}`
  if (document.getElementById(id)) return
  const face = await loadVectorFontFace(family)
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = vectorFontFaceCss(face)
  document.head.append(style)
}

export async function ensureVectorFontsForShapes(shapes: readonly VectorShape[]): Promise<void> {
  await Promise.all(vectorFontsIn(shapes).map(ensureVectorFontLoaded))
}
