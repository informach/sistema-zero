import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

/**
 * Animação por ESTADO (v0.22.0): setStateAnimation registra o "guarda-roupa"
 * do sprite e autoAnimate troca a animação sozinho conforme o estado
 * (dano > pulando/caindo > andando > vertical > parado), com flip automático
 * pelo sinal do vx e guarda de transição (setAnimation só na MUDANÇA de
 * estado — re-chamar todo quadro congelaria no 1º quadro).
 */

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  facing?: number
  onGround?: boolean
  hurtFrames?: number
  blinkFrames?: number
  hp?: number
  hpMax?: number
  anim?: { sheet: unknown; from: number; to: number; fps: number; start: number } | null
  animStates?: Record<string, unknown>
  _animState?: string | null
  image?: unknown
}

interface Api {
  createSprite: (opts: Record<string, unknown>) => Sprite
  loadSpriteSheet: (name: string, fw: number, fh: number) => unknown
  setAnimation: (s: Sprite, sheet: unknown, from: number, to: number, fps: number) => void
  setStateAnimation: (
    s: Sprite,
    state: string,
    sheet: unknown,
    from: number,
    to: number,
    fps: number,
  ) => void
  autoAnimate: (s: Sprite) => void
  setImage: (s: Sprite, name: string) => void
  setHealth: (s: Sprite, n: number) => void
  changeHealth: (s: Sprite, d: number) => void
  blink: (s: Sprite, frames: number) => void
  flipSprite: (s: Sprite, dir: string) => void
  platformer: (s: Sprite, ctx: unknown, speed: number, jump: number) => void
  jumpOnGround: (s: Sprite, ctx: unknown, jump: number) => void
  topDown: (s: Sprite, speed: number) => void
  createTileMap: (opts: Record<string, unknown>) => unknown
  drawTileMap: (ctx: unknown, map: unknown, x: number, y: number) => void
  collideTileMap: (s: Sprite, map: unknown) => void
  setGravity: (value: number) => void
  applyVelocity: (s: Sprite) => void
  keys: { left: boolean; right: boolean; up: boolean; down: boolean }
}

function load(): { api: Api; clock: { t: number } } {
  const clock = { t: 0 }
  const win = {
    addEventListener() {},
    SZGame2D: undefined,
    performance: { now: () => clock.t },
    devicePixelRatio: 1,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  return { api: win.SZGame2D as Api, clock }
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

function sheetOf(api: Api, name: string): unknown {
  return api.loadSpriteSheet(name, 16, 16)
}

describe('setStateAnimation', () => {
  it('registra a animação do estado no sprite (com saneamento)', () => {
    const { api } = load()
    const s = api.createSprite({})
    const sheet = sheetOf(api, 'andar')
    api.setStateAnimation(s, 'andando', sheet, 2.9, 5.2, 12)
    const cfg = (s.animStates as Record<string, { from: number; to: number; fps: number }>).andando
    expect(cfg?.from).toBe(2)
    expect(cfg?.to).toBe(5)
    expect(cfg?.fps).toBe(12)
    // fps inválido cai no default 8; from/to negativos clampam em 0
    api.setStateAnimation(s, 'parado', sheet, -3, -1, 0)
    const idle = (s.animStates as Record<string, { from: number; to: number; fps: number }>).parado
    expect(idle?.from).toBe(0)
    expect(idle?.fps).toBe(8)
  })

  it('sprite/sheet/estado ausentes não estouram nem registram', () => {
    const { api } = load()
    const s = api.createSprite({})
    expect(() => api.setStateAnimation(s, '', sheetOf(api, 'x'), 0, 1, 8)).not.toThrow()
    expect(s.animStates).toBeUndefined()
  })
})

describe('autoAnimate — estados e prioridade', () => {
  function rig(): { api: Api; s: Sprite; clock: { t: number }; sheets: Record<string, unknown> } {
    const { api, clock } = load()
    const s = api.createSprite({ x: 0, y: 0, w: 16, h: 16 })
    const sheets = {
      parado: sheetOf(api, 'parado'),
      andando: sheetOf(api, 'andando'),
      vertical: sheetOf(api, 'vertical'),
      pulando: sheetOf(api, 'pulando'),
      caindo: sheetOf(api, 'caindo'),
      dano: sheetOf(api, 'dano'),
    }
    let from = 0
    for (const [state, sheet] of Object.entries(sheets)) {
      api.setStateAnimation(s, state, sheet, from, from + 3, 8)
      from += 10
    }
    return { api, s, clock, sheets }
  }

  it('parado / andando / vertical pelo vx-vy (com zona morta)', () => {
    const { api, s, sheets } = rig()
    api.autoAnimate(s)
    expect(s.anim?.sheet).toBe(sheets.parado)
    s.vx = 3
    api.autoAnimate(s)
    expect(s.anim?.sheet).toBe(sheets.andando)
    s.vx = 0.005 // abaixo da zona morta = parado
    s.vy = 2
    api.autoAnimate(s)
    expect(s.anim?.sheet).toBe(sheets.vertical)
  })

  it('no ar: vy negativo = pulando, senão caindo (exige onGround === false)', () => {
    const { api, s, sheets } = rig()
    s.onGround = false
    s.vy = -5
    api.autoAnimate(s)
    expect(s.anim?.sheet).toBe(sheets.pulando)
    s.vy = 4
    api.autoAnimate(s)
    expect(s.anim?.sheet).toBe(sheets.caindo)
  })

  it('inverte pulando/caindo quando a gravidade aponta para cima', () => {
    const { api, s, sheets } = rig()
    api.setGravity(-1)
    s.onGround = false
    s.vy = 5
    api.autoAnimate(s)
    expect(s.anim?.sheet).toBe(sheets.pulando)
    s.vy = -4
    api.autoAnimate(s)
    expect(s.anim?.sheet).toBe(sheets.caindo)
  })

  it('top-down (onGround nunca marcado) não entra em pulando/caindo', () => {
    const { api, s, sheets } = rig()
    s.vy = -3 // subindo na tela num top-down
    api.autoAnimate(s)
    expect(s.anim?.sheet).toBe(sheets.vertical)
  })

  it('dano vence tudo: hurtFrames (via changeHealth) e blinkFrames contam', () => {
    const { api, s, sheets } = rig()
    s.vx = 3
    api.setHealth(s, 3)
    api.changeHealth(s, -1)
    api.autoAnimate(s)
    expect(s.anim?.sheet).toBe(sheets.dano)
    // hurtFrames decrementa a cada autoAnimate e o estado volta ao normal
    for (let i = 0; i < 40; i++) api.autoAnimate(s)
    expect(s.anim?.sheet).toBe(sheets.andando)
    // blinkFrames (piscar) também conta como dano
    api.blink(s, 10)
    api.autoAnimate(s)
    expect(s.anim?.sheet).toBe(sheets.dano)
  })

  it('ganhar vida NÃO dispara dano', () => {
    const { api, s, sheets } = rig()
    api.setHealth(s, 3)
    api.changeHealth(s, 1)
    api.autoAnimate(s)
    expect(s.anim?.sheet).toBe(sheets.parado)
  })

  it('guarda de transição: mesmo estado não reinicia a animação', () => {
    const { api, s, clock } = rig()
    s.vx = 3
    clock.t = 1000
    api.autoAnimate(s)
    const started = s.anim?.start
    expect(started).toBe(1000)
    clock.t = 2000
    api.autoAnimate(s) // mesmo estado → NÃO re-seta start (não congela)
    expect(s.anim?.start).toBe(1000)
    s.vx = 0
    clock.t = 3000
    api.autoAnimate(s) // mudou de estado → nova animação, novo start
    expect(s.anim?.start).toBe(3000)
  })

  it('fallback: estado sem animação cai no parente (caindo→pulando→andando→parado)', () => {
    const { api } = load()
    const s = api.createSprite({})
    const andar = sheetOf(api, 'andar')
    api.setStateAnimation(s, 'andando', andar, 0, 3, 8)
    s.onGround = false
    s.vy = 6 // caindo, sem anim de caindo/pulando → usa andando
    api.autoAnimate(s)
    expect(s.anim?.sheet).toBe(andar)
    // a guarda usa o estado RESOLVIDO: alternar caindo↔andando (ambos caem em
    // "andando") não reinicia a animação
    const started = s.anim?.start
    s.onGround = true
    s.vy = 0
    s.vx = 2
    api.autoAnimate(s)
    expect(s.anim?.start).toBe(started)
  })

  it('sem guarda-roupa: só o flip acontece e anim fica intocada', () => {
    const { api } = load()
    const s = api.createSprite({})
    s.vx = -4
    api.autoAnimate(s)
    expect(s.facing).toBe(-1)
    expect(s.anim ?? null).toBeNull()
  })
})

describe('autoAnimate — flip automático', () => {
  it('vira pelo sinal do vx e mantém o último lado quando para', () => {
    const { api } = load()
    const s = api.createSprite({})
    s.vx = 5
    api.autoAnimate(s)
    expect(s.facing).toBe(1)
    s.vx = -5
    api.autoAnimate(s)
    expect(s.facing).toBe(-1)
    s.vx = 0
    api.autoAnimate(s)
    expect(s.facing).toBe(-1) // parado mantém
  })

  it('parado, o "Virar o sprite" manual vale', () => {
    const { api } = load()
    const s = api.createSprite({})
    s.vx = 5
    api.autoAnimate(s)
    expect(s.facing).toBe(1)
    s.vx = 0
    api.flipSprite(s, 'left')
    api.autoAnimate(s)
    expect(s.facing).toBe(-1)
  })
})

describe('onGround persistido nos helpers de movimento', () => {
  it('platformer grava onGround no sprite (ar → chão)', () => {
    const { api } = load()
    const ctx = fakeCtx(200, 200)
    const s = api.createSprite({ x: 50, y: 10, w: 20, h: 20 })
    api.platformer(s, ctx, 4, 11)
    expect(s.onGround).toBe(false)
    s.y = 500
    api.platformer(s, ctx, 4, 11)
    expect(s.onGround).toBe(true)
  })

  it('jumpOnGround grava onGround no sprite', () => {
    const { api } = load()
    const ctx = fakeCtx(200, 200)
    const s = api.createSprite({ x: 50, y: 500, w: 20, h: 20 })
    api.jumpOnGround(s, ctx, 12)
    expect(s.onGround).toBe(true)
  })

  it('platformer e jumpOnGround usam o teto como chão com gravidade negativa', () => {
    const { api } = load()
    const ctx = fakeCtx(200, 200)
    api.setGravity(-1)

    const platformerSprite = api.createSprite({ x: 50, y: 20, w: 20, h: 20 })
    for (let i = 0; i < 20; i++) api.platformer(platformerSprite, ctx, 4, 11)
    expect(platformerSprite.y).toBe(0)
    expect(platformerSprite.onGround).toBe(true)

    api.keys.up = true
    api.platformer(platformerSprite, ctx, 4, 11)
    api.keys.up = false
    expect(platformerSprite.vy).toBe(11)
    expect(platformerSprite.onGround).toBe(false)
    api.platformer(platformerSprite, ctx, 4, 11)
    expect(platformerSprite.y).toBeGreaterThan(0)

    const genericSprite = api.createSprite({ x: 90, y: 20, w: 20, h: 20 })
    for (let i = 0; i < 20; i++) api.jumpOnGround(genericSprite, ctx, 12)
    expect(genericSprite.y).toBe(0)
    expect(genericSprite.onGround).toBe(true)
  })

  it('topDown mantém onGround ausente em sprite top-down', () => {
    const { api } = load()
    const s = api.createSprite({})
    api.keys.right = true
    api.topDown(s, 3)
    api.keys.right = false
    expect(s.onGround).toBeUndefined()
  })

  it('topDown limpa o estado aéreo deixado por platformer antes de animar', () => {
    const { api } = load()
    const ctx = fakeCtx(200, 200)
    const s = api.createSprite({ x: 50, y: 10, w: 20, h: 20 })
    const sheet = sheetOf(api, 'troca-modo')
    api.setStateAnimation(s, 'parado', sheet, 0, 0, 8)
    api.setStateAnimation(s, 'caindo', sheet, 1, 1, 8)
    api.platformer(s, ctx, 4, 11)
    expect(s.onGround).toBe(false)

    api.topDown(s, 3)
    api.autoAnimate(s)

    expect(s.onGround).toBeUndefined()
    expect(s._animState).toBe('parado')
  })

  it('topDown não reativa o chão ao encostar exatamente em um tile após trocar de modo', () => {
    const { api } = load()
    const ctx = fakeCtx(64, 64)
    const map = api.createTileMap({ image: '', tile: 32, solid: '1', grid: '. .;1 1' })
    api.drawTileMap(ctx, map, 0, 0)
    const s = api.createSprite({ x: 4, y: 10, w: 16, h: 16, vy: 8 })
    api.setGravity(0.6)

    // Dois quadros de plataforma deixam o contato exato confirmado pela física.
    api.applyVelocity(s)
    api.collideTileMap(s, map)
    api.applyVelocity(s)
    api.collideTileMap(s, map)
    expect(s.onGround).toBe(true)

    api.topDown(s, 3)
    api.collideTileMap(s, map)

    expect(s.onGround).toBeUndefined()
  })

  it('collideTileMap marca onGround ao POUSAR num tile (e só nesse caso)', () => {
    const { api } = load()
    const ctx = fakeCtx(64, 64)
    // Mapa 2x2 com o chão sólido na linha de baixo (tile 1 = sólido).
    const map = api.createTileMap({ image: '', tile: 32, solid: '1', grid: '. .;1 1' })
    api.drawTileMap(ctx, map, 0, 0)
    const s = api.createSprite({ x: 4, y: 20, w: 16, h: 16 })
    s.vy = 8
    s.y = 24 // sobrepõe o topo do tile sólido (linha y=32)
    s.onGround = false
    api.collideTileMap(s, map)
    expect(s.onGround).toBe(true)
    expect(s.vy).toBe(0)
    // Batida LATERAL não marca chão
    const s2 = api.createSprite({ x: 30, y: 34, w: 16, h: 16 })
    s2.vx = 4
    s2.vy = 0
    s2.onGround = false
    api.collideTileMap(s2, map)
    expect(s2.onGround).toBe(false)
  })

  it('applyVelocity limpa onGround ao sair do tile para autoAnimate entrar em caindo', () => {
    const { api } = load()
    const ctx = fakeCtx(64, 64)
    const map = api.createTileMap({ image: '', tile: 32, solid: '1', grid: '. .;1 1' })
    api.drawTileMap(ctx, map, 0, 0)
    const s = api.createSprite({ x: 4, y: 10, w: 16, h: 16, vx: 0, vy: 8 })
    const andando = sheetOf(api, 'andando-sair-do-tile')
    const caindo = sheetOf(api, 'caindo-sair-do-tile')
    api.setStateAnimation(s, 'andando', andando, 0, 0, 8)
    api.setStateAnimation(s, 'caindo', caindo, 0, 0, 8)
    api.setGravity(0.6)

    api.applyVelocity(s)
    api.collideTileMap(s, map)
    expect(s.onGround).toBe(true)

    s.vx = 64 // deixa a largura do mapa depois de mover
    api.applyVelocity(s)
    api.collideTileMap(s, map)
    api.autoAnimate(s)

    expect(s.onGround).toBe(false)
    expect(s._animState).toBe('caindo')
  })

  it('applyVelocity mantém onGround ao continuar apoiado exatamente no tile', () => {
    const { api } = load()
    const ctx = fakeCtx(64, 64)
    const map = api.createTileMap({ image: '', tile: 32, solid: '1', grid: '. .;1 1' })
    api.drawTileMap(ctx, map, 0, 0)
    const s = api.createSprite({ x: 4, y: 10, w: 16, h: 16, vx: 0, vy: 8 })
    api.setGravity(0.6)

    api.applyVelocity(s)
    api.collideTileMap(s, map)
    expect(s.onGround).toBe(true)

    api.applyVelocity(s)
    api.collideTileMap(s, map)

    expect(s.y).toBe(16)
    expect(s.vy).toBe(0)
    expect(s.onGround).toBe(true)
  })
})

describe('interações com o existente', () => {
  it('setImage zera anim E _animState (a animação por estado reaplica depois)', () => {
    const { api } = load()
    const s = api.createSprite({})
    const sheet = sheetOf(api, 'andar')
    api.setStateAnimation(s, 'parado', sheet, 0, 3, 8)
    api.autoAnimate(s)
    expect(s._animState).toBe('parado')
    expect(s.anim).toBeTruthy()
    api.setImage(s, 'heroi')
    expect(s.anim ?? null).toBeNull()
    expect(s._animState ?? null).toBeNull()
    api.autoAnimate(s) // reaplica a animação do estado atual
    expect(s.anim?.sheet).toBe(sheet)
  })

  it('"Animar sprite" manual cola até a PRÓXIMA transição de estado', () => {
    const { api } = load()
    const s = api.createSprite({})
    const estado = sheetOf(api, 'estado')
    const manual = sheetOf(api, 'manual')
    api.setStateAnimation(s, 'parado', estado, 0, 3, 8)
    api.setStateAnimation(s, 'andando', estado, 4, 7, 8)
    api.autoAnimate(s)
    api.setAnimation(s, manual, 0, 1, 4)
    api.autoAnimate(s) // mesmo estado → não sobrescreve a manual
    expect(s.anim?.sheet).toBe(manual)
    s.vx = 3
    api.autoAnimate(s) // transição → volta ao guarda-roupa
    expect(s.anim?.sheet).toBe(estado)
  })
})
