import type {
  BbmodelAnimationBinding,
  BbmodelAnimationBindingOptions,
  BbmodelAnimationBindings,
  BbmodelAnimationBindingVia,
} from './bbmodelAnimationBindingTypes'
import type { BbmodelAnimationKeyframes, BbmodelKeyAnimator } from './bbmodelAnimationKeyTypes'
import type { BbmodelGraph } from './bbmodelGraph'
import { requireBbmodel } from './bbmodelInput'
import type { BbmodelNodeMetadata } from './bbmodelNodeMetadata'
import type { BbmodelSelection } from './bbmodelSelection'

type InitialBinding = Exclude<BbmodelAnimationBinding, { kind: 'conflict' }>

export function readBbmodelAnimationBindingOptions(value: BbmodelAnimationBindingOptions) {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha como vincular os movimentos.',
  )
  for (const key of Object.keys(value))
    requireBbmodel(
      key === 'nameReferences',
      `options.${key}`,
      'Esta opção de vínculo não é conhecida.',
    )
  const nameReferences = value.nameReferences === undefined ? 'reject' : value.nameReferences
  requireBbmodel(
    nameReferences === 'reject' || nameReferences === 'unique-name',
    'options.nameReferences',
    'Escolha se referências antigas por nome podem ser vinculadas.',
  )
  return { nameReferences }
}

/** Source animation references recognize lowercase 8/4/4/4/12 hex, not RFC variant/version bits. */
function uuidReference(value: string): boolean {
  if (value.length !== 36) return false
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      if (char !== '-') return false
    } else if (
      char === undefined ||
      !((char >= '0' && char <= '9') || (char >= 'a' && char <= 'f'))
    )
      return false
  }
  return true
}

/** Index every source group, including omitted ones; selection must not hide ambiguous names. */
function groupNames(metadata: readonly BbmodelNodeMetadata[]) {
  const names = new Map<string, { node: number; count: number }>()
  for (const node of metadata) {
    if (node.kind !== 'group') continue
    const name = node.name
    if (name === null) continue
    const normalized = name.toLowerCase(),
      previous = names.get(normalized)
    if (previous) previous.count++
    else names.set(normalized, { node: node.node, count: 1 })
  }
  return names
}

/**
 * Matching immutable graph, node metadata, key declarations and selection from the private
 * readers. Binding only: no key values, pose, curves, omission or native adoption. Armature/IK
 * and unknown animators remain unresolved even when their source value schema is known.
 */
export function bindBbmodelAnimations(
  input: {
    graph: BbmodelGraph
    metadata: readonly BbmodelNodeMetadata[]
    keys: BbmodelAnimationKeyframes
    selection: BbmodelSelection
  },
  options: BbmodelAnimationBindingOptions = {},
): BbmodelAnimationBindings {
  const policy = readBbmodelAnimationBindingOptions(options),
    names =
      policy.nameReferences === 'unique-name'
        ? groupNames(input.metadata)
        : new Map<string, { node: number; count: number }>(),
    selected = new Set(input.selection.nodes.map((node) => node.node))
  function bind(animator: BbmodelKeyAnimator): InitialBinding {
    const { declaration } = animator,
      base = { animator: animator.index, path: declaration.path, reference: declaration.key },
      unresolved = (
        detail: Extract<BbmodelAnimationBinding, { kind: 'unresolved' }>['detail'],
      ): InitialBinding => ({ ...base, kind: 'unresolved', detail })
    if (animator.kind !== 'transform' || animator.sourceType !== 'bone')
      return unresolved({ code: 'animator-type', type: declaration.type })
    function target(node: number, via: BbmodelAnimationBindingVia): InitialBinding {
      const entry = input.graph.nodes[node]
      if (!entry) throw new Error('Animation target escaped the validated source graph')
      if (entry.kind !== 'group') return unresolved({ code: 'target-type', node })
      return { ...base, kind: 'bound', node, selected: selected.has(node), via }
    }
    function byName(name: string, via: 'key-name' | 'declared-name'): InitialBinding | null {
      if (policy.nameReferences === 'reject')
        return unresolved({ code: 'name-reference-rejected', via })
      const candidate = names.get(name.toLowerCase())
      if (!candidate) return null
      if (candidate.count > 1)
        return unresolved({ code: 'ambiguous-name', via, count: candidate.count })
      return target(candidate.node, via)
    }
    if (uuidReference(declaration.key)) {
      const node = input.graph.byUuid.get(declaration.key)
      if (node !== undefined) return target(node, 'uuid')
    } else {
      const result = byName(declaration.key, 'key-name')
      if (result !== null) return result
    }
    if (declaration.name !== null && declaration.name !== '') {
      const result = byName(declaration.name, 'declared-name')
      if (result !== null) return result
    }
    return unresolved({ code: 'missing-target' })
  }
  const counts = { bound: 0, unresolved: 0, conflicting: 0, omittedTargets: 0 },
    clips = input.keys.clips.map((clip) => {
      const initial = clip.animators.map(bind),
        targets = new Map<number, number>()
      for (const binding of initial)
        if (binding.kind === 'bound')
          targets.set(binding.node, (targets.get(binding.node) ?? 0) + 1)
      const animators = initial.map((binding): BbmodelAnimationBinding => {
        if (binding.kind === 'unresolved') {
          counts.unresolved++
          return binding
        }
        if (!binding.selected) counts.omittedTargets++
        const count = targets.get(binding.node)
        if (count === undefined) throw new Error('Missing animation target count')
        if (count > 1) {
          counts.conflicting++
          return { ...binding, kind: 'conflict', count }
        }
        counts.bound++
        return binding
      })
      return { clip: clip.clip, animators }
    })
  return { options: policy, clips, counts }
}
