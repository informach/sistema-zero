/**
 * Contrato de recursos do compilador Pro remoto. Fica no core para que editor,
 * BFF e Worker não aceitem projetos de tamanhos diferentes.
 */
export const STUDIO_PRO_BUILD_LIMITS = {
  maxFiles: 80,
  maxFileChars: 256_000,
  maxTotalChars: 1_500_000,
  maxRequestBytes: 2_000_000,
  // A chamada navegador → BFF contém ids da aula e nós da árvore; o Worker
  // recebe o payload canônico menor ({ executionId, templateId, files }).
  maxBffRequestBytes: 2_032_768,
  maxOutputChars: 2_500_000,
} as const

export interface StudioProBuildLimits {
  maxFiles: number
  maxFileChars: number
  maxTotalChars: number
  maxRequestBytes: number
}

export type StudioProBuildFileLimitError =
  | 'EMPTY'
  | 'TOO_MANY_FILES'
  | 'FILE_TOO_LARGE'
  | 'TOTAL_TOO_LARGE'
  | 'REQUEST_TOO_LARGE'

const MAX_EXECUTION_ID_FOR_SIZE_CHECK = 'x'.repeat(96)
const MAX_TEMPLATE_ID_FOR_SIZE_CHECK = 'three-ts'

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

/** Valida os tetos do snapshot que pode seguir para o compilador remoto. */
export function studioProBuildFileLimitError(
  files: Readonly<Record<string, string>>,
  limits: Partial<StudioProBuildLimits> = STUDIO_PRO_BUILD_LIMITS,
): StudioProBuildFileLimitError | null {
  const resolved = { ...STUDIO_PRO_BUILD_LIMITS, ...limits }
  const entries = Object.entries(files)
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
