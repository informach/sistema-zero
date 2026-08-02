import { beforeEach, describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

/**
 * Nadar e voar (v0.55.0) — os jeitos NOVOS de o sprite se mover.
 *
 * Decisões da usuária: voar são DOIS blocos (livre e bater as asas) e nadar é
 * "água pesada" (com gravidade explícita afunda devagar; tudo é mais lento). Os três
 * são jeitos do sprite o tempo todo, no formato do "estilo plataforma".
 */

type Fn = (...args: unknown[]) => unknown

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  onGround?: boolean
  _groundedLastFrame?: boolean
}

interface MotionApi {
  createSprite: Fn
  setGravity: Fn
  applyGravity: Fn
  flyFree: Fn
  flap: Fn
  swim: Fn
  topDown: Fn
  platformer: Fn
  autoAnimate: Fn
  setStateAnimation: Fn
  setAnimation: Fn
  keys: { left: boolean; right: boolean; up: boolean; down: boolean }
}

/** ctx de mentira: o `flap` só quer o tamanho do palco (o chão é a borda). */
const ctx = { canvas: { width: 400, height: 300 } }

function loadRuntime(): MotionApi {
  const win = {
    addEventListener() {},
    SZGame2D: undefined,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  const api = win.SZGame2D as MotionApi | undefined
  if (!api) throw new Error('runtime não montou window.SZGame2D')
  return api
}

let api: MotionApi

beforeEach(() => {
  api = loadRuntime()
  api.keys.left = false
  api.keys.right = false
  api.keys.up = false
  api.keys.down = false
})

function sprite(x = 100, y = 100): Sprite {
  return api.createSprite({ x, y, w: 20, h: 20 }) as unknown as Sprite
}

describe('game-2d — voar livre', () => {
  it('não cai: parado no ar, fica parado (gravidade nenhuma)', () => {
    const passaro = sprite()
    for (let i = 0; i < 30; i++) api.flyFree(passaro, 3)

    expect(passaro.y).toBe(100)
    expect(passaro.vy).toBe(0)
  })

  it('sobe segurando a seta pra cima e nunca passa da velocidade escolhida', () => {
    const passaro = sprite()
    api.keys.up = true
    for (let i = 0; i < 60; i++) api.flyFree(passaro, 3)

    expect(passaro.y).toBeLessThan(100)
    expect(Math.hypot(passaro.vx, passaro.vy)).toBeLessThanOrEqual(3 + 1e-9)
  })

  it('PLANA ao soltar: segue andando um pouco e depois para de vez', () => {
    const passaro = sprite()
    api.keys.right = true
    for (let i = 0; i < 20; i++) api.flyFree(passaro, 3)
    const naSolta = passaro.x
    api.keys.right = false

    api.flyFree(passaro, 3)
    expect(passaro.x).toBeGreaterThan(naSolta) // ainda desliza

    for (let i = 0; i < 300; i++) api.flyFree(passaro, 3)
    expect(passaro.vx).toBe(0) // e para de verdade (não fica "se movendo" p/ sempre)
  })

  // ⭐ O ponto do bloco. Ela testou a 1ª versão e disse: "não vi muita diferença
  // prática entre o voar livre e o andar em todas as direções do top down" — e
  // estava certa: a inércia de então sumia em 3 quadros. Se alguém abaixar o
  // peso de novo, é aqui que aparece.
  it('a INÉRCIA é o que separa do 4 direções, e ela precisa ser sentida', () => {
    const voando = sprite()
    const andando = sprite()
    api.keys.right = true

    // Arrancada: o top-down já sai na velocidade cheia; o voo tem que demorar.
    api.flyFree(voando, 3)
    api.topDown(andando, 3)
    expect(andando.vx).toBe(3)
    expect(voando.vx).toBeLessThan(1)

    for (let i = 0; i < 60; i++) {
      api.flyFree(voando, 3)
      api.topDown(andando, 3)
    }
    api.keys.right = false

    // Planeio: o top-down para no lugar; o voo desliza mais de meio segundo.
    const xVoo = voando.x
    const xAndar = andando.x
    let quadros = 0
    while (voando.vx !== 0 && quadros < 600) {
      api.flyFree(voando, 3)
      api.topDown(andando, 3)
      quadros++
    }
    expect(andando.x - xAndar).toBe(0)
    expect(voando.x - xVoo).toBeGreaterThan(50)
    expect(quadros).toBeGreaterThan(60) // mais de 1 segundo planando

    // Virar de lado custa: a velocidade não inverte no quadro seguinte.
    api.keys.right = true
    for (let i = 0; i < 60; i++) api.flyFree(voando, 3)
    api.keys.right = false
    api.keys.left = true
    api.flyFree(voando, 3)
    expect(voando.vx).toBeGreaterThan(0) // ainda indo pra direita, por inércia
  })

  it('não deixa marca de chão (senão a animação diria "caindo")', () => {
    const passaro = sprite()
    api.platformer(passaro, ctx, 4, 11) // deixa onGround marcado
    api.flyFree(passaro, 3)

    expect('onGround' in passaro).toBe(false)
    expect('_groundedLastFrame' in passaro).toBe(false)
  })
})

describe('game-2d — bater as asas', () => {
  it('sem o bloco de gravidade fica no ar; com ele, cai', () => {
    const passaro = sprite(100, 50)
    api.flap(passaro, ctx, 8)
    expect(passaro.vy).toBe(0)
    expect(passaro.y).toBe(50)

    api.applyGravity(passaro)
    api.flap(passaro, ctx, 8)
    expect(passaro.vy).toBeGreaterThan(0)
    expect(passaro.y).toBeGreaterThan(50)
  })

  it('cada TOQUE dá uma batida: segurar a tecla não sobe para sempre', () => {
    const passaro = sprite(100, 150)
    api.keys.up = true
    api.applyGravity(passaro)
    api.flap(passaro, ctx, 8) // 1ª batida
    const depoisDaBatida = passaro.vy
    expect(depoisDaBatida).toBeLessThan(0) // subindo

    // Segurando, o bloco não cria outra batida; só a gravidade explícita atua.
    api.applyGravity(passaro)
    api.flap(passaro, ctx, 8)
    expect(passaro.vy).toBeGreaterThan(depoisDaBatida)

    // Soltar e apertar de novo bate outra vez.
    api.keys.up = false
    api.applyGravity(passaro)
    api.flap(passaro, ctx, 8)
    api.keys.up = true
    api.applyGravity(passaro)
    api.flap(passaro, ctx, 8)
    expect(passaro.vy).toBeLessThan(0)
  })

  it('bate no AR também (é o que separa do "pular no chão")', () => {
    const passaro = sprite(100, 20)
    for (let i = 0; i < 10; i++) {
      api.applyGravity(passaro)
      api.flap(passaro, ctx, 8)
    }
    expect(passaro.vy).toBeGreaterThan(0)
    expect(passaro.onGround).not.toBe(true)

    api.keys.up = true
    api.applyGravity(passaro)
    api.flap(passaro, ctx, 8)
    expect(passaro.vy).toBeLessThan(0)
  })

  it('pousa na borda de baixo em vez de sumir da tela', () => {
    const passaro = sprite(100, 200)
    for (let i = 0; i < 200; i++) {
      api.applyGravity(passaro)
      api.flap(passaro, ctx, 8)
    }

    expect(passaro.y + passaro.h).toBeLessThanOrEqual(300)
    expect(passaro.onGround).toBe(true)
  })

  it('cada sprite tem a própria batida (dois pássaros na mesma tela)', () => {
    const um = sprite(50, 100)
    const outro = sprite(150, 100)
    api.keys.up = true
    api.applyGravity(um)
    api.flap(um, ctx, 8)
    api.applyGravity(outro)
    api.flap(outro, ctx, 8)

    expect(um.vy).toBeLessThan(0)
    expect(outro.vy).toBeLessThan(0)
  })
})

describe('game-2d — nadar', () => {
  it('com gravidade explícita, afunda bem mais devagar que cair no ar', () => {
    const peixe = sprite(100, 100)
    const noAr = sprite(100, 100)
    for (let i = 0; i < 30; i++) {
      api.applyGravity(peixe)
      api.swim(peixe, 2)
      api.applyGravity(noAr)
      api.platformer(noAr, ctx, 4, 11)
    }

    expect(peixe.y).toBeGreaterThan(100) // desceu
    expect(peixe.y - 100).toBeLessThan((noAr.y - 100) / 3) // muito mais devagar
  })

  it('sobe enquanto segura a seta pra cima', () => {
    const peixe = sprite(100, 100)
    api.keys.up = true
    for (let i = 0; i < 30; i++) api.swim(peixe, 2)

    expect(peixe.y).toBeLessThan(100)
  })

  it('nunca passa da velocidade escolhida', () => {
    const peixe = sprite(100, 100)
    api.keys.right = true
    api.keys.down = true
    for (let i = 0; i < 120; i++) api.swim(peixe, 2)

    expect(Math.hypot(peixe.vx, peixe.vy)).toBeLessThanOrEqual(2 + 1e-9)
  })

  it('sem aplicar gravidade, o bicho boia mesmo com o valor padrão', () => {
    const peixe = sprite(100, 100)
    for (let i = 0; i < 60; i++) api.swim(peixe, 2)

    expect(peixe.y).toBe(100)
    expect(peixe.vy).toBe(0)
  })

  it('com a gravidade do mundo em 0, aplicar continua sem puxar', () => {
    api.setGravity(0)
    const peixe = sprite(100, 100)
    for (let i = 0; i < 60; i++) {
      api.applyGravity(peixe)
      api.swim(peixe, 2)
    }

    expect(peixe.y).toBe(100)
    expect(peixe.vy).toBe(0)
  })

  it('também não deixa marca de chão', () => {
    const peixe = sprite(100, 100)
    api.platformer(peixe, ctx, 4, 11)
    api.swim(peixe, 2)

    expect('onGround' in peixe).toBe(false)
  })
})

describe('game-2d — a animação continua fazendo sentido', () => {
  /** Lê o estado que o autoAnimate escolheu (ele só troca quando muda). */
  function estadoDe(s: Sprite): string {
    return (s as unknown as { _animState?: string })._animState ?? ''
  }

  function comEstados(s: Sprite): void {
    for (const estado of ['parado', 'andando', 'vertical', 'pulando', 'caindo']) {
      api.setStateAnimation(s, estado, 'folha', 0, 1, 6)
    }
  }

  it('peixe nadando de lado aparece como "andando", não como "caindo"', () => {
    const peixe = sprite(100, 100)
    comEstados(peixe)
    // Vindo de um pulo (o jogo tinha plataforma antes da água): sem apagar a
    // marca de chão, o autoAnimate classificaria o peixe como "caindo".
    api.platformer(peixe, ctx, 4, 11)
    expect(peixe.onGround).toBe(false)

    api.keys.right = true
    for (let i = 0; i < 5; i++) api.swim(peixe, 2)
    api.autoAnimate(peixe)

    expect(estadoDe(peixe)).toBe('andando')
  })

  it('pássaro batendo as asas aparece como "pulando" (está mesmo no ar)', () => {
    const passaro = sprite(100, 50)
    comEstados(passaro)
    api.keys.up = true
    api.flap(passaro, ctx, 8)
    api.autoAnimate(passaro)

    expect(estadoDe(passaro)).toBe('pulando')
  })
})
