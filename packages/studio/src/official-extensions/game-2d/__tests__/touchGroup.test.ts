import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'
import type { GameTwoDGroup, GameTwoDRuntimeApi, GameTwoDSprite } from '../runtimeContract'

/**
 * "Quando o sprite começar a encostar em algum do grupo, chamando de …"
 * (onTouchGroup, 29/10/2026): o par do evento de grupo do Jogo 3D. Dispara UMA vez
 * por membro a cada novo encontro, com o membro no parâmetro; o "Para cada sprite do
 * grupo que colidir" (a cada quadro) continua sendo o caminho do que é contínuo.
 */

function harness() {
  const frames: Array<(time?: number) => void> = []
  let time = 0
  const win = {
    addEventListener() {},
    performance: { now: () => time },
    devicePixelRatio: 1,
    CSS: { supports: () => true },
    SZGame2D: undefined,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', 'cancelAnimationFrame', gameTwoDRuntime)(
    win,
    (callback: (time?: number) => void) => frames.push(callback),
    () => {},
  )
  const api = (win as unknown as { SZGame2D: GameTwoDRuntimeApi }).SZGame2D
  const frame = () => {
    time += 1000 / 60
    const next = frames.shift()
    next?.(time)
  }
  return { api, frame }
}

function coinsScene(api: GameTwoDRuntimeApi) {
  const jogador = api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
  const moedas = api.createGroup()
  const primeira = api.spawn(moedas, { x: 100, y: 0, w: 10, h: 10 }) as GameTwoDSprite
  const segunda = api.spawn(moedas, { x: 200, y: 0, w: 10, h: 10 }) as GameTwoDSprite
  return { jogador, moedas, primeira, segunda }
}

describe('onTouchGroup — começar a encostar em algum do grupo', () => {
  it('dispara uma vez por encontro, com o membro encostado, e de novo só depois de sair', () => {
    const { api, frame } = harness()
    const { jogador, moedas, primeira, segunda } = coinsScene(api)
    const tocadas: GameTwoDSprite[] = []
    api.onTouchGroup(
      () => jogador,
      () => moedas,
      (moeda) => tocadas.push(moeda),
      'pegar',
    )

    frame()
    expect(tocadas).toEqual([])

    jogador.x = 100
    frame()
    frame()
    frame()
    expect(tocadas).toEqual([primeira])

    jogador.x = 200
    frame()
    expect(tocadas).toEqual([primeira, segunda])

    jogador.x = 100
    frame()
    expect(tocadas).toEqual([primeira, segunda, primeira])
  })

  it('a moeda tirada do grupo no corpo conta uma vez só (o contador da aula)', () => {
    const { api, frame } = harness()
    const { jogador, moedas } = coinsScene(api)
    let contador = 0
    api.onTouchGroup(
      () => jogador,
      () => moedas,
      (moeda) => {
        api.removeFromGroup(moedas, moeda)
        contador += 1
      },
      'pegar',
    )
    jogador.x = 100
    for (let i = 0; i < 5; i++) frame()
    expect(contador).toBe(1)
    expect(api.countGroup(moedas)).toBe(1)
    jogador.x = 200
    for (let i = 0; i < 5; i++) frame()
    expect(contador).toBe(2)
    expect(api.countGroup(moedas)).toBe(0)
  })

  it('dois membros encostados no mesmo quadro disparam um de cada', () => {
    const { api, frame } = harness()
    const jogador = api.createSprite({ x: 0, y: 0, w: 40, h: 40 })
    const moedas = api.createGroup()
    const a = api.spawn(moedas, { x: 0, y: 0, w: 10, h: 10 })
    const b = api.spawn(moedas, { x: 20, y: 0, w: 10, h: 10 })
    const tocadas: GameTwoDSprite[] = []
    api.onTouchGroup(
      () => jogador,
      () => moedas,
      (moeda) => tocadas.push(moeda),
      'pegar',
    )
    frame()
    frame()
    expect(tocadas).toEqual([a, b])
  })

  it('a pausa congela: não dispara parado nem cria um encontro falso ao continuar', () => {
    const { api, frame } = harness()
    const { jogador, moedas, primeira } = coinsScene(api)
    const tocadas: GameTwoDSprite[] = []
    api.onTouchGroup(
      () => jogador,
      () => moedas,
      (moeda) => tocadas.push(moeda),
      'pegar',
    )
    jogador.x = 100
    frame()
    expect(tocadas).toEqual([primeira])
    api.pauseGame()
    frame()
    api.resumeGame()
    frame()
    frame()
    expect(tocadas).toEqual([primeira])
  })

  it('o grupo é resolvido no disparo: um grupo novo na variável passa a valer', () => {
    const { api, frame } = harness()
    const jogador = api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
    let moedas: GameTwoDGroup = api.createGroup()
    const tocadas: GameTwoDSprite[] = []
    api.onTouchGroup(
      () => jogador,
      () => moedas,
      (moeda) => tocadas.push(moeda),
      'pegar',
    )
    frame()
    moedas = api.createGroup()
    const nova = api.spawn(moedas, { x: 0, y: 0, w: 10, h: 10 })
    frame()
    expect(tocadas).toEqual([nova])
  })

  it('o mesmo bloco registrado de novo substitui, sem disparar em dobro', () => {
    const { api, frame } = harness()
    const { jogador, moedas } = coinsScene(api)
    let vezes = 0
    for (let i = 0; i < 2; i++)
      api.onTouchGroup(
        () => jogador,
        () => moedas,
        () => {
          vezes += 1
        },
        'pegar',
      )
    jogador.x = 100
    frame()
    expect(vezes).toBe(1)
  })
})
