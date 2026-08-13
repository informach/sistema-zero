/**
 * Vendoriza os subsets Latin WOFF2 usados por textos vetoriais do Pinta.
 * Uso: `bun run gen:vector-fonts`.
 */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const MODERN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const FONTS = [
  {
    family: 'baloo-2',
    label: 'Baloo 2',
    slug: 'baloo2',
    query: 'Baloo+2:wght@400..800',
    file: 'baloo2',
  },
  {
    family: 'nunito',
    label: 'Nunito',
    slug: 'nunito',
    query: 'Nunito:wght@400..800',
    file: 'nunito',
  },
  {
    family: 'press-start-2p',
    label: 'Press Start 2P',
    slug: 'pressstart2p',
    query: 'Press+Start+2P',
    file: 'pressStart2P',
  },
  { family: 'bungee', label: 'Bungee', slug: 'bungee', query: 'Bungee', file: 'bungee' },
  {
    // ⚠️ A CHAVE continua 'fredoka' (ela viaja nos desenhos salvos), mas a face é a
    // Fredoka ONE — a display redonda e gordinha, que é o que a dona pediu. A
    // variável nova é mais fina e o peso 600 dela NÃO reproduz o traço (medido em
    // Chrome: 0,524 de largura média por caractere contra 0,502; a variável até
    // ESTREITA ao engordar).
    //
    // ⚠️ O slug da licença fica em 'fredoka' de propósito: o Google DELISTOU
    // `ofl/fredokaone/` (o OFL.txt de lá responde 404) ao absorver a família, e o
    // OFL do `ofl/fredoka/` é do MESMO projeto — a primeira linha dele diz
    // "Copyright 2016 The Fredoka Project Authors (github.com/hafontia/Fredoka-One)".
    family: 'fredoka',
    label: 'Fredoka One',
    slug: 'fredoka',
    query: 'Fredoka+One',
    file: 'fredoka',
  },
] as const

const DATA_DIR = join(import.meta.dir, '..', 'src', 'vector', 'fontData')
const LICENSE_DIR = join(import.meta.dir, '..', 'licenses', 'fonts')

async function text(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'User-Agent': MODERN_UA } })
  if (!response.ok) throw new Error(`${response.status} ao buscar ${url}`)
  return response.text()
}

function latinBlock(css: string, label: string): { url: string; weight: string; range: string } {
  const marker = css.lastIndexOf('/* latin */')
  if (marker < 0) throw new Error(`${label}: bloco Latin ausente`)
  const block = css.slice(marker)
  const url = block.match(/src:\s*url\((https:\/\/[^)]+\.woff2)\)/)?.[1]
  const range = block.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim()
  const weight = block.match(/font-weight:\s*([^;]+);/)?.[1]?.trim() ?? '400'
  if (!url || !range) throw new Error(`${label}: bloco Latin incompleto`)
  return { url, weight, range }
}

function chunks(base64: string): string {
  const lines: string[] = []
  for (let start = 0; start < base64.length; start += 120) {
    lines.push(`  '${base64.slice(start, start + 120)}'`)
  }
  return lines.join(' +\n')
}

await mkdir(DATA_DIR, { recursive: true })
await mkdir(LICENSE_DIR, { recursive: true })

for (const font of FONTS) {
  const css = await text(`https://fonts.googleapis.com/css2?family=${font.query}&display=swap`)
  const latin = latinBlock(css, font.label)
  const response = await fetch(latin.url, { headers: { 'User-Agent': MODERN_UA } })
  if (!response.ok) throw new Error(`${response.status} ao baixar ${latin.url}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const hash = createHash('sha256').update(bytes).digest('hex').toUpperCase()
  const module = `/**
 * GERADO por scripts/gen-vector-fonts.ts — NÃO EDITE À MÃO.
 * ${font.label}, subset Latin do Google Fonts.
 * Source: ${latin.url}
 * SHA-256: ${hash}
 * License: ../../../licenses/fonts/OFL-${font.slug}.txt
 */
import type { VectorFontFaceData } from '../fonts'

export const FONT: VectorFontFaceData = {
  family: ${JSON.stringify(font.family)},
  weight: ${JSON.stringify(latin.weight)},
  unicodeRange: ${JSON.stringify(latin.range)},
  base64:
${chunks(bytes.toString('base64'))},
}
`
  await writeFile(join(DATA_DIR, `${font.file}.ts`), module, 'utf8')
  await writeFile(
    join(LICENSE_DIR, `OFL-${font.slug}.txt`),
    await text(`https://raw.githubusercontent.com/google/fonts/main/ofl/${font.slug}/OFL.txt`),
    'utf8',
  )
}

const formatted = Bun.spawnSync([process.execPath, 'x', 'biome', 'format', '--write', DATA_DIR])
if (formatted.exitCode !== 0) {
  throw new Error(new TextDecoder().decode(formatted.stderr))
}

console.log(`${FONTS.length} fontes vetoriais geradas.`)
