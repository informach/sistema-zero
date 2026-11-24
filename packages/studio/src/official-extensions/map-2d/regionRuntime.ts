import {
  type PintaHexRegionCells,
  type PintaRegionCells,
  parsePintaHexRegionLayers,
  parsePintaRegionLayers,
} from '@sistemazero/core/creations'
import type {
  PintaProjectedScene,
  PintaProjectedSceneWire,
} from '@sistemazero/core/studio/pinta-projected-scene'
import { createProjectedSceneQueries } from '@sistemazero/core/studio/pinta-projected-scene-query'
import type { PintaRegionScene } from '@sistemazero/core/studio/pinta-region-scene'
import type {
  PintaScene,
  PintaSceneCellsLayer,
  PintaSceneObject,
} from '@sistemazero/core/studio/pinta-scene'
import type { SceneBox } from '@sistemazero/core/studio/pinta-scene-geometry'
import { createRegionSceneQueries } from '@sistemazero/core/studio/pinta-scene-query'
import { drawScene } from '../../../../pinta/src/export/sceneDrawing'
import type { MapTwoDApi } from './contract'
import { createRegionLegacyCollision } from './regionLegacyCollision'
import type { RegionWorldPayload } from './regionWire'

type Api = MapTwoDApi & { reset(): void }
type LegacyCells = ReturnType<typeof createRegionLegacyCollision>
type Point = { x: number; y: number }
type Body = { body?: { reset?: (x: number, y: number) => void } }
type Scene = (PintaRegionScene & { physics: 'legacy' | 'precise' }) | PintaProjectedScene

interface Host {
  meta(asset: string, byId: boolean): { scene?: PintaScene } | undefined
  context(): CanvasRenderingContext2D | null
  camera(): Point
  width(): number
  height(): number
  screen(ctx: CanvasRenderingContext2D): void
  image(url: string): HTMLImageElement
  frame(step: () => void): void
  now(): number
  teleport(sprite: unknown, x: number, y: number): void
  warn(message: string): void
  legacyCollider(scene: Scene, cells: LegacyCells): (sprite: unknown) => void
  precise(
    sprite: unknown,
    scene: Scene,
    map: null,
    move: (scene: Scene, previous: SceneBox, dx: number, dy: number) => SceneBox,
    land: (scene: Scene, previous: SceneBox, desired: SceneBox, gravity: number) => SceneBox | null,
  ): void
}

interface WatchedArea {
  sprite: unknown
  type: string
  callback: (object: PintaSceneObject) => void
  inside: Set<string>
  checking: boolean
}
interface RunningScene {
  world: RunningWorld
  scene: Scene
  query:
    | ReturnType<typeof createRegionSceneQueries>
    | ReturnType<typeof createProjectedSceneQueries>
  spawn: Point
  art: Map<string, string>
  started: number
  collide: (sprite: unknown) => void
  areas: WatchedArea[]
}

interface RunningWorld {
  root: Scene
  byId: Map<string, Scene>
  byName: Map<string, Scene>
}

function restoreWorld(payload: RegionWorldPayload): Map<string, Scene> {
  const restoreLayers = <Cells extends PintaRegionCells | PintaHexRegionCells>(
    map:
      | RegionWorldPayload['scenes'][number]
      | NonNullable<RegionWorldPayload['scenes'][number]['sets']>[number],
    read: (grids: unknown, bounds: unknown) => Cells[] | null,
  ): PintaSceneCellsLayer<Cells>[] => {
    const grids = read(
      map.layers.flatMap((layer) => (layer.kind === 'tiles' ? [layer.cells] : [])),
      { ...map.origin, cols: map.cols, rows: map.rows },
    )
    if (!grids) throw new Error('As regiões do cenário não puderam ser restauradas.')
    let index = 0
    return map.layers.map((layer) =>
      layer.kind === 'tiles' ? { ...layer, cells: grids[index++]! } : layer,
    )
  }
  const restoreProjected = (map: NonNullable<PintaProjectedSceneWire['sets']>[number]) => ({
    ...map,
    layers:
      map.projection.kind === 'hexagonal'
        ? restoreLayers(map, parsePintaHexRegionLayers)
        : restoreLayers(map, parsePintaRegionLayers),
  })
  return new Map(
    payload.scenes.map((scene): [string, Scene] => {
      if (scene.version === 5) {
        const { sets, ...root } = scene
        return [
          scene.id,
          {
            ...root,
            ...restoreProjected(root),
            ...(sets ? { sets: sets.map(restoreProjected) } : {}),
          },
        ]
      }
      const { sets, ...root } = scene
      return [
        scene.id,
        {
          ...root,
          layers: restoreLayers(scene, parsePintaRegionLayers),
          ...(sets
            ? {
                sets: sets.map((set) => ({
                  ...set,
                  layers: restoreLayers(set, parsePintaRegionLayers),
                })),
              }
            : {}),
        },
      ]
    }),
  )
}

/** Only composed into the private bootstrap. The full immutable snapshot is installed
 * before any name becomes playable or a browser image can be allocated.
 */
export function createRegionMap2D(host: Host, legacy: Api, serialized: string) {
  const legacyDoor = legacy.useMapDoor
  const data = JSON.parse(serialized) as RegionWorldPayload | RegionWorldPayload[]
  const worlds = new Map<string, RunningWorld>()
  for (const payload of Array.isArray(data) ? data : [data]) {
    const byId = restoreWorld(payload)
    const byName = new Map<string, Scene>()
    for (const scene of byId.values()) if (!byName.has(scene.name)) byName.set(scene.name, scene)
    worlds.set(payload.rootAssetName, { root: byId.get(payload.rootId)!, byId, byName })
  }
  const directWorld = Array.isArray(data) ? undefined : worlds.get(data.rootAssetName)
  const maps = new Map<string, RunningScene>()
  const pictures = new Map<string, HTMLImageElement>()
  const warnings = new Set<string>()
  let turn = 0
  let active = ''
  /** The scene the game last asked to draw: its own bounds limit the camera, none when dense. */
  let drawn: string | undefined
  let watching = false

  function install(name: string, world: RunningWorld, scene: Scene) {
    const query =
      scene.version === 5 ? createProjectedSceneQueries(scene) : createRegionSceneQueries(scene)
    const art = new Map<string, string>()
    for (const resource of [...scene.tilesets, ...(scene.art ?? [])]) {
      art.set(resource.id, resource.image)
      if (!pictures.has(resource.image)) pictures.set(resource.image, host.image(resource.image))
    }
    const previous = maps.get(name)
    const areas = previous?.areas ?? []
    // Creating the same scene again (every frame, say) keeps who is inside an area, like the
    // dense player; another scene under this name, as through a door, starts fresh.
    if (previous?.scene !== scene) for (const area of areas) area.inside.clear()
    const collide =
      scene.physics === 'legacy'
        ? host.legacyCollider(scene, createRegionLegacyCollision(query.context))
        : (sprite: unknown) =>
            host.precise(
              sprite,
              scene,
              null,
              (_scene, body, dx, dy) => query.moveBox(body, dx, dy),
              (_scene, previous, desired, gravity) =>
                query.platformLanding(previous, desired, gravity),
            )
    const map = {
      world,
      scene,
      query,
      spawn: query.spawn(),
      started: host.now(),
      art,
      collide,
      areas,
    }
    maps.set(name, map)
    active = name
    return map
  }
  function matchesType(type: string) {
    return type
      ? (object: PintaSceneObject) => object.type === type || object.role === type
      : undefined
  }
  function center(sprite: unknown): Point | undefined {
    if (!sprite || typeof sprite !== 'object') return undefined
    const body = sprite as Partial<Point> & {
      w?: number
      h?: number
      width?: number
      height?: number
    }
    if (typeof body.x !== 'number' || typeof body.y !== 'number') return undefined
    const x = body.x + (body.w || body.width || 0) / 2,
      y = body.y + (body.h || body.height || 0) / 2
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  }
  function pickObject(
    map: RunningScene,
    candidate: (object: PintaSceneObject) => boolean,
    matches = candidate,
  ) {
    for (const object of map.query.iterateObjects(candidate))
      if (matches(object)) return structuredClone(object)
    return null
  }
  function areas(name: string, map: RunningScene) {
    for (const event of map.areas.slice()) {
      if (event.checking) continue
      event.checking = true
      try {
        const previous = event.inside
        const current = new Set<string>()
        event.inside = current
        const point = center(event.sprite)
        if (!point) continue
        for (const object of map.query.iterateObjects(matchesType(event.type), point)) {
          if (maps.get(name) !== map) return
          if (current.has(object.id) || !legacy.mapInArea(event.sprite, object)) continue
          current.add(object.id)
          if (!previous.has(object.id)) event.callback(structuredClone(object))
        }
      } finally {
        event.checking = false
      }
    }
  }
  function watch() {
    if (watching) return
    watching = true
    const generation = ++turn
    function step() {
      if (generation !== turn) return
      for (const [name, map] of maps) areas(name, map)
      host.frame(step)
    }
    step()
  }
  const api: Api = {
    ...legacy,
    reset() {
      legacy.reset()
      maps.clear()
      pictures.clear()
      warnings.clear()
      turn++
      watching = false
      active = ''
      drawn = undefined
    },
    createMapScene(name, asset) {
      const label = String(asset)
      const world = worlds.get(label) ?? directWorld
      const scene = worlds.has(label)
        ? world?.root
        : (world?.byId.get(label) ?? world?.byName.get(label))
      if (world && scene) install(String(name), world, scene)
      else {
        legacy.createMapScene(name, asset)
        if ([1, 2, 3].includes(host.meta(asset, false)?.scene?.version ?? 0)) {
          maps.delete(name)
          if (active === name) active = ''
        }
      }
    },
    drawMapScene(name, pass) {
      drawn = name
      const map = maps.get(name)
      if (!map) return legacy.drawMapScene(name, pass)
      const ctx = host.context()
      if (!ctx) return
      const camera = host.camera()
      const images = new Map<string, CanvasImageSource>()
      for (const [id, url] of map.art) {
        const img = pictures.get(url)
        if (img?.complete && img.naturalWidth) images.set(id, img)
      }
      ctx.save()
      try {
        host.screen(ctx)
        ctx.imageSmoothingEnabled = false
        ctx.translate(-camera.x, -camera.y)
        drawScene(ctx, map.query.context, images, pass, host.now() - map.started, camera, {
          ...camera,
          width: host.width(),
          height: host.height(),
          regionCells: map.query.context.regionCells,
          projectedCells:
            map.query.context.version === 5 ? map.query.context.regionCells : undefined,
        })
      } finally {
        ctx.restore()
      }
      areas(name, map)
    },
    collideMapScene(sprite, name) {
      const map = maps.get(name)
      if (!map) return legacy.collideMapScene(sprite, name)
      map.collide(sprite)
      areas(name, map)
    },
    mapObjects(name, type) {
      const map = maps.get(name)
      return map
        ? Array.from(map.query.iterateObjects(matchesType(type)), (object) =>
            structuredClone(object),
          )
        : legacy.mapObjects(name, type)
    },
    mapObjectNamed(name, label) {
      const map = maps.get(name)
      return map
        ? pickObject(map, (object) => object.name === label)
        : legacy.mapObjectNamed(name, label)
    },
    mapObjectById(name, id) {
      const map = maps.get(name)
      if (!map) return legacy.mapObjectById(name, id)
      if (typeof id !== 'string') return null
      return pickObject(
        map,
        (object) => object.id === id || id.endsWith(`/${object.id}`),
        (object) => object.id === id,
      )
    },
    mapResourceImage(name, id) {
      const map = maps.get(name)
      return map ? (map.art.get(id) ?? null) : legacy.mapResourceImage(name, id)
    },
    mapLayerProperty(name, id, key) {
      const map = maps.get(name)
      return map
        ? legacy.mapObjectProperty(
            map.scene.layers.find((layer) => layer.id === id),
            key,
          )
        : legacy.mapLayerProperty(name, id, key)
    },
    mapTileProperty(name, id, tile, key) {
      const map = maps.get(name)
      if (!map) return legacy.mapTileProperty(name, id, tile, key)
      const sheet = map.scene.tilesets.find((tileset) => tileset.id === id)
      return sheet && Number.isInteger(tile) && tile >= 0 && tile < sheet.count
        ? legacy.mapObjectProperty({ properties: sheet.tileProperties?.[tile] }, key)
        : null
    },
    mapArea(name, sprite, type, callback) {
      const map = maps.get(name)
      if (!map) return legacy.mapArea(name, sprite, type, callback)
      if (typeof callback !== 'function') return
      map.areas.push({ sprite, type, callback, inside: new Set(), checking: false })
      watch()
    },
    useMapDoor(name, sprite, object) {
      const map = maps.get(name)
      if (!map) return legacyDoor(name, sprite, object)
      if (!legacy.mapInArea(sprite, object)) return
      const o = object as PintaSceneObject
      const key = legacy.mapObjectProperty(o, 'destino') ? 'destino' : 'destination'
      const destination = legacy.mapObjectProperty(o, key)
      if (typeof destination !== 'string') return
      const reference = o.properties[key]
      const byId = typeof reference === 'object' && reference.type === 'asset'
      const next =
        map.world.byId.get(destination) ?? (byId ? undefined : map.world.byName.get(destination))
      if (!next) {
        if (!warnings.has(destination)) {
          warnings.add(destination)
          host.warn(`O destino deste cenário não faz parte do mundo carregado: ${destination}`)
        }
        return
      }
      const start = install(name, map.world, next).spawn
      host.teleport(sprite, start.x, start.y)
      const body = (sprite as Body).body
      if (typeof body?.reset === 'function') body.reset(start.x, start.y)
    },
    mapSpawn(name, axis) {
      const map = maps.get(name)
      return map ? map.spawn[axis] : legacy.mapSpawn(name, axis)
    },
    mapSize(name, axis) {
      const map = maps.get(name)
      const scene = map?.query.context
      if (scene?.version === 5) return scene.worldBounds[axis]
      return map
        ? (axis === 'width' ? map.scene.cols : map.scene.rows) * map.scene.tileSize
        : legacy.mapSize(name, axis)
    },
  }
  return Object.assign(api, {
    signedBounds() {
      // Before anything is drawn, the last regional scene created keeps its old role.
      const scene = maps.get(drawn ?? active)?.query.context
      if (!scene) return null
      if (scene.version === 5) return scene.worldBounds
      const size = scene.tileSize
      return {
        x: scene.origin.col * size,
        y: scene.origin.row * size,
        width: scene.cols * size,
        height: scene.rows * size,
      }
    },
  })
}
