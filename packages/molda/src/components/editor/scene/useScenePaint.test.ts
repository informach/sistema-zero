import { expect, test } from 'bun:test'
import type { ScenePaintSample } from '../../../scene/imagePaint'
import { crossesSeam } from './useScenePaint'

test('a emenda da volta do cilindro e da bola recomeça o traço; o passo comum continua ligado', () => {
  const bounds = { x0: 10, y0: 0, x1: 34, y1: 7 }
  const at = (x: number, y: number): ScenePaintSample => ({ point: [x, y], region: 'side', bounds })
  // Da borda direita da volta para a esquerda: é a emenda, não um risco pela folha inteira.
  expect(crossesSeam(at(33, 3), at(11, 3))).toBe(true)
  expect(crossesSeam(at(20, 3), at(24, 4))).toBe(false)
  expect(crossesSeam(at(20, 0), at(20, 7))).toBe(true)
  // Sem limite (a folha 2D, a pintura de antes): nada muda.
  expect(crossesSeam({ point: [0, 0], region: 'x' }, { point: [30, 30], region: 'x' })).toBe(false)
})
