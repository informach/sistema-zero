import type { GltfAnimation } from './gltfAnimationTypes'

export interface GltfSelectedAnimation {
  animation: number
  /** Original channel/sampler indices, never renumbered or silently retargeted. */
  channels: number[]
  samplers: number[]
  outsideSceneChannels: number[]
  unresolvedChannels: number[]
}

/** Every source channel has exactly one disposition, including clips with no selected channel. */
export function selectGltfAnimationChannels(
  animations: readonly GltfAnimation[],
  nodes: ReadonlySet<number>,
  accessors: Set<number>,
): GltfSelectedAnimation[] {
  return animations.map((animation, index) => {
    const channels: number[] = [],
      samplers = new Set<number>(),
      outsideSceneChannels: number[] = [],
      unresolvedChannels: number[] = []
    animation.channels.forEach(({ target, sampler }, channel) => {
      if (target.node !== null && !nodes.has(target.node)) outsideSceneChannels.push(channel)
      else if (target.kind === 'unresolved') unresolvedChannels.push(channel)
      else {
        channels.push(channel)
        samplers.add(sampler)
      }
    })
    for (const sampler of samplers) {
      const source = animation.samplers[sampler]!
      accessors.add(source.input)
      accessors.add(source.output)
    }
    return {
      animation: index,
      channels,
      samplers: [...samplers].sort((a, b) => a - b),
      outsideSceneChannels,
      unresolvedChannels,
    }
  })
}
