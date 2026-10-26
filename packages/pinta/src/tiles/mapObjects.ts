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
  isObjectLayer,
  normalizeObjectPropertyKey,
  OBJECT_PROPERTY_KEY_PATTERN,
  PINTA_LIMITS,
  type TilemapAsset,
  type TilemapObject,
  type TilemapObjectLayer,
  type TilemapObjectPropertyValue,
} from '../core/project'
import { withMapLayer } from './tilemapOps'

/** Os tipos de valor que a criança escolhe para uma propriedade. */
export const OBJECT_PROPERTY_KINDS = ['text', 'number', 'boolean'] as const

export type ObjectPropertyKind = (typeof OBJECT_PROPERTY_KINDS)[number]

export function isObjectPropertyKind(value: string): value is ObjectPropertyKind {
  return (OBJECT_PROPERTY_KINDS as readonly string[]).includes(value)
}

export function objectPropertyKind(value: TilemapObjectPropertyValue): ObjectPropertyKind {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'text'
}

/** Converte um valor para o tipo escolhido sem perder o que dá para guardar. */
export function convertPropertyValue(
  value: TilemapObjectPropertyValue,
  kind: ObjectPropertyKind,
): TilemapObjectPropertyValue {
  if (kind === 'number') {
    const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (kind === 'boolean') {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    return value.trim() !== '' && value.trim().toLowerCase() !== 'false'
  }
  return String(value).slice(0, PINTA_LIMITS.maxObjectPropertyStringChars)
}

/** O ponto de um objeto: largura e altura zero. */
export function isPointObject(object: TilemapObject): boolean {
  return object.width === 0 && object.height === 0
}

function clampMeasure(value: number): number {
  const rounded = Math.round(Number.isFinite(value) ? value : 0)
  return Math.min(Math.max(rounded, 0), PINTA_LIMITS.maxObjectCoord)
}

function clampText(value: string): string {
  return value.trim().slice(0, PINTA_LIMITS.maxObjectNameChars)
}

/** Encaixa uma coordenada na grade de peças (`step` = tamanho da peça). */
export function snapToGrid(value: number, step: number): number {
  if (!(step > 0)) return Math.round(value)
  return Math.round(value / step) * step
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
    properties: filterProperties(input.properties ?? {}),
  }
}

function filterProperties(
  raw: Record<string, TilemapObjectPropertyValue>,
): Record<string, TilemapObjectPropertyValue> {
  const entries: Array<[string, TilemapObjectPropertyValue]> = []
  for (const [key, value] of Object.entries(raw)) {
    if (entries.length >= PINTA_LIMITS.maxObjectProperties) break
    if (key.length > PINTA_LIMITS.maxObjectPropertyKeyChars) continue
    if (!OBJECT_PROPERTY_KEY_PATTERN.test(key)) continue
    if (typeof value === 'number' && !Number.isFinite(value)) continue
    entries.push([
      key,
      typeof value === 'string' ? value.slice(0, PINTA_LIMITS.maxObjectPropertyStringChars) : value,
    ])
  }
  return Object.fromEntries(entries)
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

/** A camada de OBJETOS com este id (`null` para peças ou id desconhecido). */
export function objectLayerById(tilemap: TilemapAsset, layerId: string): TilemapObjectLayer | null {
  const layer = tilemap.layers.find((l) => l.id === layerId)
  return layer && isObjectLayer(layer) ? layer : null
}

function withObjectLayer(
  tilemap: TilemapAsset,
  layerId: string,
  update: (layer: TilemapObjectLayer) => TilemapObjectLayer,
): TilemapAsset {
  return withMapLayer(tilemap, layerId, (layer) => (isObjectLayer(layer) ? update(layer) : layer))
}

/** Acrescenta o objeto no TOPO da camada. No teto (`maxTilemapObjects`) devolve o mesmo asset. */
export function addMapObject(
  tilemap: TilemapAsset,
  layerId: string,
  object: TilemapObject,
): TilemapAsset {
  return withObjectLayer(tilemap, layerId, (layer) => {
    if (layer.objects.length >= PINTA_LIMITS.maxTilemapObjects) return layer
    if (layer.objects.some((existing) => existing.id === object.id)) return layer
    return { ...layer, objects: [...layer.objects, createMapObject(object)] }
  })
}

/** O que dá para mudar num objeto de uma vez (as propriedades vão inteiras). */
export type MapObjectPatch = Partial<Omit<TilemapObject, 'id'>>

/**
 * Muda campos de um objeto (posição, tamanho, nome, tipo, propriedades), com os
 * mesmos cortes da criação. Mesmo asset quando o resultado é igual.
 */
export function updateMapObject(
  tilemap: TilemapAsset,
  layerId: string,
  objectId: string,
  patch: MapObjectPatch,
): TilemapAsset {
  return withObjectLayer(tilemap, layerId, (layer) => {
    const index = layer.objects.findIndex((object) => object.id === objectId)
    const current = layer.objects[index]
    if (!current) return layer
    const next = createMapObject({ ...current, ...patch, id: current.id })
    if (sameObject(current, next)) return layer
    return { ...layer, objects: layer.objects.map((o, i) => (i === index ? next : o)) }
  })
}

function sameObject(a: TilemapObject, b: TilemapObject): boolean {
  if (
    a.name !== b.name ||
    a.type !== b.type ||
    a.x !== b.x ||
    a.y !== b.y ||
    a.width !== b.width ||
    a.height !== b.height
  ) {
    return false
  }
  const aKeys = Object.keys(a.properties)
  const bKeys = Object.keys(b.properties)
  return (
    aKeys.length === bKeys.length &&
    aKeys.every((key, i) => key === bKeys[i] && a.properties[key] === b.properties[key])
  )
}

export function removeMapObject(
  tilemap: TilemapAsset,
  layerId: string,
  objectId: string,
): TilemapAsset {
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
    if (isPointObject(object)) {
      if (Math.hypot(x - object.x, y - object.y) <= Math.max(slack, 1)) return object
      continue
    }
    if (
      x >= object.x - slack &&
      x <= object.x + object.width + slack &&
      y >= object.y - slack &&
      y <= object.y + object.height + slack
    ) {
      return object
    }
  }
  return null
}
