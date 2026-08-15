import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'
import type { GameTwoDRuntimeApi, GameTwoDSprite } from '../runtimeContract'

type Listener = (event: Record<string, unknown>) => void

function runtimeHarness(devicePixelRatio = 1) {
  const listeners: Record<string, Listener[]> = {}
  const frames: Array<{ id: number; callback: (time?: number) => void }> = []
  const canceled = new Set<number>()
  const timers: Array<{ id: number; callback: () => void; deadline: number }> = []
  const canceledTimers = new Set<number>()
  let nextFrameId = 1
  let nextTimerId = 1
  let time = 0
  const windowObject = {
    addEventListener(name: string, listener: Listener) {
      listeners[name] ??= []
      listeners[name].push(listener)
    },
    performance: { now: () => time },
    devicePixelRatio,
    CSS: { supports: () => true },
    SZGame2D: undefined,
  } as unknown as Record<string, unknown>
  const requestAnimationFrame = (callback: (time?: number) => void) => {
    const id = nextFrameId++
    frames.push({ id, callback })
    return id
  }
  const cancelAnimationFrame = (id: number) => canceled.add(id)
  const scheduleTimeout = (callback: () => void, delay = 0) => {
    const id = nextTimerId++
    timers.push({ id, callback, deadline: time + Math.max(0, delay) })
    return id
  }
  const cancelScheduledTimeout = (id: number) => canceledTimers.add(id)

  new Function(
    'window',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'setTimeout',
    'clearTimeout',
    gameTwoDRuntime,
  )(
    windowObject,
    requestAnimationFrame,
    cancelAnimationFrame,
    scheduleTimeout,
    cancelScheduledTimeout,
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
    pendingFrameCount() {
      return frames.filter((frame) => !canceled.has(frame.id)).length
    },
    setTime(nextTime: number) {
      time = nextTime
      for (;;) {
        const due = timers
          .filter((timer) => !canceledTimers.has(timer.id) && timer.deadline <= time)
          .sort((left, right) => left.deadline - right.deadline)[0]
        if (!due) break
        canceledTimers.add(due.id)
        due.callback()
      }
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
    api.setupStage(320, 200, '#000000')
    const canvas = document.querySelector('canvas')
    let calls = 0

    for (let frame = 0; frame < 100; frame += 1) {
      api.onPointer(() => {
        calls += 1
      }, 'clique-do-bloco')
    }
    fire('pointerdown', { clientX: 10, clientY: 20, target: canvas })

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
    api.setupStage(320, 200, '#000000')
    const canvas = document.querySelector('canvas')
    flushFrame()
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

    fire('pointerdown', { clientX: 0, clientY: 0, target: canvas })
    flushFrame()
    api.restart()
    fire('pointerdown', { clientX: 0, clientY: 0, target: canvas })
    flushFrame()

    expect(starts).toBe(2)
    expect(clicks).toBe(2)
    expect(updates).toBe(2)
  })

  it('mantém um único scheduler ao reiniciar de dentro do próprio quadro', () => {
    const { api, flushFrame, pendingFrameCount } = runtimeHarness()
    let shouldRestart = true

    api.onStart(() => {
      api.gameLoop(() => {
        if (!shouldRestart) return
        shouldRestart = false
        api.restart()
      }, 'quadro')
    }, 'inicio')

    flushFrame(0)
    expect(pendingFrameCount()).toBe(1)

    shouldRestart = true
    flushFrame(1000 / 60)
    expect(pendingFrameCount()).toBe(1)
  })

  it('trata o reinício como fronteira terminal do callback antigo', () => {
    const { api, flushFrame, pendingFrameCount } = runtimeHarness()
    let starts = 0
    const continuedOldRuns: number[] = []
    const newRunUpdates: number[] = []

    api.onStart(() => {
      const run = ++starts
      api.gameLoop(() => {
        if (run === 1) {
          api.restart()
          continuedOldRuns.push(run)
          throw new Error('a pilha antiga não deveria alcançar este erro')
        }
        newRunUpdates.push(run)
      }, 'quadro')
    }, 'inicio')

    flushFrame(0)
    expect(starts).toBe(2)
    expect(continuedOldRuns).toEqual([])
    expect(pendingFrameCount()).toBe(1)

    flushFrame(1000 / 60)
    expect(newRunUpdates).toEqual([2])
  })

  it('não executa handlers da nova partida no restante do quadro reiniciado', () => {
    const { api, flushFrame } = runtimeHarness()
    let shouldRestart = true
    let secondLoopCalls = 0

    api.onStart(() => {
      api.gameLoop(() => {
        if (!shouldRestart) return
        shouldRestart = false
        api.restart()
      }, 'primeiro-quadro')
      api.gameLoop(() => {
        secondLoopCalls += 1
      }, 'segundo-quadro')
    }, 'inicio')

    flushFrame(0)
    expect(secondLoopCalls).toBe(0)

    flushFrame(1000 / 60)
    expect(secondLoopCalls).toBe(1)
  })

  it('não entrega o mesmo teclado ou ponteiro aos handlers da partida nova', () => {
    const { api, fire } = runtimeHarness()
    api.setupStage(320, 200, '#000000')
    const canvas = document.querySelector('canvas')
    let starts = 0
    let restartFromKey = true
    let restartFromPointer = true
    const keySecondRuns: number[] = []
    const pointerSecondRuns: number[] = []
    const continuedOldKeyRuns: number[] = []
    const continuedOldPointerRuns: number[] = []

    api.onStart(() => {
      const run = ++starts
      api.onKey(
        'Enter',
        () => {
          if (!restartFromKey) return
          restartFromKey = false
          api.restart()
          continuedOldKeyRuns.push(run)
        },
        'primeira-tecla',
      )
      api.onKey('Enter', () => keySecondRuns.push(run), 'segunda-tecla')
      api.onPointer(() => {
        if (!restartFromPointer) return
        restartFromPointer = false
        api.restart()
        continuedOldPointerRuns.push(run)
      }, 'primeiro-ponteiro')
      api.onPointer(() => pointerSecondRuns.push(run), 'segundo-ponteiro')
    }, 'inicio')

    fire('keydown', { key: 'Enter', code: 'Enter', repeat: false })
    expect(starts).toBe(2)
    expect(keySecondRuns).toEqual([])
    expect(continuedOldKeyRuns).toEqual([])
    expect(api.keyDown('Enter')).toBe(false)

    fire('pointerdown', { clientX: 0, clientY: 0, target: canvas })

    expect(starts).toBe(3)
    expect(pointerSecondRuns).toEqual([])
    expect(continuedOldPointerRuns).toEqual([])
  })

  it('não executa contatos da partida nova no restante do quadro reiniciado', () => {
    const { api, flushFrame } = runtimeHarness()
    let starts = 0
    let shouldRestart = true
    const secondOverlapRuns: number[] = []

    api.onStart(() => {
      const run = ++starts
      const first = api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
      const second = api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
      api.onOverlap(
        () => first,
        () => second,
        () => {
          if (!shouldRestart) return
          shouldRestart = false
          api.restart()
        },
        'primeiro-contato',
      )
      api.onOverlap(
        () => first,
        () => second,
        () => secondOverlapRuns.push(run),
        'segundo-contato',
      )
    }, 'inicio')

    flushFrame(0)

    expect(starts).toBe(2)
    expect(secondOverlapRuns).toEqual([])
  })

  it('interrompe a iteração síncrona quando o callback reinicia a partida', () => {
    const { api } = runtimeHarness()
    let starts = 0
    let currentGroup = api.createGroup()
    const callbackRuns: number[] = []

    api.onStart(() => {
      starts += 1
      currentGroup = api.createGroup()
      api.spawn(currentGroup, { x: 0, y: 0 })
      api.spawn(currentGroup, { x: 20, y: 0 })
    }, 'inicio')

    api.forEachInGroup(currentGroup, () => {
      callbackRuns.push(starts)
      if (callbackRuns.length === 1) api.restart()
    })

    expect(starts).toBe(2)
    expect(callbackRuns).toEqual([1])
  })

  it('mantém um único scheduler ao pausar e continuar dentro do próprio quadro', () => {
    const { api, flushFrame, pendingFrameCount } = runtimeHarness()
    let shouldTogglePause = true

    api.gameLoop(() => {
      if (!shouldTogglePause) return
      shouldTogglePause = false
      api.pauseGame()
      api.resumeGame()
    }, 'quadro')

    flushFrame(0)

    expect(pendingFrameCount()).toBe(1)
  })

  it('libera a recarga exatamente no N-ésimo quadro', () => {
    const { api, flushFrame } = runtimeHarness()
    const sprite = api.createSprite({})
    api.gameLoop(() => {}, 'relogio-da-recarga')

    expect(api.cooldownReady(sprite, 3, 'golpe')).toBe(true)
    flushFrame(0)
    expect(api.cooldownReady(sprite, 3, 'golpe')).toBe(false)
    flushFrame(1000 / 60)
    expect(api.cooldownReady(sprite, 3, 'golpe')).toBe(false)
    flushFrame(2000 / 60)
    expect(api.cooldownReady(sprite, 3, 'golpe')).toBe(true)
  })

  it('normaliza recarga fracionária para ao menos um quadro', () => {
    const { api, flushFrame } = runtimeHarness()
    const sprite = api.createSprite({})
    api.gameLoop(() => {}, 'relogio-da-recarga')

    expect(api.cooldownReady(sprite, 0.4, 'golpe')).toBe(true)
    expect(api.cooldownReady(sprite, 0.4, 'golpe')).toBe(false)
    flushFrame(0)
    expect(api.cooldownReady(sprite, 0.4, 'golpe')).toBe(true)
  })

  it('a pausa não consome a recarga mesmo depois de muito tempo de parede', () => {
    const { api, flushFrame, setTime } = runtimeHarness()
    const sprite = api.createSprite({})
    api.gameLoop(() => {}, 'relogio-da-recarga')

    expect(api.cooldownReady(sprite, 3, 'golpe')).toBe(true)
    flushFrame(0)
    api.pauseGame()
    setTime(60_000)
    api.resumeGame()

    flushFrame(60_000)
    expect(api.cooldownReady(sprite, 3, 'golpe')).toBe(false)
    flushFrame(60_000 + 1000 / 60)
    expect(api.cooldownReady(sprite, 3, 'golpe')).toBe(true)
  })

  it('reiniciar cria um sprite com a recarga pronta novamente', () => {
    const { api, flushFrame } = runtimeHarness()
    let sprite: GameTwoDSprite | undefined

    api.onStart(() => {
      sprite = api.createSprite({})
      api.gameLoop(() => {}, 'relogio-da-recarga')
    }, 'inicio-da-recarga')

    const firstSprite = sprite
    if (!firstSprite) throw new Error('o início deve criar o primeiro sprite')
    expect(api.cooldownReady(firstSprite, 30, 'golpe')).toBe(true)
    flushFrame(0)
    expect(api.cooldownReady(firstSprite, 30, 'golpe')).toBe(false)

    api.restart()

    const restartedSprite = sprite
    if (!restartedSprite) throw new Error('o reinício deve criar outro sprite')
    expect(restartedSprite).not.toBe(firstSprite)
    expect(api.cooldownReady(restartedSprite, 30, 'golpe')).toBe(true)
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

  it('desativa o handler que falha mesmo quando ele pausa e retoma o driver', () => {
    const { api, flushFrame } = runtimeHarness()
    const original = console.error
    let broken = 0
    let healthy = 0
    console.error = () => undefined
    try {
      api.gameLoop(() => {
        broken += 1
        api.pauseGame()
        api.resumeGame()
        throw new Error('falha depois de retomar')
      }, 'quadro-com-pausa-e-erro')
      api.gameLoop(() => {
        healthy += 1
      }, 'quadro-saudavel')

      flushFrame(0)
      flushFrame(1000 / 60)
      flushFrame(2000 / 60)
    } finally {
      console.error = original
    }

    expect(broken).toBe(1)
    expect(healthy).toBeGreaterThanOrEqual(1)
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

  it('mapeia o ponteiro pela área desenhável quando o palco tem moldura', () => {
    document.body.innerHTML = ''
    const { api, fire } = runtimeHarness()
    api.setupStage(320, 200, '#000000')
    api.showStageBorder('#ffffff', 40)
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('palco não foi criado')

    Object.defineProperties(canvas, {
      clientLeft: { configurable: true, value: 40 },
      clientTop: { configurable: true, value: 40 },
      clientWidth: { configurable: true, value: 240 },
      clientHeight: { configurable: true, value: 120 },
    })
    canvas.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 50,
        right: 420,
        bottom: 250,
        width: 320,
        height: 200,
        x: 100,
        y: 50,
        toJSON() {},
      }) as DOMRect

    const points: Array<[number, number]> = []
    api.onPointer((x, y) => points.push([x, y]), 'moldura-ponteiro')
    fire('pointerdown', { clientX: 140, clientY: 90, target: canvas })
    fire('pointerup', { clientX: 140, clientY: 90, target: canvas })
    fire('pointerdown', { clientX: 380, clientY: 210, target: canvas })

    expect(points).toEqual([
      [0, 0],
      [320, 200],
    ])
  })

  it('limita o backing store por DPR, dimensão e orçamento de pixels', () => {
    document.body.innerHTML = '<canvas id="tela"></canvas>'
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('palco não foi criado')
    canvas.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 4_000,
        bottom: 3_000,
        width: 4_000,
        height: 3_000,
        x: 0,
        y: 0,
        toJSON() {},
      }) as DOMRect
    const originalWarn = console.warn
    const warnings: string[] = []
    console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '))
    try {
      const { api } = runtimeHarness(8)
      api.setupStage(4_000, 3_000, '#000000')
      api.setupStage(4_000, 3_000, '#000000')
    } finally {
      console.warn = originalWarn
    }

    expect(canvas.width).toBeLessThanOrEqual(8_192)
    expect(canvas.height).toBeLessThanOrEqual(8_192)
    expect(canvas.width * canvas.height).toBeLessThanOrEqual(16_777_216)
    expect(warnings.filter((warning) => warning.includes('resolução segura'))).toHaveLength(1)
  })

  it('limita o tamanho lógico antes da primeira atribuição ao canvas', () => {
    document.body.innerHTML = '<canvas id="tela"></canvas>'
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('palco não foi criado')
    let width = canvas.width
    let height = canvas.height
    const widthAssignments: number[] = []
    const heightAssignments: number[] = []
    Object.defineProperties(canvas, {
      width: {
        configurable: true,
        get: () => width,
        set: (value: number) => {
          widthAssignments.push(value)
          width = value
        },
      },
      height: {
        configurable: true,
        get: () => height,
        set: (value: number) => {
          heightAssignments.push(value)
          height = value
        },
      },
    })
    canvas.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 800,
        bottom: 480,
        width: 800,
        height: 480,
        x: 0,
        y: 0,
        toJSON() {},
      }) as DOMRect

    const { api } = runtimeHarness()
    api.setupStage(1_000_000_000, 1_000_000_000, '#000000')

    expect(Math.max(...widthAssignments)).toBeLessThanOrEqual(8_192)
    expect(Math.max(...heightAssignments)).toBeLessThanOrEqual(8_192)
    const initialWidth = widthAssignments[0]
    const initialHeight = heightAssignments[0]
    if (initialWidth === undefined || initialHeight === undefined) {
      throw new Error('setupStage não atribuiu as dimensões iniciais do canvas')
    }
    expect(initialWidth * initialHeight).toBeLessThanOrEqual(16_777_216)
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

  it('anuncia HUD em região própria, somente por mudança e com frequência limitada', async () => {
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
    await Promise.resolve()
    const hud = document.getElementById('sz-game-hud-status')
    expect(hud).not.toBeNull()
    expect(hud?.textContent).toContain('Pontos: 5')

    setTime(100)
    hudApi.drawScore(ctx, 'Pontos:', 6, 10, 20, '#fff', 20)
    await Promise.resolve()
    expect(hud?.textContent).toContain('Pontos: 5')

    setTime(500)
    expect(hud?.textContent).toContain('Pontos: 6')

    const sprite = api.createSprite({ x: 0, y: 0 })
    api.setHealth(sprite, 3)
    setTime(1_000)
    hudApi.drawSpriteHealth(ctx, sprite, 'bar', 10, 30, 100, '#f00')
    await Promise.resolve()
    expect(hud?.textContent).toContain('Vidas: 3 de 3')

    api.onStart(() => {}, 'hud-test')
    api.restart()
    expect(hud?.textContent).toBe('')
  })

  it('agrupa o HUD acessível mesmo sem limpar o canvas antes de desenhar', async () => {
    document.body.innerHTML = ''
    const { api, setTime } = runtimeHarness()
    api.setupStage(320, 200, '#000000')
    const ctx = {
      canvas: { width: 320, height: 200 },
      save() {},
      restore() {},
      fillText() {},
      fillRect() {},
      beginPath() {},
      moveTo() {},
      bezierCurveTo() {},
      closePath() {},
      fill() {},
    } as unknown as CanvasRenderingContext2D

    setTime(0)
    api.drawScore(ctx, 'Pontos:', 7, 10, 20, '#fff', 20)
    api.drawHearts(ctx, 3, 20, 20, 18, '#f00')
    await Promise.resolve()

    const hud = document.getElementById('sz-game-hud-status')
    expect(hud?.textContent).toContain('Pontos: 7')
    expect(hud?.textContent).toContain('Vidas: 3')
  })

  it('congela o anúncio pendente na pausa e cancela o timer ao reiniciar', async () => {
    document.body.innerHTML = ''
    const { api, setTime } = runtimeHarness()
    api.setupStage(320, 200, '#000000')
    const ctx = {
      canvas: { width: 320, height: 200 },
      save() {},
      restore() {},
      fillText() {},
    } as unknown as CanvasRenderingContext2D

    setTime(0)
    api.drawScore(ctx, 'Pontos:', 1, 10, 20, '#fff', 20)
    await Promise.resolve()
    setTime(100)
    api.drawScore(ctx, 'Pontos:', 2, 10, 20, '#fff', 20)
    await Promise.resolve()
    const hud = document.getElementById('sz-game-hud-status')

    api.pauseGame()
    setTime(500)
    expect(hud?.textContent).toContain('Pontos: 1')

    api.resumeGame()
    setTime(899)
    expect(hud?.textContent).toContain('Pontos: 1')
    setTime(900)
    expect(hud?.textContent).toContain('Pontos: 2')

    setTime(1_000)
    api.drawScore(ctx, 'Pontos:', 3, 10, 20, '#fff', 20)
    api.onStart(() => {}, 'hud-timer-test')
    api.restart()
    setTime(2_000)
    expect(hud?.textContent).toBe('')
  })

  it('inclui o texto desenhado no HUD acessível', async () => {
    document.body.innerHTML = ''
    const { api, setTime } = runtimeHarness()
    api.setupStage(320, 200, '#000000')
    const ctx = {
      canvas: { width: 320, height: 200 },
      save() {},
      restore() {},
      fillText() {},
    } as unknown as CanvasRenderingContext2D

    setTime(0)
    api.drawLabel(ctx, 'Colete a chave', 20, 30, '#fff', 18, 'left')
    await Promise.resolve()

    const hud = document.getElementById('sz-game-hud-status')
    expect(hud).not.toBeNull()
    expect(hud?.textContent).toContain('Colete a chave')
  })

  it('mantém os corações legados no HUD acessível de projetos salvos', async () => {
    document.body.innerHTML = ''
    const { api, setTime } = runtimeHarness()
    api.setupStage(320, 200, '#000000')
    const ctx = {
      canvas: { width: 320, height: 200 },
      save() {},
      restore() {},
      beginPath() {},
      moveTo() {},
      bezierCurveTo() {},
      closePath() {},
      fill() {},
    } as unknown as CanvasRenderingContext2D

    setTime(0)
    api.drawHearts(ctx, 3, 12, 48, 22, '#f00')
    await Promise.resolve()

    const hud = document.getElementById('sz-game-hud-status')
    expect(hud?.textContent).toContain('Vidas: 3')
  })

  it('anuncia o fim de jogo pela descrição viva do palco', () => {
    document.body.innerHTML = ''
    const { api } = runtimeHarness()
    api.setupStage(320, 200, '#000000')
    const ctx = {
      canvas: { width: 320, height: 200 },
      save() {},
      restore() {},
      fillText() {},
    } as unknown as CanvasRenderingContext2D
    const showGameOver = Reflect.get(api, 'showGameOver')

    expect(typeof showGameOver).toBe('function')
    if (typeof showGameOver !== 'function') throw new Error('showGameOver ausente')
    showGameOver(ctx, 'Fim de jogo')

    const description = document.getElementById('sz-game-2d-description')
    expect(description?.textContent).toContain('Fim de jogo')
  })

  it('rearma o mesmo anúncio terminal depois de reiniciar a partida', () => {
    document.body.innerHTML = ''
    const canvas = document.createElement('canvas')
    const stageCtx = {
      canvas,
      setTransform() {},
      clearRect() {},
      save() {},
      restore() {},
      fillText() {},
    }
    Object.defineProperty(canvas, 'getContext', {
      configurable: true,
      value: () => stageCtx,
    })
    document.body.appendChild(canvas)
    const { api } = runtimeHarness()
    api.setupStage(320, 200, '#000000')
    api.setStageDescription('Desvie dos obstáculos.')
    api.onStart(() => {}, 'reinicio-acessivel')
    const ctx = stageCtx as unknown as CanvasRenderingContext2D

    api.showGameOver(ctx, 'Fim de jogo')
    const description = document.getElementById('sz-game-2d-description')
    expect(description?.textContent).toContain('Fim de jogo')

    api.restart()
    expect(description?.textContent).toBe('Desvie dos obstáculos.')

    api.showGameOver(ctx, 'Fim de jogo')
    expect(description?.textContent).toContain('Fim de jogo')
  })

  it('remove do HUD acessível os elementos que sumiram após limpar o quadro', async () => {
    document.body.innerHTML = ''
    const { api, setTime } = runtimeHarness()
    api.setupStage(320, 200, '#000000')
    const ctx = {
      canvas: { width: 320, height: 200 },
      save() {},
      restore() {},
      fillText() {},
    } as unknown as CanvasRenderingContext2D

    setTime(0)
    api.drawLabel(ctx, 'Aviso antigo', 20, 30, '#fff', 18, 'left')
    api.clear()
    api.drawScore(ctx, 'Pontos:', 7, 10, 20, '#fff', 20)
    await Promise.resolve()
    setTime(500)

    const hud = document.getElementById('sz-game-hud-status')
    expect(hud?.textContent).toContain('Pontos: 7')
    expect(hud?.textContent).not.toContain('Aviso antigo')
  })

  it('remove do leitor de tela os valores da tela anterior ao mudar de cena', async () => {
    document.body.innerHTML = ''
    const { api, setTime } = runtimeHarness()
    api.setupStage(320, 200, '#000000')
    const ctx = {
      canvas: { width: 320, height: 200 },
      save() {},
      restore() {},
      fillText() {},
    } as unknown as CanvasRenderingContext2D

    setTime(0)
    api.drawScore(ctx, 'Pontos:', 9, 10, 20, '#fff', 20)
    await Promise.resolve()
    const hud = document.getElementById('sz-game-hud-status')
    expect(hud?.textContent).toContain('Pontos: 9')

    api.setScene('jogando')
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

  it('usa unidades dinâmicas quando o navegador oferece suporte', () => {
    expect(gameTwoDRuntime).toContain("_viewportUnit('width')")
    expect(gameTwoDRuntime).toContain("_viewportUnit('height')")
    expect(gameTwoDRuntime).toContain("dynamicUnit = axis === 'width' ? 'dvw' : 'dvh'")
  })

  it('anuncia pausa e retomada sem apagar a descrição do jogo', () => {
    document.body.innerHTML = ''
    const { api } = runtimeHarness()
    api.setupStage(320, 200, '#111111')
    api.setStageDescription('Colete todas as moedas.')

    api.pauseGame()
    expect(document.getElementById('sz-game-2d-status')?.textContent).toBe('Jogo pausado.')
    expect(document.getElementById('sz-game-2d-description')?.textContent).toBe(
      'Colete todas as moedas.',
    )

    api.resumeGame()
    expect(document.getElementById('sz-game-2d-status')?.textContent).toBe('Jogo continuado.')
  })
})
