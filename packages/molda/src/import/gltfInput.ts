import { LOCAL_FILE_PATH_LIMIT } from './localFilePath'
import { RASTER_INPUT_LIMITS } from './rasterInput'

/** Import budgets are product limits, not limits of the glTF format. */
export const GLTF_INPUT_LIMITS = {
  fileBytes: 32 * 1024 * 1024,
  /** Entire chosen bundle before native file reads/worker transport, including unused companions. */
  selectedFileBytes: 64 * 1024 * 1024,
  chunks: 1024,
  jsonDepth: 128,
  jsonStructure: 1_000_000,
  resources: 1024,
  bufferViews: 65536,
  accessors: 65536,
  accessorValues: 4_194_304,
  meshes: 4096,
  primitives: 65536,
  attributes: 64,
  morphTargets: 64,
  topologyIndices: 4_194_304,
  nodes: 65536,
  scenes: 1024,
  cameras: 1024,
  extensions: 1024,
  extensionUses: 65536,
  skins: 4096,
  skinJoints: 65536,
  skinWeightSlots: 4_194_304,
  animations: 1024,
  animationSamplers: 65536,
  animationChannels: 65536,
  animationValues: 4_194_304,
  sceneRoots: 65536,
  appearanceItems: 65536,
  imageChunks: RASTER_INPUT_LIMITS.imageChunks,
  jpegScans: RASTER_INPUT_LIMITS.jpegScans,
  jpegScanSamples: RASTER_INPUT_LIMITS.jpegScanSamples,
  jpegMemoryMiB: RASTER_INPUT_LIMITS.jpegMemoryMiB,
  pathLength: LOCAL_FILE_PATH_LIMIT,
} as const

export class GltfInputError extends Error {
  constructor(
    readonly reason: 'invalid' | 'unsupported' | 'budget',
    readonly path: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'GltfInputError'
  }
}

export function requireGltf(condition: unknown, path: string, message: string): asserts condition {
  if (!condition) throw new GltfInputError('invalid', path, message)
}

export function gltfRecord(value: unknown, path: string): Record<string, unknown> {
  requireGltf(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    path,
    'Esta parte do arquivo precisa ser um objeto JSON.',
  )
  return value as Record<string, unknown>
}

export function gltfInteger(
  value: unknown,
  path: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  requireGltf(
    typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max,
    path,
    'Este valor precisa ser um número inteiro dentro do intervalo permitido.',
  )
  return value
}

export function gltfList(value: unknown, path: string, max: number): unknown[] {
  if (value === undefined) return []
  requireGltf(
    Array.isArray(value) && value.length > 0,
    path,
    'Esta lista precisa ter pelo menos um item.',
  )
  if (value.length > max)
    throw new GltfInputError('budget', path, 'Esta lista ultrapassa o limite do Molda.')
  return Array.from(value)
}

export function checkGltfByteBudget(length: number, path: string): void {
  if (length > GLTF_INPUT_LIMITS.fileBytes)
    throw new GltfInputError(
      'budget',
      path,
      'Os recursos deste arquivo ultrapassam o limite de 32 MiB do Molda.',
    )
}
