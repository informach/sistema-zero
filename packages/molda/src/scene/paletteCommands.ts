/**
 * "+ Nova cor" no documento novo: os mesmos campos de paleta do editor antigo (`paletteId`,
 * `customPalette` e até 48 `extraColors`) e a mesma regra.
 *
 * ⚠️ Os índices NUNCA se deslocam: a tinta indexada guarda o número da cor, e deslocar uma
 * extra repintaria toda peça que usa as seguintes. Por isso cor que já existe reaproveita o
 * índice em vez de virar extra repetida, e trocar uma extra para uma cor que já existe não
 * acontece (quem chama decide para onde apontar).
 */
import { normalizeHex } from '../core/color'
import { MOLDA_LIMITS } from '../core/limits'
import { PALETTE_SIZE } from '../core/palette'
import { resolvePaletteColors } from '../core/sanitize'
import type { MoldaSceneDocument } from './document'
import { requireScene } from './validation'

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
  const at = index - PALETTE_SIZE
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
  if (index !== PALETTE_SIZE + extras.length - 1) return document
  const next: MoldaSceneDocument = { ...document, extraColors: extras.slice(0, -1) }
  if (!next.extraColors?.length) delete next.extraColors
  return next
}
