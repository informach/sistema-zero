import {
  PINTA_REGION_CELL_COUNT,
  PINTA_REGION_CHUNK_BYTES,
  PINTA_REGION_LIMITS,
  parsePintaRegionBounds,
  sha256Hex,
} from '@sistemazero/core/creations'
import {
  type PintaRegionScene,
  type PintaRegionSceneWire,
  readPintaRegionScene,
} from '@sistemazero/core/studio/pinta-region-scene'
import {
  type PintaScene,
  type PintaSceneLayer,
  type PintaSceneObject,
  PintaSceneSchema,
  PintaSceneSpriteSchema,
} from '@sistemazero/core/studio/pinta-scene'
import { Gunzip, Unzlib } from 'fflate'
import { pintaValuesEqual } from '../../core/assetEquality'
import { JsonByteSizeCache } from '../../core/jsonBytes'
import { PINTA_LIMITS, PINTA_MAP_FORMAT_LIMITS, TILE_SIZES } from '../../core/projectConfig'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, cellTile, makeCell } from '../../tiles/cell'
import { TiledImportError } from './errors'
import {
  atlasCapacity,
  readAtlasSnapshot,
  readEmptyTerrainTiles,
  type TiledAtlasSnapshot,
} from './metadata'
import { readRegionalTiledGrid } from './regionGrid'

export { TiledImportError }

const refuse = (message: string): never => {
  throw new TiledImportError(message)
}

/** Limites de LEITURA do formato do mapa, conferidos antes de montar a cena. */
const LIMITS = {
  cols: PINTA_MAP_FORMAT_LIMITS.maxCols,
  rows: PINTA_MAP_FORMAT_LIMITS.maxRows,
  layers: PINTA_MAP_FORMAT_LIMITS.maxLayers,
  tiles: PINTA_MAP_FORMAT_LIMITS.maxTiles,
  cells: PINTA_MAP_FORMAT_LIMITS.maxCells,
  groupDepth: PINTA_MAP_FORMAT_LIMITS.maxGroupDepth,
  layerProperties: PINTA_MAP_FORMAT_LIMITS.maxLayerProperties,
  layerOffset: PINTA_MAP_FORMAT_LIMITS.maxLayerOffset,
  objectCoord: PINTA_MAP_FORMAT_LIMITS.maxObjectCoord,
  objects: PINTA_LIMITS.maxTilemapObjects,
  objectProperties: PINTA_LIMITS.maxObjectProperties,
  propertyKey: PINTA_LIMITS.maxObjectPropertyKeyChars,
  propertyText: PINTA_LIMITS.maxObjectPropertyStringChars,
  name: PINTA_LIMITS.maxObjectNameChars,
  /** Tetos da cena (`PintaSceneSchema`), repetidos aqui para a mensagem sair em português. */
  tilesets: 32,
  art: 128,
  terrains: 16,
  terrainColors: 15,
  frames: 64,
  minFrameMs: 16,
  maxFrameMs: 60000,
  points: 256,
  parallax: 16,
  /** Bytes de uma camada em base64, antes de descompactar. */
  encodedLayer: 16 * 1024 * 1024,
} as const
const REGION_PIXEL_LIMIT = PINTA_REGION_LIMITS.maxCoordinateExclusive * Math.max(...TILE_SIZES)

type RecordValue = Record<string, unknown>
const rec = (v: unknown): RecordValue => {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    return refuse('O arquivo não tem o formato de um mapa do Tiled.')
  return v as RecordValue
}
const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const number = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback
const string = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const GID_MASK = 0x0fffffff
export function gidCell(gid: number, first: number): number {
  return (gid & GID_MASK) === 0
    ? -1
    : makeCell(
        (gid & GID_MASK) - first,
        (gid & 0x80000000 ? CELL_FLIP_H : 0) |
          (gid & 0x40000000 ? CELL_FLIP_V : 0) |
          (gid & 0x20000000 ? CELL_FLIP_D : 0),
      )
}

/**
 * Um objeto de peça do Tiled (âncora embaixo à esquerda, bits de espelho no gid) como objeto do
 * Pinta (canto de cima, giro em volta dele, espelhos dentro da caixa). O bit diagonal troca x
 * por y antes dos espelhos, a mesma regra das células (`cellMatrix`): aqui ele vira um giro de
 * 90° com a caixa deitada, e os espelhos mudam de eixo.
 */
export function tileObjectPlacement(o: {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  gid: number
}): {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  flipX: boolean
  flipY: boolean
} {
  const h = !!(o.gid & 0x80000000),
    v = !!(o.gid & 0x40000000),
    d = !!(o.gid & 0x20000000),
    angle = (o.rotation * Math.PI) / 180
  if (!d)
    return {
      x: o.x + Math.sin(angle) * o.height,
      y: o.y - Math.cos(angle) * o.height,
      width: o.width,
      height: o.height,
      rotation: o.rotation,
      flipX: h,
      flipY: v,
    }
  const turn = (px: number, py: number, a: number) => ({
    x: px * Math.cos(a) - py * Math.sin(a),
    y: px * Math.sin(a) + py * Math.cos(a),
  })
  // O centro da caixa não muda; a caixa deitada (altura × largura) gira 90° em volta dele.
  const centre = turn(o.width / 2, -o.height / 2, angle),
    corner = turn(o.height / 2, o.width / 2, angle + Math.PI / 2),
    rotation = o.rotation + 90
  return {
    x: o.x + centre.x - corner.x,
    y: o.y + centre.y - corner.y,
    width: o.height,
    height: o.width,
    rotation: rotation >= 360 ? rotation - 360 : rotation,
    flipX: v,
    flipY: !h,
  }
}

/** As propriedades do Tiled, cada uma convertida pelo `type` dela (sem `type` é texto). */
function props(v: unknown, where: string, warnings: string[]): RecordValue {
  const out: RecordValue = {}
  for (const p of array(v).map(rec)) {
    const name = string(p.name),
      type = string(p.type, 'string'),
      raw = p.value
    if (type === 'bool') out[name] = raw === true || raw === 'true'
    else if (type === 'int' || type === 'float') {
      const value = typeof raw === 'number' ? raw : Number(raw)
      out[name] = {
        type,
        value: Number.isFinite(value) ? (type === 'int' ? Math.trunc(value) : value) : 0,
      }
    } else if (type === 'color') {
      const value = String(raw ?? '')
      // O Tiled grava #AARRGGBB; o Pinta guarda #RRGGBBAA.
      out[name] = {
        type: 'color',
        value:
          value.length === 9
            ? `#${value.slice(3)}${value.slice(1, 3).toLowerCase() === 'ff' ? '' : value.slice(1, 3)}`
            : value,
      }
    } else if (type === 'object') out[name] = { type: 'object', value: String(raw ?? '') }
    else if (type === 'file') out[name] = { type: 'asset', value: String(raw ?? '') }
    else if (type === 'string') out[name] = raw == null ? '' : String(raw)
    else
      warnings.push(
        `A propriedade ${name} de ${where} é de um tipo próprio do Tiled (${type}) e não foi trazida.`,
      )
  }
  return out
}
const PROPERTY_KEY = /^[A-Za-z][A-Za-z0-9_-]*$/
/** Só as propriedades do usuário (sem `pinta:*`), dentro dos limites do documento. */
function plain(p: RecordValue, where: string, warnings: string[], max: number): RecordValue {
  const out: RecordValue = {}
  let extra = 0
  for (const [key, raw] of Object.entries(p)) {
    if (key.startsWith('pinta:')) continue
    if (!PROPERTY_KEY.test(key) || key.length > LIMITS.propertyKey) {
      warnings.push(
        `A propriedade ${key} de ${where} não foi trazida: o nome precisa começar com letra, ter só letras sem acento, números, - ou _ e até ${LIMITS.propertyKey} sinais.`,
      )
      continue
    }
    if (Object.keys(out).length >= max) {
      extra++
      continue
    }
    let value = raw
    const typed = value && typeof value === 'object' ? (value as RecordValue) : null
    if (typeof value === 'string' && value.length > LIMITS.propertyText) {
      value = value.slice(0, LIMITS.propertyText)
      warnings.push(
        `O texto da propriedade ${key} de ${where} foi cortado em ${LIMITS.propertyText} sinais.`,
      )
    } else if (
      typed &&
      (typed.type === 'color'
        ? !/^#[\da-f]{6}([\da-f]{2})?$/i.test(String(typed.value))
        : typeof typed.value === 'string' &&
          (typed.value.length < 1 || typed.value.length > LIMITS.propertyText))
    ) {
      warnings.push(`A propriedade ${key} de ${where} estava vazia ou inválida e não foi trazida.`)
      continue
    }
    out[key] = value
  }
  if (extra)
    warnings.push(
      `${where} tinha mais de ${max} propriedades; as ${extra} últimas não foram trazidas.`,
    )
  return out
}
function json(value: unknown): unknown {
  try {
    return JSON.parse(string(value))
  } catch {
    return undefined
  }
}
/** Descompacta até `size` bytes. Um fluxo maior que isso é recusado, não cortado. */
function inflate(raw: Uint8Array, compression: string, size: number): Uint8Array {
  const out = new Uint8Array(size)
  let at = 0
  const stream = compression === 'zlib' ? new Unzlib() : new Gunzip()
  stream.ondata = (chunk) => {
    if (at + chunk.length > size) refuse('O tamanho da camada não corresponde ao mapa.')
    out.set(chunk, at)
    at += chunk.length
  }
  try {
    stream.push(raw, true)
  } catch (e) {
    if (e instanceof TiledImportError) throw e
    refuse('Uma camada compactada do mapa está corrompida.')
  }
  if (at !== size) refuse('O tamanho da camada não corresponde ao mapa.')
  return out
}
function data(layer: RecordValue, count: number): number[] {
  let values: number[]
  if (Array.isArray(layer.data)) {
    if (layer.data.length !== count) return refuse('O tamanho da camada não corresponde ao mapa.')
    values = layer.data.map((n) => number(n, Number.NaN))
  } else if (typeof layer.data !== 'string') return refuse('Uma camada de peças veio sem dados.')
  else if (layer.encoding === 'csv')
    values = layer.data
      .trim()
      .split(/[\s,]+/)
      .map(Number)
  else if (layer.encoding !== 'base64')
    return refuse('Uma camada usa uma codificação que o Pinta não lê. Use CSV ou base64.')
  else {
    const text = layer.data.replace(/\s/g, '')
    if (text.length > (LIMITS.encodedLayer * 4) / 3 + 4)
      return refuse('Uma camada compactada do mapa é grande demais.')
    let bytes: Uint8Array
    try {
      bytes = Uint8Array.from(atob(text), (c) => c.charCodeAt(0))
    } catch {
      return refuse('Uma camada do mapa não está em base64 válido.')
    }
    const compression = string(layer.compression)
    if (compression === 'zlib' || compression === 'gzip')
      bytes = inflate(bytes, compression, count * 4)
    else if (compression)
      return refuse(
        `O Pinta não lê camadas compactadas com ${compression}. No Tiled, escolha CSV, base64 sem compactar, zlib ou gzip nas propriedades do mapa.`,
      )
    if (bytes.length !== count * 4) return refuse('O tamanho da camada não corresponde ao mapa.')
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    values = Array.from({ length: count }, (_, i) => view.getUint32(i * 4, true))
  }
  if (values.length !== count) return refuse('O tamanho da camada não corresponde ao mapa.')
  if (values.some((n) => !Number.isInteger(n) || n < 0 || n > 0xffffffff))
    return refuse('Uma camada do mapa tem um número de peça inválido.')
  return values
}
export interface TiledResolver {
  text: (path: string) => Promise<string>
  image: (path: string) => Promise<string>
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** A frase da criança para um problema que o esquema da cena ainda encontrou. */
function explain(scene: RecordValue, path: PropertyKey[], message: string): string {
  const layers = array(scene.layers) as RecordValue[],
    tilesets = array(scene.tilesets) as RecordValue[]
  const layer = path[0] === 'layers' ? layers[Number(path[1])] : undefined,
    tileset = path[0] === 'tilesets' ? tilesets[Number(path[1])] : undefined
  if (layer && path[2] === 'objects') {
    const o = (array(layer.objects) as RecordValue[])[Number(path[3])]
    return `O objeto ${string(o?.name) || Number(path[3]) + 1} da camada ${string(layer.name)} tem um dado que o Pinta não consegue ler (${String(path[4] ?? 'objeto')}).`
  }
  if (layer)
    return `A camada ${string(layer.name)} tem um dado que o Pinta não consegue ler (${String(path[2] ?? 'camada')}).`
  if (tileset)
    return `A folha de peças ${string(tileset.name)} tem um dado que o Pinta não consegue ler (${String(path[2] ?? 'folha')}).`
  if (/peças ou cores inexistentes/.test(message))
    return 'Uma animação, um terreno ou uma propriedade aponta para uma peça que não existe na folha.'
  if (/Árvore de camadas/.test(message))
    return 'Duas camadas do mapa ficaram com a mesma identificação. Renomeie no Tiled e tente de novo.'
  if (/Objetos duplicados/.test(message))
    return 'Dois objetos do mapa ficaram com a mesma identificação.'
  if (/Desenho do objeto|Peça do objeto/.test(message))
    return 'Um objeto usa um desenho ou uma peça que não veio no mapa.'
  if (/duplicadas/.test(message)) return 'Duas folhas de peças do mapa têm a mesma identificação.'
  if (/dimensões da camada/.test(message))
    return 'Uma camada tem peças que não existem na folha dela.'
  return 'O mapa tem um dado que o Pinta não consegue ler.'
}

/** Restaura só o preenchimento comprovadamente intacto e sem referências novas. */
async function restoreAtlasCounts(
  scene: PintaScene | PintaRegionScene,
  snapshots: ReadonlyMap<string, TiledAtlasSnapshot>,
): Promise<void> {
  const eligible = new Map<string, TiledAtlasSnapshot>()
  for (const tileset of scene.tilesets) {
    const snapshot = snapshots.get(tileset.id)
    if (
      snapshot &&
      snapshot.count < tileset.count &&
      snapshot.columns === tileset.columns &&
      snapshot.tileSize === scene.tileSize &&
      atlasCapacity(snapshot.count, snapshot.columns) === tileset.count &&
      (await sha256Hex(tileset.image)) === snapshot.imageDataUrlSha256
    )
      eligible.set(tileset.id, snapshot)
  }
  if (!eligible.size) return

  const highest = new Map<string, number>()
  const mark = (id: string, tile: number): void => {
    if (eligible.has(id)) highest.set(id, Math.max(highest.get(id) ?? -1, tile))
  }
  for (const owner of [scene, ...(scene.sets ?? [])])
    for (const layer of owner.layers) {
      if (layer.kind === 'tiles' && eligible.has(layer.tilesetId)) {
        let maximum = -1
        const parts = Array.isArray(layer.cells)
          ? [layer.cells]
          : layer.cells.chunks.map((chunk) => chunk.cells)
        for (const part of parts)
          for (const cell of part) if (cell >= 0) maximum = Math.max(maximum, cellTile(cell))
        mark(layer.tilesetId, maximum)
      } else if (layer.kind === 'objects')
        for (const object of layer.objects)
          if (object.art) mark(object.art.assetId, object.art.tile ?? 0)
    }
  for (const tileset of scene.tilesets) {
    if (!eligible.has(tileset.id)) continue
    for (const indices of [tileset.solid, tileset.platform])
      for (const tile of indices) mark(tileset.id, tile)
    for (const [tile, frames] of Object.entries(tileset.animations ?? {})) {
      mark(tileset.id, Number(tile))
      for (const frame of frames) mark(tileset.id, frame.tile)
    }
    for (const tile of Object.keys(tileset.tileProperties ?? {})) mark(tileset.id, Number(tile))
    for (const terrain of tileset.terrains ?? [])
      for (const tile of Object.keys(terrain.tiles)) mark(tileset.id, Number(tile))
  }
  for (const tileset of scene.tilesets) {
    const snapshot = eligible.get(tileset.id)
    if (snapshot && (highest.get(tileset.id) ?? -1) < snapshot.count) tileset.count = snapshot.count
  }
}

export function importTiledScene(
  input: unknown,
  resolver: TiledResolver,
  name = 'mapa-importado',
): Promise<{ scene: PintaScene; warnings: string[] }> {
  return importScene(input, resolver, name, undefined)
}

/** Private Scene4 return. The public fixed-map importer keeps its original contract. */
interface RegionalTiledImport {
  scene: PintaRegionScene
  wire: PintaRegionSceneWire
  indexBytes: number
  metadataBytes: number
  warnings: string[]
}

export function importRegionalTiledScene(
  input: unknown,
  resolver: TiledResolver,
  name = 'mapa-importado',
  maxIndexBytes = PINTA_REGION_LIMITS.maxChunks * PINTA_REGION_CHUNK_BYTES,
): Promise<RegionalTiledImport> {
  return importScene(input, resolver, name, { maxIndexBytes })
}

function importScene(
  input: unknown,
  resolver: TiledResolver,
  name: string,
  region: undefined,
): Promise<{ scene: PintaScene; warnings: string[] }>
function importScene(
  input: unknown,
  resolver: TiledResolver,
  name: string,
  region: { maxIndexBytes: number },
): Promise<RegionalTiledImport>
async function importScene(
  input: unknown,
  resolver: TiledResolver,
  name: string,
  region: { maxIndexBytes: number } | undefined,
): Promise<{ scene: PintaScene; warnings: string[] } | RegionalTiledImport> {
  const map = rec(input),
    warnings: string[] = []
  const cut = (text: string, what: string): string => {
    if (text.length <= LIMITS.name) return text
    const short = text.slice(0, LIMITS.name)
    warnings.push(`O nome de ${what} foi encurtado para ${LIMITS.name} sinais: ${short}`)
    return short
  }
  const infinite = map.infinite === true || map.infinite === 1
  const regionalProps = region && props(map.properties, 'o mapa', warnings)
  const bounds = regionalProps ? parsePintaRegionBounds(json(regionalProps['pinta:bounds'])) : null
  if (region) {
    const version = regionalProps?.['pinta:sceneVersion']
    if (!infinite || !bounds || !version || typeof version !== 'object' || rec(version).value !== 4)
      refuse('Traga o mapa regional do Pinta com as propriedades de origem preservadas no Tiled.')
    if (
      !Number.isSafeInteger(region.maxIndexBytes) ||
      region.maxIndexBytes < 0 ||
      region.maxIndexBytes > PINTA_REGION_LIMITS.maxChunks * PINTA_REGION_CHUNK_BYTES
    )
      refuse('O limite de regiões informado não é válido.')
  }
  if (map.orientation !== 'orthogonal' || (infinite && !region))
    refuse(
      'Traga um mapa ortogonal de tamanho fixo. Mapas infinitos, isométricos e hexagonais ainda não entram no Pinta.',
    )
  const cols = bounds?.cols ?? number(map.width),
    rows = bounds?.rows ?? number(map.height),
    size = number(map.tilewidth)
  if (
    !Number.isInteger(cols) ||
    !Number.isInteger(rows) ||
    cols < 1 ||
    rows < 1 ||
    (!bounds && (cols > LIMITS.cols || rows > LIMITS.rows)) ||
    !Number.isInteger(size) ||
    size < 1 ||
    number(map.tileheight) !== size
  )
    refuse(`O mapa precisa de peças quadradas e de até ${LIMITS.cols} × ${LIMITS.rows} casas.`)
  if (map.backgroundcolor)
    warnings.push(
      `A cor de fundo do mapa (${String(map.backgroundcolor)}) não foi trazida: o Pinta não guarda cor de fundo no mapa.`,
    )
  if (map.class) warnings.push(`A classe do mapa (${String(map.class)}) não foi trazida.`)
  if (number(map.parallaxoriginx) || number(map.parallaxoriginy))
    warnings.push('A origem do parallax do mapa não foi trazida.')
  if (array(map.tilesets).length > LIMITS.tilesets + LIMITS.art)
    refuse(`O mapa usa folhas de peças demais. O Pinta aceita até ${LIMITS.tilesets}.`)
  const atlasSnapshots = new Map<string, TiledAtlasSnapshot>()
  const art: NonNullable<PintaScene['art']> = [],
    tilesets: RecordValue[] = [],
    gids: {
      first: number
      id: string
      count: number
      art?: string
      animationId?: string
    }[] = []
  for (const [i, raw] of array(map.tilesets).entries()) {
    let ts = rec(raw)
    const first = number(ts.firstgid)
    if (ts.source) {
      const path = string(ts.source),
        text = await resolver.text(path)
      let external: unknown
      try {
        external = /\.(tsx|xml)$/i.test(path) ? tiledXmlToJson(text) : JSON.parse(text)
      } catch (e) {
        if (e instanceof TiledImportError) throw e
        external = refuse(
          `A folha de peças ${path} não é um arquivo do Tiled que o Pinta consiga ler.`,
        )
      }
      ts = { ...rec(external), firstgid: first }
      // Endereço ou caminho absoluto fica como veio, para o leitor do pacote recusar pelo motivo certo.
      if (ts.image && path.includes('/') && !/^[a-z][a-z0-9+.-]*:|^[/\\]/i.test(string(ts.image)))
        ts.image = path.slice(0, path.lastIndexOf('/') + 1) + string(ts.image)
    }
    const label = string(ts.name, `Peças ${i + 1}`),
      properties = props(ts.properties, `a folha ${label}`, warnings),
      id = string(properties['pinta:id'], `tiles-${i}`),
      count = number(ts.tilecount),
      columns = number(ts.columns)
    if (properties['pinta:art']) {
      const artId = string(properties['pinta:art'])
      const previous = art.find((a) => a.id === artId)
      if (!previous && art.length >= LIMITS.art)
        refuse(`O mapa usa desenhos de objeto demais. O Pinta aceita até ${LIMITS.art}.`)
      const rawSprite = json(properties['pinta:sprite'])
      const sprite = rawSprite == null ? undefined : PintaSceneSpriteSchema.safeParse(rawSprite)
      if (sprite && !sprite.success) refuse(`A animação de ${label} tem metadados inválidos.`)
      const validSprite = sprite?.success ? sprite.data : undefined
      const candidate = {
        id: artId,
        image: await resolver.image(string(ts.image)),
        width: validSprite ? number(ts.imagewidth) : number(ts.tilewidth),
        height: validSprite ? number(ts.imageheight) : number(ts.tileheight),
        ...(validSprite ? { sprite: validSprite } : {}),
      }
      if (previous && !pintaValuesEqual(previous, candidate))
        refuse(`Duas versões diferentes do desenho ${label} usam a mesma referência.`)
      if (!previous) art.push(candidate)
      const animationId = string(properties['pinta:animation']) || undefined
      if (animationId && !validSprite?.animations.some((v) => v.id === animationId))
        refuse(`A folha ${label} aponta para uma animação inexistente.`)
      gids.push({
        first,
        id: artId,
        count: validSprite ? count : 1,
        art: artId,
        ...(animationId ? { animationId } : {}),
      })
      continue
    }
    if (
      !ts.image ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > LIMITS.tiles ||
      !Number.isInteger(columns) ||
      columns < 1 ||
      number(ts.tilewidth) !== size ||
      number(ts.tileheight) !== size ||
      number(ts.margin) !== 0 ||
      number(ts.spacing) !== 0
    )
      refuse(
        `As peças de ${label} precisam estar numa folha só, sem margem nem espaçamento, com o mesmo tamanho das casas do mapa e até ${LIMITS.tiles} peças.`,
      )
    if (tilesets.length >= LIMITS.tilesets)
      refuse(`O mapa usa folhas de peças demais. O Pinta aceita até ${LIMITS.tilesets}.`)
    const atlas = readAtlasSnapshot(properties['pinta:atlas'])
    if (atlas) atlasSnapshots.set(id, atlas)
    const alignment = string(ts.objectalignment, 'unspecified')
    if (alignment !== 'unspecified' && alignment !== 'bottomleft')
      warnings.push(
        `A folha ${label} alinha os objetos de outro jeito (${alignment}); os objetos de peça entraram com o canto de baixo à esquerda e podem ter saído do lugar.`,
      )
    const offset = ts.tileoffset ? rec(ts.tileoffset) : {}
    if (number(offset.x) || number(offset.y))
      warnings.push(`O deslocamento de desenho das peças de ${label} não foi trazido.`)
    if (ts.transparentcolor || ts.trans)
      warnings.push(`A cor transparente da folha ${label} não foi aplicada.`)
    const solid: number[] = [],
      platform: number[] = [],
      animations: Record<string, { tile: number; duration: number }[]> = {},
      tileProperties: RecordValue = {}
    let chance = false,
      shapes = false,
      kinds = false
    for (const rawTile of array(ts.tiles)) {
      const t = rec(rawTile),
        tile = number(t.id, -1),
        p = props(t.properties, `a peça ${tile} de ${label}`, warnings)
      if (!Number.isInteger(tile) || tile < 0 || tile >= count)
        refuse(`A folha ${label} descreve a peça ${tile}, que não existe nela.`)
      if (t.probability !== undefined && number(t.probability, 1) !== 1) chance = true
      if (t.objectgroup || array(t.layers).length) shapes = true
      if (t.type || t.class) kinds = true
      if (p.solid === true) solid.push(tile)
      if (p.platform === true) platform.push(tile)
      const { solid: _solid, platform: _platform, ...rest } = p
      const entries = plain(rest, `a peça ${tile} de ${label}`, warnings, LIMITS.objectProperties)
      if (Object.keys(entries).length) tileProperties[String(tile)] = entries
      if (Array.isArray(t.animation) && t.animation.length) {
        let frames = t.animation.map(rec).map((f) => ({
          tile: number(f.tileid, -1),
          duration: Math.round(number(f.duration, 100)),
        }))
        if (frames.some((f) => !Number.isInteger(f.tile) || f.tile < 0 || f.tile >= count))
          refuse(`A animação da peça ${tile} de ${label} usa uma peça que não existe na folha.`)
        if (frames.length > LIMITS.frames) {
          warnings.push(
            `A animação da peça ${tile} de ${label} tinha ${frames.length} quadros; ficaram os ${LIMITS.frames} primeiros.`,
          )
          frames = frames.slice(0, LIMITS.frames)
        }
        if (frames.some((f) => f.duration < LIMITS.minFrameMs || f.duration > LIMITS.maxFrameMs)) {
          warnings.push(
            `A animação da peça ${tile} de ${label} tinha quadros rápidos ou lentos demais; cada quadro ficou entre ${LIMITS.minFrameMs} e ${LIMITS.maxFrameMs} milissegundos.`,
          )
          frames = frames.map((f) => ({
            ...f,
            duration: clamp(f.duration, LIMITS.minFrameMs, LIMITS.maxFrameMs),
          }))
        }
        animations[String(tile)] = frames
      }
    }
    if (chance) warnings.push(`A chance de sorteio das peças de ${label} não foi trazida.`)
    if (shapes)
      warnings.push(
        `As formas de colisão desenhadas dentro das peças de ${label} não foram trazidas. Marque as peças como sólidas no Pinta.`,
      )
    if (kinds) warnings.push(`A classe das peças de ${label} não foi trazida.`)
    let wang = array(ts.wangsets).map(rec)
    if (wang.length > LIMITS.terrains) {
      warnings.push(
        `A folha ${label} tinha ${wang.length} terrenos; ficaram os ${LIMITS.terrains} primeiros.`,
      )
      wang = wang.slice(0, LIMITS.terrains)
    }
    if (
      wang.some((t) =>
        array(t.colors).some((c) => {
          const called = string(rec(c).name)
          return called !== '' && !/^Terreno \d+$/.test(called)
        }),
      )
    )
      warnings.push(`Os nomes das cores dos terrenos de ${label} não foram trazidos.`)
    const terrains = wang.map((t, n) => {
      const terrain = string(t.name, `Terreno ${n + 1}`)
      const terrainProperties = props(t.properties, `o terreno ${terrain}`, warnings)
      if (array(t.colors).length > LIMITS.terrainColors)
        refuse(
          `O terreno ${terrain} de ${label} tem cores demais. O Pinta aceita até ${LIMITS.terrainColors}.`,
        )
      const result = {
        id: string(terrainProperties['pinta:id'], `${id}-terrain-${n}`),
        name: cut(terrain, `um terreno de ${label}`),
        mode:
          t.type === 'edge'
            ? ('edge' as const)
            : t.type === 'mixed'
              ? ('mixed' as const)
              : ('corner' as const),
        colors: array(t.colors)
          .map(rec)
          .map((c) => {
            const color = string(c.color, '#808080')
            return /^#[\da-f]{8}$/i.test(color)
              ? `#${color.slice(3)}`
              : /^#[\da-f]{6}$/i.test(color)
                ? color
                : '#808080'
          }),
        tiles: Object.fromEntries(
          array(t.wangtiles)
            .map(rec)
            .map((w) => {
              const wangid = array(w.wangid).map((n) => number(n, -1))
              if (
                !Number.isInteger(number(w.tileid, -1)) ||
                number(w.tileid, -1) < 0 ||
                number(w.tileid, -1) >= count ||
                wangid.length !== 8 ||
                wangid.some((c) => !Number.isInteger(c) || c < 0 || c > array(t.colors).length)
              )
                refuse(
                  `O terreno ${terrain} de ${label} aponta para peças ou cores que não existem.`,
                )
              return [String(w.tileid), wangid]
            }),
        ),
      }
      for (const tile of readEmptyTerrainTiles(terrainProperties['pinta:emptyTiles'], count))
        if (!Object.hasOwn(result.tiles, String(tile))) result.tiles[tile] = Array(8).fill(0)
      return result
    })
    tilesets.push({
      id,
      name: cut(label, 'uma folha de peças'),
      image: await resolver.image(string(ts.image)),
      columns,
      count,
      solid,
      platform,
      ...(Object.keys(animations).length ? { animations } : {}),
      ...(Object.keys(tileProperties).length ? { tileProperties } : {}),
      ...(terrains.length ? { terrains } : {}),
    })
    gids.push({ first, id, count })
  }
  if (!tilesets.length)
    refuse(
      'O mapa precisa de pelo menos uma folha de peças. Inclua a folha (imagem) junto do mapa.',
    )
  gids.sort((a, b) => a.first - b.first)
  const layers: RecordValue[] = [],
    numericObjects = new Map<string, string>()
  let cells = 0
  let regionBytes = 0
  let regionalSourceCells = 0
  /** A folha de um gid; um gid acima da última peça da folha não existe. */
  const resolve = (gid: number) => {
    const n = gid & GID_MASK,
      g = gids.filter((g) => g.first <= n).at(-1)
    return g && n < g.first + g.count ? g : undefined
  }
  const push = (layer: RecordValue): void => {
    if (layers.length >= LIMITS.layers)
      refuse(
        `O mapa tem camadas demais. O Pinta aceita até ${LIMITS.layers}, contando grupos e as camadas que usam mais de uma folha.`,
      )
    layers.push(layer)
  }
  const convert = (raw: unknown, parentId: string | undefined, depth: number): void => {
    const l = rec(raw),
      label = string(l.name, 'Camada'),
      where = `a camada ${label}`,
      p = props(l.properties, where, warnings)
    if (p['pinta:expanded'] === true) {
      // Expanded children are not authored layers, but other containers can refer
      // to their numeric Tiled IDs. Keep the reverse identity before skipping them.
      for (const raw of array(l.objects)) {
        const object = rec(raw),
          metadata = json(props(object.properties, where, warnings)['pinta:object'])
        if (metadata && typeof metadata === 'object' && !Array.isArray(metadata))
          numericObjects.set(String(object.id), string(rec(metadata).id, `object-${object.id}`))
      }
      return
    }
    if (p['pinta:wrapper'] === true) {
      for (const child of array(l.layers)) convert(child, parentId, depth)
      return
    }
    const id = string(p['pinta:id'], `layer-${l.id ?? layers.length}`)
    const kind = string(l.class)
    if (kind) {
      if (p.class === undefined) {
        p.class = kind
        warnings.push(`A classe ${kind} de ${where} foi guardada como a propriedade class.`)
      } else warnings.push(`A classe ${kind} de ${where} não foi trazida.`)
    }
    const userProperties = plain(p, where, warnings, LIMITS.layerProperties)
    const limited = (value: unknown, min: number, max: number, what: string): number => {
      const n = number(value, 1)
      if (n >= min && n <= max) return n
      warnings.push(`${what} de ${where} foi ajustado para caber entre ${min} e ${max}.`)
      return clamp(n, min, max)
    }
    for (const key of ['offsetx', 'offsety'] as const)
      if (Math.abs(number(l[key])) > (bounds ? REGION_PIXEL_LIMIT : LIMITS.layerOffset))
        refuse(`O deslocamento de ${where} é grande demais para o Pinta.`)
    const common = {
      id,
      name: cut(label, 'uma camada'),
      visible: l.visible !== false && l.visible !== 0,
      ...(parentId ? { parentId } : {}),
      ...(l.locked ? { locked: true as const } : {}),
      ...(l.opacity !== undefined && l.opacity !== 1
        ? { opacity: limited(l.opacity, 0, 1, 'A opacidade') }
        : {}),
      ...(number(l.offsetx) ? { offsetX: number(l.offsetx) } : {}),
      ...(number(l.offsety) ? { offsetY: number(l.offsety) } : {}),
      ...(l.parallaxx !== undefined && l.parallaxx !== 1
        ? { parallaxX: limited(l.parallaxx, 0, LIMITS.parallax, 'O parallax') }
        : {}),
      ...(l.parallaxy !== undefined && l.parallaxy !== 1
        ? { parallaxY: limited(l.parallaxy, 0, LIMITS.parallax, 'O parallax') }
        : {}),
      ...(Object.keys(userProperties).length ? { properties: userProperties } : {}),
    }
    if ((l.mode && l.mode !== 'normal') || l.tintcolor)
      warnings.push(`A camada ${label} usa mistura ou tonalidade que não foi convertida.`)
    if (l.type === 'group') {
      if (depth >= LIMITS.groupDepth)
        refuse(
          `O mapa tem grupos dentro de grupos demais. O Pinta aceita até ${LIMITS.groupDepth} níveis.`,
        )
      push({ ...common, kind: 'group' })
      for (const child of array(l.layers)) convert(child, id, depth + 1)
      return
    }
    if (l.type === 'tilelayer') {
      const flags = {
        ...(p['pinta:front'] === true ? { front: true } : {}),
        ...(p['pinta:collision'] === true ? { collision: true } : {}),
      }
      if (bounds && region) {
        if (
          number(l.x) ||
          number(l.y) ||
          (l.data !== undefined && l.data !== '' && !(Array.isArray(l.data) && !l.data.length))
        )
          refuse(`A camada ${label} precisa guardar as peças nas regiões do mapa.`)
        let tilesetId: string | undefined
        const grid = readRegionalTiledGrid(
          l.chunks ?? [],
          bounds,
          (chunk, length) =>
            data({ encoding: l.encoding, compression: l.compression, ...chunk }, length),
          (gid) => {
            const g = resolve(gid)
            if (!g || g.art) return refuse(`A camada ${label} aponta para uma peça inválida.`)
            if (tilesetId && tilesetId !== g.id)
              refuse(
                `A camada ${label} usa mais de uma folha. Separe as peças em camadas no Tiled.`,
              )
            tilesetId = g.id
            return gidCell(gid, g.first)
          },
          (length) => {
            regionalSourceCells += length
            if (regionalSourceCells > PINTA_REGION_LIMITS.maxChunks * PINTA_REGION_CELL_COUNT)
              refuse('As regiões do mapa do Tiled ocupam espaço demais.')
          },
          () => {
            regionBytes += PINTA_REGION_CHUNK_BYTES
            if (regionBytes > region.maxIndexBytes)
              refuse('As regiões do mapa ocupam espaço demais.')
          },
        )
        const chosen = tilesetId ?? string(p['pinta:tileset'], string(tilesets[0]?.id))
        push({
          ...common,
          kind: 'tiles',
          tilesetId: chosen,
          cells: grid,
          ...flags,
        })
        return
      }
      if (l.chunks) refuse('Camadas infinitas não entram no Pinta.')
      if (
        (l.width !== undefined && number(l.width) !== cols) ||
        (l.height !== undefined && number(l.height) !== rows)
      )
        refuse(`A camada ${label} tem um tamanho diferente do mapa.`)
      const values = data(l, cols * rows)
      const used = [...new Set(values.filter((v) => v > 0).map((v) => resolve(v)?.id))]
      if (used.includes(undefined))
        refuse(`A camada ${label} aponta para peças que não existem nas folhas do mapa.`)
      if (used.some((source) => gids.find((g) => g.id === source)?.art))
        refuse(`A camada ${label} usa um desenho de objeto como peça.`)
      const sources = used.length ? used : [string(tilesets[0]?.id)]
      for (const [n, source] of sources.entries()) {
        const g = gids.find((g) => g.id === source)
        if (!g) throw new TiledImportError('O mapa precisa de pelo menos uma folha de peças.')
        cells += values.length
        if (cells > LIMITS.cells)
          refuse(
            `O mapa tem casas demais somando as camadas. O Pinta aceita até ${LIMITS.cells.toLocaleString('pt-BR')}.`,
          )
        push({
          ...common,
          id: n ? `${id}-${n}` : id,
          kind: 'tiles',
          tilesetId: source,
          cells: values.map((v) =>
            v === 0 || resolve(v)?.id !== source ? -1 : gidCell(v, g.first),
          ),
          ...flags,
        })
      }
      if (sources.length > 1)
        warnings.push(
          `A camada ${label} virou ${sources.length} camadas, uma para cada folha de peças.`,
        )
      return
    }
    if (l.type === 'objectgroup') {
      if (array(l.objects).length > LIMITS.objects)
        refuse(
          `A camada ${label} tem objetos demais. O Pinta aceita até ${LIMITS.objects} por camada.`,
        )
      if (l.draworder !== 'index' && array(l.objects).some((o) => number(rec(o).gid)))
        warnings.push(
          `A camada ${label} desenhava os objetos de cima para baixo; no Pinta eles ficam na ordem da lista.`,
        )
      const objects: RecordValue[] = array(l.objects)
        .map(rec)
        .flatMap((o) => {
          const called = string(o.name) || `número ${String(o.id ?? '?')}`,
            whereObject = `o objeto ${called} da camada ${label}`,
            p = props(o.properties, whereObject, warnings),
            extra = json(p['pinta:object']),
            e = extra && typeof extra === 'object' && !Array.isArray(extra) ? rec(extra) : {},
            id = string(e.id, `object-${o.id}`)
          numericObjects.set(String(o.id), id)
          if (o.text) {
            warnings.push(`O texto do objeto ${called} não foi convertido.`)
            return []
          }
          if (o.template)
            warnings.push(
              `${whereObject[0]!.toUpperCase()}${whereObject.slice(1)} usa um modelo do Tiled (${String(o.template)}), que o Pinta não lê. Ele entrou só com o lugar, o nome e as propriedades que estavam no mapa.`,
            )
          if ((o.visible === false || o.visible === 0) && !e.setId)
            warnings.push(
              `${whereObject[0]!.toUpperCase()}${whereObject.slice(1)} estava escondido no Tiled e entrou visível.`,
            )
          const gid = number(o.gid),
            g = gid ? resolve(gid) : undefined
          if (gid && !g)
            refuse(
              `${whereObject[0]!.toUpperCase()}${whereObject.slice(1)} usa uma peça que não existe nas folhas do mapa.`,
            )
          const box = {
            x: number(o.x),
            y: number(o.y),
            width: Math.abs(number(o.width)),
            height: Math.abs(number(o.height)),
            rotation: number(o.rotation),
          }
          const placed = g ? tileObjectPlacement({ ...box, gid }) : null,
            at = placed ?? box
          if (
            [at.x, at.y, at.width, at.height].some(
              (n) => Math.abs(n) > (bounds ? REGION_PIXEL_LIMIT : LIMITS.objectCoord),
            )
          )
            refuse(
              `${whereObject[0]!.toUpperCase()}${whereObject.slice(1)} está longe ou é grande demais para o Pinta.`,
            )
          const points = array(o.polygon ?? o.polyline)
          if (points.length > LIMITS.points)
            refuse(
              `${whereObject[0]!.toUpperCase()}${whereObject.slice(1)} tem pontos demais. O Pinta aceita até ${LIMITS.points}.`,
            )
          const tile = g ? (gid & GID_MASK) - g.first : 0,
            original = e.art && typeof e.art === 'object' ? rec(e.art) : null
          const selectedAnimation = g?.animationId
            ? art
                .find((a) => a.id === g.id)
                ?.sprite?.animations.find(
                  (v) => v.id === g.animationId && v.frames[0]?.tile === tile,
                )
            : undefined
          if (g?.art && !selectedAnimation && tile > 255)
            refuse(
              `O quadro escolhido em ${label} está além dos 256 quadros que um objeto estático do Pinta pode referenciar.`,
            )
          const shape = o.ellipse
            ? 'ellipse'
            : o.polygon
              ? 'polygon'
              : o.polyline
                ? 'polyline'
                : g
                  ? 'art'
                  : o.point
                    ? // Objeto do Pinta sem forma e sem tamanho sai como ponto e volta sem forma.
                      e.id !== undefined && e.shape === undefined
                      ? undefined
                      : 'point'
                    : typeof e.shape === 'string'
                      ? e.shape
                      : undefined
          const flipX = placed ? placed.flipX : e.flipX === true,
            flipY = placed ? placed.flipY : e.flipY === true
          return [
            {
              id,
              name: cut(string(o.name), 'um objeto'),
              type: cut(string(o.type) || string(o.class), 'um tipo de objeto'),
              x: at.x,
              y: at.y,
              width: at.width,
              height: at.height,
              properties: plain(p, whereObject, warnings, LIMITS.objectProperties),
              ...(typeof e.role === 'string' ? { role: e.role } : {}),
              ...(typeof e.setId === 'string' ? { setId: e.setId } : {}),
              ...(p['pinta:collision'] === true ? { collision: true } : {}),
              ...(at.rotation ? { rotation: at.rotation } : {}),
              ...(shape ? { shape } : {}),
              ...(shape === 'polygon' || shape === 'polyline'
                ? {
                    points: points.map(rec).map((q) => ({ x: number(q.x), y: number(q.y) })),
                  }
                : {}),
              ...(e.separateArt === true && original ? { art: original } : {}),
              ...(g
                ? {
                    // O desenho original do Pinta volta igual quando ainda aponta para a mesma peça.
                    art:
                      original?.assetId === g.id &&
                      (original.animationId
                        ? original.animationId === selectedAnimation?.id
                        : !selectedAnimation && number(original.tile) === tile)
                        ? original
                        : g.art
                          ? {
                              assetId: g.id,
                              ...(selectedAnimation
                                ? { animationId: selectedAnimation.id }
                                : tile
                                  ? { tile }
                                  : {}),
                            }
                          : { assetId: g.id, tile },
                  }
                : {}),
              ...(flipX ? { flipX: true } : {}),
              ...(flipY ? { flipY: true } : {}),
            },
          ]
        })
      push({ ...common, kind: 'objects', objects })
      return
    }
    warnings.push(`A camada ${label} (${string(l.type)}) não foi convertida.`)
  }
  for (const l of array(map.layers)) convert(l, undefined, 0)
  const remapReferences = (properties: unknown) => {
    if (!properties || typeof properties !== 'object') return
    for (const [key, value] of Object.entries(rec(properties))) {
      const typed = value && typeof value === 'object' ? (value as RecordValue) : null
      if (typed?.type === 'object')
        rec(properties)[key] = {
          ...typed,
          value: numericObjects.get(String(typed.value)) ?? typed.value,
        }
    }
  }
  for (const l of layers) {
    remapReferences(l.properties)
    for (const o of array(l.objects) as RecordValue[]) remapReferences(o.properties)
  }
  for (const ts of tilesets)
    if (ts.tileProperties)
      for (const properties of Object.values(rec(ts.tileProperties))) remapReferences(properties)
  const p = regionalProps ?? props(map.properties, 'o mapa', warnings),
    sets = json(p['pinta:sets']),
    resources = json(p['pinta:resources'])
  const lost = Object.keys(p).filter((key) => !key.startsWith('pinta:'))
  if (lost.length)
    warnings.push(
      `As propriedades do mapa (${lost.join(', ')}) não foram trazidas: o Pinta guarda propriedades nas camadas, nas peças e nos objetos.`,
    )
  const sceneVersion = p['pinta:sceneVersion']
  const candidate = {
    version:
      (sceneVersion && typeof sceneVersion === 'object' ? rec(sceneVersion).value : sceneVersion) ??
      (resources || art.some((a) => a.sprite) ? 2 : 1),
    id: string(p['pinta:id'], 'tiled-map'),
    name: cut(string(p['pinta:name'], name), 'o mapa'),
    cols,
    rows,
    tileSize: size,
    tilesets,
    layers,
    ...(art.length ? { art } : {}),
    ...(sets ? { sets } : {}),
    ...(resources ? { resources } : {}),
  }
  if (region && bounds) {
    const physics = p['pinta:physics']
    if (physics !== 'legacy' && physics !== 'precise')
      refuse('A física original do mapa não veio do Tiled.')
    const wire = {
      ...candidate,
      origin: { col: bounds.col, row: bounds.row },
      physics,
    }
    const scene = readPintaRegionScene(JSON.stringify(wire), region.maxIndexBytes)
    if (!scene) return refuse('Não foi possível conferir o cenário regional editado.')
    await restoreAtlasCounts(scene, atlasSnapshots)
    // Admission checked every field of this specific object, including every encoded region.
    const canonical = {
      ...wire,
      tilesets: scene.tilesets,
    } as PintaRegionSceneWire
    const indexBytes = [scene, ...(scene.sets ?? [])].reduce(
      (bytes, map) =>
        bytes +
        map.layers.reduce(
          (total, layer) =>
            total +
            (layer.kind === 'tiles' ? layer.cells.chunks.length * PINTA_REGION_CHUNK_BYTES : 0),
          0,
        ),
      0,
    )
    return {
      scene,
      wire: canonical,
      indexBytes,
      metadataBytes: new JsonByteSizeCache(64).byteLength(canonical),
      warnings,
    }
  }
  const parsed = PintaSceneSchema.safeParse(candidate)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return refuse(explain(candidate, issue?.path ?? [], issue?.message ?? ''))
  }
  await restoreAtlasCounts(parsed.data, atlasSnapshots)
  return { scene: parsed.data, warnings }
}
// Tipos usados só para conferir, em compilação, que o importador monta as formas da cena.
export type _ImportedLayer = PintaSceneLayer
export type _ImportedObject = PintaSceneObject

/** Atributos que são texto mesmo quando parecem número (`name="1234"`, cor `000000`). */
const TEXT_ATTRIBUTES = new Set([
  'name',
  'type',
  'class',
  'orientation',
  'renderorder',
  'version',
  'tiledversion',
  'source',
  'template',
  'color',
  'tintcolor',
  'backgroundcolor',
  'trans',
  'compression',
  'encoding',
  'wangid',
  'points',
  'draworder',
  'mode',
  'objectalignment',
  'propertytype',
])

/** O DOMParser do navegador não busca entidades externas; DTDs são recusados explicitamente. */
export function tiledXmlToJson(text: string): RecordValue {
  if (/<!DOCTYPE|<!ENTITY/i.test(text))
    refuse('O mapa XML contém entidades, que o Pinta recusa por segurança.')
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.querySelector('parsererror')) refuse('O arquivo TMX/TSX não é um XML válido.')
  /** Uma propriedade fica como texto cru; `props` converte pelo `type` (sem `type` é texto). */
  const property = (element: Element): RecordValue => ({
    name: element.getAttribute('name') ?? '',
    ...(element.hasAttribute('type') ? { type: element.getAttribute('type') } : {}),
    ...(element.hasAttribute('propertytype')
      ? { propertytype: element.getAttribute('propertytype') }
      : {}),
    // O Tiled grava texto de várias linhas no corpo do elemento, não no atributo.
    value: element.hasAttribute('value')
      ? element.getAttribute('value')
      : (element.textContent ?? ''),
  })
  const read = (element: Element): RecordValue => {
    const result: RecordValue = {}
    for (const a of element.attributes)
      result[a.name] = TEXT_ATTRIBUTES.has(a.name)
        ? a.value
        : a.value === 'true'
          ? true
          : a.value === 'false'
            ? false
            : a.value.trim() !== '' && Number.isFinite(Number(a.value))
              ? Number(a.value)
              : a.value
    for (const child of element.children) {
      const name = child.tagName
      if (name === 'properties') {
        result.properties = [...child.children].map(property)
        continue
      }
      if (element.tagName === 'tile' && name === 'objectgroup') {
        result.objectgroup = read(child)
        continue
      }
      if (['layer', 'objectgroup', 'group', 'imagelayer'].includes(name)) {
        result.layers ??= []
        ;(result.layers as unknown[]).push({
          ...read(child),
          type: name === 'layer' ? 'tilelayer' : name,
        })
        continue
      }
      if (name === 'data') {
        const chunkData = (data: Element) => {
          const encoding = child.getAttribute('encoding')
          const text = data.textContent ?? ''
          if (encoding === 'base64') return text
          if (encoding !== 'csv')
            return [...data.children].map((c) => Number(c.getAttribute('gid') ?? 0))
          return text.trim()
            ? text
                .trim()
                .split(/[\s,]+/)
                .map(Number)
            : []
        }
        const chunks = [...child.children].filter((element) => element.tagName === 'chunk')
        if (chunks.length)
          result.chunks = chunks.map((chunk) => ({
            ...read(chunk),
            data: chunkData(chunk),
          }))
        else result.data = chunkData(child)
        result.encoding = child.getAttribute('encoding') ?? 'csv'
        result.compression = child.getAttribute('compression') ?? ''
        continue
      }
      if (name === 'image') {
        result.image = child.getAttribute('source')
        result.imagewidth = Number(child.getAttribute('width'))
        result.imageheight = Number(child.getAttribute('height'))
        if (child.hasAttribute('trans')) result.transparentcolor = child.getAttribute('trans')
        continue
      }
      if (name === 'point' || name === 'ellipse') {
        result[name] = true
        continue
      }
      if (name === 'text') {
        result.text = { text: child.textContent ?? '' }
        continue
      }
      if (name === 'tileoffset') {
        result.tileoffset = read(child)
        continue
      }
      if (name === 'polygon' || name === 'polyline') {
        result[name] = (child.getAttribute('points') ?? '')
          .trim()
          .split(/\s+/)
          .map((p) => {
            const [x, y] = p.split(',').map(Number)
            return { x, y }
          })
        continue
      }
      if (name === 'animation') {
        result.animation = [...child.children].map(read)
        continue
      }
      if (name === 'wangsets') {
        result.wangsets = [...child.children].map(read)
        continue
      }
      const key =
        name === 'tileset'
          ? 'tilesets'
          : name === 'tile'
            ? 'tiles'
            : name === 'object'
              ? 'objects'
              : name === 'wangcolor'
                ? 'colors'
                : name === 'wangtile'
                  ? 'wangtiles'
                  : null
      if (key) {
        const value = read(child)
        if (name === 'wangtile') value.wangid = string(value.wangid).split(',').map(Number)
        result[key] ??= []
        ;(result[key] as unknown[]).push(value)
      }
    }
    return result
  }
  return read(doc.documentElement)
}
