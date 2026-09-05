import { describe, expect, test } from 'bun:test'
import { perspectiveFitDistance } from './cameraFit'

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

describe('distância para enquadrar', () => {
  test('usa o campo horizontal quando o palco está em retrato', () => {
    const radius = 10
    const verticalFov = 45
    const aspect = 0.5
    const horizontalHalfFov = Math.atan(Math.tan(radians(verticalFov) / 2) * aspect)

    expect(perspectiveFitDistance(radius, verticalFov, aspect)).toBeCloseTo(
      radius / Math.sin(horizontalHalfFov),
      10,
    )
  })

  test('continua usando o campo vertical quando o palco está em paisagem', () => {
    const radius = 10
    const verticalFov = 45

    expect(perspectiveFitDistance(radius, verticalFov, 2)).toBeCloseTo(
      radius / Math.sin(radians(verticalFov) / 2),
      10,
    )
  })
})
