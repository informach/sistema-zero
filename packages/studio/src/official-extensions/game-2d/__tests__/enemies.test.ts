import { describe, expect, it, spyOn } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

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
}

interface EnemyType {
  items: Sprite[]
  bullets: { items: Sprite[] }
  config: Record<string, unknown> & {
    behavior: string
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
  createSprite: (opts: Record<string, unknown>) => Sprite
  createEnemyType: (opts: Record<string, unknown>) => EnemyType
  setEnemyStateAnimation: (
    t: EnemyType,
    state: string,
    sheet: unknown,
    from: number,
    to: number,
    fps: number,
  ) => void
  setEnemyTypeParam: (t: EnemyType, param: string, value: number) => void
  spawnEnemy: (t: EnemyType, x: number, y: number) => Sprite | null
  updateEnemyType: (t: EnemyType, ctx: unknown, target: Sprite | null) => void
  drawEnemyType: (ctx: unknown, t: EnemyType) => void
  onEnemyDefeated: (t: EnemyType, fn: (s: Sprite) => void) => void
  overlapEnemyShots: (getSprite: () => Sprite, t: EnemyType, fn: (shot: Sprite) => void) => void
  enemyDamage: (s: unknown) => number
  hurtByEnemy: (s: Sprite, e: Sprite) => void
  loadSpriteSheet: (name: string, fw: number, fh: number) => unknown
  setHealth: (s: Sprite, n: number) => void
  changeHealth: (s: Sprite, d: number) => void
  countGroup: (g: unknown) => number
  forEachInGroup: (g: unknown, fn: (s: Sprite, i: number) => void) => void
  overlapSpriteGroup: (getSprite: () => Sprite, g: unknown, fn: (s: Sprite) => void) => void
  removeFromGroup: (g: unknown, s: Sprite) => void
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
  it('patrulha: anda, vira na borda da tela e vira quando o vx é zerado (parede)', () => {
    const api = load()
    const ctx = fakeCtx(200, 100)
    const t = api.createEnemyType({ behavior: 'patrulha', speed: 4 })
    const e = api.spawnEnemy(t, 100, 84) as Sprite
    api.updateEnemyType(t, ctx, null)
    expect(e.vx).toBe(4) // começa indo pra direita
    // parede: algo (collideTileMap) zera o vx entre os quadros
    e.vx = 0
    api.updateEnemyType(t, ctx, null)
    expect(e.vx).toBe(-4) // virou
    // borda esquerda: vira de novo
    e.x = -2
    api.updateEnemyType(t, ctx, null)
    expect(e.vx).toBe(4)
    // gravidade + chão do canvas
    expect(e.onGround).toBe(true)
    expect(e.y).toBe(100 - e.h)
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

  it('saltador: pula exatamente a cada "ritmo" quadros no chão', () => {
    const api = load()
    const ctx = fakeCtx(200, 100)
    const t = api.createEnemyType({ behavior: 'saltador' })
    api.setEnemyTypeParam(t, 'ritmo', 3)
    api.setEnemyTypeParam(t, 'pulo', 9)
    const e = api.spawnEnemy(t, 50, 84) as Sprite
    api.updateEnemyType(t, ctx, null) // pousa; contador 3->2
    api.updateEnemyType(t, ctx, null) // 2->1
    expect(e.vy).toBe(0)
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

  it('callback que lança não derruba o update (console.error)', () => {
    const api = load()
    const ctx = fakeCtx()
    const t = api.createEnemyType({ hp: 1 })
    const e = api.spawnEnemy(t, 0, 0) as Sprite
    api.onEnemyDefeated(t, () => {
      throw new Error('boom')
    })
    api.changeHealth(e, -1)
    expect(() => api.updateEnemyType(t, ctx, null)).not.toThrow()
    expect(t.items.length).toBe(0)
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
  it('ajusta os cinco parâmetros e ignora valor/param inválido', () => {
    const api = load()
    const t = api.createEnemyType({})
    api.setEnemyTypeParam(t, 'pulo', 15)
    api.setEnemyTypeParam(t, 'ritmo', 30)
    api.setEnemyTypeParam(t, 'alcance', 120)
    api.setEnemyTypeParam(t, 'cadencia', 45)
    api.setEnemyTypeParam(t, 'tiro', 7)
    expect(t.config.jump).toBe(15)
    expect(t.config.jumpRate).toBe(30)
    expect(t.config.range).toBe(120)
    expect(t.config.rate).toBe(45)
    expect(t.config.shotSpeed).toBe(7)
    api.setEnemyTypeParam(t, 'foguete', 99)
    api.setEnemyTypeParam(t, 'pulo', Number.NaN as unknown as number)
    expect(t.config.jump).toBe(15)
  })
})

describe('avisos pedagógicos (tipo sem spawn / criar dentro do laço)', () => {
  it('update/draw de tipo sem NENHUM spawn avisa uma vez só e cita o bloco Soltar', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      const ctx = fakeCtx()
      const t = api.createEnemyType({ behavior: 'perseguidor' })
      api.updateEnemyType(t, ctx, null)
      api.drawEnemyType(ctx, t)
      api.updateEnemyType(t, ctx, null)
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

  it('createEnemyType chamado 61+ vezes (sinal de laço) avisa uma única vez', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      for (let i = 0; i < 80; i += 1) api.createEnemyType({})
      const calls = warn.mock.calls.filter((c) => String(c[0]).includes('Criar tipo de inimigo'))
      expect(calls.length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })
})
