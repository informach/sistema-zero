/** Product input limits, not limits of the Blockbench format or peak-memory estimates. */
export const BBMODEL_INPUT_LIMITS = {
  fileBytes: 32 * 1024 * 1024,
  jsonDepth: 128,
  jsonStructure: 1_000_000,
  formatNameChars: 4096,
  nodes: 65536,
  outlinerEntries: 65536,
  outlinerDepth: 128,
  identifierChars: 4096,
  /** Authored mesh vertices; cubes remain endpoint parameters until a later conversion. */
  geometryVertices: 262144,
  geometryFaces: 262144,
  /** Authored mesh face references/UV records; cube coordinates are bounded by six faces each. */
  geometryCorners: 1048576,
  geometryUvPoints: 1048576,
  /** Authored seam labels across every mesh, including omitted/unlisted nodes. */
  geometrySeams: 262144,
  faceCorners: 64,
  textures: 65536,
  textureGroups: 65536,
  textureLayers: 262144,
  animations: 1024,
  animationAnimators: 65536,
  animationKeys: 262144,
  /** Includes one implicit direct-value slot when a key omits data_points or stores []. */
  animationDataPoints: 524288,
  animationPointsPerKey: 1000,
  animationMarkers: 65536,
  animationMetadataChars: 4 * 1024 * 1024,
  animationKeyTextChars: 4 * 1024 * 1024,
  embeddedTextChars: 32 * 1024 * 1024,
  resources: 1024,
  selectedFileBytes: 64 * 1024 * 1024,
} as const

export class BbmodelInputError extends Error {
  constructor(
    readonly reason: 'invalid' | 'unsupported' | 'budget',
    readonly path: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'BbmodelInputError'
  }
}

export function requireBbmodel(
  condition: unknown,
  path: string,
  message: string,
): asserts condition {
  if (!condition) throw new BbmodelInputError('invalid', path, message)
}

export function bbmodelRecord(value: unknown, path: string): Record<string, unknown> {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    path,
    'Esta parte do arquivo precisa ser um objeto JSON.',
  )
  return value as Record<string, unknown>
}

export function bbmodelList(value: unknown, path: string, max: number): readonly unknown[] {
  if (value === undefined) return []
  requireBbmodel(Array.isArray(value), path, 'Esta parte do arquivo precisa ser uma lista.')
  if (value.length > max)
    throw new BbmodelInputError('budget', path, 'Esta lista ultrapassa o limite do Molda.')
  return value
}

export function bbmodelIdentifier(value: unknown, path: string): string {
  requireBbmodel(
    typeof value === 'string' && value.length > 0,
    path,
    'Este identificador precisa ser um texto não vazio.',
  )
  if (value.length > BBMODEL_INPUT_LIMITS.identifierChars)
    throw new BbmodelInputError(
      'budget',
      path,
      'Este identificador é longo demais para abrir no Molda.',
    )
  return value
}
