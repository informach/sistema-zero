import { expect, test } from 'bun:test'
import { BoxGeometry, Matrix4 } from 'three'
import { topoFisicoDoPiso } from '../src/curvas/topo-fisico'

test('a física de um piso de peças fica só com o topo, no mesmo lugar do desenho', () => {
  const laje = new BoxGeometry(2, 0.1, 2),
    topo = topoFisicoDoPiso(laje, new Matrix4())
  try {
    // Uma caixa tem 12 triângulos; só os 2 da face de cima sustentam.
    expect(topo.getAttribute('position').count).toBe(6)
    const y = topo.getAttribute('position').array as Float32Array
    for (let i = 1; i < y.length; i += 3) expect(y[i]).toBeCloseTo(0.05, 6)
  } finally {
    laje.dispose()
    topo.dispose()
  }
})

test('o topo é medido no mundo: a peça virada usa a face que ficou para cima', () => {
  const laje = new BoxGeometry(2, 0.1, 2),
    virada = new Matrix4().makeRotationX(Math.PI),
    topo = topoFisicoDoPiso(laje, virada)
  try {
    expect(topo.getAttribute('position').count).toBe(6)
    // No referencial da peça, são os triângulos de baixo (y = -0,05).
    const y = topo.getAttribute('position').array as Float32Array
    for (let i = 1; i < y.length; i += 3) expect(y[i]).toBeCloseTo(-0.05, 6)
  } finally {
    laje.dispose()
    topo.dispose()
  }
})
