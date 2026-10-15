export interface ProModelMetadata {
  format: 'glb2'
  upAxis: 'Y'
  unit: 'meter'
  clips: Array<{ index: number; name: string; durationSeconds?: number }>
  /** Accessor-local declarations, not animated/world-space bounds. Runtime measures with Box3. */
  geometryBounds: Array<{ mesh: number; primitive: number; min: number[]; max: number[] }>
  skins: number
  nodes: number
  requiredExtensions: string[]
}

type Row = Record<string, unknown>
function object(value: unknown): Row | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Row)
    : undefined
}
function list(value: unknown, max = 10_000): unknown[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > max) throw new Error('Metadata limit')
  return value
}
function index(value: unknown, limit: number): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value < limit
    ? value
    : undefined
}
function vector(value: unknown): number[] | undefined {
  return Array.isArray(value) &&
    value.length === 3 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e9)
    ? [...value]
    : undefined
}

/** Bounded, CPU-only inspection. No renderer, texture decoding, requests or executable metadata. */
export function readProModelMetadata(bytes: Uint8Array): ProModelMetadata | undefined {
  try {
    if (bytes.length < 20) return undefined
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    if (
      view.getUint32(0, true) !== 0x46546c67 ||
      view.getUint32(4, true) !== 2 ||
      view.getUint32(8, true) !== bytes.length ||
      view.getUint32(16, true) !== 0x4e4f534a
    )
      return undefined
    const jsonLength = view.getUint32(12, true)
    if (jsonLength % 4 || jsonLength > 1_000_000 || jsonLength + 20 > bytes.length) return undefined
    const gltf = object(
      JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(20, 20 + jsonLength)),
      ),
    )
    if (!gltf || object(gltf.asset)?.version !== '2.0') return undefined
    let binary: DataView | undefined
    const chunk = 20 + jsonLength
    if (chunk < bytes.length) {
      if (chunk + 8 > bytes.length) return undefined
      const length = view.getUint32(chunk, true)
      if (
        length % 4 ||
        chunk + 8 + length !== bytes.length ||
        view.getUint32(chunk + 4, true) !== 0x004e4942
      )
        return undefined
      binary = new DataView(bytes.buffer, bytes.byteOffset + chunk + 8, length)
    }
    const accessors = list(gltf.accessors),
      views = list(gltf.bufferViews)
    let remainingSamples = 100_000
    const duration = (accessorIndex: unknown): number | undefined => {
      const i = index(accessorIndex, accessors.length)
      const accessor = i === undefined ? undefined : object(accessors[i])
      if (
        !binary ||
        !accessor ||
        accessor.sparse ||
        accessor.type !== 'SCALAR' ||
        accessor.componentType !== 5126
      )
        return undefined
      const v = index(accessor.bufferView, views.length)
      const buffer = v === undefined ? undefined : object(views[v])
      const count = index(accessor.count, remainingSamples + 1)
      if (buffer?.buffer !== 0 || !count) return undefined
      const start = Number(buffer.byteOffset ?? 0),
        offset = Number(accessor.byteOffset ?? 0),
        stride = Number(buffer.byteStride ?? 4),
        length = Number(buffer.byteLength)
      if (
        ![start, offset, stride, length].every((n) => Number.isSafeInteger(n) && n >= 0) ||
        stride < 4 ||
        stride > 252 ||
        stride % 4 ||
        start + length > binary.byteLength ||
        offset + (count - 1) * stride + 4 > length
      )
        return undefined
      remainingSamples -= count
      let max = 0,
        previous = -1
      for (let n = 0; n < count; n++) {
        const time = binary.getFloat32(start + offset + n * stride, true)
        if (!Number.isFinite(time) || time < previous || time < 0 || time > 86400) return undefined
        previous = time
        max = Math.max(max, time)
      }
      return max
    }
    const clips = list(gltf.animations, 64).map((value, i) => {
      const animation = object(value)
      if (!animation) throw new Error('Invalid animation')
      const samplers = list(animation.samplers, 256)
      const referenced = new Set(
        list(animation.channels, 512).map((channel) =>
          index(object(channel)?.sampler, samplers.length),
        ),
      )
      const times = [...referenced].map((sampler) =>
        sampler === undefined ? undefined : duration(object(samplers[sampler])?.input),
      )
      return {
        index: i,
        name:
          typeof animation.name === 'string' && animation.name
            ? animation.name.slice(0, 128)
            : `animation_${i}`,
        ...(times.length && times.every((time): time is number => time !== undefined)
          ? { durationSeconds: Math.max(...times) }
          : {}),
      }
    })
    const geometryBounds: ProModelMetadata['geometryBounds'] = []
    for (const [mesh, value] of list(gltf.meshes, 256).entries()) {
      for (const [primitive, part] of list(object(value)?.primitives, 256).entries()) {
        if (geometryBounds.length >= 256) break
        const position = index(object(object(part)?.attributes)?.POSITION, accessors.length)
        const accessor = position === undefined ? undefined : object(accessors[position])
        const min = vector(accessor?.min),
          max = vector(accessor?.max)
        if (min && max?.every((n, i) => n >= min[i]!))
          geometryBounds.push({ mesh, primitive, min, max })
      }
    }
    return {
      format: 'glb2',
      upAxis: 'Y',
      unit: 'meter',
      clips,
      geometryBounds,
      nodes: list(gltf.nodes).length,
      skins: list(gltf.skins, 256).length,
      requiredExtensions: list(gltf.extensionsRequired, 64).filter(
        (value): value is string => typeof value === 'string' && value.length <= 128,
      ),
    }
  } catch {
    return undefined
  }
}
