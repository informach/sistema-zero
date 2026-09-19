/** Nunca entregar o original quando um material exige marca d'água. */
export class WatermarkUnavailableError extends Error {
  readonly code = 'WATERMARK_UNAVAILABLE'

  constructor(cause?: unknown) {
    super('Não foi possível proteger este material. Tente novamente ou avise o suporte.', { cause })
    this.name = 'WatermarkUnavailableError'
  }
}
