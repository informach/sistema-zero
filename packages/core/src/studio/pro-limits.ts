/** Data-only budgets shared by documents and both preview engines. No runtime or AI dependencies. */
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

export const PRO_STORAGE_LIMITS = {
  maxKeys: 500,
  maxKeyChars: 256,
  maxValueChars: 100_000,
  maxTotalChars: 1_000_000,
  maxPending: 32,
} as const
