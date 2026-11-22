import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { utf8ByteLength } from '../../core/jsonBytes'
import { type AnyTilesetAsset, PINTA_MAP_FORMAT_LIMITS } from '../../core/project'
import { encodePintaBackupAsset } from '../../export/projectJson'
import { isValidCellForTiles } from '../cell'

export const AUTOMAP_LIMITS = {
  rules: 64,
  side: 16,
  layers: 8,
  writes: 65536,
  comparisons: 1048576,
  fileBytes: 4 * 1024 * 1024,
} as const
export interface PatternLayer {
  layer: string
  sheet: string
  sha256: string
  cells: (number | null)[]
}
export interface AutomapRule {
  id: string
  name: string
  width: number
  height: number
  input: PatternLayer[]
  outputs: PatternLayer[][]
}
export interface AutomapBook {
  format: 'pinta-regras'
  version: 1
  seed: number
  rules: AutomapRule[]
}
export interface SheetIdentity {
  sha256: string
  count: number
}
export type SheetIndex = ReadonlyMap<string, SheetIdentity>
const signatures = new WeakMap<AnyTilesetAsset, Promise<SheetIdentity>>()
/** Ordered art, physics and tile metadata determine slot identity. Renaming or duplicating a sheet preserves its digest. */
export function automapSheetIdentity(sheet: AnyTilesetAsset): Promise<SheetIdentity> {
  let signature = signatures.get(sheet)
  if (!signature) {
    const wire = encodePintaBackupAsset(sheet) as Record<string, unknown>
    const properties = Object.fromEntries(
      Object.entries(sheet.tileProperties ?? {}).map(([index, props]) => [
        index,
        Object.fromEntries(
          Object.entries(props).map(([key, v]) => [
            key,
            typeof v === 'object' && v.type === 'asset' && v.value === sheet.id
              ? { type: 'self' }
              : v,
          ]),
        ),
      ]),
    )
    signature = sha256Hex(
      canonicalJson({
        kind: sheet.kind,
        tileSize: sheet.tileSize,
        tiles: wire.tiles,
        solid: sheet.solid,
        platform: sheet.platform,
        animations: sheet.animations ?? {},
        terrains: sheet.terrains ?? [],
        properties,
        palette:
          sheet.kind === 'tileset'
            ? [sheet.paletteId, sheet.customPalette ?? null, sheet.extraColors ?? null]
            : null,
      }),
    ).then((sha256) => ({ sha256, count: sheet.tiles.length }))
    signatures.set(sheet, signature)
  }
  return signature
}
const keys = (v: unknown, names: string[]): v is Record<string, unknown> =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.keys(v).length === names.length &&
  names.every((name) => Object.hasOwn(v, name))
const id = (s: unknown): s is string =>
  typeof s === 'string' &&
  s.length > 0 &&
  s.length <= 128 &&
  Array.from(s).every((char) => char.charCodeAt(0) >= 32)
const bounded = (v: unknown, max: number): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v > 0 && v <= max

export function readAutomapBook(text: string): AutomapBook | null {
  if (text.length > AUTOMAP_LIMITS.fileBytes || utf8ByteLength(text) > AUTOMAP_LIMITS.fileBytes)
    return null
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  if (
    !keys(value, ['format', 'version', 'seed', 'rules']) ||
    value.format !== 'pinta-regras' ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.seed) ||
    (value.seed as number) !== ((value.seed as number) | 0) ||
    !Array.isArray(value.rules) ||
    value.rules.length > AUTOMAP_LIMITS.rules
  )
    return null
  const names = new Set<string>()
  for (const rule of value.rules) {
    if (
      !keys(rule, ['id', 'name', 'width', 'height', 'input', 'outputs']) ||
      !id(rule.id) ||
      names.has(rule.id) ||
      !id(rule.name) ||
      !bounded(rule.width, AUTOMAP_LIMITS.side) ||
      !bounded(rule.height, AUTOMAP_LIMITS.side) ||
      !Array.isArray(rule.outputs) ||
      !bounded(rule.outputs.length, AUTOMAP_LIMITS.rules)
    )
      return null
    names.add(rule.id)
    const size = rule.width * rule.height
    const used = new Set<string>()
    for (const planes of [rule.input, ...rule.outputs]) {
      if (!Array.isArray(planes) || !bounded(planes.length, AUTOMAP_LIMITS.layers)) return null
      const own = new Set<string>()
      for (const p of planes) {
        if (
          !keys(p, ['layer', 'sheet', 'sha256', 'cells']) ||
          !id(p.layer) ||
          !id(p.sheet) ||
          own.has(p.layer) ||
          typeof p.sha256 !== 'string' ||
          !/^[a-f0-9]{64}$/.test(p.sha256) ||
          !Array.isArray(p.cells) ||
          p.cells.length !== size ||
          !p.cells.some((v) => v !== null) ||
          !p.cells.every(
            (v) => v === null || isValidCellForTiles(v, PINTA_MAP_FORMAT_LIMITS.maxTiles),
          )
        )
          return null
        own.add(p.layer)
        used.add(p.layer)
      }
    }
    if (used.size > AUTOMAP_LIMITS.layers) return null
  }
  return value as unknown as AutomapBook
}
