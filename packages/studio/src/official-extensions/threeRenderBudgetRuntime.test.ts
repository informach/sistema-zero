import { describe, expect, it } from 'bun:test'
import * as RealTHREE from 'three'
import { installResizeObserverStub } from './__tests__/three3d/resizeObserverStub'
import { gameThreeDRuntime } from './game-3d/runtime'
import { gameKit3DRuntime } from './game-3d-advanced/runtime'
import {
  THREE_RENDER_BUDGET_MARKER,
  threeRenderBudgetRuntimeSource,
  withThreeRenderBudgetRuntime,
} from './threeRenderBudgetRuntime'
import { world3DRuntime } from './world-3d/runtime'

/**
 * O orçamento de desenho compartilhado pelos três runtimes 3D, avaliado ISOLADO: o fragmento
 * roda num `new Function` com THREE de verdade, um renderer falso que guarda o pixel ratio e o
 * tamanho, um canvas falso (tamanho CSS) e uma janela falsa (devicePixelRatio).
 */

interface Budget {
  tier: string
  pixelRatio: number
  resize(): void
  observe(fn?: () => void): void
  isLight(): boolean
  shadowSize(): number
  shadowType(): number
  applyShadow(light: RealTHREE.Light | null): void
  postFx(): boolean
  msaa(): number
  setTier(tier: string): void
  setMode(mode: string): void
  sample(dt: number): void
  dispose(): void
}

class FakeRenderer {
  pixelRatio = 1
  size: [number, number] = [0, 0]
  shadowMap = { enabled: true, type: RealTHREE.PCFShadowMap as number }
  capabilities = { isWebGL2: true, maxTextureSize: 4096 }
  extensions: { has: (name: string) => boolean } = {
    has: (name: string) => name === 'EXT_color_buffer_float',
  }
  setPixelRatio(n: number) {
    this.pixelRatio = n
  }
  setSize(w: number, h: number) {
    this.size = [w, h]
  }
  /** O tamanho do desenho que o WebGLRenderer de verdade calcula (floor de lógico × ratio). */
  buffer(): [number, number] {
    return [Math.floor(this.size[0] * this.pixelRatio), Math.floor(this.size[1] * this.pixelRatio)]
  }
}

function makeBudget(opts: {
  dpr: number
  css: [number, number]
  logical?: [number, number]
  renderer?: FakeRenderer
  onTier?: (tier: string) => void
}) {
  const renderer = opts.renderer ?? new FakeRenderer()
  const canvas = { clientWidth: opts.css[0], clientHeight: opts.css[1] }
  const listeners: Record<string, (() => void)[]> = {}
  const win = {
    devicePixelRatio: opts.dpr,
    addEventListener(name: string, fn: () => void) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    removeEventListener(name: string, fn: () => void) {
      listeners[name] = (listeners[name] ?? []).filter((f) => f !== fn)
    },
  }
  const factory = new Function(
    'THREE',
    'window',
    `${threeRenderBudgetRuntimeSource}\nreturn createSzRenderBudget;`,
  )(RealTHREE, win) as (host: Record<string, unknown>) => Budget
  const budget = factory({
    renderer,
    canvas,
    logical: () =>
      opts.logical
        ? { w: opts.logical[0], h: opts.logical[1] }
        : { w: canvas.clientWidth, h: canvas.clientHeight },
    onTier: opts.onTier,
  })
  return { budget, renderer, canvas, listeners }
}

describe('threeRenderBudgetRuntime — resolução pelo canvas real', () => {
  it('DPR 3 num canvas de 640 px: o desenho tem no máximo 1280 de largura (min(DPR, 2))', () => {
    const { budget, renderer } = makeBudget({ dpr: 3, css: [640, 360] })
    budget.resize()
    expect(renderer.pixelRatio).toBe(2)
    expect(renderer.size).toEqual([640, 360])
    expect(renderer.buffer()[0]).toBeLessThanOrEqual(1280)
    expect(renderer.buffer()).toEqual([1280, 720])
  })

  it('nível leve aplica 0,75 no pixel ratio', () => {
    const { budget, renderer } = makeBudget({ dpr: 3, css: [640, 360] })
    budget.setTier('leve')
    expect(renderer.pixelRatio).toBeCloseTo(1.5, 6)
    expect(renderer.buffer()).toEqual([960, 540])
    expect(budget.isLight()).toBe(true)
  })

  it('teto de pixels: ~2,1 MP no alta e ~1 MP no leve', () => {
    const { budget, renderer } = makeBudget({ dpr: 2, css: [1920, 1080] })
    budget.resize()
    const [w, h] = renderer.buffer()
    expect(w * h).toBeLessThanOrEqual(2_100_000)
    expect(w * h).toBeGreaterThan(2_000_000)
    budget.setTier('leve')
    const [lw, lh] = renderer.buffer()
    expect(lw * lh).toBeLessThanOrEqual(1_000_000)
  })

  it('régua lógica fixa (Mundo 3D e Avançado): o ratio leva 1280×720 ao tamanho real na tela', () => {
    // Canvas de 640 px de CSS num celular de DPR 3: o desenho fica 1280×720 (nítido), não mais.
    const phone = makeBudget({ dpr: 3, css: [640, 360], logical: [1280, 720] })
    phone.budget.resize()
    expect(phone.renderer.size).toEqual([1280, 720])
    expect(phone.renderer.buffer()).toEqual([1280, 720])
    // Monitor grande (1600 px de CSS, DPR 1): o desenho cresce até o tamanho da tela.
    const desk = makeBudget({ dpr: 1, css: [1600, 900], logical: [1280, 720] })
    desk.budget.resize()
    expect(desk.renderer.size).toEqual([1280, 720])
    expect(desk.renderer.buffer()).toEqual([1600, 900])
    // Sem tamanho na tela (iframe oculto): o desenho é a própria régua.
    const hidden = makeBudget({ dpr: 1, css: [0, 0], logical: [1280, 720] })
    hidden.budget.resize()
    expect(hidden.renderer.buffer()).toEqual([1280, 720])
  })

  it('UM caminho só de reajuste: o ResizeObserver do canvas (sem ele, o resize da janela)', () => {
    const ro = installResizeObserverStub()
    try {
      const { budget, canvas, renderer, listeners } = makeBudget({ dpr: 1, css: [400, 300] })
      budget.observe()
      budget.observe()
      expect(ro.instances).toBe(1)
      expect(ro.observed).toEqual([canvas])
      expect(listeners.resize ?? []).toHaveLength(0)
      canvas.clientWidth = 800
      canvas.clientHeight = 600
      ro.fire()
      expect(renderer.size).toEqual([800, 600])
      budget.dispose()
      expect(ro.disconnects).toBe(1)
    } finally {
      ro.restore()
    }
    const absent = installResizeObserverStub({ absent: true })
    try {
      const { budget, listeners } = makeBudget({ dpr: 1, css: [400, 300] })
      budget.observe()
      expect(listeners.resize).toHaveLength(1)
      budget.dispose()
      expect(listeners.resize).toHaveLength(0)
    } finally {
      absent.restore()
    }
  })
})

describe('threeRenderBudgetRuntime — níveis', () => {
  it('a sonda passa a leve UMA vez quando o FPS fica abaixo de 45', () => {
    const tiers: string[] = []
    const { budget } = makeBudget({ dpr: 1, css: [640, 360], onTier: (t) => tiers.push(t) })
    for (let i = 0; i < 300; i++) budget.sample(1 / 30)
    expect(budget.tier).toBe('leve')
    expect(tiers).toEqual(['leve'])
  })

  it('a 60 FPS segue no alta; modo fixo não sonda', () => {
    const fast = makeBudget({ dpr: 1, css: [640, 360] })
    for (let i = 0; i < 600; i++) fast.budget.sample(1 / 60)
    expect(fast.budget.tier).toBe('alta')
    const fixed = makeBudget({ dpr: 1, css: [640, 360] })
    fixed.budget.setMode('alta')
    for (let i = 0; i < 300; i++) fixed.budget.sample(1 / 20)
    expect(fixed.budget.tier).toBe('alta')
    fixed.budget.setMode('leve')
    expect(fixed.budget.tier).toBe('leve')
    fixed.budget.setMode('automatica')
    expect(fixed.budget.tier).toBe('alta')
  })

  it('sombra 2048/PCFSoft no alta e 1024/PCF no leve; efeitos e MSAA só no alta', () => {
    const { budget, renderer } = makeBudget({ dpr: 1, css: [640, 360] })
    const sun = new RealTHREE.DirectionalLight()
    budget.applyShadow(sun)
    expect(sun.shadow.mapSize.x).toBe(2048)
    expect(renderer.shadowMap.type).toBe(RealTHREE.PCFSoftShadowMap)
    expect(budget.postFx()).toBe(true)
    expect(budget.msaa()).toBe(4)
    budget.setTier('leve')
    budget.applyShadow(sun)
    expect(sun.shadow.mapSize.x).toBe(1024)
    expect(renderer.shadowMap.type).toBe(RealTHREE.PCFShadowMap)
    expect(budget.postFx()).toBe(false)
    expect(budget.msaa()).toBe(0)
  })

  it('sem WebGL2 (ou sem cor em ponto flutuante) não há MSAA no alvo da cena', () => {
    const r1 = new FakeRenderer()
    r1.capabilities.isWebGL2 = false
    expect(makeBudget({ dpr: 1, css: [640, 360], renderer: r1 }).budget.msaa()).toBe(0)
    const r2 = new FakeRenderer()
    r2.extensions = { has: () => false }
    expect(makeBudget({ dpr: 1, css: [640, 360], renderer: r2 }).budget.msaa()).toBe(0)
  })
})

describe('withThreeRenderBudgetRuntime', () => {
  it('os três runtimes recebem UMA cópia do orçamento, sem marcador sobrando', () => {
    for (const runtime of [gameThreeDRuntime, gameKit3DRuntime, world3DRuntime]) {
      expect(runtime).not.toContain(THREE_RENDER_BUDGET_MARKER)
      expect(runtime.match(/function createSzRenderBudget\(/g)).toHaveLength(1)
    }
  })

  it('falha cedo quando o marcador está ausente ou duplicado', () => {
    expect(() => withThreeRenderBudgetRuntime('sem marcador')).toThrow('sem o marcador')
    expect(() =>
      withThreeRenderBudgetRuntime(`${THREE_RENDER_BUDGET_MARKER}\n${THREE_RENDER_BUDGET_MARKER}`),
    ).toThrow('duplicado')
  })

  it('o fragmento não tem crase nem interpolação crua', () => {
    expect(threeRenderBudgetRuntimeSource).not.toContain('`')
    expect(threeRenderBudgetRuntimeSource).not.toContain('${')
  })
})

describe('threeRenderBudgetRuntime — canvas sem tamanho por CSS não cresce em laço', () => {
  /**
   * Canvas do HTML sem CSS: a caixa na tela é o BUFFER (`width`/`height`), até alguém pôr um
   * tamanho no `style`. `cssBox` imita uma regra de folha de estilo (a caixa não segue o buffer).
   */
  function intrinsicCanvas(width: number, height: number, cssBox?: [number, number]) {
    const canvas = {
      width,
      height,
      style: {} as Record<string, string>,
      get clientWidth() {
        if (cssBox) return cssBox[0]
        return this.style.width ? Number.parseFloat(this.style.width) : this.width
      },
      get clientHeight() {
        if (cssBox) return cssBox[1]
        return this.style.height ? Number.parseFloat(this.style.height) : this.height
      },
    }
    return canvas
  }

  function setup(canvas: ReturnType<typeof intrinsicCanvas>, dpr: number) {
    let ratio = 1
    // O WebGLRenderer de verdade com `setSize(w, h, false)`: grava SÓ o buffer.
    const renderer = {
      capabilities: { maxTextureSize: 16384 },
      setPixelRatio(n: number) {
        ratio = n
      },
      setSize(w: number, h: number) {
        canvas.width = Math.floor(w * ratio)
        canvas.height = Math.floor(h * ratio)
      },
    }
    const factory = new Function(
      'THREE',
      'window',
      `${threeRenderBudgetRuntimeSource}\nreturn createSzRenderBudget;`,
    )(RealTHREE, { devicePixelRatio: dpr }) as (host: Record<string, unknown>) => Budget
    // A régua do Jogo 3D: `canvasDimension` = caixa na tela, senão o buffer.
    const budget = factory({
      renderer,
      canvas,
      logical: () => ({
        w: canvas.clientWidth || canvas.width,
        h: canvas.clientHeight || canvas.height,
      }),
    })
    return budget
  }

  it('DPR 2 e <canvas width=480 height=360>: o buffer fica 960×720 e a caixa 480×360', () => {
    const canvas = intrinsicCanvas(480, 360)
    const budget = setup(canvas, 2)
    const seen: string[] = []
    for (let i = 0; i < 6; i++) {
      budget.resize()
      seen.push(`${canvas.width}x${canvas.height}`)
    }
    expect(seen).toEqual(Array(6).fill('960x720'))
    expect(canvas.style).toEqual({ width: '480px', height: '360px' })
    expect([canvas.clientWidth, canvas.clientHeight]).toEqual([480, 360])
  })

  it('canvas com tamanho por CSS nunca é tocado (a caixa não segue o buffer)', () => {
    const canvas = intrinsicCanvas(480, 360, [800, 450])
    const budget = setup(canvas, 2)
    budget.resize()
    budget.resize()
    expect(canvas.style).toEqual({})
    expect([canvas.width, canvas.height]).toEqual([1600, 900])
  })

  it('DPR 1: nada muda de tamanho e nada é preso', () => {
    const canvas = intrinsicCanvas(480, 360)
    const budget = setup(canvas, 1)
    budget.resize()
    expect(canvas.style).toEqual({})
    expect([canvas.width, canvas.height]).toEqual([480, 360])
  })
})

describe('threeRenderBudgetRuntime — troca de DPR (outro monitor, zoom)', () => {
  it('a consulta de resolução avisa, o desenho se refaz com o DPR novo e o dispose solta', () => {
    const ro = installResizeObserverStub()
    try {
      const queries: { media: string; listeners: (() => void)[] }[] = []
      const win = {
        devicePixelRatio: 1,
        matchMedia(media: string) {
          const query = {
            media,
            listeners: [] as (() => void)[],
            addEventListener(_: string, fn: () => void) {
              query.listeners.push(fn)
            },
            removeEventListener(_: string, fn: () => void) {
              query.listeners = query.listeners.filter((f) => f !== fn)
            },
          }
          queries.push(query)
          return query
        },
      }
      const renderer = new FakeRenderer()
      const canvas = { clientWidth: 640, clientHeight: 360 }
      const factory = new Function(
        'THREE',
        'window',
        `${threeRenderBudgetRuntimeSource}\nreturn createSzRenderBudget;`,
      )(RealTHREE, win) as (host: Record<string, unknown>) => Budget
      const budget = factory({ renderer, canvas, logical: () => ({ w: 640, h: 360 }) })
      budget.resize()
      budget.observe()
      expect(renderer.pixelRatio).toBe(1)
      expect(queries.map((q) => q.media)).toEqual(['(resolution: 1dppx)'])

      win.devicePixelRatio = 2
      for (const fn of queries[0]?.listeners.slice() ?? []) fn()
      expect(renderer.pixelRatio).toBe(2)
      // A consulta velha foi solta e a nova vigia o DPR 2.
      expect(queries[0]?.listeners).toEqual([])
      expect(queries.at(-1)?.media).toBe('(resolution: 2dppx)')
      expect(queries.at(-1)?.listeners.length).toBe(1)

      budget.dispose()
      expect(queries.every((q) => q.listeners.length === 0)).toBe(true)
    } finally {
      ro.restore()
    }
  })
})
