/** Contrato durável do documento Studio; revisão de upload é independente. */
export const STUDIO_PROJECT_FORMAT_VERSION = 2

/** Contêiner de transporte dos recursos separados, independente do formato do programa. */
export const STUDIO_PARTS_FORMAT = 'sz-studio-parts'
export const STUDIO_PARTS_VERSION = 1

/** Public link stored in document metadata; reading it needs no runtime/publication client. */
export const isStudioPublicationId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)
