/**
 * "+ Nova cor" no documento novo: os mesmos campos de paleta do editor antigo (`paletteId`,
 * `customPalette` e até 48 `extraColors`) e a mesma regra.
 *
 * Ao mudar o tamanho da paleta base, os índices das extras são remapeados na tinta e nos
 * materiais para preservar as cores. Adicionar uma cor já existente reaproveita seu índice.
 */
import { hexToRgb, normalizeHex } from '../core/color'
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaCustomPalette } from '../core/model'
import { getPalette, type PaletteId } from '../core/palette'
import { paletteBaseSize, resolvePaletteColors } from '../core/sanitize'
import type { MoldaSceneDocument } from './document'
import { requireScene } from './validation'

export type ScenePaletteChoice =
  | { paletteId: PaletteId; customPalette?: never }
  | { paletteId: 'custom'; customPalette: MoldaCustomPalette }

/** Trocar a base preserva as cores extras, inclusive quando o tamanho muda. */
export function setScenePalette(
  document: MoldaSceneDocument,
  choice: ScenePaletteChoice,
): MoldaSceneDocument {
  if (
    document.paletteId === choice.paletteId &&
    (choice.paletteId !== 'custom' ||
      (document.customPalette?.name === choice.customPalette.name &&
        document.customPalette.colors.length === choice.customPalette.colors.length &&
        document.customPalette.colors.every(
          (color, index) => color === choice.customPalette.colors[index],
        )))
  )
    return document
  const oldBase =
    document.paletteId === 'custom' && document.customPalette
      ? document.customPalette.colors
      : getPalette(document.paletteId).colors
  const nextBase =
    choice.paletteId === 'custom'
      ? choice.customPalette.colors
      : getPalette(choice.paletteId).colors
  const oldSize = oldBase.length
  const nextSize = nextBase.length
  const { customPalette: _previous, ...rest } = document
  if (oldSize === nextSize) return { ...rest, ...choice }
  const extraEnd = oldSize + (document.extraColors?.length ?? 0)
  const nearest = (hex: string): number => {
    if (!hex) return 0
    const exact = nextBase.indexOf(hex, 1)
    if (exact > 0) return exact
    const rgb = hexToRgb(hex)
    let best = 0
    let distance = Number.POSITIVE_INFINITY
    for (let i = 1; i < nextSize; i += 1) {
      if (!nextBase[i]) continue
      const candidate = hexToRgb(nextBase[i]!)
      const dr = rgb[0] - candidate[0]
      const dg = rgb[1] - candidate[1]
      const db = rgb[2] - candidate[2]
      const value = 2 * dr * dr + 4 * dg * dg + 3 * db * db
      if (value < distance) {
        best = i
        distance = value
      }
    }
    return best
  }
  const removed = Array.from({ length: Math.max(0, oldSize - nextSize) }, (_, i) =>
    nearest(oldBase[nextSize + i] ?? ''),
  )
  const remap = (index: number): number => {
    if (index >= oldSize && index < extraEnd) return index + nextSize - oldSize
    if (index >= nextSize && index < oldSize) return removed[index - nextSize] ?? 0
    return index
  }
  return {
    ...rest,
    ...choice,
    materials: document.materials.map((material) =>
      material.baseColor.kind === 'palette'
        ? {
            ...material,
            baseColor: { kind: 'palette' as const, index: remap(material.baseColor.index) },
          }
        : material,
    ),
    images: document.images.map((image) =>
      image.encoding === 'indexed'
        ? {
            ...image,
            layers: image.layers.map((layer) => ({
              ...layer,
              pixels: Uint8Array.from(layer.pixels, remap),
            })),
          }
        : image,
    ),
  }
}

function readHex(hex: string) {
  const normalized = normalizeHex(hex)
  requireScene(normalized, 'color', 'Escolha uma cor válida.')
  return normalized
}

/**
 * A cor na paleta: a que já existe (mesmo documento) ou uma extra nova no fim. `null` quando as
 * 48 extras já estão ocupadas.
 */
export function addScenePaletteColor(
  document: MoldaSceneDocument,
  hex: string,
): { document: MoldaSceneDocument; index: number } | null {
  const color = readHex(hex)
  const colors = resolvePaletteColors(document)
  const existing = colors.indexOf(color)
  if (existing > 0) return { document, index: existing }
  const extras = document.extraColors ?? []
  if (extras.length >= MOLDA_LIMITS.maxExtraColors) return null
  return { document: { ...document, extraColors: [...extras, color] }, index: colors.length }
}

/**
 * Troca a cor de UMA extra no lugar: o gesto do seletor nativo muda a mesma extra a cada passo.
 * Mesmo documento quando nada muda: índice fora das extras, cor igual, ou cor que já existe em
 * qualquer índice (duplicar deslocaria índices numa limpeza futura).
 */
export function updateScenePaletteColor(
  document: MoldaSceneDocument,
  index: number,
  hex: string,
): MoldaSceneDocument {
  const color = readHex(hex)
  const extras = document.extraColors ?? []
  const at = index - paletteBaseSize(document)
  if (at < 0 || at >= extras.length || extras[at] === color) return document
  if (resolvePaletteColors(document).includes(color)) return document
  const next = [...extras]
  next[at] = color
  return { ...document, extraColors: next }
}

/**
 * Tira a ÚLTIMA extra, e só ela: é o desfazer de dentro do gesto, quando a criança arrasta o
 * seletor até uma cor que já existe. Nenhuma tinta usa uma extra criada neste mesmo gesto.
 */
export function dropLastScenePaletteColor(
  document: MoldaSceneDocument,
  index: number,
): MoldaSceneDocument {
  const extras = document.extraColors ?? []
  if (index !== paletteBaseSize(document) + extras.length - 1) return document
  const next: MoldaSceneDocument = { ...document, extraColors: extras.slice(0, -1) }
  if (!next.extraColors?.length) delete next.extraColors
  return next
}
