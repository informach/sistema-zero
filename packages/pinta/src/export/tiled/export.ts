import {
  createHexRegionCellReader,
  createPintaProjectionGeometry,
  createRegionCellReader,
  encodePintaHexRegionLayers,
  encodePintaRegionLayers,
  PINTA_HEX_TILE_MASK,
  PINTA_REGION_SIDE,
  type PintaHexRegionCells,
  type PintaRegionCells,
  pintaHexCellTile,
  unpackPintaHexCell,
} from '@sistemazero/core/creations'
import type {
  PintaProjectedScene,
  PintaProjectedSceneMap,
  PintaProjectedSceneWire,
} from '@sistemazero/core/studio/pinta-projected-scene'
import type {
  PintaRegionScene,
  PintaRegionSceneMap,
  PintaRegionSceneWire,
} from '@sistemazero/core/studio/pinta-region-scene'
import type {
  PintaScene,
  PintaSceneCellsLayer,
  PintaSceneObject,
} from '@sistemazero/core/studio/pinta-scene'
import {
  sceneLayerState,
  transformSceneSetObject,
} from '@sistemazero/core/studio/pinta-scene-runtime'
import { JsonByteSizeCache } from '../../core/jsonBytes'
import { PINTA_MAP_FORMAT_LIMITS } from '../../core/projectConfig'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, cellFlags, cellTile } from '../../tiles/cell'
import { cellMatrix } from '../../tiles/chunks'
import { atlasCapacity, atlasSnapshot } from './metadata'
import { TILED_PACKAGE_LIMITS } from './package'

type Property = { name: string; type: string; value: unknown }
type SceneLayer = PintaSceneCellsLayer<number[] | PintaRegionCells | PintaHexRegionCells>
type TiledSceneSource = PintaScene | PintaRegionSceneWire | PintaProjectedSceneWire
export function tiledSceneWarnings(scene: TiledSceneSource): string[] {
  const art = (scene.art ?? []).flatMap((a) =>
    a.sprite?.animations.some((v) => !v.loop)
      ? [
          `O Tiled repete as animações de ${a.id}. A opção de parar no último quadro é conservada nos metadados do Pinta, mas o Tiled não a executa.`,
        ]
      : [],
  )
  if (scene.version === 5 && scene.projection.kind === 'isometric')
    art.push(
      'Elipses projetadas aparecem como polígonos no Tiled. O contorno analítico e os atributos autorais ficam nos metadados do Pinta.',
    )
  return art
}
export class TiledSceneCompatibilityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TiledSceneCompatibilityError'
  }
}
export function cellToGid(cell: number, firstgid: number): number {
  return cell < 0
    ? 0
    : ((cellTile(cell) + firstgid) |
        (cellFlags(cell) & CELL_FLIP_H ? 0x80000000 : 0) |
        (cellFlags(cell) & CELL_FLIP_V ? 0x40000000 : 0) |
        (cellFlags(cell) & CELL_FLIP_D ? 0x20000000 : 0)) >>>
        0
}
export function hexCellToGid(cell: number, firstgid: number): number {
  const tile = pintaHexCellTile(cell)
  return tile < 0 ? 0 : ((tile + firstgid) | (cell & ~PINTA_HEX_TILE_MASK)) >>> 0
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
export async function tiledMap(
  scene: PintaScene | PintaRegionScene | PintaProjectedScene,
): Promise<Record<string, unknown>> {
  const regional = scene.version === 4 || scene.version === 5
  const encodeSet = (set: PintaRegionSceneMap | PintaProjectedSceneMap) => {
    const bounds = { ...set.origin, cols: set.cols, rows: set.rows }
    const cells = set.layers.flatMap((layer) => (layer.kind === 'tiles' ? [layer.cells] : []))
    const grids =
      'projection' in set && set.projection.kind === 'hexagonal'
        ? encodePintaHexRegionLayers(
            cells.filter((grid) => grid.kind === 'hex-regions'),
            bounds,
          )
        : encodePintaRegionLayers(
            cells.filter((grid) => grid.kind === 'regions'),
            bounds,
          )
    if (!grids || grids.length !== cells.length)
      throw new TiledSceneCompatibilityError('As regiões de um conjunto são inválidas.')
    let index = 0
    return {
      ...set,
      layers: set.layers.map((layer) =>
        layer.kind === 'tiles' ? { ...layer, cells: grids[index++] } : layer,
      ),
    }
  }
  const sets = regional
    ? (scene.sets as ReadonlyArray<PintaRegionSceneMap | PintaProjectedSceneMap> | undefined)?.map(
        encodeSet,
      )
    : scene.sets
  const projection = scene.version === 5 ? scene.projection : null
  const isometric = projection?.kind === 'isometric' ? projection : null
  function objectCoordinates(x: number, y: number) {
    if (!isometric) return { x, y }
    // These packages use infinite map headers (height 0), so Tiled's affine
    // adds no origin translation.
    const across = (x * isometric.tileHeight) / isometric.tileWidth
    return { x: y + across, y: y - across }
  }
  // Tiled draws an editable copy of each set instance. Charge projections as
  // they are made so repeated large sets cannot allocate an unbounded object list.
  const projectionSize = new JsonByteSizeCache(64)
  let remainingProjection = TILED_PACKAGE_LIMITS.fileBytes
  function appendProjection(objects: Record<string, unknown>[], value: Record<string, unknown>) {
    if (regional) {
      remainingProjection -= projectionSize.byteLength(value, remainingProjection)
      if (remainingProjection < 0)
        throw new TiledSceneCompatibilityError(
          'As cópias visíveis dos conjuntos excedem o tamanho do arquivo Tiled. Exporte menos conjuntos por mapa.',
        )
    }
    objects.push(value)
  }
  let first = 1,
    layerId = 0,
    objectId = 0
  const firstgid = new Map<string, number>(),
    ids = new Map<string, number>()
  for (const l of scene.layers)
    if (l.kind === 'objects')
      for (const o of l.objects) {
        ids.set(o.id, ++objectId)
        const set = scene.sets?.find((s) => s.id === o.setId)
        for (const layer of set?.layers ?? [])
          if (layer.kind === 'objects')
            for (const child of layer.objects) ids.set(`${o.id}/${child.id}`, ++objectId)
      }
  const properties = (
    values: Record<string, unknown> | undefined,
    prefix = '',
    localIds: readonly string[] = [],
  ) =>
    tiledProperties(values).map((p) => {
      const stable = String(p.value),
        target = localIds.includes(stable) ? [prefix, stable].join('/') : stable
      return p.type === 'object' ? { ...p, value: ids.get(target) ?? 0 } : p
    })
  const tilesets: Record<string, unknown>[] = []
  for (const [i, ts] of scene.tilesets.entries()) {
    const start = first
    firstgid.set(ts.id, start)
    const capacity = atlasCapacity(ts.count, ts.columns)
    if (
      !Number.isSafeInteger(capacity) ||
      capacity < 1 ||
      capacity > PINTA_MAP_FORMAT_LIMITS.maxTiles
    )
      throw new TiledSceneCompatibilityError(
        `A imagem de ${ts.name} ocupa mais de ${PINTA_MAP_FORMAT_LIMITS.maxTiles} espaços de peças. Reorganize a folha antes de exportar para o Tiled.`,
      )
    first += capacity
    const snapshot = await atlasSnapshot(ts, scene.tileSize)
    const tileIds = new Set([
      ...ts.solid,
      ...ts.platform,
      ...Object.keys(ts.animations ?? {}).map(Number),
      ...Object.keys(ts.tileProperties ?? {}).map(Number),
    ])
    tilesets.push({
      firstgid: start,
      name: ts.name,
      tilewidth: scene.tileSize,
      tileheight: scene.tileSize,
      ...(projection ? { objectalignment: 'bottomleft' } : {}),
      tilecount: ts.count,
      columns: ts.columns,
      margin: 0,
      spacing: 0,
      image: `images/tiles-${i}.png`,
      imagewidth: ts.columns * scene.tileSize,
      imageheight: Math.ceil(ts.count / ts.columns) * scene.tileSize,
      properties: [
        { name: 'pinta:id', type: 'string', value: ts.id },
        ...(snapshot
          ? [
              {
                name: 'pinta:atlas',
                type: 'string',
                value: JSON.stringify(snapshot),
              },
            ]
          : []),
      ],
      tiles: [...tileIds]
        .sort((a, b) => a - b)
        .map((id) => ({
          id,
          ...(ts.animations?.[id]
            ? {
                animation: ts.animations[id].map((f) => ({
                  tileid: f.tile,
                  duration: f.duration,
                })),
              }
            : {}),
          properties: [
            ...properties(ts.tileProperties?.[id]),
            ...(ts.solid.includes(id) ? [{ name: 'solid', type: 'bool', value: true }] : []),
            ...(ts.platform.includes(id) ? [{ name: 'platform', type: 'bool', value: true }] : []),
          ],
        })),
      wangsets:
        ts.terrains?.map((t) => ({
          name: t.name,
          properties: [
            { name: 'pinta:id', type: 'string', value: t.id },
            ...(Object.values(t.tiles).some((values) => values.every((value) => value === 0))
              ? [
                  {
                    name: 'pinta:emptyTiles',
                    type: 'string',
                    value: JSON.stringify(
                      Object.entries(t.tiles)
                        .filter(([, values]) => values.every((value) => value === 0))
                        .map(([tile]) => Number(tile)),
                    ),
                  },
                ]
              : []),
          ],
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
    })
  }
  const artFirst = new Map<string, Map<string | undefined, number>>()
  const allObjects = [scene.layers, ...(scene.sets ?? []).map((s) => s.layers)]
    .flat()
    .flatMap((l) => (l.kind === 'objects' ? l.objects : []))
  for (const [i, a] of (scene.art ?? []).entries()) {
    const variants = new Map<string | undefined, number>()
    artFirst.set(a.id, variants)
    const sprite = a.sprite
    const count = sprite ? (sprite.columns * a.height) / sprite.frameHeight : 1
    const animations =
      sprite?.animations.filter((v) =>
        allObjects.some((o) => o.art?.assetId === a.id && o.art.animationId === v.id),
      ) ?? []
    // A static copy and animated instances can share one atlas without making the static copy play.
    for (const animation of [undefined, ...animations]) {
      variants.set(animation?.id, first)
      tilesets.push({
        firstgid: first,
        name: `Objeto ${i + 1}`,
        tilewidth: sprite?.frameWidth ?? a.width,
        tileheight: sprite?.frameHeight ?? a.height,
        ...(projection ? { objectalignment: 'bottomleft' } : {}),
        tilecount: count,
        columns: sprite?.columns ?? 1,
        margin: 0,
        spacing: 0,
        image: `images/art-${i}.png`,
        imagewidth: a.width,
        imageheight: a.height,
        properties: [
          { name: 'pinta:art', type: 'string', value: a.id },
          ...(animation ? [{ name: 'pinta:animation', type: 'string', value: animation.id }] : []),
          ...(sprite
            ? [
                {
                  name: 'pinta:sprite',
                  type: 'string',
                  value: JSON.stringify(sprite),
                },
              ]
            : []),
        ],
        tiles: animation
          ? [
              {
                id: animation.frames[0]!.tile,
                properties: [],
                animation: animation.frames.map((f) => ({
                  tileid: f.tile,
                  duration: Math.max(1, Math.round(f.duration)),
                })),
              },
            ]
          : [],
        wangsets: [],
      })
      first += count
    }
  }
  const separateArt = (o: PintaSceneObject): boolean =>
    !!o.art && ['ellipse', 'point', 'polygon', 'polyline'].includes(o.shape ?? '')
  function artObject(o: PintaSceneObject): Record<string, unknown> {
    return object({
      ...o,
      id: '',
      shape: 'art',
      points: undefined,
      collision: undefined,
      role: undefined,
      properties: {},
    })
  }
  function object(o: PintaSceneObject): Record<string, unknown> {
    const sprite = scene.art?.find((a) => a.id === o.art?.assetId)?.sprite
    const animation = sprite?.animations.find((a) => a.id === o.art?.animationId)
    const tile =
      animation?.frames[0]?.tile ?? sprite?.animations[0]?.frames[0]?.tile ?? o.art?.tile ?? 0
    const gid =
      o.art && !separateArt(o)
        ? cellToGid(
            tile | (o.flipX ? CELL_FLIP_H : 0) | (o.flipY ? CELL_FLIP_V : 0),
            firstgid.get(o.art.assetId) ?? artFirst.get(o.art.assetId)?.get(o.art.animationId) ?? 0,
          )
        : undefined
    const objectProperties = properties(o.properties)
    const angle = ((o.rotation ?? 0) * Math.PI) / 180
    const point = o.shape === 'point' || (!o.shape && !o.width && !o.height)
    const outline = isometric && !gid && !point && projectedOutline(o, angle)
    const origin = objectCoordinates(
      o.x - (gid ? Math.sin(angle) * o.height : 0),
      o.y + (gid ? Math.cos(angle) * o.height : 0),
    )
    return {
      id: ids.get(o.id) ?? ++objectId,
      name: o.name,
      type: o.type,
      ...origin,
      width: outline ? 0 : o.width,
      height: outline ? 0 : o.height,
      rotation: outline ? 0 : (o.rotation ?? 0),
      visible: !o.setId,
      ...(gid ? { gid } : {}),
      ...(point ? { point: true } : {}),
      ...(outline
        ? { [o.shape === 'polyline' ? 'polyline' : 'polygon']: outline }
        : {
            ...(o.shape === 'ellipse' ? { ellipse: true } : {}),
            ...(o.shape === 'polygon' ? { polygon: o.points ?? [] } : {}),
            ...(o.shape === 'polyline' ? { polyline: o.points ?? [] } : {}),
          }),
      properties: [
        ...objectProperties,
        ...(o.collision ? [{ name: 'pinta:collision', type: 'bool', value: true }] : []),
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
            ...(projection
              ? {
                  geometry: {
                    x: o.x,
                    y: o.y,
                    width: o.width,
                    height: o.height,
                    rotation: o.rotation,
                    points: o.points,
                  },
                }
              : {}),
            ...(separateArt(o) ? { separateArt: true } : {}),
          }),
        },
      ],
    }
  }
  function projectedOutline(object: PintaSceneObject, angle: number) {
    const width = object.width
    const height = object.height
    const shape = object.shape
    const points =
      shape === 'polygon' || shape === 'polyline'
        ? (object.points ?? [])
        : shape === 'ellipse'
          ? Array.from({ length: 48 }, (_, index) => {
              const at = index * (Math.PI / 24)
              return { x: (width * (1 + Math.cos(at))) / 2, y: (height * (1 + Math.sin(at))) / 2 }
            })
          : [
              { x: 0, y: 0 },
              { x: width, y: 0 },
              { x: width, y: height },
              { x: 0, y: height },
            ]
    const cosine = Math.cos(angle),
      sine = Math.sin(angle)
    return points.map(({ x, y }) => objectCoordinates(x * cosine - y * sine, x * sine + y * cosine))
  }
  function expanded(o: PintaSceneObject, owner: SceneLayer): Record<string, unknown>[] {
    const set = scene.sets?.find((s) => s.id === o.setId)
    if (!set) return []
    const origin = 'origin' in set ? set.origin : { col: 0, row: 0 }
    const geometry = 'projection' in set ? createPintaProjectionGeometry(set.projection) : null
    const frame = geometry?.worldBounds({ ...origin, cols: set.cols, rows: set.rows })
    const offsetX = frame?.x ?? origin.col * scene.tileSize
    const offsetY = frame?.y ?? origin.row * scene.tileSize
    const width = frame?.width ?? set.cols * scene.tileSize
    const height = frame?.height ?? set.rows * scene.tileSize
    const sx = o.width / width,
      sy = o.height / height,
      angle = ((o.rotation ?? 0) * Math.PI) / 180
    const localIds = set.layers.flatMap((l) =>
      l.kind === 'objects' ? l.objects.map((c) => c.id) : [],
    )
    const point = (x: number, y: number) => {
      const px = (o.flipX ? width - x : x) * sx,
        py = (o.flipY ? height - y : y) * sy
      return {
        x: o.x + px * Math.cos(angle) - py * Math.sin(angle),
        y: o.y + px * Math.sin(angle) + py * Math.cos(angle),
      }
    }
    return set.layers.flatMap((l) => {
      if (l.kind === 'group') return []
      const e = sceneLayerState(set.layers, l),
        objects: Record<string, unknown>[] = []
      if (l.kind === 'tiles' && !l.collision) {
        const addTile = (cell: number, col: number, row: number) => {
          if (cell < 0) return
          const size = scene.tileSize
          const hex = !Array.isArray(l.cells) && l.cells.kind === 'hex-regions'
          const transform = hex ? unpackPintaHexCell(cell) : null
          if (hex && !transform) return
          const turn = ((transform?.rotation ?? 0) * Math.PI) / 180
          const mirrorX = transform?.flipX ? -1 : 1
          const mirrorY = transform?.flipY ? -1 : 1
          const [a, b, c, d] = transform
            ? ([
                Math.cos(turn) * mirrorX,
                Math.sin(turn) * mirrorX,
                -Math.sin(turn) * mirrorY,
                Math.cos(turn) * mirrorY,
              ] as const)
            : cellMatrix(cell)
          const center = geometry?.center(col, row)
          const cx =
            (center && geometry && frame
              ? center.x + (size - geometry.cellWidth) / 2 - frame.x
              : (col + 0.5) * size) + e.offsetX
          const cy =
            (center && geometry && frame
              ? center.y + (geometry.cellHeight - size) / 2 - frame.y
              : (row + 0.5) * size) + e.offsetY
          const p = point(cx - ((a + c) * size) / 2, cy - ((b + d) * size) / 2),
            pu = point(cx + ((a - c) * size) / 2, cy + ((b - d) * size) / 2),
            pv = point(cx + ((-a + c) * size) / 2, cy + ((-b + d) * size) / 2)
          const ux = pu.x - p.x,
            uy = pu.y - p.y,
            vx = pv.x - p.x,
            vy = pv.y - p.y,
            flip = ux * vy - uy * vx < 0
          if (
            geometry &&
            Math.abs(ux * vx + uy * vy) > 1e-8 * Math.hypot(ux, uy) * Math.hypot(vx, vy)
          )
            throw new TiledSceneCompatibilityError(
              'A escala e o giro do conjunto projetado produzem cisalhamento. Use a mesma escala nos dois eixos para exportar ao Tiled.',
            )
          appendProjection(
            objects,
            object({
              id: geometry
                ? `${o.id}/${l.id}/${col},${row}`
                : `${o.id}/${l.id}/${row * set.cols + col}`,
              name: '',
              type: '',
              x: p.x + (flip ? vx : 0),
              y: p.y + (flip ? vy : 0),
              width: Math.hypot(ux, uy),
              height: Math.hypot(vx, vy),
              rotation: (Math.atan2(uy, ux) * 180) / Math.PI,
              flipY: flip ? true : undefined,
              shape: 'art',
              art: { assetId: l.tilesetId, tile: transform?.tile ?? cellTile(cell) },
              properties: {},
            }),
          )
        }
        if (Array.isArray(l.cells))
          l.cells.forEach((cell, index) => {
            addTile(cell, index % set.cols, Math.floor(index / set.cols))
          })
        else
          (l.cells.kind === 'hex-regions'
            ? createHexRegionCellReader(l.cells)
            : createRegionCellReader(l.cells)
          ).visitOccupied(
            { ...origin, cols: set.cols, rows: set.rows },
            (cell, col, row) =>
              geometry
                ? addTile(cell, col, row)
                : addTile(cell, col - origin.col, row - origin.row),
            'row-major',
          )
      }
      if (l.kind === 'objects')
        for (const child of l.objects) {
          const transformed = transformSceneSetObject(
            o,
            {
              ...child,
              x: child.x + e.offsetX - offsetX,
              y: child.y + e.offsetY - offsetY,
            },
            width,
            height,
            localIds,
          )
          if (
            child.art &&
            transformSceneSetObject(
              o,
              { ...child, shape: 'art', points: undefined },
              width,
              height,
              localIds,
            ).shape === 'polygon'
          )
            throw new TiledSceneCompatibilityError(
              'O Tiled não representa uma imagem com cisalhamento (shear). Use a mesma escala nos dois lados do conjunto ou retire o giro do desenho interno.',
            )
          appendProjection(objects, object(transformed))
          if (separateArt(transformed)) appendProjection(objects, artObject(transformed))
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
          properties: [
            ...properties(l.properties, o.id, localIds),
            { name: 'pinta:expanded', type: 'bool', value: true },
          ],
        },
      ]
    })
  }
  function layer(l: SceneLayer): Record<string, unknown> {
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
        ...properties(l.properties),
        { name: 'pinta:id', type: 'string', value: l.id },
        ...(regional && l.kind === 'tiles'
          ? [{ name: 'pinta:tileset', type: 'string', value: l.tilesetId }]
          : []),
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
      const drawings = l.objects.filter(separateArt).map(artObject)
      if (drawings.length)
        instances.push({
          ...common,
          id: ++layerId,
          name: `${l.name}: desenhos dos contornos`,
          type: 'objectgroup',
          draworder: 'index',
          objects: drawings,
          properties: [{ name: 'pinta:expanded', type: 'bool', value: true }],
        })
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
    const start = firstgid.get(l.tilesetId) ?? 1
    return {
      ...common,
      type: 'tilelayer',
      width: scene.cols,
      height: scene.rows,
      ...(Array.isArray(l.cells)
        ? { data: l.cells.map((cell) => cellToGid(cell, start)) }
        : {
            chunks: l.cells.chunks.map((chunk) => ({
              x: chunk.col * PINTA_REGION_SIDE,
              y: chunk.row * PINTA_REGION_SIDE,
              width: PINTA_REGION_SIDE,
              height: PINTA_REGION_SIDE,
              data: Array.from(chunk.cells, (cell) =>
                !Array.isArray(l.cells) && l.cells.kind === 'hex-regions'
                  ? hexCellToGid(cell, start)
                  : cellToGid(cell, start),
              ),
            })),
          }),
    }
  }
  const layers = scene.layers.filter((l) => !l.parentId).map(layer)
  return {
    type: 'map',
    version: '1.10',
    tiledversion: '1.12.2',
    orientation: projection?.kind ?? 'orthogonal',
    ...(projection && projection.kind !== 'orthogonal' ? {} : { renderorder: 'right-down' }),
    infinite: regional,
    width: regional ? 0 : scene.cols,
    height: regional ? 0 : scene.rows,
    tilewidth: projection?.tileWidth ?? scene.tileSize,
    tileheight: projection?.tileHeight ?? scene.tileSize,
    ...(projection?.kind === 'hexagonal'
      ? {
          hexsidelength: projection.hexSideLength,
          staggeraxis: projection.staggerAxis,
          staggerindex: projection.staggerIndex,
        }
      : {}),
    tilesets,
    layers,
    nextlayerid: layerId + 1,
    nextobjectid: objectId + 1,
    properties: [
      { name: 'pinta:id', type: 'string', value: scene.id },
      { name: 'pinta:name', type: 'string', value: scene.name },
      ...(scene.version === 4 || scene.version === 5
        ? [
            {
              name: 'pinta:bounds',
              type: 'string',
              value: JSON.stringify({
                ...scene.origin,
                cols: scene.cols,
                rows: scene.rows,
              }),
            },
            {
              name: 'pinta:physics',
              type: 'string',
              value: scene.physics ?? 'precise',
            },
          ]
        : []),
      ...(projection
        ? [{ name: 'pinta:projection', type: 'string', value: JSON.stringify(projection) }]
        : []),
      ...(scene.version >= 2
        ? [{ name: 'pinta:sceneVersion', type: 'int', value: scene.version }]
        : []),
      ...(scene.resources?.length
        ? [
            {
              name: 'pinta:resources',
              type: 'string',
              value: JSON.stringify(scene.resources),
            },
          ]
        : []),
      ...(sets?.length
        ? [{ name: 'pinta:sets', type: 'string', value: JSON.stringify(sets) }]
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
  return `<tileset version="1.10" tiledversion="1.12.2"${attrs(ts, ['name', 'tilewidth', 'tileheight', 'tilecount', 'columns', 'margin', 'spacing', 'objectalignment'])}>${props(ts.properties)}<image source="${xml(ts.image)}" width="${ts.imagewidth}" height="${ts.imageheight}"/>${tiles.map((t) => `<tile id="${t.id}">${props(t.properties)}${t.animation ? `<animation>${(t.animation as { tileid: number; duration: number }[]).map((f) => `<frame tileid="${f.tileid}" duration="${f.duration}"/>`).join('')}</animation>` : ''}</tile>`).join('')}${wang.length ? `<wangsets>${wang.map((w) => `<wangset${attrs(w, ['name', 'type', 'tile'])}>${props(w.properties)}${(w.colors as Record<string, unknown>[]).map((c) => `<wangcolor${attrs(c, ['name', 'color', 'tile', 'probability'])}/>`).join('')}${(w.wangtiles as { tileid: number; wangid: number[] }[]).map((t) => `<wangtile tileid="${t.tileid}" wangid="${t.wangid.join(',')}"/>`).join('')}</wangset>`).join('')}</wangsets>` : ''}</tileset>`
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
    if (l.type === 'tilelayer') {
      const chunks = l.chunks as Array<Record<string, unknown> & { data: number[] }> | undefined
      const csv = chunks
        ? chunks
            .map(
              (chunk) =>
                `<chunk${attrs(chunk, ['x', 'y', 'width', 'height'])}>${chunk.data.join(',')}</chunk>`,
            )
            .join('')
        : (l.data as number[]).join(',')
      return `<layer${a}>${p}<data encoding="csv">${csv}</data></layer>`
    }
    return `<objectgroup${a} draworder="index">${p}${((l.objects as Record<string, unknown>[]) ?? []).map((o) => `<object${attrs(o, ['id', 'name', 'type', 'x', 'y', 'width', 'height', 'rotation', 'gid', 'visible'])}>${props(o.properties)}${o.point ? '<point/>' : ''}${o.ellipse ? '<ellipse/>' : ''}${o.polygon || o.polyline ? `<${o.polygon ? 'polygon' : 'polyline'} points="${((o.polygon || o.polyline) as { x: number; y: number }[]).map((p) => `${p.x},${p.y}`).join(' ')}"/>` : ''}</object>`).join('')}</objectgroup>`
  }
  return `<?xml version="1.0" encoding="UTF-8"?><map${attrs(map, ['version', 'tiledversion', 'orientation', 'renderorder', 'width', 'height', 'tilewidth', 'tileheight', 'infinite', 'staggeraxis', 'staggerindex', 'hexsidelength', 'nextlayerid', 'nextobjectid'])}>${props(map.properties)}${(map.tilesets as Record<string, unknown>[]).map((t, i) => (external ? `<tileset firstgid="${t.firstgid}" source="tiles-${i}.tsx"/>` : tiledTilesetXml(t).replace('<tileset ', `<tileset firstgid="${t.firstgid}" `))).join('')}${(map.layers as Record<string, unknown>[]).map(layer).join('')}</map>`
}
