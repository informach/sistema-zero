import { describe, expect, test } from 'bun:test'
import {
  createGate,
  WatermarkQueueAbortedError,
  WatermarkQueueBusyError,
} from '../src/server/watermark-queue'

/** Promessa controlada manualmente (resolve de fora). */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0))

describe('createGate', () => {
  test('nunca passa de maxConcurrent execuções simultâneas (invariante do OOM)', async () => {
    const gate = createGate(2)
    let active = 0
    let peak = 0
    const gates = [deferred(), deferred(), deferred(), deferred(), deferred()]
    const jobs = gates.map((d) =>
      gate.run(async () => {
        active++
        peak = Math.max(peak, active)
        await d.promise
        active--
      }),
    )

    await tick()
    expect(active).toBe(2) // os 3 restantes esperam na fila

    gates[0]?.resolve()
    await tick()
    expect(active).toBe(2) // libera um → o próximo da fila entra

    for (const d of gates) d.resolve()
    await Promise.all(jobs)
    expect(active).toBe(0)
    expect(peak).toBe(2)
  })

  test('propaga o retorno e o erro do job (e libera a vaga após erro)', async () => {
    const gate = createGate(1)
    await expect(gate.run(async () => 'ok')).resolves.toBe('ok')
    await expect(
      gate.run(async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    // A vaga foi liberada no finally — o próximo job roda normalmente.
    await expect(gate.run(async () => 42)).resolves.toBe(42)
  })

  test('fila esvazia em ordem e todos completam', async () => {
    const gate = createGate(1)
    const order: number[] = []
    await Promise.all(
      [1, 2, 3, 4].map((n) =>
        gate.run(async () => {
          order.push(n)
          await tick()
        }),
      ),
    )
    expect([...order].sort((a, b) => a - b)).toEqual([1, 2, 3, 4])
    expect(order).toHaveLength(4)
  })
})

/**
 * Incidente 07/09 ("preparando seu e-book" para sempre → 524): a fila não tinha
 * prazo nem enxergava o cliente ir embora. Estes casos fixam as duas saídas e o
 * detalhe que faz a diferença — um esperador morto não pode prender a vaga.
 */
describe('createGate — prazo e abort na espera', () => {
  /** Ocupa a única vaga até `release()`. */
  function occupy(gate: ReturnType<typeof createGate>) {
    let release!: () => void
    const done = gate.run(
      () =>
        new Promise<void>((r) => {
          release = r
        }),
    )
    return { release, done }
  }

  test('esperar além de waitTimeoutMs → WatermarkQueueBusyError, sem rodar o job', async () => {
    const gate = createGate(1)
    const slot = occupy(gate)
    let ran = false
    await expect(
      gate.run(
        async () => {
          ran = true
        },
        { waitTimeoutMs: 15 },
      ),
    ).rejects.toBeInstanceOf(WatermarkQueueBusyError)
    expect(ran).toBe(false)
    slot.release()
    await slot.done
  })

  test('signal abortado na espera → WatermarkQueueAbortedError, sem rodar o job', async () => {
    const gate = createGate(1)
    const slot = occupy(gate)
    const aborter = new AbortController()
    let ran = false
    const pending = gate.run(
      async () => {
        ran = true
      },
      { signal: aborter.signal },
    )
    await tick()
    aborter.abort()
    await expect(pending).rejects.toBeInstanceOf(WatermarkQueueAbortedError)
    expect(ran).toBe(false)
    slot.release()
    await slot.done
  })

  test('signal JÁ abortado → recusa antes de entrar na fila', async () => {
    const gate = createGate(1)
    const aborter = new AbortController()
    aborter.abort()
    await expect(gate.run(async () => 'x', { signal: aborter.signal })).rejects.toBeInstanceOf(
      WatermarkQueueAbortedError,
    )
  })

  test('esperador morto (expirou) não prende a vaga: o próximo VIVO entra quando ela abre', async () => {
    const gate = createGate(1)
    const slot = occupy(gate)
    // 1º esperador expira rápido; 2º espera sem prazo.
    const dead = gate.run(async () => 'dead', { waitTimeoutMs: 10 })
    let secondRan = false
    const alive = gate.run(async () => {
      secondRan = true
      return 'alive'
    })
    await expect(dead).rejects.toBeInstanceOf(WatermarkQueueBusyError)
    expect(secondRan).toBe(false) // a vaga ainda está ocupada
    slot.release()
    await slot.done
    // O wake-up pula o morto e acorda o vivo — sem isso a vaga ficava presa com a fila cheia.
    await expect(alive).resolves.toBe('alive')
    expect(secondRan).toBe(true)
  })

  test('abort DEPOIS de acordar não derruba o job (a vaga já é dele)', async () => {
    const gate = createGate(1)
    const slot = occupy(gate)
    const aborter = new AbortController()
    let ran = false
    const pending = gate.run(
      async () => {
        ran = true
        await tick()
        return 'ok'
      },
      { signal: aborter.signal },
    )
    await tick()
    slot.release()
    await slot.done
    await tick() // acordou e começou a rodar
    aborter.abort()
    await expect(pending).resolves.toBe('ok')
    expect(ran).toBe(true)
  })

  test('sem opções, o comportamento antigo se mantém (espera sem prazo)', async () => {
    const gate = createGate(1)
    const slot = occupy(gate)
    const pending = gate.run(async () => 'later')
    await new Promise((r) => setTimeout(r, 30))
    slot.release()
    await slot.done
    await expect(pending).resolves.toBe('later')
  })
})
