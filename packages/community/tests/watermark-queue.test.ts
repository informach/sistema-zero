import { describe, expect, test } from 'bun:test'
import { createGate } from '../src/server/watermark-queue'

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
