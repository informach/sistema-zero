import { describe, expect, it, spyOn } from 'bun:test'
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

interface EnemyType extends Group {
  config: { behaviors: string[] }
}

interface World {
  _kind?: 'g2d-world'
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
  _kind?: 'g2d-level'
  world: World
}

interface Api {
  keys: { left: boolean; right: boolean; up: boolean; down: boolean }
  setupStage(width: number, height: number, background: string): void
  createSprite(options: Partial<Sprite>): Sprite
  setPosition(sprite: Sprite, x: number, y: number): void
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
  addTileMapToWorld(world: World, map: TileMap): void
  addSolidGroupToWorld(world: World, group: Group): void
  addEnemyTypeToWorld(world: World, type: EnemyType): void
  createEnemyType(options: { behavior?: string; speed?: number; w?: number; h?: number }): EnemyType
  spawnEnemy(type: EnemyType, x: number, y: number): Sprite | null
  onEnemyDefeated(type: EnemyType, fn: (s: Sprite) => void, id?: string): void
  updateEnemyType(type: EnemyType, ctx: CanvasRenderingContext2D, target: Sprite | null): void
  applyGravityToGroup(group: Group): void
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
  resetGroupWithLevel(level: Level, group: Group): void
  restartLevel(level: Level, player: Sprite): void
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

  /**
   * Um mapa "encaixado na tela" se recalcula sozinho a cada mudança de resolução
   * lógica. Como terreno de um Mundo isso desalinhava colisão, desenho e bordas
   * em silêncio: o encaixe era conferido UMA vez, na hora de cadastrar, e depois
   * o mapa escorregava sozinho (medido: 783×464 virava 378×224 com o Mundo
   * parado em 800×512). Virar terreno congela a geometria.
   */
  it('mapa encaixado vira geometria fixa ao ser cadastrado como terreno do Mundo', () => {
    const api = load()
    const map = marioMap(api)
    api.fitTileMapToStage(stageContext(), map)
    expect(map.layout).toEqual({
      x: 8,
      y: 24,
      tileSize: 29,
      width: 783,
      height: 464,
      mode: 'fitted',
    })

    const world = api.createWorld(800, 512)
    api.addTileMapToWorld(world, map)
    const congelado: TileLayout = {
      x: 8,
      y: 24,
      tileSize: 29,
      width: 783,
      height: 464,
      mode: 'placed',
    }
    expect(map.layout).toEqual(congelado)

    // o palco muda de tamanho (girar o aparelho, "ocupar a tela toda")
    api.setupStage(400, 256, '#000000')
    api.drawTileMap(stageContext(), map)
    expect(map.layout).toEqual(congelado)
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
  it('não mantém todos os Mundos criados vivos em um registro global', () => {
    expect(gameTwoDRuntime).not.toContain('_worldRegistry')
  })

  it('expõe tipos nominais para Mundo e Fase também no contrato público', () => {
    const api = load()
    const world = api.createWorld(800, 512)
    const level = api.createLevel(world, 0, 0)

    expect(world._kind).toBe('g2d-world')
    expect(level._kind).toBe('g2d-level')
  })

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

  it('recalibra a extremidade da câmera reversa no próximo uso após o palco mudar', () => {
    const api = load()
    const world = api.createWorld(1000, 800)

    api.configureWorldCamera(world, 'left', 'up', 0, 0)
    expect(world.camera.x).toBe(200)
    expect(world.camera.y).toBe(288)

    api.setupStage(600, 400, '#000000')
    api.drawWorld(stageContext(), world)

    expect(world.camera.x).toBe(400)
    expect(world.camera.y).toBe(400)
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
  it('reposicionar depois de mover não colide com o caminho antigo do sprite', () => {
    const api = load()
    const player = api.createSprite({ x: 0, y: 0, w: 10, h: 10, vx: 10 })
    const wall = api.createSprite({ x: 50, y: 0, w: 10, h: 40 })

    api.applyVelocity(player)
    api.setPosition(player, 100, 0)
    api.collideSprite(player, wall)

    expect(player.x).toBe(100)
    expect(player.vx).toBe(10)
  })

  it('atribuição manual incompatível invalida o caminho varrido antigo', () => {
    const api = load()
    const player = api.createSprite({ x: 0, y: 0, w: 10, h: 10, vx: 10 })
    const wall = api.createSprite({ x: 50, y: 0, w: 10, h: 40 })

    api.applyVelocity(player)
    player.x = 100
    api.collideSprite(player, wall)

    expect(player.x).toBe(100)
  })

  it('preserva a varredura do quadro ao resolver mais de um obstáculo', () => {
    const api = load()
    const player = api.createSprite({ x: 0, y: 0, w: 10, h: 10, vx: 100, vy: 100 })
    const wall = api.createSprite({ x: 50, y: 0, w: 10, h: 200 })
    const floor = api.createSprite({ x: 0, y: 50, w: 200, h: 10 })

    api.applyVelocity(player)
    api.collideSprite(player, wall)
    api.collideSprite(player, floor)

    expect(player.x).toBe(40)
    expect(player.y).toBe(40)
  })

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

  it('mantém na origem um sprite maior que um Mundo com todas as bordas sólidas', () => {
    const api = load()
    const world = api.createWorld(20, 20)
    api.setWorldEdges(world, 'solid')
    const sprite = api.createSprite({ x: 5, y: 5, w: 30, h: 30, vx: 4, vy: 6 })

    api.collideWorld(sprite, world)

    expect(sprite).toMatchObject({ x: 0, y: 0, vx: 0, vy: 0 })
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

  /**
   * O apoio do quadro anterior só continua valendo se ele mesmo se confirmar de
   * novo. Quem anda de uma plataforma para a VIZINHA nunca reconfirma a antiga:
   * prender o apoio nela dava carona vitalícia (35 px por quadro em cima de uma
   * figura parada, para sempre).
   */
  it('deixa de herdar o passo da base que ficou para trás', () => {
    const api = load()
    api.setGravity(0.6)
    const world = api.createWorld(800, 512)
    const ground = api.createGroup()
    const moving = api.createSprite({ x: 0, y: 200, w: 100, h: 16, vx: 5, vy: 0 })
    const still = api.createSprite({ x: 100, y: 200, w: 600, h: 16, vx: 0, vy: 0 })
    ground.items.push(moving, still)
    api.addSolidGroupToWorld(world, ground)

    const player = api.createSprite({ x: 40, y: 184, w: 16, h: 16, vx: 0, vy: 8 })
    api.applyVelocity(player)
    api.collideWorld(player, world)
    expect(player.onGround).toBe(true)

    api.keys.right = true
    const steps: number[] = []
    for (let frame = 0; frame < 4; frame++) {
      api.applyVelocity(moving)
      api.applyGravity(player)
      api.platformerWithTerrain(player, 30, 11)
      api.collideWorld(player, world)
      steps.push(player.x)
    }
    api.keys.right = false

    // 75 = último quadro em cima da móvel (30 do passo + 5 da base). Dali em
    // diante ele pisa na parada e anda exatamente os 30 que pediu.
    expect(steps).toEqual([75, 110, 140, 170])
    expect(player.onGround).toBe(true)
    expect(player.y).toBe(184)
  })

  /**
   * O inimigo que anda no chão resolvia o pouso contra a borda VISÍVEL, que rola
   * junto com a câmera: num Mundo mais alto que o palco ele ficava colado embaixo
   * da viewport em vez de pisar no terreno. O bloco "os inimigos do tipo … andam
   * no terreno" é a ponte; sem ele, o jogo de uma tela continua igual.
   */
  it('o inimigo ligado ao Mundo pisa no terreno, e sem o bloco fica na borda da tela', () => {
    function quedaDoInimigo(ligadoAoMundo: boolean): { inimigo: number; jogador: number } {
      const api = load()
      const ctx = stageContext()
      api.setGravity(0.6)
      const world = api.createWorld(800, 900)
      const ground = api.createGroup()
      ground.items.push(api.createSprite({ x: 0, y: 860, w: 800, h: 40, vx: 0, vy: 0 }))
      api.addSolidGroupToWorld(world, ground)
      api.configureWorldCamera(world, 'free', 'free', 0, 0)

      const player = api.createSprite({ x: 100, y: 700, w: 20, h: 20, vx: 0, vy: 0 })
      const type = api.createEnemyType({ behavior: 'patrulha', speed: 2, w: 20, h: 20 })
      if (ligadoAoMundo) api.addEnemyTypeToWorld(world, type)
      api.spawnEnemy(type, 100, 300)

      for (let frame = 0; frame < 200; frame++) {
        api.applyGravity(player)
        api.applyVelocity(player)
        api.collideWorld(player, world)
        api.followCameraInWorld(player, world)
        api.applyGravityToGroup(type)
        api.updateEnemyType(type, ctx, player)
      }
      const inimigo = type.items[0]
      if (!inimigo) throw new Error('o inimigo sumiu do tipo')
      return { inimigo: inimigo.y, jogador: player.y }
    }

    // Chão do Mundo em 860; sprite de 20 px pousa em 840.
    expect(quedaDoInimigo(true)).toEqual({ inimigo: 840, jogador: 840 })
    // Sem o bloco: a câmera parou em y 388 (900 − 512) e ele ficou na borda de
    // baixo da TELA, 880, ou seja 40 px DENTRO do chão.
    expect(quedaDoInimigo(false)).toEqual({ inimigo: 880, jogador: 840 })
  })

  /**
   * Borda aberta é buraco de verdade, para o inimigo também. O que a saída larga
   * do `_enemyResolveGround` evita é a consulta ao terreno crescer junto com uma
   * queda infinita — e ela não pode virar um chão invisível.
   */
  it('inimigo que cai por um buraco do Mundo é RECOLHIDO, sem chão fantasma', () => {
    const api = load()
    const ctx = stageContext()
    api.setGravity(0.6)
    const world = api.createWorld(800, 600)
    const chao = api.createGroup()
    // Só a metade da esquerda tem chão; o inimigo nasce sobre o vazio.
    chao.items.push(api.createSprite({ x: 0, y: 560, w: 300, h: 40, vx: 0, vy: 0 }))
    api.addSolidGroupToWorld(world, chao)
    const type = api.createEnemyType({ behavior: 'patrulha', speed: 0, w: 20, h: 20 })
    api.addEnemyTypeToWorld(world, type)
    const inimigo = api.spawnEnemy(type, 600, 100) as Sprite

    for (let frame = 0; frame < 400; frame++) {
      api.applyGravityToGroup(type)
      api.updateEnemyType(type, ctx, null)
    }
    expect(inimigo.y).toBeGreaterThan(world.height + 2000)
    // Nunca encostou em nada: para o inimigo o apoio só existe se o terreno o
    // confirmar, então aqui ele nem chega a ser escrito.
    expect(inimigo.onGround).toBeFalsy()

    // ⚠️ Passada a folga ele é RECOLHIDO, e não deixado caindo para sempre. Um
    // inimigo em queda eterna continua contando no "quantos tem no grupo", e é
    // comum a saída da fase ser "quando não sobrar nenhum": bastava um nascer
    // sobre um buraco para o portão nunca abrir.
    expect(type.items.length).toBe(0)
  })

  it('quem cai fora não dispara o "quando for derrotado" (ninguém o derrotou)', () => {
    const api = load()
    const ctx = stageContext()
    api.setGravity(0.6)
    const world = api.createWorld(800, 600)
    const type = api.createEnemyType({ behavior: 'patrulha', speed: 0, w: 20, h: 20 })
    api.addEnemyTypeToWorld(world, type)
    api.spawnEnemy(type, 600, 100)
    const derrotados: unknown[] = []
    api.onEnemyDefeated(type, (s: Sprite) => derrotados.push(s))
    for (let frame = 0; frame < 400; frame++) {
      api.applyGravityToGroup(type)
      api.updateEnemyType(type, ctx, null)
    }
    expect(type.items.length).toBe(0)
    // Premiar a queda daria ponto de graça e abriria portão sem luta.
    expect(derrotados).toEqual([])
  })

  it('o inimigo ligado ao Mundo vai e volta nos limites do Mundo, não nos da tela', () => {
    const api = load()
    const ctx = stageContext()
    api.setGravity(0)
    const world = api.createWorld(1600, 512)
    api.setWorldEdges(world, 'solid')
    const type = api.createEnemyType({ behavior: 'patrulha', speed: 8, w: 20, h: 20 })
    api.addEnemyTypeToWorld(world, type)
    const inimigo = api.spawnEnemy(type, 700, 100) as Sprite

    let maiorX = inimigo.x
    for (let frame = 0; frame < 400; frame++) {
      api.updateEnemyType(type, ctx, null)
      maiorX = Math.max(maiorX, inimigo.x)
    }
    // A tela tem 800 de largura e a câmera nunca saiu de 0: sem a ponte ele
    // viraria em 780. O limite dele agora é o Mundo.
    expect(maiorX).toBe(1580)
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

  it('conclui a entrada atual e então executa uma transição A → B', () => {
    const api = load()
    const world = api.createWorld(800, 512)
    const levelA = api.createLevel(world, 10, 20)
    const levelB = api.createLevel(world, 30, 40)
    const player = api.createSprite({ x: 0, y: 0, w: 24, h: 24 })
    const order: string[] = []

    api.onLevelEnter(
      () => levelA,
      () => {
        order.push('A')
        api.enterLevel(levelB, player)
      },
      'entrada-a',
    )
    api.onLevelEnter(
      () => levelB,
      () => {
        order.push('B')
      },
      'entrada-b',
    )

    api.enterLevel(levelA, player)

    expect(order).toEqual(['A', 'B'])
    expect(api.levelIsActive(levelA)).toBe(false)
    expect(api.levelIsActive(levelB)).toBe(true)
    expect(player).toMatchObject({ x: 30, y: 40 })
  })

  it('bloqueia o ciclo A → B → A sem desfazer a entrada válida em B', () => {
    const api = load()
    const world = api.createWorld(800, 512)
    const levelA = api.createLevel(world, 10, 20)
    const levelB = api.createLevel(world, 30, 40)
    const player = api.createSprite({ x: 0, y: 0, w: 24, h: 24 })
    const order: string[] = []

    api.onLevelEnter(
      () => levelA,
      () => {
        order.push('A')
        api.enterLevel(levelB, player)
      },
      'ciclo-a',
    )
    api.onLevelEnter(
      () => levelB,
      () => {
        order.push('B')
        api.enterLevel(levelA, player)
      },
      'ciclo-b',
    )

    api.enterLevel(levelA, player)

    expect(order).toEqual(['A', 'B'])
    expect(api.levelIsActive(levelB)).toBe(true)
    expect(player).toMatchObject({ x: 30, y: 40 })
  })

  it('limita também tentativas duplicadas na mesma cadeia de transições', () => {
    const api = load()
    const world = api.createWorld(800, 512)
    const levelA = api.createLevel(world, 10, 20)
    const levelB = api.createLevel(world, 30, 40)
    const player = api.createSprite({ x: 0, y: 0, w: 24, h: 24 })
    const warning = spyOn(console, 'warn').mockImplementation(() => {})

    try {
      api.onLevelEnter(
        () => levelA,
        () => {
          for (let index = 0; index < 100; index += 1) api.enterLevel(levelB, player)
        },
        'tempestade-duplicada',
      )

      api.enterLevel(levelA, player)

      expect(warning.mock.calls.some(([message]) => String(message).includes('muitas Fases'))).toBe(
        true,
      )
      expect(api.levelIsActive(levelB)).toBe(true)
    } finally {
      warning.mockRestore()
    }
  })

  /**
   * "Quando entrar na Fase → Entrar na Fase" é um engano fácil de montar e era
   * recursivo de verdade: cada entrada abre uma geração nova, então a dedução
   * por geração não segurava. Medido antes da trava: 4852 entradas aninhadas até
   * "Maximum call stack size exceeded", e o que a criança lia era só "aconteceu
   * um erro". Agora o corpo roda UMA vez e o Console diz o que tirar.
   */
  it('entrar ou reiniciar dentro do próprio evento de entrada não recursa', () => {
    for (const acao of ['entrar', 'reiniciar'] as const) {
      const api = load()
      const world = api.createWorld(400, 300)
      const level = api.createLevel(world, 10, 10)
      const player = api.createSprite({ x: 0, y: 0, w: 16, h: 16, vx: 0, vy: 0 })
      let entradas = 0

      api.onLevelEnter(
        () => level,
        () => {
          entradas += 1
          if (entradas > 50) return
          player.x = 77
          if (acao === 'entrar') api.enterLevel(level, player)
          else api.restartLevel(level, player)
        },
        `laco-${acao}`,
      )
      api.enterLevel(level, player)

      expect(entradas).toBe(1)
      expect(api.levelIsActive(level)).toBe(true)
      // A transição inválida inteira é recusada: nem o corpo recursa, nem a
      // posição que o handler acabou de escolher é desfeita pela tentativa.
      expect(player.x).toBe(77)
    }
  })

  it('“a Fase está ativa?” só responde sim para uma Fase de verdade', () => {
    const api = load()
    const world = api.createWorld(400, 300)
    const level = api.createLevel(world, 10, 10)
    const player = api.createSprite({ x: 0, y: 0, w: 16, h: 16, vx: 0, vy: 0 })

    // Antes de qualquer entrada a Fase atual é NENHUMA: perguntar por um valor
    // que não é Fase respondia SIM, porque os dois eram nulos.
    expect(api.levelIsActive(null as unknown as Level)).toBe(false)
    expect(api.levelIsActive(undefined as unknown as Level)).toBe(false)
    expect(api.levelIsActive(world as unknown as Level)).toBe(false)
    expect(api.levelIsActive(level)).toBe(false)

    api.enterLevel(level, player)
    expect(api.levelIsActive(level)).toBe(true)
    expect(api.levelIsActive(null as unknown as Level)).toBe(false)
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

  it('entrar preserva o mapa e os grupos, enquanto reiniciar restaura os dois', () => {
    const api = load()
    const map = api.createTileMap({ image: '', tile: 32, solid: '1', grid: '1 1' })
    const world = api.createWorldFromTileMap(map, 32)
    const enemies = api.createGroup()
    const level = api.createLevel(world, 4, 8)
    const player = api.createSprite({ x: 0, y: 0, w: 16, h: 16 })
    let entries = 0

    api.resetGroupWithLevel(level, enemies)
    api.onLevelEnter(
      () => level,
      () => {
        entries += 1
        enemies.items.push(api.createSprite({ x: 40, y: 0, w: 16, h: 16 }))
      },
      'conteudo-da-fase',
    )
    api.enterLevel(level, player)
    map.rows[0]![0] = -1
    enemies.items.push(api.createSprite({ x: 80, y: 0, w: 16, h: 16 }))

    api.enterLevel(level, player)
    expect(map.rows[0]![0]).toBe(-1)
    expect(enemies.items).toHaveLength(3)

    api.restartLevel(level, player)
    expect(map.rows[0]![0]).toBe(1)
    expect(enemies.items).toHaveLength(1)
    expect(entries).toBe(3)
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

describe('Layouts de tela e terreno grande permanecem responsivos', () => {
  it('reencaixa automaticamente um mapa de tela depois que o palco muda', () => {
    const api = load()
    const map = api.createTileMap({
      image: '',
      tile: 16,
      solid: '',
      grid: '0 0 0 0;0 0 0 0',
    })
    const ctx = stageContext()

    api.fitTileMapToStage(ctx, map)
    api.setupStage(600, 400, '#000000')
    api.drawTileMap(ctx, map)

    expect(map.layout).toEqual({
      x: 0,
      y: 50,
      tileSize: 150,
      width: 600,
      height: 300,
      mode: 'fitted',
    })
  })

  it('desenha somente as figuras do terreno que cruzam a câmera', () => {
    const api = load()
    const world = api.createWorld(40000, 512)
    const terrain = api.createGroup()
    for (let index = 0; index < 400; index += 1) {
      terrain.items.push(api.createSprite({ x: index * 100, y: 100, w: 32, h: 32 }))
    }
    api.addSolidGroupToWorld(world, terrain)
    let fills = 0
    const ctx = {
      ...stageContext(),
      fillRect() {
        fills += 1
      },
    } as CanvasRenderingContext2D

    api.drawWorld(ctx, world)

    expect(fills).toBeLessThan(20)
  })
})
