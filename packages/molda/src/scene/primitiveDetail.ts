import {
  CYLINDER_SEGMENTS,
  SPHERE_SEGMENTS_AROUND,
  SPHERE_SEGMENTS_DOWN,
  triangleCountOf,
} from '../model/geometry'
import type { SceneCurvedPrimitive, ScenePrimitiveGeometry } from './document'
import { number, record } from './validation'

export const PRIMITIVE_DETAIL_LIMITS = {
  around: { min: 3, max: 64 },
  down: { min: 2, max: 32 },
} as const

export function readPrimitiveDetail(kind: 'cylinder', raw: unknown): { around: number }
export function readPrimitiveDetail(kind: 'sphere', raw: unknown): { around: number; down: number }
export function readPrimitiveDetail(kind: 'cylinder' | 'sphere', raw: unknown) {
  const row = record(raw, 'tessellation', kind === 'sphere' ? ['around', 'down'] : ['around'])
  const around = number(
    row.around,
    'tessellation.around',
    PRIMITIVE_DETAIL_LIMITS.around.min,
    PRIMITIVE_DETAIL_LIMITS.around.max,
    true,
  )
  return kind === 'sphere'
    ? {
        around,
        down: number(
          row.down,
          'tessellation.down',
          PRIMITIVE_DETAIL_LIMITS.down.min,
          PRIMITIVE_DETAIL_LIMITS.down.max,
          true,
        ),
      }
    : { around }
}

/** One validated value for drawing, conversion, controls and both raw/rendered resource budgets. */
export function primitiveDetail(source: SceneCurvedPrimitive): { around: number; down: number } {
  if (source.kind === 'sphere')
    return readPrimitiveDetail(
      'sphere',
      source.tessellation ?? { around: SPHERE_SEGMENTS_AROUND, down: SPHERE_SEGMENTS_DOWN },
    )
  return {
    ...readPrimitiveDetail('cylinder', source.tessellation ?? { around: CYLINDER_SEGMENTS }),
    down: 1,
  }
}

export function primitiveTriangleCount(source: ScenePrimitiveGeometry): number {
  if (source.kind === 'box' || source.kind === 'wedge') return triangleCountOf(source.kind)
  const { around, down } = primitiveDetail(source)
  return source.kind === 'cylinder' ? around * 4 : around * (down - 1) * 2
}
