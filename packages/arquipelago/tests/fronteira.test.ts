import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * A regra que mantém o jogo separado da plataforma (decisão da dona, 27/10/2026):
 * - o jogo só importa three, React Three Fiber, Rapier, React, zustand, o contrato e o
 *   avatar-quarto (avatar e quarto são os únicos pedaços divididos de propósito);
 * - nenhum pacote da plataforma importa o jogo nem o serviço do jogo (a página carrega o jogo
 *   publicado por URL, nunca por import).
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
    else if (/\.(ts|tsx|mjs|js)$/.test(nome)) lista.push(caminho)
  }
  return lista
}

function importsDe(texto: string): string[] {
  return [...texto.matchAll(/(?:from|import)\s*\(?\s*'([^']+)'/g)].map((m) => m[1] ?? '')
}

describe('fronteira do jogo', () => {
  test('o jogo só importa o permitido', () => {
    const fora: string[] = []
    for (const pasta of ['src']) {
      for (const f of arquivos(join(import.meta.dir, '..', pasta))) {
        for (const alvo of importsDe(readFileSync(f, 'utf8'))) {
          if (alvo.startsWith('.') || alvo.startsWith('node:')) continue
          if (!PERMITIDOS_NO_JOGO.some((p) => alvo === p || alvo.startsWith(`${p}/`))) {
            fora.push(`${relative(PACOTES, f)} → ${alvo}`)
          }
        }
      }
    }
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
      // Busca barata primeiro (texto), regex só nos arquivos que citam o nome.
      for (const f of new Bun.Glob('src/**/*.{ts,tsx,mjs,js}').scanSync({
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
