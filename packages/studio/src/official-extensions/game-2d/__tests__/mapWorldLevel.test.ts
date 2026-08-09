import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  onGround?: boolean
  health?: number
}

interface TileLayout {
  x: number
  y: number
  tileSize: number
  width: number
  height: number
  mode: 'placed' | 'fitted' | 'legacy'
}

interface TileMap {
  rows: number[][]
  layout: TileLayout | null
  solid: number[]
  platform: number[]
}

interface Group {
  items: Sprite[]
}

interface World {
  width: number
  height: number
  camera: {
    x: number
    y: number
    horizontal?: 'off' | 'free' | 'right' | 'left'
    vertical?: 'off' | 'free' | 'down' | 'up'
  }
}

interface Level {
  world: World
}

interface Api {
  keys: { left: boolean; right: boolean; up: boolean; down: boolean }
  setupStage(width: number, height: number, background: string): void
  createSprite(options: Partial<Sprite>): Sprite
  createGroup(): Group
  createTileMap(options: {
    image: string
    tile: number
    solid: string
    platform?: string
    grid: string
  }): TileMap
  fitTileMapToStage(ctx: CanvasRenderingContext2D, map: TileMap): void
  placeTileMap(map: TileMap, x: number, y: number, tileSize: number): void
  drawTileMap(ctx: CanvasRenderingContext2D, map: TileMap): void
  tileAt(map: TileMap, x: number, y: number): number
  createWorld(width: number, height: number): World
  createWorldFromTileMap(map: TileMap, tileSize: number): World
  addSolidGroupToWorld(world: World, group: Group): void
  addPlatformGroupToWorld(world: World, group: Group): void
  setWorldEdges(world: World, edges: 'none' | 'floor' | 'solid'): void
  configureWorldCamera(
    world: World,
    horizontal: 'off' | 'free' | 'right' | 'left',
    vertical: 'off' | 'free' | 'down' | 'up',
    deadZoneX: number,
    deadZoneY: number,
  ): void
  collideWorld(sprite: Sprite, world: World): void
  followCameraInWorld(sprite: Sprite, world: World): void
  drawWorld(ctx: CanvasRenderingContext2D, world: World): void
  platformerWithTerrain(sprite: Sprite, speed: number, jump: number): void
  applyVelocity(sprite: Sprite): void
  applyGravity(sprite: Sprite): void
  collideSprite(sprite: Sprite, other: Sprite): void
  collidePlatform(sprite: Sprite, platform: Sprite): void
  setGravity(gravity: number): void
  createLevel(world: World, spawnX: number, spawnY: number): Level
  enterLevel(level: Level, player: Sprite): void
  onLevelEnter(getLevel: () => Level, fn: () => void, id?: string): void
  levelIsActive(level: Level): boolean
  collideCurrentLevel(sprite: Sprite): void
  followCurrentLevelCamera(sprite: Sprite): void
  drawCurrentLevel(ctx: CanvasRenderingContext2D): void
  cameraX(): number
  cameraY(): number
}

function load(): Api {
  // Cada runtime é dono do document do iframe. Um documento por teste evita
  // que arquivos executados em paralelo disputem o canvas global do happy-dom.
  const isolatedDocument = document.implementation.createHTMLDocument('Jogo 2D')
  const listeners: Record<string, Array<(event: unknown) => void>> = {}
  const win = {
    addEventListener(name: string, listener: (event: unknown) => void) {
      listeners[name] ??= []
      listeners[name].push(listener)
    },
    devicePixelRatio: 1,
    performance: { now: () => 0 },
    SZGame2D: undefined,
  } as unknown as Record<string, unknown>
  new Function('window', 'document', 'requestAnimationFrame', gameTwoDRuntime)(
    win,
    isolatedDocument,
    () => 0,
  )
  const api = win.SZGame2D as Api | undefined
  if (!api) throw new Error('runtime não montou window.SZGame2D')
  api.setupStage(800, 512, '#000000')
  return api
}

function stageContext(): CanvasRenderingContext2D {
  return {
    canvas: { width: 800, height: 512 },
    drawImage() {},
    fillRect() {},
    restore() {},
    save() {},
    translate() {},
  } as unknown as CanvasRenderingContext2D
}

function marioMap(api: Api): TileMap {
  const row = Array.from({ length: 27 }, () => '0').join(' ')
  return api.createTileMap({
    image: '',
    tile: 16,
    solid: '1',
    grid: Array.from({ length: 15 }, () => row)
      .concat(row.replaceAll('0', '1'))
      .join(';'),
  })
}

describe('Mapa tem layout definido antes do laço', () => {
  it('posicionar fixa uma origem mundial exata e desenhar não muda a geometria', () => {
    const api = load()
    const map = marioMap(api)
    const ctx = stageContext()

    api.placeTileMap(map, 0, 0, 32)
    expect(map.layout).toEqual({
      x: 0,
      y: 0,
      tileSize: 32,
      width: 864,
      height: 512,
      mode: 'placed',
    })

    api.drawTileMap(ctx, map)
    api.drawTileMap(ctx, map)
    expect(map.layout).toEqual({
      x: 0,
      y: 0,
      tileSize: 32,
      width: 864,
      height: 512,
      mode: 'placed',
    })
    expect(api.tileAt(map, 16, 16)).toBe(0)
  })

  it('encaixar é uma preparação explícita e centraliza o mapa de uma tela', () => {
    const api = load()
    const map = api.createTileMap({
      image: '',
      tile: 16,
      solid: '',
      grid: '0 0 0 0;0 0 0 0',
    })

    api.fitTileMapToStage(stageContext(), map)
    expect(map.layout).toEqual({
      x: 0,
      y: 56,
      tileSize: 200,
      width: 800,
      height: 400,
      mode: 'fitted',
    })
  })

  it('mantém tile sólido prioritário se código manual também o marcar como plataforma', () => {
    const api = load()
    const map = api.createTileMap({ image: '', tile: 32, solid: '1', grid: '1' })
    map.platform.push(1)
    const world = api.createWorldFromTileMap(map, 32)
    const player = api.createSprite({ x: -50, y: 8, w: 16, h: 16, vx: 100 })

    api.applyVelocity(player)
    api.collideWorld(player, world)

    expect(player.x).toBe(-16)
    expect(player.vx).toBe(0)
  })
})

describe('Mundo separa limites, câmera e terreno', () => {
  it('deriva 864×512 do mapa 27×16 e a câmera percorre exatamente 0…64', () => {
    const api = load()
    const map = marioMap(api)
    const world = api.createWorldFromTileMap(map, 32)
    const player = api.createSprite({ x: 824, y: 400, w: 32, h: 32 })

    expect(world.width).toBe(864)
    expect(world.height).toBe(512)
    expect(map.layout).toEqual({
      x: 0,
      y: 0,
      tileSize: 32,
      width: 864,
      height: 512,
      mode: 'placed',
    })

    api.configureWorldCamera(world, 'free', 'off', 0, 0)
    api.followCameraInWorld(player, world)
    expect(world.camera.x).toBe(64)
    expect(world.camera.y).toBe(0)
    expect(api.cameraX()).toBe(64)
  })

  it('respeita folga e direção sem fazer a câmera voltar sozinha', () => {
    const api = load()
    const world = api.createWorld(2000, 512)
    const player = api.createSprite({ x: 600, y: 200, w: 32, h: 32 })

    api.configureWorldCamera(world, 'right', 'off', 200, 0)
    api.followCameraInWorld(player, world)
    expect(world.camera.x).toBe(116)

    player.x = 0
    api.followCameraInWorld(player, world)
    expect(world.camera.x).toBe(116)

    api.configureWorldCamera(world, 'free', 'off', 200, 0)
    api.followCameraInWorld(player, world)
    expect(world.camera.x).toBe(0)
  })

  it('começa na extremidade correta quando a câmera só volta ou só sobe', () => {
    const api = load()
    const world = api.createWorld(2000, 1200)
    const player = api.createSprite({ x: 1500, y: 900, w: 32, h: 32 })

    api.configureWorldCamera(world, 'left', 'up', 100, 100)
    expect(world.camera.x).toBe(1200)
    expect(world.camera.y).toBe(688)

    player.x = 100
    player.y = 100
    api.followCameraInWorld(player, world)
    expect(world.camera.x).toBe(0)
    expect(world.camera.y).toBe(0)

    player.x = 1500
    player.y = 900
    api.followCameraInWorld(player, world)
    expect(world.camera.x).toBe(0)
    expect(world.camera.y).toBe(0)
  })

  it('um Mundo de uma tela funciona com Fase e nunca liga rolagem', () => {
    const api = load()
    const world = api.createWorld(800, 512)
    const ship = api.createSprite({ x: 760, y: 200, w: 32, h: 32, vx: 7, vy: 2 })
    const level = api.createLevel(world, 40, 220)

    api.configureWorldCamera(world, 'free', 'free', 40, 40)
    api.enterLevel(level, ship)
    api.followCurrentLevelCamera(ship)

    expect(ship.x).toBe(40)
    expect(ship.y).toBe(220)
    expect(ship.vx).toBe(0)
    expect(ship.vy).toBe(0)
    expect(api.cameraX()).toBe(0)
    expect(api.cameraY()).toBe(0)
  })

  it('mistura tilemap, figuras sólidas e plataformas no mesmo Mundo', () => {
    const api = load()
    const map = api.createTileMap({ image: '', tile: 16, solid: '1', grid: '. .;1 1' })
    const world = api.createWorldFromTileMap(map, 32)
    const solids = api.createGroup()
    const platforms = api.createGroup()
    solids.items.push(api.createSprite({ x: 80, y: 0, w: 16, h: 64 }))
    platforms.items.push(api.createSprite({ x: 16, y: 16, w: 48, h: 8 }))
    api.addSolidGroupToWorld(world, solids)
    api.addPlatformGroupToWorld(world, platforms)

    const player = api.createSprite({ x: 20, y: 0, w: 16, h: 16, vy: 24 })
    api.collideWorld(player, world)
    expect(player.y).toBe(0)
    expect(player.onGround).toBe(true)
  })
})

describe('Movimento com terreno não inventa chão na tela', () => {
  it('cai por um buraco quando o Mundo não tem borda-chão', () => {
    const api = load()
    api.setGravity(1)
    const world = api.createWorld(800, 512)
    api.setWorldEdges(world, 'none')
    const player = api.createSprite({ x: 100, y: 500, w: 24, h: 24 })

    for (let frame = 0; frame < 5; frame += 1) {
      api.applyGravity(player)
      api.platformerWithTerrain(player, 4, 11)
      api.collideWorld(player, world)
    }

    expect(player.y).toBeGreaterThan(512)
    expect(player.onGround).toBe(false)
  })

  it('segurar ↑ não faz o jogador pular novamente ao aterrissar', () => {
    const api = load()
    api.setGravity(1)
    const world = api.createWorld(800, 512)
    api.setWorldEdges(world, 'floor')
    const player = api.createSprite({ x: 100, y: 488, w: 24, h: 24 })
    api.collideWorld(player, world)
    api.keys.up = true

    let upwardStarts = 0
    let previousVy = player.vy
    for (let frame = 0; frame < 100; frame += 1) {
      api.applyGravity(player)
      api.platformerWithTerrain(player, 4, 11)
      api.collideWorld(player, world)
      if (player.vy < 0 && previousVy >= 0) upwardStarts += 1
      previousVy = player.vy
    }

    expect(upwardStarts).toBe(1)
  })

  it('uma queda rápida não atravessa um tile sólido', () => {
    const api = load()
    const map = api.createTileMap({
      image: '',
      tile: 32,
      solid: '1',
      grid: '. .;. .;1 1',
    })
    const world = api.createWorldFromTileMap(map, 32)
    const player = api.createSprite({ x: 8, y: 0, w: 16, h: 16, vy: 100 })

    api.platformerWithTerrain(player, 0, 11)
    api.collideWorld(player, world)

    expect(player.y).toBe(48)
    expect(player.vy).toBe(0)
    expect(player.onGround).toBe(true)
  })

  it('uma queda rápida não atravessa uma figura marcada como chão', () => {
    const api = load()
    const player = api.createSprite({ x: 8, y: 0, w: 16, h: 16, vy: 180 })
    const floor = api.createSprite({ x: 0, y: 100, w: 160, h: 12 })

    api.applyVelocity(player)
    api.collideSprite(player, floor)

    expect(player.y).toBe(84)
    expect(player.vy).toBe(0)
    expect(player.onGround).toBe(true)
  })

  it('uma queda rápida não atravessa uma figura-plataforma', () => {
    const api = load()
    const player = api.createSprite({ x: 8, y: 0, w: 16, h: 16, vy: 180 })
    const platform = api.createSprite({ x: 0, y: 100, w: 160, h: 8 })

    api.applyVelocity(player)
    api.collidePlatform(player, platform)

    expect(player.y).toBe(84)
    expect(player.vy).toBe(0)
    expect(player.onGround).toBe(true)
  })

  it('plataforma móvel transporta passageiro parado, independente da ordem do grupo', () => {
    function carriedX(movingSupportLast: boolean): number {
      const api = load()
      const world = api.createWorld(160, 96)
      const ground = api.createGroup()
      const moving = api.createSprite({ x: 0, y: 32, w: 64, h: 16 })
      const overlapping = api.createSprite({ x: 0, y: 32, w: 64, h: 16 })
      const rider = api.createSprite({ x: 4, y: 17, w: 16, h: 16, vy: 1 })

      ground.items.push(moving)
      api.addSolidGroupToWorld(world, ground)
      api.collideWorld(rider, world)

      ground.items = movingSupportLast ? [overlapping, moving] : [moving, overlapping]
      moving.x += 5
      api.collideWorld(rider, world)
      return rider.x
    }

    expect(carriedX(false)).toBe(9)
    expect(carriedX(true)).toBe(9)
  })
})

describe('Fases são opcionais e independentes do gênero', () => {
  it('o evento de entrada dispara uma vez por entrada, inclusive se registrado depois da inicial', () => {
    const api = load()
    const world = api.createWorld(800, 512)
    const level = api.createLevel(world, 30, 40)
    const player = api.createSprite({ x: 0, y: 0, w: 24, h: 24 })
    let entries = 0

    api.enterLevel(level, player)
    api.onLevelEnter(
      () => level,
      () => {
        entries += 1
      },
      'montar-conteudo',
    )
    expect(entries).toBe(1)
    expect(api.levelIsActive(level)).toBe(true)

    api.enterLevel(level, player)
    expect(entries).toBe(2)
  })

  it('o evento pode ser registrado antes da declaração da Fase', () => {
    const api = load()
    const player = api.createSprite({ x: 0, y: 0, w: 24, h: 24 })
    let entries = 0
    let level: Level

    api.onLevelEnter(
      () => level,
      () => {
        entries += 1
      },
      'entrada-adiada',
    )
    level = api.createLevel(api.createWorld(800, 512), 20, 30)
    api.enterLevel(level, player)

    expect(entries).toBe(1)
  })

  it('entrar reinicia movimento, apoio e câmera, mas preserva a vida', () => {
    const api = load()
    const world = api.createWorld(1600, 512)
    const level = api.createLevel(world, 48, 64)
    const player = api.createSprite({ x: 900, y: 200, w: 24, h: 24, vx: 8, vy: 9 })
    player.health = 3
    player.onGround = true
    api.configureWorldCamera(world, 'free', 'off', 0, 0)
    api.followCameraInWorld(player, world)
    expect(world.camera.x).toBeGreaterThan(0)

    api.enterLevel(level, player)

    expect(player).toMatchObject({ x: 48, y: 64, vx: 0, vy: 0, health: 3, onGround: false })
    expect(world.camera.x).toBe(0)
  })

  it('entrar descarta a posição anterior antes da primeira colisão da nova Fase', () => {
    const api = load()
    const world = api.createWorld(800, 512)
    const terrain = api.createGroup()
    terrain.items.push(api.createSprite({ x: 0, y: 50, w: 160, h: 16 }))
    api.addSolidGroupToWorld(world, terrain)
    const level = api.createLevel(world, 8, 100)
    const player = api.createSprite({ x: 8, y: 0, w: 16, h: 16, vy: 10 })

    api.applyVelocity(player)
    api.enterLevel(level, player)
    api.collideCurrentLevel(player)

    expect(player.y).toBe(100)
    expect(player.vy).toBe(0)
  })

  it('reinicia uma Fase reversa na borda direita e inferior do Mundo', () => {
    const api = load()
    const world = api.createWorld(2000, 1200)
    api.configureWorldCamera(world, 'left', 'up', 80, 80)
    const level = api.createLevel(world, 1900, 1100)
    const player = api.createSprite({ x: 0, y: 0, w: 24, h: 24 })

    api.enterLevel(level, player)

    expect(world.camera.x).toBe(1200)
    expect(world.camera.y).toBe(688)
    expect(api.cameraX()).toBe(1200)
    expect(api.cameraY()).toBe(688)
  })
})
