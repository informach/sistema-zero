import type { GltfBufferView } from './gltfBufferViews'
import { gltfInteger, requireGltf } from './gltfInput'

export type GltfComponentType = 5120 | 5121 | 5122 | 5123 | 5125 | 5126
export type GltfAccessorType = 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT2' | 'MAT3' | 'MAT4'

export interface GltfComponent {
  type: GltfComponentType
  bytes: number
  min: number
  max: number
  read: (view: DataView, offset: number) => number
}
const COMPONENTS: Record<GltfComponentType, GltfComponent> = {
  5120: { type: 5120, bytes: 1, min: -128, max: 127, read: (view, offset) => view.getInt8(offset) },
  5121: { type: 5121, bytes: 1, min: 0, max: 255, read: (view, offset) => view.getUint8(offset) },
  5122: {
    type: 5122,
    bytes: 2,
    min: -32768,
    max: 32767,
    read: (view, offset) => view.getInt16(offset, true),
  },
  5123: {
    type: 5123,
    bytes: 2,
    min: 0,
    max: 65535,
    read: (view, offset) => view.getUint16(offset, true),
  },
  5125: {
    type: 5125,
    bytes: 4,
    min: 0,
    max: 4294967295,
    read: (view, offset) => view.getUint32(offset, true),
  },
  5126: {
    type: 5126,
    bytes: 4,
    min: -Infinity,
    max: Infinity,
    read: (view, offset) => view.getFloat32(offset, true),
  },
}
const SHAPES: Record<GltfAccessorType, readonly [columns: number, rows: number]> = {
  SCALAR: [1, 1],
  VEC2: [1, 2],
  VEC3: [1, 3],
  VEC4: [1, 4],
  MAT2: [2, 2],
  MAT3: [3, 3],
  MAT4: [4, 4],
}

export function gltfComponent(value: unknown, path: string): GltfComponent {
  requireGltf(
    typeof value === 'number' && Object.hasOwn(COMPONENTS, value),
    path,
    'O tipo numérico deste accessor não é válido.',
  )
  return COMPONENTS[value as GltfComponentType]
}
export interface GltfElementLayout {
  type: GltfAccessorType
  component: GltfComponent
  offsets: number[]
  stride: number
  lastBytes: number
  alignment: number
}

/** Matrix columns are aligned independently; final column padding may be omitted. */
export function gltfElementLayout(
  componentType: unknown,
  type: unknown,
  path: string,
): GltfElementLayout {
  const component = gltfComponent(componentType, `${path}.componentType`)
  requireGltf(
    typeof type === 'string' && Object.hasOwn(SHAPES, type),
    `${path}.type`,
    'A forma deste accessor não é válida.',
  )
  const shape = type as GltfAccessorType
  const [columns, rows] = SHAPES[shape]
  const columnBytes = rows * component.bytes
  const columnStride = columns > 1 ? Math.ceil(columnBytes / 4) * 4 : columnBytes
  const offsets = Array.from(
    { length: columns * rows },
    (_, i) => Math.floor(i / rows) * columnStride + (i % rows) * component.bytes,
  )
  return {
    type: shape,
    component,
    offsets,
    stride: columns * columnStride,
    lastBytes: (columns - 1) * columnStride + columnBytes,
    alignment: columns > 1 ? 4 : component.bytes,
  }
}

export interface GltfAccessorRange {
  bufferView: number
  byteOffset: number
  byteStride: number | null
  target: GltfBufferView['target']
  data: DataView
  stride: number
  start: number
}

export function gltfAccessorRange(
  viewIndex: unknown,
  offset: unknown,
  count: number,
  layout: GltfElementLayout,
  buffers: readonly Uint8Array[],
  views: readonly GltfBufferView[],
  path: string,
  sparse = false,
): GltfAccessorRange {
  const bufferView = gltfInteger(viewIndex, `${path}.bufferView`, 0, views.length - 1)
  const view = views[bufferView]!
  const byteOffset = gltfInteger(offset === undefined ? 0 : offset, `${path}.byteOffset`)
  const stride = view.byteStride ?? layout.stride
  requireGltf(
    !sparse || (view.byteStride === null && view.target === null),
    path,
    'Os dados sparse não podem usar passo ou destino de vértices.',
  )
  requireGltf(
    stride >= layout.stride && stride % layout.component.bytes === 0,
    path,
    'O passo não comporta um elemento completo deste accessor.',
  )
  const start = view.byteOffset + byteOffset
  requireGltf(
    // Matrix column alignment is relative to its bufferView. Absolute alignment
    // still follows component width (a byte matrix may use an odd bufferView offset).
    byteOffset % layout.alignment === 0 && start % layout.component.bytes === 0,
    path,
    'Os dados deste accessor estão desalinhados.',
  )
  const required = (count - 1) * stride + layout.lastBytes
  requireGltf(
    Number.isSafeInteger(required) && byteOffset <= view.byteLength - required,
    path,
    'Este accessor ultrapassa o intervalo do bufferView.',
  )
  const bytes = buffers[view.buffer]
  requireGltf(
    bytes && view.byteOffset <= bytes.byteLength - view.byteLength,
    path,
    'O bufferView não cabe nos bytes disponíveis.',
  )
  return {
    bufferView,
    byteOffset,
    byteStride: view.byteStride,
    target: view.target,
    data: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    stride,
    start,
  }
}
