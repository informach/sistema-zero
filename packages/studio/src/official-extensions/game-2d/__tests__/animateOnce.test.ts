import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

/**
 * Animação que roda UMA VEZ (`playAnimationOnce`) + a pergunta `animationEnded`.
 *
 * Antes disto, TODA animação de spritesheet era loop infinito por construção: o
 * quadro sai do relógio numa linha só, e o `% quadros` dela era a única coisa
 * que existia — sem contador de voltas, sem flag, sem como perguntar.
 *
 * Cada `it` aqui nasceu de um risco REAL do desenho, não de cobertura por
 * cobertura. O relógio é injetado (`performance.now`), então o teste avança o
 * tempo sem esperar nada.
 */

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  anim?: { from: number; to: number; fps: number; once?: boolean; start: number } | null
  animStates?: Record<string, unknown>
  _animState?: string | null
}

interface Api {
  createSprite: (opts: Record<string, unknown>) => Sprite
  loadSpriteSheet: (name: string, fw: number, fh: number) => unknown
  setAnimation: (s: Sprite, sheet: unknown, from: number, to: number, fps: number) => void
  playAnimationOnce: (s: Sprite, sheet: unknown, from: number, to: number, fps: number) => void
  animationEnded: (s: Sprite) => boolean
  setStateAnimation: (
    s: Sprite,
    state: string,
    sheet: unknown,
    from: number,
    to: number,
    fps: number,
  ) => void
  autoAnimate: (s: Sprite) => void
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

/** Sprite + folha prontos, com a animação de 4 quadros a 8 fps (500 ms no total). */
function cena() {
  const { api, clock } = load()
  const sprite = api.createSprite({ x: 0, y: 0, w: 16, h: 16, color: '#fff' })
  const sheet = api.loadSpriteSheet('brilho', 16, 16)
  return { api, clock, sprite, sheet }
}

describe('animação de uma vez', () => {
  it('acaba e CONGELA — a que repete nunca acaba', () => {
    const { api, clock, sprite, sheet } = cena()
    api.playAnimationOnce(sprite, sheet, 0, 3, 8)
    expect(api.animationEnded(sprite)).toBe(false)
    clock.t = 499
    expect(api.animationEnded(sprite)).toBe(false)
    clock.t = 500
    expect(api.animationEnded(sprite)).toBe(true)

    // A de LOOP nunca responde que acabou, por mais que o tempo passe.
    api.setAnimation(sprite, sheet, 0, 3, 8)
    clock.t = 99_999
    expect(api.animationEnded(sprite)).toBe(false)
  })

  it('⚠️ chamada TODO QUADRO enquanto corre não reinicia (senão congelaria no 1º)', () => {
    // É o gotcha do v0.53.0: sem a guarda, `start` era reescrito a cada frame e
    // a animação ficava presa no primeiro quadro para sempre.
    const { api, clock, sprite, sheet } = cena()
    api.playAnimationOnce(sprite, sheet, 0, 3, 8)
    for (let t = 0; t < 500; t += 16) {
      clock.t = t
      api.playAnimationOnce(sprite, sheet, 0, 3, 8)
    }
    clock.t = 500
    expect(api.animationEnded(sprite)).toBe(true)
  })

  it('⭐ depois de ACABAR, chamar de novo REINICIA (o "golpe" apertado 2 vezes)', () => {
    // ⚠️ Achado da revisão: com a guarda comparando só os argumentos, o mesmo
    // golpe tocava UMA ÚNICA VEZ na partida inteira — o caso principal do bloco
    // é justamente "quando apertar espaço, golpe", que se repete.
    const { api, clock, sprite, sheet } = cena()
    api.playAnimationOnce(sprite, sheet, 0, 3, 8)
    clock.t = 500
    expect(api.animationEnded(sprite)).toBe(true)

    api.playAnimationOnce(sprite, sheet, 0, 3, 8)
    expect(api.animationEnded(sprite)).toBe(false)
    clock.t = 999
    expect(api.animationEnded(sprite)).toBe(false)
    clock.t = 1000
    expect(api.animationEnded(sprite)).toBe(true)
  })

  it('"Animar sozinho" NÃO rouba a de uma vez enquanto ela corre', () => {
    const { api, clock, sprite, sheet } = cena()
    api.setStateAnimation(sprite, 'andando', sheet, 4, 7, 10)
    api.setStateAnimation(sprite, 'parado', sheet, 8, 8, 1)
    api.playAnimationOnce(sprite, sheet, 0, 3, 8)

    // Andando: o automático QUERIA trocar para 'andando' — mas cede a vez.
    sprite.vx = 3
    clock.t = 100
    api.autoAnimate(sprite)
    expect(sprite.anim?.once).toBe(true)
    expect(sprite.anim?.from).toBe(0)
  })

  it('⭐ quando ela acaba, o automático VOLTA a mandar (não congela para sempre)', () => {
    // ⚠️ Segundo achado: ao fazer o automático ceder a vez, o `_animState` velho
    // batia com o novo e o early-return cortava a troca — o sprite ficava preso
    // no último quadro da one-shot pelo resto da partida.
    //
    // ⚠️ A SEQUÊNCIA importa: o sprite precisa JÁ estar andando quando o golpe
    // começa. Só assim o `_animState` fica sujo com 'andando' e volta a bater
    // com o estado calculado depois. (A 1ª versão deste teste disparava o golpe
    // com o estado ainda vazio, e por isso passava mesmo com o defeito.)
    const { api, clock, sprite, sheet } = cena()
    api.setStateAnimation(sprite, 'andando', sheet, 4, 7, 10)
    sprite.vx = 3
    api.autoAnimate(sprite)
    expect(sprite._animState).toBe('andando')

    // Agora o golpe, com o sprite andando.
    api.playAnimationOnce(sprite, sheet, 0, 3, 8)
    clock.t = 100
    api.autoAnimate(sprite)
    expect(sprite.anim?.once).toBe(true)

    // Acabou, e ele CONTINUA andando: o automático tem que retomar.
    clock.t = 500
    api.autoAnimate(sprite)
    expect(sprite.anim?.once).toBeFalsy()
    expect(sprite.anim?.from).toBe(4)
  })

  it('sem animação nenhuma, "acabou?" responde não (em vez de explodir)', () => {
    const { api, sprite } = cena()
    expect(api.animationEnded(sprite)).toBe(false)
  })
})
