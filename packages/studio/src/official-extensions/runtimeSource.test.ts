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

describe('compactOfficialRuntimeSource com stripBlockComments (lote 4, 21/11/2026)', () => {
  const strip = (lines: string[]) =>
    compactOfficialRuntimeSource(lines.join('\n'), { stripBlockComments: true }).split('\n')

  it('tira o comentário de bloco que começa a linha, de uma ou de várias linhas', () => {
    expect(
      strip(['/**', ' * explica', ' */', 'var a = 1;', '  /* curto */', 'var b = 2;']),
    ).toEqual(['var a = 1;', 'var b = 2;'])
  })

  it('o código depois do fim do comentário, na mesma linha, fica', () => {
    expect(strip(['/* um', '   dois */ var a = 1;', '/* três */ var b = 2;'])).toEqual([
      '  var a = 1;',
      '  var b = 2;',
    ])
  })

  it('não mexe no comentário no meio da linha nem num "/*" dentro de uma string', () => {
    expect(strip(['f(/* x */ 1);', "var t = 'a /* b */ c';"])).toEqual([
      'f(/* x */ 1);',
      "var t = 'a /* b */ c';",
    ])
  })

  it('um "/*" aberto no meio do código deixa a função cautelosa até o próximo "*/"', () => {
    // `'image/*'` parece abrir um comentário; dali em diante nada sai até aparecer um `*/`.
    expect(
      strip(["var aceita = 'image/*';", '/* fica */', 'var a = 1;', '/* sai */', 'var b = 2;']),
    ).toEqual(["var aceita = 'image/*';", '/* fica */', 'var a = 1;', 'var b = 2;'])
  })

  it('recusa linha com barra de continuação e comentário sem fim', () => {
    expect(() => strip(["var s = 'a\\", "b';"])).toThrow('barra de continuação')
    expect(() => strip(['/* sem fim', 'var a = 1;'])).toThrow('sem fim')
  })
})

// Revisão do lote 4 (21/11/2026): os dois padrões que a primeira versão errava. Nenhum existe nas
// fontes de hoje; os testes provam que, se aparecerem, o programa continua o mesmo.
describe('stripBlockComments: os casos da revisão do lote 4', () => {
  const strip = (lines: string[]) =>
    compactOfficialRuntimeSource(lines.join('\n'), { stripBlockComments: true }).split('\n')

  it('o modo cauteloso que termina numa linha que reabre um comentário continua cauteloso', () => {
    const source = ['a(); /* c1', '*/ b(); /* c2', '/* x', '*/ c();']
    expect(strip(source)).toEqual(source)
  })

  it('uma abertura "/*/" não conta o próprio fechamento sobreposto', () => {
    const source = ['a(); /*/ abre', '/* y */ b();']
    expect(strip(source)).toEqual(source)
  })
})
