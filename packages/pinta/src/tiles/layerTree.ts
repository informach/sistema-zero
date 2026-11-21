import { COPY } from '../core/copy'
import { newId } from '../core/id'
import {
  effectiveLayer,
  isGroupLayer,
  isTileLayer,
  layerAncestors,
  PINTA_LIMITS,
  PINTA_MAP_FORMAT_LIMITS,
  sanitizeObjectProperties,
  sanitizeRegionLayerHeader,
  type TilemapCells,
  type TilemapLayer,
  tilemapLayerHeader,
} from '../core/project'
import type { AuthorMap } from './mapCellEdits'

export function addMapGroup<Map extends AuthorMap>(map: Map, name: string): Map {
  if (map.layers.length >= PINTA_LIMITS.maxTilemapLayers) return map
  return {
    ...map,
    layers: [
      ...map.layers,
      {
        id: newId(),
        kind: 'group',
        name: name.trim().slice(0, 30) || COPY.tiles.group,
        visible: true,
      },
    ],
  }
}
export function updateMapLayer<Map extends AuthorMap>(
  map: Map,
  id: string,
  patch: Partial<
    Pick<
      TilemapLayer,
      | 'name'
      | 'opacity'
      | 'locked'
      | 'offsetX'
      | 'offsetY'
      | 'parallaxX'
      | 'parallaxY'
      | 'properties'
    >
  >,
): Map {
  const layer = map.layers.find((l) => l.id === id)
  if (!layer) return map
  const next = { ...layer, ...patch }
  if ('origin' in map) {
    const header = { ...tilemapLayerHeader(layer), ...patch }
    if (!header.locked) delete header.locked
    if (!sanitizeRegionLayerHeader(header)) return map
    if (JSON.stringify(header) === JSON.stringify(tilemapLayerHeader(layer))) return map
    if (!next.locked) delete next.locked
    for (const key of [
      'opacity',
      'offsetX',
      'offsetY',
      'parallaxX',
      'parallaxY',
      'properties',
    ] as const)
      if (next[key] === undefined) delete next[key]
    return { ...map, layers: map.layers.map((l) => (l === layer ? next : l)) }
  }
  next.name = next.name.trim().slice(0, 30) || layer.name
  for (const key of ['opacity', 'offsetX', 'offsetY', 'parallaxX', 'parallaxY'] as const) {
    const value = next[key]
    if (value === undefined) continue
    const max =
      key === 'opacity'
        ? 1
        : key.startsWith('parallax')
          ? PINTA_MAP_FORMAT_LIMITS.maxLayerParallax
          : PINTA_MAP_FORMAT_LIMITS.maxLayerOffset
    next[key] = Number.isFinite(value)
      ? Math.max(key.startsWith('offset') ? -max : 0, Math.min(max, value))
      : layer[key]
    if (next[key] === (key === 'opacity' || key.startsWith('parallax') ? 1 : 0)) delete next[key]
  }
  if (!next.locked) delete next.locked
  if (next.properties) {
    next.properties = sanitizeObjectProperties(next.properties)
    if (!Object.keys(next.properties).length) delete next.properties
  }
  if (JSON.stringify(tilemapLayerHeader(next)) === JSON.stringify(tilemapLayerHeader(layer)))
    return map
  return { ...map, layers: map.layers.map((l) => (l === layer ? next : l)) }
}
function subtree(map: AuthorMap, id: string): TilemapLayer<TilemapCells>[] {
  return map.layers.filter((l) => l.id === id || layerAncestors(map, l).some((g) => g.id === id))
}
export function setMapLayerParent<Map extends AuthorMap>(
  map: Map,
  id: string,
  parentId?: string,
): Map {
  const layer = map.layers.find((l) => l.id === id),
    parent = map.layers.find((l) => l.id === parentId)
  if (!layer || layer.parentId === parentId || (parentId && (!parent || !isGroupLayer(parent))))
    return map
  const moving = subtree(map, id),
    ids = new Set(moving.map((l) => l.id))
  if (parentId && ids.has(parentId)) return map
  const depth = parent ? layerAncestors(map, parent).length + 1 : 0
  const oldDepth = layerAncestors(map, layer).length
  if (
    moving.some(
      (l) =>
        isGroupLayer(l) &&
        layerAncestors(map, l).length - oldDepth + depth >= PINTA_MAP_FORMAT_LIMITS.maxGroupDepth,
    )
  )
    return map
  const rest = map.layers.filter((l) => !ids.has(l.id))
  const { parentId: _old, ...bare } = layer
  const next = { ...bare, ...(parentId ? { parentId } : {}) }
  const at = parent ? rest.indexOf(parent) + 1 : rest.length
  return {
    ...map,
    layers: [...rest.slice(0, at), next, ...moving.filter((l) => l.id !== id), ...rest.slice(at)],
  }
}
export function moveMapLayer<Map extends AuthorMap>(map: Map, id: string, direction: -1 | 1): Map {
  const layer = map.layers.find((l) => l.id === id)
  if (!layer) return map
  const siblings = map.layers.filter((l) => l.parentId === layer.parentId)
  const other = siblings[siblings.indexOf(layer) + direction]
  if (!other) return map
  const a = subtree(map, layer.id),
    b = subtree(map, other.id),
    ids = new Set([...a, ...b].map((l) => l.id))
  const index = Math.min(...map.layers.flatMap((l, i) => (ids.has(l.id) ? [i] : [])))
  const rest = map.layers.filter((l) => !ids.has(l.id)),
    blocks = direction === -1 ? [...a, ...b] : [...b, ...a]
  return { ...map, layers: [...rest.slice(0, index), ...blocks, ...rest.slice(index)] }
}
export function toggleMapLayerCollision<Map extends AuthorMap>(map: Map, id: string): Map {
  const layer = map.layers.find((l) => l.id === id)
  if (!layer || !isTileLayer<TilemapCells>(layer) || effectiveLayer(map, layer).locked) return map
  const { collision, ...rest } = layer
  return {
    ...map,
    layers: map.layers.map((l) =>
      l === layer ? (collision ? rest : { ...rest, collision: true }) : l,
    ),
  }
}
