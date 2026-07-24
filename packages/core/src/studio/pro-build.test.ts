import { describe, expect, test } from 'bun:test'
import { STUDIO_PRO_BUILD_LIMITS, studioProBuildFileLimitError } from './pro-build'

describe('STUDIO_PRO_BUILD_LIMITS', () => {
  test('mantém o contrato de tamanho compartilhado pelo editor, BFF e runtime', () => {
    expect(STUDIO_PRO_BUILD_LIMITS).toEqual({
      maxFiles: 80,
      maxFileChars: 256_000,
      maxTotalChars: 1_500_000,
      maxRequestBytes: 2_000_000,
      maxBffRequestBytes: 2_032_768,
      maxOutputChars: 2_500_000,
    })
  })

  test('identifica a cota que o BFF deve recusar antes de acionar o Worker', () => {
    const tooMany: Record<string, string> = {}
    for (let index = 0; index < 81; index += 1) tooMany[`src/f${index}.ts`] = ''
    expect(studioProBuildFileLimitError(tooMany)).toBe('TOO_MANY_FILES')
    expect(studioProBuildFileLimitError({ 'index.html': 'x'.repeat(256_001) })).toBe(
      'FILE_TOO_LARGE',
    )
    expect(studioProBuildFileLimitError({ 'index.html': 'x'.repeat(1_500_001) })).toBe(
      'FILE_TOO_LARGE',
    )
  })

  test('não aceita fonte que cabe em caracteres mas estoura o JSON enviado ao runtime', () => {
    const files = Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => [
        index === 0 ? 'index.html' : `src/f${index}.ts`,
        '"'.repeat(250_000),
      ]),
    )
    expect(studioProBuildFileLimitError(files)).toBe('REQUEST_TOO_LARGE')
  })
})
