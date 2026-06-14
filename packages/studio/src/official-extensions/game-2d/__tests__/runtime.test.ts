import { beforeEach, describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

interface SZGame2DSurface {
  SZGame2D: {
    createSprite: (
      opts: Partial<{ x: number; y: number; w: number; h: number; color: string }>,
    ) => {
      x: number
      y: number
      w: number
      h: number
      color: string
      vx: number
      vy: number
    }
    isColliding: (a: unknown, b: unknown) => boolean
    drawSprite: (ctx: unknown, sprite: unknown) => void
    moveByKeys: (sprite: { x: number; y: number }, speed?: number) => void
    keys: { left: boolean; right: boolean; up: boolean; down: boolean }
  }
}

function loadRuntime(): SZGame2DSurface {
  type Listener = (ev: unknown) => void
  const listeners: Record<string, Listener[]> = {}
  const win = {
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    SZGame2D: undefined,
  } as unknown as Record<string, unknown>
  const requestAnimationFrame = () => 0
  // Executa o runtime num escopo controlado, com `window` e
  // `requestAnimationFrame` como argumentos. O runtime define
  // `window.SZGame2D` que depois lemos.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, requestAnimationFrame)
  return win as unknown as SZGame2DSurface
}

describe('gameTwoDRuntime', () => {
  let api: SZGame2DSurface['SZGame2D']
  beforeEach(() => {
    api = loadRuntime().SZGame2D
  })

  it('createSprite preenche defaults', () => {
    const s = api.createSprite({ x: 5, y: 10 })
    expect(s.x).toBe(5)
    expect(s.y).toBe(10)
    expect(s.w).toBe(32)
    expect(s.color).toBe('#22d3ee')
    expect(s.vx).toBe(0)
  })

  it('isColliding detecta sobreposição AABB', () => {
    const a = api.createSprite({ x: 0, y: 0, w: 10, h: 10 })
    const b = api.createSprite({ x: 5, y: 5, w: 10, h: 10 })
    const c = api.createSprite({ x: 100, y: 100, w: 10, h: 10 })
    expect(api.isColliding(a, b)).toBe(true)
    expect(api.isColliding(a, c)).toBe(false)
  })

  it('moveByKeys altera coordenadas conforme keys', () => {
    const s = api.createSprite({ x: 100, y: 100 })
    api.keys.right = true
    api.moveByKeys(s, 5)
    expect(s.x).toBe(105)
    api.keys.right = false
    api.keys.up = true
    api.moveByKeys(s, 5)
    expect(s.y).toBe(95)
  })
})

describe('gameTwoDRuntime.gameLoop', () => {
  // Loader com requestAnimationFrame controlável: cada frame agendado fica numa
  // fila e só roda quando chamamos flushFrame() manualmente.
  function loadWithFrameControl() {
    const frames: Array<() => void> = []
    const win = { addEventListener() {}, SZGame2D: undefined } as unknown as Record<string, unknown>
    let nextId = 1
    const requestAnimationFrame = (cb: () => void) => {
      frames.push(cb)
      return nextId++
    }
    const canceledIds = new Set<number>()
    const cancelAnimationFrame = (id: number) => canceledIds.add(id)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('window', 'requestAnimationFrame', 'cancelAnimationFrame', gameTwoDRuntime)(
      win,
      requestAnimationFrame,
      cancelAnimationFrame,
    )
    const api = (win as unknown as { SZGame2D: { gameLoop: (fn: () => void) => () => void } })
      .SZGame2D
    const flushFrame = () => {
      const cb = frames.shift()
      cb?.()
    }
    return { api, flushFrame }
  }

  it('devolve uma função que para o loop', () => {
    const { api, flushFrame } = loadWithFrameControl()
    let count = 0
    const stop = api.gameLoop(() => {
      count += 1
    })
    expect(typeof stop).toBe('function')

    flushFrame() // frame 1 → roda fn e reagenda
    flushFrame() // frame 2 → roda fn e reagenda
    expect(count).toBe(2)

    stop()
    flushFrame() // frame agendado pelo último tick não deve mais rodar fn
    expect(count).toBe(2)
  })

  it('isola erros da fn sem interromper o loop', () => {
    const { api, flushFrame } = loadWithFrameControl()
    let count = 0
    api.gameLoop(() => {
      count += 1
      throw new Error('boom')
    })
    expect(() => {
      flushFrame()
      flushFrame()
    }).not.toThrow()
    expect(count).toBe(2)
  })

  it('mantém apenas UM loop ativo: chamar gameLoop de novo para o anterior', () => {
    // requestAnimationFrame com fila controlada que carrega o ID de cada frame,
    // para sabermos qual `tick` está agendado e respeitar cancelAnimationFrame.
    const frames: Array<{ id: number; cb: () => void }> = []
    const win = { addEventListener() {}, SZGame2D: undefined } as unknown as Record<string, unknown>
    let nextId = 1
    const requestAnimationFrame = (cb: () => void) => {
      const id = nextId++
      frames.push({ id, cb })
      return id
    }
    const canceled = new Set<number>()
    const cancelAnimationFrame = (id: number) => canceled.add(id)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('window', 'requestAnimationFrame', 'cancelAnimationFrame', gameTwoDRuntime)(
      win,
      requestAnimationFrame,
      cancelAnimationFrame,
    )
    const api = (win as unknown as { SZGame2D: { gameLoop: (fn: () => void) => () => void } })
      .SZGame2D

    // flushAll roda todos os frames pendentes (uma rodada), pulando os cancelados.
    const flushRound = () => {
      const round = frames.splice(0, frames.length)
      for (const f of round) {
        if (!canceled.has(f.id)) f.cb()
      }
    }

    let countA = 0
    let countB = 0
    api.gameLoop(() => {
      countA += 1
    })
    // Segundo loop: deve PARAR o primeiro automaticamente (sem empilhar RAFs).
    api.gameLoop(() => {
      countB += 1
    })

    flushRound()
    flushRound()
    // Só o segundo loop continua vivo; o primeiro foi cancelado na 2ª chamada.
    expect(countA).toBe(0)
    expect(countB).toBe(2)
  })
})

describe('gameTwoDRuntime.onPointer', () => {
  // Loader que captura os listeners registrados em window por nome de evento,
  // para podermos disparar um 'pointerdown' sintético e contar os handlers.
  function loadWithPointer() {
    type Listener = (ev: unknown) => void
    const listeners: Record<string, Listener[]> = {}
    const win = {
      addEventListener(name: string, fn: Listener) {
        listeners[name] ??= []
        listeners[name].push(fn)
      },
      SZGame2D: undefined,
    } as unknown as Record<string, unknown>
    const requestAnimationFrame = () => 0
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, requestAnimationFrame)
    const api = (
      win as unknown as { SZGame2D: { onPointer: (fn: (x: number, y: number) => void) => void } }
    ).SZGame2D
    const firePointerDown = (x: number, y: number) => {
      for (const fn of listeners.pointerdown ?? []) fn({ clientX: x, clientY: y })
    }
    return { api, firePointerDown }
  }

  it('registrar a MESMA fn duas vezes mantém um único handler', () => {
    const { api, firePointerDown } = loadWithPointer()
    let calls = 0
    const handler = () => {
      calls += 1
    }
    api.onPointer(handler)
    api.onPointer(handler)
    firePointerDown(10, 20)
    // Apesar de duas chamadas a onPointer com a MESMA referência, um clique
    // dispara o handler uma única vez.
    expect(calls).toBe(1)
  })

  it('funções DIFERENTES continuam acumulando (API compatível)', () => {
    const { api, firePointerDown } = loadWithPointer()
    let a = 0
    let b = 0
    api.onPointer(() => {
      a += 1
    })
    api.onPointer(() => {
      b += 1
    })
    firePointerDown(0, 0)
    expect(a).toBe(1)
    expect(b).toBe(1)
  })

  it('ignora valores que não são função', () => {
    const { api, firePointerDown } = loadWithPointer()
    expect(() => {
      ;(api.onPointer as unknown as (v: unknown) => void)(null)
      firePointerDown(0, 0)
    }).not.toThrow()
  })

  it('registrar arrows NOVOS a cada frame não cresce a lista sem limite', () => {
    // Cenário real do bug: o gerador emite um arrow LITERAL a cada execução do
    // bloco "quando clicar/tocar". Se o aluno colocar esse bloco dentro do "a
    // cada frame", onPointer recebe uma referência inédita por frame e a lista
    // cresceria sem limite. Simulamos 1000 "frames" registrando funções
    // distintas e verificamos que UM clique não dispara 1000 vezes.
    const { api, firePointerDown } = loadWithPointer()
    let totalCalls = 0
    for (let frame = 0; frame < 1000; frame++) {
      // arrow novo a cada iteração — referência sempre diferente
      api.onPointer(() => {
        totalCalls += 1
      })
    }
    firePointerDown(5, 5)
    // Com o teto de 32 handlers, um clique dispara no máximo 32 vezes — não 1000.
    expect(totalCalls).toBeLessThanOrEqual(32)
    expect(totalCalls).toBeGreaterThan(0)
  })

  it('avisa no console (uma vez) ao atingir o teto', () => {
    const { api } = loadWithPointer()
    const original = console.warn
    let warnCount = 0
    console.warn = () => {
      warnCount += 1
    }
    try {
      // Bem acima do teto de 32 → deve avisar, mas só UMA vez.
      for (let i = 0; i < 100; i++) {
        api.onPointer(() => {})
      }
    } finally {
      console.warn = original
    }
    expect(warnCount).toBe(1)
  })

  it('poucos handlers distintos continuam todos disparando', () => {
    // O cap não pode quebrar o uso legítimo de alguns cliques registrados de
    // propósito: 4 handlers distintos abaixo do teto devem TODOS rodar.
    const { api, firePointerDown } = loadWithPointer()
    const counts = [0, 0, 0, 0]
    for (let i = 0; i < counts.length; i++) {
      const idx = i
      api.onPointer(() => {
        counts[idx] = (counts[idx] ?? 0) + 1
      })
    }
    firePointerDown(0, 0)
    expect(counts).toEqual([1, 1, 1, 1])
  })
})
