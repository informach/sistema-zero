import { describe, expect, test } from 'bun:test'
import { Euler, Matrix4 } from 'three'
import { createPart } from '../core/model'
import { makeModel } from '../testing/fixtures'
import {
  modelBounds,
  partBounds,
  partCorners,
  partMatrix,
  partPivot,
  rotationMatrixXYZ,
  transformPoint,
} from './transform'
import { mirrorTwinOf } from './twins'

function near(a: number, b: number, eps = 1e-6): void {
  expect(Math.abs(a - b)).toBeLessThan(eps)
}

describe('transformação das peças', () => {
  test('rotationMatrixXYZ é a mesma matriz do Euler XYZ do three', () => {
    for (const [rx, ry, rz] of [
      [0, 0, 0],
      [15, 0, 0],
      [0, 30, 0],
      [0, 0, 45],
      [15, 30, 45],
      [90, 180, 270],
      [345, 15, 330],
    ]) {
      const ours = rotationMatrixXYZ(rx as number, ry as number, rz as number)
      const theirs = new Matrix4().makeRotationFromEuler(
        new Euler(
          ((rx as number) * Math.PI) / 180,
          ((ry as number) * Math.PI) / 180,
          ((rz as number) * Math.PI) / 180,
          'XYZ',
        ),
      )
      const e = theirs.elements
      // three é column-major: e[1] é linha 1, coluna 0.
      const expected = [e[0], e[4], e[8], e[1], e[5], e[9], e[2], e[6], e[10]]
      for (let i = 0; i < 9; i += 1) near(ours[i] as number, expected[i] as number)
    }
  })

  test('o pivô fica parado e a matriz gira em torno dele', () => {
    const part = createPart({
      name: 'p',
      from: [0, 0, 0],
      to: [2, 2, 2],
      color: 1,
      rotation: [0, 90, 0],
    })
    const m = partMatrix(part)
    const pivot = partPivot(part)
    const p = transformPoint(m, pivot)
    near(p[0], pivot[0])
    near(p[1], pivot[1])
    near(p[2], pivot[2])
    // Canto (2, 0, 2) girado 90° em Y em torno do centro (1,1,1) vai para (2, 0, 0).
    const corner = transformPoint(m, [2, 0, 2])
    near(corner[0], 2)
    near(corner[1], 0)
    near(corner[2], 0)
    // Com pivô próprio, o pivô continua parado.
    const pivoted = { ...part, origin: [0, 0, 0] as [number, number, number] }
    const q = transformPoint(partMatrix(pivoted), [0, 0, 0])
    near(q[0], 0)
    near(q[1], 0)
    near(q[2], 0)
  })

  test('partBounds de uma caixa girada 90° em Y troca os lados', () => {
    const part = createPart({
      name: 'p',
      from: [0, 0, 0],
      to: [4, 1, 2],
      color: 1,
      rotation: [0, 90, 0],
    })
    const bounds = partBounds(part)
    near(bounds.max[0] - bounds.min[0], 2)
    near(bounds.max[2] - bounds.min[2], 4)
    near(bounds.max[1] - bounds.min[1], 1)
    expect(partCorners(part)).toHaveLength(8)
  })

  test('modelBounds cobre todas as peças; modelo vazio é null', () => {
    const model = makeModel()
    const bounds = modelBounds(model)
    expect(bounds).not.toBeNull()
    expect(bounds?.min[0]).toBeLessThanOrEqual(-2)
    expect(bounds?.max[0]).toBeGreaterThanOrEqual(5)
    expect(modelBounds({ parts: [] })).toBeNull()
  })

  test('o gêmeo [rx, -ry, -rz] é o espelho geométrico exato da fonte (x → -x)', () => {
    const source = createPart({
      name: 's',
      from: [1, 0, -1],
      to: [4, 2, 1],
      color: 1,
      rotation: [15, 30, 45],
    })
    source.origin = [1, 0, 0]
    const twin = mirrorTwinOf(
      source,
      createPart({ name: 't', from: [0, 0, 0], to: [1, 1, 1], color: 1 }),
    )
    const mirrored = partCorners(source)
      .map(([x, y, z]) => [-x, y, z])
      .map((c) => c.map((v) => v.toFixed(5)).join(','))
      .sort()
    const twinCorners = partCorners(twin)
      .map((c) => c.map((v) => v.toFixed(5)).join(','))
      .sort()
    expect(twinCorners).toEqual(mirrored)
  })
})
