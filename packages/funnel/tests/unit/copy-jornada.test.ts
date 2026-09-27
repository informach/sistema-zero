// Guarda de vocabulário (decisão de 2026-09-22): a **Carreira do Criador** virou
// **Jornada do Criador**. A palavra "carreira" não volta ao funil — nem no nome do
// conceito, nem em frase corrida ("ao longo da carreira", "o posto da carreira").
//
// ⚠️ UMA exceção, e ela é o motivo de a regra existir com allowlist em vez de um
// `not.toContain` cru: `src/content/legal-kids.ts` promete que o produto "não
// promete renda, emprego ou CARREIRA para a criança". Ali a palavra está no sentido
// adulto/profissional, que é exatamente o que a cláusula nega — trocá-la por
// "jornada" faria o texto jurídico negar o próprio produto.
//
// Casa no CONTEÚDO do arquivo (não linha a linha) porque o formatter quebra a prosa
// a ~100 colunas e um <b> no meio da frase evadiria um regex ingênuo.

import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC = join(import.meta.dir, '..', '..', 'src')

/** O texto jurídico usa "carreira" no sentido de profissão. É o único lugar. */
const ALLOWLIST = ['content/legal-kids.ts']

const EXTENSOES = ['.astro', '.ts', '.tsx', '.md', '.mdx']

function arquivos(dir: string): string[] {
  const saida: string[] = []
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) {
      saida.push(...arquivos(caminho))
      continue
    }
    if (EXTENSOES.some((ext) => nome.endsWith(ext))) saida.push(caminho)
  }
  return saida
}

describe('copy do funil — a palavra é jornada, não carreira', () => {
  const todos = arquivos(SRC)

  test('nenhum arquivo de copy diz "carreira" fora do texto jurídico', () => {
    const culpados = todos
      .map((caminho) => ({ caminho, rel: relative(SRC, caminho).replaceAll('\\', '/') }))
      .filter(({ rel }) => !ALLOWLIST.includes(rel))
      .filter(({ caminho }) => /carreira/i.test(readFileSync(caminho, 'utf8')))
      .map(({ rel }) => rel)

    expect(culpados).toEqual([])
  })

  // Anti-vácuo: sem isto, um walker quebrado (ou uma extensão esquecida) deixaria a
  // guarda passar para sempre lendo zero arquivo.
  test('a guarda está de fato lendo o funil', () => {
    expect(todos.length).toBeGreaterThan(50)
    const legal = todos.find(
      (caminho) => relative(SRC, caminho).replaceAll('\\', '/') === 'content/legal-kids.ts',
    )
    expect(legal).toBeTruthy()
    expect(/carreira/i.test(readFileSync(legal as string, 'utf8'))).toBe(true)
  })

  test('a oferta da Comunidade fala da Jornada do Criador', () => {
    const oferta = readFileSync(
      join(SRC, 'components/funnel/oferta/ComunidadeOfertaBody.astro'),
      'utf8',
    )
    expect(oferta).toContain('Jornada do Criador')
  })
})
