/**
 * Os NÍVEIS do editor de mapa: "Começar", "Criar mais" e "Avançado".
 *
 * O nível escolhe quais ferramentas e quais painéis aparecem. Três regras:
 * 1. Perfil novo abre em "Começar"; a escolha fica guardada por perfil neste aparelho.
 * 2. O nível nunca MOSTRA o que a aula escondeu (`allowTools`): os dois filtros se somam.
 * 3. O que o mapa JÁ usa aparece sempre, em qualquer nível: nada do que a criança fez some.
 */
import {
  type AnyTilesetAsset,
  isGroupLayer,
  isObjectLayer,
  isTileLayer,
  type TilemapAsset,
} from '../../../core/project'
import { isToolAllowed } from '../../../core/toolCuration'
import { cellFlags } from '../../../tiles/cell'

export type MapLevel = 'start' | 'create' | 'advanced'
export const MAP_LEVELS: readonly MapLevel[] = ['start', 'create', 'advanced']
export const DEFAULT_MAP_LEVEL: MapLevel = 'start'

const START_TOOLS = [
  'pencil',
  'eraser',
  'fill',
  'select',
  'pan',
  'object-select',
  'object-point',
  'object-rect',
  'snapObjects',
] as const
const CREATE_TOOLS = [
  ...START_TOOLS,
  'line',
  'rect',
  'picker',
  'object-ellipse',
  'object-polygon',
  'object-polyline',
  'object-scatter',
  'autoExpand',
  'showCollision',
] as const

/** A ferramenta (ou o botão de ligar e desligar da caixa) aparece neste nível? */
export function isToolInLevel(level: MapLevel, id: string): boolean {
  if (level === 'advanced') return true
  return (level === 'start' ? START_TOOLS : CREATE_TOOLS).some((tool) => tool === id)
}

/** Nível E curadoria da aula: a ferramenta só vale quando os dois deixam. */
export function isMapToolAvailable(
  level: MapLevel,
  allowTools: readonly string[] | undefined,
  id: string,
): boolean {
  return isToolInLevel(level, id) && isToolAllowed(allowTools, id)
}

/** O que aparece nos painéis ao lado do mapa. */
export interface MapFeatures {
  /** Virar e girar a peça. */
  transform: boolean
  terrain: boolean
  scatter: boolean
  /** Animação e propriedades da peça. */
  animation: boolean
  minimap: boolean
  /** Desenhos da biblioteca como objetos. */
  library: boolean
  /** Guardar, pôr e soltar conjuntos. */
  sets: boolean
  /** Copiar, colar e organizar objetos. */
  objectArrange: boolean
  /** Tipo, forma, giro e propriedades do objeto. */
  objectDetails: boolean
  /** Cadeado, subir e descer, e as peças de cada camada. */
  layerOrder: boolean
  /** Marcar uma camada de peças como barreira. */
  layerCollision: boolean
  /** Transparência, grupos, deslocamento e propriedades da camada. */
  layerAdvanced: boolean
  playtest: boolean
}

const FEATURE_LEVEL: Record<keyof MapFeatures, MapLevel> = {
  playtest: 'start',
  transform: 'create',
  terrain: 'start',
  scatter: 'create',
  minimap: 'create',
  library: 'start',
  objectArrange: 'create',
  objectDetails: 'create',
  layerOrder: 'create',
  animation: 'create',
  sets: 'create',
  layerCollision: 'create',
  layerAdvanced: 'advanced',
}

/** O que o mapa (e as peças dele) já usa: isso aparece em qualquer nível. */
export function mapFeaturesInUse(
  map: TilemapAsset,
  tilesets: readonly AnyTilesetAsset[],
): Partial<Record<keyof MapFeatures, true>> {
  const used: Partial<Record<keyof MapFeatures, true>> = {}
  for (const ts of tilesets) {
    if (ts.terrains?.length) used.terrain = true
    if (
      (ts.animations && Object.keys(ts.animations).length) ||
      (ts.tileProperties && Object.keys(ts.tileProperties).length)
    )
      used.animation = true
  }
  for (const layer of map.layers) {
    if (layer.locked) used.layerOrder = true
    if (
      isGroupLayer(layer) ||
      layer.parentId ||
      layer.opacity !== undefined ||
      layer.offsetX ||
      layer.offsetY ||
      layer.parallaxX !== undefined ||
      layer.parallaxY !== undefined ||
      (layer.properties && Object.keys(layer.properties).length)
    )
      used.layerAdvanced = true
    if (isTileLayer(layer)) {
      if (layer.collision) used.layerCollision = true
      if (layer.tilesetId && layer.tilesetId !== map.tilesetId) used.layerOrder = true
      if (!used.transform && layer.cells.some((cell) => cell >= 0 && cellFlags(cell) !== 0))
        used.transform = true
    }
    if (isObjectLayer(layer))
      for (const object of layer.objects) {
        if (object.art) used.library = true
        if (object.setId) used.sets = true
        if (
          object.type ||
          object.collision ||
          object.rotation ||
          object.shape === 'ellipse' ||
          object.shape === 'polygon' ||
          object.shape === 'polyline' ||
          Object.keys(object.properties).length
        )
          used.objectDetails = true
      }
  }
  return used
}

const RANK: Record<MapLevel, number> = { start: 0, create: 1, advanced: 2 }

/** Os painéis do nível, mais tudo o que o mapa já usa. */
export function mapFeaturesFor(
  level: MapLevel,
  inUse: Partial<Record<keyof MapFeatures, true>> = {},
): MapFeatures {
  const out = {} as MapFeatures
  for (const key of Object.keys(FEATURE_LEVEL) as Array<keyof MapFeatures>)
    out[key] = RANK[level] >= RANK[FEATURE_LEVEL[key]] || inUse[key] === true
  return out
}

export const ALL_MAP_FEATURES: MapFeatures = mapFeaturesFor('advanced')

// ---- A escolha guardada por perfil ------------------------------------------

const STORAGE_KEY = 'pinta:map-level'
interface LevelStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
function defaultStorage(): LevelStorage | null {
  try {
    return (globalThis as { localStorage?: LevelStorage }).localStorage ?? null
  } catch {
    return null
  }
}
const keyFor = (namespace: string): string =>
  namespace.trim() ? `${STORAGE_KEY}:${encodeURIComponent(namespace.trim())}` : STORAGE_KEY

export function isMapLevel(value: unknown): value is MapLevel {
  return value === 'start' || value === 'create' || value === 'advanced'
}

/** O nível guardado deste perfil; sem nada guardado (ou sem acesso), "Começar". */
export function readMapLevel(
  namespace: string,
  storage: LevelStorage | null = defaultStorage(),
): MapLevel {
  try {
    const value = storage?.getItem(keyFor(namespace))
    return isMapLevel(value) ? value : DEFAULT_MAP_LEVEL
  } catch {
    return DEFAULT_MAP_LEVEL
  }
}

export function writeMapLevel(
  namespace: string,
  level: MapLevel,
  storage: LevelStorage | null = defaultStorage(),
): void {
  try {
    storage?.setItem(keyFor(namespace), level)
  } catch {
    // Sem espaço ou sem permissão: o nível vale só enquanto a tela estiver aberta.
  }
}
