/**
 * Starter pack de assets embutidos (sprites/tiles simples, gerados — CC0). É a
 * BIBLIOTECA do AssetsPanel: o aluno clica e o asset é COPIADO para o projeto
 * (vira um `data:` URL próprio em `Project.assets`). O usuário troca/expande este
 * acervo depois.
 *
 * São SVGs pequenos (data:image/svg+xml URL-encoded) — leves, nítidos em qualquer
 * tamanho, passam na CSP do preview (`img-src data:`) e desenham no canvas via
 * `ctx.drawImage` sem "tingir" (sem refs externas/script). Nomes em kebab-case já
 * normalizados (referenciados direto pelos blocos de imagem).
 */

export interface LibraryAsset {
  id: string
  /** Nome amigável (kebab-case) sugerido ao adicionar — único no acervo. */
  name: string
  kind: 'image'
  tags: string[]
  width: number
  height: number
  dataUrl: string
}

/** Empacota um SVG como data: URL (URL-encoded — sem depender de btoa/base64). */
function svg(markup: string): string {
  return `data:image/svg+xml,${encodeURIComponent(markup.replace(/\s+/g, ' ').trim())}`
}

const S = 'http://www.w3.org/2000/svg'

const heroi = `<svg xmlns='${S}' width='64' height='64' viewBox='0 0 64 64'>
  <rect x='14' y='10' width='36' height='44' rx='10' fill='#22d3ee'/>
  <rect x='14' y='10' width='36' height='44' rx='10' fill='none' stroke='#0e7490' stroke-width='2'/>
  <circle cx='26' cy='28' r='4' fill='#0b1020'/>
  <circle cx='38' cy='28' r='4' fill='#0b1020'/>
  <path d='M25 40 q7 6 14 0' stroke='#0b1020' stroke-width='3' fill='none' stroke-linecap='round'/>
</svg>`

const inimigo = `<svg xmlns='${S}' width='64' height='64' viewBox='0 0 64 64'>
  <path d='M32 8 L52 20 L52 44 L32 56 L12 44 L12 20 Z' fill='#f472b6' stroke='#9d174d' stroke-width='2'/>
  <circle cx='25' cy='30' r='4' fill='#0b1020'/>
  <circle cx='39' cy='30' r='4' fill='#0b1020'/>
  <path d='M24 42 q8 -6 16 0' stroke='#0b1020' stroke-width='3' fill='none' stroke-linecap='round'/>
</svg>`

const moeda = `<svg xmlns='${S}' width='48' height='48' viewBox='0 0 48 48'>
  <circle cx='24' cy='24' r='20' fill='#fbbf24' stroke='#b45309' stroke-width='3'/>
  <circle cx='24' cy='24' r='13' fill='none' stroke='#b45309' stroke-width='2'/>
  <text x='24' y='30' font-size='18' font-family='sans-serif' font-weight='700' fill='#b45309' text-anchor='middle'>$</text>
</svg>`

const estrela = `<svg xmlns='${S}' width='48' height='48' viewBox='0 0 48 48'>
  <path d='M24 4 L30 18 L45 19 L33 29 L37 44 L24 36 L11 44 L15 29 L3 19 L18 18 Z' fill='#facc15' stroke='#a16207' stroke-width='2'/>
</svg>`

const blocoChao = `<svg xmlns='${S}' width='48' height='48' viewBox='0 0 48 48'>
  <rect width='48' height='48' fill='#7c4a2d'/>
  <rect width='48' height='14' fill='#4ade80'/>
  <rect y='14' width='48' height='4' fill='#22c55e'/>
  <rect width='48' height='48' fill='none' stroke='#3f2a18' stroke-width='2'/>
</svg>`

const blocoTijolo = `<svg xmlns='${S}' width='48' height='48' viewBox='0 0 48 48'>
  <rect width='48' height='48' fill='#b45309'/>
  <g stroke='#7c2d12' stroke-width='2'>
    <line x1='0' y1='16' x2='48' y2='16'/>
    <line x1='0' y1='32' x2='48' y2='32'/>
    <line x1='24' y1='0' x2='24' y2='16'/>
    <line x1='12' y1='16' x2='12' y2='32'/>
    <line x1='36' y1='16' x2='36' y2='32'/>
    <line x1='24' y1='32' x2='24' y2='48'/>
  </g>
</svg>`

// Tileset com DOIS quadros de 32×32 lado a lado (64×32): quadro 0 = chão
// (grama+terra), quadro 1 = parede (tijolos). Indexado pelos blocos de tilemap
// (tile = 32): a GRADE usa 0 para o chão e 1 para a parede.
const tileset = `<svg xmlns='${S}' width='64' height='32' viewBox='0 0 64 32'>
  <rect x='0' y='0' width='32' height='32' fill='#7c4a2d'/>
  <rect x='0' y='0' width='32' height='10' fill='#4ade80'/>
  <rect x='0' y='10' width='32' height='3' fill='#22c55e'/>
  <rect x='0' y='0' width='32' height='32' fill='none' stroke='#3f2a18' stroke-width='1.5'/>
  <rect x='32' y='0' width='32' height='32' fill='#b45309'/>
  <g stroke='#7c2d12' stroke-width='1.5'>
    <line x1='32' y1='11' x2='64' y2='11'/>
    <line x1='32' y1='21' x2='64' y2='21'/>
    <line x1='48' y1='0' x2='48' y2='11'/>
    <line x1='40' y1='11' x2='40' y2='21'/>
    <line x1='56' y1='11' x2='56' y2='21'/>
    <line x1='48' y1='21' x2='48' y2='32'/>
  </g>
  <rect x='32' y='0' width='32' height='32' fill='none' stroke='#7c2d12' stroke-width='1.5'/>
</svg>`

export const ASSET_LIBRARY: LibraryAsset[] = [
  {
    id: 'lib-heroi',
    name: 'heroi',
    kind: 'image',
    tags: ['personagem'],
    width: 64,
    height: 64,
    dataUrl: svg(heroi),
  },
  {
    id: 'lib-inimigo',
    name: 'inimigo',
    kind: 'image',
    tags: ['personagem'],
    width: 64,
    height: 64,
    dataUrl: svg(inimigo),
  },
  {
    id: 'lib-moeda',
    name: 'moeda',
    kind: 'image',
    tags: ['item'],
    width: 48,
    height: 48,
    dataUrl: svg(moeda),
  },
  {
    id: 'lib-estrela',
    name: 'estrela',
    kind: 'image',
    tags: ['item'],
    width: 48,
    height: 48,
    dataUrl: svg(estrela),
  },
  {
    id: 'lib-chao',
    name: 'bloco-chao',
    kind: 'image',
    tags: ['tile'],
    width: 48,
    height: 48,
    dataUrl: svg(blocoChao),
  },
  {
    id: 'lib-tijolo',
    name: 'bloco-tijolo',
    kind: 'image',
    tags: ['tile'],
    width: 48,
    height: 48,
    dataUrl: svg(blocoTijolo),
  },
  {
    id: 'lib-tileset',
    name: 'tileset',
    kind: 'image',
    tags: ['tile', 'tileset'],
    width: 64,
    height: 32,
    dataUrl: svg(tileset),
  },
]
