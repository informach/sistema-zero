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
  hp?: number
  dmg?: number
  _shell?: boolean
  _shellMoving?: boolean
}

interface TileContact {
  map: TileMap
  index: number
  row: number
  col: number
  x: number
  y: number
  side: 'head' | 'feet' | 'left' | 'right'
}

interface TileMap {
  rows: number[][]
  tileset: unknown
  layout: { x: number; y: number; tileSize: number } | null
}

interface EnemyType {
  items: Sprite[]
}

interface Api {
  createSprite(options: Partial<Sprite>): Sprite
  defineShape(name: string, draw: (ctx: CanvasRenderingContext2D) => void): void
  createVectorTileset(tileSize: number): unknown
  defineVectorTile(
    tileset: unknown,
    index: number,
    shape: string,
    role: 'decor' | 'solid' | 'platform',
  ): void
  createVectorTileMap(tileset: unknown, grid: string): TileMap
  placeTileMap(map: TileMap, x: number, y: number, tileSize: number): void
  drawTileMap(ctx: CanvasRenderingContext2D, map: TileMap): void
  collideTileMap(sprite: Sprite, map: TileMap): void
  forEachTileContact(
    sprite: Sprite,
    map: TileMap,
    side: TileContact['side'] | 'any',
    visit: (contact: TileContact) => void,
  ): void
  tileContactIs(contact: TileContact, index: number): boolean
  setTileAtContact(contact: TileContact, index: number): void
  enableClassicControls(mode: 'auto' | 'always' | 'off'): void
  actionDown(action: string): boolean
  actionPressed(action: string): boolean
  onActionPressed(action: string, fn: () => void, id?: string): void
  pauseGame(): void
  resumeGame(): void
  isPaused(): boolean
  classicPlatformer(sprite: Sprite, speed: number, jump: number): void
  createEnemyType(options: Record<string, unknown>): EnemyType
  spawnEnemy(type: EnemyType, x: number, y: number): Sprite | null
  setEnemyStompMode(type: EnemyType, mode: 'defeat' | 'damage' | 'squash' | 'shell' | 'spiky'): void
  stompEnemyType(sprite: Sprite, type: EnemyType, bounce: number): void
  updateEnemyShells(type: EnemyType, world?: unknown): void
  drawPixelText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    pixelSize: number,
    color: string,
    align?: 'left' | 'center' | 'right',
  ): void
  drawFade(ctx: CanvasRenderingContext2D, percent: number, color: string): void
}

function load(): {
  api: Api
  listeners: Record<string, Array<(event: Record<string, unknown>) => void>>
  document: Document
} {
  const isolatedDocument = document.implementation.createHTMLDocument('Jogo clássico')
  const listeners: Record<string, Array<(event: Record<string, unknown>) => void>> = {}
  const win = {
    addEventListener(name: string, listener: (event: Record<string, unknown>) => void) {
      listeners[name] ??= []
      listeners[name].push(listener)
    },
    matchMedia: () => ({ matches: true }),
    navigator: { maxTouchPoints: 5 },
    performance: { now: () => 0 },
    devicePixelRatio: 1,
    SZGame2D: undefined,
  } as unknown as Record<string, unknown>
  new Function('window', 'document', 'requestAnimationFrame', gameTwoDRuntime)(
    win,
    isolatedDocument,
    () => 0,
  )
  const api = win.SZGame2D as Api | undefined
  if (!api) throw new Error('runtime não montou window.SZGame2D')
  return { api, listeners, document: isolatedDocument }
}

function fire(
  listeners: Record<string, Array<(event: Record<string, unknown>) => void>>,
  name: string,
  event: Record<string, unknown>,
) {
  for (const listener of listeners[name] ?? []) listener(event)
}

describe('primitivas de plataforma clássica', () => {
  it('expõe ações semânticas com borda de aperto e teclado clássico', () => {
    const { api, listeners } = load()

    fire(listeners, 'keydown', { key: 'z', code: 'KeyZ', repeat: false })
    expect(api.actionDown('jump')).toBe(true)
    expect(api.actionPressed('jump')).toBe(true)

    fire(listeners, 'keyup', { key: 'z', code: 'KeyZ' })
    expect(api.actionDown('jump')).toBe(false)
    fire(listeners, 'keydown', { key: 'Enter', code: 'Enter', repeat: false })
    expect(api.actionDown('start')).toBe(true)
  })

  it('cria controles de toque acessíveis e aceita dois botões simultâneos', () => {
    const { api, document } = load()
    api.enableClassicControls('always')

    const left = document.querySelector<HTMLButtonElement>('[data-sz-g2d-action="left"]')
    const jump = document.querySelector<HTMLButtonElement>('[data-sz-g2d-action="jump"]')
    expect(left?.getAttribute('aria-label')).toBe('Mover para a esquerda')
    expect(jump?.getAttribute('aria-label')).toBe('Pular')

    left?.dispatchEvent(new Event('pointerdown'))
    jump?.dispatchEvent(new Event('pointerdown'))
    expect(api.actionDown('left')).toBe(true)
    expect(api.actionDown('jump')).toBe(true)

    left?.dispatchEvent(new Event('pointerup'))
    expect(api.actionDown('left')).toBe(false)
    expect(api.actionDown('jump')).toBe(true)
  })

  it('oferece a ação cima e ativa botões por teclado e tecnologia assistiva', () => {
    const { api, document } = load()
    api.enableClassicControls('always')

    const up = document.querySelector<HTMLButtonElement>('[data-sz-g2d-action="up"]')
    const jump = document.querySelector<HTMLButtonElement>('[data-sz-g2d-action="jump"]')
    expect(up?.getAttribute('aria-label')).toBe('Mover para cima')

    jump?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(api.actionDown('jump')).toBe(true)
    expect(api.actionPressed('jump')).toBe(true)
    jump?.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }))
    expect(api.actionDown('jump')).toBe(false)

    up?.click()
    expect(api.actionDown('up')).toBe(true)
    expect(api.actionPressed('up')).toBe(true)
  })

  it('despacha a mesma ação de pausa por teclado e toque, sem alternância implícita', () => {
    const { api, listeners, document } = load()
    let activations = 0
    api.onActionPressed(
      'pause',
      () => {
        activations += 1
        if (api.isPaused()) api.resumeGame()
        else api.pauseGame()
      },
      'alternar-pausa',
    )

    fire(listeners, 'keydown', { key: 'Escape', code: 'Escape', repeat: false })
    expect(activations).toBe(1)
    expect(api.isPaused()).toBe(true)
    fire(listeners, 'keyup', { key: 'Escape', code: 'Escape' })

    api.enableClassicControls('always')
    const pause = document.querySelector<HTMLButtonElement>('[data-sz-g2d-action="pause"]')
    pause?.dispatchEvent(new Event('pointerdown'))
    expect(activations).toBe(2)
    expect(api.isPaused()).toBe(false)
    pause?.dispatchEvent(new Event('pointerup'))

    pause?.click()
    expect(activations).toBe(3)
    expect(api.isPaused()).toBe(true)
  })

  it('acelera, freia e permite pulo de altura variável em passos determinísticos', () => {
    const { api, listeners } = load()
    const player = api.createSprite({ x: 0, y: 80, w: 14, h: 16 })
    player.onGround = true

    fire(listeners, 'keydown', { key: 'ArrowRight', code: 'ArrowRight', repeat: false })
    api.classicPlatformer(player, 2.5, 6)
    const firstVelocity = player.vx
    api.classicPlatformer(player, 2.5, 6)
    expect(firstVelocity).toBeGreaterThan(0)
    expect(player.vx).toBeGreaterThan(firstVelocity)
    expect(player.vx).toBeLessThanOrEqual(2.5)

    fire(listeners, 'keydown', { key: 'z', code: 'KeyZ', repeat: false })
    player.onGround = true
    api.classicPlatformer(player, 2.5, 6)
    const heldJump = player.vy
    fire(listeners, 'keyup', { key: 'z', code: 'KeyZ' })
    api.classicPlatformer(player, 2.5, 6)
    expect(player.vy).toBeGreaterThan(heldJump)
  })

  it('desenha tiles vetoriais pelo registro de figuras, sem imagem externa', () => {
    const { api } = load()
    const calls: string[] = []
    const ctx = {
      canvas: { width: 64, height: 64 },
      save() {},
      restore() {},
      translate(x: number, y: number) {
        calls.push(`translate:${x},${y}`)
      },
      fillRect(x: number, y: number, w: number, h: number) {
        calls.push(`rect:${x},${y},${w},${h}`)
      },
    } as unknown as CanvasRenderingContext2D
    api.defineShape('bloco', (shapeCtx) => shapeCtx.fillRect(0, 0, 16, 16))
    const tileset = api.createVectorTileset(16)
    api.defineVectorTile(tileset, 0, 'bloco', 'solid')
    const map = api.createVectorTileMap(tileset, '0 .;0 0')
    api.placeTileMap(map, 0, 0, 16)

    api.drawTileMap(ctx, map)
    expect(calls.filter((call) => call.startsWith('rect:'))).toHaveLength(3)
    expect(map.rows).toEqual([
      [0, -1],
      [0, 0],
    ])
  })

  it('expõe o tile e o lado exatos da colisão para blocos destrutíveis', () => {
    const { api } = load()
    const tileset = api.createVectorTileset(16)
    api.defineVectorTile(tileset, 4, 'tijolo', 'solid')
    const map = api.createVectorTileMap(tileset, '.;4')
    api.placeTileMap(map, 0, 0, 16)
    const player = api.createSprite({ x: 1, y: 5, w: 14, h: 14, vy: 4 })

    api.collideTileMap(player, map)
    const contacts: TileContact[] = []
    api.forEachTileContact(player, map, 'feet', (contact) => contacts.push(contact))

    expect(contacts).toHaveLength(1)
    const contact = contacts[0]
    if (!contact) throw new Error('contato esperado não foi registrado')
    expect(contact).toMatchObject({ index: 4, row: 1, col: 0, side: 'feet' })
    expect(api.tileContactIs(contact, 4)).toBe(true)
    expect(api.tileContactIs(contact, 2)).toBe(false)
    api.setTileAtContact(contact, -1)
    expect(map.rows[1]?.[0]).toBe(-1)
  })

  it('transforma inimigos em cascos e atualiza o movimento separadamente', () => {
    const { api } = load()
    const type = api.createEnemyType({ hp: 1, w: 16, h: 16 })
    const enemy = api.spawnEnemy(type, 16, 16)
    const player = api.createSprite({ x: 16, y: 5, w: 16, h: 16, vy: 5 })
    if (!enemy) throw new Error('inimigo não nasceu')
    api.setEnemyStompMode(type, 'shell')

    api.stompEnemyType(player, type, 5)
    expect(enemy._shell).toBe(true)
    expect(enemy.hp).toBeGreaterThan(0)
    const before = enemy.x
    api.updateEnemyShells(type)
    expect(enemy.x).not.toBe(before)
  })

  it('um casco móvel derrota inimigos de outros tipos registrados', () => {
    const { api } = load()
    const shells = api.createEnemyType({ hp: 1, w: 16, h: 16 })
    const targets = api.createEnemyType({ hp: 1, w: 16, h: 16 })
    const shell = api.spawnEnemy(shells, 16, 16)
    const target = api.spawnEnemy(targets, 21, 16)
    const player = api.createSprite({ x: 16, y: 5, w: 16, h: 16, vy: 5 })
    if (!shell || !target) throw new Error('inimigos não nasceram')
    api.setEnemyStompMode(shells, 'shell')

    api.stompEnemyType(player, shells, 5)
    api.updateEnemyShells(shells)

    expect(shell._shell).toBe(true)
    expect(target.hp).toBe(0)
    expect(target.dmg).toBe(0)
  })

  it('o modo de pisada com dano preserva inimigos resistentes até o último golpe', () => {
    const { api } = load()
    const type = api.createEnemyType({ hp: 2, dmg: 1, w: 16, h: 16 })
    const enemy = api.spawnEnemy(type, 16, 16)
    const player = api.createSprite({ x: 16, y: 5, w: 16, h: 16, vy: 5 })
    if (!enemy) throw new Error('inimigo não nasceu')
    api.setEnemyStompMode(type, 'damage')

    api.stompEnemyType(player, type, 5)
    expect(enemy.hp).toBe(1)
    expect(enemy.dmg).toBe(1)

    player.y = 5
    player.vy = 5
    api.stompEnemyType(player, type, 5)
    expect(enemy.hp).toBe(0)
    expect(enemy.dmg).toBe(0)
  })

  it('não reposiciona nem quica o jogador ao tentar pisar em inimigo espinhoso', () => {
    const { api } = load()
    const type = api.createEnemyType({ hp: 1, w: 16, h: 16 })
    api.spawnEnemy(type, 16, 16)
    const player = api.createSprite({ x: 16, y: 5, w: 16, h: 16, vy: 5 })
    api.setEnemyStompMode(type, 'spiky')
    const before = { y: player.y, vy: player.vy }

    api.stompEnemyType(player, type, 5)

    expect(player.y).toBe(before.y)
    expect(player.vy).toBe(before.vy)
    expect(type.items).toHaveLength(1)
  })

  it('desenha texto pixelado e fade apenas com operações do canvas', () => {
    const { api } = load()
    let pixels = 0
    const alphas: number[] = []
    const ctx = {
      canvas: { width: 256, height: 240 },
      globalAlpha: 1,
      save() {},
      restore() {},
      fillRect(this: { globalAlpha: number }) {
        pixels += 1
        alphas.push(this.globalAlpha)
      },
    } as unknown as CanvasRenderingContext2D

    api.drawPixelText(ctx, '1-UP', 8, 8, 2, '#fff')
    expect(pixels).toBeGreaterThan(10)
    api.drawFade(ctx, 50, '#000')
    expect(alphas).toContain(0.5)
  })
})
