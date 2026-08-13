/**
 * Traz as fontes da interface dos jogos do Google Fonts e as vendoriza.
 *
 * ⚠️ Por que existe: a Baloo 2 foi embutida À MÃO uma vez, e o cabeçalho dela é a
 * única memória de onde ela veio. Com cinco fontes isso vira ingovernável — e a
 * procedência (URL de origem + SHA-256 + licença) é justamente o que não pode se
 * perder num arquivo de 44 mil caracteres de base64.
 *
 * O que ele faz, por fonte:
 *   1. pede a CSS do Google (com um user-agent moderno, senão vem a versão TTF);
 *   2. pega o bloco `/* latin *​/` — é o subset que cobre o português, acentos
 *      inclusive, e é o mesmo recorte que a Baloo 2 já usava;
 *   3. baixa o woff2, calcula o SHA-256 e escreve o módulo em `gameUiFonts/`;
 *   4. baixa a licença OFL para `official-extensions/fonts/`.
 *
 * Uso: bun run gen:game-ui-fonts
 */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** UA moderno: sem ele o Google devolve `src: url(...ttf)`, que é 3x maior. */
const MODERN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

interface FonteAlvo {
  /** O id que a criança escolhe no bloco e que viaja na IR. */
  id: string
  /** O nome como o Google o conhece. */
  familia: string
  /** A pasta do repositório google/fonts que guarda a licença. */
  slug: string
  /** `?family=` da API CSS2. Fonte variável precisa da faixa de peso. */
  consulta: string
  /** Nome do arquivo TS e da constante. */
  arquivo: string
}

const FONTES: readonly FonteAlvo[] = [
  {
    id: 'baloo2',
    familia: 'Baloo 2',
    slug: 'baloo2',
    consulta: 'Baloo+2:wght@400..800',
    arquivo: 'baloo2',
  },
  {
    id: 'nunito',
    familia: 'Nunito',
    slug: 'nunito',
    consulta: 'Nunito:wght@400..800',
    arquivo: 'nunito',
  },
  {
    id: 'pressStart2P',
    familia: 'Press Start 2P',
    slug: 'pressstart2p',
    consulta: 'Press+Start+2P',
    arquivo: 'pressStart2P',
  },
  { id: 'bungee', familia: 'Bungee', slug: 'bungee', consulta: 'Bungee', arquivo: 'bungee' },
  {
    id: 'fredoka',
    familia: 'Fredoka',
    slug: 'fredoka',
    consulta: 'Fredoka:wght@400..600',
    arquivo: 'fredoka',
  },
]

const RAIZ = join(import.meta.dir, '..', 'src', 'official-extensions')
const DESTINO_DADOS = join(RAIZ, 'gameUiFonts')
const DESTINO_LICENCAS = join(RAIZ, 'fonts')

async function buscarTexto(url: string): Promise<string> {
  const resposta = await fetch(url, { headers: { 'User-Agent': MODERN_UA } })
  if (!resposta.ok) throw new Error(`${resposta.status} ao buscar ${url}`)
  return resposta.text()
}

/**
 * O bloco `latin` da CSS. É o ÚLTIMO da lista do Google e o que cobre o português.
 *
 * ⚠️ A busca é pelo comentário `/* latin *​/` e não por `unicode-range`, porque
 * `latin-ext` também casaria e é um subset diferente (e maior).
 */
function blocoLatino(css: string, familia: string): { url: string; unicodeRange: string } {
  const marcador = css.lastIndexOf('/* latin */')
  if (marcador < 0) throw new Error(`${familia}: a CSS não trouxe o bloco latin`)
  const bloco = css.slice(marcador)
  const url = bloco.match(/src:\s*url\((https:\/\/[^)]+\.woff2)\)/)?.[1]
  const unicodeRange = bloco.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim()
  if (!url || !unicodeRange) throw new Error(`${familia}: bloco latin incompleto`)
  return { url, unicodeRange }
}

/** A faixa de peso declarada pelo Google — fonte estática traz um número só. */
function faixaDePeso(css: string): string {
  const marcador = css.lastIndexOf('/* latin */')
  const bloco = css.slice(marcador)
  return bloco.match(/font-weight:\s*([^;]+);/)?.[1]?.trim() ?? '400'
}

/** Base64 em linhas de 120, no mesmo formato do arquivo escrito à mão em 07/2026. */
function emPedacos(base64: string): string {
  const linhas: string[] = []
  for (let inicio = 0; inicio < base64.length; inicio += 120) {
    linhas.push(`  '${base64.slice(inicio, inicio + 120)}'`)
  }
  return linhas.join(' +\n')
}

async function gerar(fonte: FonteAlvo): Promise<void> {
  const css = await buscarTexto(
    `https://fonts.googleapis.com/css2?family=${fonte.consulta}&display=swap`,
  )
  const { url, unicodeRange } = blocoLatino(css, fonte.familia)
  const peso = faixaDePeso(css)

  const resposta = await fetch(url, { headers: { 'User-Agent': MODERN_UA } })
  if (!resposta.ok) throw new Error(`${resposta.status} ao baixar ${url}`)
  const bytes = Buffer.from(await resposta.arrayBuffer())
  const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase()
  const base64 = bytes.toString('base64')

  const modulo = `/**
 * GERADO por scripts/gen-game-ui-fonts.ts — NÃO EDITE À MÃO.
 *
 * ${fonte.familia}, subset Latin do Google Fonts.
 * Source: ${url}
 * SHA-256: ${sha256}
 * License: ../fonts/OFL-${fonte.slug}.txt
 */
import type { GameUiFontFace } from './types'

export const FONTE: GameUiFontFace = {
  id: ${JSON.stringify(fonte.id)},
  label: ${JSON.stringify(fonte.familia)},
  weight: ${JSON.stringify(peso)},
  unicodeRange: ${JSON.stringify(unicodeRange)},
  base64:
${emPedacos(base64)},
}
`
  await writeFile(join(DESTINO_DADOS, `${fonte.arquivo}.ts`), modulo, 'utf8')

  const licenca = await buscarTexto(
    `https://raw.githubusercontent.com/google/fonts/main/ofl/${fonte.slug}/OFL.txt`,
  )
  await writeFile(join(DESTINO_LICENCAS, `OFL-${fonte.slug}.txt`), licenca, 'utf8')

  const kb = Math.round(bytes.length / 102.4) / 10
  console.log(`${fonte.familia.padEnd(16)} ${String(kb).padStart(6)} KB  peso ${peso}`)
}

await mkdir(DESTINO_DADOS, { recursive: true })
await mkdir(DESTINO_LICENCAS, { recursive: true })
for (const fonte of FONTES) await gerar(fonte)
console.log(`\n${FONTES.length} fontes em src/official-extensions/gameUiFonts/`)
