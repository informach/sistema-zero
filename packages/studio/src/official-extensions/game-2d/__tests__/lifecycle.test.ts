import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'
import type { GameTwoDLifecycleApi } from '../runtimeContract'

type Listener = (event: Record<string, unknown>) => void

function runtimeHarness() {
  const listeners: Record<string, Listener[]> = {}
  const frames: Array<{ id: number; callback: (time?: number) => void }> = []
  const canceled = new Set<number>()
  let nextFrameId = 1
  const windowObject = {
    addEventListener(name: string, listener: Listener) {
      listeners[name] ??= []
      listeners[name].push(listener)
    },
    performance: { now: () => 0 },
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
    api: (windowObject as unknown as { SZGame2D: GameTwoDLifecycleApi }).SZGame2D,
    fire,
    flushFrame,
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
    const { api, fire } = runtimeHarness()
    api.setupStage(400, 300, '#000000', 'Labirinto: use as setas e encontre a saída.')
    const canvas = document.querySelector('canvas')

    expect(canvas?.style.touchAction).toBe('none')
    expect(canvas?.getAttribute('aria-label')).toBe('Labirinto: use as setas e encontre a saída.')
    const descriptionId = canvas?.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy()
    expect(document.getElementById(descriptionId ?? '')?.textContent).toContain('Labirinto')
    fire('pointerdown', { clientX: 10, clientY: 20, target: canvas ?? undefined })
    expect(api.pointer.down).toBe(true)
    fire('pointercancel', { target: canvas ?? undefined })
    expect(api.pointer.down).toBe(false)
  })
})
