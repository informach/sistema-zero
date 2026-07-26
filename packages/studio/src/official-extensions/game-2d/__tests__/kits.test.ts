import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

/**
 * Kits Equilibrista (Stick Hero) e Balão v2 (v0.42.0): o personagem é um SPRITE
 * normal e as regras moram no "caminho". Estes testes exercitam o runtime cru:
 * FSM crescer/derrubar/andar, física do fogo/voo, avanço e batida na árvore,
 * eventos, e a regressão do tamanho lógico do palco ("Preparar a tela").
 */

interface KitSprite {
  x: number
  y: number
  w: number
  h: number
  color: string
  vx: number
  vy: number
  skin: { kind: string; color?: string; body?: string; basket?: string } | null
  _fuel?: number
  _fire?: number
}

interface StickPath {
  w: number
  h: number
  phase: string
  sceneOffset: number
  heroX: number
  heroY: number
  platforms: Array<{ x: number; w: number }>
  sticks: Array<{ x: number; length: number; rotation: number }>
  colors: { platform: string; stick: string }
}

interface BalloonPath {
  w: number
  h: number
  dist: number
  meters: number
  trees: Array<{ x: number; th: number; color: string }>
}

interface Game2DApi {
  setupStage: (width: number, height: number, background: string) => void
  pointerDown: () => boolean
  createStickHero: (opts?: { w?: number; h?: number; color?: string }) => KitSprite
  createStickPath: (ctx: unknown, opts?: { platform?: string; stick?: string }) => StickPath | null
  stickPathScenery: (path: unknown) => void
  stickPathGrow: (path: unknown, speed?: number) => void
  stickPathDrop: (path: unknown) => void
  stickPathWalk: (path: unknown, hero: unknown, speed?: number) => void
  stickPathDraw: (path: unknown) => void
  stickPathOnCross: (path: unknown, fn: () => void, id?: string) => void
  stickPathOnPerfect: (path: unknown, fn: () => void, id?: string) => void
  stickPathFell: (path: unknown) => boolean
  createBalloon: (opts?: {
    x?: number
    y?: number
    w?: number
    h?: number
    body?: string
    basket?: string
  }) => KitSprite
  createBalloonPath: (ctx: unknown) => BalloonPath | null
  balloonPathScenery: (path: unknown) => void
  balloonFire: (balloon: unknown, force?: number) => void
  balloonFly: (balloon: unknown) => void
  balloonPathScroll: (path: unknown, balloon: unknown, speed?: number) => void
  balloonPathOnTreeHit: (path: unknown, fn: () => void, id?: string) => void
  balloonPathMeters: (path: unknown) => number
  balloonFuel: (balloon: unknown) => number
  balloonLandedOut: (balloon: unknown) => boolean
  drawSprite: (ctx: unknown, sprite: unknown) => void
}

interface KitHarness {
  api: Game2DApi
  tick: (ms: number) => void
}

function loadRuntime(devicePixelRatio = 1): KitHarness {
  let clock = 0
  const win = {
    addEventListener() {},
    SZGame2D: undefined,
    performance: { now: () => clock },
    devicePixelRatio,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  return {
    api: (win as { SZGame2D: Game2DApi }).SZGame2D,
    tick: (ms: number) => {
      clock += ms
    },
  }
}

function mockCtx(w: number, h: number): unknown {
  const ctx: Record<string, unknown> = {
    canvas: { width: w, height: h },
    createLinearGradient: () => ({ addColorStop() {} }),
    measureText: () => ({ width: 10 }),
  }
  const noop = () => {}
  for (const m of [
    'save',
    'restore',
    'clearRect',
    'fillRect',
    'strokeRect',
    'beginPath',
    'moveTo',
    'lineTo',
    'arc',
    'arcTo',
    'quadraticCurveTo',
    'bezierCurveTo',
    'closePath',
    'fill',
    'stroke',
    'translate',
    'rotate',
    'scale',
    'fillText',
    'strokeText',
    'setTransform',
    'setLineDash',
    'clip',
    'rect',
  ]) {
    ctx[m] = noop
  }
  return ctx
}

/** Avança a FSM chamando grow/walk com o relógio andando (passos de 16ms). */
function frames(harness: KitHarness, count: number, fn: () => void) {
  for (let i = 0; i < count; i += 1) {
    harness.tick(16)
    fn()
  }
}

describe('Kit equilibrista v2 — sprite + caminho', () => {
  it('createStickHero cria um sprite NORMAL com skin, tamanho e cor da criança', () => {
    const { api } = loadRuntime()
    const hero = api.createStickHero({ w: 20, h: 40, color: '#123456' })
    expect(hero.w).toBe(20)
    expect(hero.h).toBe(40)
    expect(hero.color).toBe('#123456')
    expect(hero.skin?.kind).toBe('stickhero')
    // Sprite comum: o desenho genérico funciona nele sem estourar.
    expect(() => api.drawSprite(mockCtx(360, 480), hero)).not.toThrow()
  })

  it('crescer estica o bastão, derrubar gira, andar atravessa e dispara os eventos', () => {
    const harness = loadRuntime()
    const { api } = harness
    const ctx = mockCtx(360, 480)
    const hero = api.createStickHero({})
    const path = api.createStickPath(ctx, { platform: '#0ea5a0', stick: '#1b2330' })
    expect(path).toBeTruthy()
    if (!path) return
    expect(path.colors).toEqual({ platform: '#0ea5a0', stick: '#1b2330' })

    let crossed = 0
    api.stickPathOnCross(path, () => {
      crossed += 1
    })

    // Mira o comprimento exato até o MEIO da próxima plataforma.
    const target = path.platforms[1]
    const stick = path.sticks[0]
    if (!target || !stick) throw new Error('caminho sem plataforma/bastão inicial')
    const wanted = target.x + target.w / 2 - stick.x

    expect(path.phase).toBe('waiting')
    frames(harness, 200, () => {
      if (stick.length < wanted) api.stickPathGrow(path, 1)
    })
    expect(path.phase).toBe('stretching')
    expect(stick.length).toBeGreaterThanOrEqual(wanted)

    api.stickPathDrop(path)
    expect(path.phase).toBe('turning')

    // Andar resolve o giro, o acerto (evento) e a travessia até voltar a esperar.
    frames(harness, 400, () => {
      if (path.phase !== 'waiting') api.stickPathWalk(path, hero, 1)
    })
    expect(path.phase).toBe('waiting')
    expect(crossed).toBe(1)
    expect(path.sticks.length).toBe(2)
    // O sprite foi posicionado em coordenadas de TELA (dentro do palco).
    expect(hero.x).toBeGreaterThan(0)
    expect(hero.x).toBeLessThan(path.w)
    expect(hero.y).toBeLessThan(path.h)
  })

  it('bastão curto derruba o herói: cair vira over e stickPathFell responde', () => {
    const harness = loadRuntime()
    const { api } = harness
    const hero = api.createStickHero({})
    const path = api.createStickPath(mockCtx(360, 480), {})
    if (!path) return

    // Estica só um tiquinho (não alcança a próxima plataforma) e derruba.
    frames(harness, 3, () => api.stickPathGrow(path, 1))
    api.stickPathDrop(path)
    frames(harness, 600, () => {
      if (!api.stickPathFell(path)) api.stickPathWalk(path, hero, 1)
    })
    expect(api.stickPathFell(path)).toBe(true)
  })

  it('derrubar sem estar esticando é inofensivo (o par se/senão da criança)', () => {
    const { api } = loadRuntime()
    const path = api.createStickPath(mockCtx(360, 480), {})
    if (!path) return
    expect(path.phase).toBe('waiting')
    api.stickPathDrop(path)
    expect(path.phase).toBe('waiting')
  })

  it('acerto no meio dispara TAMBÉM o evento de perfeito', () => {
    const harness = loadRuntime()
    const { api } = harness
    const hero = api.createStickHero({})
    const path = api.createStickPath(mockCtx(360, 480), {})
    if (!path) return
    let cross = 0
    let perfect = 0
    api.stickPathOnCross(path, () => {
      cross += 1
    })
    api.stickPathOnPerfect(path, () => {
      perfect += 1
    })
    // Coloca o bastão EXATAMENTE no meio da próxima plataforma, já deitado.
    const target = path.platforms[1]
    const stick = path.sticks[0]
    if (!target || !stick) return
    stick.length = target.x + target.w / 2 - stick.x
    path.phase = 'turning'
    stick.rotation = 89
    frames(harness, 10, () => api.stickPathWalk(path, hero, 1))
    expect(cross).toBe(1)
    expect(perfect).toBe(1)
  })

  it('o cenário e o desenho não estouram com o mock de canvas', () => {
    const { api } = loadRuntime()
    const path = api.createStickPath(mockCtx(360, 480), {})
    expect(() => api.stickPathScenery(path)).not.toThrow()
    expect(() => api.stickPathDraw(path)).not.toThrow()
  })
})

describe('Kit balão v2 — sprite + caminho', () => {
  it('createBalloon cria um sprite NORMAL com combustível e cores da criança', () => {
    const { api } = loadRuntime()
    const balloon = api.createBalloon({ x: 110, y: 200, w: 70, h: 100, body: '#7c3aed' })
    expect(balloon.x).toBe(110)
    expect(balloon.w).toBe(70)
    expect(balloon.skin?.kind).toBe('balloon')
    expect(balloon.skin?.body).toBe('#7c3aed')
    expect(api.balloonFuel(balloon)).toBe(100)
    expect(() => api.drawSprite(mockCtx(560, 360), balloon)).not.toThrow()
  })

  it('fogo sobe e queima combustível; sem fogo a gravidade desce e pousa no chão', () => {
    document.body.innerHTML = '<canvas width="560" height="360"></canvas>'
    const harness = loadRuntime()
    const { api } = harness
    const balloon = api.createBalloon({ x: 110, y: 300, w: 70, h: 100 })

    // Voar sem fogo: pousa no chão (nunca afunda).
    frames(harness, 30, () => api.balloonFly(balloon))
    const groundY = 360 * 0.82
    expect(balloon.y + balloon.h).toBeCloseTo(groundY, 0)

    // Fogo aceso: sobe e gasta combustível.
    const yOnGround = balloon.y
    frames(harness, 60, () => {
      api.balloonFire(balloon, 1)
      api.balloonFly(balloon)
    })
    expect(balloon.y).toBeLessThan(yOnGround)
    expect(api.balloonFuel(balloon)).toBeLessThan(100)

    // Sem combustível e no chão: pousou sem combustível.
    balloon._fuel = 0
    frames(harness, 200, () => api.balloonFly(balloon))
    expect(api.balloonLandedOut(balloon)).toBe(true)
  })

  it('avançar conta metros só com o balão no ar e recicla as árvores', () => {
    document.body.innerHTML = '<canvas width="560" height="360"></canvas>'
    const harness = loadRuntime()
    const { api } = harness
    const balloon = api.createBalloon({ x: 110, y: 300, w: 70, h: 100 })
    const path = api.createBalloonPath(mockCtx(560, 360))
    if (!path) return

    // No chão: não anda.
    frames(harness, 10, () => api.balloonPathScroll(path, balloon, 1))
    expect(api.balloonPathMeters(path)).toBe(0)

    // No ar: anda e conta metros.
    balloon.y = 100
    frames(harness, 120, () => api.balloonPathScroll(path, balloon, 1))
    expect(api.balloonPathMeters(path)).toBeGreaterThan(0)
    expect(path.trees.length).toBe(6)
  })

  it('bater numa árvore dispara o evento UMA vez por toque (a criança decide o fim)', () => {
    document.body.innerHTML = '<canvas width="560" height="360"></canvas>'
    const harness = loadRuntime()
    const { api } = harness
    const balloon = api.createBalloon({ x: 110, y: 300, w: 70, h: 100 })
    const path = api.createBalloonPath(mockCtx(560, 360))
    if (!path) return
    let hits = 0
    api.balloonPathOnTreeHit(path, () => {
      hits += 1
    })

    // Posiciona uma árvore exatamente sobre o balão, alta o bastante p/ tocar.
    const tree = path.trees[0]
    if (!tree) return
    tree.x = balloon.x + balloon.w / 2
    tree.th = 300
    balloon.y = 200
    frames(harness, 5, () => api.balloonPathScroll(path, balloon, 0))
    expect(hits).toBe(1)

    // Saiu da árvore e voltou: dispara de novo (permite jogo de vidas).
    balloon.y = -500
    frames(harness, 2, () => api.balloonPathScroll(path, balloon, 0))
    balloon.y = 200
    frames(harness, 2, () => api.balloonPathScroll(path, balloon, 0))
    expect(hits).toBe(2)
  })

  it('o cenário do balão não estoura com o mock de canvas', () => {
    const { api } = loadRuntime()
    const path = api.createBalloonPath(mockCtx(560, 360))
    expect(() => api.balloonPathScenery(path)).not.toThrow()
  })
})

describe('Palco lógico — o cenário respeita o "Preparar a tela"', () => {
  it('setupStage congela o tamanho lógico na hora (sem janela de valor físico)', () => {
    document.body.innerHTML = '<canvas id="tela"></canvas>'
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('canvas do teste não foi criado')
    canvas.getBoundingClientRect = () =>
      ({ width: 800, height: 480, x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 480 }) as DOMRect
    const { api } = loadRuntime(2)
    api.setupStage(800, 480, '#000000')
    // O canvas FÍSICO dobra (DPR 2), mas o caminho criado DEPOIS lê o lógico.
    expect(canvas.width).toBe(1600)
    const path = api.createStickPath(mockCtx(canvas.width, canvas.height), {})
    if (!path) return
    expect([path.w, path.h]).toEqual([800, 480])
  })

  it('caminho criado ANTES do Preparar a tela rescala e o céu cobre o tamanho novo', () => {
    document.body.innerHTML = '<canvas id="tela"></canvas>'
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('canvas do teste não foi criado')
    canvas.getBoundingClientRect = () =>
      ({ width: 800, height: 480, x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 480 }) as DOMRect
    const { api } = loadRuntime()
    // Criança inverteu a ordem: criar o caminho vem ANTES do "Preparar a tela".
    const ctx = mockCtx(300, 150) as Record<string, unknown>
    const path = api.createStickPath(ctx, {})
    if (!path) return
    expect([path.w, path.h]).toEqual([300, 150])

    api.setupStage(800, 480, '#000000')
    const rects: number[][] = []
    ctx.fillRect = (...args: number[]) => {
      rects.push(args)
    }
    api.stickPathScenery(path)
    // O primeiro retângulo do cenário é o CÉU: precisa cobrir o palco inteiro.
    expect(rects[0]).toEqual([0, 0, 800, 480])
    expect([path.w, path.h]).toEqual([800, 480])
  })
})
