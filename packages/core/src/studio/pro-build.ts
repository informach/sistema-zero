import { STUDIO_PRO_BUILD_LIMITS } from './pro-limits'
import { STUDIO_PRO_TEMPLATE_IDS } from './pro-templates'

/**
 * Contrato de recursos do compilador Pro remoto. Fica no core para que editor,
 * BFF e Worker não aceitem projetos de tamanhos diferentes.
 */
export { STUDIO_PRO_BUILD_LIMITS } from './pro-limits'

export interface StudioProBuildLimits {
  maxFiles: number
  maxFileChars: number
  maxTotalChars: number
  maxRequestBytes: number
}

/**
 * Arquivos que a plataforma conhece byte a byte: caminho → sha256 aceitos naquele caminho (hoje, as
 * cópias publicadas do motor 2D, `pro-engine-copies`).
 */
export type StudioProPlatformFiles = Readonly<Record<string, readonly string[]>>
/**
 * Os arquivos da plataforma conferidos num conjunto de arquivos: caminho → o texto exato cujo
 * sha256 bateu com um dos aceitos naquele caminho (`verifyStudioProPlatformFiles`). O orçamento só
 * deixa de fora o arquivo cujo texto é ESTE: qualquer outro texto no caminho é do autor.
 */
export type StudioProVerifiedPlatformFiles = ReadonlyMap<string, string>

export type StudioProBuildFileLimitError =
  | 'EMPTY'
  | 'TOO_MANY_FILES'
  | 'FILE_TOO_LARGE'
  | 'TOTAL_TOO_LARGE'
  | 'REQUEST_TOO_LARGE'

const MAX_EXECUTION_ID_FOR_SIZE_CHECK = 'x'.repeat(96)
const MAX_TEMPLATE_ID_FOR_SIZE_CHECK = STUDIO_PRO_TEMPLATE_IDS.reduce((longest, id) =>
  id.length > longest.length ? id : longest,
)

/** Bytes UTF-8 do exato envelope que o BFF envia ao Worker. */
export function studioProBuildRequestByteLength(files: Readonly<Record<string, string>>): number {
  return new TextEncoder().encode(
    JSON.stringify({
      executionId: MAX_EXECUTION_ID_FOR_SIZE_CHECK,
      templateId: MAX_TEMPLATE_ID_FOR_SIZE_CHECK,
      files,
    }),
  ).byteLength
}

/**
 * Valida os tetos do snapshot que pode seguir para o compilador remoto. Quantidade, teto por
 * arquivo e total são o orçamento do AUTOR: um arquivo da plataforma conferido (`platform`, o
 * mesmo texto) fica fora dele. O envelope é físico e conta todo arquivo, inclusive os da plataforma.
 */
export function studioProBuildFileLimitError(
  files: Readonly<Record<string, string>>,
  limits: Partial<StudioProBuildLimits> = STUDIO_PRO_BUILD_LIMITS,
  platform?: StudioProVerifiedPlatformFiles,
): StudioProBuildFileLimitError | null {
  const resolved = { ...STUDIO_PRO_BUILD_LIMITS, ...limits }
  const entries = Object.entries(files).filter(([path, content]) => platform?.get(path) !== content)
  if (entries.length === 0) return 'EMPTY'
  if (entries.length > resolved.maxFiles) return 'TOO_MANY_FILES'

  let totalChars = 0
  for (const [, content] of entries) {
    if (content.length > resolved.maxFileChars) return 'FILE_TOO_LARGE'
    totalChars += content.length
    if (totalChars > resolved.maxTotalChars) return 'TOTAL_TOO_LARGE'
  }
  if (studioProBuildRequestByteLength(files) > resolved.maxRequestBytes) return 'REQUEST_TOO_LARGE'
  return null
}
