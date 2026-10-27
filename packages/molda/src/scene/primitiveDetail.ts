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
  torusDown: { min: 3, max: 32 },
} as const

export const TORUS_PROFILE = {
  ringRadius: 0.65,
  tubeRadius: 0.35,
  initialHalfHeight: 0.35,
} as const

export function readPrimitiveDetail(kind: 'cylinder' | 'cone', raw: unknown): { around: number }
export function readPrimitiveDetail(
  kind: 'sphere' | 'torus',
  raw: unknown,
): { around: number; down: number }
export function readPrimitiveDetail(kind: SceneCurvedPrimitive['kind'], raw: unknown) {
  const row = record(
    raw,
    'tessellation',
    kind === 'cylinder' || kind === 'cone' ? ['around'] : ['around', 'down'],
  )
  const around = number(
    row.around,
    'tessellation.around',
    PRIMITIVE_DETAIL_LIMITS.around.min,
    PRIMITIVE_DETAIL_LIMITS.around.max,
    true,
  )
  return kind !== 'cylinder' && kind !== 'cone'
    ? {
        around,
        down: number(
          row.down,
          'tessellation.down',
          kind === 'torus'
            ? PRIMITIVE_DETAIL_LIMITS.torusDown.min
            : PRIMITIVE_DETAIL_LIMITS.down.min,
          PRIMITIVE_DETAIL_LIMITS.down.max,
          true,
        ),
      }
    : { around }
}

/** One validated value for drawing, conversion, controls and both raw/rendered resource budgets. */
export function primitiveDetail(source: SceneCurvedPrimitive): { around: number; down: number } {
  if (source.kind === 'sphere' || source.kind === 'torus')
    return readPrimitiveDetail(
      source.kind,
      source.tessellation ??
        (source.kind === 'sphere'
          ? { around: SPHERE_SEGMENTS_AROUND, down: SPHERE_SEGMENTS_DOWN }
          : { around: 16, down: 8 }),
    )
  return {
    ...readPrimitiveDetail(source.kind, source.tessellation ?? { around: CYLINDER_SEGMENTS }),
    down: 1,
  }
}

export function primitiveTriangleCount(source: ScenePrimitiveGeometry): number {
  if (source.kind === 'box' || source.kind === 'wedge') return triangleCountOf(source.kind)
  const { around, down } = primitiveDetail(source)
  return source.kind === 'cylinder'
    ? around * 4
    : source.kind === 'cone'
      ? around * 2
      : source.kind === 'torus'
        ? around * down * 2
        : around * (down - 1) * 2
}
