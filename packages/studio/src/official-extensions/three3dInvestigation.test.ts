import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import * as THREE from 'three'
import { gameThreeDRuntimeForVariant } from './game-3d/runtime'
import { loadStartedKit } from './game-3d-advanced/__tests__/kitHarness'
import { gameKit3DRuntime, gameKit3DRuntimeForVariant } from './game-3d-advanced/runtime'
import {
  THREE_INVESTIGATION_DECLARE_MARKER,
  THREE_INVESTIGATION_FRAME_MARKER,
  withThreeInvestigation,
} from './three3dInvestigation'
import { loadExampleWorld } from './world-3d/__tests__/kitHarness'
import { world3DRuntimeForVariant } from './world-3d/runtime'

/**
 * A aba Investigar e a medida nos três motores 3D (`three3dInvestigation.ts`): só a variante
 * `investigar` tem o código; a pausa é a de cada motor; Avançar anda UM quadro; a aba não
 * continua o que as regras pausaram (fim de jogo); e a medida conta os objetos da cena e os
 * desenhos do último quadro, somando todas as passadas.
 */

interface Leitura {
  frame: number
  paused: boolean
  canPause: boolean
  objects: number | null
  draws: number | null
  pause: () => void
  resume: () => void
  step: () => void
}

type Registro = Record<string, () => Leitura>

const corpo = (runtime: string) => runtime.replace(/^import \* as THREE from 'three';\n/, '')

/** A placa de vídeo de mentira conta os desenhos como o three: zera a cada render, se pedir. */
function contarDesenhos(renderer: Record<string, unknown>): { renders: number } {
  const contagem = { renders: 0 }
  const info = {
    autoReset: true,
    render: { calls: 0 },
    reset() {
      info.render.calls = 0
    },
  }
  const render = renderer.render as (...args: unknown[]) => void
  renderer.info = info
  renderer.render = (...args: unknown[]) => {
    if (info.autoReset) info.reset()
    info.render.calls += 1
    contagem.renders += 1
    render(...args)
  }
  return contagem
}

const variantes = {
  'Jogo 3D': (v: string) => gameThreeDRuntimeForVariant(v),
  'Mundo 3D': (v: string) => world3DRuntimeForVariant(v),
  '3D Avançado': (v: string) => gameKit3DRuntimeForVariant(v),
}

describe('a variante investigar dos motores 3D', () => {
  for (const [nome, variante] of Object.entries(variantes)) {
    it(`${nome}: o motor de sempre não leva nada; a variante leva o inspetor`, () => {
      for (const base of ['', 'sem-cenario-molda']) {
        const comum = variante(base)
        const investigar = variante([base, 'investigar'].filter(Boolean).join('+'))
        expect(comum).not.toContain('_szJogados')
        expect(comum).not.toContain('__SZ_3D_INVESTIGAR')
        expect(investigar).toContain('_szJogados')
        expect(investigar).not.toContain('__SZ_3D_INVESTIGAR')
        // Compila (o motor é um módulo: tira o import, como a bancada).
        expect(() => new Function('THREE', 'window', 'document', corpo(investigar))).not.toThrow()
      }
    })
  }

  it('cada motor tem exatamente um marcador de cada (sem eles, a montagem para)', () => {
    expect(() => withThreeInvestigation('var x = 1;\n', null)).toThrow(/marcador/)
    const dois = `  ${THREE_INVESTIGATION_DECLARE_MARKER}\n  ${THREE_INVESTIGATION_DECLARE_MARKER}\n  ${THREE_INVESTIGATION_FRAME_MARKER}\n`
    expect(() => withThreeInvestigation(dois, null)).toThrow(/marcador/)
    const certo = `a\n    ${THREE_INVESTIGATION_DECLARE_MARKER}\nb\n\t${THREE_INVESTIGATION_FRAME_MARKER}\nc\n`
    expect(withThreeInvestigation(certo, null)).toBe('a\nb\nc\n')
  })
})

describe('Jogo 3D investigado', () => {
  class FakeRenderer {
    static created: FakeRenderer[] = []
    shadowMap = { enabled: false, type: 0 }
    loop: ((time: number) => void) | null = null
    constructor() {
      FakeRenderer.created.push(this)
    }
    setPixelRatio() {}
    setSize() {}
    setAnimationLoop(loop: ((time: number) => void) | null) {
      this.loop = loop
    }
    render() {}
    dispose() {}
    forceContextLoss() {}
  }

  function boot() {
    FakeRenderer.created = []
    const registro: Registro = {}
    const win: Record<string, unknown> = {
      devicePixelRatio: 1,
      innerWidth: 800,
      innerHeight: 600,
      SZGame3D: undefined,
      __SZSTUDIO_RUNTIME_INSPECTORS: registro,
      addEventListener() {},
      removeEventListener() {},
    }
    new Function('THREE', 'window', 'document', corpo(gameThreeDRuntimeForVariant('investigar')))(
      { ...THREE, WebGLRenderer: FakeRenderer },
      win,
      document,
    )
    const api = win.SZGame3D as Record<string, (...args: unknown[]) => unknown>
    let quadros = 0
    let contagem = { renders: 0 }
    api.runProject?.(() => {
      const cena = api.createFullscreenScene?.('#000')
      api.createBox?.(cena, { size: 1, color: '#fff' })
      api.createBox?.(cena, { size: 1, color: '#f00' })
      api.animate?.(cena, () => {
        quadros++
      })
    })
    const renderer = FakeRenderer.created.at(-1) as unknown as Record<string, unknown>
    contagem = contarDesenhos(renderer)
    let t = 0
    const quadro = () => {
      t += 16
      FakeRenderer.created.at(-1)?.loop?.(t)
    }
    const ler = () => {
      const porta = registro['game-3d:investigar']
      if (!porta) throw new Error('o Jogo 3D não registrou a porta da aba')
      return porta()
    }
    return { api, ler, quadro, quadros: () => quadros, contagem, renderer }
  }

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('pausa pela _paused do motor, pausado o laço da criança não roda, e continua', () => {
    const j = boot()
    j.quadro()
    j.quadro()
    expect(j.ler()).toMatchObject({ frame: 2, paused: false, canPause: true })
    j.ler().pause()
    j.quadro()
    j.quadro()
    expect(j.quadros()).toBe(2)
    expect(j.ler()).toMatchObject({ frame: 2, paused: true, canPause: true })
    j.ler().resume()
    j.quadro()
    expect(j.quadros()).toBe(3)
    expect(j.ler()).toMatchObject({ frame: 3, paused: false })
  })

  it('Avançar 1 quadro roda o laço da criança uma vez e pausa de novo', () => {
    const j = boot()
    j.quadro()
    j.ler().pause()
    j.ler().step()
    for (let i = 0; i < 5; i += 1) j.quadro()
    expect(j.quadros()).toBe(2)
    expect(j.ler()).toMatchObject({ frame: 2, paused: true })
  })

  it('o fim de jogo das regras não é pausa da aba: Continuar não o desfaz', () => {
    const j = boot()
    j.quadro()
    j.api.endGame?.('perdeu')
    j.quadro()
    const noFim = j.ler()
    expect(noFim).toMatchObject({ paused: false, canPause: false })
    noFim.resume()
    noFim.pause()
    j.quadro()
    expect(j.quadros()).toBe(1)
    expect(document.querySelector('.szr-screen')).not.toBeNull()
  })

  it('pausado pela aba e recomeçado pelo jogo, o fim de jogo seguinte continua sendo das regras', async () => {
    const j = boot()
    j.quadro()
    j.ler().pause()
    j.api.restart?.()
    await new Promise((resolve) => setTimeout(resolve, 0))
    j.quadro()
    j.api.endGame?.('perdeu')
    j.quadro()
    const noFim = j.ler()
    expect(noFim).toMatchObject({ paused: false, canPause: false })
    noFim.resume()
    j.quadro()
    expect(document.querySelector('.szr-screen')).not.toBeNull()
  })

  it('conta os objetos da cena e os desenhos do último quadro', () => {
    const j = boot()
    j.quadro()
    const leitura = j.ler()
    expect(leitura.objects).toBe(2)
    expect(leitura.draws).toBe(1)
    expect((j.renderer.info as { autoReset: boolean }).autoReset).toBe(false)
  })
})

describe('Mundo 3D investigado', () => {
  let registro: Registro

  beforeEach(() => {
    registro = {}
    ;(window as unknown as Record<string, unknown>).__SZSTUDIO_RUNTIME_INSPECTORS = registro
    ;(window as unknown as Record<string, unknown>).__szTicks = 0
  })

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__SZSTUDIO_RUNTIME_INSPECTORS
    delete (window as unknown as Record<string, unknown>).__szTicks
    window.dispatchEvent(new Event('pagehide'))
    document.body.innerHTML = ''
  })

  const ticks = () => (window as unknown as { __szTicks: number }).__szTicks

  async function boot() {
    const mundo = await loadExampleWorld(
      [
        "SZWorld3D.setup({ style: 'floresta', world: 120 });",
        'SZWorld3D.onUpdate(function () { window.__szTicks += 1; });',
      ].join('\n'),
      undefined,
      corpo(world3DRuntimeForVariant('investigar')),
    )
    const ler = () => {
      const porta = registro['world-3d:investigar']
      if (!porta) throw new Error('o Mundo 3D não registrou a porta da aba')
      return porta()
    }
    return { ...mundo, ler }
  }

  it('pausa, avança um quadro e continua pela _paused do motor', async () => {
    const m = await boot()
    m.step(2)
    const antes = ticks()
    expect(m.ler()).toMatchObject({ paused: false, canPause: true })
    m.ler().pause()
    m.step(3)
    expect(ticks()).toBe(antes)
    const quadro = m.ler().frame
    expect(m.ler()).toMatchObject({ paused: true })
    m.ler().step()
    m.step(4)
    expect(ticks()).toBe(antes + 1)
    expect(m.ler()).toMatchObject({ frame: quadro + 1, paused: true })
    m.ler().resume()
    m.step(2)
    expect(ticks()).toBe(antes + 3)
  })

  it('os desenhos somam todas as passadas do quadro', async () => {
    const m = await boot()
    const contagem = contarDesenhos(m.renderers[0] as unknown as Record<string, unknown>)
    m.step(1)
    const antes = contagem.renders
    m.step(1)
    const porQuadro = contagem.renders - antes
    expect(porQuadro).toBeGreaterThan(0)
    expect(m.ler().draws).toBe(porQuadro)
    expect(m.ler().objects).toBeGreaterThan(0)
  })
})

describe('3D Avançado investigado', () => {
  let registro: Registro

  beforeEach(() => {
    registro = {}
    ;(window as unknown as Record<string, unknown>).__SZSTUDIO_RUNTIME_INSPECTORS = registro
  })

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__SZSTUDIO_RUNTIME_INSPECTORS
    window.dispatchEvent(new Event('pagehide'))
    document.body.innerHTML = ''
  })

  it('pausa pelo estado "pausado", avança um quadro e só pausa jogando', async () => {
    let ticks = 0
    const k = await loadStartedKit(
      (api) => {
        api.onUpdate(() => {
          ticks += 1
        })
      },
      { body: corpo(gameKit3DRuntimeForVariant('investigar')) },
    )
    const ler = () => {
      const porta = registro['game-3d-advanced:investigar']
      if (!porta) throw new Error('o 3D Avançado não registrou a porta da aba')
      return porta()
    }
    // No menu: a aba ainda não pausa.
    expect(ler()).toMatchObject({ paused: false, canPause: false })
    k.api.setState('jogando')
    k.step(2)
    expect(ler()).toMatchObject({ frame: 2, paused: false, canPause: true })
    ler().pause()
    expect(k.api.state()).toBe('pausado')
    k.step(3)
    expect(ticks).toBe(2)
    ler().step()
    k.step(4)
    expect(ticks).toBe(3)
    expect(ler()).toMatchObject({ frame: 3, paused: true })
    ler().resume()
    k.step(1)
    expect(ticks).toBe(4)
    expect(gameKit3DRuntime).not.toContain('_szJogados')
  })
})
