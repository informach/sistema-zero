// Guarda de vocabulário (decisão de 2026-08-14): "hiperfoco"/"foco intenso"/
// "interesse intenso"/"concentração fora do comum" são vocabulário da HISTÓRIA do
// André (camada de autoridade), nunca do filtro ou do argumento. Varre o fonte de
// src/ inteiro e só aceita os termos dentro dos blocos
// <!-- historia-andre:inicio/fim --> (hoje, nos dois bodies de oferta). Casa no
// CONTEÚDO do arquivo, não linha a linha, e tolera markup/palavras no meio: o
// formatter quebra a prosa a ~100 colunas e um <b> dentro da frase evadiria um
// regex ingênuo.

import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(import.meta.dir, '..', '..', 'src')

// Até 2 palavras/tags entre os termos ("foco <b>intenso</b>", "foco muito intenso",
// plural, hífen no hiperfoco, ordem invertida). O guarda é tripwire: preferimos um
// falso positivo (humano olha) a uma evasão silenciosa.
const PADRAO = new RegExp(
  [
    'hiper[\\s\\u00ad-]*foc',
    'focos?\\W+(?:\\w+\\W+){0,2}intens',
    'intens\\w*\\W+(?:\\w+\\W+){0,2}focos?',
    'interesses?\\W+(?:\\w+\\W+){0,2}intens',
    'concentra\\S*\\W+fora\\W+do\\W+comum',
  ].join('|'),
  'i',
)

const ABRE = '<!-- historia-andre:inicio -->'
const FECHA = '<!-- historia-andre:fim -->'

// A descoberta de blocos é automática (qualquer arquivo com marcadores vale), mas
// estes dois precisam seguir marcados — a história sumir em silêncio também é
// regressão.
const HISTORIA_OBRIGATORIA = [
  join(SRC, 'components', 'funnel', 'oferta', 'DesafioOfertaBody.astro'),
  join(SRC, 'components', 'funnel', 'oferta', 'ComunidadeOfertaBody.astro'),
]

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

/** Blocos entre marcadores; marcador desbalanceado/solto falha alto. */
function blocosDaHistoria(fonte: string, arquivo: string): string[] {
  const blocos: string[] = []
  let resto = fonte
  for (;;) {
    const a = resto.indexOf(ABRE)
    const f = resto.indexOf(FECHA)
    if (a === -1 && f === -1) return blocos
    if (a === -1 || (f !== -1 && f < a)) throw new Error(`marcador desbalanceado em ${arquivo}`)
    if (f === -1) throw new Error(`marcador sem fecho em ${arquivo}`)
    blocos.push(resto.slice(a + ABRE.length, f))
    resto = resto.slice(f + FECHA.length)
  }
}

/** Remove os trechos entre marcadores (validando o balanceamento). */
function foraDaHistoria(fonte: string, arquivo: string): string {
  const partes: string[] = []
  let resto = fonte
  for (;;) {
    const a = resto.indexOf(ABRE)
    const f = resto.indexOf(FECHA)
    if (a === -1 && f === -1) {
      partes.push(resto)
      return partes.join('\n')
    }
    if (a === -1 || (f !== -1 && f < a)) throw new Error(`marcador desbalanceado em ${arquivo}`)
    if (f === -1) throw new Error(`marcador sem fecho em ${arquivo}`)
    partes.push(resto.slice(0, a))
    resto = resto.slice(f + FECHA.length)
  }
}

describe('copy do funil: termo clínico só na história do André', () => {
  test('nenhum termo banido fora dos marcadores em src/', () => {
    const arquivos = listar(SRC)
    // Guarda do guarda: um scanner que não acha arquivo aprovaria tudo.
    expect(arquivos.length).toBeGreaterThan(80)

    const achados: string[] = []
    for (const arquivo of arquivos) {
      const fonte = readFileSync(arquivo, 'utf8')
      const marcado = fonte.includes(ABRE) || fonte.includes(FECHA)
      const visivel = marcado ? foraDaHistoria(fonte, arquivo) : fonte
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

  test('a história segue marcada nos dois bodies e todo bloco marcado é a do André', () => {
    const arquivos = listar(SRC)
    const marcados = arquivos.filter((a) => readFileSync(a, 'utf8').includes(ABRE))
    for (const obrigatorio of HISTORIA_OBRIGATORIA) expect(marcados).toContain(obrigatorio)
    for (const arquivo of marcados) {
      const blocos = blocosDaHistoria(readFileSync(arquivo, 'utf8'), arquivo)
      expect(blocos.length).toBeGreaterThan(0)
      for (const bloco of blocos) {
        // Marcador movido/esvaziado (ou englobando o arquivo) não passa em silêncio.
        expect(bloco).toMatch(/hiperfoco/i)
        expect(bloco).toMatch(/André/)
        expect(bloco.length).toBeLessThan(2_000)
      }
    }
  })

  test('o detector pega as formas relevantes e ignora o resto', () => {
    // pega
    expect(PADRAO.test('o hiperfoco dele')).toBe(true)
    expect(PADRAO.test('Hiperfocado em jogos')).toBe(true)
    expect(PADRAO.test('o hiper-foco dele')).toBe(true)
    expect(PADRAO.test('um foco\n              intenso')).toBe(true)
    expect(PADRAO.test('esse <b>foco</b> intenso')).toBe(true)
    expect(PADRAO.test('um foco muito intenso')).toBe(true)
    expect(PADRAO.test('focos intensos')).toBe(true)
    expect(PADRAO.test('o intenso foco dele')).toBe(true)
    expect(PADRAO.test('interesse intenso')).toBe(true)
    expect(PADRAO.test('um interesse tão intenso')).toBe(true)
    expect(PADRAO.test('concentração fora do comum')).toBe(true)
    // ignora
    expect(PADRAO.test('foco forte em jogos')).toBe(false)
    expect(PADRAO.test('manter o foco em outras coisas')).toBe(false)
    expect(PADRAO.test('esse interesse é o combustível')).toBe(false)
    expect(PADRAO.test('uma concentração de horas')).toBe(false)
  })
})
