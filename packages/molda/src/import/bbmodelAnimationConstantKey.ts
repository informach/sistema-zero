import { classifyBbmodelAnimationConstant } from './bbmodelAnimationConstant'
import type { BbmodelAnimationKey, BbmodelAnimationPoint } from './bbmodelAnimationKeyTypes'
import type { BbmodelVec3 } from './bbmodelValues'

export interface BbmodelAnimationConstantIssue {
  code: 'expression' | 'literal-overflow' | 'literal-underflow'
  path: string
  point: number
  axis: 'x' | 'y' | 'z'
}
export type BbmodelAnimationConstantKey =
  | { status: 'constant'; points: BbmodelVec3[] }
  | { status: 'unresolved'; issues: BbmodelAnimationConstantIssue[] }

function valuePath(point: BbmodelAnimationPoint, axis: 'x' | 'y' | 'z'): string {
  const alias = point.aliasSource !== null && Object.hasOwn(point.aliasSource, axis)
  return `${point.path}${alias ? '.values' : ''}.${axis}`
}

/**
 * One already validated transform key at a time, at most 1,000 source points. No target,
 * version-axis migration, interpolation or omission. Unresolved values never yield partial XYZ.
 */
export function readBbmodelAnimationConstantKey(
  key: Extract<BbmodelAnimationKey, { kind: 'transform' }>,
): BbmodelAnimationConstantKey {
  const points: BbmodelVec3[] = [],
    issues: BbmodelAnimationConstantIssue[] = []
  for (const [index, point] of key.points.entries()) {
    const x = classifyBbmodelAnimationConstant(point.values[0]),
      y = classifyBbmodelAnimationConstant(point.values[1]),
      z = classifyBbmodelAnimationConstant(point.values[2])
    if (x.kind === 'constant' && y.kind === 'constant' && z.kind === 'constant') {
      points.push([x.value, y.value, z.value])
      continue
    }
    const axes = [
      ['x', x],
      ['y', y],
      ['z', z],
    ] as const
    for (const [axis, value] of axes) {
      if (value.kind === 'constant') continue
      issues.push({
        code:
          value.kind === 'expression'
            ? 'expression'
            : value.reason === 'overflow'
              ? 'literal-overflow'
              : 'literal-underflow',
        path: valuePath(point, axis),
        point: index,
        axis,
      })
    }
  }
  return issues.length ? { status: 'unresolved', issues } : { status: 'constant', points }
}
