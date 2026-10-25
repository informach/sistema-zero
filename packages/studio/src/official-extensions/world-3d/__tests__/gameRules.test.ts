import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import * as RealTHREE from 'three'
import { compileStatements } from '#generators'
import { parseJS } from '../../../parsers/js'
import { CACA_ESTRELAS_SOURCE } from '../__gen_cacaEstrelas'
import {
  loadExampleWorld,
  loadStartedWorld,
  pressKey,
  releaseKey,
  type WorldApi,
} from './kitHarness'

/**
 * Lote 10 do review 3D (10/2026): as REGRAS DE JOGO no Mundo 3D, de ponta a ponta com o three
 * de verdade (só o WebGLRenderer é falso).
 *
 * - pegar um coletável → pontos; o perigo machuca o JOGADOR (vida sem objeto) → fim de jogo;
 * - o fim de jogo PAUSA o jogador (a cena continua desenhada) e mostra a tela;
 * - o "Jogar de novo" é o recomeçar LEVE: o jogador volta ao começo, os coletáveis voltam, os
 *   pontos zeram e a vida/contagem do "Ao iniciar" são refeitas; o terreno NÃO é refeito e a
 *   mochila NÃO esvazia;
 * - "Tirar … do mundo" e "Esvaziar a mochila".
 */

interface Rules {
  person(color: string, hat: string): void
  personPlace(x: number, z: number, deg: number): void
  playerPos(axis: string): number
  collectible(n: number, kind: string, name: string, x: number, z: number, r: number): void
  onCollectItem(name: string, fn: () => void): void
  addScore(n: number): void
  score(): number
  setLife(n: number): void
  hurt(n: number): void
  lifeOf(): number
  onLifeOver(fn: () => void): void
  startTimer(secs: number): void
  timeLeft(): number
  endGame(result: string): void
  restart(): void
  setScreenText(kind: string, title: string, text: string, button: string): void
  inventoryGive(item: string, n: number): void
  inventoryCount(item: string): number
  inventoryClear(): void
  removeNamed(name: string): void
  npc(name: string, x: number, z: number, color: string, hat: string): void
  marker(icon: string, x: number, z: number): void
  afterSeconds(secs: number, fn: () => void): void
}

type Api = WorldApi & Rules

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
  for (const el of Array.from(document.querySelectorAll('#szw3d-stage, .szr-layer'))) el.remove()
  releaseKey('w', 'KeyW')
  try {
    localStorage.clear()
  } catch {}
})

const ticks = () => new Promise((resolve) => setTimeout(resolve, 5))

function screenButton(kind: string): HTMLButtonElement | null {
  return document.querySelector(`[data-szr-screen="${kind}"] button`)
}

describe('Mundo 3D — regras de jogo de ponta a ponta (lote 10)', () => {
  it('coletável dá ponto, perigo tira vida, fim pausa e o recomeçar é leve', async () => {
    let terrainBuilds = 0
    class CountingPlane extends RealTHREE.PlaneGeometry {
      constructor(w?: number, h?: number, ws?: number, hs?: number) {
        super(w, h, ws, hs)
        if ((ws ?? 1) >= 64) terrainBuilds++
      }
    }
    const loaded = await loadStartedWorld(
      (a) => {
        const api = a as Api
        api.person('#3b82f6', 'nenhum')
        api.collectible(1, 'estrela', 'estrela', 20, 0, 0)
        api.onCollectItem('estrela', () => api.addScore(1))
        api.onLifeOver(() => api.endGame('perdeu'))
        api.setLife(3)
        api.startTimer(30)
        api.inventoryGive('chave', 2)
      },
      { PlaneGeometry: CountingPlane },
    )
    const api = loaded.api as Api
    const { step } = loaded
    const builtAtStart = terrainBuilds
    const spawn = { x: api.playerPos('x'), z: api.playerPos('z') }
    expect(api.lifeOf()).toBe(3)
    expect(api.score()).toBe(0)

    // Encostar no coletável: ponto (separado das moedas) e o coletável some.
    api.personPlace(20, 0, 0)
    step(2)
    expect(api.score()).toBe(1)
    expect(document.querySelector('[data-szr-panel="pontos"]')?.textContent).toBe('⭐ 1')

    // O perigo machuca o jogador; a vida acaba → fim de jogo (tela + pausa).
    api.hurt(1)
    expect(api.lifeOf()).toBe(2)
    step(40)
    api.hurt(5)
    expect(api.lifeOf()).toBe(0)
    expect(screenButton('fim')).not.toBeNull()
    const frozenX = api.playerPos('x')
    const frozenZ = api.playerPos('z')
    pressKey('w', 'KeyW')
    step(20)
    releaseKey('w', 'KeyW')
    expect(api.playerPos('x')).toBe(frozenX)
    expect(api.playerPos('z')).toBe(frozenZ)
    // A cena continua desenhada por trás da tela (o renderer segue recebendo quadros).
    expect(loaded.renderers[0]?.scene).not.toBeNull()

    // "Jogar de novo": recomeçar LEVE (fora do quadro).
    screenButton('fim')?.click()
    for (let i = 0; i < 4; i++) await ticks()
    step(2)
    expect(screenButton('fim')).toBeNull()
    expect(api.playerPos('x')).toBeCloseTo(spawn.x, 5)
    expect(api.playerPos('z')).toBeCloseTo(spawn.z, 5)
    expect(api.score()).toBe(0)
    // O "Ao iniciar" das regras foi refeito: 3 de vida e a contagem cheia.
    expect(api.lifeOf()).toBe(3)
    expect(api.timeLeft()).toBe(30)
    // A mochila NÃO zera e o terreno NÃO é reconstruído.
    expect(api.inventoryCount('chave')).toBe(2)
    expect(terrainBuilds).toBe(builtAtStart)

    // O coletável voltou: pegar de novo dá o ponto de novo, e o jogador anda.
    api.personPlace(20, 0, 0)
    step(2)
    expect(api.score()).toBe(1)
    pressKey('w', 'KeyW')
    step(10)
    releaseKey('w', 'KeyW')
    expect(api.playerPos('z')).toBeGreaterThan(0.5)
  })

  it('o fim de jogo por vitória mostra a tela de vitória e o "Recomeçar" do bloco também é leve', async () => {
    const { api: a, step } = await loadStartedWorld((w) => {
      const api = w as Api
      api.person('#3b82f6', 'nenhum')
      api.setScreenText('vitoria', 'Ganhou!', 'Muito bem', 'De novo')
    })
    const api = a as Api
    api.addScore(5)
    api.endGame('ganhou')
    const box = document.querySelector('[data-szr-screen="vitoria"]')
    expect(box?.textContent).toContain('Ganhou!')
    expect(box?.textContent).toContain('⭐ 5 pontos')
    api.restart()
    for (let i = 0; i < 4; i++) await ticks()
    step(1)
    expect(document.querySelector('[data-szr-screen="vitoria"]')).toBeNull()
    expect(api.score()).toBe(0)
  })

  it('coletáveis nascidos DURANTE a partida saem no recomeçar; os do começo voltam', async () => {
    const { api: a, step } = await loadStartedWorld((w) => {
      const api = w as Api
      api.person('#3b82f6', 'nenhum')
      api.collectible(1, 'cristal', 'gema', 30, 0, 0)
    })
    const api = a as Api
    let taken = 0
    api.onCollectItem('gema', () => taken++)
    api.collectible(1, 'presente', 'gema', -30, 0, 0)
    api.personPlace(-30, 0, 0)
    step(2)
    expect(taken).toBe(1)
    api.restart()
    for (let i = 0; i < 4; i++) await ticks()
    api.personPlace(-30, 0, 0)
    step(2)
    expect(taken).toBe(1)
    api.personPlace(30, 0, 0)
    step(2)
    expect(taken).toBe(2)
  })

  it('"Tirar … do mundo" tira amigo, ponto, coletáveis e ícones; "Esvaziar a mochila" zera', async () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const {
        api: a,
        renderers,
        step,
      } = await loadStartedWorld((w) => {
        const api = w as Api
        api.person('#3b82f6', 'nenhum')
        api.npc('Lia', 10, 10, '#f97316', 'nenhum')
        api.point('poco', -10, 10)
        api.collectible(3, 'fruta', 'maca', 0, 30, 4)
        api.marker('alerta', 5, 5)
        api.inventoryGive('madeira', 4)
      })
      const api = a as Api
      const scene = renderers[0]?.scene
      if (!scene) throw new Error('sem cena')
      const sprites = () => {
        let n = 0
        scene.traverse((o) => {
          if ((o as RealTHREE.Sprite).isSprite) n++
        })
        return n
      }
      const meshes = () => {
        let n = 0
        scene.traverse(() => n++)
        return n
      }
      const before = meshes()
      const spritesBefore = sprites()
      api.removeNamed('Lia')
      api.removeNamed('poco')
      api.removeNamed('maca')
      api.removeNamed('alerta')
      step(1)
      expect(meshes()).toBeLessThan(before)
      // (o ícone flutuante precisa de canvas 2D, que o happy-dom não tem: aqui ele nem nasce,
      // e "Tirar alerta" só não pode lançar)
      expect(sprites()).toBeLessThanOrEqual(spritesBefore)
      // Pegar onde estavam as frutas não dispara nada (foram tiradas).
      let eaten = 0
      api.onCollectItem('maca', () => eaten++)
      for (const [x, z] of [
        [0, 30],
        [4, 30],
        [-4, 30],
        [0, 34],
        [0, 26],
      ]) {
        api.personPlace(x ?? 0, z ?? 0, 0)
        step(1)
      }
      expect(eaten).toBe(0)
      // Nome que não existe só avisa.
      api.removeNamed('fantasma')
      expect(warn.mock.calls.some((call) => String(call[0]).includes('fantasma'))).toBe(true)
      expect(api.inventoryCount('madeira')).toBe(4)
      api.inventoryClear()
      expect(api.inventoryCount('madeira')).toBe(0)
    } finally {
      warn.mockRestore()
    }
  })

  it('o exemplo "Caça às Estrelas" roda: tela de início segura o mundo até o botão', async () => {
    const code = compileStatements(parseJS(CACA_ESTRELAS_SOURCE), 0)
    const { api: a, step } = await loadExampleWorld(code)
    const api = a as Api
    const start = screenButton('inicio')
    expect(start).not.toBeNull()
    const x0 = api.playerPos('x')
    const z0 = api.playerPos('z')
    pressKey('w', 'KeyW')
    step(10)
    expect(api.playerPos('z')).toBe(z0)
    start?.click()
    step(10)
    releaseKey('w', 'KeyW')
    expect(api.playerPos('z')).not.toBe(z0)
    expect(api.playerPos('x')).toBeCloseTo(x0, 0)
    expect(api.lifeOf()).toBe(3)
    expect(api.timeLeft()).toBeGreaterThan(80)
    expect(document.querySelector('[data-szr-panel="vidas"]')?.textContent).toBe('❤️❤️❤️')
  })
})
