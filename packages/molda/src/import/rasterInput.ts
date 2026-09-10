/** Product work limits shared by pure PNG/JPEG decoders, independent of the container format. */
export const RASTER_INPUT_LIMITS = {
  fileBytes: 32 * 1024 * 1024,
  imageChunks: 65_536,
  jpegScans: 64,
  jpegScanSamples: 64 * 1024 * 1024,
  jpegMemoryMiB: 64,
} as const

export class RasterInputError extends Error {
  constructor(
    readonly reason: 'invalid' | 'unsupported' | 'budget',
    readonly path: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'RasterInputError'
  }
}
export function requireRaster(
  condition: unknown,
  path: string,
  message: string,
): asserts condition {
  if (!condition) throw new RasterInputError('invalid', path, message)
}
export function checkRasterByteBudget(length: number, path: string): void {
  if (length > RASTER_INPUT_LIMITS.fileBytes)
    throw new RasterInputError(
      'budget',
      path,
      'Os recursos deste arquivo ultrapassam o limite de 32 MiB do Molda.',
    )
}
export function rasterChoice<const T extends string | number>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): T {
  const found = allowed.find((candidate) => candidate === value)
  requireRaster(found !== undefined, path, 'Esta opção não é válida no formato da imagem.')
  return found
}
