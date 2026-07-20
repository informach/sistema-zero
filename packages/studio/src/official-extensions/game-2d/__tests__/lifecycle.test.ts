import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'
import type { GameTwoDRuntimeApi } from '../runtimeContract'

type Listener = (event: Record<string, unknown>) => void

function runtimeHarness() {
  const listeners: Record<string, Listener[]> = {}
  const frames: Array<{ id: number; callback: (time?: number) => void }> = []
  const canceled = new Set<number>()
  let nextFrameId = 1
  let time = 0
  const windowObject = {
    addEventListener(name: string, listener: Listener) {
      listeners[name] ??= []
      listeners[name].push(listener)
    },
    performance: { now: () => time },
    devicePixelRatio: 1,
    SZGame2D: undefined,
  } as unknown as Record<string, unknown>
  const requestAnimationFrame = (callback: (time?: number) => void) => {
    const id = nextFrameId++
    frames.push({ id, callback })
    return id
  }
  const cancelAnimationFrame = (id: number) => canceled.add(id)

  new Function('window', 'requestAnimationFrame', 'cancelAnimationFrame', gameTwoDRuntime)(
    windowObject,
    requestAnimationFrame,
    cancelAnimationFrame,
  )

  const flushFrame = (time?: number) => {
    while (frames.length) {
      const frame = frames.shift()
      if (!frame || canceled.has(frame.id)) continue
      frame.callback(time)
      return
    }
  }
  const fire = (name: string, event: Record<string, unknown> = {}) => {
    for (const listener of listeners[name] ?? []) listener(event)
  }

  return {
    api: (windowObject as unknown as { SZGame2D: GameTwoDRuntimeApi }).SZGame2D,
    fire,
    flushFrame,
    setTime(nextTime: number) {
      time = nextTime
    },
  }
}

describe('gameTwoDRuntime — ciclo de vida didático', () => {
  it('mantém dois blocos “a cada quadro” ativos ao mesmo tempo', () => {
    const { api, flushFrame } = runtimeHarness()
    let first = 0
    let second = 0

    api.gameLoop(() => {
      first += 1
    }, 'loop-a')
    api.gameLoop(() => {
      second += 1
    }, 'loop-b')

    flushFrame()
    flushFrame()

    expect(first).toBe(2)
    expect(second).toBe(2)
  })

  it('substitui o registro do mesmo bloco sem multiplicar cliques', () => {
    const { api, fire } = runtimeHarness()
    let calls = 0

    for (let frame = 0; frame < 100; frame += 1) {
      api.onPointer(() => {
        calls += 1
      }, 'clique-do-bloco')
    }
    fire('pointerdown', { clientX: 10, clientY: 20 })

    expect(calls).toBe(1)
  })

  it('preserva dois eventos de tecla com closures iguais e blocos diferentes', () => {
    const { api, fire } = runtimeHarness()
    const first = { value: 0 }
    const second = { value: 0 }
    const register = (target: { value: number }, id: string) => {
      api.onKey(
        'Space',
        () => {
          target.value += 1
        },
        id,
      )
    }

    register(first, 'tecla-a')
    register(second, 'tecla-b')
    fire('keydown', { key: ' ', code: 'Space', repeat: false })

    expect(first.value).toBe(1)
    expect(second.value).toBe(1)
  })

  it('normaliza WASD com Caps Lock e e.code', () => {
    const { api, fire } = runtimeHarness()

    fire('keydown', { key: 'A', code: 'KeyA', repeat: false })
    expect(api.keys.left).toBe(true)
    fire('keyup', { key: 'A', code: 'KeyA' })
    expect(api.keys.left).toBe(false)

    fire('keydown', { key: 'W', code: 'KeyW', repeat: false })
    expect(api.keys.up).toBe(true)
    fire('keyup', { key: 'w', code: 'KeyW' })
    expect(api.keys.up).toBe(false)
  })

  it('reinicia em memória, executa o início novamente e não duplica eventos', () => {
    const { api, fire, flushFrame } = runtimeHarness()
    let starts = 0
    let clicks = 0
    let updates = 0

    api.onStart(() => {
      starts += 1
      api.onPointer(() => {
        clicks += 1
      }, 'clique')
      api.gameLoop(() => {
        updates += 1
      }, 'quadro')
    }, 'inicio')

    fire('pointerdown', { clientX: 0, clientY: 0 })
    flushFrame()
    api.restart()
    fire('pointerdown', { clientX: 0, clientY: 0 })
    flushFrame()

    expect(starts).toBe(2)
    expect(clicks).toBe(2)
    expect(updates).toBe(2)
  })

  it('desativa somente o quadro defeituoso e registra o erro uma vez', () => {
    const { api, flushFrame } = runtimeHarness()
    const original = console.error
    const messages: unknown[][] = []
    console.error = (...args: unknown[]) => messages.push(args)
    let healthy = 0
    try {
      api.gameLoop(() => {
        throw new Error('erro do bloco')
      }, 'quadro-com-erro')
      api.gameLoop(() => {
        healthy += 1
      }, 'quadro-saudavel')

      flushFrame()
      flushFrame()
      flushFrame()
    } finally {
      console.error = original
    }

    expect(messages).toHaveLength(1)
    expect(healthy).toBe(3)
  })

  it('desativa um “Ao iniciar” defeituoso sem repeti-lo no reinício', () => {
    const { api } = runtimeHarness()
    const original = console.error
    const messages: unknown[][] = []
    let broken = 0
    let healthy = 0
    console.error = (...args: unknown[]) => messages.push(args)
    try {
      api.onStart(() => {
        broken += 1
        throw new Error('erro no começo')
      }, 'inicio-com-erro')
      api.onStart(() => {
        healthy += 1
      }, 'inicio-saudavel')
      api.restart()
    } finally {
      console.error = original
    }

    expect(broken).toBe(1)
    expect(healthy).toBe(2)
    expect(messages).toHaveLength(1)
  })

  it('erro dentro de um bloco composto sobe até o driver e desativa a raiz culpada', () => {
    const { api, flushFrame } = runtimeHarness()
    const composed = api
    const group = composed.createGroup()
    composed.spawn(group, { x: 0, y: 0, w: 10, h: 10, color: '#ffffff' })
    const original = console.error
    const messages: unknown[][] = []
    let brokenCalls = 0
    let healthyCalls = 0
    console.error = (...args: unknown[]) => messages.push(args)
    try {
      composed.gameLoop(() => {
        composed.forEachInGroup(group, () => {
          brokenCalls += 1
          throw new Error('erro dentro do para cada')
        })
      }, 'raiz-composta')
      composed.gameLoop(() => {
        healthyCalls += 1
      }, 'raiz-saudavel')
      flushFrame()
      flushFrame()
      flushFrame()
    } finally {
      console.error = original
    }

    expect(brokenCalls).toBe(1)
    expect(healthyCalls).toBe(3)
    expect(messages).toHaveLength(1)
    expect(String(messages[0]?.[0])).toContain('parei o bloco')
  })

  it('usa passo fixo: 120 Hz e 60 Hz executam a mesma quantidade de atualizações', () => {
    const atRate = (stepMs: number) => {
      const { api, flushFrame } = runtimeHarness()
      let updates = 0
      api.gameLoop(() => {
        updates += 1
      }, 'quadro')
      for (let time = 0; time <= 1000; time += stepMs) flushFrame(time)
      return updates
    }

    const at60Hz = atRate(1000 / 60)
    const at120Hz = atRate(1000 / 120)
    expect(Math.abs(at60Hz - at120Hz)).toBeLessThanOrEqual(1)
  })

  it('não tenta recuperar quadros nem avisa ao voltar de uma aba suspensa', () => {
    const { api, fire, flushFrame } = runtimeHarness()
    const original = console.warn
    const warnings: string[] = []
    console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '))
    let updates = 0
    try {
      api.gameLoop(() => {
        updates += 1
      }, 'quadro')
      flushFrame(0)
      fire('blur')
      flushFrame(2_000)
    } finally {
      console.warn = original
    }

    expect(updates).toBe(2)
    expect(warnings.filter((warning) => warning.includes('atualizações atrasadas'))).toEqual([])
  })

  it('só diagnostica atraso sustentado, não uma pausa isolada do navegador', () => {
    const { api, flushFrame } = runtimeHarness()
    const original = console.warn
    const warnings: string[] = []
    console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '))
    try {
      api.gameLoop(() => {}, 'quadro')
      flushFrame(0)
      flushFrame(120)
      expect(warnings.filter((warning) => warning.includes('atualizações atrasadas'))).toEqual([])
      flushFrame(240)
      flushFrame(360)
    } finally {
      console.warn = original
    }

    expect(warnings.filter((warning) => warning.includes('atualizações atrasadas'))).toHaveLength(1)
  })

  it('prepara o canvas para toque e solta o gesto em pointercancel', () => {
    document.body.innerHTML = ''
    const originalTitle = document.title
    document.title = 'Labirinto'
    const { api, fire } = runtimeHarness()
    api.setupStage(400, 300, '#000000')
    const canvas = document.querySelector('canvas')

    expect(canvas?.style.touchAction).toBe('none')
    expect(canvas?.hasAttribute('data-sz-game-2d-stage')).toBe(true)
    const focusStyle = document.getElementById('sz-game-2d-focus-style')
    expect(focusStyle?.textContent).toContain(':focus-visible')
    expect(focusStyle?.textContent).toContain('outline: none')
    expect(focusStyle?.textContent).toContain('box-shadow: inset')
    expect(canvas?.getAttribute('aria-label')).toBe('Jogo 2D: Labirinto')
    const descriptionId = canvas?.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy()
    expect(document.getElementById(descriptionId ?? '')?.textContent).toContain('Labirinto')
    fire('pointerdown', { clientX: 10, clientY: 20, target: canvas ?? undefined })
    expect(api.pointer.down).toBe(true)
    fire('pointercancel', { target: canvas ?? undefined })
    expect(api.pointer.down).toBe(false)
    document.title = originalTitle
  })

  it('permite descrever objetivo e controles do jogo para leitores de tela', () => {
    document.body.innerHTML = ''
    const { api } = runtimeHarness()
    api.setupStage(400, 300, '#000000')
    const accessibleApi = api

    accessibleApi.setStageDescription('Pegue as moedas. Use as setas para andar.')

    const canvas = document.querySelector('canvas')
    const descriptionId = canvas?.getAttribute('aria-describedby') ?? ''
    expect(canvas?.getAttribute('aria-label')).toBe('Pegue as moedas. Use as setas para andar.')
    expect(document.getElementById(descriptionId)?.textContent).toBe(
      'Pegue as moedas. Use as setas para andar.',
    )
  })

  it('preserva a descrição acessível quando ela vem antes da preparação do palco', () => {
    document.body.innerHTML = ''
    const { api } = runtimeHarness()

    api.setStageDescription('Encontre a saída. Use as setas para andar.')
    api.setupStage(400, 300, '#000000')

    const canvas = document.querySelector('canvas')
    const descriptionId = canvas?.getAttribute('aria-describedby') ?? ''
    expect(canvas?.getAttribute('aria-label')).toBe('Encontre a saída. Use as setas para andar.')
    expect(document.getElementById(descriptionId)?.textContent).toBe(
      'Encontre a saída. Use as setas para andar.',
    )
  })

  it('não perde uma descrição explícita ao preparar o palco novamente', () => {
    document.body.innerHTML = ''
    const { api } = runtimeHarness()
    api.setupStage(400, 300, '#000000')
    api.setStageDescription('Colete 4 moedas. Use as setas.')

    api.setupStage(800, 480, '#111111')
    expect(document.querySelector('canvas')?.getAttribute('aria-label')).toBe(
      'Colete 4 moedas. Use as setas.',
    )

    api.setupStageFull('#222222')
    expect(document.querySelector('canvas')?.getAttribute('aria-label')).toBe(
      'Colete 4 moedas. Use as setas.',
    )
  })

  it('anuncia HUD em região própria, somente por mudança e com frequência limitada', () => {
    document.body.innerHTML = ''
    const { api, setTime } = runtimeHarness()
    api.setupStage(320, 200, '#000000')
    const hudApi = api as unknown as {
      drawScore: (
        ctx: unknown,
        label: string,
        value: number,
        x: number,
        y: number,
        color: string,
        size: number,
      ) => void
      drawSpriteHealth: (
        ctx: unknown,
        sprite: ReturnType<GameTwoDRuntimeApi['createSprite']>,
        style: 'hearts' | 'bar',
        x: number,
        y: number,
        size: number,
        color: string,
      ) => void
    }
    const ctx = {
      canvas: { width: 320, height: 200 },
      save() {},
      restore() {},
      fillText() {},
      fillRect() {},
    }

    setTime(0)
    hudApi.drawScore(ctx, 'Pontos:', 5, 10, 20, '#fff', 20)
    const hud = document.getElementById('sz-game-hud-status')
    expect(hud).not.toBeNull()
    expect(hud?.textContent).toContain('Pontos: 5')

    setTime(100)
    hudApi.drawScore(ctx, 'Pontos:', 6, 10, 20, '#fff', 20)
    expect(hud?.textContent).toContain('Pontos: 5')

    setTime(500)
    hudApi.drawScore(ctx, 'Pontos:', 6, 10, 20, '#fff', 20)
    expect(hud?.textContent).toContain('Pontos: 6')

    const sprite = api.createSprite({ x: 0, y: 0 })
    api.setHealth(sprite, 3)
    setTime(1_000)
    hudApi.drawSpriteHealth(ctx, sprite, 'bar', 10, 30, 100, '#f00')
    expect(hud?.textContent).toContain('Vidas: 3 de 3')

    api.onStart(() => {}, 'hud-test')
    api.restart()
    expect(hud?.textContent).toBe('')
  })

  it('bloqueia o overflow da viewport nos dois modos de palco responsivo', () => {
    document.body.innerHTML = ''
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'auto'
    const { api } = runtimeHarness()

    api.setupStage(800, 480, '#111111')
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.body.style.overflow).toBe('hidden')

    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'auto'
    api.setupStageFull('#111111')
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.body.style.overflow).toBe('hidden')
  })
})
