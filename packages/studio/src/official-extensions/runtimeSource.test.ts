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

describe('compactOfficialRuntimeSource com trimIndent', () => {
  it('tira a indentação sem mudar o texto das linhas', () => {
    const source = [
      'function f() {',
      '    var a = "  dentro  ";',
      '  // nota',
      '  return a;',
      '}',
    ].join('\n')
    expect(compactOfficialRuntimeSource(source, { trimIndent: true })).toBe(
      ['function f() {', 'var a = "  dentro  ";', 'return a;', '}'].join('\n'),
    )
  })

  it('recusa texto com crase (o conteúdo de um template literal mudaria)', () => {
    expect(() => compactOfficialRuntimeSource('var t = `\n  a`;', { trimIndent: true })).toThrow(
      'sem crase',
    )
  })
})

describe('runtimes 3D: o contexto da partida entra depois da compactação', () => {
  it('o texto do contexto chega INTEIRO (o build minificado escreve crase nele)', async () => {
    const { buildProjectRunContextRuntime } = await import('#extensions')
    const { gameThreeDRuntime } = await import('./game-3d/runtime')
    const { gameKit3DRuntime } = await import('./game-3d-advanced/runtime')
    const context = compactOfficialRuntimeSource(buildProjectRunContextRuntime())
    for (const runtime of [gameThreeDRuntime, gameKit3DRuntime]) {
      expect(runtime.startsWith(`import * as THREE from 'three';\n${context}\n`)).toBe(true)
    }
    // Antes da compactação com trimIndent, a indentação do contexto sumiria e o começo do
    // runtime não seria mais o texto do contexto: é isto que morde se a ordem for invertida.
    // (A crase do build minificado não existe no bun test; a ordem é o que se trava aqui.)
  })
})

describe('runtimes oficiais: fragmento entra por FUNÇÃO no marcador', () => {
  it('com texto substituto, "$&" vira o próprio marcador (o defeito que a função evita)', () => {
    const fragment = 'var fim = /x$/; var t = "$&";'
    expect('a /*M*/ b'.replace('/*M*/', fragment)).not.toContain(fragment)
    expect('a /*M*/ b'.replace('/*M*/', () => fragment)).toContain(fragment)
  })

  it('nenhum .replace de marcador usa texto como substituto', async () => {
    const offenders: string[] = []
    const marker =
      /\.replace\(\s*('[^']*__SZ_[^']*'|[A-Z][A-Z0-9_]*_MARKER)\s*,(?!\s*\(\w*\)\s*=>)/g
    for await (const file of new Bun.Glob('**/*.ts').scan({ cwd: import.meta.dir })) {
      if (file.includes('__tests__') || file.endsWith('.test.ts')) continue
      const source = await Bun.file(`${import.meta.dir}/${file}`).text()
      for (const match of source.matchAll(marker)) offenders.push(`${file}: ${match[1]}`)
    }
    expect(offenders).toEqual([])
  })
})
