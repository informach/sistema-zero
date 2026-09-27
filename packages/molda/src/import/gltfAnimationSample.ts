import type { GltfAccessor } from './gltfAccessors'
import type { GltfAnimation } from './gltfAnimationTypes'
import { GltfInputError, gltfInteger, requireGltf } from './gltfInput'
import { gltfNumber } from './gltfMetadata'

function normalize(result: Float64Array, path: string) {
  const length = Math.hypot(result[0]!, result[1]!, result[2]!, result[3]!)
  requireGltf(
    length > 0 && Number.isFinite(length),
    path,
    'Esta curva produz uma rotação nula ou inválida neste instante.',
  )
  for (let i = 0; i < 4; i++) result[i] = result[i]! / length
}

/** Interpret quantized endpoints as orientations only between keys; never rewrite source keys. */
function slerp(
  data: Float64Array,
  a: number,
  b: number,
  t: number,
  result: Float64Array,
  path: string,
) {
  const lengthA = Math.hypot(data[a]!, data[a + 1]!, data[a + 2]!, data[a + 3]!),
    lengthB = Math.hypot(data[b]!, data[b + 1]!, data[b + 2]!, data[b + 3]!)
  let dot = 0
  for (let i = 0; i < 4; i++) dot += (data[a + i]! / lengthA) * (data[b + i]! / lengthB)
  const direction = dot < 0 ? -1 : 1
  dot = Math.min(1, Math.abs(dot))
  const angle = Math.acos(dot),
    sine = Math.sin(angle),
    coincident = 1 - dot * dot <= Number.EPSILON,
    left = coincident ? 1 - t : Math.sin((1 - t) * angle) / sine,
    right = coincident ? t : Math.sin(t * angle) / sine
  for (let i = 0; i < 4; i++)
    result[i] = left * (data[a + i]! / lengthA) + right * direction * (data[b + i]! / lengthB)
  normalize(result, path)
}

/**
 * Sources belong to a validated immutable import. This captures numeric references once,
 * not a copy per channel. Sampling returns owned values, never a source subarray.
 */
export function prepareGltfAnimationChannel(
  animation: GltfAnimation,
  channelIndex: number,
  accessors: readonly GltfAccessor[],
  rootPath = 'animation',
) {
  gltfInteger(channelIndex, `${rootPath}.channel`, 0, animation.channels.length - 1)
  const channel = animation.channels[channelIndex]!,
    path = `${rootPath}.channels[${channelIndex}]`
  if (channel.target.kind !== 'node')
    throw new GltfInputError(
      'unsupported',
      `${path}.target`,
      'Este alvo precisa de suporte a uma extensão ou de um nó explícito.',
    )
  const sampler = animation.samplers[channel.sampler]!,
    input = accessors[sampler.input]!,
    output = accessors[sampler.output]!,
    times = input.values,
    data = output.values,
    method = sampler.interpolation,
    cubic = method === 'CUBICSPLINE',
    property = channel.target.path,
    width =
      property === 'weights'
        ? output.count / input.count / (cubic ? 3 : 1)
        : property === 'rotation'
          ? 4
          : 3,
    stride = width * (cubic ? 3 : 1),
    valueOffset = cubic ? width : 0
  return {
    target: { ...channel.target },
    keyCount: input.count,
    start: times[0]!,
    end: times[input.count - 1]!,
    sample(seconds: number): Float64Array {
      const time = gltfNumber(seconds, `${path}.time`)
      let low = 0,
        high = times.length
      while (low < high) {
        const middle = (low + high) >>> 1
        if (times[middle]! <= time) low = middle + 1
        else high = middle
      }
      const index = Math.max(0, low - 1),
        a = index * stride + valueOffset,
        next = index + 1
      // glTF requires the authored value as-is at exact keys and clamped endpoints.
      if (next === times.length || time <= times[index]! || method === 'STEP')
        return data.slice(a, a + width)
      const duration = times[next]! - times[index]!,
        t = (time - times[index]!) / duration,
        b = a + stride,
        result = new Float64Array(width)
      if (cubic) {
        const t2 = t * t,
          t3 = t2 * t,
          right = -2 * t3 + 3 * t2,
          left = 1 - right,
          tangentB = t3 - t2,
          tangentA = tangentB - t2 + t
        for (let i = 0; i < width; i++)
          result[i] =
            left * data[a + i]! +
            right * data[b + i]! +
            duration * (tangentA * data[a + width + i]! + tangentB * data[b - width + i]!)
        if (property === 'rotation') normalize(result, path)
      } else if (property === 'rotation') slerp(data, a, b, t, result, path)
      else
        for (let i = 0; i < width; i++)
          result[i] =
            data[a + i] === data[b + i] ? data[a + i]! : (1 - t) * data[a + i]! + t * data[b + i]!
      return result
    },
  }
}
