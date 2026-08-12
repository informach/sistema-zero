import { describe, expect, it, spyOn } from 'bun:test'
import { parseJS } from '../../../parsers/js'
import { GAME_TWO_D_ENEMY_BEHAVIOR_OPTIONS } from '../blockCatalogShared'
import { gameTwoDRuntime } from '../runtime'
import { gameTwoDEnemiesRuntime } from '../runtime/enemies'

/**
 * Tipos de inimigo (v0.22.0): createEnemyType/spawnEnemy/updateEnemyType +
 * comportamentos (patrulha, perseguidor, voador, voador-vertical, saltador,
 * atirador), morte com callback, tiros do atirador, dano de contato com
 * i-frames e compatibilidade TIPO = GRUPO (os helpers de grupo funcionam
 * direto no objeto do tipo).
 */

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  color?: string
  facing?: number
  onGround?: boolean
  hp?: number
  hpMax?: number
  dmg?: number
  blinkFrames?: number
  animStates?: Record<string, unknown>
  _dir?: number
  _dive?: number
  _beamPhase?: number
  _homeX?: number
  _homeY?: number
}

interface EnemyType {
  items: Sprite[]
  bullets: { items: Sprite[] }
  config: Record<string, unknown> & {
    behavior: string
    behaviors: string[]
    reviveRate: number
    hp: number
    speed: number
    dmg: number
    w: number
    h: number
    jump: number
    jumpRate: number
    range: number
    rate: number
    shotSpeed: number
    animStates?: Record<string, unknown> | null
  }
  onDefeat: ((s: Sprite) => void) | null
}

interface Api {
  onStart: (fn: () => void, id?: string) => void
  restart: () => void
  createSprite: (opts: Record<string, unknown>) => Sprite
  createEnemyType: (opts: Record<string, unknown>) => EnemyType
  createSmartEnemyType: (opts: Record<string, unknown>) => EnemyType
  onEnemyHurt: (t: EnemyType, fn: (s: Sprite) => void, id?: string) => void
  overlapEnemyBeams: (getSprite: () => Sprite, t: EnemyType, fn: (dono: Sprite) => void) => void
  setEnemyStateAnimation: (
    t: EnemyType,
    state: string,
    sheet: unknown,
    from: number,
    to: number,
    fps: number,
  ) => void
  setEnemyTypeParam: (t: EnemyType, param: string, value: number) => void
  addEnemyTypeBehavior: (t: EnemyType, behavior: string) => void
  stompEnemyType: (s: Sprite, t: EnemyType, bounce: number) => void
  spawnEnemy: (t: EnemyType, x: number, y: number) => Sprite | null
  updateEnemyType: (t: EnemyType, ctx: unknown, target: Sprite | null) => void
  drawEnemyType: (ctx: unknown, t: EnemyType) => void
  onEnemyDefeated: (t: EnemyType, fn: (s: Sprite) => void, id?: string) => void
  overlapEnemyShots: (getSprite: () => Sprite, t: EnemyType, fn: (shot: Sprite) => void) => void
  enemyDamage: (s: unknown) => number
  hurtByEnemy: (s: Sprite, e: Sprite) => void
  loadSpriteSheet: (name: string, fw: number, fh: number) => unknown
  setHealth: (s: Sprite, n: number) => void
  setHitboxScale: (s: Sprite, percent: number) => void
  setEnemyStompMode: (t: EnemyType, mode: string) => void
  changeHealth: (s: Sprite, d: number) => void
  countGroup: (g: unknown) => number
  forEachInGroup: (g: unknown, fn: (s: Sprite, i: number) => void) => void
  overlapSpriteGroup: (getSprite: () => Sprite, g: unknown, fn: (s: Sprite) => void) => void
  removeFromGroup: (g: unknown, s: Sprite) => void
  clearGroup: (g: unknown) => void
  addToGroup: (g: unknown, s: Sprite) => void
  createAllEnemiesGroup: () => EnemyType
  collideGroup: (s: Sprite, g: unknown) => void
  sendToBack: (g: unknown, s: Sprite) => void
  overlapGroups: (a: unknown, b: unknown, fn: (x: Sprite, y: Sprite) => void) => void
  spawnBullet: (g: unknown, opts: Record<string, unknown>) => Sprite | null
  spawn: (g: unknown, opts: Record<string, unknown>) => Sprite | null
  createGroup: () => { items: Sprite[] }
  pruneOffscreen: (ctx: unknown, g: unknown, margin: number, onLeave?: (s: Sprite) => void) => void
  bringToFront: (g: unknown, s: Sprite) => void
  updateGroup: (g: unknown) => void
  drawGroup: (ctx: unknown, g: unknown) => void
  drawGroupByY: (ctx: unknown, g: unknown) => void
  setCamera: (x: number, y: number) => void
  setGravity: (v: number) => void
  applyGravityToGroup: (group: EnemyType) => void
  platformer: (sprite: Sprite, ctx: unknown, speed?: number, jump?: number) => void
}

function load(): Api {
  const win = {
    addEventListener() {},
    SZGame2D: undefined,
    performance: { now: () => 0 },
    devicePixelRatio: 1,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  return win.SZGame2D as Api
}

function fakeCtx(w = 400, h = 300): unknown {
  const ctx: Record<string, unknown> = { canvas: { width: w, height: h } }
  const noop = () => {}
  for (const m of [
    'save',
    'restore',
    'clearRect',
    'fillRect',
    'beginPath',
    'moveTo',
    'lineTo',
    'arc',
    'closePath',
    'fill',
    'stroke',
    'translate',
    'rotate',
    'scale',
    'fillText',
    'setTransform',
    'drawImage',
  ]) {
    ctx[m] = noop
  }
  return ctx
}

describe('createEnemyType / spawnEnemy', () => {
  it('tipo tem a forma de grupo estendido, com defaults saneados', () => {
    const api = load()
    const t = api.createEnemyType({})
    expect(Array.isArray(t.items)).toBe(true)
    expect(Array.isArray(t.bullets.items)).toBe(true)
    expect(t.config.behavior).toBe('patrulha')
    expect(t.config.hp).toBe(3)
    expect(t.config.speed).toBe(2)
    expect(t.config.dmg).toBe(1)
    expect(t.config.w).toBe(32)
    expect(t.onDefeat).toBeNull()
  })

  it('spawnEnemy aplica vida/dano/tamanho/cor do tipo e devolve o sprite', () => {
    const api = load()
    const t = api.createEnemyType({ behavior: 'patrulha', hp: 5, dmg: 2, w: 24, h: 20, speed: 3 })
    const e = api.spawnEnemy(t, 100, 50)
    expect(e).toBeTruthy()
    expect(t.items.length).toBe(1)
    expect(e?.hp).toBe(5)
    expect(e?.hpMax).toBe(5)
    expect(e?.dmg).toBe(2)
    expect(e?.w).toBe(24)
    expect(e?.h).toBe(20)
    expect(e?.x).toBe(100)
  })

  it('tipo com FIGURA (defineShape): o inimigo nasce com a skin custom (figura vence imagem)', () => {
    const api = load()
    const withShape = api.createEnemyType({ behavior: 'patrulha', shape: 'pedra', image: 'foto' })
    const enemy = api.spawnEnemy(withShape, 10, 10) as Sprite & {
      skin?: { kind: string; shape: string }
      image?: unknown
    }
    expect(enemy?.skin).toEqual({ kind: 'custom', shape: 'pedra' })
    // setShape cancela a imagem ("uma coisa por vez") — a figura vence.
    expect(enemy?.image ?? null).toBeNull()
    // Sem figura: comportamento de sempre (cor/imagem), skin custom ausente.
    const plain = api.spawnEnemy(api.createEnemyType({}), 0, 0) as Sprite & {
      skin?: { kind: string }
    }
    expect(plain?.skin?.kind === 'custom').toBe(false)
  })

  it('respeita o teto MAX_GROUP (400) sem lançar', () => {
    const api = load()
    const t = api.createEnemyType({})
    for (let i = 0; i < 405; i++) api.spawnEnemy(t, i, 0)
    expect(t.items.length).toBe(400)
    expect(api.spawnEnemy(t, 0, 0)).toBeNull()
  })

  it('animações do tipo chegam ao sprite (no spawn E registradas depois)', () => {
    const api = load()
    const t = api.createEnemyType({})
    const sheet = api.loadSpriteSheet('zumbi', 16, 16)
    api.setEnemyStateAnimation(t, 'andando', sheet, 0, 3, 8)
    const early = api.spawnEnemy(t, 0, 0)
    expect(early?.animStates).toBe(t.config.animStates as Record<string, unknown>)
    // registrar DEPOIS do spawn: o update anexa preguiçosamente
    const t2 = api.createEnemyType({})
    const late = api.spawnEnemy(t2, 0, 0)
    expect(late?.animStates).toBeUndefined()
    api.setEnemyStateAnimation(t2, 'andando', sheet, 0, 3, 8)
    api.updateEnemyType(t2, fakeCtx(), null)
    expect(late?.animStates).toBe(t2.config.animStates as Record<string, unknown>)
  })
})

describe('comportamentos', () => {
  it('patrulha com gravidade aplicada: anda, vira na borda e cai no chão', () => {
    const api = load()
    const ctx = fakeCtx(200, 100)
    // Mundo COM gravidade: a patrulha anda E cai no chão da tela.
    api.setGravity(0.6)
    const t = api.createEnemyType({ behavior: 'patrulha', speed: 4 })
    const e = api.spawnEnemy(t, 100, 84) as Sprite
    api.applyGravityToGroup(t)
    api.updateEnemyType(t, ctx, null)
    expect(e.vx).toBe(4) // começa indo pra direita
    // parede: algo (collideTileMap) zera o vx entre os quadros
    e.vx = 0
    api.applyGravityToGroup(t)
    api.updateEnemyType(t, ctx, null)
    expect(e.vx).toBe(-4) // virou
    // borda esquerda: vira de novo
    e.x = -2
    api.applyGravityToGroup(t)
    api.updateEnemyType(t, ctx, null)
    expect(e.vx).toBe(4)
    // gravidade + chão do canvas
    expect(e.onGround).toBe(true)
    expect(e.y).toBe(100 - e.h)
  })

  it('patrulha (top-down, sem gravidade): patrulha na horizontal SEM afundar', () => {
    const api = load()
    const ctx = fakeCtx(200, 100)
    // Mundo sem gravidade (top-down): o inimigo padrão NÃO cai até a borda.
    const t = api.createEnemyType({ behavior: 'patrulha', speed: 4 })
    const e = api.spawnEnemy(t, 100, 40) as Sprite
    const y0 = e.y
    for (let i = 0; i < 30; i++) api.updateEnemyType(t, ctx, null)
    expect(e.y).toBe(y0) // não afundou
    expect(e.x).not.toBe(100) // andou na horizontal (patrulha)
    expect(e.onGround).toBeUndefined() // sem chão num top-down
  })

  it('patrulha só cai quando recebe gravidade, sem herdar o modo do platformer', () => {
    const api = load()
    const ctx = fakeCtx(200, 100)
    const hero = api.createSprite({ x: 20, y: 20, w: 16, h: 16 })
    api.platformer(hero, ctx, 4, 11)
    const t = api.createEnemyType({ behavior: 'patrulha', speed: 4 })
    const e = api.spawnEnemy(t, 100, 40) as Sprite
    api.updateEnemyType(t, ctx, null)
    expect(e.y).toBe(40)
    expect(e.onGround).toBeUndefined()

    api.setGravity(0.6)
    for (let i = 0; i < 30; i++) {
      api.applyGravityToGroup(t)
      api.updateEnemyType(t, ctx, null)
    }
    expect(e.onGround).toBe(true)
    expect(e.y).toBe(100 - e.h)
  })

  it('setGravity(0) desliga a queda da patrulha mesmo após usar platformer', () => {
    const api = load()
    const ctx = fakeCtx(200, 100)
    api.platformer(api.createSprite({ x: 20, y: 20, w: 16, h: 16 }), ctx, 4, 11)
    api.setGravity(0)
    const t = api.createEnemyType({ behavior: 'patrulha', speed: 0 })
    const e = api.spawnEnemy(t, 100, 40) as Sprite

    api.applyGravityToGroup(t)
    api.updateEnemyType(t, ctx, null)

    expect(e.y).toBe(40)
    expect(e.vy).toBe(0)
    expect(e.onGround).toBeUndefined()
  })

  it('gravidade negativa ancora inimigos terrestres no teto e inverte o pulo', () => {
    const api = load()
    const ctx = fakeCtx(200, 100)
    api.setGravity(-1)
    const patrolType = api.createEnemyType({ behavior: 'patrulha', speed: 0 })
    const patrol = api.spawnEnemy(patrolType, 20, 10) as Sprite
    const jumperType = api.createEnemyType({ behavior: 'saltador', speed: 0 })
    api.setEnemyTypeParam(jumperType, 'ritmo', 3)
    api.setEnemyTypeParam(jumperType, 'pulo', 9)
    const jumper = api.spawnEnemy(jumperType, 60, 0) as Sprite

    for (let i = 0; i < 10; i++) {
      api.applyGravityToGroup(patrolType)
      api.updateEnemyType(patrolType, ctx, null)
    }
    for (let i = 0; i < 3; i++) {
      api.applyGravityToGroup(jumperType)
      api.updateEnemyType(jumperType, ctx, null)
    }

    expect(patrol.y).toBe(0)
    expect(patrol.vy).toBe(0)
    expect(patrol.onGround).toBe(true)
    expect(jumper.y).toBe(0)
    expect(jumper.vy).toBe(9)
    expect(jumper.onGround).toBe(false)
  })

  it('perseguidor: reduz a distância até o alvo gravando vx/vy', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'perseguidor', speed: 5 })
    const e = api.spawnEnemy(t, 0, 0) as Sprite
    const target = api.createSprite({ x: 300, y: 200, w: 20, h: 20 })
    const d0 = Math.hypot(300 - e.x, 200 - e.y)
    api.updateEnemyType(t, ctx, target)
    const d1 = Math.hypot(target.x + 10 - (e.x + e.w / 2), target.y + 10 - (e.y + e.h / 2))
    expect(d1).toBeLessThan(d0)
    expect(Math.hypot(e.vx, e.vy)).toBeCloseTo(5, 5)
    // sem alvo, fica parado
    api.updateEnemyType(t, ctx, null)
    expect(e.vx).toBe(0)
    expect(e.vy).toBe(0)
  })

  it('voador: vai-e-volta dentro do alcance, sem gravidade', () => {
    const api = load()
    const ctx = fakeCtx(800, 300)
    const t = api.createEnemyType({ behavior: 'voador', speed: 10 })
    api.setEnemyTypeParam(t, 'alcance', 30)
    const e = api.spawnEnemy(t, 100, 50) as Sprite
    let minX = e.x
    let maxX = e.x
    for (let i = 0; i < 30; i++) {
      api.updateEnemyType(t, ctx, null)
      minX = Math.min(minX, e.x)
      maxX = Math.max(maxX, e.x)
    }
    expect(maxX).toBeLessThanOrEqual(100 + 30 + 10)
    expect(minX).toBeGreaterThanOrEqual(100 - 30 - 10)
    expect(e.y).toBe(50) // voa: não cai
    expect(e.onGround).toBeUndefined()
  })

  it('voador-vertical: oscila no eixo y', () => {
    const api = load()
    const ctx = fakeCtx(300, 800)
    const t = api.createEnemyType({ behavior: 'voador-vertical', speed: 10 })
    api.setEnemyTypeParam(t, 'alcance', 25)
    const e = api.spawnEnemy(t, 50, 200) as Sprite
    let minY = e.y
    let maxY = e.y
    for (let i = 0; i < 30; i++) {
      api.updateEnemyType(t, ctx, null)
      minY = Math.min(minY, e.y)
      maxY = Math.max(maxY, e.y)
    }
    expect(maxY).toBeLessThanOrEqual(200 + 25 + 10)
    expect(minY).toBeGreaterThanOrEqual(200 - 25 - 10)
    expect(e.x).toBe(50)
  })

  it('saltador com gravidade aplicada pula exatamente a cada "ritmo" quadros no chão', () => {
    const api = load()
    const ctx = fakeCtx(200, 100)
    const t = api.createEnemyType({ behavior: 'saltador' })
    api.setEnemyTypeParam(t, 'ritmo', 3)
    api.setEnemyTypeParam(t, 'pulo', 9)
    const e = api.spawnEnemy(t, 50, 84) as Sprite
    api.applyGravityToGroup(t)
    api.updateEnemyType(t, ctx, null) // pousa; contador 3->2
    api.applyGravityToGroup(t)
    api.updateEnemyType(t, ctx, null) // 2->1
    expect(e.vy).toBe(0)
    api.applyGravityToGroup(t)
    api.updateEnemyType(t, ctx, null) // 1->0: PULA
    expect(e.vy).toBe(-9)
    expect(e.onGround).toBe(false)
  })

  it('atirador: vira pro alvo e atira a cada "cadencia" quadros, tiro com dano', () => {
    const api = load()
    const ctx = fakeCtx(400, 100)
    const t = api.createEnemyType({ behavior: 'atirador', dmg: 2 })
    api.setEnemyTypeParam(t, 'cadencia', 2)
    api.setEnemyTypeParam(t, 'tiro', 6)
    const e = api.spawnEnemy(t, 300, 84) as Sprite
    const target = api.createSprite({ x: 40, y: 70, w: 20, h: 20 })
    api.updateEnemyType(t, ctx, target) // contador 2->1
    expect(e.facing).toBe(-1) // alvo à esquerda
    expect(t.bullets.items.length).toBe(0)
    api.updateEnemyType(t, ctx, target) // 1->0: ATIRA
    expect(t.bullets.items.length).toBe(1)
    const shot = t.bullets.items[0] as Sprite
    expect(shot.dmg).toBe(2)
    expect(shot.vx).toBeLessThan(0) // vai na direção do alvo
    expect(Math.hypot(shot.vx, shot.vy)).toBeCloseTo(6, 5)
    // sem alvo, não atira
    const before = t.bullets.items.length
    api.updateEnemyType(t, ctx, null)
    expect(t.bullets.items.length).toBe(before)
  })

  it('tiros andam em linha RETA (sem gravidade do mundo) e somem fora da tela', () => {
    const api = load()
    const ctx = fakeCtx(200, 100)
    const t = api.createEnemyType({ behavior: 'atirador' })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    api.spawnEnemy(t, 100, 84)
    const target = api.createSprite({ x: 10, y: 70, w: 10, h: 10 })
    api.updateEnemyType(t, ctx, target)
    const shot = t.bullets.items[0] as Sprite
    const vy0 = shot.vy
    const y0 = shot.y
    api.updateEnemyType(t, ctx, target)
    expect(shot.vy).toBe(vy0) // reta: vy não muda (nada de gravidade)
    expect(shot.y).toBeCloseTo(y0 + vy0, 5)
    // empurra pra fora da tela: some
    shot.x = -100
    api.updateEnemyType(t, ctx, target)
    expect(t.bullets.items.includes(shot)).toBe(false)
  })

  it('usa os limites visíveis do mundo para chão, patrulha e tiros com câmera', () => {
    const api = load()
    const ctx = fakeCtx(320, 240)
    api.setCamera(1000, 500)
    api.setGravity(0.6) // mundo com gravidade: a patrulha cai no chão visível

    const patrol = api.createEnemyType({ behavior: 'patrulha', speed: 4 })
    const walker = api.spawnEnemy(patrol, 1050, 708) as Sprite
    api.applyGravityToGroup(patrol)
    api.updateEnemyType(patrol, ctx, null)
    expect(walker.vx).toBe(4)
    expect(walker.y).toBe(500 + 240 - walker.h)

    const shooter = api.createEnemyType({ behavior: 'atirador' })
    api.setEnemyTypeParam(shooter, 'cadencia', 1)
    api.spawnEnemy(shooter, 1050, 708)
    const target = api.createSprite({ x: 1100, y: 700, w: 20, h: 20 })
    api.updateEnemyType(shooter, ctx, target)
    expect(shooter.bullets.items).toHaveLength(1)
  })
})

describe('morte e dano', () => {
  it('vida 0 remove o inimigo e chama o "quando for derrotado" com ele', () => {
    const api = load()
    const ctx = fakeCtx()
    const t = api.createEnemyType({ behavior: 'patrulha', hp: 1 })
    const e = api.spawnEnemy(t, 50, 50) as Sprite
    const defeated: Sprite[] = []
    api.onEnemyDefeated(t, (s) => defeated.push(s))
    api.changeHealth(e, -1)
    api.updateEnemyType(t, ctx, null)
    expect(t.items.length).toBe(0)
    expect(defeated).toEqual([e])
  })

  it('compõe callbacks de derrota e desativa somente o callback defeituoso', () => {
    const api = load()
    const ctx = fakeCtx()
    const t = api.createEnemyType({ hp: 1 })
    const original = console.error
    const messages: unknown[][] = []
    let broken = 0
    const healthy: Sprite[] = []
    console.error = (...args: unknown[]) => messages.push(args)
    try {
      api.onEnemyDefeated(
        t,
        () => {
          broken += 1
          throw new Error('boom')
        },
        'derrota-com-erro',
      )
      api.onEnemyDefeated(t, (enemy) => healthy.push(enemy), 'derrota-saudavel')

      const first = api.spawnEnemy(t, 0, 0) as Sprite
      api.changeHealth(first, -1)
      expect(() => api.updateEnemyType(t, ctx, null)).not.toThrow()

      const second = api.spawnEnemy(t, 0, 0) as Sprite
      api.changeHealth(second, -1)
      expect(() => api.updateEnemyType(t, ctx, null)).not.toThrow()
    } finally {
      console.error = original
    }

    expect(broken).toBe(1)
    expect(healthy).toHaveLength(2)
    expect(messages).toHaveLength(1)
    expect(t.items).toHaveLength(0)
  })

  it('interrompe os callbacks de derrota quando um deles reinicia a partida', () => {
    const api = load()
    const ctx = fakeCtx()
    let starts = 0
    let currentType = api.createEnemyType({ hp: 1 })
    let shouldRestart = true
    const secondDefeatRuns: number[] = []

    api.onStart(() => {
      const run = ++starts
      const type = api.createEnemyType({ hp: 1 })
      currentType = type
      api.onEnemyDefeated(
        type,
        () => {
          if (!shouldRestart) return
          shouldRestart = false
          api.restart()
        },
        'primeira-derrota',
      )
      api.onEnemyDefeated(type, () => secondDefeatRuns.push(run), 'segunda-derrota')
      api.spawnEnemy(type, 0, 0)
    }, 'inicio')

    const defeatedEnemy = currentType.items[0]
    if (!defeatedEnemy) throw new Error('O inimigo do cenário de regressão não foi criado.')
    defeatedEnemy.hp = 0
    api.updateEnemyType(currentType, ctx, null)

    expect(starts).toBe(2)
    expect(secondDefeatRuns).toEqual([])
  })

  it('hurtByEnemy: tira o dano do inimigo, pisca e dá i-frames', () => {
    const api = load()
    const t = api.createEnemyType({ dmg: 2 })
    const e = api.spawnEnemy(t, 0, 0) as Sprite
    const hero = api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
    api.setHealth(hero, 5)
    api.hurtByEnemy(hero, e)
    expect(hero.hp).toBe(3)
    expect(hero.blinkFrames ?? 0).toBeGreaterThan(0)
    // piscando = invencível: o 2º contato NÃO tira vida
    api.hurtByEnemy(hero, e)
    expect(hero.hp).toBe(3)
  })

  it('enemyDamage: dano do inimigo/tiro, default 1', () => {
    const api = load()
    expect(api.enemyDamage(null)).toBe(1)
    expect(api.enemyDamage({ dmg: 4 })).toBe(4)
  })

  it('overlapEnemyShots remove o tiro ao acertar e roda o corpo com ele', () => {
    const api = load()
    const ctx = fakeCtx(200, 100)
    const t = api.createEnemyType({ behavior: 'atirador' })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    api.spawnEnemy(t, 100, 84)
    const hero = api.createSprite({ x: 90, y: 60, w: 40, h: 40 })
    api.updateEnemyType(t, ctx, hero)
    expect(t.bullets.items.length).toBe(1)
    const hits: Sprite[] = []
    api.overlapEnemyShots(
      () => hero,
      t,
      (shot) => hits.push(shot),
    )
    expect(hits.length).toBe(1)
    expect(t.bullets.items.length).toBe(0)
  })
})

describe('compatibilidade TIPO = GRUPO', () => {
  it('countGroup/forEachInGroup/overlapSpriteGroup/removeFromGroup funcionam no tipo', () => {
    const api = load()
    const t = api.createEnemyType({})
    const a = api.spawnEnemy(t, 0, 0) as Sprite
    const b = api.spawnEnemy(t, 100, 0) as Sprite
    expect(api.countGroup(t)).toBe(2)
    const seen: Sprite[] = []
    api.forEachInGroup(t, (s) => seen.push(s))
    expect(seen.length).toBe(2)
    const hero = api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
    const touched: Sprite[] = []
    api.overlapSpriteGroup(
      () => hero,
      t,
      (s) => touched.push(s),
    )
    expect(touched).toEqual([a])
    api.removeFromGroup(t, a)
    expect(api.countGroup(t)).toBe(1)
    expect(t.items[0]).toBe(b)
  })

  it('drawEnemyType desenha inimigos e tiros sem estourar', () => {
    const api = load()
    const ctx = fakeCtx()
    const t = api.createEnemyType({ behavior: 'atirador' })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    api.spawnEnemy(t, 50, 50)
    api.updateEnemyType(t, ctx, api.createSprite({ x: 0, y: 0, w: 10, h: 10 }))
    expect(() => api.drawEnemyType(ctx, t)).not.toThrow()
  })
})

describe('setEnemyTypeParam', () => {
  it('ajusta os seis parâmetros e ignora valor/param inválido', () => {
    const api = load()
    const t = api.createEnemyType({})
    api.setEnemyTypeParam(t, 'pulo', 15)
    api.setEnemyTypeParam(t, 'ritmo', 30)
    api.setEnemyTypeParam(t, 'alcance', 120)
    api.setEnemyTypeParam(t, 'cadencia', 45)
    api.setEnemyTypeParam(t, 'tiro', 7)
    api.setEnemyTypeParam(t, 'voltar', 60)
    expect(t.config.jump).toBe(15)
    expect(t.config.jumpRate).toBe(30)
    expect(t.config.range).toBe(120)
    expect(t.config.rate).toBe(45)
    expect(t.config.shotSpeed).toBe(7)
    expect(t.config.reviveRate).toBe(60)
    api.setEnemyTypeParam(t, 'foguete', 99)
    api.setEnemyTypeParam(t, 'pulo', Number.NaN as unknown as number)
    expect(t.config.jump).toBe(15)
  })
})

describe('comportamentos novos (sozinhos)', () => {
  it('parado fica no lugar e, com gravidade, pousa no chão da tela', () => {
    const api = load()
    const ctx = fakeCtx(200, 100)
    const t = api.createEnemyType({ behavior: 'parado', speed: 4, h: 20 })
    const e = api.spawnEnemy(t, 60, 10) as Sprite
    api.updateEnemyType(t, ctx, null)
    expect(e.x).toBe(60)
    expect(e.y).toBe(10)
    expect(e.vx).toBe(0)
    // Com gravidade ele CAI e pousa na base visível (100 - altura 20).
    api.setGravity(0.6)
    for (let i = 0; i < 60; i += 1) {
      api.applyGravityToGroup(t)
      api.updateEnemyType(t, ctx, null)
    }
    expect(e.x).toBe(60)
    expect(e.y).toBe(80)
    expect(e.onGround).toBe(true)
  })

  it('fugitivo só corre quando o alvo está no alcance, e para na borda', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'medroso', speed: 3 })
    api.setEnemyTypeParam(t, 'alcance', 50)
    const e = api.spawnEnemy(t, 200, 100) as Sprite
    const longe = api.createSprite({ x: 380, y: 100, w: 10, h: 10 })
    api.updateEnemyType(t, ctx, longe)
    expect(e.vx).toBe(0)
    expect(e.x).toBe(200)
    // Alvo à DIREITA e perto: foge para a esquerda.
    const perto = api.createSprite({ x: 230, y: 100, w: 10, h: 10 })
    api.updateEnemyType(t, ctx, perto)
    expect(e.vx).toBe(-3)
    expect(e.x).toBe(197)
    // Encostado na borda esquerda ele para de sair da tela.
    e.x = 1
    api.updateEnemyType(t, ctx, api.createSprite({ x: 20, y: 100, w: 10, h: 10 }))
    expect(e.x).toBe(0)
  })

  it('investida corre para cima do alvo a 3× a velocidade quando ele entra no alcance', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'arrancada', speed: 2 })
    api.setEnemyTypeParam(t, 'alcance', 60)
    const e = api.spawnEnemy(t, 200, 100) as Sprite
    api.updateEnemyType(t, ctx, api.createSprite({ x: 390, y: 100, w: 10, h: 10 }))
    expect(e.vx).toBe(0)
    // Alvo à ESQUERDA e dentro do alcance: parte para cima dele.
    api.updateEnemyType(t, ctx, api.createSprite({ x: 170, y: 100, w: 10, h: 10 }))
    expect(e.vx).toBe(-6)
    expect(e.x).toBe(194)
  })

  it('rondador voa em círculo a partir da casa, sem saltar no primeiro quadro', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'rondador', speed: 5, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'alcance', 50)
    const e = api.spawnEnemy(t, 100, 100) as Sprite
    // Δângulo = velocidade / raio = 5 / 50 = 0,1 por quadro.
    api.updateEnemyType(t, ctx, null)
    expect(e.x).toBeCloseTo(100 + Math.sin(0.1) * 50, 6)
    expect(e.y).toBeCloseTo(100 + (Math.cos(0.1) - 1) * 50, 6)
    api.updateEnemyType(t, ctx, null)
    expect(e.x).toBeCloseTo(100 + Math.sin(0.2) * 50, 6)
    // Voa: nunca resolve chão, mesmo com gravidade no mundo.
    expect(e.onGround).toBeUndefined()
  })

  it('mergulhador ronda, mergulha no alvo que passa por baixo e volta para casa', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'mergulhador', speed: 4, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'alcance', 60)
    const e = api.spawnEnemy(t, 200, 40) as Sprite
    // Sem ninguém por baixo, é só um voador: anda na horizontal.
    api.updateEnemyType(t, ctx, null)
    expect(e.y).toBe(40)
    expect(e.vx).toBe(4)
    // Alvo LOGO ABAIXO e dentro do alcance: dispara o mergulho.
    const alvo = api.createSprite({ x: 204, y: 250, w: 10, h: 10 })
    api.updateEnemyType(t, ctx, alvo)
    expect(e._dive).toBe(1)
    api.updateEnemyType(t, ctx, alvo)
    expect(e.vy).toBeGreaterThan(0)
    // Desce até bater embaixo e então SOBE de volta.
    for (let i = 0; i < 200 && e._dive === 1; i += 1) api.updateEnemyType(t, ctx, alvo)
    expect(e._dive).toBe(2)
    api.updateEnemyType(t, ctx, alvo)
    expect(e.vy).toBe(-4) // subindo à velocidade do tipo
    for (let i = 0; i < 200 && e._dive === 2; i += 1) api.updateEnemyType(t, ctx, alvo)
    expect(e.y).toBe(40)
    expect(e._dive).toBe(0)
  })

  it('teleporte reaparece na cadência, alternando o lado do alvo (sem sorteio)', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'teleporte', w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'cadencia', 3)
    api.setEnemyTypeParam(t, 'alcance', 50)
    const e = api.spawnEnemy(t, 10, 10) as Sprite
    const alvo = api.createSprite({ x: 195, y: 145, w: 10, h: 10 })
    api.updateEnemyType(t, ctx, alvo)
    api.updateEnemyType(t, ctx, alvo)
    expect(e.x).toBe(10) // ainda esperando
    api.updateEnemyType(t, ctx, alvo)
    expect(e.x).toBe(200 - 50 - 5) // 1º salto: à ESQUERDA do alvo
    expect(e.y).toBe(150 - 5)
    for (let i = 0; i < 3; i += 1) api.updateEnemyType(t, ctx, alvo)
    expect(e.x).toBe(200 + 50 - 5) // 2º salto: alternou de lado
    // Sem alvo ele fica pairando onde está.
    const parado = e.x
    for (let i = 0; i < 5; i += 1) api.updateEnemyType(t, ctx, null)
    expect(e.x).toBe(parado)
  })

  it('zigue-zague quica nos dois eixos: bordas no X, alcance de casa no Y', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'zigue-zague', speed: 3, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'alcance', 6)
    const e = api.spawnEnemy(t, 200, 100) as Sprite
    api.updateEnemyType(t, ctx, null)
    expect(e.vx).toBe(3)
    expect(e.vy).toBe(3)
    api.updateEnemyType(t, ctx, null)
    api.updateEnemyType(t, ctx, null)
    expect(e.vy).toBe(-3) // passou de 6px abaixo da casa e virou
    e.x = 395
    api.updateEnemyType(t, ctx, null)
    expect(e.vx).toBe(-3) // encostou na borda direita e virou
  })

  it('atirador em leque solta 3 tiros de uma vez, abertos em volta do alvo', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'atirador-leque', w: 10, h: 10, dmg: 2 })
    api.setEnemyTypeParam(t, 'cadencia', 2)
    api.setEnemyTypeParam(t, 'tiro', 6)
    api.spawnEnemy(t, 100, 100)
    const alvo = api.createSprite({ x: 300, y: 105, w: 10, h: 10 })
    api.updateEnemyType(t, ctx, alvo)
    expect(t.bullets.items.length).toBe(0)
    api.updateEnemyType(t, ctx, alvo)
    expect(t.bullets.items.length).toBe(3)
    const base = Math.atan2(110 - 105, 305 - 105)
    const angulos = t.bullets.items.map((b) => Math.atan2(b.vy, b.vx)).sort((a, b) => a - b)
    expect(angulos[0]).toBeCloseTo(base - 0.35, 6)
    expect(angulos[1]).toBeCloseTo(base, 6)
    expect(angulos[2]).toBeCloseTo(base + 0.35, 6)
    expect(t.bullets.items[0]?.dmg).toBe(2)
    // Sem alvo não atira.
    api.updateEnemyType(t, ctx, null)
    api.updateEnemyType(t, ctx, null)
    expect(t.bullets.items.length).toBe(3)
  })

  it('bombardeiro solta tiro reto para baixo SEM precisar de alvo', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'bombardeiro', w: 10, h: 10, dmg: 3 })
    api.setEnemyTypeParam(t, 'cadencia', 2)
    api.setEnemyTypeParam(t, 'tiro', 5)
    api.spawnEnemy(t, 100, 50)
    api.updateEnemyType(t, ctx, null)
    expect(t.bullets.items.length).toBe(0)
    api.updateEnemyType(t, ctx, null)
    expect(t.bullets.items.length).toBe(1)
    const bomba = t.bullets.items[0] as Sprite
    expect(bomba.vx).toBe(0)
    expect(bomba.vy).toBe(5)
    expect(bomba.dmg).toBe(3)
  })

  it('espinho nunca é derrotado: a vida volta antes da poda', () => {
    const api = load()
    const ctx = fakeCtx()
    const t = api.createEnemyType({ behavior: 'espinho', hp: 4 })
    const e = api.spawnEnemy(t, 50, 50) as Sprite
    api.changeHealth(e, -10)
    expect(e.hp).toBe(0)
    api.updateEnemyType(t, ctx, null)
    expect(t.items.length).toBe(1)
    expect(e.hp).toBe(4)
  })

  it('ressuscitador morre de verdade e volta na casa depois do prazo', () => {
    const api = load()
    const ctx = fakeCtx()
    const t = api.createEnemyType({ behavior: 'renascer', hp: 1 })
    api.setEnemyTypeParam(t, 'voltar', 3)
    const derrotados: Sprite[] = []
    api.onEnemyDefeated(t, (s) => derrotados.push(s), 'ev')
    const e = api.spawnEnemy(t, 70, 40) as Sprite
    api.changeHealth(e, -1)
    api.updateEnemyType(t, ctx, null)
    // A derrota é REAL: sai da lista e o "quando for derrotado" dispara.
    expect(t.items.length).toBe(0)
    expect(derrotados.length).toBe(1)
    // O prazo conta a partir do quadro SEGUINTE ao da morte: 3 quadros, 3 esperas.
    api.updateEnemyType(t, ctx, null)
    api.updateEnemyType(t, ctx, null)
    expect(t.items.length).toBe(0)
    api.updateEnemyType(t, ctx, null)
    expect(t.items.length).toBe(1)
    expect(t.items[0]?.x).toBe(70)
    expect(t.items[0]?.y).toBe(40)
    expect(t.items[0]?.hp).toBe(1)
  })

  it('chefão engorda a vida uma única vez e anda pela metade da velocidade', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'chefao', hp: 3, speed: 4 })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    const e = api.spawnEnemy(t, 100, 100) as Sprite
    expect(e.hp).toBe(3)
    api.updateEnemyType(t, ctx, null)
    expect(e.hp).toBe(15)
    expect(e.hpMax).toBe(15)
    api.changeHealth(e, -5)
    api.updateEnemyType(t, ctx, null)
    expect(e.hp).toBe(10) // não engorda de novo
    // Somado a um jeito de andar, ele anda a METADE da velocidade do tipo.
    api.addEnemyTypeBehavior(t, 'patrulha')
    api.updateEnemyType(t, ctx, null)
    expect(e.vx).toBe(2)
  })
})

describe('addEnemyTypeBehavior (combinar comportamentos)', () => {
  it('patrulha + atirador anda E atira, e quem anda decide o lado do desenho', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'patrulha', speed: 3, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'cadencia', 2)
    api.addEnemyTypeBehavior(t, 'atirador')
    const e = api.spawnEnemy(t, 200, 100) as Sprite
    const alvo = api.createSprite({ x: 40, y: 100, w: 10, h: 10 })
    api.updateEnemyType(t, ctx, alvo)
    expect(e.vx).toBe(3)
    expect(e.x).toBe(203)
    expect(t.bullets.items.length).toBe(0)
    api.updateEnemyType(t, ctx, alvo)
    expect(t.bullets.items.length).toBe(1)
    expect(e.vx).toBe(3) // segue andando
    // O alvo está à ESQUERDA, mas ele anda para a direita: o lado é de quem anda.
    expect(e.facing).toBe(1)
  })

  it('voador + bombardeiro voa na horizontal e solta bombas retas', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'voador', speed: 2, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'cadencia', 2)
    api.setEnemyTypeParam(t, 'tiro', 4)
    api.addEnemyTypeBehavior(t, 'bombardeiro')
    api.setGravity(0.6)
    const e = api.spawnEnemy(t, 100, 40) as Sprite
    api.updateEnemyType(t, ctx, null)
    api.updateEnemyType(t, ctx, null)
    expect(e.x).toBe(104)
    expect(e.y).toBe(40) // voa: a gravidade do mundo não o puxa
    expect(e.vy).toBe(0)
    expect(t.bullets.items.length).toBe(1)
    expect(t.bullets.items[0]?.vy).toBe(4)
  })

  it('perseguidor + saltador: o X vem do perseguidor e o Y do pulo', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    api.setGravity(0.6)
    const t = api.createEnemyType({ behavior: 'perseguidor', speed: 3, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'ritmo', 2)
    api.addEnemyTypeBehavior(t, 'saltador')
    const e = api.spawnEnemy(t, 100, 290) as Sprite
    const alvo = api.createSprite({ x: 300, y: 290, w: 10, h: 10 })
    // Encosta no chão e, no ritmo, pula — perseguindo o alvo na horizontal.
    let pulou = false
    for (let i = 0; i < 6; i += 1) {
      api.applyGravityToGroup(t)
      api.updateEnemyType(t, ctx, alvo)
      expect(e.vx).toBeGreaterThan(0) // o perseguidor manda no X o tempo todo
      if (e.vy < 0) pulou = true
    }
    expect(pulou).toBe(true)
    expect(e.x).toBeGreaterThan(100)
  })

  it('chefão + atirador em leque dispara UMA rajada (a mesma ação não conta duas vezes)', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'chefao', w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    api.addEnemyTypeBehavior(t, 'atirador-leque')
    api.spawnEnemy(t, 100, 100)
    api.updateEnemyType(t, ctx, api.createSprite({ x: 300, y: 100, w: 10, h: 10 }))
    expect(t.bullets.items.length).toBe(3)
  })
})

describe('combinações que já quebraram (regressões do full review)', () => {
  it('perseguidor que só ganhou o X anda na velocidade CHEIA, não na fração do vetor', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    api.setGravity(0.6)
    const t = api.createEnemyType({ behavior: 'perseguidor', speed: 3, w: 10, h: 10 })
    api.addEnemyTypeBehavior(t, 'saltador') // o saltador toma o eixo Y
    const e = api.spawnEnemy(t, 100, 290) as Sprite
    // Alvo 10px ao lado e 250px ACIMA: normalizar em 2D daria vx de 0,12 e o
    // inimigo levaria 83 quadros para andar 10px.
    api.updateEnemyType(t, ctx, api.createSprite({ x: 110, y: 40, w: 10, h: 10 }))
    expect(e.vx).toBe(3)
    // Perto o bastante, ele não ultrapassa o alvo.
    e.x = 108
    api.updateEnemyType(t, ctx, api.createSprite({ x: 110, y: 40, w: 10, h: 10 }))
    expect(e.vx).toBe(2)
  })

  it('espinho pisado volta a machucar (o pulo zera o dano contando que ele morra)', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    api.setGravity(0.6)
    const t = api.createEnemyType({ behavior: 'patrulha', hp: 3, dmg: 2, w: 20, h: 20 })
    api.addEnemyTypeBehavior(t, 'espinho')
    const espinho = api.spawnEnemy(t, 100, 200) as Sprite
    const heroi = api.createSprite({ x: 100, y: 190, w: 20, h: 20, vy: 5 })
    api.setHealth(heroi, 5)
    api.stompEnemyType(heroi, t, 8)
    api.updateEnemyType(t, ctx, null)
    expect(t.items.length).toBe(1) // não morre
    expect(espinho.hp).toBe(3)
    expect(espinho.dmg).toBe(2) // e volta a doer
    api.hurtByEnemy(heroi, espinho)
    expect(heroi.hp).toBe(3)
  })

  it('espinho + chefão volta ao teto DELE, não ao do tipo (a barra de vida lê hp/hpMax)', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'chefao', hp: 3, w: 20, h: 20 })
    api.addEnemyTypeBehavior(t, 'espinho')
    const e = api.spawnEnemy(t, 100, 100) as Sprite
    api.updateEnemyType(t, ctx, null)
    expect(e.hpMax).toBe(15)
    api.changeHealth(e, -99)
    api.updateEnemyType(t, ctx, null)
    expect(e.hp).toBe(15)
  })

  it('somar chefão no meio do jogo é reforço, não cura: o dano já levado continua valendo', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'patrulha', hp: 10, w: 20, h: 20 })
    const e = api.spawnEnemy(t, 100, 100) as Sprite
    api.changeHealth(e, -9)
    expect(e.hp).toBe(1)
    api.addEnemyTypeBehavior(t, 'chefao')
    api.updateEnemyType(t, ctx, null)
    expect(e.hpMax).toBe(50)
    expect(e.hp).toBe(41) // 1 + os 40 de teto novo, e NÃO 50
  })

  it('o vira-na-borda do voador vertical não vira mais a marcha de quem anda no X', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'patrulha', speed: 2, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'alcance', 4)
    api.addEnemyTypeBehavior(t, 'voador-vertical')
    const e = api.spawnEnemy(t, 200, 100) as Sprite
    // O voador vertical passa do alcance e inverte o eixo DELE já no 3º quadro.
    for (let i = 0; i < 6; i += 1) {
      api.updateEnemyType(t, ctx, null)
      expect(e.vx).toBe(2) // a patrulha segue para a direita o tempo todo
    }
    expect(e.vy).toBe(-2) // e o vertical inverteu, como deve
  })

  it('somar parado congela o inimigo (senão o bloco mentiria)', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'perseguidor', speed: 4, w: 10, h: 10 })
    const e = api.spawnEnemy(t, 100, 100) as Sprite
    const alvo = api.createSprite({ x: 300, y: 100, w: 10, h: 10 })
    api.updateEnemyType(t, ctx, alvo)
    expect(e.x).toBe(104)
    api.addEnemyTypeBehavior(t, 'parado')
    api.updateEnemyType(t, ctx, alvo)
    expect(e.x).toBe(104)
    expect(e.vx).toBe(0)
  })

  it('fugitivo parado lá atrás não é ARRASTADO pela câmera que se afasta', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'medroso', speed: 3, w: 20, h: 20 })
    const e = api.spawnEnemy(t, 50, 100) as Sprite
    // A câmera anda 800px para a direita: o inimigo fica MUITO atrás dela.
    api.setCamera(800, 0)
    for (let i = 0; i < 5; i += 1) api.updateEnemyType(t, ctx, null)
    expect(e.x).toBe(50) // ficou onde estava, não colou na borda da tela
  })

  it('nome herdado de Object.prototype não passa por comportamento', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const ctx = fakeCtx(400, 300)
      api.addEnemyTypeBehavior(api.createEnemyType({}), 'toString')
      // No modo Código, um nome desses no nascimento cai no padrão patrulha
      // (era o "senão" da cadeia antiga), em vez de deixar o inimigo inerte.
      const t = api.createEnemyType({ behavior: 'constructor', speed: 5, w: 10, h: 10 })
      const e = api.spawnEnemy(t, 100, 100) as Sprite
      api.updateEnemyType(t, ctx, null)
      expect(e.vx).toBe(5)
    } finally {
      warn.mockRestore()
    }
  })
})

describe('jogo de nave: os comportamentos novos', () => {
  it('perseguidor de lado segue na horizontal sem mudar de altura', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    api.setGravity(0.6)
    const t = api.createEnemyType({ behavior: 'perseguidor-lado', speed: 3, w: 10, h: 10 })
    const e = api.spawnEnemy(t, 100, 40) as Sprite
    const alvo = api.createSprite({ x: 300, y: 260, w: 10, h: 10 })
    for (let i = 0; i < 5; i += 1) api.updateEnemyType(t, ctx, alvo)
    expect(e.x).toBe(115)
    expect(e.y).toBe(40) // a altura é a mesma o tempo todo
    // Perto o bastante, não ultrapassa o alvo: o passo é o que falta, e não a
    // velocidade cheia (alvo no centro 305, inimigo no centro 307).
    e.x = 302
    api.updateEnemyType(t, ctx, alvo)
    expect(e.vx).toBe(-2)
  })

  it('atirador alinhado espera o alvo passar na frente e atira NA HORA (já vem carregado)', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'atirador-alinhado', w: 20, h: 20, dmg: 2 })
    api.setEnemyTypeParam(t, 'cadencia', 30)
    api.setEnemyTypeParam(t, 'tiro', 5)
    api.spawnEnemy(t, 100, 40)
    const longe = api.createSprite({ x: 300, y: 250, w: 20, h: 20 })
    for (let i = 0; i < 100; i += 1) api.updateEnemyType(t, ctx, longe)
    expect(t.bullets.items.length).toBe(0) // fora da coluna não atira NUNCA
    // Entrou na coluna: dispara no MESMO quadro, porque a recarga corria o tempo
    // todo. Esperar 30 quadros alinhado seria pedir que ela ficasse parada
    // embaixo dele, e o inimigo que patrulha passa e vai embora.
    const naFrente = api.createSprite({ x: 100, y: 250, w: 20, h: 20 })
    api.updateEnemyType(t, ctx, naFrente)
    expect(t.bullets.items.length).toBe(1)
    const tiro = t.bullets.items[0] as Sprite
    expect(tiro.vx).toBe(0) // reto para baixo, é uma coluna
    expect(tiro.vy).toBe(5)
    expect(tiro.dmg).toBe(2)
    // E aí sim respeita a cadência enquanto ela continuar na frente.
    for (let i = 0; i < 29; i += 1) api.updateEnemyType(t, ctx, naFrente)
    expect(t.bullets.items.length).toBe(1)
    api.updateEnemyType(t, ctx, naFrente)
    expect(t.bullets.items.length).toBe(2)
  })

  it('atirador alinhado também mira para CIMA quando o alvo está acima', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'atirador-alinhado', w: 20, h: 20 })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    api.setEnemyTypeParam(t, 'tiro', 6)
    api.spawnEnemy(t, 100, 250)
    api.updateEnemyType(t, ctx, api.createSprite({ x: 100, y: 40, w: 20, h: 20 }))
    expect(t.bullets.items[0]?.vy).toBe(-6)
  })

  it('atirador esperto joga o tiro NA FRENTE de um alvo em movimento', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    // ⚠️ O alvo tem que cruzar PERPENDICULAR à linha de tiro. Com ele correndo
    // ao longo da mira, adiantar não muda o ângulo e o teste passaria mesmo sem
    // predição nenhuma (foi assim que esta asserção nasceu, e não provava nada).
    const t = api.createEnemyType({ behavior: 'atirador-esperto', w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    api.setEnemyTypeParam(t, 'tiro', 5)
    api.spawnEnemy(t, 100, 100)
    const alvo = api.createSprite({ x: 200, y: 100, w: 10, h: 10, vx: 0, vy: 3 })
    api.updateEnemyType(t, ctx, alvo)
    const tiro = t.bullets.items[0] as Sprite
    // 100px de distância / 5 por quadro = 20 quadros; o alvo desce 60 nesse tempo.
    expect(Math.atan2(tiro.vy, tiro.vx)).toBeCloseTo(Math.atan2(60, 100), 2)
    expect(tiro.vy).toBeGreaterThan(2) // sem predição seria 0
  })

  it('com o alvo mais RÁPIDO que o tiro, ele mira direto em vez de atirar para trás', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'atirador-esperto', w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    api.setEnemyTypeParam(t, 'tiro', 4) // o padrão do tipo
    api.spawnEnemy(t, 100, 100)
    // A nave anda a 6 (o padrão do bloco de setas) VINDO para cima dele. Uma
    // passada de correção inverteria o sinal e o tiro sairia para a esquerda.
    api.updateEnemyType(t, ctx, api.createSprite({ x: 200, y: 100, w: 10, h: 10, vx: -6, vy: 0 }))
    expect(t.bullets.items[0]?.vx).toBe(4) // para a DIREITA, onde a nave está
  })

  it('com o alvo PARADO, o atirador esperto mira igual ao atirador comum', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const alvo = { x: 200, y: 180, w: 10, h: 10, vx: 0, vy: 0 }
    const esperto = api.createEnemyType({ behavior: 'atirador-esperto', w: 10, h: 10 })
    const comum = api.createEnemyType({ behavior: 'atirador', w: 10, h: 10 })
    for (const t of [esperto, comum]) {
      api.setEnemyTypeParam(t, 'cadencia', 1)
      api.setEnemyTypeParam(t, 'tiro', 5)
      api.spawnEnemy(t, 100, 100)
      api.updateEnemyType(t, ctx, api.createSprite({ ...alvo }))
    }
    expect(esperto.bullets.items[0]?.vx).toBeCloseTo(comum.bullets.items[0]?.vx ?? 0, 6)
    expect(esperto.bullets.items[0]?.vy).toBeCloseTo(comum.bullets.items[0]?.vy ?? 0, 6)
  })
})

describe('o raio', () => {
  it('recarrega, avisa 60 quadros e só então liga pela duração escolhida', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'raio', w: 20, h: 20 })
    api.setEnemyTypeParam(t, 'cadencia', 10)
    api.setEnemyTypeParam(t, 'duracao', 30)
    const e = api.spawnEnemy(t, 100, 40) as Sprite
    const alvo = api.createSprite({ x: 100, y: 250, w: 20, h: 20 })
    const passo = (n: number) => {
      for (let i = 0; i < n; i += 1) api.updateEnemyType(t, ctx, alvo)
    }
    passo(9)
    expect(e._beamPhase).toBe(0) // ainda recarregando
    passo(1)
    expect(e._beamPhase).toBe(1) // avisando
    passo(59)
    expect(e._beamPhase).toBe(1)
    passo(1)
    expect(e._beamPhase).toBe(2) // ligado
    passo(29)
    expect(e._beamPhase).toBe(2)
    passo(1)
    expect(e._beamPhase).toBe(0) // e volta a recarregar
  })

  it('o feixe só machuca na fase LIGADA, e não some ao acertar', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'raio', w: 20, h: 20, dmg: 2 })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    api.setEnemyTypeParam(t, 'duracao', 20)
    const e = api.spawnEnemy(t, 100, 40) as Sprite
    // Na coluna do inimigo, mais abaixo: o feixe passa por ele.
    const nave = api.createSprite({ x: 100, y: 200, w: 20, h: 20 })
    const acertos: Sprite[] = []
    const varrer = () =>
      api.overlapEnemyBeams(
        () => nave,
        t,
        (dono) => acertos.push(dono),
      )
    api.updateEnemyType(t, ctx, nave) // recarga acaba -> avisando
    varrer()
    expect(acertos.length).toBe(0) // aviso não machuca
    for (let i = 0; i < 60; i += 1) api.updateEnemyType(t, ctx, nave)
    expect(e._beamPhase).toBe(2)
    varrer()
    varrer()
    expect(acertos.length).toBe(2) // acerta em todo quadro: NÃO some ao acertar
    expect(acertos[0]).toBe(e) // e entrega o DONO do raio
  })

  it('quem está fora da coluna do feixe não é atingido', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'raio', w: 20, h: 20 })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    api.spawnEnemy(t, 100, 40)
    const fora = api.createSprite({ x: 300, y: 200, w: 20, h: 20 })
    for (let i = 0; i < 62; i += 1) api.updateEnemyType(t, ctx, fora)
    let acertou = false
    api.overlapEnemyBeams(
      () => fora,
      t,
      () => {
        acertou = true
      },
    )
    expect(acertou).toBe(false)
  })

  it('o raio não precisa de alvo: um inimigo burro dispara igual', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'patrulha', w: 20, h: 20 })
    api.addEnemyTypeBehavior(t, 'raio')
    api.setEnemyTypeParam(t, 'cadencia', 1)
    const e = api.spawnEnemy(t, 100, 40) as Sprite
    for (let i = 0; i < 62; i += 1) api.updateEnemyType(t, ctx, null)
    expect(e._beamPhase).toBe(2)
  })
})

describe('os cinco níveis de inteligência', () => {
  it('cada nível semeia o pacote certo, e o de nascença é o primeiro dele', () => {
    const api = load()
    const esperado: Record<string, string[]> = {
      burra: ['patrulha', 'bombardeiro'],
      basica: ['patrulha', 'atirador-alinhado'],
      // ⚠️ 'perseguidor-lado': a avançada e a ultra ficam na altura em que
      // nasceram e seguem só para os lados. O REI mantém o perseguidor completo.
      avancada: ['perseguidor-lado', 'atirador'],
      ultra: ['perseguidor-lado', 'atirador-esperto'],
      rei: ['perseguidor', 'atirador-esperto', 'raio', 'chefao'],
    }
    for (const [nivel, combo] of Object.entries(esperado)) {
      const t = api.createSmartEnemyType({ smart: nivel })
      expect(t.config.behaviors, nivel).toEqual(combo)
      expect(t.config.behavior, nivel).toBe(combo[0] as string)
    }
  })

  it('o "também é" soma por cima da inteligência (o inimigo burro com raio)', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createSmartEnemyType({ smart: 'burra', w: 20, h: 20 })
    api.addEnemyTypeBehavior(t, 'raio')
    expect(t.config.behaviors).toEqual(['patrulha', 'bombardeiro', 'raio'])
    api.setEnemyTypeParam(t, 'cadencia', 1)
    const e = api.spawnEnemy(t, 100, 40) as Sprite
    for (let i = 0; i < 62; i += 1) api.updateEnemyType(t, ctx, null)
    expect(e._beamPhase).toBe(2) // solta raio
    expect(e.vx).not.toBe(0) // e continua patrulhando
    expect(t.bullets.items.length).toBeGreaterThan(0) // e bombardeando
  })

  it('o rei nasce com vida 5 vezes maior e anda pela metade', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createSmartEnemyType({ smart: 'rei', hp: 4, speed: 4, w: 20, h: 20 })
    const e = api.spawnEnemy(t, 100, 100) as Sprite
    api.updateEnemyType(t, ctx, api.createSprite({ x: 300, y: 100, w: 10, h: 10 }))
    expect(e.hpMax).toBe(20)
    expect(e.vx).toBeCloseTo(2, 2)
  })

  it('inteligência desconhecida avisa e cai na burra', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const t = api.createSmartEnemyType({ smart: 'genial' })
      expect(t.config.behaviors).toEqual(['patrulha', 'bombardeiro'])
      expect(warn).toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })
})

describe('chefão: quando levar dano e o inimigo com nome', () => {
  it('dispara ao perder vida e continuar vivo, com o inimigo em mãos', () => {
    const api = load()
    const ctx = fakeCtx()
    const t = api.createEnemyType({ behavior: 'patrulha', hp: 5, w: 20, h: 20 })
    const golpes: number[] = []
    api.onEnemyHurt(t, (s) => golpes.push(s.hp ?? -1), 'ev')
    const e = api.spawnEnemy(t, 50, 50) as Sprite
    api.updateEnemyType(t, ctx, null)
    expect(golpes).toEqual([]) // sem dano, sem evento
    api.changeHealth(e, -2)
    api.updateEnemyType(t, ctx, null)
    expect(golpes).toEqual([3])
    api.updateEnemyType(t, ctx, null)
    expect(golpes).toEqual([3]) // não repete sem dano novo
  })

  it('NÃO dispara no golpe que mata (esse é o "quando for derrotado")', () => {
    const api = load()
    const ctx = fakeCtx()
    const t = api.createEnemyType({ behavior: 'patrulha', hp: 2, w: 20, h: 20 })
    const machucou: string[] = []
    const morreu: string[] = []
    api.onEnemyHurt(t, () => machucou.push('dano'), 'a')
    api.onEnemyDefeated(t, () => morreu.push('morte'), 'b')
    const e = api.spawnEnemy(t, 50, 50) as Sprite
    api.changeHealth(e, -2)
    api.updateEnemyType(t, ctx, null)
    expect(machucou).toEqual([])
    expect(morreu).toEqual(['morte'])
  })

  it('o handler defeituoso é isolado e o saudável continua', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    const error = spyOn(console, 'error').mockImplementation(() => {})
    try {
      const api = load()
      const ctx = fakeCtx()
      const t = api.createEnemyType({ behavior: 'patrulha', hp: 9, w: 20, h: 20 })
      const bons: number[] = []
      api.onEnemyHurt(
        t,
        () => {
          throw new Error('boom')
        },
        'ruim',
      )
      api.onEnemyHurt(t, () => bons.push(1), 'bom')
      const e = api.spawnEnemy(t, 50, 50) as Sprite
      api.changeHealth(e, -1)
      api.updateEnemyType(t, ctx, null)
      api.changeHealth(e, -1)
      api.updateEnemyType(t, ctx, null)
      expect(bons.length).toBe(2) // o bom rodou nas duas
    } finally {
      warn.mockRestore()
      error.mockRestore()
    }
  })

  it('o inimigo solto com nome é o MESMO objeto que entrou na lista', () => {
    const api = load()
    const t = api.createEnemyType({ behavior: 'patrulha', hp: 7, w: 20, h: 20 })
    const chefe = api.spawnEnemy(t, 200, 60)
    expect(chefe).toBe(t.items[0] as Sprite)
    expect(chefe?.hp).toBe(7)
  })
})

describe('correções do terceiro full review', () => {
  it('a coluna do atirador alinhado não é o alcance (e nem a largura dos dois)', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'atirador-alinhado', w: 20, h: 20 })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    // Alcance ENORME não pode alargar a coluna: senão voador + alinhado seria
    // impossível de ajustar (o mesmo número faria o voo e a coluna).
    api.setEnemyTypeParam(t, 'alcance', 400)
    api.spawnEnemy(t, 100, 40)
    // Centro do inimigo 110; nave de 20 com centro em 200: 90 de distância.
    api.updateEnemyType(t, ctx, api.createSprite({ x: 190, y: 250, w: 20, h: 20 }))
    expect(t.bullets.items.length).toBe(0)
    // Alinhado, atira.
    api.updateEnemyType(t, ctx, api.createSprite({ x: 100, y: 250, w: 20, h: 20 }))
    expect(t.bullets.items.length).toBe(1)
  })

  it('o espinho dispara o "levou dano" também no golpe que o mataria', () => {
    const api = load()
    const ctx = fakeCtx()
    const t = api.createEnemyType({ behavior: 'espinho', hp: 3, w: 20, h: 20 })
    const golpes: number[] = []
    api.onEnemyHurt(t, () => golpes.push(1), 'ev')
    const e = api.spawnEnemy(t, 50, 50) as Sprite
    api.changeHealth(e, -1) // golpe fraco
    api.updateEnemyType(t, ctx, null)
    expect(golpes.length).toBe(1)
    api.changeHealth(e, -99) // golpe que mataria
    api.updateEnemyType(t, ctx, null)
    expect(golpes.length).toBe(2)
    expect(t.items.length).toBe(1) // e ele continua vivo
  })

  it('esvaziar o grupo leva os TIROS do tipo junto', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'bombardeiro', w: 20, h: 20 })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    api.spawnEnemy(t, 100, 40)
    for (let i = 0; i < 3; i += 1) api.updateEnemyType(t, ctx, null)
    expect(t.bullets.items.length).toBeGreaterThan(0)
    api.clearGroup(t)
    expect(t.items.length).toBe(0)
    expect(t.bullets.items.length).toBe(0) // a nave não renasce levando tiro fantasma
  })

  it('parar de desenhar volta a contar para o aviso da tela vazia', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const ctx = fakeCtx()
      const t = api.createEnemyType({})
      api.spawnEnemy(t, 50, 50)
      // Fase 1: desenha. Nenhum aviso.
      for (let i = 0; i < 500; i += 1) {
        api.updateEnemyType(t, ctx, null)
        api.drawGroup(ctx, t)
      }
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('ninguém os desenha'))).toEqual([])
      // Fase 2: o "Desenhar" ficou dentro de um "se" que parou de valer.
      for (let i = 0; i < 400; i += 1) api.updateEnemyType(t, ctx, null)
      expect(
        warn.mock.calls.filter((c) => String(c[0]).includes('ninguém os desenha')).length,
      ).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('avisa quando o raio liga e ninguém confere se ele acertou', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const ctx = fakeCtx(400, 300)
      const t = api.createEnemyType({ behavior: 'raio', w: 20, h: 20 })
      api.setEnemyTypeParam(t, 'cadencia', 1)
      api.spawnEnemy(t, 100, 40)
      const nave = api.createSprite({ x: 100, y: 200, w: 20, h: 20 })
      for (let i = 0; i < 400; i += 1) {
        api.updateEnemyType(t, ctx, nave)
        api.drawEnemyType(ctx, t)
      }
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('ninguém confere')).length).toBe(1)
      // Quem confere não é incomodado.
      const ok = api.createEnemyType({ behavior: 'raio', w: 20, h: 20 })
      api.setEnemyTypeParam(ok, 'cadencia', 1)
      api.spawnEnemy(ok, 100, 40)
      for (let i = 0; i < 400; i += 1) {
        api.updateEnemyType(ok, ctx, nave)
        api.drawEnemyType(ctx, ok)
        api.overlapEnemyBeams(
          () => nave,
          ok,
          () => {},
        )
      }
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('ninguém confere')).length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('velocidade de tiro zero não entope o grupo com tiros parados', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'bombardeiro', w: 20, h: 20 })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    api.setEnemyTypeParam(t, 'tiro', 0) // fica no valor anterior, não em zero
    api.spawnEnemy(t, 100, 40)
    api.updateEnemyType(t, ctx, null)
    expect(t.bullets.items[0]?.vy).toBeGreaterThan(0)
  })

  it('inteligência desconhecida avisa UMA vez, mesmo criando o tipo sem parar', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      for (let i = 0; i < 20; i += 1) api.createSmartEnemyType({ smart: 'genial' })
      const avisos = warn.mock.calls.filter((c) => String(c[0]).includes('genial'))
      expect(avisos.length).toBe(1)
      // Sem escolher nada, o recado não mostra "undefined" para a criança.
      api.createSmartEnemyType({})
      const semNada = warn.mock.calls.filter((c) => String(c[0]).includes('nenhuma'))
      expect(semNada.length).toBe(1)
      expect(warn.mock.calls.some((c) => String(c[0]).includes('undefined'))).toBe(false)
    } finally {
      warn.mockRestore()
    }
  })
})

describe('dois inimigos do MESMO tipo (o estado é de cada um, não do tipo)', () => {
  it('dois atiradores nascidos em quadros diferentes têm cadências independentes', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'atirador', w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'cadencia', 4)
    const alvo = api.createSprite({ x: 300, y: 100, w: 10, h: 10 })
    api.spawnEnemy(t, 50, 100)
    api.updateEnemyType(t, ctx, alvo) // o 1º já contou um quadro
    api.spawnEnemy(t, 80, 100)
    for (let i = 0; i < 3; i += 1) api.updateEnemyType(t, ctx, alvo)
    // O 1º completou 4 quadros e atirou; o 2º ainda não.
    expect(t.bullets.items.length).toBe(1)
    api.updateEnemyType(t, ctx, alvo)
    expect(t.bullets.items.length).toBe(2)
  })

  it('dois rondadores nascidos em casas diferentes descrevem círculos próprios', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'rondador', speed: 5, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'alcance', 50)
    const a = api.spawnEnemy(t, 100, 100) as Sprite
    const b = api.spawnEnemy(t, 300, 200) as Sprite
    api.updateEnemyType(t, ctx, null)
    expect(a.x).toBeCloseTo(100 + Math.sin(0.1) * 50, 6)
    expect(b.x).toBeCloseTo(300 + Math.sin(0.1) * 50, 6)
    expect(a.y).toBeCloseTo(100 + (Math.cos(0.1) - 1) * 50, 6)
    expect(b.y).toBeCloseTo(200 + (Math.cos(0.1) - 1) * 50, 6)
  })

  it('atirador + atirador em leque disparam JUNTOS, cada um no seu contador', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'atirador', w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'cadencia', 2)
    api.addEnemyTypeBehavior(t, 'atirador-leque')
    api.spawnEnemy(t, 100, 100)
    const alvo = api.createSprite({ x: 300, y: 100, w: 10, h: 10 })
    api.updateEnemyType(t, ctx, alvo)
    expect(t.bullets.items.length).toBe(0)
    api.updateEnemyType(t, ctx, alvo)
    expect(t.bullets.items.length).toBe(4) // 1 do atirador + 3 do leque
  })
})

describe('combinações que já quebraram, parte 2 (segundo full review)', () => {
  it('mergulhador que perde o eixo Y não dispara mergulho nenhum', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'mergulhador', speed: 3, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'alcance', 60)
    api.addEnemyTypeBehavior(t, 'voador-vertical') // toma o eixo Y
    const e = api.spawnEnemy(t, 200, 40) as Sprite
    const alvo = api.createSprite({ x: 204, y: 250, w: 10, h: 10 })
    for (let i = 0; i < 30; i += 1) api.updateEnemyType(t, ctx, alvo)
    expect(e._dive).toBe(0)
    // Sem a guarda, ele sairia voando na horizontal com o vetor congelado.
    expect(Math.abs(e.x - 200)).toBeLessThanOrEqual(60 + 3)
  })

  it('mergulho em curso que PERDE o eixo Y aborta em vez de sair voando', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'mergulhador', speed: 3, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'alcance', 60)
    const e = api.spawnEnemy(t, 200, 40) as Sprite
    const alvo = api.createSprite({ x: 204, y: 250, w: 10, h: 10 })
    api.updateEnemyType(t, ctx, alvo)
    api.updateEnemyType(t, ctx, alvo)
    expect(e._dive).toBe(1)
    api.addEnemyTypeBehavior(t, 'voador-vertical') // no meio do mergulho
    api.updateEnemyType(t, ctx, alvo)
    expect(e._dive).toBe(0)
  })

  it('mergulhador não vira a marcha de quem ganhou o eixo X', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'mergulhador', speed: 2, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'alcance', 10)
    api.addEnemyTypeBehavior(t, 'patrulha') // a patrulha manda no X
    const e = api.spawnEnemy(t, 200, 100) as Sprite
    for (let i = 0; i < 20; i += 1) {
      api.updateEnemyType(t, ctx, null)
      expect(e.vx).toBe(2) // sem parede, não pode virar sozinho
    }
  })

  it('parado somado a quem VOA não derruba o inimigo até o chão', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    api.setGravity(0.6)
    const t = api.createEnemyType({ behavior: 'zigue-zague', speed: 2, w: 10, h: 10 })
    const e = api.spawnEnemy(t, 200, 100) as Sprite
    api.addEnemyTypeBehavior(t, 'parado')
    for (let i = 0; i < 60; i += 1) {
      api.applyGravityToGroup(t)
      api.updateEnemyType(t, ctx, null)
    }
    expect(e.y).toBe(100) // ficou no lugar, no ar
    expect(e.vy).toBe(0)
    expect(e.onGround).toBeUndefined()
  })

  it('chefão NÃO ressuscita quem já estava com a vida em zero', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'chefao', hp: 3, w: 10, h: 10 })
    const e = api.spawnEnemy(t, 100, 100) as Sprite
    // Morto ANTES do primeiro update dele (onda que solta depois do atualizar).
    api.changeHealth(e, -3)
    api.updateEnemyType(t, ctx, null)
    expect(t.items.length).toBe(0)
    expect(e.hp).toBe(0)
  })

  it('inimigo solto EM CIMA da borda ainda é segurado quando foge para fora', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'medroso', speed: 3, w: 32, h: 32 })
    api.setEnemyTypeParam(t, 'alcance', 200)
    // Nasce meio para fora, como numa onda solta na borda direita.
    const e = api.spawnEnemy(t, 390, 100) as Sprite
    // Alvo à esquerda: ele foge para a DIREITA, para fora da tela.
    for (let i = 0; i < 20; i += 1) {
      api.updateEnemyType(t, ctx, api.createSprite({ x: 300, y: 100, w: 10, h: 10 }))
    }
    expect(e.x + e.w).toBe(400)
  })

  it('esvaziar o grupo cancela quem estava a caminho de voltar', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'renascer', hp: 1, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'voltar', 5)
    const e = api.spawnEnemy(t, 70, 40) as Sprite
    api.changeHealth(e, -1)
    api.updateEnemyType(t, ctx, null)
    expect(t.items.length).toBe(0)
    api.clearGroup(t) // "Esvaziar o grupo": a fase acabou
    for (let i = 0; i < 20; i += 1) api.updateEnemyType(t, ctx, null)
    expect(t.items.length).toBe(0) // nenhum fantasma da fase anterior
  })

  it('renascer devolve o inimigo na CASA dele, não onde ele morreu', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'patrulha', speed: 5, hp: 1, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'voltar', 2)
    api.addEnemyTypeBehavior(t, 'renascer')
    const e = api.spawnEnemy(t, 100, 80) as Sprite
    for (let i = 0; i < 5; i += 1) api.updateEnemyType(t, ctx, null)
    expect(e.x).toBe(125) // andou
    api.changeHealth(e, -1)
    api.updateEnemyType(t, ctx, null)
    for (let i = 0; i < 3; i += 1) api.updateEnemyType(t, ctx, null)
    expect(t.items.length).toBe(1)
    // A casa do inimigo novo é onde o VELHO nasceu (100/80), não onde ele morreu
    // (125). Olhamos a casa porque ele já anda no mesmo quadro em que renasce.
    expect(t.items[0]?._homeX).toBe(100)
    expect(t.items[0]?._homeY).toBe(80)
  })
})

describe('espelhos: o outro lado de cada comportamento simétrico', () => {
  it('medroso foge para a DIREITA quando o alvo está à esquerda', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'medroso', speed: 3, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'alcance', 60)
    const e = api.spawnEnemy(t, 200, 100) as Sprite
    api.updateEnemyType(t, ctx, api.createSprite({ x: 170, y: 100, w: 10, h: 10 }))
    expect(e.vx).toBe(3)
  })

  it('arrancada corre para a DIREITA quando o alvo está à direita', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'arrancada', speed: 2, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'alcance', 60)
    const e = api.spawnEnemy(t, 200, 100) as Sprite
    api.updateEnemyType(t, ctx, api.createSprite({ x: 230, y: 100, w: 10, h: 10 }))
    expect(e.vx).toBe(6)
  })

  it('o alcance é a distância CHEIA, não só a horizontal', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'medroso', speed: 3, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'alcance', 40)
    const e = api.spawnEnemy(t, 200, 200) as Sprite
    // Bem em cima, longe demais na vertical: não reage.
    api.updateEnemyType(t, ctx, api.createSprite({ x: 200, y: 60, w: 10, h: 10 }))
    expect(e.vx).toBe(0)
  })

  it('zigue-zague vira também na borda ESQUERDA', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'zigue-zague', speed: 3, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'alcance', 100)
    const e = api.spawnEnemy(t, 200, 100) as Sprite
    e._dir = -1
    e.x = 0
    api.updateEnemyType(t, ctx, null)
    expect(e.vx).toBe(3)
  })

  it('patrulha vira na borda DIREITA e não sai da tela', () => {
    const api = load()
    const ctx = fakeCtx(200, 100)
    const t = api.createEnemyType({ behavior: 'patrulha', speed: 4, w: 20, h: 20 })
    const e = api.spawnEnemy(t, 100, 40) as Sprite
    for (let i = 0; i < 40; i += 1) api.updateEnemyType(t, ctx, null)
    expect(e.x + e.w).toBeLessThanOrEqual(200 + 4)
    expect(e.x).toBeGreaterThanOrEqual(-4)
  })
})

describe('a regra do ÚLTIMO somado', () => {
  it('quem chega por último manda no eixo, e somar de novo traz o antigo de volta', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'patrulha', speed: 3, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'alcance', 20)
    const e = api.spawnEnemy(t, 200, 100) as Sprite
    const longe = api.createSprite({ x: 390, y: 100, w: 10, h: 10 })
    api.updateEnemyType(t, ctx, longe)
    expect(e.vx).toBe(3)
    // Fugitivo somado depois vence o eixo X: com o alvo longe, ele fica quieto.
    api.addEnemyTypeBehavior(t, 'medroso')
    api.updateEnemyType(t, ctx, longe)
    expect(e.vx).toBe(0)
    // Somar patrulha DE NOVO a move para o fim: ela volta a mandar.
    api.addEnemyTypeBehavior(t, 'patrulha')
    expect(t.config.behaviors).toEqual(['medroso', 'patrulha'])
    api.updateEnemyType(t, ctx, longe)
    expect(e.vx).toBe(3)
  })

  it('somar no meio do jogo não reinicia posição nem direção', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'patrulha', speed: 5, w: 10, h: 10 })
    api.setEnemyTypeParam(t, 'cadencia', 2)
    const e = api.spawnEnemy(t, 100, 100) as Sprite
    for (let i = 0; i < 5; i += 1) api.updateEnemyType(t, ctx, null)
    expect(e.x).toBe(125)
    api.addEnemyTypeBehavior(t, 'atirador')
    const alvo = api.createSprite({ x: 300, y: 100, w: 10, h: 10 })
    api.updateEnemyType(t, ctx, alvo)
    expect(e.x).toBe(130) // seguiu de onde estava
    api.updateEnemyType(t, ctx, alvo)
    expect(t.bullets.items.length).toBe(1)
  })

  it('nome desconhecido avisa uma vez e não entra na lista; o de nascença nunca muda', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const t = api.createEnemyType({ behavior: 'voador' })
      api.addEnemyTypeBehavior(t, 'foguete')
      api.addEnemyTypeBehavior(t, 'foguete-2')
      expect(t.config.behaviors).toEqual(['voador'])
      expect(warn).toHaveBeenCalledTimes(1)
      api.addEnemyTypeBehavior(t, 'atirador')
      api.addEnemyTypeBehavior(t, 'saltador')
      expect(t.config.behaviors).toEqual(['voador', 'atirador', 'saltador'])
      expect(t.config.behavior).toBe('voador')
    } finally {
      warn.mockRestore()
    }
  })
})

describe('derrotar pulando em cima (stompEnemyType)', () => {
  it('caindo em cima derrota o inimigo e dá o quique', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    api.setGravity(0.6)
    const t = api.createEnemyType({ behavior: 'patrulha', hp: 3, w: 20, h: 20 })
    const inimigo = api.spawnEnemy(t, 100, 200) as Sprite
    const heroi = api.createSprite({ x: 100, y: 190, w: 20, h: 20, vy: 5 })
    api.stompEnemyType(heroi, t, 8)
    expect(inimigo.hp).toBe(0)
    expect(heroi.vy).toBe(-8)
    expect(heroi.y).toBe(180) // encaixado em cima
    expect(heroi.onGround).toBe(false)
    // A morte é do "Atualizar os inimigos": partículas e o evento saem de lá.
    api.updateEnemyType(t, ctx, null)
    expect(t.items.length).toBe(0)
  })

  it('encostar de lado não derrota', () => {
    const api = load()
    api.setGravity(0.6)
    const t = api.createEnemyType({ behavior: 'patrulha', hp: 3, w: 20, h: 20 })
    const inimigo = api.spawnEnemy(t, 100, 200) as Sprite
    const heroi = api.createSprite({ x: 90, y: 200, w: 20, h: 20, vy: 0 })
    api.stompEnemyType(heroi, t, 8)
    expect(inimigo.hp).toBe(3)
    expect(heroi.vy).toBe(0)
  })

  it('de lado CAINDO também não derrota (a gravidade deixa todo mundo descendo)', () => {
    const api = load()
    api.setGravity(0.6)
    const t = api.createEnemyType({ behavior: 'patrulha', hp: 3, w: 20, h: 20 })
    const inimigo = api.spawnEnemy(t, 100, 200) as Sprite
    // Encostado no flanco e descendo devagar, como logo depois de applyGravity:
    // o pé JÁ estava fundo dentro do inimigo no começo do quadro.
    const heroi = api.createSprite({ x: 84, y: 200, w: 20, h: 20, vy: 0.6 })
    api.stompEnemyType(heroi, t, 8)
    expect(inimigo.hp).toBe(3)
    expect(heroi.vy).toBe(0.6)
  })

  it('o inimigo pisado não machuca mais neste quadro', () => {
    const api = load()
    api.setGravity(0.6)
    const t = api.createEnemyType({ behavior: 'patrulha', hp: 3, dmg: 2, w: 20, h: 20 })
    const inimigo = api.spawnEnemy(t, 100, 200) as Sprite
    const heroi = api.createSprite({ x: 100, y: 190, w: 20, h: 20, vy: 5 })
    api.setHealth(heroi, 3)
    api.stompEnemyType(heroi, t, 8)
    api.hurtByEnemy(heroi, inimigo)
    expect(heroi.hp).toBe(3)
  })

  it('com gravidade negativa o gesto se inverte: vale subindo nele', () => {
    const api = load()
    api.setGravity(-0.6)
    const t = api.createEnemyType({ behavior: 'patrulha', hp: 3, w: 20, h: 20 })
    const inimigo = api.spawnEnemy(t, 100, 200) as Sprite
    // Caindo (vy positivo) num mundo de cabeça para baixo NÃO vale.
    const descendo = api.createSprite({ x: 100, y: 190, w: 20, h: 20, vy: 5 })
    api.stompEnemyType(descendo, t, 8)
    expect(inimigo.hp).toBe(3)
    // Subindo nele, vale.
    const subindo = api.createSprite({ x: 100, y: 210, w: 20, h: 20, vy: -5 })
    api.stompEnemyType(subindo, t, 8)
    expect(inimigo.hp).toBe(0)
    expect(subindo.vy).toBe(8)
    expect(subindo.y).toBe(220)
  })
})

describe('avisos pedagógicos (tipo sem spawn / criar dentro do laço)', () => {
  it('update/draw de tipo sem NENHUM spawn avisa uma vez só e cita o bloco Soltar', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const ctx = fakeCtx()
      const t = api.createEnemyType({ behavior: 'perseguidor' })
      // O aviso tem GRAÇA (~6s) p/ jogos de ONDA soltarem o 1º inimigo antes de
      // acusar esquecimento; roda update+draw além do limite (720 chamadas) p/
      // exercitar o esquecimento REAL. Segue avisando UMA vez só.
      for (let i = 0; i < 400; i += 1) {
        api.updateEnemyType(t, ctx, null)
        api.drawEnemyType(ctx, t)
      }
      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0]?.[0])).toContain('Soltar um inimigo do tipo')
      // Outro tipo que JÁ nasce com spawn não deve gerar aviso novo.
      const t2 = api.createEnemyType({})
      api.spawnEnemy(t2, 5, 5)
      api.updateEnemyType(t2, ctx, null)
      api.drawEnemyType(ctx, t2)
      expect(warn).toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('tipo que já teve spawn não avisa nem com a lista vazia de novo (derrota legítima)', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const ctx = fakeCtx()
      const t = api.createEnemyType({ hp: 1 })
      const s = api.spawnEnemy(t, 10, 10)
      expect(s).not.toBeNull()
      if (s) api.changeHealth(s, -1)
      api.updateEnemyType(t, ctx, null) // remove o derrotado (vida 0)
      expect(t.items.length).toBe(0)
      api.drawEnemyType(ctx, t)
      api.updateEnemyType(t, ctx, null)
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('atualizar sem NUNCA desenhar avisa (a tela vazia sem pista nenhuma)', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const ctx = fakeCtx()
      const t = api.createEnemyType({})
      api.spawnEnemy(t, 50, 50)
      for (let i = 0; i < 400; i += 1) api.updateEnemyType(t, ctx, null)
      const avisos = warn.mock.calls.filter((c) => String(c[0]).includes('ninguém os desenha'))
      expect(avisos.length).toBe(1)
      // Quem desenha não é incomodado.
      const ok = api.createEnemyType({})
      api.spawnEnemy(ok, 50, 50)
      for (let i = 0; i < 400; i += 1) {
        api.updateEnemyType(ok, ctx, null)
        api.drawEnemyType(ctx, ok)
      }
      expect(
        warn.mock.calls.filter((c) => String(c[0]).includes('ninguém os desenha')).length,
      ).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('ajustar um valor que nenhum comportamento do tipo usa avisa, citando quem usa', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const ctx = fakeCtx()
      const t = api.createEnemyType({ behavior: 'patrulha' })
      api.setEnemyTypeParam(t, 'pulo', 20) // patrulha não pula
      api.spawnEnemy(t, 50, 50)
      const quadro = () => {
        api.updateEnemyType(t, ctx, null)
        api.drawEnemyType(ctx, t)
      }
      for (let i = 0; i < 1799; i += 1) quadro()
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('força do pulo'))).toEqual([])
      quadro()
      const avisos = warn.mock.calls.filter((c) => String(c[0]).includes('força do pulo'))
      expect(avisos.length).toBe(1)
      expect(String(avisos[0]?.[0])).toContain('saltador')
      // Não repete.
      for (let i = 0; i < 1900; i += 1) quadro()
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('força do pulo')).length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('juntar o comportamento que faltava DESARMA o aviso do ajuste órfão', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const ctx = fakeCtx()
      const t = api.createEnemyType({ behavior: 'patrulha' })
      api.setEnemyTypeParam(t, 'pulo', 20)
      api.spawnEnemy(t, 50, 50)
      const quadro = () => {
        api.updateEnemyType(t, ctx, null)
        api.drawEnemyType(ctx, t)
      }
      for (let i = 0; i < 1700; i += 1) quadro() // quase lá
      api.addEnemyTypeBehavior(t, 'saltador') // a fase 2 chegou
      for (let i = 0; i < 2000; i += 1) quadro()
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('força do pulo'))).toEqual([])
    } finally {
      warn.mockRestore()
    }
  })

  it('desenhar pelo bloco de GRUPO também conta como desenhar', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const ctx = fakeCtx()
      // O tipo É um grupo, e o seletor de "Desenhar o grupo" o lista: num jogo
      // visto de cima, "ordenado pela base" é o bloco CERTO.
      const t = api.createEnemyType({})
      api.spawnEnemy(t, 50, 50)
      for (let i = 0; i < 500; i += 1) {
        api.updateEnemyType(t, ctx, null)
        api.drawGroupByY(ctx, t)
      }
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('ninguém os desenha'))).toEqual([])
      const t2 = api.createEnemyType({})
      api.spawnEnemy(t2, 50, 50)
      for (let i = 0; i < 500; i += 1) {
        api.updateEnemyType(t2, ctx, null)
        api.drawGroup(ctx, t2)
      }
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('ninguém os desenha'))).toEqual([])
    } finally {
      warn.mockRestore()
    }
  })

  it('ajustar ANTES de juntar o comportamento não avisa (é a ordem normal de montar)', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const ctx = fakeCtx()
      const t = api.createEnemyType({ behavior: 'patrulha' })
      api.setEnemyTypeParam(t, 'cadencia', 40)
      api.addEnemyTypeBehavior(t, 'atirador') // o dono chega DEPOIS do ajuste
      api.spawnEnemy(t, 50, 50)
      const alvo = api.createSprite({ x: 200, y: 50, w: 10, h: 10 })
      for (let i = 0; i < 400; i += 1) {
        api.updateEnemyType(t, ctx, alvo)
        api.drawEnemyType(ctx, t)
      }
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('só muda alguma coisa'))).toEqual(
        [],
      )
    } finally {
      warn.mockRestore()
    }
  })

  it('comportamento que precisa de alvo sem alvo nenhum avisa e cita o campo do bloco', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const ctx = fakeCtx()
      const t = api.createEnemyType({ behavior: 'perseguidor' })
      api.spawnEnemy(t, 50, 50)
      for (let i = 0; i < 400; i += 1) {
        api.updateEnemyType(t, ctx, null)
        api.drawEnemyType(ctx, t)
      }
      const avisos = warn.mock.calls.filter((c) => String(c[0]).includes('precisa de ALVO'))
      expect(avisos.length).toBe(1)
      expect(String(avisos[0]?.[0])).toContain('alvo:')
      // Quem não precisa de alvo (patrulha) fica em paz.
      const t2 = api.createEnemyType({ behavior: 'patrulha' })
      api.spawnEnemy(t2, 50, 50)
      for (let i = 0; i < 400; i += 1) {
        api.updateEnemyType(t2, ctx, null)
        api.drawEnemyType(ctx, t2)
      }
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('precisa de ALVO')).length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('createEnemyType chamado 61+ vezes (sinal de laço) avisa uma única vez', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      for (let i = 0; i < 80; i += 1) api.createEnemyType({})
      // ⚠️ Filtro pela frase PRÓPRIA deste aviso: outros avisos citam o mesmo
      // bloco pela face (o do teto de tipos, por exemplo), e "contém o nome do
      // bloco" passou a casar com dois.
      const calls = warn.mock.calls.filter((c) => String(c[0]).includes('está rodando sem parar'))
      expect(calls.length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })
})

/**
 * Quarto full review (07/08). A rodada mirou o que a TERCEIRA rodada tinha
 * acabado de escrever, que é onde os defeitos moram quando ninguém revisou a
 * correção. Cada caso aqui é um achado que virou conserto.
 */
describe('correções do quarto full review', () => {
  /** Um ctx que ANOTA cada fillRect, para provar quantas vezes e em que ordem. */
  function recordingCtx(w = 400, h = 300) {
    const rects: Array<[number, number, number, number]> = []
    const ctx = fakeCtx(w, h) as Record<string, unknown>
    ctx.fillRect = (x: number, y: number, rw: number, rh: number) => {
      rects.push([x, y, rw, rh])
    }
    return { ctx: ctx as unknown, rects }
  }

  it('o feixe é pintado UMA vez, e DEPOIS do inimigo (não duas, nem por baixo)', () => {
    const api = load()
    const { ctx, rects } = recordingCtx()
    const t = api.createEnemyType({ behavior: 'raio', w: 20, h: 20, color: '#f00' })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    const e = api.spawnEnemy(t, 100, 40) as Sprite
    for (let i = 0; i < 62; i += 1) api.updateEnemyType(t, ctx, null)
    expect(e._beamPhase).toBe(2) // ligado
    rects.length = 0
    api.drawEnemyType(ctx, t)
    // Só o feixe é comprido: ele vai do pé do inimigo até a borda de baixo. São
    // DOIS retângulos (o halo e o miolo branco); pintado em dobro seriam quatro.
    const compridos = rects.map((r, i) => [r, i] as const).filter(([r]) => r[3] > 100)
    expect(compridos.length).toBe(2)
    // O corpo do inimigo (20x20) sai ANTES: o feixe fica POR CIMA, como promete.
    const corpo = rects.findIndex((r) => r[2] === 20 && r[3] === 20)
    expect(corpo).toBeGreaterThanOrEqual(0)
    expect(compridos[0]?.[1]).toBeGreaterThan(corpo)
  })

  it('a inteligência básica atira na PRIMEIRA passagem por cima da nave parada', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    // O cenário do relato: ela parou a nave embaixo e o inimigo passou por cima
    // três vezes sem atirar. A recarga só descia DENTRO da coluna, e patrulhando
    // a 2 px por quadro ele fica alinhado ~28 quadros contra uma cadência de 90:
    // precisava de QUATRO passagens (medido: 602 quadros, 10 segundos).
    const t = api.createSmartEnemyType({ smart: 'basica' })
    const inimigo = api.spawnEnemy(t, 60, 30) as Sprite
    const nave = api.createSprite({ x: 188, y: 250, w: 24, h: 24 })
    const coluna = (t.config.w + nave.w) / 2
    let passagens = 0
    let dentroAntes = false
    let quadroDoTiro = -1
    for (let q = 1; q <= 1800; q += 1) {
      api.updateEnemyType(t, ctx, nave)
      const dentro = Math.abs(nave.x + nave.w / 2 - (inimigo.x + inimigo.w / 2)) <= coluna
      if (dentro && !dentroAntes) passagens += 1
      dentroAntes = dentro
      if (t.bullets.items.length > 0) {
        quadroDoTiro = q
        break
      }
    }
    expect(quadroDoTiro).toBeGreaterThan(0)
    expect(passagens).toBe(1) // na PRIMEIRA vez que passou por cima dela
    expect(quadroDoTiro).toBeLessThan(120) // e em menos de 2 segundos
    expect(t.bullets.items[0]?.vx).toBe(0) // tiro reto para baixo
  })

  it('o aviso do raio já nasce ACESO (o pisca começava apagado por 5 quadros)', () => {
    const api = load()
    const { ctx, rects } = recordingCtx()
    const t = api.createEnemyType({ behavior: 'raio', w: 20, h: 20, color: '#f00' })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    const e = api.spawnEnemy(t, 100, 40) as Sprite
    api.updateEnemyType(t, ctx, null)
    expect(e._beamPhase).toBe(1) // avisando
    const riscoNoQuadro = () => {
      rects.length = 0
      api.drawEnemyType(ctx, t)
      // O risco do aviso tem 2 de largura; o corpo do inimigo tem 20.
      return rects.some((r) => r[2] === 2)
    }
    expect(riscoNoQuadro()).toBe(true) // 1º quadro do aviso: ela JÁ vê
    for (let i = 0; i < 8; i += 1) api.updateEnemyType(t, ctx, null)
    expect(riscoNoQuadro()).toBe(false) // e então pisca
    for (let i = 0; i < 8; i += 1) api.updateEnemyType(t, ctx, null)
    expect(riscoNoQuadro()).toBe(true)
  })

  it('o buff do chefão não ENGOLE o golpe que o inimigo levou antes do 1º update', () => {
    const api = load()
    const ctx = fakeCtx()
    const t = api.createEnemyType({ behavior: 'parado', hp: 3 })
    const e = api.spawnEnemy(t, 50, 50) as Sprite
    api.changeHealth(e, -1) // a criança acertou um tiro ANTES de o update rodar
    const golpes: number[] = []
    api.onEnemyHurt(t, (s) => golpes.push(s.hp ?? 0))
    api.addEnemyTypeBehavior(t, 'chefao')
    api.updateEnemyType(t, ctx, null)
    // Teto 3 vira 15, e ele carrega o dano que já tinha: 14/15, não 15/15.
    expect(e.hpMax).toBe(15)
    expect(e.hp).toBe(14)
    expect(golpes).toEqual([14]) // o "quando levar dano" rodou, uma vez
    // Sem golpe nenhum, o buff NÃO inventa evento.
    const t2 = api.createEnemyType({ behavior: 'parado', hp: 3 })
    const e2 = api.spawnEnemy(t2, 50, 50) as Sprite
    const golpes2: number[] = []
    api.onEnemyHurt(t2, (s) => golpes2.push(s.hp ?? 0))
    api.addEnemyTypeBehavior(t2, 'chefao')
    api.updateEnemyType(t2, ctx, null)
    expect(e2.hp).toBe(15)
    expect(golpes2).toEqual([])
  })

  it('o aviso do raio sem dano PARA quando ela liga o bloco, e VOLTA se ele sair', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const ctx = fakeCtx()
      const t = api.createEnemyType({ behavior: 'raio' })
      const nave = api.createSprite({ x: 10, y: 10, w: 10, h: 10 })
      api.spawnEnemy(t, 100, 40)
      const conta = () =>
        warn.mock.calls.filter((c) => String(c[0]).includes('Para cada raio do tipo')).length
      // Ela CONFERE todo quadro: o contador zera e o aviso nunca aparece.
      for (let i = 0; i < 400; i += 1) {
        api.updateEnemyType(t, ctx, nave)
        api.drawEnemyType(ctx, t)
        api.overlapEnemyBeams(
          () => nave,
          t,
          () => {},
        )
      }
      expect(conta()).toBe(0)
      // Tirou o bloco na fase 2: o contador volta a andar e o aviso sai.
      for (let i = 0; i < 400; i += 1) {
        api.updateEnemyType(t, ctx, nave)
        api.drawEnemyType(ctx, t)
      }
      expect(conta()).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('overlapEnemyBeams sobrevive à criança REMOVENDO o dono dentro do bloco', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'raio', w: 20, h: 20 })
    api.setEnemyTypeParam(t, 'cadencia', 1)
    const a = api.spawnEnemy(t, 100, 40) as Sprite
    const b = api.spawnEnemy(t, 100, 60) as Sprite
    const nave = api.createSprite({ x: 100, y: 250, w: 20, h: 20 })
    for (let i = 0; i < 62; i += 1) api.updateEnemyType(t, ctx, nave)
    expect(a._beamPhase).toBe(2)
    expect(b._beamPhase).toBe(2)
    const donos: Sprite[] = []
    api.overlapEnemyBeams(
      () => nave,
      t,
      (dono) => {
        donos.push(dono)
        api.removeFromGroup(t, dono) // "sumir com o chefão quando ele acertar"
      },
    )
    // Cada feixe acertou uma vez; ninguém foi pulado nem contado duas vezes.
    expect(donos.length).toBe(2)
    expect(new Set(donos).size).toBe(2)
    expect(t.items.length).toBe(0)
  })

  it('sprite que entrou pelo "Pôr no grupo" ganha casa (o rondador não o manda para o NaN)', () => {
    const api = load()
    const ctx = fakeCtx()
    const t = api.createEnemyType({ behavior: 'rondador', w: 20, h: 20 })
    const adotado = api.createSprite({ x: 120, y: 80, w: 20, h: 20 })
    api.addToGroup(t, adotado)
    for (let i = 0; i < 30; i += 1) api.updateEnemyType(t, ctx, null)
    expect(Number.isFinite(adotado.x)).toBe(true)
    expect(Number.isFinite(adotado.y)).toBe(true)
    // Ele orbita a casa dele (onde foi adotado), não a origem da tela.
    expect(Math.abs(adotado.x - 120)).toBeLessThan(200)
  })

  it('velocidade de tiro zero é RECUSADA com aviso (o tiro nasceria parado em cima dele)', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const t = api.createEnemyType({ behavior: 'atirador' })
      const antes = t.config.shotSpeed
      api.setEnemyTypeParam(t, 'tiro', 0)
      expect(t.config.shotSpeed).toBe(antes)
      const calls = warn.mock.calls.filter((c) => String(c[0]).includes('velocidade do tiro'))
      expect(calls.length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('a ULTRA já nasce com o tiro rápido, senão seria a avançada com outro nome', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const ultra = api.createSmartEnemyType({ smart: 'ultra' })
    const rei = api.createSmartEnemyType({ smart: 'rei' })
    const avancada = api.createSmartEnemyType({ smart: 'avancada' })
    expect(ultra.config.shotSpeed).toBe(8)
    expect(rei.config.shotSpeed).toBe(8)
    expect(avancada.config.shotSpeed).toBe(4) // a de sempre
    // E com esse tiro a mira ADIANTA de verdade. O alvo fica bem ABAIXO andando
    // para o lado: mira direta daria um tiro reto (vx 0), então qualquer vx é
    // adiantamento (o alvo NÃO está na linha de fogo).
    api.setEnemyTypeParam(ultra, 'cadencia', 1)
    api.spawnEnemy(ultra, 200, 40)
    const nave = api.createSprite({ x: 200, y: 200, w: 20, h: 20, vx: 6, vy: 0 })
    api.updateEnemyType(ultra, ctx, nave)
    const tiro = ultra.bullets.items[0]
    expect(tiro).toBeTruthy()
    expect(tiro?.vy).toBeGreaterThan(0)
    expect(tiro?.vx).toBeGreaterThan(0) // saiu na FRENTE da nave
    // Mesma cena com o tiro lento de fábrica: adiantar é impossível (a nave anda
    // a 6, a bala a 4), então ele mira direto em vez de atirar para trás.
    const lento = api.createEnemyType({ behavior: 'atirador-esperto', w: 20, h: 20 })
    api.setEnemyTypeParam(lento, 'cadencia', 1)
    api.spawnEnemy(lento, 200, 40)
    api.updateEnemyType(lento, ctx, nave)
    const tiroLento = lento.bullets.items[0]
    expect(tiroLento).toBeTruthy()
    expect(tiroLento?.vx).toBe(0)
    expect(tiroLento?.vy).toBeGreaterThan(0)
  })
})

/**
 * Quinto full review (07/08). A rodada olhou a correção do atirador alinhado
 * (que veio de um relato de JOGO, não de teste) e a leva de copy do dano por
 * ataque.
 */
describe('correções do quinto full review', () => {
  it('o atirador alinhado nasce CARREGADO (a folga dele é a coluna, não um relógio)', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    // Os dois testes que já existiam passariam também com o contador nascendo em
    // "cadencia": num deles a nave só chega depois de 100 quadros, no outro o
    // inimigo leva 70 quadros andando até a coluna. Quem prova a escolha é o
    // inimigo que JÁ NASCE alinhado: se ele esperar, o contador nasceu cheio.
    const t = api.createEnemyType({ behavior: 'atirador-alinhado', w: 20, h: 20 })
    api.setEnemyTypeParam(t, 'cadencia', 90)
    api.spawnEnemy(t, 100, 40)
    const nave = api.createSprite({ x: 100, y: 250, w: 20, h: 20 })
    api.updateEnemyType(t, ctx, nave)
    expect(t.bullets.items.length).toBe(1)
  })

  it('nenhuma recarga fica escondida atrás de uma condição de POSIÇÃO', () => {
    // A CLASSE do defeito que ela relatou jogando, não o caso: o `return` de
    // "fora da coluna" vinha ANTES do decremento, então o relógio da recarga só
    // andava durante o alinhamento e o inimigo passava por cima da nave sem
    // atirar. Um comportamento novo que gateie por distância e repita o erro
    // continua ATIRANDO (só que tarde), então nenhum teste de comportamento o
    // pega: a rede tem que ser sobre a FORMA do código.
    //
    // ⚠️ Os nomes saem da TABELA, não de um padrão de nome: comportamento novo
    // entra aqui sozinho, batizado como for.
    const tabela = gameTwoDRuntime.slice(
      gameTwoDRuntime.indexOf('var ENEMY_BEHAVIORS = {'),
      gameTwoDRuntime.indexOf('\n  };', gameTwoDRuntime.indexOf('var ENEMY_BEHAVIORS = {')),
    )
    const nomes = [...new Set([...tabela.matchAll(/(?:act|move):\s*(\w+)/g)].map((m) => m[1]))]
    expect(nomes.length, 'anti-vácuo: tabela de comportamentos não lida').toBeGreaterThan(15)

    const semCorpo: string[] = []
    const infratores: string[] = []
    let comContador = 0
    for (const nome of nomes) {
      const at = gameTwoDRuntime.indexOf(`  function ${nome}(`)
      if (at < 0) {
        semCorpo.push(String(nome))
        continue
      }
      const corpo = gameTwoDRuntime.slice(at, gameTwoDRuntime.indexOf('\n  }\n', at))
      // Contador = campo do sprite que DESCE um por quadro. Pela forma, não pelo
      // nome, senão um `_recarga` novo escaparia da rede.
      const contador = /s\.(_\w+)\s*(?:-=\s*1|--)/.exec(corpo)
      if (!contador) continue
      comContador += 1
      for (const linha of corpo.slice(0, contador.index).split('\n')) {
        if (!/\breturn\b/.test(linha)) continue
        // Única saída permitida antes do relógio: sem alvo, não há o que fazer.
        if (/if \(!(t|target|env\.target)\) return;/.test(linha.trim())) continue
        infratores.push(`${nome}: ${linha.trim()}`)
      }
    }
    expect(semCorpo, 'comportamento da tabela sem função no runtime').toEqual([])
    expect(comContador, 'anti-vácuo: nenhum contador encontrado').toBeGreaterThan(5)
    expect(infratores).toEqual([])
  })
})

/**
 * ⭐ O defeito que ela achou JOGANDO, na segunda rodada de relato: o inimigo
 * alinhado atirava "meio para o lado" e a bala descia paralela à nave parada.
 *
 * ⚠️ E a lição de teste que veio com ele: TODOS os testes do atirador alinhado
 * asseriam que uma bala NASCEU, nenhum que ela ACERTOU. Por isso o defeito
 * atravessou três reviews. Aqui a asserção é o acerto.
 */
describe('o tiro do alinhado tem que ACERTAR, não só sair', () => {
  /** Solta a bala e acompanha a queda até ela encostar (ou passar) na nave. */
  function acertou(api: Api, ctx: unknown, t: EnemyType, nave: Sprite): boolean {
    let bateu = false
    for (let q = 0; q < 200 && !bateu; q += 1) {
      api.updateEnemyType(t, ctx, nave)
      api.overlapEnemyShots(
        () => nave,
        t,
        () => {
          bateu = true
        },
      )
      if (t.bullets.items.length === 0 && q > 0) break // a bala já saiu de cena
    }
    return bateu
  }

  const cena = (api: Api, naveX: number) => {
    const t = api.createEnemyType({ behavior: 'atirador-alinhado', w: 20, h: 20, dmg: 1 })
    api.setEnemyTypeParam(t, 'cadencia', 999) // uma bala só, para medir aquela bala
    api.spawnEnemy(t, 100, 40) // centro em x = 110
    const nave = api.createSprite({ x: naveX, y: 250, w: 20, h: 20 })
    return { t, nave }
  }

  it('acerta a nave parada em TODO o corredor, do centro às duas beiradas', () => {
    // Corredor = meia caixa da nave (10) + raio da bala (4) = 14 a partir do
    // centro do inimigo (110), ou seja, centro da nave de 96 a 124 (exclusive).
    // ⚠️ As DUAS beiradas de verdade: 87 põe o centro em 97 (13 à esquerda) e 113
    // põe em 123 (13 à direita). A primeira versão deste teste ia só até 10 à
    // esquerda e o nome prometia as duas pontas: metade do `if` nunca rodava, que
    // é a mesma classe que o 2º review já tinha pegado nos comportamentos.
    for (const naveX of [87, 90, 100, 110, 113]) {
      const api = load()
      const ctx = fakeCtx(400, 300)
      const { t, nave } = cena(api, naveX)
      expect(acertou(api, ctx, t, nave), `nave em x=${naveX}: a bala não acertou`).toBe(true)
    }
  })

  it('nenhum atirador escreve o raio da bala na mão (é isso que desalinha a mira)', () => {
    // ⭐ O defeito de origem foi haver DOIS números para a mesma coisa: o tamanho
    // da bala e a régua do disparo. Agora os dois saem de ENEMY_SHOT_R, e este
    // teste impede que um atirador novo volte a escrever o número solto: a bala
    // ficaria de um tamanho e a mira mediria outro, em silêncio.
    // Escopado ao módulo dos inimigos: um literal legítimo noutro domínio do
    // runtime não tem que reprovar aqui (teste que acusa vizinho é teste que
    // alguém afrouxa depois).
    const literais = [...gameTwoDEnemiesRuntime.matchAll(/radius:\s*\d/g)].map((m) => m[0])
    const spawns = [...gameTwoDEnemiesRuntime.matchAll(/radius:\s*[^,\n]+/g)].map((m) =>
      m[0].trim(),
    )
    expect(spawns.length, 'anti-vácuo: nenhum spawn de bala lido').toBeGreaterThan(4)
    expect(literais).toEqual([])
  })

  it('a bala desce RETA, nunca em diagonal (é o que ela pediu)', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    // Na beirada do corredor é onde uma mira "ajudada" apareceria: se alguém der
    // um vx à bala para fechar a conta, o teste de acerto acima continuaria
    // passando e a promessa de "atira para baixo" cairia em silêncio.
    const { t, nave } = cena(api, 113)
    api.updateEnemyType(t, ctx, nave)
    const tiro = t.bullets.items[0]
    expect(tiro).toBeTruthy()
    expect(tiro?.vx).toBe(0)
    expect(tiro?.vy).toBeGreaterThan(0)
  })

  it('fora do corredor ele NÃO gasta bala (a régua velha atirava e errava sempre)', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    // Centro da nave em 127: 17 do centro do inimigo. A régua antiga era a
    // sobreposição dos sprites ((20+20)/2 = 20), então ela liberava o tiro aqui
    // e a bala (de 106 a 114) descia inteira ao lado da nave (117 a 137).
    const { t, nave } = cena(api, 117)
    for (let q = 0; q < 60; q += 1) api.updateEnemyType(t, ctx, nave)
    expect(t.bullets.items.length).toBe(0)
  })

  it('o corredor segue a CAIXA de colisão, não o desenho', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const { t, nave } = cena(api, 113) // 13 de desalinhamento: acerta com a caixa cheia
    api.setHitboxScale(nave, 50) // caixa de 10 => corredor cai para 5 + 4 = 9
    for (let q = 0; q < 60; q += 1) api.updateEnemyType(t, ctx, nave)
    expect(t.bullets.items.length).toBe(0)
    // ⚠️ Anti-vácuo, no mesmo teste: sem esta metade, quebrar o disparo por
    // inteiro faria o "não atirou" passar como se fosse a caixa reduzida agindo.
    // Alinhado, com a MESMA caixa reduzida, ele atira e acerta.
    const api2 = load()
    const ctx2 = fakeCtx(400, 300)
    const cena2 = cena(api2, 100) // centro da nave em 110, alinhado
    api2.setHitboxScale(cena2.nave, 50)
    expect(acertou(api2, ctx2, cena2.t, cena2.nave)).toBe(true)
  })
})

/**
 * O espelho horizontal do alinhado: a TORRE de lado. Pedido dela depois de
 * medirmos que o alinhado confere só a coluna.
 *
 * ⭐ A forma destes testes vem da lição do lote passado: cobrar o ACERTO, não o
 * nascimento da bala. Foi o que deixou passar, por três reviews, um atirador que
 * disparava sem ter como acertar.
 */
describe('atirador de lado (a torre)', () => {
  /** Solta a bala e acompanha o voo até ela encostar na nave. */
  function acertouDeLado(api: Api, ctx: unknown, t: EnemyType, nave: Sprite): boolean {
    let bateu = false
    for (let q = 0; q < 300 && !bateu; q += 1) {
      api.updateEnemyType(t, ctx, nave)
      api.overlapEnemyShots(
        () => nave,
        t,
        () => {
          bateu = true
        },
      )
      if (t.bullets.items.length === 0 && q > 0) break
    }
    return bateu
  }

  /** Inimigo parado no meio do palco: centro em (110, 150). */
  const torre = (api: Api, naveX: number, naveY: number) => {
    const t = api.createEnemyType({ behavior: 'atirador-lado', w: 20, h: 20, dmg: 1 })
    api.setEnemyTypeParam(t, 'cadencia', 999) // uma bala só, para medir aquela bala
    api.spawnEnemy(t, 100, 140)
    const nave = api.createSprite({ x: naveX, y: naveY, w: 20, h: 20 })
    return { t, nave }
  }

  it('acerta dos DOIS lados, em toda a faixa de altura', () => {
    // Corredor = meia caixa da nave (10) + raio da bala (4) = 14 a partir do
    // centro do inimigo (150). ⚠️ `naveY` é o TOPO dela, e o centro é naveY + 10:
    // a faixa é naveY de 127 a 153 (as duas beiradas inclusas aqui).
    for (const naveY of [127, 134, 140, 146, 153]) {
      for (const naveX of [20, 300]) {
        const api = load()
        const ctx = fakeCtx(400, 300)
        const { t, nave } = torre(api, naveX, naveY)
        expect(
          acertouDeLado(api, ctx, t, nave),
          `nave em (${naveX}, ${naveY}): a bala não acertou`,
        ).toBe(true)
      }
    }
  })

  it('a bala vai RETA na horizontal, e a gravidade do mundo não a entorta', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    api.setGravity(0.6)
    const esquerda = torre(api, 20, 153) // beirada da faixa, onde uma mira "ajudada" apareceria
    api.updateEnemyType(esquerda.t, ctx, esquerda.nave)
    const tiroE = esquerda.t.bullets.items[0]
    expect(tiroE).toBeTruthy()
    expect(tiroE?.vx).toBeLessThan(0)
    // ⚠️ Conferir o `vy` só no quadro do disparo não prova nada sobre a gravidade,
    // que agiria DURANTE o voo. A primeira versão deste teste ligava a gravidade e
    // media antes de a bala andar. Agora acompanha o voo: a altura tem que ficar
    // CONGELADA do começo ao fim.
    const alturaInicial = tiroE?.y
    for (let q = 0; q < 40; q += 1) api.updateEnemyType(esquerda.t, ctx, esquerda.nave)
    expect(tiroE?.vy).toBe(0)
    expect(tiroE?.y).toBe(alturaInicial)
    expect(tiroE?.x).toBeLessThan(110) // andou para a esquerda de verdade

    const api2 = load()
    const direita = torre(api2, 300, 127)
    api2.updateEnemyType(direita.t, ctx, direita.nave)
    const tiroD = direita.t.bullets.items[0]
    expect(tiroD?.vy).toBe(0)
    expect(tiroD?.vx).toBeGreaterThan(0)
  })

  it('fora da faixa de altura ele NÃO gasta bala', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    // Mesma coluna do inimigo, mas 17 acima do centro dele: dentro da coluna
    // (que é assunto do irmão vertical) e FORA da faixa de altura.
    const { t, nave } = torre(api, 100, 123)
    for (let q = 0; q < 60; q += 1) api.updateEnemyType(t, ctx, nave)
    expect(t.bullets.items.length).toBe(0)
  })

  it('a faixa segue a CAIXA de colisão, não o desenho', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const { t, nave } = torre(api, 300, 152) // 12 de desalinhamento: acerta com a caixa cheia
    api.setHitboxScale(nave, 50) // caixa de 10 => faixa cai para 5 + 4 = 9
    for (let q = 0; q < 60; q += 1) api.updateEnemyType(t, ctx, nave)
    expect(t.bullets.items.length).toBe(0)
    // Anti-vácuo no mesmo teste: com a MESMA caixa reduzida, alinhado, acerta.
    const api2 = load()
    const ctx2 = fakeCtx(400, 300)
    const alinhado = torre(api2, 300, 140)
    api2.setHitboxScale(alinhado.nave, 50)
    expect(acertouDeLado(api2, ctx2, alinhado.t, alinhado.nave)).toBe(true)
  })

  it('a torre PARADA encara o lado de quem ela mira', () => {
    // ⚠️ O caso que fez o facing fugir da convenção dos irmãos: com "parado" o
    // hasXDriver é verdadeiro, e seguir a convenção deixaria o sprite olhando
    // para um lado e atirando para o outro.
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'parado', w: 20, h: 20 })
    api.addEnemyTypeBehavior(t, 'atirador-lado')
    const torreSprite = api.spawnEnemy(t, 100, 140) as Sprite
    torreSprite.facing = 1 // nasce olhando para a direita
    api.updateEnemyType(t, ctx, api.createSprite({ x: 20, y: 145, w: 20, h: 20 }))
    expect(torreSprite.facing).toBe(-1) // virou para a esquerda, de onde vem o alvo
    expect(t.bullets.items[0]?.vx).toBeLessThan(0)
  })

  it('somado ao irmão vertical, o inimigo cobre uma CRUZ com contadores próprios', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'atirador-alinhado', w: 20, h: 20 })
    api.addEnemyTypeBehavior(t, 'atirador-lado')
    api.setEnemyTypeParam(t, 'cadencia', 10)
    api.spawnEnemy(t, 100, 140) // centro (110, 150)
    // Alvo na coluna E na altura ao mesmo tempo (bem em cima dele): as DUAS ações
    // disparam no mesmo quadro, cada uma com o seu contador.
    const emCima = api.createSprite({ x: 100, y: 140, w: 20, h: 20 })
    api.updateEnemyType(t, ctx, emCima)
    expect(t.bullets.items.length).toBe(2)
    const [a, b] = t.bullets.items as [Sprite, Sprite]
    // Um desce/sobe reto, o outro vai reto para o lado.
    expect([a, b].filter((s) => s.vx === 0).length).toBe(1)
    expect([a, b].filter((s) => s.vy === 0).length).toBe(1)
    // Cadência cheia respeitada: 10 quadros depois, mais DOIS.
    for (let q = 0; q < 10; q += 1) api.updateEnemyType(t, ctx, emCima)
    expect(t.bullets.items.length).toBe(4)
  })

  it('cada uma das duas ações tem o SEU contador (uma não gasta a recarga da outra)', () => {
    // ⚠️ O teste acima chamava isso de "contadores próprios" e não provava: com o
    // alvo nas duas faixas, os dois disparam juntos e um contador único daria o
    // mesmo resultado. A prova é gastar SÓ um dos dois e ver o outro pronto.
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'atirador-alinhado', w: 20, h: 20 })
    api.addEnemyTypeBehavior(t, 'atirador-lado')
    api.setEnemyTypeParam(t, 'cadencia', 30)
    api.spawnEnemy(t, 100, 140) // centro (110, 150)

    // Fase 1: alvo só na faixa de ALTURA (longe na horizontal). Só o de lado atira,
    // e ele queima a recarga DELE.
    const doLado = api.createSprite({ x: 300, y: 140, w: 20, h: 20 })
    for (let q = 0; q < 20; q += 1) api.updateEnemyType(t, ctx, doLado)
    expect(t.bullets.items.length).toBe(1) // um tiro só: o lateral, no quadro 1
    expect(t.bullets.items[0]?.vy).toBe(0) // e foi o horizontal mesmo

    // Fase 2: o alvo aparece na COLUNA (e sai da faixa de altura). O vertical nunca
    // gastou nada, então dispara NO PRIMEIRO quadro, sem esperar a recarga do irmão.
    const naColuna = api.createSprite({ x: 100, y: 250, w: 20, h: 20 })
    api.updateEnemyType(t, ctx, naColuna)
    expect(t.bullets.items.length).toBe(2)
    expect(t.bullets.items[1]?.vx).toBe(0) // o novo é o vertical
  })
})

/**
 * ⭐ Nenhum teste levava um VALOR de dropdown pela Ponte de volta. A cadeia é
 * fechada por construção (o parser lê o enum, e o drift garante que o menu tenha
 * o enum inteiro), mas "fechada por construção" foi exatamente o que eu disse do
 * atirador alinhado antes dos dois defeitos que ela achou jogando.
 *
 * Um comportamento que o parser recusasse cairia em `rawJS`: o jogo continuaria
 * rodando e a Ponte devolveria um bloco de "código avançado" no lugar do bloco de
 * inimigo. Verde em tudo, e a criança perdendo o bloco dela ao abrir o projeto.
 */
describe('todo comportamento volta pela Ponte (código → blocos)', () => {
  it('nenhum dos comportamentos do menu cai em rawJS', () => {
    const rejeitados: string[] = []
    for (const [, valor] of GAME_TWO_D_ENEMY_BEHAVIOR_OPTIONS) {
      const codigo = `const bicho = SZGame2D.createEnemyType({ behavior: "${valor}", color: "#e4573d", image: "", shape: "", hp: 3, speed: 2, dmg: 1, w: 32, h: 32 });`
      const ir = parseJS(codigo) as Array<{ type?: string; behavior?: string }>
      const nó = ir[0]
      if (nó?.type !== 'g2d:defineEnemyType' || nó.behavior !== valor) {
        rejeitados.push(`${valor} -> ${nó?.type ?? 'nada'}`)
      }
    }
    expect(GAME_TWO_D_ENEMY_BEHAVIOR_OPTIONS.length).toBeGreaterThan(20) // anti-vácuo
    expect(rejeitados).toEqual([])
  })

  it('o "também é" também volta, para todos', () => {
    const rejeitados: string[] = []
    for (const [, valor] of GAME_TWO_D_ENEMY_BEHAVIOR_OPTIONS) {
      const ir = parseJS(`SZGame2D.addEnemyTypeBehavior(bicho, "${valor}");`) as Array<{
        type?: string
        behavior?: string
      }>
      const nó = ir[0]
      if (nó?.type !== 'g2d:enemyAddBehavior' || nó.behavior !== valor) {
        rejeitados.push(`${valor} -> ${nó?.type ?? 'nada'}`)
      }
    }
    expect(rejeitados).toEqual([])
  })
})

/**
 * ⭐ A VISTA de todos os inimigos ("Criar o grupo ... com os inimigos de todos os
 * tipos"). Ela existe porque o atalho manual (um grupo comum + "Pôr o sprite no
 * grupo" a cada nascimento) VAZA: a morte tira o inimigo do TIPO e não do grupo
 * dela, e o morto segue colidindo para sempre. Por isso a vista é DERIVADA dos
 * tipos, não uma cópia mantida em sincronia.
 */
describe('o grupo com os inimigos de TODOS os tipos', () => {
  const cena = (api: Api) => {
    const a = api.createEnemyType({ behavior: 'parado', w: 20, h: 20, hp: 1 })
    const b = api.createEnemyType({ behavior: 'parado', w: 20, h: 20, hp: 1 })
    const todos = api.createAllEnemiesGroup()
    return { a, b, todos }
  }

  it('mostra os inimigos dos dois tipos, e some com quem morre NO MESMO quadro', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const { a, b, todos } = cena(api)
    expect(api.countGroup(todos)).toBe(0)
    const e1 = api.spawnEnemy(a, 40, 40) as Sprite
    api.spawnEnemy(b, 80, 40)
    expect(api.countGroup(todos)).toBe(2) // um de cada tipo, sem bloco de sincronia
    // ⭐ O caso do vazamento: mata um e a vista tem que perder o morto no MESMO
    // quadro em que o tipo perde. (No atalho manual ele ficaria para sempre.)
    api.changeHealth(e1, -1)
    api.updateEnemyType(a, ctx, null)
    expect(a.items.length).toBe(0)
    expect(api.countGroup(todos)).toBe(1)
  })

  it('uma colisão contra a vista NÃO acerta inimigo morto', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const { a, todos } = cena(api)
    const morto = api.spawnEnemy(a, 100, 100) as Sprite
    const nave = api.createSprite({ x: 100, y: 100, w: 20, h: 20 })
    api.changeHealth(morto, -1)
    api.updateEnemyType(a, ctx, null) // remove o derrotado
    const acertos: Sprite[] = []
    api.overlapSpriteGroup(
      () => nave,
      todos,
      (s) => acertos.push(s),
    )
    expect(acertos).toEqual([])
  })

  it('pega o sprite ADOTADO por "Pôr o sprite no grupo ⟨tipo⟩"', () => {
    const api = load()
    const { a, todos } = cena(api)
    const adotado = api.createSprite({ x: 10, y: 10, w: 20, h: 20 })
    api.addToGroup(a, adotado)
    // Uma sincronia feita no spawn perderia este; a vista derivada não.
    expect(api.countGroup(todos)).toBe(1)
  })

  it('esvaziar a vista esvazia TODOS os tipos (o limpar a fase)', () => {
    const api = load()
    const { a, b, todos } = cena(api)
    api.spawnEnemy(a, 40, 40)
    api.spawnEnemy(b, 80, 40)
    api.clearGroup(todos)
    expect(a.items.length).toBe(0)
    expect(b.items.length).toBe(0)
    expect(api.countGroup(todos)).toBe(0)
  })

  it('tirar da vista tira do tipo que contém aquele inimigo', () => {
    const api = load()
    const { a, b, todos } = cena(api)
    api.spawnEnemy(a, 40, 40)
    const doB = api.spawnEnemy(b, 80, 40) as Sprite
    api.removeFromGroup(todos, doB)
    expect(a.items.length).toBe(1)
    expect(b.items.length).toBe(0)
    expect(api.countGroup(todos)).toBe(1)
  })

  it('podar a vista poda cada tipo, chamando o corpo por sprite', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const { a, b, todos } = cena(api)
    const fora1 = api.spawnEnemy(a, -400, 40) as Sprite
    const fora2 = api.spawnEnemy(b, 900, 40) as Sprite
    fora1.vx = -8 // "saiu" = fora E se afastando
    fora2.vx = 8
    api.spawnEnemy(a, 100, 100) // este fica
    const saíram: Sprite[] = []
    api.pruneOffscreen(ctx, todos, 40, (s) => saíram.push(s))
    expect(saíram.length).toBe(2)
    expect(api.countGroup(todos)).toBe(1)
  })

  it('avisa e NÃO faz nada no que não tem sentido na vista', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const { a, todos } = cena(api)
      const e = api.spawnEnemy(a, 100, 100) as Sprite
      const xAntes = e.x
      const vyAntes = e.vy

      api.updateGroup(todos) // moveria de novo
      api.applyGravityToGroup(todos) // gravidade dobrada
      api.addToGroup(todos, api.createSprite({ x: 0, y: 0, w: 10, h: 10 }))
      api.bringToFront(todos, e)

      expect(e.x).toBe(xAntes)
      expect(e.vy).toBe(vyAntes)
      expect(api.countGroup(todos)).toBe(1) // o addToGroup não entrou
      const avisos = warn.mock.calls.map((c) => String(c[0]))
      expect(avisos.filter((t) => t.includes('atualizar o grupo')).length).toBe(1)
      expect(avisos.filter((t) => t.includes('aplicar a gravidade')).length).toBe(1)
      expect(avisos.filter((t) => t.includes('por um sprite no grupo')).length).toBe(1)
      expect(avisos.filter((t) => t.includes('a ordem de desenho')).length).toBe(1)
      // Cada um avisa UMA vez, mesmo insistindo.
      api.updateGroup(todos)
      expect(avisos.filter((t) => t.includes('atualizar o grupo')).length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('a lista só é remontada quando a composição muda (leitura barata)', () => {
    const api = load()
    const { a, todos } = cena(api)
    api.spawnEnemy(a, 40, 40)
    const primeira = todos.items
    // Nada mudou: a mesma lista volta (sem remontar por leitura).
    expect(todos.items).toBe(primeira)
    api.spawnEnemy(a, 60, 40)
    expect(todos.items).not.toBe(primeira) // mudou a composição, remontou
  })

  it('não atrapalha quem NÃO usa a vista (os blocos por tipo seguem iguais)', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const t = api.createEnemyType({ behavior: 'patrulha', w: 20, h: 20, speed: 3 })
    const e = api.spawnEnemy(t, 100, 100) as Sprite
    for (let q = 0; q < 5; q += 1) api.updateEnemyType(t, ctx, null)
    const semVista = e.x
    // Agora o MESMO cenário com a vista criada por cima: o tipo anda igual.
    const api2 = load()
    const ctx2 = fakeCtx(400, 300)
    const t2 = api2.createEnemyType({ behavior: 'patrulha', w: 20, h: 20, speed: 3 })
    api2.createAllEnemiesGroup()
    const e2 = api2.spawnEnemy(t2, 100, 100) as Sprite
    for (let q = 0; q < 5; q += 1) api2.updateEnemyType(t2, ctx2, null)
    expect(e2.x).toBe(semVista)
  })

  it('volta pela Ponte (código → blocos)', () => {
    const ir = parseJS('const todos = SZGame2D.createAllEnemiesGroup();') as Array<{
      type?: string
      varName?: string
    }>
    expect(ir[0]?.type).toBe('g2d:allEnemiesGroup')
    expect(ir[0]?.varName).toBe('todos')
  })
})

/**
 * Nono full review, sobre a VISTA. O achado principal: a lista dela era um array
 * cru devolvido por referência, então QUALQUER helper com `group.items.push`
 * escrevia no cache — "Criar tiro no grupo", "Criar um sprite no grupo", os
 * spawns dos kits. Seis criadores, e a lista dos que existiriam no futuro.
 */
describe('a vista se defende sozinha (nono review)', () => {
  const cena = (api: Api) => {
    const t = api.createEnemyType({ behavior: 'parado', w: 20, h: 20 })
    const todos = api.createAllEnemiesGroup()
    return { t, todos }
  }

  it('recusa quem tenta EMPURRAR sprite na lista, venha de qual bloco vier', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const { t, todos } = cena(api)
      api.spawnEnemy(t, 40, 40)
      // Os dois criadores mais fáceis de apontar para o grupo errado.
      api.spawnBullet(todos, { x: 10, y: 10, radius: 4, vx: 0, vy: -5 })
      api.spawn(todos, { x: 20, y: 20, w: 10, h: 10 })
      expect(api.countGroup(todos)).toBe(1) // continua sendo só o inimigo de verdade
      expect(t.items.length).toBe(1)
      const avisos = warn.mock.calls.map((c) => String(c[0]))
      expect(avisos.filter((x) => x.includes('mexer na lista')).length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('a defesa não engole método HERDADO de Object.prototype', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const { t, todos } = cena(api)
      api.spawnEnemy(t, 40, 40)
      // ⚠️ Com um objeto literal guardando os métodos mutantes, 'toString',
      // 'valueOf', 'constructor' e 'hasOwnProperty' vêm de Object.prototype,
      // são TRUTHY e existem em Array.prototype: a guarda devolveria o aviso no
      // lugar da função real, e qualquer coerção da lista quebraria em silêncio.
      // É a mesma armadilha que o 1º review pegou neste arquivo.
      const lista = todos.items as unknown as unknown[]
      expect(typeof lista.toString).toBe('function')
      expect(String(lista)).not.toBe('undefined')
      expect(Object.hasOwn(lista, 0)).toBe(true)
      expect(Array.isArray(lista)).toBe(true)
      expect(warn).not.toHaveBeenCalled() // ler não avisa
    } finally {
      warn.mockRestore()
    }
  })

  it('a defesa não atrapalha a LEITURA (é só a mutação que cai)', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const { t, todos } = cena(api)
    api.spawnEnemy(t, 40, 40)
    api.spawnEnemy(t, 80, 40)
    // slice/iteração/length são o que os blocos de grupo usam de verdade.
    expect(todos.items.slice().length).toBe(2)
    expect([...todos.items].length).toBe(2)
    let contados = 0
    api.forEachInGroup(todos, () => {
      contados += 1
    })
    expect(contados).toBe(2)
    api.drawGroupByY(ctx, todos) // ordena uma CÓPIA: não pode cair na defesa
    expect(api.countGroup(todos)).toBe(2)
  })

  it('recusa delete e defineProperty sem corromper a vista', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const { t, todos } = cena(api)
      const enemy = api.spawnEnemy(t, 40, 40)
      if (!enemy) throw new Error('o cenário não conseguiu criar o inimigo de controle')
      expect(api.countGroup(todos)).toBe(1)

      delete todos.items[0]
      expect(() =>
        Object.defineProperty(todos.items, '0', {
          configurable: true,
          enumerable: true,
          value: 'intruso',
          writable: true,
        }),
      ).not.toThrow()

      expect(api.countGroup(todos)).toBe(1)
      expect(todos.items[0]).toBe(enemy)
      expect(t.items[0]).toBe(enemy)
      expect(warn.mock.calls.some((args) => String(args[0]).includes('mexer na lista'))).toBe(true)
    } finally {
      warn.mockRestore()
    }
  })

  it('a ORDEM não importa: a vista criada ANTES dos tipos enxerga todos', () => {
    const api = load()
    // A dica do bloco sugere criar depois dos tipos, mas a vista é derivada:
    // se o contrário quebrasse, a dica seria uma regra escondida.
    const todos = api.createAllEnemiesGroup()
    const a = api.createEnemyType({ behavior: 'parado', w: 20, h: 20 })
    const b = api.createEnemyType({ behavior: 'parado', w: 20, h: 20 })
    api.spawnEnemy(a, 10, 10)
    api.spawnEnemy(b, 20, 20)
    expect(api.countGroup(todos)).toBe(2)
  })

  it('o teto de tipos avisa em vez de sumir com o tipo em silêncio', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const todos = api.createAllEnemiesGroup()
      const tipos = []
      for (let i = 0; i < 70; i += 1) tipos.push(api.createEnemyType({ behavior: 'parado' }))
      // O 70º está fora do registro; sem aviso, a criança veria a colisão
      // simplesmente não acontecer para ele.
      const avisos = warn.mock.calls.map((c) => String(c[0]))
      expect(avisos.filter((x) => x.includes('tipos de inimigo demais')).length).toBe(1)
      const ultimo = tipos[69] as EnemyType
      api.spawnEnemy(ultimo, 10, 10)
      expect(ultimo.items.length).toBe(1) // o tipo funciona
      expect(api.countGroup(todos)).toBe(0) // só não entra na vista
    } finally {
      warn.mockRestore()
    }
  })

  it('desenhar pela VISTA não faz o Console acusar quem está certo', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const ctx = fakeCtx(400, 300)
      const a = api.createEnemyType({ behavior: 'parado', w: 20, h: 20 })
      const b = api.createEnemyType({ behavior: 'parado', w: 20, h: 20 })
      const todos = api.createAllEnemiesGroup()
      api.spawnEnemy(a, 40, 40)
      api.spawnEnemy(b, 80, 40)
      // O jeito que o manual ensina: atualiza cada tipo, desenha UMA vez pela vista.
      for (let q = 0; q < 500; q += 1) {
        api.updateEnemyType(a, ctx, null)
        api.updateEnemyType(b, ctx, null)
        api.drawGroup(ctx, todos)
      }
      // ⚠️ Sem marcar os tipos, o aviso de "ninguém os desenha" dispararia com a
      // tela CHEIA. É o defeito que o 2º review corrigiu, reaberto pelo bloco novo.
      const acusacoes = warn.mock.calls.filter((c) => String(c[0]).includes('ninguém os desenha'))
      expect(acusacoes).toEqual([])
      // E o mesmo pelo desenhar ordenado pela base.
      const api2 = load()
      const ctx2 = fakeCtx(400, 300)
      const c = api2.createEnemyType({ behavior: 'parado', w: 20, h: 20 })
      const todos2 = api2.createAllEnemiesGroup()
      api2.spawnEnemy(c, 40, 40)
      for (let q = 0; q < 500; q += 1) {
        api2.updateEnemyType(c, ctx2, null)
        api2.drawGroupByY(ctx2, todos2)
      }
      expect(warn.mock.calls.filter((x) => String(x[0]).includes('ninguém os desenha'))).toEqual([])
    } finally {
      warn.mockRestore()
    }
  })

  it('duas vistas no mesmo jogo não se atrapalham', () => {
    const api = load()
    const { t, todos } = cena(api)
    const outra = api.createAllEnemiesGroup()
    api.spawnEnemy(t, 40, 40)
    expect(api.countGroup(todos)).toBe(1)
    expect(api.countGroup(outra)).toBe(1)
  })
})

/**
 * ⭐ O manual promete, item por item, o que cada bloco de grupo faz na VISTA:
 * sete funcionam igual, três encaminham para os tipos e quatro avisam. Essa
 * tabela é contrato com a criança, e até aqui parte dela existia só na minha
 * leitura do runtime. Este describe exercita as três famílias inteiras.
 */
describe('a tabela do manual sobre a vista é contrato', () => {
  const cena = (api: Api) => {
    const a = api.createEnemyType({ behavior: 'parado', w: 20, h: 20, hp: 5 })
    const b = api.createEnemyType({ behavior: 'parado', w: 20, h: 20, hp: 5 })
    const todos = api.createAllEnemiesGroup()
    api.spawnEnemy(a, 100, 100)
    api.spawnEnemy(b, 200, 100)
    return { a, b, todos }
  }

  it('os SETE blocos de leitura funcionam igual a qualquer grupo', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const { todos } = cena(api)
    const nave = api.createSprite({ x: 100, y: 100, w: 20, h: 20 })

    // 1) contar
    expect(api.countGroup(todos)).toBe(2)
    // 2) para cada
    let vistos = 0
    api.forEachInGroup(todos, () => {
      vistos += 1
    })
    expect(vistos).toBe(2)
    // 3) colisão sprite × grupo
    const encostou: Sprite[] = []
    api.overlapSpriteGroup(
      () => nave,
      todos,
      (s) => encostou.push(s),
    )
    expect(encostou.length).toBe(1)
    // 4) colisão grupo × grupo
    const meusTiros = api.createGroup()
    api.spawnBullet(meusTiros, { x: 205, y: 105, radius: 4, vx: 0, vy: 0 })
    let pares = 0
    api.overlapGroups(meusTiros, todos, () => {
      pares += 1
    })
    expect(pares).toBe(1)
    // 5 e 6) os dois desenhos não estouram e marcam presença
    api.drawGroup(ctx, todos)
    api.drawGroupByY(ctx, todos)
    // 7) impedir de atravessar: o empurrão acontece de verdade
    const empurrado = api.createSprite({ x: 195, y: 100, w: 20, h: 20 })
    const antes = empurrado.x
    api.collideGroup(empurrado, todos)
    expect(empurrado.x).not.toBe(antes)
  })

  it('os TRÊS encaminhamentos mexem nos tipos, não numa lista de mentira', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    // tirar
    const um = load()
    const c1 = cena(um)
    const alvo = c1.b.items[0] as Sprite
    um.removeFromGroup(c1.todos, alvo)
    expect(c1.b.items.length).toBe(0)
    // podar
    const dois = load()
    const c2 = cena(dois)
    const fugitivo = c2.a.items[0] as Sprite
    fugitivo.x = -500
    fugitivo.vx = -9
    dois.pruneOffscreen(fakeCtx(400, 300), c2.todos, 40)
    expect(c2.a.items.length).toBe(0)
    expect(c2.b.items.length).toBe(1)
    // esvaziar
    const { a, b, todos } = cena(api)
    api.clearGroup(todos)
    expect([a.items.length, b.items.length, api.countGroup(todos)]).toEqual([0, 0, 0])
    expect(ctx).toBeTruthy()
  })

  it('os QUATRO avisos cobrem os dois irmãos de ordem, não só um', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const { todos } = cena(api)
      const algum = todos.items[0] as Sprite
      // ⚠️ O "Mandar para trás" é o irmão do "Trazer para a frente" e nunca tinha
      // sido exercido: a guarda dele foi escrita por simetria, não por teste.
      api.sendToBack(todos, algum)
      const avisos = warn.mock.calls.map((c) => String(c[0]))
      expect(avisos.filter((x) => x.includes('a ordem de desenho')).length).toBe(1)
      // e a lista continua inteira (não reordenou nem perdeu ninguém)
      expect(api.countGroup(todos)).toBe(2)
    } finally {
      warn.mockRestore()
    }
  })
})

/**
 * O perseguidor tem TRÊS modos, e os três são a mesma função com posse de eixo
 * diferente na tabela (`_enemyChaseMove`). Ter uma função por modo seria duas
 * implementações da mesma regra, prontas para divergir no próximo conserto.
 */
describe('os três modos do perseguidor', () => {
  const cena = (api: Api, comportamento: string, alvoX: number, alvoY: number) => {
    const t = api.createEnemyType({ behavior: comportamento, w: 20, h: 20, speed: 3 })
    const e = api.spawnEnemy(t, 100, 100) as Sprite
    const alvo = api.createSprite({ x: alvoX, y: alvoY, w: 20, h: 20 })
    return { t, e, alvo }
  }

  it('cada modo mexe só nos eixos que são dele', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const completo = cena(api, 'perseguidor', 260, 250)
    const lado = cena(api, 'perseguidor-lado', 260, 250)
    const vertical = cena(api, 'perseguidor-vertical', 260, 250)
    for (let q = 0; q < 6; q += 1) {
      api.updateEnemyType(completo.t, ctx, completo.alvo)
      api.updateEnemyType(lado.t, ctx, lado.alvo)
      api.updateEnemyType(vertical.t, ctx, vertical.alvo)
    }
    // completo: anda nos dois
    expect(completo.e.x).toBeGreaterThan(100)
    expect(completo.e.y).toBeGreaterThan(100)
    // de lado: só na horizontal
    expect(lado.e.x).toBeGreaterThan(100)
    expect(lado.e.y).toBe(100)
    // vertical: só na vertical, e sem sair da coluna
    expect(vertical.e.y).toBeGreaterThan(100)
    expect(vertical.e.x).toBe(100)
    expect(vertical.e.vx).toBe(0)
  })

  it('⭐ a consolidação não mudou o perseguidor de lado (medido antes e depois)', () => {
    // A sequência abaixo foi CAPTURADA com a implementação anterior (a função
    // própria `_enemyTrackMove`, hoje removida) antes de a tabela passar a usar o
    // `_enemyChaseMove`. É a prova de que a troca preservou o comportamento
    // quadro a quadro, inclusive o passo curto e o parar sem alvo.
    const api = load()
    const ctx = fakeCtx(400, 300)
    const { t, e, alvo } = cena(api, 'perseguidor-lado', 260, 250)
    const posicoes: number[] = []
    for (let q = 0; q < 6; q += 1) {
      api.updateEnemyType(t, ctx, alvo)
      posicoes.push(e.x)
    }
    expect(posicoes).toEqual([103, 106, 109, 112, 115, 118])
    expect(e.y).toBe(100)
    // Perto do alvo, o passo encurta em vez de passar dele.
    alvo.x = e.x + 1
    api.updateEnemyType(t, ctx, alvo)
    expect(e.x).toBe(119)
    expect(e.vx).toBe(1)
    // Sem alvo, para de vez.
    api.updateEnemyType(t, ctx, null)
    expect(e.x).toBe(119)
    expect(e.vx).toBe(0)
  })

  it('⭐ os dois modos de UM eixo se mexem igual, cada um no seu (simetria)', () => {
    // Os três modos saem da mesma função, então o de lado e o vertical têm que
    // produzir a MESMA sequência de passos em cenários espelhados. Um bug que
    // tratasse um eixo diferente do outro (a classe do `_dir` × `_dirY`, que já
    // morde neste arquivo duas vezes) apareceria só aqui.
    const passos = (comportamento: string, alvoX: number, alvoY: number, eixo: 'x' | 'y') => {
      const api = load()
      const ctx = fakeCtx(400, 300)
      const t = api.createEnemyType({ behavior: comportamento, w: 20, h: 20, speed: 3 })
      const e = api.spawnEnemy(t, 100, 100) as Sprite
      const alvo = api.createSprite({ x: alvoX, y: alvoY, w: 20, h: 20 })
      const seq: number[] = []
      for (let q = 0; q < 8; q += 1) {
        api.updateEnemyType(t, ctx, alvo)
        seq.push(Math.round((e[eixo] - 100) * 100) / 100)
      }
      return seq
    }
    // Alvo a +200 no eixo de cada um: os deslocamentos têm que coincidir.
    expect(passos('perseguidor-lado', 300, 100, 'x')).toEqual(
      passos('perseguidor-vertical', 100, 300, 'y'),
    )
    // E para o lado NEGATIVO também (metade do `if` que ninguém exercita).
    expect(passos('perseguidor-lado', -100, 100, 'x')).toEqual(
      passos('perseguidor-vertical', 100, -100, 'y'),
    )
  })

  it('⭐ o vertical não cai com a gravidade APLICADA ao grupo (o eixo Y é dele)', () => {
    // ⚠️ A 1ª versão deste teste era um VÁCUO: chamava só `setGravity` e afirmava
    // que o inimigo não afundava. Só que gravidade de MUNDO não derruba inimigo
    // nenhum — quem acelera o vy é o bloco "Aplicar a gravidade ao grupo", e sem
    // ele o fallback do Y integra um vy que é ZERO. O teste passava idêntico com
    // o comportamento NÃO sendo dono do Y, ou seja, não provava nada.
    const queda = (comportamento: string) => {
      const api = load()
      const ctx = fakeCtx(400, 300)
      api.setGravity(0.6)
      const t = api.createEnemyType({ behavior: comportamento, w: 20, h: 20, speed: 3 })
      const e = api.spawnEnemy(t, 100, 100) as Sprite
      const alvo = api.createSprite({ x: 100, y: 100, w: 20, h: 20 })
      for (let q = 0; q < 30; q += 1) {
        api.applyGravityToGroup(t) // é o bloco que a criança põe num jogo de plataforma
        api.updateEnemyType(t, ctx, alvo)
      }
      return e.y
    }
    // Alvo na MESMA altura: o dono do Y manda ficar, e a queda acumulada não passa.
    expect(queda('perseguidor-vertical')).toBe(100)
    // Anti-vácuo: quem NÃO é dono do Y afunda no mesmo cenário, até o chão visível
    // (300 - 20 de altura). Sem esta metade, o teste de cima passaria de graça.
    expect(queda('patrulha')).toBe(280)
  })

  it('somado a uma patrulha: ela manda no X, ele no Y', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const { t, e, alvo } = cena(api, 'perseguidor-vertical', 300, 250)
    api.addEnemyTypeBehavior(t, 'patrulha') // o último a somar leva o X
    for (let q = 0; q < 6; q += 1) api.updateEnemyType(t, ctx, alvo)
    expect(e.y).toBeGreaterThan(100) // o vertical segue dono do Y
    // A patrulha anda com a velocidade DELA nos 6 quadros (3 × 6 = 18), para
    // qualquer lado. `not.toBe(100)` passaria com um deslocamento de migalha.
    expect(Math.abs(e.x - 100)).toBe(18)
  })

  it('⭐ a avançada e a ultra NÃO descem em cima do jogador; o rei desce', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    const nave = api.createSprite({ x: 200, y: 260, w: 24, h: 24 })
    const naAltura: Record<string, number> = {}
    for (const nivel of ['avancada', 'ultra', 'rei']) {
      const t = api.createSmartEnemyType({ smart: nivel, w: 20, h: 20 })
      const e = api.spawnEnemy(t, 60, 40) as Sprite
      for (let q = 0; q < 40; q += 1) api.updateEnemyType(t, ctx, nave)
      naAltura[nivel] = e.y
    }
    expect(naAltura.avancada).toBe(40)
    expect(naAltura.ultra).toBe(40)
    expect(naAltura.rei).toBeGreaterThan(40)
  })
})

describe('a pisada tem que MATAR no quadro do contato, não quando o herói sai de cima', () => {
  // ⚠️ Defeito real relatado jogando: "ao pisar em um inimigo ele só morre e faz a
  // animação quando sai de cima dele". O modo `squash` marcava 20 quadros de espera e
  // só então zerava a vida — com quique 5.5 e gravidade 0.42 o herói volta ao mesmo
  // nível em ~26 quadros, então as partículas saíam depois de ele já ter saído.
  // Pior: a contagem não era lida por desenhista nenhum, então o "achatado" que ela
  // pagava com o atraso não existia na tela.
  it('o achatado morre no MESMO quadro, sem espera', () => {
    const api = load()
    const ctx = fakeCtx(400, 300)
    api.setGravity(0.42)
    const t = api.createEnemyType({ behavior: 'patrulha', hp: 3, w: 20, h: 20 })
    const inimigo = api.spawnEnemy(t, 100, 200) as Sprite
    api.setEnemyStompMode(t, 'squash')
    const heroi = api.createSprite({ x: 100, y: 190, w: 20, h: 20, vy: 5 })
    api.stompEnemyType(heroi, t, 5.5)
    expect(inimigo.hp).toBe(0)
    // Um único "Atualizar" colhe a morte. Antes eram 21.
    api.updateEnemyType(t, ctx, null)
    expect(t.items.length).toBe(0)
  })

  it('o achatado ACHATA de verdade, e pelos pés', () => {
    const api = load()
    api.setGravity(0.42)
    const t = api.createEnemyType({ behavior: 'patrulha', hp: 3, w: 20, h: 20 })
    const inimigo = api.spawnEnemy(t, 100, 200) as Sprite
    api.setEnemyStompMode(t, 'squash')
    const base = inimigo.y + inimigo.h
    const heroi = api.createSprite({ x: 100, y: 190, w: 20, h: 20, vy: 5 })
    api.stompEnemyType(heroi, t, 5.5)
    expect(inimigo.h).toBeLessThan(20)
    // O pé fica onde estava: achatar a partir do topo faria o corpo flutuar.
    expect(inimigo.y + inimigo.h).toBe(base)
  })

  it('a área de colisão reduzida não descarta a pisada certa', () => {
    // ⚠️ Duas réguas: encostar usava a caixa EFETIVA e "veio de cima" usava a caixa
    // CRUA. Com "usar área de colisão de N%" o herói encostava e a geometria
    // recusava, e a pisada sumia sem nada na tela explicando.
    const api = load()
    api.setGravity(0.42)
    const t = api.createEnemyType({ behavior: 'patrulha', hp: 3, w: 20, h: 20 })
    const inimigo = api.spawnEnemy(t, 100, 200) as Sprite
    const heroi = api.createSprite({ x: 100, y: 188, w: 20, h: 20, vy: 5 })
    api.setHitboxScale(heroi, 85)
    api.stompEnemyType(heroi, t, 5.5)
    expect(inimigo.hp).toBe(0)
    expect(heroi.vy).toBe(-5.5)
  })
})
