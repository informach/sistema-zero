/** Contrato durável do documento Studio; revisão de upload é independente. */
export const STUDIO_PROJECT_FORMAT_VERSION = 2
/** Reader rollout precedes changing the default writer for existing JavaScript projects. */
export const STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION = 3

/** Contêiner de transporte dos recursos separados, independente do formato do programa. */
export const STUDIO_PARTS_FORMAT = 'sz-studio-parts'
export const STUDIO_PARTS_VERSION = 1

/** Shared with the existing builder/usage persistence columns (varchar 128). */
export const STUDIO_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/
/** Conversation/read boundaries also preserve IDs accepted by legacy JavaScript clients.
 * New documents and Python authority subjects continue to use the strict pattern above. */
export const STUDIO_READABLE_PROJECT_ID_PATTERN = new RegExp(
  `(?:${STUDIO_PROJECT_ID_PATTERN.source})|(?:^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$)`,
)
export const isStudioProjectId = (value: unknown): value is string =>
  typeof value === 'string' && STUDIO_PROJECT_ID_PATTERN.test(value)

export const isStudioDocumentTemplateId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value)

/** Public link stored in document metadata; reading it needs no runtime/publication client. */
export const isStudioPublicationId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)
