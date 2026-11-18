import {
  type PintaScene,
  type PintaSceneLayer,
  type PintaSceneObject,
  PintaSceneSchema,
} from '@sistemazero/core/studio/pinta-scene'
import { gunzipSync, unzlibSync } from 'fflate'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, makeCell } from '../../tiles/cell'

type RecordValue = Record<string, unknown>
const rec = (v: unknown): RecordValue => {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw new Error('Estrutura de mapa inválida.')
  return v as RecordValue
}
const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const number = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback
const string = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
export function gidCell(gid: number, first: number): number {
  return (gid & 0x0fffffff) === 0
    ? -1
    : makeCell(
        (gid & 0x0fffffff) - first,
        (gid & 0x80000000 ? CELL_FLIP_H : 0) |
          (gid & 0x40000000 ? CELL_FLIP_V : 0) |
          (gid & 0x20000000 ? CELL_FLIP_D : 0),
      )
}
function props(v: unknown): RecordValue {
  return Object.fromEntries(
    array(v)
      .map(rec)
      .map((p) => [
        string(p.name),
        p.type === 'bool'
          ? p.value === true
          : p.type === 'int' || p.type === 'float'
            ? { type: p.type, value: number(p.value) }
            : p.type === 'color'
              ? {
                  type: 'color',
                  value:
                    string(p.value).length === 9
                      ? `#${string(p.value).slice(3)}${string(p.value).slice(1, 3)}`
                      : string(p.value),
                }
              : p.type === 'object'
                ? { type: 'object', value: String(p.value) }
                : p.type === 'file'
                  ? { type: 'asset', value: string(p.value) }
                  : string(p.value),
      ]),
  )
}
function plainProperties(p: RecordValue): RecordValue {
  return Object.fromEntries(Object.entries(p).filter(([k]) => !k.startsWith('pinta:')))
}
function json(value: unknown): unknown {
  try {
    return JSON.parse(string(value))
  } catch {
    return undefined
  }
}
function data(layer: RecordValue, count: number): number[] {
  if (Array.isArray(layer.data)) return layer.data.map((n) => number(n))
  if (typeof layer.data !== 'string') throw new Error('Camada sem dados de peças.')
  if (layer.encoding === 'csv')
    return layer.data
      .trim()
      .split(/[\s,]+/)
      .map(Number)
  if (layer.encoding !== 'base64') throw new Error('Codificação da camada não suportada.')
  const raw = Uint8Array.from(atob(layer.data.replace(/\s/g, '')), (c) => c.charCodeAt(0))
  if (raw.length > 16 * 1024 * 1024) throw new Error('Camada compactada grande demais.')
  const buffer = new Uint8Array(count * 4)
  let bytes = raw
  if (layer.compression === 'zlib') bytes = unzlibSync(raw, { out: buffer })
  else if (layer.compression === 'gzip') bytes = gunzipSync(raw, { out: buffer })
  else if (layer.compression) throw new Error(`Compressão ${layer.compression} não suportada.`)
  if (bytes.length !== count * 4) throw new Error('O tamanho da camada não corresponde ao mapa.')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return Array.from({ length: count }, (_, i) => view.getUint32(i * 4, true))
}
export interface TiledResolver {
  text: (path: string) => Promise<string>
  image: (path: string) => Promise<string>
}
export async function importTiledScene(
  input: unknown,
  resolver: TiledResolver,
  name = 'mapa-importado',
): Promise<{ scene: PintaScene; warnings: string[] }> {
  const map = rec(input),
    warnings: string[] = []
  if (map.orientation !== 'orthogonal' || map.infinite === true || map.infinite === 1)
    throw new Error(
      'Traga um mapa ortogonal de tamanho fixo. Mapas infinitos, isométricos e hexagonais ainda não entram no Pinta.',
    )
  const cols = number(map.width),
    rows = number(map.height),
    size = number(map.tilewidth)
  if (
    !Number.isInteger(cols) ||
    !Number.isInteger(rows) ||
    cols < 1 ||
    rows < 1 ||
    cols > 256 ||
    rows > 256 ||
    number(map.tileheight) !== size
  )
    throw new Error('O mapa precisa de peças quadradas e de até 256 × 256 casas.')
  const art: NonNullable<PintaScene['art']> = [],
    tilesets: PintaScene['tilesets'] = [],
    gids: { first: number; id: string; count: number; art?: string }[] = []
  for (const [i, raw] of array(map.tilesets).entries()) {
    let ts = rec(raw)
    const first = number(ts.firstgid)
    if (ts.source) {
      const path = string(ts.source),
        text = await resolver.text(path)
      ts = {
        ...((path.endsWith('.tsx') ? tiledXmlToJson(text) : rec(JSON.parse(text))) as RecordValue),
        firstgid: first,
      }
      if (ts.image && path.includes('/'))
        ts.image = path.slice(0, path.lastIndexOf('/') + 1) + string(ts.image)
    }
    const properties = props(ts.properties),
      id = string(properties['pinta:id'], `tiles-${i}`),
      count = number(ts.tilecount),
      columns = number(ts.columns)
    if (properties['pinta:art']) {
      const artId = string(properties['pinta:art'])
      art.push({
        id: artId,
        image: await resolver.image(string(ts.image)),
        width: number(ts.tilewidth),
        height: number(ts.tileheight),
      })
      gids.push({ first, id: artId, count: 1, art: artId })
      continue
    }
    if (
      !ts.image ||
      !count ||
      count > 256 ||
      !columns ||
      number(ts.tilewidth) !== size ||
      number(ts.tileheight) !== size ||
      number(ts.margin) !== 0 ||
      number(ts.spacing) !== 0
    )
      throw new Error(
        'As peças precisam estar numa folha sem margem nem espaçamento, com o mesmo tamanho do mapa e até 256 peças.',
      )
    const solid: number[] = [],
      platform: number[] = [],
      animations: NonNullable<PintaScene['tilesets'][number]['animations']> = {},
      tileProperties: RecordValue = {}
    for (const rawTile of array(ts.tiles)) {
      const t = rec(rawTile),
        tile = number(t.id),
        p = props(t.properties)
      if (p.solid === true) solid.push(tile)
      if (p.platform === true) platform.push(tile)
      const entries = plainProperties(p)
      delete entries.solid
      delete entries.platform
      if (Object.keys(entries).length) tileProperties[String(tile)] = entries
      if (Array.isArray(t.animation))
        animations[String(tile)] = t.animation
          .map(rec)
          .map((f) => ({ tile: number(f.tileid), duration: number(f.duration, 100) }))
    }
    const terrains = array(ts.wangsets)
      .map(rec)
      .map((t, n) => ({
        id: string(props(t.properties)['pinta:id'], `${id}-terrain-${n}`),
        name: string(t.name),
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
            return /^#[\da-f]{8}$/i.test(color) ? `#${color.slice(3)}` : color
          }),
        tiles: Object.fromEntries(
          array(t.wangtiles)
            .map(rec)
            .map((w) => [String(w.tileid), array(w.wangid).map((n) => number(n))]),
        ),
      }))
    const parsed = PintaSceneSchema.shape.tilesets.element.parse({
      id,
      name: string(ts.name, `Peças ${i + 1}`),
      image: await resolver.image(string(ts.image)),
      columns,
      count,
      solid,
      platform,
      ...(Object.keys(animations).length ? { animations } : {}),
      ...(Object.keys(tileProperties).length ? { tileProperties } : {}),
      ...(terrains.length ? { terrains } : {}),
    })
    tilesets.push(parsed)
    gids.push({ first, id, count })
  }
  gids.sort((a, b) => a.first - b.first)
  const layers: PintaSceneLayer[] = [],
    numericObjects = new Map<string, string>()
  const resolve = (gid: number) => gids.filter((g) => g.first <= (gid & 0x0fffffff)).at(-1)
  const convert = (raw: unknown, parentId?: string): void => {
    const l = rec(raw),
      p = props(l.properties)
    if (p['pinta:expanded'] === true) return
    if (p['pinta:wrapper'] === true) {
      for (const child of array(l.layers)) convert(child, parentId)
      return
    }
    const id = string(p['pinta:id'], `layer-${l.id ?? layers.length}`)
    const common = {
      id,
      name: string(l.name, 'Camada'),
      visible: l.visible !== false && l.visible !== 0,
      ...(parentId ? { parentId } : {}),
      ...(l.locked ? { locked: true as const } : {}),
      ...(l.opacity !== undefined && l.opacity !== 1 ? { opacity: number(l.opacity, 1) } : {}),
      ...(l.offsetx ? { offsetX: number(l.offsetx) } : {}),
      ...(l.offsety ? { offsetY: number(l.offsety) } : {}),
      ...(l.parallaxx !== undefined && l.parallaxx !== 1
        ? { parallaxX: number(l.parallaxx, 1) }
        : {}),
      ...(l.parallaxy !== undefined && l.parallaxy !== 1
        ? { parallaxY: number(l.parallaxy, 1) }
        : {}),
      ...(Object.keys(plainProperties(p)).length ? { properties: plainProperties(p) } : {}),
    }
    if ((l.mode && l.mode !== 'normal') || l.tintcolor)
      warnings.push(`A camada ${common.name} usa mistura ou tonalidade que não foi convertida.`)
    if (l.type === 'group') {
      layers.push(PintaSceneSchema.shape.layers.element.parse({ ...common, kind: 'group' }))
      for (const child of array(l.layers)) convert(child, id)
      return
    }
    if (l.type === 'tilelayer') {
      if (l.chunks) throw new Error('Camadas infinitas não são suportadas.')
      const values = data(l, cols * rows)
      if (values.length !== cols * rows)
        throw new Error('Dimensões de camada diferentes das do mapa não são suportadas.')
      const used = [...new Set(values.filter((v) => v > 0).map((v) => resolve(v)?.id))]
      if (used.includes(undefined)) throw new Error('A camada aponta para peças inexistentes.')
      const sources = used.length ? used : [tilesets[0]?.id]
      for (const [n, source] of sources.entries()) {
        const g = gids.find((g) => g.id === source)
        if (!g) throw new Error('O mapa precisa de pelo menos uma folha de peças.')
        const cells = values.map((v) =>
          v === 0 || resolve(v)?.id !== source ? -1 : gidCell(v, g.first),
        )
        layers.push(
          PintaSceneSchema.shape.layers.element.parse({
            ...common,
            id: n ? `${id}-${n}` : id,
            kind: 'tiles',
            tilesetId: source,
            cells,
            ...(p['pinta:front'] === true ? { front: true } : {}),
            ...(p['pinta:collision'] === true ? { collision: true } : {}),
          }),
        )
      }
      if (sources.length > 1)
        warnings.push(
          `A camada ${common.name} virou ${sources.length} camadas, uma para cada folha de peças.`,
        )
      return
    }
    if (l.type === 'objectgroup') {
      const objects: PintaSceneObject[] = array(l.objects)
        .map(rec)
        .flatMap((o) => {
          const p = props(o.properties),
            extra = json(p['pinta:object']),
            e = extra && typeof extra === 'object' ? rec(extra) : {},
            id = string(e.id, `object-${o.id}`)
          numericObjects.set(String(o.id), id)
          if (o.text) {
            warnings.push(`O texto do objeto ${string(o.name)} não foi convertido.`)
            return []
          }
          const gid = number(o.gid),
            g = gid ? resolve(gid) : undefined
          return [
            PintaSceneSchema.shape.layers.element.options[1].shape.objects.element.parse({
              id,
              name: string(o.name),
              type: string(o.type) || string(o.class),
              x:
                number(o.x) +
                (gid ? Math.sin((number(o.rotation) * Math.PI) / 180) * number(o.height) : 0),
              y:
                number(o.y) -
                (gid ? Math.cos((number(o.rotation) * Math.PI) / 180) * number(o.height) : 0),
              width: number(o.width),
              height: number(o.height),
              properties: plainProperties(p),
              ...e,
              ...(number(o.rotation) ? { rotation: number(o.rotation) } : {}),
              ...(o.ellipse
                ? { shape: 'ellipse' }
                : o.point
                  ? { shape: 'point' }
                  : o.polygon
                    ? { shape: 'polygon', points: o.polygon }
                    : o.polyline
                      ? { shape: 'polyline', points: o.polyline }
                      : gid && g
                        ? {
                            shape: 'art',
                            art: { assetId: g.id, tile: (gid & 0x0fffffff) - g.first },
                            ...(gid & 0x80000000 ? { flipX: true } : {}),
                            ...(gid & 0x40000000 ? { flipY: true } : {}),
                          }
                        : {}),
            }),
          ]
        })
      layers.push(
        PintaSceneSchema.shape.layers.element.parse({ ...common, kind: 'objects', objects }),
      )
      return
    }
    warnings.push(`A camada ${common.name} (${string(l.type)}) não foi convertida.`)
  }
  for (const l of array(map.layers)) convert(l)
  for (const l of layers)
    if (l.kind === 'objects')
      for (const o of l.objects)
        for (const [key, value] of Object.entries(o.properties))
          if (typeof value === 'object' && value.type === 'object')
            o.properties[key] = {
              ...value,
              value: numericObjects.get(String(value.value)) ?? value.value,
            }
  const p = props(map.properties),
    sets = json(p['pinta:sets'])
  const scene = PintaSceneSchema.parse({
    version: 1,
    id: string(p['pinta:id'], 'tiled-map'),
    name: string(p['pinta:name'], name),
    cols,
    rows,
    tileSize: size,
    tilesets,
    layers,
    ...(art.length ? { art } : {}),
    ...(sets ? { sets } : {}),
  })
  return { scene, warnings }
}

/** O DOMParser do navegador não busca entidades externas; DTDs são recusados explicitamente. */
export function tiledXmlToJson(text: string): RecordValue {
  if (/<!DOCTYPE|<!ENTITY/i.test(text))
    throw new Error('O mapa XML contém entidades não suportadas.')
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('O arquivo TMX/TSX não é um XML válido.')
  const read = (element: Element): RecordValue => {
    const result: RecordValue = {}
    for (const a of element.attributes)
      result[a.name] = [
        'name',
        'type',
        'class',
        'orientation',
        'renderorder',
        'version',
        'tiledversion',
        'source',
        'color',
        'compression',
        'encoding',
        'wangid',
        'points',
      ].includes(a.name)
        ? a.value
        : a.value === 'true'
          ? true
          : a.value === 'false'
            ? false
            : Number.isFinite(Number(a.value))
              ? Number(a.value)
              : a.value
    for (const child of element.children) {
      const name = child.tagName
      if (name === 'properties') {
        result.properties = [...child.children].map((c) => {
          const p = read(c)
          return { ...p, value: p.value ?? c.textContent ?? '' }
        })
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
        result.data =
          child.getAttribute('encoding') === 'csv'
            ? (child.textContent ?? '')
                .trim()
                .split(/[\s,]+/)
                .map(Number)
            : child.getAttribute('encoding') === 'base64'
              ? child.textContent
              : [...child.children].map((c) => Number(c.getAttribute('gid')))
        result.encoding = child.getAttribute('encoding') ?? 'csv'
        result.compression = child.getAttribute('compression') ?? ''
        continue
      }
      if (name === 'image') {
        result.image = child.getAttribute('source')
        result.imagewidth = Number(child.getAttribute('width'))
        result.imageheight = Number(child.getAttribute('height'))
        continue
      }
      if (name === 'point' || name === 'ellipse') {
        result[name] = true
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
