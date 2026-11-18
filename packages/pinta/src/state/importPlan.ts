/**
 * O PLANO de uma importação de desenhos (puro): nomes únicos contra a galeria, ids novos e
 * mapas religados às peças que vieram junto. Compartilhado pela galeria (`importAssets`, o
 * restauro de backup e o pacote) e pela biblioteca do Estúdio (`importDrawingsForStudio`, os
 * desenhos de um jogo de exemplo), que precisa saber QUAL id novo cada desenho ganhou.
 */
import { COPY } from '../core/copy'
import { newId } from '../core/id'
import type { TilemapObjectPropertyValue } from '../core/project'
import {
  isObjectLayer,
  isTilesetKind,
  PINTA_LIMITS,
  type PintaAsset,
  remapTilemapTilesetIds,
  type TilemapAsset,
} from '../core/project'

/** Nome único por sufixo numérico (`heroi` → `heroi-2`), respeitando o teto. */
export function uniqueName(base: string, taken: Set<string>): string | null {
  if (!taken.has(base)) return base
  // Sem teto de desenhos na galeria, o sufixo vai até 999 antes de desistir.
  for (let n = 2; n <= 999; n += 1) {
    const suffix = `-${n}`
    const prefix = base.slice(0, PINTA_LIMITS.maxNameChars - suffix.length).replace(/-+$/, '')
    const candidate = `${prefix}${suffix}`
    if (!taken.has(candidate)) return candidate
  }
  return null
}

/** Clona um asset com ids NOVOS (asset + animações + camadas) p/ o Duplicar e a importação. */
export function cloneWithNewIds(asset: PintaAsset, name: string): PintaAsset {
  const now = Date.now()
  const copy = structuredClone(asset)
  copy.id = newId()
  copy.name = name
  copy.createdAt = now
  copy.updatedAt = now
  // A cópia é um desenho NOVO: a marca "sou a cópia daquele documento" fica com o original.
  delete copy.sourceRef
  if (copy.kind === 'pixel-sprite') {
    copy.animations = copy.animations.map((a) => ({ ...a, id: newId() }))
  } else if (copy.kind === 'vector-sprite') {
    copy.animations = copy.animations.map((a) => ({ ...a, id: newId() }))
  } else if (copy.kind === 'tilemap') {
    copy.layers = cloneMapIds(copy).layers
  } else if (copy.kind === 'map-set') {
    copy.map = cloneMapIds(copy.map)
  }
  return copy
}

function cloneMapIds(map: TilemapAsset): TilemapAsset {
  const ids = new Map<string, string>()
  for (const l of map.layers) {
    ids.set(l.id, newId())
    if (isObjectLayer(l)) for (const o of l.objects) ids.set(o.id, newId())
  }
  return {
    ...map,
    id: newId(),
    layers: map.layers.map((l) => ({
      ...l,
      id: ids.get(l.id) ?? l.id,
      ...(l.parentId ? { parentId: ids.get(l.parentId) ?? l.parentId } : {}),
      ...(l.properties ? { properties: mapPropertyRefs(l.properties, ids, 'object') } : {}),
      ...(isObjectLayer(l)
        ? {
            objects: l.objects.map((o) => ({
              ...o,
              id: ids.get(o.id) ?? o.id,
              properties: Object.fromEntries(
                Object.entries(o.properties).map(([k, v]) => [
                  k,
                  typeof v === 'object' && v.type === 'object'
                    ? { ...v, value: ids.get(String(v.value)) ?? v.value }
                    : v,
                ]),
              ),
            })),
          }
        : {}),
    })) as TilemapAsset['layers'],
  }
}

function remapMapAssets(
  map: TilemapAsset,
  idMap: ReadonlyMap<string, string>,
  names: ReadonlyMap<string, string> = new Map(),
): TilemapAsset {
  const result = remapTilemapTilesetIds(map, (id) => idMap.get(id) ?? id)
  return {
    ...result,
    layers: result.layers.map((l) =>
      !isObjectLayer(l)
        ? {
            ...l,
            ...(l.properties ? { properties: mapPropertyRefs(l.properties, idMap, 'asset') } : {}),
          }
        : {
            ...l,
            ...(l.properties ? { properties: mapPropertyRefs(l.properties, idMap, 'asset') } : {}),
            objects: l.objects.map((o) => ({
              ...o,
              ...(o.art
                ? { art: { ...o.art, assetId: idMap.get(o.art.assetId) ?? o.art.assetId } }
                : {}),
              ...(o.setId ? { setId: idMap.get(o.setId) ?? o.setId } : {}),
              properties: Object.fromEntries(
                Object.entries(o.properties).map(([k, v]) => [
                  k,
                  typeof v === 'object' && v.type === 'asset'
                    ? { ...v, value: idMap.get(String(v.value)) ?? v.value }
                    : o.role === 'door' &&
                        (k === 'destino' || k === 'destination') &&
                        typeof v === 'string'
                      ? (names.get(v) ?? idMap.get(v) ?? v)
                      : v,
                ]),
              ),
            })),
          },
    ),
  }
}

export interface ImportPlan {
  /** O desenho como veio e o que vai ao disco (id novo, nome único, peças religadas). */
  pairs: Array<{ source: PintaAsset; restored: PintaAsset }>
  /** id de origem → id novo. */
  idMap: Map<string, string>
  skipped: number
  error: string | null
}

/**
 * Planeja `eligible` (tilesets PRIMEIRO, já filtrado de mapas sem peças) contra os nomes
 * `taken`. Um mapa cujas peças vieram junto mas não entraram no plano é pulado (ficaria órfão).
 * A peça de camada que não veio segue apontando para o id de antes.
 */
export function planImport(
  eligible: readonly PintaAsset[],
  incomingTilesetIds: ReadonlySet<string>,
  taken: Set<string>,
): ImportPlan {
  const idMap = new Map<string, string>()
  const names = new Map<string, string>()
  const prepared: PintaAsset[] = []
  const preparedTilesetIds = new Set<string>()
  let skipped = 0
  let error: string | null = null
  for (const asset of eligible) {
    if (
      asset.kind === 'tilemap' &&
      incomingTilesetIds.has(asset.tilesetId) &&
      !preparedTilesetIds.has(asset.tilesetId)
    ) {
      skipped += 1
      error ??= COPY.gallery.restoreMissingTileset
      continue
    }
    const name = uniqueName(asset.name, taken)
    if (!name) {
      skipped += 1
      error ??= COPY.newAsset.nameTaken
      continue
    }
    const clone = cloneWithNewIds(asset, name)
    idMap.set(asset.id, clone.id)
    if (asset.kind === 'tilemap') names.set(asset.name, clone.name)
    if (isTilesetKind(asset)) preparedTilesetIds.add(asset.id)
    prepared.push(clone)
    taken.add(name)
  }
  const pairs = prepared.map((source) => ({
    source,
    restored:
      source.kind === 'tilemap'
        ? remapMapAssets(source, idMap, names)
        : source.kind === 'map-set'
          ? { ...source, map: remapMapAssets(source.map, idMap, names) }
          : isTilesetKind(source) && source.tileProperties
            ? {
                ...source,
                tileProperties: Object.fromEntries(
                  Object.entries(source.tileProperties).map(([tile, properties]) => [
                    tile,
                    mapPropertyRefs(properties, idMap, 'asset'),
                  ]),
                ),
              }
            : source,
  }))
  return { pairs, idMap, skipped, error }
}

function mapPropertyRefs(
  properties: Record<string, TilemapObjectPropertyValue>,
  ids: ReadonlyMap<string, string>,
  type: 'object' | 'asset',
): Record<string, TilemapObjectPropertyValue> {
  return Object.fromEntries(
    Object.entries(properties).map(([k, v]) => [
      k,
      typeof v === 'object' && v.type === type
        ? { ...v, value: ids.get(String(v.value)) ?? v.value }
        : v,
    ]),
  )
}
