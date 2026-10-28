import { expect, test } from 'bun:test'
import { criarBalanco } from '../src/sistemas/cipo'
import { type Corda, criarPontos, passoDasCordas } from '../src/sistemas/cordas'
import { forcaPorHora, ventoEm } from '../src/sistemas/vento'

test('vento é suave, limitado, mais forte à tarde e a rajada não atinge tudo junto', () => {
  expect(forcaPorHora(15)).toBeGreaterThan(forcaPorHora(6))
  const a = { x: 0, z: 0 },
    b = { x: 0, z: 0 }
  const campo = { tempo: 0, hora: 15 }
  for (let i = 0; i < 600; i++) {
    campo.tempo = i / 60
    ventoEm(0, 0, campo, a)
    campo.tempo += 1 / 60
    ventoEm(0, 0, campo, b)
    expect(Math.hypot(a.x, a.z)).toBeLessThanOrEqual(1.00001)
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(0.01)
  }
  ventoEm(20, 0, campo, b)
  expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.01)
})
test('cipó livre recebe vento sem deslocar a âncora ou esticar os elos', () => {
  const pivo = { x: 0, y: 6, z: 0 }
  const c: Corda = {
    pivo,
    corda: 4,
    pegada: 3,
    balanco: criarBalanco(),
    seguro: false,
    ...criarPontos(pivo, 4),
    chao: 0,
    esperandoOCorpoSair: false,
  }
  const vento = { tempo: 0, hora: 15 }
  for (let i = 0; i < 300; i++) {
    vento.tempo += 1 / 60
    passoDasCordas([c], null, [], 1 / 60, vento)
  }
  expect(c.pontos[0]).toEqual(pivo)
  expect(c.pontos.at(-1)!.x).toBeGreaterThan(0.03)
  for (let i = 1; i < c.pontos.length; i++) {
    const a = c.pontos[i - 1]!,
      b = c.pontos[i]!
    expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeLessThan((4 / 18) * 1.03)
  }
})
