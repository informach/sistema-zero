/**
 * Identidade visual dos Passo a passo do projeto (14/11/2026).
 *
 * A capa e o miolo seguem os dois cadernos de referência que a dona aprovou (Cadê Todo Mundo? e
 * A Chave do Farol): arte do curso em cima, faixa "Passo a passo do projeto", título em duas
 * cores e o logo do Sistema Zero kids; por dentro, cabeçalho com a cena do jogo, cards coloridos,
 * passos numerados e os blocos desenhados como no Estúdio (chapéu da área, boca em C com "fazer",
 * campos brancos). Os dois geradores (`cade-todo-mundo/gerar-caderno.ts` e
 * `desafio-farol/gerar-caderno.ts`) montam as folhas com estas peças; o texto continua nas
 * fontes de cada curso.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const AQUI = import.meta.dir

/** Ícones de traço (24 × 24), na cor do texto em volta. */
const ICONES: Record<string, string> = {
  livro:
    '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  controle:
    '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.55-.6-6.58-.69-7.26A4 4 0 0 0 17.32 5z"/>',
  filme:
    '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>',
  setas:
    '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  certo: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  presente:
    '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  mensagem:
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/>',
  mundo:
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  lista:
    '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  medalha: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
  mapa: '<path d="M14.11 5.55a2 2 0 0 0 1.79 0l3.66-1.83A1 1 0 0 1 21 4.62v12.76a1 1 0 0 1-.55.9l-4.56 2.27a2 2 0 0 1-1.78 0l-4.22-2.1a2 2 0 0 0-1.78 0l-3.66 1.83A1 1 0 0 1 3 19.38V6.62a1 1 0 0 1 .55-.9l4.56-2.27a2 2 0 0 1 1.78 0z"/><path d="M15 5.76v15"/><path d="M9 3.24v15"/>',
  pegadas:
    '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>',
  olho: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  toque:
    '<path d="M14 4.1 12 6"/><path d="m5.1 8-2.9-.8"/><path d="m6 12-1.9 2"/><path d="M7.2 2.2 8 5.1"/><path d="M9.04 9.69a.5.5 0 0 1 .65-.65l11 4.5a.5.5 0 0 1-.07.95l-4.35 1.04a1 1 0 0 0-.74.74l-1.04 4.35a.5.5 0 0 1-.95.07z"/>',
  brilho:
    '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/>',
  engrenagem:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  repetir:
    '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  etiqueta:
    '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  boia: '<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/>',
  pessoa: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  seta: '<path d="m6 9 6 6 6-6"/>',
  tela: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
  ajuda:
    '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
}

export function icone(nome: string, classe = 'icone'): string {
  const corpo = ICONES[nome]
  if (!corpo) throw new Error(`Ícone desconhecido: ${nome}`)
  return `<svg class="${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corpo}</svg>`
}

/** O logo do Sistema Zero kids da capa: "SISTEMA" branco, "ZERO" azul e o selo "kids" amarelo. */
function logoKids(): string {
  const caminho = resolve(AQUI, '../../../../packages/community-kids/public/logo_kids_vertical.svg')
  const svg = readFileSync(caminho, 'utf8')
  const corpo = svg.slice(svg.indexOf('</defs>') + '</defs>'.length, svg.lastIndexOf('</svg>'))
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1]
  if (!corpo.includes('cls-2') || !viewBox) throw new Error('O logo do Sistema Zero kids mudou.')
  // As cores do logo vertical (fundo claro) trocadas para as da capa (fundo escuro).
  const estilo =
    '.cls-1{fill:#012c73;font-family:Nunito,Arial,sans-serif;font-size:181.26px;font-weight:800}.cls-2{fill:#fff}.cls-3{fill:#fdb002}.cls-4,.cls-6{fill:#0074fd}.cls-5{fill:#fdb002}'
  return `<svg class="capa-logo" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sistema Zero kids"><style>${estilo}</style>${corpo}</svg>`
}

export function arteDoCurso(arquivo: string): string {
  const imagem = readFileSync(resolve(AQUI, 'arte', arquivo)).toString('base64')
  return `data:image/jpeg;base64,${imagem}`
}

export type CapaDoCaderno = {
  arte: string
  /** Ícone da faixa "Passo a passo do projeto". */
  iconeSelo: string
  linha1: string
  linha2: string
  frase: string
  fraseBaixo: string
  /** Classe de cores da capa (`capa--cade`, `capa--farol`). */
  tema: string
  /**
   * O nome do material na faixa. Os cursos das crianças usam o padrão; o curso para pais
   * (15/11/2026) diz "Apostila do curso", porque não tem projeto. Só o nome muda, nunca o visual.
   */
  selo?: string
}

export const MATERIAL_PADRAO = 'Passo a passo do projeto'

/** A capa, medida sobre as capas de referência (folha de 794 × 1123 px). */
export function capaHtml(capa: CapaDoCaderno): string {
  return `<section class="page capa ${capa.tema}" data-id="capa"><div class="capa-arte" style="background-image:url(${capa.arte})"></div><div class="capa-painel"></div><div class="capa-selo">${icone(capa.iconeSelo, 'capa-selo-icone')}<span>${capa.selo ?? MATERIAL_PADRAO}</span></div><h1 class="capa-titulo"><span>${capa.linha1}</span><em>${capa.linha2}</em></h1><p class="capa-frase">${capa.frase}</p><p class="capa-frase-baixo">${capa.fraseBaixo}</p>${logoKids()}</section>`
}

/** Destaca o caminho da paleta ("Jogo 2D &gt; Sprites &gt; Aparência") escrito em negrito. */
export function comCaminhos(html: string): string {
  return html.replace(
    /<(b|strong)>([^<]*?&gt;[^<]*?)<\/\1>/g,
    (_, _tag, caminho: string) => `<span class="caminho">${caminho}</span>`,
  )
}

/** Um parágrafo por linha (`<br/>` no texto de origem). */
export function paragrafos(html: string): string {
  return html
    .split(/<br\s*\/?>/)
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha) => `<p>${comCaminhos(linha)}</p>`)
    .join('')
}

export const caixa = ({
  tom,
  icone: nome,
  titulo,
  html,
}: {
  tom: 'azul' | 'amarelo' | 'verde' | 'lilas' | 'vermelho'
  icone: string
  titulo?: string
  html: string
}) =>
  `<div class="cartao cartao--${tom}">${icone(nome, 'cartao-icone')}<div class="cartao-corpo">${titulo ? `<h3>${titulo}</h3>` : ''}${paragrafos(html)}</div></div>`

export const passo = (numero: string | number, titulo: string, html: string) =>
  `<div class="passo"><span class="passo-numero">${numero}</span><div class="passo-corpo">${titulo ? `<h3>${titulo}</h3>` : ''}${paragrafos(html)}</div></div>`

export const secao = (titulo: string, html: string) =>
  `<div class="secao"><h3>${titulo}</h3>${paragrafos(html)}</div>`

export const nota = (html: string) =>
  `<div class="nota">${icone('info', 'nota-icone')}<div>${paragrafos(html)}</div></div>`

export const entrega = (rotulo: string, html: string) =>
  `<div class="entrega"><span class="entrega-rotulo">${icone('certo', 'entrega-icone')}${rotulo}</span>${paragrafos(html)}</div>`

export const rotulo = (texto: string) => `<span class="rotulo">${texto}</span>`

/** O cabeçalho de cada folha: a cena do jogo à esquerda, o kicker, o título e o resumo. */
export const cabecalho = ({
  cena,
  alt,
  kicker,
  titulo,
  resumo,
  enquadre = 'center',
}: {
  cena: string
  alt: string
  kicker: string
  titulo: string
  resumo: string
  enquadre?: string
}) =>
  `<div class="cabecalho"><div class="cabecalho-cena"><img src="${cena}" alt="${alt}" style="object-position:${enquadre}"></div><div class="cabecalho-texto"><div class="kicker">${kicker}</div><h2>${titulo}</h2><p>${resumo}</p></div></div>`

export const rodape = (curso: string, numero: string, material = MATERIAL_PADRAO) =>
  `<div class="page-no"><span class="brand">${curso}&nbsp; | &nbsp;${material}</span><span>${numero}</span></div>`

type DefinicaoDeBloco = { type: string; colour?: unknown }

/**
 * Os blocos desenhados como no Estúdio. Toda peça que leva a cor de um bloco guarda
 * `data-block-type` e a cor oficial em `background-color`: o `gerar-materiais.py` confere que a
 * cor do desenho é a mesma do Estúdio.
 */
export function criarBlocos(definicoes: Iterable<DefinicaoDeBloco>) {
  const cores = new Map<string, string>()
  for (const d of definicoes) if (typeof d.colour === 'string') cores.set(d.type, d.colour)
  const usadas = new Map<string, string>()
  const cor = (tipo: string) => {
    const c = cores.get(tipo)
    if (!c || !/^#[0-9a-f]{6}$/i.test(c)) throw new Error(`Cor do Estúdio ausente para ${tipo}`)
    usadas.set(tipo, c)
    return c
  }
  const pinta = (tipo: string) => `data-block-type="${tipo}" style="background-color:${cor(tipo)}"`
  const areas: Record<string, { tipo: string; icone: string }> = {
    'Ao iniciar': { tipo: 'sz_frame_start', icone: 'engrenagem' },
    'Quando acontecer': { tipo: 'sz_frame_events', icone: 'brilho' },
    'Enquanto estiver rodando': { tipo: 'sz_frame_loops', icone: 'repetir' },
  }
  const campo = (valor: string, opcoes: { lista?: boolean; miniatura?: string } = {}) => {
    const figura = opcoes.miniatura
      ? opcoes.miniatura === 'pessoa'
        ? icone('pessoa', 'bk-campo-icone')
        : `<img class="bk-campo-mini" src="${opcoes.miniatura}" alt="">`
      : ''
    return `<span class="bk-campo">${figura}${valor}${opcoes.lista ? icone('seta', 'bk-campo-seta') : ''}</span>`
  }
  const numero = (valor: string) => `<span class="bk-numero">${valor}</span>`
  const valor = (tipo: string, corpo: string) =>
    `<span class="bk-valor" ${pinta(tipo)}>${corpo}</span>`
  const texto = (tipo: string, conteudo: string) =>
    `<span class="bk-valor bk-texto" ${pinta(tipo)}>texto <span class="bk-campo bk-campo--texto">${conteudo}</span></span>`
  const bloco = (tipo: string, corpo: string) => `<div class="bk" ${pinta(tipo)}>${corpo}</div>`
  /** Bloco que já está no projeto: só o lugar dele, na cor clara da área. */
  const pronto = (texto: string, corDaArea = '#c2660e') =>
    `<div class="bk-pronto" style="--c:${corDaArea}">${texto} <span>(já vêm no projeto)</span></div>`
  /** Bloco com boca: o topo, a coluna com o rótulo ("fazer") e os blocos de dentro. */
  const comBoca = (tipo: string, topo: string, dentro: string, rotuloDaBoca = 'fazer') => {
    const c = cor(tipo)
    return `<div class="bk-boca" style="--c:${c}"><div class="bk bk-boca-topo" ${pinta(tipo)}>${topo}</div><div class="bk-boca-meio"><span class="bk-boca-rotulo">${rotuloDaBoca}</span><div class="bk-pilha">${dentro}</div></div><div class="bk-boca-pe"></div></div>`
  }
  /** Se/senão: um ramo por linha, com o rótulo do ramo e a explicação em itálico. */
  const se = (
    tipo: string,
    condicao: string,
    ramos: { rotulo: string; explica?: string; corpo: string }[],
  ) => {
    const c = cor(tipo)
    const linhas = ramos
      .map(
        (r) =>
          `<div class="bk-boca-meio"><span class="bk-boca-rotulo">${r.rotulo}</span><div class="bk-pilha">${r.explica ? `<span class="bk-ramo">${r.explica}</span>` : ''}${r.corpo}</div></div>`,
      )
      .join('')
    return `<div class="bk-boca" style="--c:${c}"><div class="bk bk-boca-topo" ${pinta(tipo)}>Se ${condicao}</div>${linhas}<div class="bk-boca-pe bk-boca-pe--se">+ senão se −</div></div>`
  }
  const vazio = (texto: string) => `<div class="bk-vazio">${texto}</div>`
  /** A área do projeto: o chapéu com ícone e nome, o braço na cor da área e o pé. */
  const area = (nome: string, corpo: string) => {
    const a = areas[nome]
    if (!a) throw new Error(`Área desconhecida: ${nome}`)
    const c = cor(a.tipo)
    return `<div class="bk-area" style="--c:${c}"><div class="bk-chapeu" ${pinta(a.tipo)}>${icone(a.icone, 'bk-chapeu-icone')}${nome}</div><div class="bk-braco"><div class="bk-pilha">${corpo}</div></div><div class="bk-pe"></div></div>`
  }
  /** O quadro "confira se ficou assim": título, o painel cinza do Estúdio e a legenda. */
  const esquema = (titulo: string, nomeDaArea: string, corpo: string) =>
    `<div class="esquema"><h3>${icone('lista', 'esquema-icone')}${titulo}</h3><div class="esquema-painel"><div class="esquema-area">Áreas do projeto · ${nomeDaArea}</div>${corpo}</div><p class="esquema-nota">Esquema dos encaixes, com as cores dos blocos do Estúdio.</p></div>`
  return {
    area,
    bloco,
    campo,
    comBoca,
    cor,
    esquema,
    numero,
    pronto,
    se,
    texto,
    usadas,
    valor,
    vazio,
  }
}

/**
 * Estilo comum. Cada curso define `--fundo`, `--tinta`, `--destaque`, `--destaque-claro` e
 * `--caminho` em `body`; cada folha pode trocar o destaque pela classe de tema
 * (`tema-azul`, `tema-ambar`, `tema-vermelho`, `tema-roxo`, `tema-verde`).
 */
export function cssDoCaderno(fontes: string): string {
  return `${fontes}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: Nunito, Arial, sans-serif; color: var(--texto); background: #c7cadb; -webkit-font-smoothing: antialiased; }
h1, h2, h3, .passo-numero, .kicker { font-family: 'Baloo 2', Arial, sans-serif; }
h1, h2, h3 { margin: 0; color: var(--tinta); line-height: 1.12; font-weight: 800; }
p { margin: 0; }
@page { size: A4; margin: 0; }
.page { width: 210mm; height: 297mm; background: var(--fundo); position: relative; overflow: hidden; margin: 0 auto 8mm; break-after: page; page-break-after: always; }
.page:last-child { break-after: auto; page-break-after: auto; }
.inner { padding: 12mm 15mm 22mm; height: 100%; display: flex; flex-direction: column; }
.content { display: flex; flex-direction: column; gap: 3.6mm; }
.page-no { position: absolute; bottom: 9mm; left: 15mm; right: 15mm; display: flex; justify-content: space-between; font-size: 9.5pt; font-weight: 800; color: #8a94a6; }
.page-no .brand { color: var(--destaque); }
.kicker { font-family: Nunito, Arial, sans-serif; color: var(--destaque); font-size: 9.5pt; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
b, strong { color: var(--tinta); font-weight: 800; }
.caminho { color: var(--caminho); font-weight: 800; }
.icone { width: 1em; height: 1em; }

/* Temas por folha. */
.tema-azul { --destaque: #0b5394; --destaque-claro: #e3eefa; }
.tema-ambar { --destaque: #a36a00; --destaque-claro: #fdf1d6; }
.tema-vermelho { --destaque: #c22a2a; --destaque-claro: #fde8e8; }
.tema-roxo { --destaque: #6a3cc4; --destaque-claro: #efe8fd; }
.tema-verde { --destaque: #087a54; --destaque-claro: #e1f2ea; }

/* Capa. */
.capa { background: var(--capa-painel); color: #fff; }
.capa-arte { position: absolute; left: 0; right: 0; top: 0; height: 690px; background-size: cover; background-position: center top; }
.capa-painel { position: absolute; left: 0; right: 0; top: 640px; bottom: 0; background: var(--capa-painel-fundo, var(--capa-painel)); }
.capa-painel::before { content: ''; position: absolute; left: 0; right: 0; bottom: 100%; height: 92px; background: linear-gradient(to bottom, transparent, var(--capa-painel-topo, var(--capa-painel))); opacity: .55; }
.capa-selo { position: absolute; left: 50%; top: var(--selo-topo); transform: translateX(-50%); height: var(--selo-altura); width: var(--selo-largura); display: flex; align-items: center; justify-content: center; gap: 14px; border-radius: 999px; background: var(--selo-fundo); border: 2px solid #ffffff99; box-shadow: 0 10px 24px #00000040; font-family: Nunito, Arial, sans-serif; font-weight: 800; font-size: var(--selo-letra); letter-spacing: .045em; text-transform: uppercase; white-space: nowrap; }
.capa-selo-icone { width: calc(var(--selo-letra) * 1.25); height: calc(var(--selo-letra) * 1.25); stroke-width: 2.2; }
.capa-titulo { position: absolute; left: 0; right: 0; top: var(--titulo-topo); text-align: center; color: #fff; font-family: 'Baloo 2', Arial, sans-serif; font-weight: 800; line-height: .94; text-transform: uppercase; letter-spacing: .01em; }
.capa-titulo span { display: block; font-size: 92px; color: #fff; }
.capa-titulo em { display: block; font-size: 86px; font-style: normal; color: var(--capa-amarelo); }
.capa-frase { position: absolute; left: 50%; transform: translateX(-50%); top: 869px; width: var(--frase-largura, 440px); text-align: center; font-size: 21px; font-weight: 700; line-height: 1.3; color: var(--capa-frase); }
.capa-frase-baixo { position: absolute; left: 0; right: 0; top: 946px; text-align: center; font-size: 17px; font-weight: 800; color: #fff; }
.capa-logo { position: absolute; left: 50%; top: 983px; transform: translateX(-50%); width: 136px; height: auto; overflow: visible; }

/* Cabeçalho das folhas. */
.cabecalho { display: flex; min-height: 41mm; border-radius: 16px; overflow: hidden; background: #fff; border: 1px solid #dfe6ee; box-shadow: 0 4px 14px #1b2a4a10; margin-bottom: 4.2mm; flex: none; }
.cabecalho-cena { width: 40%; flex: none; background: #cfe9f6; }
.cabecalho-cena img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cabecalho-texto { flex: 1; padding: 4.6mm 6mm 4.6mm 7mm; border-top: 4px solid var(--destaque); display: flex; flex-direction: column; justify-content: center; }
.cabecalho-texto h2 { margin: 1.4mm 0 1.6mm; font-size: 22pt; text-wrap: balance; }
.cabecalho-texto p { font-size: 10.6pt; line-height: 1.42; font-weight: 600; color: var(--texto); text-wrap: pretty; }

/* Textos e passos. */
.content > p, .texto p { font-size: 10.6pt; line-height: 1.5; font-weight: 600; text-wrap: pretty; }
.texto p + p { margin-top: 1.6mm; }
.secao h3 { font-size: 14pt; margin-bottom: 1.5mm; }
.secao p, .passo-corpo p, .cartao p, .nota p, .entrega p { font-size: 10.4pt; line-height: 1.46; font-weight: 600; text-wrap: pretty; }
.secao p + p, .passo-corpo p + p, .cartao p + p, .nota p + p, .entrega p + p { margin-top: 1.2mm; }
.passo { display: flex; gap: 4.5mm; align-items: flex-start; }
.passo-numero { flex: none; width: 10mm; height: 10mm; display: grid; place-items: center; border-radius: var(--numero-raio, 50%); background: var(--numero-fundo, var(--destaque)); color: var(--numero-cor, #fff); font-size: 15pt; font-weight: 800; line-height: 1; }
.passo-corpo { flex: 1; padding-top: 1mm; }
.passo-corpo h3 { font-size: 14pt; margin-bottom: 1.2mm; }
.passos { display: flex; flex-direction: column; gap: 3.5mm; }
.titulo-secao { font-size: 16pt; margin-top: 1mm; }
.rotulo { align-self: flex-start; display: inline-block; border-radius: 999px; padding: 4px 13px; font-size: 8.8pt; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--destaque); background: var(--destaque-claro); }

/* Cards. */
.cartao { display: flex; gap: 4mm; border-radius: 14px; padding: 3.8mm 5mm; border: 1px solid; }
.cartao-icone { flex: none; width: 6.2mm; height: 6.2mm; margin-top: .4mm; }
.cartao-corpo { flex: 1; }
.cartao h3 { font-size: 14pt; margin-bottom: 1.8mm; }
.cartao--azul { background: #e8f2fb; border-color: #c8dcf0; color: #1c4f8f; }
.cartao--amarelo { background: #fff4dc; border-color: #f0d9a2; color: #9a6400; }
.cartao--verde { background: #e3f3ea; border-color: #bfe0cd; color: #087a54; }
.cartao--lilas { background: #f0eafd; border-color: #d8ccf6; color: #6a3cc4; }
.cartao--vermelho { background: #fde9e9; border-color: #f4c8c8; color: #c22a2a; }
.cartao p { color: var(--texto); }
.nota { display: flex; gap: 4mm; align-items: flex-start; background: #eef3f2; border-radius: 0 12px 12px 0; border-left: 5px solid var(--destaque); padding: 3.6mm 5mm; color: var(--destaque); }
.nota-icone { flex: none; width: 5.4mm; height: 5.4mm; margin-top: .3mm; }
.nota p { color: var(--texto); }
.entrega { border-radius: 14px; padding: 4.4mm 5.4mm; background: var(--entrega-fundo); border: 1px solid var(--entrega-borda); color: var(--entrega-texto); }
.entrega-rotulo { display: inline-flex; align-items: center; gap: 2mm; margin-bottom: 2.2mm; font-size: 9.6pt; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; color: var(--entrega-rotulo); background: var(--entrega-rotulo-fundo, transparent); border-radius: 999px; padding: var(--entrega-rotulo-espaco, 0); }
.entrega-icone { width: 4.8mm; height: 4.8mm; }
.entrega p { color: var(--entrega-texto); }
.entrega b, .entrega strong, .entrega .caminho { color: var(--entrega-forte); }

/* Blocos do Estúdio. */
.esquema { background: #fff; border: 1px solid #dfe6ee; border-radius: 16px; padding: 3.6mm 4.4mm 2.8mm; }
.esquema h3 { display: flex; align-items: center; gap: 2.4mm; font-size: 13pt; margin-bottom: 2.6mm; }
.esquema-icone { width: 5.4mm; height: 5.4mm; color: var(--destaque); flex: none; }
.esquema-painel { background: #e9eef6; border-radius: 12px; padding: 3mm 3.6mm 3.4mm; display: flex; flex-direction: column; gap: 2.4mm; }
.esquema-area { font-size: 9.5pt; font-weight: 800; color: #5a6578; }
.esquema-nota { margin-top: 1.8mm; font-size: 9pt; font-style: italic; color: #8a94a6; font-weight: 600; }
.bk-area, .bk-boca { display: flex; flex-direction: column; align-items: flex-start; }
.bk-chapeu { display: inline-flex; align-items: center; gap: 2mm; padding: 1.7mm 3.6mm 1.9mm; border-radius: 9px 9px 0 0; color: #fff; font-size: 10.6pt; font-weight: 800; }
.bk-chapeu-icone { width: 4.4mm; height: 4.4mm; }
.bk-braco { border-left: 4.6mm solid var(--c); padding: 1.1mm 0 1.1mm 1.2mm; }
.bk-pe { width: 21mm; height: 3mm; background: var(--c); border-radius: 0 0 8px 8px; }
.bk-pilha { display: flex; flex-direction: column; align-items: flex-start; gap: 1mm; }
.bk { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 1.4mm; padding: 1.5mm 3mm; border-radius: 5px; color: #fff; font-size: 9.8pt; font-weight: 800; line-height: 1.35; box-shadow: inset 0 -2px 0 #00000026; }
.bk-boca-topo { border-radius: 5px 5px 0 0; box-shadow: none; }
.bk-boca-meio { display: flex; align-items: stretch; }
.bk-boca-rotulo { background: var(--c); color: #fff; font-size: 9.8pt; font-weight: 800; padding: 1.5mm 3mm; min-width: 14mm; }
.bk-boca-meio > .bk-pilha { padding: 1mm 0 1mm 1mm; }
.bk-boca-pe { width: 26mm; height: 3mm; background: var(--c); border-radius: 0 0 6px 6px; }
.bk-boca-pe--se { width: auto; height: auto; padding: 1.4mm 3.2mm; color: #fff; font-size: 9.6pt; font-weight: 800; border-radius: 0 0 6px 6px; }
.bk-ramo { font-size: 8.8pt; font-style: italic; font-weight: 700; color: #5a6578; }
.bk-campo { display: inline-flex; align-items: center; gap: 1.2mm; background: #fff; color: #1f2a3c; border-radius: 6px; padding: .7mm 2.4mm; font-weight: 700; white-space: nowrap; }
.bk-campo--texto { white-space: normal; }
.bk-campo-seta { width: 3.4mm; height: 3.4mm; color: #5a6578; }
.bk-campo-icone { width: 3.6mm; height: 3.6mm; color: #5a6578; }
.bk-campo-mini { width: 4.4mm; height: 4.4mm; object-fit: contain; }
.bk-numero { display: inline-grid; place-items: center; min-width: 6.4mm; height: 6.4mm; padding: 0 2mm; border-radius: 999px; background: #fff; color: #1f2a3c; font-weight: 800; }
.bk-valor { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 1.4mm; padding: .9mm 1.8mm .9mm 3mm; border-radius: 999px; color: #fff; border: 1.5px solid #00000026; }
.bk-texto { border-radius: 10px; }
.bk-pronto { padding: 1.5mm 3mm; border-radius: 5px; border: 1.5px solid var(--c); background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); font-size: 9.6pt; font-weight: 800; font-style: italic; }
.bk-pronto span { font-weight: 700; }
.bk-vazio { border: 1.5px dashed #b6bfcd; background: #fff; border-radius: 5px; padding: 1.6mm 3mm; color: #5a6578; font-size: 9.6pt; font-style: italic; font-weight: 700; }

/* Galerias da surpresa do final. */
.galeria { display: grid; gap: 3mm; }
.galeria-item { margin: 0; background: #fff; border: 1px solid #dfe6ee; border-radius: 14px; padding: 3mm 2mm 2.4mm; text-align: center; }
.galeria-item img { display: block; width: 100%; height: 30mm; object-fit: contain; }
.galeria-item figcaption { margin-top: 2mm; font-size: 10.4pt; font-weight: 800; color: var(--tinta); white-space: nowrap; }

@media screen { .page { box-shadow: 0 12px 32px #16182b40; } }
@media print { html, body { background: #fff; } .page { margin: 0; box-shadow: none; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`
}
