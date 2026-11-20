import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  type CanvasSpy,
  type Harness,
  installCanvasSpy,
  loadRuntime,
  startPlaying,
} from './kitHarness'

/**
 * A porta da aba Investigar do Estúdio no Jogo 2D Avançado (`game-2d-advanced:investigar`,
 * proposta aprovada em 20/11/2026, `docs/estudio-evolucao/paineis-proposta.md`): a pausa é o
 * estado "pausado" que o motor já tem; o quadro é o que a criança vê andar (o `perf.passos` anda
 * também na pausa, e foi por isso que a porta nasceu); Avançar 1 quadro anda UM quadro, também
 * com o relógio fixo; e a aba Desempenho lê quantos personagens entraram no último quadro.
 */

interface Leitura {
  frame: number
  paused: boolean
  canPause: boolean
  drawn: number
  pause: () => void
  resume: () => void
  step: () => void
}

interface Cena {
  h: Harness
  spy: CanvasSpy & { restore: () => void }
  investigar: (comando?: 'pause' | 'resume' | 'step') => Leitura
  perf: () => { passos: number }
  quadro: (ms?: number) => void
}

const QUADRO_MS = 1000 / 60

let atual: Cena | null = null

async function cena(): Promise<Cena> {
  const spy = installCanvasSpy()
  const inspectors: Record<string, (arg?: unknown) => unknown> = {}
  let relogio = 0
  const h = loadRuntime({
    __SZSTUDIO_RUNTIME_INSPECTORS: inspectors,
    performance: { now: () => relogio },
  })
  await startPlaying(h, 400, 300)
  const porta = inspectors['game-2d-advanced:investigar']
  const sonda = inspectors['game-2d-advanced:perf']
  if (typeof porta !== 'function' || typeof sonda !== 'function')
    throw new Error('as portas do Estúdio não registraram')
  atual = {
    h,
    spy,
    investigar: (comando) => {
      const antes = porta() as Leitura
      if (comando === 'pause' || comando === 'resume' || comando === 'step') antes[comando]()
      return porta() as Leitura
    },
    perf: () => sonda() as { passos: number },
    quadro: (ms = QUADRO_MS) => {
      relogio += ms
      h.nextFrame(relogio)
    },
  }
  return atual
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  atual?.spy.restore()
  atual = null
})

describe('gk — a porta da aba Investigar', () => {
  it('não existe sem o registro do host (o jogo comum e o exportado não a têm)', () => {
    const spy = installCanvasSpy()
    try {
      const h = loadRuntime()
      expect(Object.keys(h.api)).not.toContain('investigar')
      expect(h.window.__SZSTUDIO_RUNTIME_INSPECTORS).toBeUndefined()
    } finally {
      spy.restore()
    }
  })

  it('pausa pelo estado "pausado" do motor, e pausado o quadro não anda', async () => {
    const c = await cena()
    for (let i = 0; i < 5; i += 1) c.quadro()
    expect(c.investigar()).toMatchObject({ frame: 5, paused: false, canPause: true })

    expect(c.investigar('pause')).toMatchObject({ frame: 5, paused: true, canPause: true })
    expect(c.h.api.state()).toBe('pausado')
    const passosAntes = c.perf().passos
    for (let i = 0; i < 5; i += 1) c.quadro()
    // O motor segue dando passos na pausa (o laço não para); o quadro do jogo, não.
    expect(c.perf().passos).toBe(passosAntes + 5)
    expect(c.investigar().frame).toBe(5)

    expect(c.investigar('resume')).toMatchObject({ paused: false })
    c.quadro()
    expect(c.investigar().frame).toBe(6)
  })

  it('só pausa no "jogando": no menu e no fim a aba não oferece Pausar', async () => {
    const c = await cena()
    c.h.api.returnToMenu()
    expect(c.investigar('pause')).toMatchObject({ paused: false, canPause: false })
    expect(c.h.api.state()).toBe('menu')
    c.h.api.setState('jogando')
    c.h.api.endGame()
    expect(c.investigar()).toMatchObject({ canPause: false })
  })

  it('Avançar 1 quadro roda o "A cada quadro" UMA vez e pausa de novo', async () => {
    const c = await cena()
    let vezes = 0
    c.h.api.onUpdate(() => {
      vezes += 1
    })
    c.quadro()
    c.investigar('pause')
    const antes = { quadro: c.investigar().frame, vezes }

    c.investigar('step')
    for (let i = 0; i < 6; i += 1) c.quadro()

    expect(c.investigar()).toMatchObject({ frame: antes.quadro + 1, paused: true })
    expect(vezes).toBe(antes.vezes + 1)
    expect(c.h.api.state()).toBe('pausado')
  })

  it('com o relógio fixo, Avançar anda um passo mesmo num quadro de tela que daria dois', async () => {
    const c = await cena()
    c.h.api.enableFixedSimulation({ hz: 60, seed: 7, maxCatchUpSteps: 5 })
    let passos = 0
    c.h.api.onUpdate(() => {
      passos += 1
    })
    c.quadro()
    c.investigar('pause')
    const antes = { quadro: c.investigar().frame, passos }

    c.investigar('step')
    // Um quadro de tela de 2,5 passos: o relógio fixo rodaria dois passos nele.
    c.quadro(QUADRO_MS * 2.5)
    c.quadro(QUADRO_MS * 2.5)

    expect(c.investigar()).toMatchObject({ frame: antes.quadro + 1, paused: true })
    expect(passos).toBe(antes.passos + 1)
  })

  it('com o relógio fixo, um quadro de tela curto demais não perde o Avançar', async () => {
    const c = await cena()
    c.h.api.enableFixedSimulation({ hz: 60, seed: 7, maxCatchUpSteps: 5 })
    c.quadro()
    c.investigar('pause')
    const antes = c.investigar().frame

    c.investigar('step')
    c.quadro(QUADRO_MS / 4) // nenhum passo cabe aqui
    expect(c.investigar()).toMatchObject({ frame: antes, paused: false })
    for (let i = 0; i < 4; i += 1) c.quadro()
    expect(c.investigar()).toMatchObject({ frame: antes + 1, paused: true })
  })

  it('Continuar desfaz um Avançar pendente (o jogo segue rodando)', async () => {
    const c = await cena()
    c.quadro()
    c.investigar('pause')
    c.investigar('step')
    c.investigar('resume')
    for (let i = 0; i < 4; i += 1) c.quadro()
    expect(c.investigar()).toMatchObject({ paused: false })
    expect(c.h.api.state()).toBe('jogando')
  })

  it('conta os personagens desenhados no último quadro, depois do recorte da câmera', async () => {
    const c = await cena()
    const perto = c.h.api.createCharacter({ w: 16, h: 16 })
    const longe = c.h.api.createCharacter({ w: 16, h: 16 })
    perto.x = 20
    longe.x = 5000
    let desenhar = 2
    c.h.api.onDraw(() => {
      if (desenhar >= 1) c.h.api.drawCharacter(perto)
      if (desenhar >= 2) c.h.api.drawCharacter(longe)
    })
    c.quadro()
    expect(c.investigar().drawn).toBe(2)

    c.h.api.cameraFollow(perto, 6000, 300)
    c.quadro()
    // Com a câmera ligada, o longe fica fora da vista e não toca o canvas.
    expect(c.investigar().drawn).toBe(1)

    desenhar = 0
    c.quadro()
    expect(c.investigar().drawn).toBe(0)
  })
})
