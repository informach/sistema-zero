import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'

/**
 * A regra que mantém o jogo separado da plataforma (decisão da dona, 27/10/2026):
 * - o jogo só importa three, React Three Fiber, Rapier, React, zustand, o contrato e o
 *   avatar-quarto (avatar e quarto são os únicos pedaços divididos de propósito);
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
]

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
        if (externo(alvo) && !casa(alvo, PERMITIDOS_NO_JOGO))
          fora.push(`${relative(PACOTES, f)} → ${alvo}`)
    expect(fora).toEqual([])
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
    for (const f of arquivos(join(PACOTES, 'arquipelago-admin', 'src')))
      for (const alvo of importsDe(readFileSync(f, 'utf8')))
        // `@/` é o atalho do Admin: o pacote recebe as peças dele por `PecasDoAdmin`.
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
