import type {
  PintaScene,
  PintaSceneLayer,
  PintaSceneObject,
} from '@sistemazero/core/studio/pinta-scene'
import { sceneLayerState } from '@sistemazero/core/studio/pinta-scene-runtime'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, cellFlags, cellTile } from '../../tiles/cell'
import { cellMatrix } from '../../tiles/chunks'

type Property = { name: string; type: string; value: unknown }
export function cellToGid(cell: number, firstgid: number): number {
  return cell < 0
    ? 0
    : ((cellTile(cell) + firstgid) |
        (cellFlags(cell) & CELL_FLIP_H ? 0x80000000 : 0) |
        (cellFlags(cell) & CELL_FLIP_V ? 0x40000000 : 0) |
        (cellFlags(cell) & CELL_FLIP_D ? 0x20000000 : 0)) >>>
        0
}
export function tiledProperties(properties: Record<string, unknown> | undefined): Property[] {
  return Object.entries(properties ?? {}).map(([name, raw]) => {
    const typed = raw && typeof raw === 'object' && 'type' in raw && 'value' in raw ? raw : null
    let value = typed ? typed.value : raw
    if (typed?.type === 'color' && typeof value === 'string' && value.length === 9)
      value = `#${value.slice(7)}${value.slice(1, 7)}`
    return {
      name,
      type: typed
        ? String(typed.type) === 'asset'
          ? 'file'
          : String(typed.type)
        : typeof value === 'boolean'
          ? 'bool'
          : typeof value === 'number'
            ? Number.isInteger(value)
              ? 'int'
              : 'float'
            : 'string',
      value,
    }
  })
}
/** Arquivos usam índices estáveis; os nomes livres do usuário nunca viram caminhos. */
export function tiledMap(scene: PintaScene): Record<string, unknown> {
  let first = 1,
    layerId = 0,
    objectId = 0
  const firstgid = new Map<string, number>(),
    ids = new Map<string, number>()
  for (const l of scene.layers)
    if (l.kind === 'objects') for (const o of l.objects) ids.set(o.id, ++objectId)
  const tilesets = scene.tilesets.map((ts, i) => {
    const start = first
    firstgid.set(ts.id, start)
    first += ts.count
    const tileIds = new Set([
      ...ts.solid,
      ...ts.platform,
      ...Object.keys(ts.animations ?? {}).map(Number),
      ...Object.keys(ts.tileProperties ?? {}).map(Number),
    ])
    return {
      firstgid: start,
      name: ts.name,
      tilewidth: scene.tileSize,
      tileheight: scene.tileSize,
      tilecount: ts.count,
      columns: ts.columns,
      margin: 0,
      spacing: 0,
      image: `images/tiles-${i}.png`,
      imagewidth: ts.columns * scene.tileSize,
      imageheight: Math.ceil(ts.count / ts.columns) * scene.tileSize,
      properties: [{ name: 'pinta:id', type: 'string', value: ts.id }],
      tiles: [...tileIds]
        .sort((a, b) => a - b)
        .map((id) => ({
          id,
          ...(ts.animations?.[id]
            ? {
                animation: ts.animations[id].map((f) => ({ tileid: f.tile, duration: f.duration })),
              }
            : {}),
          properties: [
            ...tiledProperties(ts.tileProperties?.[id]),
            ...(ts.solid.includes(id) ? [{ name: 'solid', type: 'bool', value: true }] : []),
            ...(ts.platform.includes(id) ? [{ name: 'platform', type: 'bool', value: true }] : []),
          ],
        })),
      wangsets:
        ts.terrains?.map((t) => ({
          name: t.name,
          properties: [{ name: 'pinta:id', type: 'string', value: t.id }],
          type: t.mode === 'corner' ? 'corner' : t.mode === 'edge' ? 'edge' : 'mixed',
          tile: -1,
          colors: t.colors.map((color, n) => ({
            name: `Terreno ${n + 1}`,
            color,
            tile: -1,
            probability: 1,
          })),
          wangtiles: Object.entries(t.tiles).map(([tile, wangid]) => ({
            tileid: Number(tile),
            wangid,
          })),
        })) ?? [],
    }
  })
  const artFirst = new Map<string, number>()
  for (const [i, a] of (scene.art ?? []).entries()) {
    artFirst.set(a.id, first)
    tilesets.push({
      firstgid: first++,
      name: `Objeto ${i + 1}`,
      tilewidth: a.width,
      tileheight: a.height,
      tilecount: 1,
      columns: 1,
      margin: 0,
      spacing: 0,
      image: `images/art-${i}.png`,
      imagewidth: a.width,
      imageheight: a.height,
      properties: [{ name: 'pinta:art', type: 'string', value: a.id }],
      tiles: [],
      wangsets: [],
    })
  }
  function object(o: PintaSceneObject): Record<string, unknown> {
    const gid = o.art
      ? cellToGid(
          (o.art.tile ?? 0) | (o.flipX ? CELL_FLIP_H : 0) | (o.flipY ? CELL_FLIP_V : 0),
          firstgid.get(o.art.assetId) ?? artFirst.get(o.art.assetId) ?? 0,
        )
      : undefined
    const properties = tiledProperties(o.properties).map((p) =>
      p.type === 'object' ? { ...p, value: ids.get(String(p.value)) ?? 0 } : p,
    )
    const angle = ((o.rotation ?? 0) * Math.PI) / 180
    return {
      id: ids.get(o.id) ?? ++objectId,
      name: o.name,
      type: o.type,
      x: o.x - (gid ? Math.sin(angle) * o.height : 0),
      y: o.y + (gid ? Math.cos(angle) * o.height : 0),
      width: o.width,
      height: o.height,
      rotation: o.rotation ?? 0,
      visible: !o.setId,
      ...(gid ? { gid } : {}),
      ...(o.shape === 'ellipse' ? { ellipse: true } : {}),
      ...(o.shape === 'point' || (!o.shape && !o.width && !o.height) ? { point: true } : {}),
      ...(o.shape === 'polygon' ? { polygon: o.points ?? [] } : {}),
      ...(o.shape === 'polyline' ? { polyline: o.points ?? [] } : {}),
      properties: [
        ...properties,
        {
          name: 'pinta:object',
          type: 'string',
          value: JSON.stringify({
            id: o.id,
            role: o.role,
            shape: o.shape,
            flipX: o.flipX,
            flipY: o.flipY,
            art: o.art,
            setId: o.setId,
          }),
        },
      ],
    }
  }
  function expanded(o: PintaSceneObject, owner: PintaSceneLayer): Record<string, unknown>[] {
    const set = scene.sets?.find((s) => s.id === o.setId)
    if (!set) return []
    const sx = o.width / (set.cols * scene.tileSize),
      sy = o.height / (set.rows * scene.tileSize),
      angle = ((o.rotation ?? 0) * Math.PI) / 180
    const point = (x: number, y: number) => {
      const px = (o.flipX ? set.cols * scene.tileSize - x : x) * sx,
        py = (o.flipY ? set.rows * scene.tileSize - y : y) * sy
      return {
        x: o.x + px * Math.cos(angle) - py * Math.sin(angle),
        y: o.y + px * Math.sin(angle) + py * Math.cos(angle),
      }
    }
    return set.layers.flatMap((l) => {
      if (l.kind === 'group') return []
      const e = sceneLayerState(set.layers, l),
        objects: Record<string, unknown>[] = []
      if (l.kind === 'tiles' && !l.collision)
        l.cells.forEach((cell, i) => {
          if (cell < 0) return
          const size = scene.tileSize,
            [a, b, c, d] = cellMatrix(cell),
            cx = ((i % set.cols) + 0.5) * size + e.offsetX,
            cy = (Math.floor(i / set.cols) + 0.5) * size + e.offsetY
          const p = point(cx - ((a + c) * size) / 2, cy - ((b + d) * size) / 2),
            pu = point(cx + ((a - c) * size) / 2, cy + ((b - d) * size) / 2),
            pv = point(cx + ((-a + c) * size) / 2, cy + ((-b + d) * size) / 2)
          const ux = pu.x - p.x,
            uy = pu.y - p.y,
            vx = pv.x - p.x,
            vy = pv.y - p.y,
            flip = ux * vy - uy * vx < 0
          objects.push(
            object({
              id: `${o.id}/${l.id}/${i}`,
              name: '',
              type: '',
              x: p.x + (flip ? vx : 0),
              y: p.y + (flip ? vy : 0),
              width: Math.hypot(ux, uy),
              height: Math.hypot(vx, vy),
              rotation: (Math.atan2(uy, ux) * 180) / Math.PI,
              flipY: flip ? true : undefined,
              shape: 'art',
              art: { assetId: l.tilesetId, tile: cellTile(cell) },
              properties: {},
            }),
          )
        })
      if (l.kind === 'objects')
        for (const child of l.objects) {
          const p = point(child.x + e.offsetX, child.y + e.offsetY)
          objects.push(
            object({
              ...child,
              id: `${o.id}/${child.id}`,
              x: p.x,
              y: p.y,
              width: child.width * sx,
              height: child.height * sy,
              rotation:
                (o.rotation ?? 0) +
                (!!o.flipX !== !!o.flipY ? -(child.rotation ?? 0) : (child.rotation ?? 0)),
              flipX: !!o.flipX !== !!child.flipX ? true : undefined,
              flipY: !!o.flipY !== !!child.flipY ? true : undefined,
            }),
          )
        }
      return [
        {
          id: ++layerId,
          type: 'objectgroup',
          name: `${o.name}: ${l.name}`,
          visible: owner.visible && e.visible,
          opacity: (owner.opacity ?? 1) * e.opacity,
          offsetx: owner.offsetX ?? 0,
          offsety: owner.offsetY ?? 0,
          parallaxx: (owner.parallaxX ?? 1) * e.parallaxX,
          parallaxy: (owner.parallaxY ?? 1) * e.parallaxY,
          draworder: 'index',
          objects,
          properties: [{ name: 'pinta:expanded', type: 'bool', value: true }],
        },
      ]
    })
  }
  function layer(l: PintaSceneLayer): Record<string, unknown> {
    const common = {
      id: ++layerId,
      name: l.name,
      visible: l.visible,
      opacity: l.opacity ?? 1,
      offsetx: l.offsetX ?? 0,
      offsety: l.offsetY ?? 0,
      parallaxx: l.parallaxX ?? 1,
      parallaxy: l.parallaxY ?? 1,
      locked: l.locked === true,
      x: 0,
      y: 0,
      properties: [
        ...tiledProperties(l.properties),
        { name: 'pinta:id', type: 'string', value: l.id },
        ...(l.kind === 'tiles' && l.front
          ? [{ name: 'pinta:front', type: 'bool', value: true }]
          : []),
        ...(l.kind === 'tiles' && l.collision
          ? [{ name: 'pinta:collision', type: 'bool', value: true }]
          : []),
      ],
    }
    if (l.kind === 'group')
      return {
        ...common,
        type: 'group',
        layers: scene.layers.filter((c) => c.parentId === l.id).map(layer),
      }
    if (l.kind === 'objects') {
      const original = {
          ...common,
          type: 'objectgroup',
          draworder: 'index',
          objects: l.objects.map(object),
        },
        instances = l.objects.flatMap((o) => expanded(o, l))
      return instances.length
        ? {
            id: ++layerId,
            name: l.name,
            type: 'group',
            visible: true,
            opacity: 1,
            properties: [{ name: 'pinta:wrapper', type: 'bool', value: true }],
            layers: [original, ...instances],
          }
        : original
    }
    return {
      ...common,
      type: 'tilelayer',
      width: scene.cols,
      height: scene.rows,
      data: l.cells.map((c) => cellToGid(c, firstgid.get(l.tilesetId) ?? 1)),
    }
  }
  const layers = scene.layers.filter((l) => !l.parentId).map(layer)
  return {
    type: 'map',
    version: '1.10',
    tiledversion: '1.12.2',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    infinite: false,
    width: scene.cols,
    height: scene.rows,
    tilewidth: scene.tileSize,
    tileheight: scene.tileSize,
    tilesets,
    layers,
    nextlayerid: layerId + 1,
    nextobjectid: objectId + 1,
    properties: [
      { name: 'pinta:id', type: 'string', value: scene.id },
      { name: 'pinta:name', type: 'string', value: scene.name },
      ...(scene.sets?.length
        ? [{ name: 'pinta:sets', type: 'string', value: JSON.stringify(scene.sets) }]
        : []),
    ],
  }
}
const xml = (v: unknown): string =>
  String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    // Num atributo, o leitor XML troca quebra de linha e tabulação cruas por espaço.
    .replaceAll('\t', '&#9;')
    .replaceAll('\n', '&#10;')
    .replaceAll('\r', '&#13;')
function attrs(obj: Record<string, unknown>, keys: string[]): string {
  return keys
    .filter((k) => obj[k] !== undefined)
    .map((k) => ` ${k}="${xml(typeof obj[k] === 'boolean' ? (obj[k] ? 1 : 0) : obj[k])}"`)
    .join('')
}
function props(raw: unknown): string {
  const values = raw as Property[] | undefined
  return values?.length
    ? '<properties>' +
        values
          .map(
            (p) =>
              `<property name="${xml(p.name)}" type="${xml(p.type)}" value="${xml(p.value)}"/>`,
          )
          .join('') +
        '</properties>'
    : ''
}
export function tiledTilesetXml(ts: Record<string, unknown>): string {
  const tiles = (ts.tiles as Record<string, unknown>[]) ?? [],
    wang = (ts.wangsets as Record<string, unknown>[]) ?? []
  return `<tileset version="1.10" tiledversion="1.12.2"${attrs(ts, ['name', 'tilewidth', 'tileheight', 'tilecount', 'columns', 'margin', 'spacing'])}>${props(ts.properties)}<image source="${xml(ts.image)}" width="${ts.imagewidth}" height="${ts.imageheight}"/>${tiles.map((t) => `<tile id="${t.id}">${props(t.properties)}${t.animation ? `<animation>${(t.animation as { tileid: number; duration: number }[]).map((f) => `<frame tileid="${f.tileid}" duration="${f.duration}"/>`).join('')}</animation>` : ''}</tile>`).join('')}${wang.length ? `<wangsets>${wang.map((w) => `<wangset${attrs(w, ['name', 'type', 'tile'])}>${props(w.properties)}${(w.colors as Record<string, unknown>[]).map((c) => `<wangcolor${attrs(c, ['name', 'color', 'tile', 'probability'])}/>`).join('')}${(w.wangtiles as { tileid: number; wangid: number[] }[]).map((t) => `<wangtile tileid="${t.tileid}" wangid="${t.wangid.join(',')}"/>`).join('')}</wangset>`).join('')}</wangsets>` : ''}</tileset>`
}
export function tiledMapXml(map: Record<string, unknown>, external = false): string {
  const layer = (l: Record<string, unknown>): string => {
    const a = attrs(l, [
        'id',
        'name',
        'width',
        'height',
        'opacity',
        'visible',
        'offsetx',
        'offsety',
        'parallaxx',
        'parallaxy',
        'locked',
      ]),
      p = props(l.properties)
    if (l.type === 'group')
      return `<group${a}>${p}${(l.layers as Record<string, unknown>[]).map(layer).join('')}</group>`
    if (l.type === 'tilelayer')
      return `<layer${a}>${p}<data encoding="csv">${(l.data as number[]).join(',')}</data></layer>`
    return `<objectgroup${a} draworder="index">${p}${((l.objects as Record<string, unknown>[]) ?? []).map((o) => `<object${attrs(o, ['id', 'name', 'type', 'x', 'y', 'width', 'height', 'rotation', 'gid', 'visible'])}>${props(o.properties)}${o.point ? '<point/>' : ''}${o.ellipse ? '<ellipse/>' : ''}${o.polygon || o.polyline ? `<${o.polygon ? 'polygon' : 'polyline'} points="${((o.polygon || o.polyline) as { x: number; y: number }[]).map((p) => `${p.x},${p.y}`).join(' ')}"/>` : ''}</object>`).join('')}</objectgroup>`
  }
  return `<?xml version="1.0" encoding="UTF-8"?><map${attrs(map, ['version', 'tiledversion', 'orientation', 'renderorder', 'width', 'height', 'tilewidth', 'tileheight', 'infinite', 'nextlayerid', 'nextobjectid'])}>${props(map.properties)}${(map.tilesets as Record<string, unknown>[]).map((t, i) => (external ? `<tileset firstgid="${t.firstgid}" source="tiles-${i}.tsx"/>` : tiledTilesetXml(t).replace('<tileset ', `<tileset firstgid="${t.firstgid}" `))).join('')}${(map.layers as Record<string, unknown>[]).map(layer).join('')}</map>`
}
