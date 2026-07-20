import { describe, expect, it } from 'bun:test'
import { compactOfficialRuntimeSource } from './runtimeSource'

describe('compactOfficialRuntimeSource', () => {
  it('remove somente linhas vazias e comentários de linha completos', () => {
    const source = [
      "import value from 'module'",
      '',
      '  // comentário completo',
      "const url = 'https://example.com/a//b'",
      'const answer = 42 // comentário inline',
      "const marker = '// ainda é uma string'",
    ].join('\n')

    expect(compactOfficialRuntimeSource(source)).toBe(
      [
        "import value from 'module'",
        "const url = 'https://example.com/a//b'",
        'const answer = 42 // comentário inline',
        "const marker = '// ainda é uma string'",
      ].join('\n'),
    )
  })
})
