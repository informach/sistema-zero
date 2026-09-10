import type { BbmodelKeyAnimator } from './bbmodelAnimationKeyTypes'
import type { BbmodelAnimationSource } from './bbmodelAnimationTypes'
import type { BbmodelClipProblem } from './bbmodelClipPlanTypes'
import { bbmodelIdentifier } from './bbmodelInput'
import { bbmodelKeyPath } from './bbmodelValues'

const clipMapped = new Set([
  'uuid',
  'name',
  'length',
  'loop',
  'blend_weight',
  'animators',
  'anim_time_update',
  'start_delay',
  'loop_delay',
])
const clipMetadata = new Set([
  'override',
  'selected',
  'snapping',
  'scope',
  'saved',
  'path',
  'group_name',
  'markers',
])
const animatorMapped = new Set(['type', 'keyframes', 'rotation_global', 'quaternion_interpolation'])
const animatorMetadata = new Set(['name'])
const keyMapped = new Set(['channel', 'time', 'interpolation', 'data_points'])
const keyMetadata = new Set(['uuid', 'color', 'uniform', 'bezier_linked'])
const handles = new Set([
  'bezier_left_time',
  'bezier_right_time',
  'bezier_left_value',
  'bezier_right_value',
])
const axes = new Set(['x', 'y', 'z'])

/** Entirely discarded metadata subtrees (markers) need no unknown-value traversal. */
export function assessBbmodelClipCoverage(
  source: BbmodelAnimationSource,
  animators: readonly BbmodelKeyAnimator[],
  policy: { metadata: 'reject' | 'discard'; unmapped: 'reject' | 'discard' },
): {
  metadataFields: number
  unmappedFields: number
  firstMetadataPath: string | null
  firstUnmappedPath: string | null
  problem: BbmodelClipProblem | null
} {
  let metadataFields = 0,
    unmappedFields = 0,
    problem: BbmodelClipProblem | null = null,
    firstMetadataPath: string | null = null,
    firstUnmappedPath: string | null = null
  function inspect(
    row: Readonly<Record<string, unknown>>,
    path: string,
    classify: (key: string) => 'mapped' | 'metadata' | 'unmapped',
  ) {
    for (const key in row) {
      if (!Object.hasOwn(row, key)) continue
      const category = classify(key)
      if (category === 'mapped') continue
      bbmodelIdentifier(key, path)
      if (category === 'metadata') {
        metadataFields++
        firstMetadataPath ??= bbmodelKeyPath(path, key)
      } else {
        unmappedFields++
        firstUnmappedPath ??= bbmodelKeyPath(path, key)
      }
      if (policy[category] === 'reject' && !problem)
        problem = { code: category, path: bbmodelKeyPath(path, key) }
    }
  }
  const category = (key: string, mapped: ReadonlySet<string>, metadata: ReadonlySet<string>) =>
    mapped.has(key) ? 'mapped' : metadata.has(key) ? 'metadata' : 'unmapped'
  inspect(source.source, source.path, (key) => category(key, clipMapped, clipMetadata))
  for (const animator of animators) {
    if (animator.kind !== 'transform') throw new Error('Unresolved animator reached clip coverage')
    inspect(animator.declaration.source, animator.declaration.path, (key) =>
      category(key, animatorMapped, animatorMetadata),
    )
    for (const key of animator.keys) {
      if (key.kind !== 'transform') throw new Error('Unresolved channel reached clip coverage')
      const direct = key.points.length === 1 && key.points[0]?.layout === 'direct'
      inspect(key.source, key.path, (field) => {
        if (axes.has(field)) return direct ? 'mapped' : 'metadata'
        // Mixed segments can use handles on a key whose own interpolation is linear.
        if (handles.has(field)) return 'mapped'
        return category(field, keyMapped, keyMetadata)
      })
      if (direct) continue
      for (const point of key.points) {
        inspect(point.source, point.path, (field) => {
          if (field === 'values') return 'mapped'
          if (!axes.has(field)) return 'unmapped'
          return point.aliasSource && Object.hasOwn(point.aliasSource, field)
            ? 'metadata'
            : 'mapped'
        })
        if (point.aliasSource)
          inspect(point.aliasSource, `${point.path}.values`, (field) =>
            axes.has(field) ? 'mapped' : 'unmapped',
          )
      }
    }
  }
  return { metadataFields, unmappedFields, firstMetadataPath, firstUnmappedPath, problem }
}
