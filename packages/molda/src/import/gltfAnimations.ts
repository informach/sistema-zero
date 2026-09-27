import { readGltfAnimationChannel } from './gltfAnimationChannel'
import type {
  GltfAnimation,
  GltfAnimationSampler,
  GltfAnimationSources,
  GltfInterpolation,
} from './gltfAnimationTypes'
import { planGltfAnimationValues } from './gltfAnimationValues'
import {
  GLTF_INPUT_LIMITS,
  GltfInputError,
  gltfInteger,
  gltfList,
  gltfRecord,
  requireGltf,
} from './gltfInput'
import { gltfName } from './gltfMetadata'

function interpolation(input: unknown, path: string): GltfInterpolation {
  if (input === undefined) return 'LINEAR'
  requireGltf(typeof input === 'string' && input.length > 0, path, 'Falta a interpolação.')
  if (input === 'LINEAR' || input === 'STEP' || input === 'CUBICSPLINE') return input
  throw new GltfInputError('unsupported', path, 'Este tipo de interpolação ainda não é suportado.')
}

/** Core channels remain source references, not baked native tracks or implicit playback. */
export function readGltfAnimations(input: unknown, source: GltfAnimationSources): GltfAnimation[] {
  let samplerCount = 0,
    channelCount = 0
  const plans = gltfList(input, 'animations', GLTF_INPUT_LIMITS.animations).map((input, i) => {
    const path = `animations[${i}]`,
      row = gltfRecord(input, path),
      samplers = row.samplers,
      channels = row.channels
    requireGltf(
      Array.isArray(samplers) && samplers.length > 0,
      `${path}.samplers`,
      'Faltam samplers.',
    )
    requireGltf(
      Array.isArray(channels) && channels.length > 0,
      `${path}.channels`,
      'Faltam canais.',
    )
    samplerCount += samplers.length
    channelCount += channels.length
    if (
      samplerCount > GLTF_INPUT_LIMITS.animationSamplers ||
      channelCount > GLTF_INPUT_LIMITS.animationChannels
    )
      throw new GltfInputError(
        'budget',
        'animations',
        'Há samplers ou canais demais neste arquivo.',
      )
    return { row, samplers, channels, path }
  })
  if (!plans.length) return []
  const values = planGltfAnimationValues(source)
  const animations = plans.map(({ row, samplers: rows, channels, path }): GltfAnimation => {
    const samplers = Array.from(rows, (input, i): GltfAnimationSampler => {
      const at = `${path}.samplers[${i}]`,
        row = gltfRecord(input, at),
        inputIndex = gltfInteger(row.input, `${at}.input`, 0, source.accessors.length - 1),
        output = gltfInteger(row.output, `${at}.output`, 0, source.accessors.length - 1),
        method = interpolation(row.interpolation, `${at}.interpolation`),
        times = values.accessor(inputIndex, 'input', `${at}.input`)
      values.accessor(output, 'output', `${at}.output`)
      requireGltf(
        method !== 'CUBICSPLINE' || times.count >= 2,
        `${at}.input`,
        'CUBICSPLINE precisa de pelo menos duas chaves.',
      )
      return { input: inputIndex, output, interpolation: method }
    })
    const seen = new Set<string>()
    return {
      name: gltfName(row.name, `${path}.name`),
      samplers,
      channels: Array.from(channels, (input, i) =>
        readGltfAnimationChannel(input, samplers, source, values, seen, `${path}.channels[${i}]`),
      ),
    }
  })
  values.read()
  return animations
}
