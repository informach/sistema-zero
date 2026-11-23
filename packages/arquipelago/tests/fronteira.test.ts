import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import ts from 'typescript'

/**
 * A regra que mantém o jogo separado da plataforma (decisão da dona, 27/10/2026):
 * - o jogo só importa three, React Three Fiber, Rapier, React, zustand, o contrato e o
 *   avatar-quarto, o núcleo puro de documentos/comandos e as entradas restritas do
 *   runtime compilado de cenários (lote 8.5); nunca o Palco/editor da ferramenta;
 * - nenhum pacote da plataforma importa o jogo nem o serviço do jogo (a página carrega o jogo
 *   publicado por URL, nunca por import);
 * - o avatar-quarto, dividido com a plataforma, não importa nada da plataforma; e o contrato não
 *   importa o jogo, React nem three (A36, revisão de 31/10/2026).
 */
const PACOTES = join(import.meta.dir, '..', '..')
const PERMITIDOS_NO_JOGO = [
  'react',
  'react-dom',
  'three',
  'zustand',
  '@react-three/fiber',
  '@react-three/drei',
  '@react-three/rapier',
  '@sistemazero/arquipelago-contracts',
  '@sistemazero/avatar-quarto',
  '@sistemazero/molda-cenarios-core',
]
// Entradas exatas do consumidor compilado, não uma permissão para importar o motor/editor inteiro.
const RUNTIMES_DE_CENARIO = new Set([
  '@sistemazero/molda-cenarios-motor/leitura',
  '@sistemazero/molda-cenarios-motor/runtime',
  '@sistemazero/molda-cenarios-motor/instalar',
])

function arquivos(dir: string): string[] {
  let lista: string[] = []
  for (const nome of readdirSync(dir)) {
    if (nome === 'node_modules' || nome === 'dist' || nome.startsWith('.') || nome === 'tmp')
      continue
    const caminho = join(dir, nome)
    const info = statSync(caminho)
    if (info.isDirectory()) lista = lista.concat(arquivos(caminho))
    else if (/\.(ts|tsx|mjs|js|cjs)$/.test(nome)) lista.push(caminho)
  }
  return lista
}

/**
 * Tudo o que um arquivo importa (A36): `import ... from`, `export ... from`, `import()` e
 * `require()`, com aspas simples, duplas ou crase sem interpolação, pelo pré-processador do
 * TypeScript. A crase também é procurada à parte, como rede, e as repetições saem.
 */
export function importsDe(texto: string): string[] {
  const lidos = ts.preProcessFile(texto, true, true).importedFiles.map((f) => f.fileName)
  const crase = [...texto.matchAll(/\b(?:import|require)\s*\(\s*`([^`$]+)`\s*\)/g)].map(
    (m) => m[1] ?? '',
  )
  return [...new Set([...lidos, ...crase])]
}

/**
 * O que o arquivo carrega ao RODAR: `import type` e `export type … from` somem na compilação;
 * `import()` e `require()` contam. Um `import { type A } from` continua contando (sob
 * `verbatimModuleSyntax` ele sobra como `import {} from`, que carrega o módulo).
 */
export function importsQueRodam(texto: string): string[] {
  const fonte = ts.createSourceFile('modulo.ts', texto, ts.ScriptTarget.Latest, true)
  const rodam = new Set<string>()
  const visitar = (no: ts.Node) => {
    if (
      (ts.isImportDeclaration(no) || ts.isExportDeclaration(no)) &&
      no.moduleSpecifier &&
      ts.isStringLiteral(no.moduleSpecifier)
    ) {
      const soTipo = ts.isImportDeclaration(no) ? !!no.importClause?.isTypeOnly : no.isTypeOnly
      if (!soTipo) rodam.add(no.moduleSpecifier.text)
    }
    if (
      ts.isCallExpression(no) &&
      (no.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(no.expression) && no.expression.text === 'require'))
    ) {
      const alvo = no.arguments[0]
      if (alvo && (ts.isStringLiteral(alvo) || ts.isNoSubstitutionTemplateLiteral(alvo)))
        rodam.add(alvo.text)
    }
    ts.forEachChild(no, visitar)
  }
  visitar(fonte)
  return [...rodam]
}

const externo = (alvo: string) => !alvo.startsWith('.') && !alvo.startsWith('node:')
const casa = (alvo: string, nomes: readonly string[]) =>
  nomes.some((p) => alvo === p || alvo.startsWith(`${p}/`))

describe('fronteira do jogo', () => {
  test('o leitor de imports pega todas as formas', () => {
    const texto = [
      "import a from 'um'",
      'import b from "dois"',
      "import 'tres'",
      "export { c } from 'quatro'",
      "export * from 'cinco'",
      "const d = await import('seis')",
      'const e = require("sete")',
      'const f = await import(`oito`)',
      'const g = require(`nove`)',
      "import type { H } from 'dez'",
    ].join('\n')
    expect(importsDe(texto).sort()).toEqual(
      ['um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'].sort(),
    )
  })

  test('o jogo só importa o permitido', () => {
    const fora: string[] = []
    for (const f of arquivos(join(import.meta.dir, '..', 'src')))
      for (const alvo of importsDe(readFileSync(f, 'utf8')))
        if (externo(alvo) && !casa(alvo, PERMITIDOS_NO_JOGO) && !RUNTIMES_DE_CENARIO.has(alvo))
          fora.push(`${relative(PACOTES, f)} → ${alvo}`)
    expect(fora).toEqual([])
  })

  test('o núcleo de cenários só depende de módulos puros, zod e do contrato de criações', () => {
    const fora: string[] = []
    for (const f of arquivos(join(PACOTES, 'molda-cenarios-core', 'src')))
      for (const alvo of importsDe(readFileSync(f, 'utf8')))
        if (!alvo.startsWith('.') && alvo !== 'zod' && alvo !== '@sistemazero/core/creations')
          fora.push(`${relative(PACOTES, f)} → ${alvo}`)
    // The shared canonical hash is already a declared core dependency. Its barrel
    // must remain pure too; this does not admit the platform or arbitrary core paths.
    // O que vale é o que o BARRIL carrega ao rodar, seguindo os imports relativos: os
    // subcaminhos próprios da pasta (`./creations/pinta-causal` e outros, com zod) não entram
    // no jogo, e um `export type` do barril some na compilação.
    const pendentes = [join(PACOTES, 'core', 'src', 'creations', 'index.ts')]
    const vistos = new Set<string>()
    while (pendentes.length) {
      const f = pendentes.pop()!
      if (vistos.has(f)) continue
      vistos.add(f)
      for (const alvo of importsQueRodam(readFileSync(f, 'utf8'))) {
        if (!alvo.startsWith('.')) {
          fora.push(`${relative(PACOTES, f)} → ${alvo}`)
          continue
        }
        const base = join(dirname(f), alvo)
        const achado = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find(
          (c) => existsSync(c) && statSync(c).isFile(),
        )
        if (achado) pendentes.push(achado)
        else fora.push(`${relative(PACOTES, f)} → ${alvo} (arquivo não achado)`)
      }
    }
    expect(vistos.size).toBeGreaterThan(5)
    expect(fora).toEqual([])
  })

  test('o leitor do que roda ignora só o import de tipo', () => {
    const texto = [
      "import type { A } from 'tipo-a'",
      "export type { B } from 'tipo-b'",
      "import { type C, d } from 'misto'",
      "import { type E } from 'so-tipo-inline'",
      "export { f } from 'reexporta'",
      "const g = await import('dinamico')",
      'const h = require(`crase`)',
    ].join('\n')
    expect(importsQueRodam(texto).sort()).toEqual(
      ['misto', 'so-tipo-inline', 'reexporta', 'dinamico', 'crase'].sort(),
    )
  })

  test('o avatar-quarto, dividido com a plataforma, não importa nada da plataforma', () => {
    const PLATAFORMA = [
      '@sistemazero/ui',
      '@sistemazero/member-shell',
      '@sistemazero/community',
      '@sistemazero/community-kids',
      '@sistemazero/members',
      '@sistemazero/arquipelago',
      'next',
    ]
    const fora: string[] = []
    for (const f of arquivos(join(PACOTES, 'avatar-quarto', 'src')))
      for (const alvo of importsDe(readFileSync(f, 'utf8')))
        if (externo(alvo) && casa(alvo, PLATAFORMA)) fora.push(`${relative(PACOTES, f)} → ${alvo}`)
    expect(fora).toEqual([])
  })

  test('o contrato não importa o jogo, React nem three', () => {
    const PROIBIDOS = [
      '@sistemazero/arquipelago',
      '@sistemazero/arquipelago-api',
      'react',
      'react-dom',
      'three',
      'zustand',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/rapier',
    ]
    const fora: string[] = []
    for (const f of arquivos(join(PACOTES, 'arquipelago-contracts', 'src')))
      for (const alvo of importsDe(readFileSync(f, 'utf8')))
        if (externo(alvo) && casa(alvo, PROIBIDOS)) fora.push(`${relative(PACOTES, f)} → ${alvo}`)
    expect(fora).toEqual([])
  })

  test('o Admin do jogo não importa o jogo, o serviço nem o Admin (lacunas, 01/11/2026)', () => {
    const PROIBIDOS = [
      '@sistemazero/arquipelago',
      '@sistemazero/arquipelago-api',
      '@sistemazero/admin',
      'next',
    ]
    const fora: string[] = []
    // `@/` é o atalho do Admin: o pacote recebe as peças dele por `PecasDoAdmin`.
    for (const f of arquivos(join(PACOTES, 'arquipelago-admin', 'src')))
      for (const alvo of importsDe(readFileSync(f, 'utf8')))
        if (alvo.startsWith('@/') || (externo(alvo) && casa(alvo, PROIBIDOS)))
          fora.push(`${relative(PACOTES, f)} → ${alvo}`)
    expect(fora).toEqual([])
  })

  test('nenhum pacote da plataforma importa o jogo ou o serviço do jogo', () => {
    const jogo = new Set(['arquipelago', 'arquipelago-api'])
    const proibido = /^@sistemazero\/arquipelago(-api)?(\/|$)/
    const fora: string[] = []
    for (const pacote of readdirSync(PACOTES)) {
      if (jogo.has(pacote)) continue
      const raiz = join(PACOTES, pacote)
      try {
        const pkg = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'))
        for (const campo of ['dependencies', 'devDependencies', 'peerDependencies']) {
          for (const dep of Object.keys(pkg[campo] ?? {}))
            if (proibido.test(dep)) fora.push(`${pacote}/package.json → ${dep}`)
        }
      } catch {
        continue
      }
      // Busca barata primeiro (texto), o leitor só nos arquivos que citam o nome.
      for (const f of new Bun.Glob('src/**/*.{ts,tsx,mjs,js,cjs}').scanSync({
        cwd: raiz,
        absolute: true,
      })) {
        if (f.includes('/node_modules/')) continue
        const texto = readFileSync(f, 'utf8')
        if (!texto.includes('@sistemazero/arquipelago')) continue
        for (const alvo of importsDe(texto))
          if (proibido.test(alvo)) fora.push(`${relative(PACOTES, f)} → ${alvo}`)
      }
    }
    expect(fora).toEqual([])
  }, 60_000)
})
