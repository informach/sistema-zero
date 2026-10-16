import { expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { applyImportSequence } from '../src/import-sequence'

test('lote interrompe entre confirmações e não avança após conflito ou resultado incerto', async () => {
  const seen: number[] = [],
    confirmed: number[] = []
  let stopped = false
  const result = await applyImportSequence(
    [1, 2, 3],
    async (id) => {
      seen.push(id)
      stopped = true
      return { status: 'applied', message: 'Confirmado' }
    },
    () => stopped,
    (done) => confirmed.push(done),
  )
  expect(result).toEqual({ completed: 1, stopped: true })
  expect(seen).toEqual([1])
  expect(confirmed).toEqual([1])
  for (const uncertain of [false, true]) {
    const submitted: number[] = []
    await rejects(
      applyImportSequence(
        [1, 2, 3],
        async (id) => {
          submitted.push(id)
          if (id === 2 && uncertain) throw new Error('Resposta perdida')
          return { status: id === 2 ? 'conflict' : 'reused', message: 'Peça alterada' }
        },
        () => false,
        () => {},
      ),
      uncertain ? /Resposta perdida/ : /Peça alterada/,
    )
    expect(submitted).toEqual([1, 2])
  }
})
