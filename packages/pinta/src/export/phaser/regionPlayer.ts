import { PINTA_IMAGE_WORLD_LIMITS } from '@sistemazero/core/studio/pinta-image'
import { readPngDimensions } from '@sistemazero/core/studio/pinta-png-binary'
import {
  PINTA_REGION_IMAGE_PNG_LIMITS,
  PINTA_REGION_WORLD_BUDGET,
} from '@sistemazero/core/studio/pinta-region-image-limits'
import { checkAdmittedPintaPngPixels } from '@sistemazero/core/studio/pinta-region-png-pixels'
import {
  type PintaRegionScene,
  type PintaRegionScenePlan,
  preparePintaRegionScene,
} from '@sistemazero/core/studio/pinta-region-scene'
import type { PintaSceneObject } from '@sistemazero/core/studio/pinta-scene'
import {
  sceneObjectIntersectsBox,
  sceneVisitColliders,
} from '@sistemazero/core/studio/pinta-scene-geometry'
import { createRegionSceneQueries } from '@sistemazero/core/studio/pinta-scene-query'
import { drawScene } from '../sceneDrawing'
import { TILED_PACKAGE_LIMITS } from '../tiled/package'

const WIDTH = 640
const HEIGHT = 480
const SPEED = 120
const GRAVITY = 500
const JUMP_SPEED = 250
type Query = ReturnType<typeof createRegionSceneQueries>
type Point = { x: number; y: number }
type Key = { isDown: boolean }
type Direction = 'left' | 'right' | 'up' | 'down'
type Texture = { context: CanvasRenderingContext2D; refresh(): void }

interface SceneApi {
  load: {
    image(key: string, url: string): void
    on(event: 'loaderror', handler: () => void): void
  }
  add: { image(x: number, y: number, key: string): { setOrigin(origin: number): void } }
  textures: {
    createCanvas(key: string, width: number, height: number): Texture
    get(key: string): { getSourceImage(): CanvasImageSource }
  }
  input: { keyboard: { createCursorKeys(): Record<Direction, Key> } }
}
declare const Phaser: {
  Scene: new () => SceneApi
  Game: new (config: {
    type: number
    width: number
    height: number
    backgroundColor: string
    parent: string
    scene: new () => SceneApi
  }) => unknown
  CANVAS: number
}

/** Check the wire and all map headers before restoring a single chunk. */
export function readRegionPhaserWorld(raw: unknown, rootId: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || typeof rootId !== 'string')
    throw new Error('O pacote não tem um cenário inicial válido.')
  const entries: [string, unknown][] = Object.entries(raw)
  if (entries.length > PINTA_IMAGE_WORLD_LIMITS.maps || !Object.hasOwn(raw, rootId))
    throw new Error('O pacote ultrapassa o limite de mapas ou perdeu o mapa inicial.')
  const plans = new Map<string, PintaRegionScenePlan>()
  const folders = new Set<string>()
  let { indexBytes, metadataBytes } = PINTA_REGION_WORLD_BUDGET
  const encoder = new TextEncoder()
  for (const [id, source] of entries) {
    if (
      !source ||
      typeof source !== 'object' ||
      !('tilesets' in source) ||
      !Array.isArray(source.tilesets) ||
      !('physics' in source) ||
      (source.physics !== 'legacy' && source.physics !== 'precise')
    )
      throw new Error('Um dos mapas regionais tem dados inválidos.')
    const art = 'art' in source ? source.art : []
    const folder = /^(mapas\/mapa-(\d+)\/images\/)tiles-0\.png$/.exec(
      String(source.tilesets[0]?.image ?? ''),
    )
    const prefix = folder?.[1]
    if (
      !prefix ||
      Number(folder?.[2]) >= entries.length ||
      folders.has(prefix) ||
      !Array.isArray(art) ||
      source.tilesets.some((entry, n) => entry?.image !== `${prefix}tiles-${n}.png`) ||
      art.some((entry, n) => entry?.image !== `${prefix}art-${n}.png`)
    )
      throw new Error('O cenário regional tem uma referência de imagem inválida.')
    folders.add(prefix)
    const json = JSON.stringify(source)
    metadataBytes -= encoder.encode(json).byteLength
    if (metadataBytes < 0) throw new Error('Os dados dos cenários passaram do limite.')
    const plan = preparePintaRegionScene(json, indexBytes)
    if (plan?.id !== id) throw new Error('Um dos mapas regionais tem dados inválidos.')
    indexBytes -= plan.indexBytes
    plans.set(id, plan)
  }
  const maps = new Map<string, Query>()
  for (const [id, plan] of plans) {
    const scene = plan.decode()
    if (!scene) throw new Error('As regiões do mapa são inválidas.')
    maps.set(id, createRegionSceneQueries(scene))
  }
  return { rootId, maps }
}

function findMap(maps: ReadonlyMap<string, Query>, reference: unknown): Query | undefined {
  if (typeof reference !== 'string') return undefined
  const exact = maps.get(reference)
  if (exact) return exact
  const names = [...maps.values()].filter((map) => map.context.name === reference)
  return names.length === 1 ? names[0] : undefined
}

function cameraOf(scene: PintaRegionScene, position: Point) {
  const x = scene.origin.col * scene.tileSize
  const y = scene.origin.row * scene.tileSize
  return {
    x: Math.max(x, Math.min(position.x - WIDTH / 2, x + scene.cols * scene.tileSize - WIDTH)),
    y: Math.max(y, Math.min(position.y - HEIGHT / 2, y + scene.rows * scene.tileSize - HEIGHT)),
  }
}

function usesPlatforms(query: Query): boolean {
  const scene = query.context
  const bounds = {
    x: scene.origin.col * scene.tileSize,
    y: scene.origin.row * scene.tileSize,
    width: scene.cols * scene.tileSize,
    height: scene.rows * scene.tileSize,
  }
  return sceneVisitColliders(scene, bounds, 'platform', () => true)
}

export function createRegionPhaserPlayer(world: ReturnType<typeof readRegionPhaserWorld>) {
  let query = world.maps.get(world.rootId)!
  const platforms = new Map([...world.maps].map(([id, map]) => [id, usesPlatforms(map)]))
  let position = query.spawn()
  let started = 0
  let waitForDoorExit = false
  let grounded = false
  let velocity = 0
  const radius = 6
  const readMap = (reference: string) =>
    findMap(world.maps, reference) ?? (reference === 'mapa' ? query : undefined)
  const property = (
    object: { properties?: PintaSceneObject['properties'] } | undefined,
    key: string,
  ) => {
    const value =
      object?.properties && Object.hasOwn(object.properties, key)
        ? object.properties[key]
        : undefined
    return value && typeof value === 'object' ? value.value : (value ?? null)
  }
  const boxAt = ({ x, y }: Point) => ({
    x: x - radius,
    y: y - radius,
    width: radius * 2,
    height: radius * 2,
  })
  return {
    maps: {
      mapObjects(name: string, type?: string) {
        return [
          ...(readMap(name)?.iterateObjects(
            (object) => !type || object.type === type || object.role === type,
          ) ?? []),
        ]
      },
      mapObjectById(name: string, id: string) {
        return (
          readMap(name)
            ?.iterateObjects((object) => object.id === id)
            .next().value ?? null
        )
      },
      mapResourceImage(name: string, id: string) {
        const scene = readMap(name)?.context
        return (
          [...(scene?.art ?? []), ...(scene?.tilesets ?? [])].find((entry) => entry.id === id)
            ?.image ?? null
        )
      },
      mapLayerProperty(name: string, id: string, key: string) {
        return property(
          readMap(name)?.context.layers.find((layer) => layer.id === id),
          key,
        )
      },
      mapTileProperty(name: string, id: string, tile: number, key: string) {
        const sheet = readMap(name)?.context.tilesets.find((tileset) => tileset.id === id)
        return Number.isInteger(tile) && tile >= 0 && sheet && tile < sheet.count
          ? property({ properties: sheet.tileProperties?.[tile] }, key)
          : null
      },
      mapObjectProperty: property,
    },
    get scene() {
      return query.context
    },
    get position(): Point {
      return { ...position }
    },
    get platformer() {
      return platforms.get(query.context.id) === true
    },
    advance(horizontal: number, vertical: number, now: number, delta: number) {
      const dt = Math.max(0, Math.min(50, delta)) / 1000
      const dx = horizontal * SPEED * dt
      const platformer = platforms.get(query.context.id) === true
      if (platformer) {
        if (vertical < 0 && grounded) velocity = -JUMP_SPEED
        velocity = Math.min(GRAVITY, velocity + GRAVITY * dt)
      }
      const dy = (platformer ? velocity : vertical * SPEED) * dt
      const previous = boxAt(position)
      let next: ReturnType<typeof boxAt>
      if (query.context.physics === 'legacy') {
        next = boxAt(query.moveCharacter(position, dx, dy, radius))
      } else {
        next = query.moveBox(previous, dx, dy)
      }
      if (platformer) {
        const supported = velocity >= 0 ? query.platformLanding(previous, next) : null
        grounded = !!supported || (velocity > 0 && next.y < previous.y + dy - 1e-6)
        if (supported) next = supported
        if (grounded || (velocity < 0 && next.y > previous.y + dy + 1e-6)) velocity = 0
      }
      position = { x: next.x + radius, y: next.y + radius }
      const box = boxAt(position)
      for (const door of query.iterateObjects((object) => object.role === 'door', position)) {
        if (!sceneObjectIntersectsBox(door, box)) continue
        if (waitForDoorExit) return
        const destination = findMap(
          world.maps,
          property(door, 'destino') || property(door, 'destination'),
        )
        if (!destination) continue
        query = destination
        position = query.spawn()
        started = now
        grounded = false
        velocity = 0
        waitForDoorExit = true
        return
      }
      waitForDoorExit = false
    },
    draw(
      ctx: CanvasRenderingContext2D,
      images: ReadonlyMap<string, CanvasImageSource>,
      now: number,
    ) {
      const scene = query.context
      const camera = cameraOf(scene, position)
      const viewport = { ...camera, width: WIDTH, height: HEIGHT, regionCells: scene.regionCells }
      const elapsed = Math.max(0, now - started)
      ctx.fillStyle = '#e8edf4'
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
      ctx.save()
      ctx.imageSmoothingEnabled = false
      ctx.translate(-camera.x, -camera.y)
      drawScene(ctx, scene, images, 'back', elapsed, camera, viewport)
      ctx.fillStyle = '#4ade80'
      ctx.fillRect(position.x - radius, position.y - radius, radius * 2, radius * 2)
      drawScene(ctx, scene, images, 'front', elapsed, camera, viewport)
      ctx.restore()
    },
  }
}

async function readLocalBytes(path: string, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(path, { redirect: 'error' })
  if (!response.ok || !response.body || Number(response.headers.get('content-length')) > limit)
    throw new Error('Não foi possível ler os dados do cenário.')
  const reader = response.body.getReader()
  const parts: Uint8Array[] = []
  let used = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      used += value.byteLength
      if (used > limit) throw new Error('Os dados do cenário passaram do limite.')
      parts.push(value)
    }
  } finally {
    await reader.cancel()
  }
  const bytes = new Uint8Array(used)
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.byteLength
  }
  return bytes
}

async function readLocalJson(path: string, limit: number): Promise<unknown> {
  const bytes = await readLocalBytes(path, limit)
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

/** Pin the bytes Phaser will decode, including images used only behind a door. */
async function readWorldImages(world: ReturnType<typeof readRegionPhaserWorld>) {
  const images = new Map<string, Blob>()
  let { imagePixels } = PINTA_REGION_WORLD_BUDGET
  let imageBytes: number = TILED_PACKAGE_LIMITS.unpackedBytes
  async function capture(path: string) {
    const limit = Math.min(imageBytes, PINTA_REGION_IMAGE_PNG_LIMITS.imageBytes)
    const bytes = await readLocalBytes(path, limit)
    imageBytes -= bytes.byteLength
    const size = readPngDimensions(bytes, PINTA_REGION_IMAGE_PNG_LIMITS)
    imagePixels -= size.width * size.height
    if (imagePixels < 0) throw new Error('As imagens do cenário ultrapassam o limite do pacote.')
    checkAdmittedPintaPngPixels({ png: bytes, ...size })
    images.set(path, new Blob([bytes], { type: 'image/png' }))
    return size
  }
  for (const { context: scene } of world.maps.values()) {
    for (const sheet of scene.tilesets) {
      const { width, height } = await capture(sheet.image)
      if (
        Math.min(sheet.count, sheet.columns) * scene.tileSize > width ||
        Math.ceil(sheet.count / sheet.columns) * scene.tileSize > height
      )
        throw new Error('Uma imagem é menor que a folha de peças do cenário.')
    }
    for (const art of scene.art ?? []) {
      const { width, height } = await capture(art.image)
      if (width !== art.width || height !== art.height)
        throw new Error('Uma imagem de objeto não tem o tamanho indicado no cenário.')
    }
  }
  return images
}

export async function bootRegionPhaser(): Promise<void> {
  const message = document.getElementById('pinta-status')
  const [source, root] = await Promise.all([
    readLocalJson('maps.json', PINTA_REGION_WORLD_BUDGET.metadataBytes),
    readLocalJson('start.json', 2048),
  ])
  const world = readRegionPhaserWorld(source, root)
  const images = await readWorldImages(world)
  const player = createRegionPhaserPlayer(world)
  const held = new Set<Direction>()
  for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-direction]')) {
    const direction = button.dataset.direction as Direction
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      button.setPointerCapture(event.pointerId)
      held.add(direction)
    })
    button.addEventListener('lostpointercapture', () => held.delete(direction))
  }
  window.addEventListener('blur', () => held.clear())
  class RegionalGame extends Phaser.Scene {
    private keys!: Record<Direction, Key>
    private surface!: Texture
    private assets = new Map<string, CanvasImageSource>()
    private visibleMap: string | undefined
    private loadFailed = false
    private imageUrls: string[] = []

    preload() {
      this.load.on('loaderror', () => {
        this.loadFailed = true
        if (message) message.textContent = 'Uma imagem do cenário não pôde ser aberta.'
      })
      for (const [path, image] of images) {
        const url = URL.createObjectURL(image)
        this.imageUrls.push(url)
        this.load.image(path, url)
      }
      images.clear()
    }

    create() {
      for (const url of this.imageUrls) URL.revokeObjectURL(url)
      this.imageUrls = []
      if (this.loadFailed) return
      this.surface = this.textures.createCanvas('pinta-region-view', WIDTH, HEIGHT)
      this.add.image(0, 0, 'pinta-region-view').setOrigin(0)
      this.keys = this.input.keyboard.createCursorKeys()
      Object.assign(window, { pintaGame: { maps: player.maps, player, surface: this.surface } })
    }

    update(now: number, delta: number) {
      if (this.loadFailed || !this.surface) return
      const key = (direction: Direction) =>
        Number(this.keys[direction].isDown || held.has(direction))
      player.advance(key('right') - key('left'), key('down') - key('up'), now, delta)
      if (this.visibleMap !== player.scene.id) {
        const scene = player.scene
        this.visibleMap = scene.id
        this.assets = new Map(
          [...scene.tilesets, ...(scene.art ?? [])].map((asset) => [
            asset.id,
            this.textures.get(asset.image).getSourceImage(),
          ]),
        )
        if (message)
          message.textContent = player.platformer ? `${scene.name} · ⬆ para pular` : scene.name
      }
      player.draw(this.surface.context, this.assets, now)
      this.surface.refresh()
    }
  }
  new Phaser.Game({
    type: Phaser.CANVAS,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#e8edf4',
    parent: 'jogo',
    scene: RegionalGame,
  })
}
