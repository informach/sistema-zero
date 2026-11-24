import { expect, test } from 'bun:test'
import { Box3, Vector3 } from 'three'
import { ARQUIPELAGO } from '../src/sistemas/geografia-do-arquipelago'
import { regiaoDoCenario } from '../src/sistemas/regiao-do-cenario'

test('cada centro continua na sua região sem deslocar a geografia aprovada', () => {
  const antes = JSON.stringify(ARQUIPELAGO)
  for (const ilha of ARQUIPELAGO) {
    const r = regiaoDoCenario(ilha.id)
    expect(r.contem(ilha.centro.x, ilha.centro.z)).toBe(true)
    for (const outra of ARQUIPELAGO.filter((i) => i.id !== ilha.id))
      expect(r.contem(outra.centro.x, outra.centro.z)).toBe(false)
    expect(r.planos).toHaveLength(6)
  }
  expect(JSON.stringify(ARQUIPELAGO)).toBe(antes)
})
test('terreno de outra ilha sai da região; uma peça na fronteira é reconhecida como cruzamento', () => {
  const r = regiaoDoCenario('sua-ilha')
  expect(r.volume(new Box3(new Vector3(-20, -8, 100), new Vector3(20, 30, 160)))).toBe('dentro')
  expect(r.volume(new Box3(new Vector3(-20, 0, -720), new Vector3(20, 80, -680)))).toBe('fora')
  expect(r.volume(new Box3(new Vector3(-10, -8, -360), new Vector3(10, 5, -340)))).toBe('cruza')
  expect(r.contem(0, -350)).toBe(true)
  expect(r.contem(NaN, 0)).toBe(false)
  expect(r.volume(new Box3())).toBe('fora')
  expect(() => r.volume({ min: { x: -Infinity, z: 0 }, max: { x: Infinity, z: 0 } })).toThrow(
    /limites/,
  )
})
