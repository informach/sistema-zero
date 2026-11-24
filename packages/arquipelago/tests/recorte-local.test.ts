import { expect, test } from 'bun:test'
import { usarRecorteLocal } from '../src/mundo/recorte-local'

test('recorte é compartilhado entre ilhas e devolve o estado anterior após a última liberação', () => {
  for (const original of [true, false]) {
    const renderer = { localClippingEnabled: original },
      a = usarRecorteLocal(renderer),
      b = usarRecorteLocal(renderer)
    expect(renderer.localClippingEnabled).toBe(true)
    a()
    a()
    expect(renderer.localClippingEnabled).toBe(true)
    b()
    expect(renderer.localClippingEnabled).toBe(original)
  }
})
