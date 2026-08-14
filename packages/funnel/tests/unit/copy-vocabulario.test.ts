// Guarda de vocabulário (decisão de 2026-08-14): "hiperfoco"/"foco intenso" são
// vocabulário da HISTÓRIA do André (camada de autoridade), nunca do filtro ou do
// argumento. Varre o fonte de src/ inteiro e só aceita os termos dentro dos blocos
// <!-- historia-andre:inicio/fim --> dos dois bodies de oferta. Casa no CONTEÚDO
// do arquivo, não linha a linha: o formatter quebra a prosa a ~100 colunas e
// "foco\n intenso" escaparia de um scan por linha.

import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(import.meta.dir, '..', '..', 'src')

const PADRAO = /hiperfoc|foco\s+intens/i

const ABRE = '<!-- historia-andre:inicio -->'
const FECHA = '<!-- historia-andre:fim -->'

const COM_HISTORIA = new Set([
  join(SRC, 'components', 'funnel', 'oferta', 'DesafioOfertaBody.astro'),
  join(SRC, 'components', 'funnel', 'oferta', 'ComunidadeOfertaBody.astro'),
])

function listar(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      listar(full, out)
      continue
    }
    if (/\.(astro|tsx?)$/.test(entry)) out.push(full)
  }
  return out
}

/** Remove os trechos entre marcadores; marcador desbalanceado falha alto. */
function foraDaHistoria(fonte: string, arquivo: string): string {
  const partes: string[] = []
  let resto = fonte
  for (;;) {
    const a = resto.indexOf(ABRE)
    const f = resto.indexOf(FECHA)
    if (a === -1 && f === -1) {
      partes.push(resto)
      break
    }
    if (a === -1 || (f !== -1 && f < a)) throw new Error(`marcador desbalanceado em ${arquivo}`)
    if (f === -1) throw new Error(`marcador sem fecho em ${arquivo}`)
    partes.push(resto.slice(0, a))
    resto = resto.slice(f + FECHA.length)
  }
  return partes.join('\n')
}

describe('copy do funil: termo clínico só na história do André', () => {
  test('nenhum hiperfoco/foco intenso fora dos marcadores em src/', () => {
    const arquivos = listar(SRC)
    // Guarda do guarda: um scanner que não acha arquivo aprovaria tudo.
    expect(arquivos.length).toBeGreaterThan(80)

    const achados: string[] = []
    for (const arquivo of arquivos) {
      const fonte = readFileSync(arquivo, 'utf8')
      const visivel = COM_HISTORIA.has(arquivo) ? foraDaHistoria(fonte, arquivo) : fonte
      for (const m of visivel.matchAll(new RegExp(PADRAO.source, 'gi'))) {
        const rel = arquivo.slice(SRC.length + 1)
        const i = m.index ?? 0
        const trecho = visivel
          .slice(Math.max(0, i - 35), i + 45)
          .replaceAll(/\s+/g, ' ')
          .trim()
        achados.push(`src/${rel} → "…${trecho}…"`)
      }
    }
    expect(achados).toEqual([])
  })

  test('os dois bodies têm a história marcada e ela segue sendo a do André', () => {
    for (const arquivo of COM_HISTORIA) {
      const fonte = readFileSync(arquivo, 'utf8')
      const a = fonte.indexOf(ABRE)
      const f = fonte.indexOf(FECHA)
      expect(a).toBeGreaterThan(-1)
      expect(f).toBeGreaterThan(a)
      const dentro = fonte.slice(a, f)
      // Marcador movido/esvaziado (ou englobando o arquivo) não passa em silêncio.
      expect(dentro).toMatch(/hiperfoco/i)
      expect(dentro).toMatch(/André/)
      expect(dentro.length).toBeLessThan(4_000)
    }
  })

  test('o detector pega as formas relevantes e ignora o resto', () => {
    expect(PADRAO.test('o hiperfoco dele')).toBe(true)
    expect(PADRAO.test('Hiperfocado em jogos')).toBe(true)
    expect(PADRAO.test('um foco\n              intenso')).toBe(true)
    expect(PADRAO.test('foco forte em jogos')).toBe(false)
    expect(PADRAO.test('interesse intenso')).toBe(false)
  })
})
