import { expect, test } from 'bun:test'
import { Matrix4 } from 'three'
import { arredondarMatriz, arredondarVolume } from '../src/compilar/arredondar'

/** Números mais curtos no JSON da cena em campo (plano "Mundos de 2 km", lote 5). */

test('a matriz fica com a posição a 1 mm e o resto com 7 algarismos, sempre invertível', () => {
  const m = new Matrix4()
    .makeRotationY(1.1)
    .scale({ x: 1e-9, y: 2.000000123, z: 0.5 } as never)
    .setPosition(-18.781448290986393, 0.48248466016609537, -142.15183898007413)
  const r = arredondarMatriz(m.elements)
  expect(r.slice(12, 15)).toEqual([-18.781, 0.482, -142.152])
  expect(r[15]).toBe(1)
  expect(r[5]).toBe(2)
  // A escala minúscula não vira zero: a matriz continua invertível.
  expect(r[0]).not.toBe(0)
  expect(Math.abs(new Matrix4().fromArray(r).determinant())).toBeGreaterThan(0)
  for (const v of r) expect(JSON.stringify(v).length).toBeLessThanOrEqual(14)
})

test('o volume arredonda para fora, a 1 mm', () => {
  const v = arredondarVolume({
    min: { x: -21.0278754, y: 0.4824846, z: 3.0000001 },
    max: { x: -16.4401, y: 7.0000009, z: 3.9999999 },
  })
  expect(v).toEqual({ min: { x: -21.028, y: 0.482, z: 3 }, max: { x: -16.44, y: 7.001, z: 4 } })
})
