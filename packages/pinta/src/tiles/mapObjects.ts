/**
 * Operações PURAS sobre os OBJETOS das camadas de objetos do mapa (ponto de
 * partida, inimigo, porta, área de colisão…). Mesmo contrato das ops de
 * `tilemapOps.ts`: devolvem um asset novo ou o MESMO asset quando nada muda.
 *
 * Coordenadas em PIXELS DO MAPA. Os tetos (`PINTA_LIMITS`) são os mesmos do
 * sanitize: o que a edição produz sempre sobrevive ao próximo load.
 */
import { COPY } from '../core/copy'
import { newId } from '../core/id'
import {
  effectiveLayer,
  isObjectLayer,
  normalizeObjectPropertyKey,
  PINTA_LIMITS,
  PINTA_MAP_FORMAT_LIMITS,
  sanitizeObjectExtras,
  sanitizeObjectProperties,
  sanitizeRegionMapObject,
  type TilemapObject,
  type TilemapObjectLayer,
  type TilemapObjectPropertyValue,
} from '../core/project'
import type { AuthorMap } from './mapCellEdits'
import { objectContains } from './objectGeometry'
import { withMapLayer } from './tilemapOps'

/** Os tipos de valor que a criança escolhe para uma propriedade. */
export const OBJECT_PROPERTY_KINDS = [
  'text',
  'number',
  'boolean',
  'int',
  'float',
  'color',
  'object',
  'asset',
] as const

export type ObjectPropertyKind = (typeof OBJECT_PROPERTY_KINDS)[number]

export function isObjectPropertyKind(value: string): value is ObjectPropertyKind {
  return (OBJECT_PROPERTY_KINDS as readonly string[]).includes(value)
}

export function objectPropertyKind(value: TilemapObjectPropertyValue): ObjectPropertyKind {
  if (typeof value === 'object') return value.type
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'text'
}

/** Converte um valor para o tipo escolhido sem perder o que dá para guardar. */
export function convertPropertyValue(
  value: TilemapObjectPropertyValue,
  kind: ObjectPropertyKind,
): TilemapObjectPropertyValue {
  const primitive = typeof value === 'object' ? value.value : value
  if (kind === 'int' || kind === 'float') {
    const parsed = Number(String(primitive).replace(',', '.'))
    return {
      type: kind,
      value: Number.isFinite(parsed) ? (kind === 'int' ? Math.round(parsed) : parsed) : 0,
    }
  }
  if (kind === 'color')
    return {
      type: kind,
      value: /^#[\da-f]{6}([\da-f]{2})?$/i.test(String(primitive))
        ? String(primitive).toLowerCase()
        : '#000000',
    }
  if (kind === 'object' || kind === 'asset')
    return { type: kind, value: String(primitive).slice(0, 200) || 'nenhum' }
  if (kind === 'number') {
    const parsed =
      typeof primitive === 'number' ? primitive : Number(String(primitive).replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (kind === 'boolean') {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    return String(primitive).trim() !== '' && String(primitive).trim().toLowerCase() !== 'false'
  }
  return String(primitive).slice(0, PINTA_LIMITS.maxObjectPropertyStringChars)
}

/** O ponto de um objeto: largura e altura zero. */
export function isPointObject(object: TilemapObject): boolean {
  return object.shape === 'point' || (!object.shape && object.width === 0 && object.height === 0)
}

function clampMeasure(value: number): number {
  const rounded = Math.round(Number.isFinite(value) ? value : 0)
  return Math.min(Math.max(rounded, 0), PINTA_MAP_FORMAT_LIMITS.maxObjectCoord)
}

function clampText(value: string): string {
  return value.trim().slice(0, PINTA_LIMITS.maxObjectNameChars)
}

/** Encaixa uma coordenada na grade de peças (`step` = tamanho da peça). */
export function snapToGrid(value: number, step: number): number {
  if (!(step > 0)) return Math.round(value)
  return Math.round(value / step) * step
}

/** Um marcador fica no centro da casa; áreas e artes usam as bordas. */
export function snapObjectPoint(value: number, tileSize: number, snap: boolean): number {
  return snap && tileSize > 0
    ? Math.floor(value / tileSize) * tileSize + tileSize / 2
    : Math.round(value)
}

/**
 * Um objeto novo, já dentro dos tetos. Sem `width`/`height` nasce PONTO. Os
 * campos de texto são cortados e as propriedades passam pelo mesmo filtro do
 * sanitize.
 */
export function createMapObject(
  input: Partial<Omit<TilemapObject, 'id'>> & { id?: string } = {},
): TilemapObject {
  return {
    id: input.id ?? newId(),
    name: clampText(input.name ?? ''),
    type: clampText(input.type ?? ''),
    x: clampMeasure(input.x ?? 0),
    y: clampMeasure(input.y ?? 0),
    width: clampMeasure(input.width ?? 0),
    height: clampMeasure(input.height ?? 0),
    properties: sanitizeObjectProperties(input.properties ?? {}),
    ...sanitizeObjectExtras(input),
  }
}

/** Nome automático do próximo objeto da camada ("Objeto 3"). */
export function nextObjectName(layer: TilemapObjectLayer): string {
  const taken = new Set(layer.objects.map((object) => object.name))
  for (let n = layer.objects.length + 1; n < layer.objects.length + 1000; n += 1) {
    const candidate = `${COPY.tiles.objectNamePrefix} ${n}`
    if (!taken.has(candidate)) return candidate
  }
  return COPY.tiles.objectNamePrefix
}

/** Region authoring preserves signed fractional geometry or refuses the whole object. */
export function createRegionMapObject(
  input: Partial<Omit<TilemapObject, 'id'>> & { id?: string } = {},
): TilemapObject | null {
  return sanitizeRegionMapObject({
    ...input,
    id: input.id ?? newId(),
    name: input.name ?? '',
    type: input.type ?? '',
    x: input.x ?? 0,
    y: input.y ?? 0,
    width: input.width ?? 0,
    height: input.height ?? 0,
    properties: input.properties ?? {},
  })
}

/** A camada de OBJETOS com este id (`null` para peças ou id desconhecido). */
export function objectLayerById(tilemap: AuthorMap, layerId: string): TilemapObjectLayer | null {
  const layer = tilemap.layers.find((l) => l.id === layerId)
  return layer && isObjectLayer(layer) ? layer : null
}

function withObjectLayer<Map extends AuthorMap>(
  tilemap: Map,
  layerId: string,
  update: (layer: TilemapObjectLayer) => TilemapObjectLayer,
): Map {
  return withMapLayer(tilemap, layerId, (layer) =>
    isObjectLayer(layer) && !effectiveLayer(tilemap, layer).locked ? update(layer) : layer,
  )
}

/** Acrescenta o objeto no TOPO da camada. No teto (`maxTilemapObjects`) devolve o mesmo asset. */
export function addMapObject<Map extends AuthorMap>(
  tilemap: Map,
  layerId: string,
  object: TilemapObject,
): Map {
  return addMapObjects(tilemap, layerId, [object])
}

/** Insere o lote inteiro ou nada, com as mesmas guardas da inserção única. */
export function addMapObjects<Map extends AuthorMap>(
  tilemap: Map,
  layerId: string,
  objects: readonly TilemapObject[],
): Map {
  if (objects.length === 0) return tilemap
  return withObjectLayer(tilemap, layerId, (layer) => {
    if (layer.objects.length + objects.length > PINTA_LIMITS.maxTilemapObjects) return layer
    const ids = new Set(
      ('origin' in tilemap
        ? tilemap.layers.filter(isObjectLayer).flatMap((l) => l.objects)
        : layer.objects
      ).map((object) => object.id),
    )
    const added: TilemapObject[] = []
    for (const object of objects) {
      if (ids.has(object.id)) return layer
      const normalized =
        'origin' in tilemap ? createRegionMapObject(object) : createMapObject(object)
      if (!normalized) return layer
      if (ids.has(normalized.id)) return layer
      ids.add(normalized.id)
      added.push(normalized)
    }
    return { ...layer, objects: [...layer.objects, ...added] }
  })
}

/** O que dá para mudar num objeto de uma vez (as propriedades vão inteiras). */
export type MapObjectPatch = Partial<Omit<TilemapObject, 'id'>>

/**
 * Muda campos de um objeto (posição, tamanho, nome, tipo, propriedades), com os
 * mesmos cortes da criação. Mesmo asset quando o resultado é igual.
 */
export function updateMapObject<Map extends AuthorMap>(
  tilemap: Map,
  layerId: string,
  objectId: string,
  patch: MapObjectPatch,
): Map {
  return updateMapObjects(tilemap, layerId, new Map([[objectId, patch]]))
}

/** Admit every target first; one invalid object keeps the complete previous history value. */
export function updateMapObjects<Map extends AuthorMap>(
  tilemap: Map,
  layerId: string,
  patches: ReadonlyMap<string, MapObjectPatch>,
): Map {
  if (!patches.size) return tilemap
  return withObjectLayer(tilemap, layerId, (layer) => {
    if (patches.size > layer.objects.length) return layer
    const existing = new Map(layer.objects.map((object) => [object.id, object]))
    const updates = new Map<string, TilemapObject>()
    for (const [id, patch] of patches) {
      const current = existing.get(id)
      if (!current) return layer
      const input = { ...current, ...patch, id: current.id }
      const next = 'origin' in tilemap ? createRegionMapObject(input) : createMapObject(input)
      if (!next) return layer
      if (!sameObject(current, next)) updates.set(id, next)
    }
    return updates.size
      ? { ...layer, objects: layer.objects.map((object) => updates.get(object.id) ?? object) }
      : layer
  })
}

function sameObject(a: TilemapObject, b: TilemapObject): boolean {
  if (
    a.name !== b.name ||
    a.type !== b.type ||
    a.x !== b.x ||
    a.y !== b.y ||
    a.width !== b.width ||
    a.height !== b.height ||
    JSON.stringify([
      a.shape,
      a.points,
      a.rotation,
      a.flipX,
      a.flipY,
      a.art,
      a.role,
      a.setId,
      a.collision,
    ]) !==
      JSON.stringify([
        b.shape,
        b.points,
        b.rotation,
        b.flipX,
        b.flipY,
        b.art,
        b.role,
        b.setId,
        b.collision,
      ])
  ) {
    return false
  }
  const aKeys = Object.keys(a.properties)
  const bKeys = Object.keys(b.properties)
  return (
    aKeys.length === bKeys.length &&
    aKeys.every(
      (key, i) =>
        key === bKeys[i] && JSON.stringify(a.properties[key]) === JSON.stringify(b.properties[key]),
    )
  )
}

export function removeMapObject<Map extends AuthorMap>(
  tilemap: Map,
  layerId: string,
  objectId: string,
): Map {
  return withObjectLayer(tilemap, layerId, (layer) => {
    if (!layer.objects.some((object) => object.id === objectId)) return layer
    return { ...layer, objects: layer.objects.filter((object) => object.id !== objectId) }
  })
}

/** Por que uma propriedade não entrou (a UI transforma em recado). */
export type PropertyRefusal = 'invalid-key' | 'duplicate-key' | 'limit'

/**
 * As propriedades com UMA chave nova ou trocada. `previousKey` renomeia mantendo
 * a ORDEM (a lista não pula na tela). Chave digitada é normalizada
 * (`normalizeObjectPropertyKey`).
 */
export function withObjectProperty(
  properties: Record<string, TilemapObjectPropertyValue>,
  rawKey: string,
  value: TilemapObjectPropertyValue,
  previousKey?: string,
):
  | { ok: true; properties: Record<string, TilemapObjectPropertyValue> }
  | {
      ok: false
      reason: PropertyRefusal
    } {
  const key = normalizeObjectPropertyKey(rawKey)
  if (!key) return { ok: false, reason: 'invalid-key' }
  const has = (k: string): boolean => Object.hasOwn(properties, k)
  if (key !== previousKey && has(key)) return { ok: false, reason: 'duplicate-key' }
  const entries = Object.entries(properties)
  if (previousKey !== undefined && has(previousKey)) {
    return {
      ok: true,
      properties: Object.fromEntries(
        entries.map(([k, v]) => (k === previousKey ? [key, value] : [k, v])),
      ),
    }
  }
  if (entries.length >= PINTA_LIMITS.maxObjectProperties) return { ok: false, reason: 'limit' }
  return { ok: true, properties: Object.fromEntries([...entries, [key, value]]) }
}

export function withoutObjectProperty(
  properties: Record<string, TilemapObjectPropertyValue>,
  key: string,
): Record<string, TilemapObjectPropertyValue> {
  return Object.fromEntries(Object.entries(properties).filter(([k]) => k !== key))
}

/** Uma chave livre para a próxima propriedade ("propriedade", "propriedade_2"…). */
export function nextPropertyKey(properties: Record<string, TilemapObjectPropertyValue>): string {
  const base = COPY.tiles.objectPropertyDefaultKey
  if (!Object.hasOwn(properties, base)) return base
  for (let n = 2; n <= PINTA_LIMITS.maxObjectProperties + 1; n += 1) {
    const candidate = `${base}_${n}`
    if (!Object.hasOwn(properties, candidate)) return candidate
  }
  return `${base}_${Date.now().toString(36)}`
}

/**
 * O objeto sob o ponto (pixels do mapa), do TOPO para baixo. Ponto é acertado
 * num raio de `slack`; retângulo pela caixa crescida de `slack`.
 */
export function objectAt(
  layer: TilemapObjectLayer,
  x: number,
  y: number,
  slack = 0,
): TilemapObject | null {
  for (let i = layer.objects.length - 1; i >= 0; i -= 1) {
    const object = layer.objects[i]
    if (!object) continue
    if (objectContains(object, x, y, slack)) return object
  }
  return null
}
