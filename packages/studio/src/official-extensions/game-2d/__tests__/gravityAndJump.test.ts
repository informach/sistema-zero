import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

/**
 * Lote 08/2026: a gravidade saiu do "aplicar velocidade" e virou bloco próprio,
 * e o motor passou a avisar QUANDO O SPRITE PULA e QUANDO APERTAM QUALQUER TECLA.
 *
 * O que este arquivo protege (e que o blockAudit genérico não vê, porque ele
 * prova o pipeline dos blocos, não a semântica do motor):
 *  · o applyVelocity não soma mais gravidade nenhuma;
 *  · o bloco de gravidade usa a do MUNDO (0.6 quando ninguém declarou);
 *  · updateGroup só move e applyGravityToGroup acelera explicitamente;
 *  · o evento de pulo dispara nos TRÊS jeitos de pular, uma vez por pulo;
 *  · o "qualquer tecla ou toque" não dispara em rajada nem sobrevive ao reinício.
 */

type Fn = (...args: unknown[]) => unknown
type Listener = (ev: unknown) => void

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  onGround?: boolean
  skin?: { onGround?: boolean }
}

interface Api {
  createSprite: Fn
  createGroup: Fn
  createDino: Fn
  createTileMap: Fn
  drawTileMap: Fn
  setGravity: Fn
  applyVelocity: Fn
  applyGravity: Fn
  applyGravityToGroup: Fn
  updateGroup: Fn
  platformer: Fn
  collideTileMap: Fn
  collideSprite: Fn
  collideGroup: Fn
  jumpOnGround: Fn
  controlDino: Fn
  swim: Fn
  onJump: Fn
  onAnyInput: Fn
  restart: Fn
  onStart: Fn
  keys: { left: boolean; right: boolean; up: boolean; down: boolean }
}

/** ctx de mentira: os helpers de pulo só querem o tamanho do palco. */
const ctx = { canvas: { width: 480, height: 270 } }

function load(): { api: Api; fire: (name: string, ev?: unknown) => void } {
  const listeners: Record<string, Listener[]> = {}
  const win = {
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    SZGame2D: undefined,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  const api = win.SZGame2D as Api | undefined
  if (!api) throw new Error('runtime não montou window.SZGame2D')
  return {
    api,
    fire: (name, ev = {}) => {
      for (const fn of listeners[name] ?? []) fn(ev)
    },
  }
}

function sprite(api: Api, x = 100, y = 0): Sprite {
  return api.createSprite({ x, y, w: 20, h: 20 }) as unknown as Sprite
}

describe('a gravidade saiu do "aplicar a velocidade"', () => {
  it('mover não faz mais cair', () => {
    const { api } = load()
    api.setGravity(1)
    const s = sprite(api)
    api.applyVelocity(s)
    api.applyVelocity(s)
    expect(s.vy).toBe(0)
    expect(s.y).toBe(0)
  })

  it('o bloco de gravidade usa a do MUNDO, e 0.6 quando ninguém declarou', () => {
    const semDeclarar = load().api
    const a = sprite(semDeclarar)
    semDeclarar.applyGravity(a)
    expect(a.vy).toBeCloseTo(0.6, 10)

    const declarado = load().api
    declarado.setGravity(2)
    const b = sprite(declarado)
    declarado.applyGravity(b)
    expect(b.vy).toBe(2)

    // Gravidade 0 DECLARADA é diferente de "não declarei": não puxa nada.
    const zero = load().api
    zero.setGravity(0)
    const c = sprite(zero)
    zero.applyGravity(c)
    expect(c.vy).toBe(0)
  })

  it('gravidade antes do movimento responde no mesmo quadro', () => {
    const { api } = load()
    api.setGravity(1)
    const s = sprite(api, 0, 0)
    s.vx = 2
    for (let i = 0; i < 3; i++) {
      api.applyGravity(s)
      api.applyVelocity(s)
    }
    // Euler semi-implícito: a aceleração deste quadro participa do movimento.
    expect(s.x).toBe(6)
    expect(s.y).toBe(6)
    expect(s.vy).toBe(3)
  })

  it('cada execução soma uma aceleração, sem mover a posição', () => {
    const { api } = load()
    const s = sprite(api)
    api.applyGravity(s)
    api.applyGravity(s)
    expect(s.vy).toBeCloseTo(1.2, 10)
    expect(s.y).toBe(0)
  })
})

describe('gravidade explícita nos grupos', () => {
  it('atualizar grupo nunca aplica a gravidade sozinho', () => {
    const { api } = load()
    const grupo = api.createGroup() as { items: Sprite[] }
    const s = sprite(api)
    grupo.items.push(s)

    for (let i = 0; i < 10; i++) api.updateGroup(grupo)

    expect(s.vy).toBe(0)
    expect(s.y).toBe(0)
  })

  it('aplicar no grupo acelera todos; atualizar integra depois', () => {
    const { api } = load()
    api.setGravity(0.5)
    const grupo = api.createGroup() as { items: Sprite[] }
    const s = sprite(api)
    grupo.items.push(s)

    api.applyGravityToGroup(grupo)
    expect(s.vy).toBe(0.5)
    expect(s.y).toBe(0)
    api.updateGroup(grupo)
    expect(s.y).toBe(0.5)
    expect(s.vy).toBe(0.5)
  })
})

describe('helpers não escondem aceleração', () => {
  it('plataforma sem aplicar gravidade não começa a cair', () => {
    const { api } = load()
    const heroi = sprite(api, 100, 100)
    api.platformer(heroi, ctx, 4, 11)
    expect(heroi.vy).toBe(0)
    expect(heroi.y).toBe(100)
  })

  it('nadar boia sem gravidade e amortece a gravidade aplicada antes', () => {
    const { api } = load()
    const peixe = sprite(api, 100, 100)
    api.swim(peixe, 2)
    expect(peixe.y).toBe(100)
    api.applyGravity(peixe)
    api.swim(peixe, 2)
    expect(peixe.vy).toBeCloseTo(0.528, 10)
    expect(peixe.y).toBeCloseTo(100.528, 10)
  })
})

describe('pulo conserva o apoio confirmado pela colisão do quadro anterior', () => {
  it('pula no primeiro quadro sobre um tile sólido (ordem usada pelo projeto do Mario)', () => {
    const { api } = load()
    const mapCtx = { canvas: { width: 64, height: 64 }, fillRect() {} }
    const mapa = api.createTileMap({ image: '', tile: 32, solid: '1', grid: '. .;1 1' })
    api.drawTileMap(mapCtx, mapa, 0, 0, 32)
    const heroi = sprite(api, 4, 10)
    heroi.w = 16
    heroi.h = 16
    heroi.vy = 8

    api.applyVelocity(heroi)
    api.collideTileMap(heroi, mapa)
    expect(heroi.onGround).toBe(true)

    api.keys.up = true
    api.applyGravity(heroi)
    api.platformer(heroi, mapCtx, 4, 11)
    api.collideTileMap(heroi, mapa)

    expect(heroi.vy).toBe(-11)
    expect(heroi.y).toBeLessThan(16)
  })

  it('pula no primeiro quadro sobre um tile plataforma', () => {
    const { api } = load()
    const mapCtx = { canvas: { width: 64, height: 64 }, fillRect() {} }
    const mapa = api.createTileMap({
      image: '',
      tile: 32,
      solid: '',
      platform: '2',
      grid: '. .;2 2',
    })
    api.drawTileMap(mapCtx, mapa, 0, 0, 32)
    const heroi = sprite(api, 4, 10)
    heroi.w = 16
    heroi.h = 16
    heroi.vy = 8
    api.applyVelocity(heroi)
    api.collideTileMap(heroi, mapa)

    api.keys.up = true
    api.applyGravity(heroi)
    api.platformer(heroi, mapCtx, 4, 11)
    api.collideTileMap(heroi, mapa)

    expect(heroi.vy).toBe(-11)
    expect(heroi.y).toBeLessThan(16)
  })

  it('pula no primeiro quadro sobre uma figura usada como chão sólido', () => {
    const { api } = load()
    const heroi = sprite(api, 4, 10)
    heroi.w = 16
    heroi.h = 16
    heroi.vy = 8
    const piso = sprite(api, 0, 32)
    piso.w = 64
    piso.h = 16

    api.applyVelocity(heroi)
    api.collideSprite(heroi, piso)
    expect(heroi.onGround).toBe(true)

    api.keys.up = true
    api.applyGravity(heroi)
    api.platformer(heroi, ctx, 4, 11)
    api.collideSprite(heroi, piso)

    expect(heroi.vy).toBe(-11)
    expect(heroi.y).toBeLessThan(16)
  })

  it('pula sobre um grupo sólido e o helper genérico usa o mesmo contrato', () => {
    const { api } = load()
    const piso = sprite(api, 0, 32)
    piso.w = 64
    piso.h = 16
    const grupo = api.createGroup() as { items: Sprite[] }
    grupo.items.push(piso)
    const heroi = sprite(api, 4, 10)
    heroi.w = 16
    heroi.h = 16
    heroi.vy = 8
    api.applyVelocity(heroi)
    api.collideGroup(heroi, grupo)

    api.keys.up = true
    api.applyGravity(heroi)
    api.jumpOnGround(heroi, ctx, 14)
    api.collideGroup(heroi, grupo)

    expect(heroi.vy).toBe(-14)
    expect(heroi.y).toBeLessThan(16)
  })
})

describe('"Quando o sprite pular" nos três jeitos de pular', () => {
  function conta(api: Api, alvo: Sprite): () => number {
    let n = 0
    api.onJump(
      () => alvo,
      () => {
        n++
      },
      'evento-de-teste',
    )
    return () => n
  }

  it('estilo plataforma', () => {
    const { api } = load()
    const heroi = sprite(api, 100, 200)
    const pulos = conta(api, heroi)

    // Cai até o chão da tela, então pula.
    for (let i = 0; i < 30; i++) {
      api.applyGravity(heroi)
      api.platformer(heroi, ctx, 4, 11)
    }
    expect(pulos()).toBe(0)

    api.keys.up = true
    api.platformer(heroi, ctx, 4, 11)
    expect(pulos()).toBe(1)

    // Segurar a tecla NÃO conta de novo: já saiu do chão.
    api.platformer(heroi, ctx, 4, 11)
    expect(pulos()).toBe(1)
    api.keys.up = false
  })

  it('pular no chão', () => {
    const { api } = load()
    const heroi = sprite(api, 100, 200)
    const pulos = conta(api, heroi)
    for (let i = 0; i < 30; i++) {
      api.applyGravity(heroi)
      api.jumpOnGround(heroi, ctx, 14)
    }
    expect(pulos()).toBe(0)

    api.keys.up = true
    api.applyGravity(heroi)
    api.jumpOnGround(heroi, ctx, 14)
    expect(pulos()).toBe(1)
    api.keys.up = false
  })

  it('kit do dinossauro', () => {
    const { api } = load()
    const dino = api.createDino({ x: 100, y: 0, size: 40, color: '#5fb45f' }) as unknown as Sprite
    const pulos = conta(api, dino)
    for (let i = 0; i < 60; i++) {
      api.applyGravity(dino)
      api.controlDino(dino, ctx, 14)
    }
    expect(pulos()).toBe(0)

    api.keys.up = true
    api.applyGravity(dino)
    api.controlDino(dino, ctx, 14)
    expect(pulos()).toBe(1)
    api.keys.up = false
  })

  it('o evento é de UM sprite: o pulo do outro não dispara', () => {
    const { api } = load()
    const heroi = sprite(api, 100, 200)
    const outro = sprite(api, 300, 200)
    const pulos = conta(api, heroi)

    for (let i = 0; i < 30; i++) {
      api.applyGravity(outro)
      api.jumpOnGround(outro, ctx, 14)
    }
    api.keys.up = true
    api.applyGravity(outro)
    api.jumpOnGround(outro, ctx, 14)
    api.keys.up = false

    expect(pulos()).toBe(0)
  })
})

describe('"Quando apertar qualquer tecla ou tocar na tela"', () => {
  it('dispara no teclado e ignora a repetição da tecla segurada', () => {
    const { api, fire } = load()
    let n = 0
    api.onAnyInput(() => {
      n++
    }, 'qualquer-1')

    fire('keydown', { key: 'x', code: 'KeyX' })
    expect(n).toBe(1)
    // O sistema repete o keydown enquanto a tecla fica segurada.
    fire('keydown', { key: 'x', code: 'KeyX', repeat: true })
    fire('keydown', { key: 'x', code: 'KeyX', repeat: true })
    expect(n).toBe(1)

    fire('keydown', { key: 'z', code: 'KeyZ' })
    expect(n).toBe(2)
  })

  it('some no "Jogar de novo" (senão dispararia em dobro na 2ª partida)', () => {
    const { api, fire } = load()
    let n = 0
    api.onStart(() => {
      api.onAnyInput(() => {
        n++
      }, 'qualquer-1')
    }, 'projeto')

    fire('keydown', { key: 'a', code: 'KeyA' })
    expect(n).toBe(1)

    api.restart()
    fire('keydown', { key: 'a', code: 'KeyA' })
    expect(n).toBe(2) // e não 3
  })
})
