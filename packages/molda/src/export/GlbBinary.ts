import { requireScene } from '../scene/validation'
import { glbAlignedLength } from './glbContainer'

export const MAX_SCENE_GLB_BYTES = 32 * 1024 * 1024
type AccessorType = 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT4'
const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 } as const
interface GlbAccessor {
  bufferView: number
  componentType: 5126 | 5123
  type: AccessorType
  count: number
  min?: number[]
  max?: number[]
}

/** Export-scoped derived buffers only. No global cache or reference to authorial pixels. */
export class GlbBinary {
  readonly segments: Uint8Array[] = []
  readonly views: Array<{
    buffer: 0
    byteOffset: number
    byteLength: number
    target?: 34962 | 34963
  }> = []
  readonly accessors: GlbAccessor[] = []
  byteLength = 0

  addView(bytes: Uint8Array, target?: 34962 | 34963) {
    const length = glbAlignedLength(bytes.byteLength)
    requireScene(
      bytes.byteLength > 0 && this.byteLength + length <= MAX_SCENE_GLB_BYTES,
      'export.buffers',
      'Os dados do GLB ultrapassam o tamanho permitido.',
    )
    const index = this.views.length
    this.views.push({
      buffer: 0,
      byteOffset: this.byteLength,
      byteLength: bytes.byteLength,
      ...(target === undefined ? {} : { target }),
    })
    this.segments.push(bytes)
    this.byteLength += length
    return index
  }

  floats(data: Float32Array, type: AccessorType, bounds = false, target?: 34962) {
    const components = COMPONENTS[type]
    requireScene(
      data.length > 0 && data.length % components === 0 && data.every(Number.isFinite),
      'export.accessor',
      'Os valores não cabem na precisão do GLB.',
    )
    const min = Array<number>(components).fill(Infinity),
      max = Array<number>(components).fill(-Infinity)
    if (bounds)
      for (let i = 0; i < data.length; i++) {
        const component = i % components
        min[component] = Math.min(min[component]!, data[i]!)
        max[component] = Math.max(max[component]!, data[i]!)
      }
    const index = this.accessors.length
    this.accessors.push({
      bufferView: this.addView(
        new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
        target,
      ),
      componentType: 5126,
      type,
      count: data.length / components,
      ...(bounds ? { min, max } : {}),
    })
    return index
  }

  indices(data: Uint16Array) {
    return this.unsignedShorts(data, 'SCALAR', 34963)
  }

  joints(data: Uint16Array) {
    return this.unsignedShorts(data, 'VEC4', 34962)
  }

  private unsignedShorts(data: Uint16Array, type: 'SCALAR' | 'VEC4', target: 34962 | 34963) {
    requireScene(
      data.length > 0 && data.length % COMPONENTS[type] === 0,
      'export.accessor',
      'O grupo de índices do GLB está incompleto.',
    )
    const index = this.accessors.length
    this.accessors.push({
      bufferView: this.addView(
        new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
        target,
      ),
      componentType: 5123,
      type,
      count: data.length / COMPONENTS[type],
    })
    return index
  }
}
