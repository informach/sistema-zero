/**
 * Passo a passo do projeto de "Meu primeiro desenho no Pinta" (extra do Faísca), na receita do
 * caderno visual (23/11/2026, `../caderno-visual/README.md`), no molde do gerador de O segredo da
 * cabana.
 *
 * Todo texto que a criança lê mora em `caderno-conteudo.json`: aqui ficam só a composição, as
 * cenas, os prints com as marcas, o desenho do encaixe (com os rótulos e as cores do Estúdio) e a
 * capa. A arte da capa (`caderno-visual/arte/capa-meu-primeiro-desenho.jpg`) é a ilustração da
 * Chave do Farol com a chave desenhada no Pinta em destaque (`docs/design/meu-primeiro-desenho-capa/
 * capa.mjs`). Os prints da aula real e as caixas das marcas ficam em `telas/`
 * (`capturar-telas.mjs`).
 *
 * O caderno acompanha a aula real (`qa/meu-desenho-conteudo.ts`): cada folha de parte diz a sua
 * seção (`secao`), e o gerador confere que o "Aula 1 · Parte N" do kicker é o dessa seção, que o
 * envio do desenho fica na parte do Pinta e o do projeto na última parte, que fecha com Concluir
 * aula, e que os nomes dos cards das ferramentas são os da tela.
 *
 * Itens do conteúdo: `text`, `step` (título "N. …" vira passo numerado), `box` (com `tone`),
 * `note`, `delivery` (o card escuro do envio), `drawing` (com `name` e `title`), `index` (o "O que
 * você vai fazer" da abertura), `views` (as cenas lado a lado), `screens` (prints com marcas
 * numeradas e a legenda de cada marca), `tools` (os cards das ferramentas, com o botão da tela) e
 * `figure` (a chave e as partes dela). Em todo texto, `<br/>` separa parágrafos e um caminho da
 * paleta em negrito ("Jogo 2D &gt; …") ganha a cor de caminho. `{{pagina:<id>}}` vira o número da
 * página.
 *
 * Gerar e conferir: `bun gerar-caderno.ts` e depois `node renderizar-caderno.mjs` (as mesmas
 * conferências de `../desafio-farol/gerar-materiais.py`, mais um print de cada folha).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { COPY } from '../../../../packages/pinta/src/core/copy'
import {
  FAROL_ASSETS,
  FAROL_LAYOUT,
  type FarolAssetName,
} from '../../../../packages/studio/src/arte/farol-assets'
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { gameTwoDBlocks } from '../../../../packages/studio/src/official-extensions/game-2d/blocks'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'
import { meuDesenhoAula } from '../../qa/meu-desenho-conteudo'
import { CHAVE_DO_JOGO, CHAVE_EXEMPLO, VAGA_CHAVE } from '../../qa/meu-desenho-projeto'
import {
  arteDoCurso,
  cabecalho,
  caixa,
  capaHtml,
  criarBlocos,
  cssDoCaderno,
  entrega,
  icone,
  nota,
  paragrafos,
  passo,
  rodape,
  secao,
} from '../caderno-visual/visual'

type Cena = '2d' | '2d-minha' | '2d-aceso' | 'pinta'
type Marca = { n: string; alvo: string; text: string }
type Item = {
  kind: string
  title?: string
  text?: string
  tone?: string
  name?: string
  layout?: string
  days?: { kicker: string; title: string; text: string; pages: string }[]
  extras?: { icon: string; title: string; text: string }[]
  images?: { scene: Cena; caption: string }[]
  screens?: { image: string; caption: string; marks: Marca[] }[]
  tools?: { image: string; title: string; text: string }[]
  parts?: { title: string; text: string }[]
}
type Pagina = {
  id: string
  secao?: string
  scene?: Cena
  kicker: string
  title: string
  subtitle: string
  items: Item[]
}
type Conteudo = {
  curso: string
  capa: { linha1: string; linha2: string; frase: string; fraseBaixo: string }
  cenas: Record<Cena, string>
  paginas: Pagina[]
}
type Caixa = { x: number; y: number; w: number; h: number }

const root = resolve(import.meta.dir, '../../../..')
const conteudo = JSON.parse(
  readFileSync(resolve(import.meta.dir, 'caderno-conteudo.json'), 'utf8'),
) as Conteudo
const marcas = JSON.parse(
  readFileSync(resolve(import.meta.dir, 'telas/marcas.json'), 'utf8'),
) as Record<string, { largura: number; altura: number; caixas: Record<string, Caixa> }>
const pages = conteudo.paginas
const fontes = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}
@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}`
const arte = arteDoCurso('capa-meu-primeiro-desenho.jpg')

/** Um print da aula real (`telas/`), como data URL. */
function tela(arquivo: string): string {
  const tipo = arquivo.endsWith('.png') ? 'png' : 'jpeg'
  if (!marcas[arquivo]) throw new Error(`Print sem registro em telas/marcas.json: ${arquivo}`)
  const dados = readFileSync(resolve(import.meta.dir, 'telas', arquivo)).toString('base64')
  return `data:image/${tipo};base64,${dados}`
}

// ── O caderno acompanha a aula real ──────────────────────────────────────────
const trechos = meuDesenhoAula.trechos
const desenho = trechos.find((t) => t.kind === 'draw')?.key
const ultima = trechos.at(-1)?.key
if (!desenho || ultima !== 'trocar') throw new Error('A aula mudou de forma: confira as partes.')
for (const page of pages) {
  if (!page.secao) continue
  const m = page.kicker.match(/^Aula 1 · Parte (\d+) · /)
  if (!m) throw new Error(`Kicker sem aula e parte: ${page.id}`)
  const parte = trechos.findIndex((t) => t.key === page.secao) + 1
  if (parte !== Number(m[1]))
    throw new Error(`${page.id}: a seção ${page.secao} é a Parte ${parte} da aula, não a ${m[1]}.`)
  for (const item of page.items) {
    if (item.kind !== 'delivery') continue
    const doProjeto = /Verificar projeto/.test(item.text ?? '')
    if (doProjeto && page.secao !== ultima)
      throw new Error(`${page.id}: o envio do projeto fica só na última parte (${ultima}).`)
    if (doProjeto && !/<b>Concluir aula<\/b>\.$/.test(item.text ?? ''))
      throw new Error(`${page.id}: o envio do projeto fecha a aula com Concluir aula.`)
    if (!doProjeto && (page.secao !== desenho || !/Enviar meu desenho/.test(item.text ?? '')))
      throw new Error(`${page.id}: o envio do desenho fica na parte do Pinta (${desenho}).`)
  }
}

// Os nomes dos cards das ferramentas são os rótulos da tela: os do Pinta, o botão de envio do
// bloco de Pinta e o "Expandir"/"Reduzir" do bloco.
const blocoDoPinta = readFileSync(
  resolve(root, 'packages/member-shell/src/components/pinta/pinta-block.tsx'),
  'utf8',
)
const copiaDaAula = readFileSync(
  resolve(root, 'packages/member-shell/src/lib/lesson-copy.ts'),
  'utf8',
)
if (!blocoDoPinta.includes("{expanded ? 'Reduzir' : 'Expandir'}"))
  throw new Error('O Expandir do bloco de Pinta mudou: confira os cards e os prints.')
if (!copiaDaAula.includes("enviar: 'Enviar meu desenho'"))
  throw new Error('O botão de envio do Pinta mudou: confira os cards e os prints.')
const ROTULOS: Record<string, string[]> = {
  'botao-circulo.png': [COPY.tools.ellipse],
  'botao-retangulo.png': [COPY.tools.rect],
  'botao-selecionar.png': [COPY.vector.select],
  'botao-pincel.png': [COPY.vector.brush],
  'botao-preenchimento-contorno.png': [COPY.vector.fill, COPY.vector.stroke],
  'botao-cores.png': [COPY.palette.title],
  'botao-expandir.png': ['Expandir'],
  'botao-reduzir.png': ['Reduzir'],
  'botao-enviar-meu-desenho.png': ['Enviar meu desenho'],
}
for (const page of pages)
  for (const item of page.items)
    for (const t of item.tools ?? []) {
      const rotulos = ROTULOS[t.image]
      if (!rotulos?.every((r) => t.title.includes(r)))
        throw new Error(`${page.id}: o card ${t.title} não tem o nome da tela (${rotulos}).`)
    }
if (COPY.editor.undo !== 'Desfazer') throw new Error('O Desfazer do Pinta mudou de nome.')

// ── As cenas ─────────────────────────────────────────────────────────────────
const svgUrl = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
type Lugar = { x: number; y: number; w: number; h: number }
const peca = (name: FarolAssetName, l: Lugar) => {
  const a = FAROL_ASSETS[name]
  return `<svg x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" viewBox="0 0 ${a.width} ${a.height}">${a.body}</svg>`
}
/**
 * A praia do Farol do jogo 2D, com as artes e os lugares do projeto (`FAROL_LAYOUT`): a chave
 * dourada do jogo, a chave rosa do desenho (a chave de exemplo da vaga minha-chave) ou, no fim, o
 * farol aceso com o personagem na porta. Um anel branco mostra onde está a chave, que no palco é
 * pequena. No cabeçalho, o recorte tira a faixa de cima e a de baixo do palco; nas cenas da
 * abertura, ele fica numa faixa com o personagem, a chave e o farol.
 */
function cena2d(tipo: '2d' | '2d-minha' | '2d-aceso', recorte = '0 36 480 300'): string {
  const { x, y, w, h } = FAROL_LAYOUT.chave
  const anel = `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${w * 0.78}" fill="#ffffff" fill-opacity=".35" stroke="#ffffff" stroke-width="2.5"/>`
  const chave =
    tipo === '2d'
      ? anel + peca(CHAVE_DO_JOGO as FarolAssetName, FAROL_LAYOUT.chave)
      : tipo === '2d-minha'
        ? `${anel}<image href="${CHAVE_EXEMPLO.dataUrl}" x="${x}" y="${y}" width="${w}" height="${h}"/>`
        : ''
  const corpo = [
    peca('praia-tropical', { x: 0, y: 0, w: FAROL_LAYOUT.palco.w, h: FAROL_LAYOUT.palco.h }),
    peca(
      tipo === '2d-aceso' ? 'farol-listrado-aceso' : 'farol-listrado-apagado',
      FAROL_LAYOUT.farol,
    ),
    chave,
    peca(
      'aventureiro',
      tipo === '2d-aceso' ? FAROL_LAYOUT.personagemNaPorta : FAROL_LAYOUT.personagem,
    ),
  ].join('')
  const [, , largura, altura] = recorte.split(' ')
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="${recorte}">${corpo}</svg>`,
  )
}
const CENAS: Record<Cena, { src: string; enquadre: string }> = {
  '2d': { src: cena2d('2d'), enquadre: 'center 40%' },
  '2d-minha': { src: cena2d('2d-minha'), enquadre: 'center 40%' },
  '2d-aceso': { src: cena2d('2d-aceso'), enquadre: 'center 40%' },
  pinta: { src: tela('pinta-quadro.jpg'), enquadre: 'center' },
}
/** As cenas da abertura: a faixa do personagem, da chave e do farol. */
const VISTAS: Partial<Record<Cena, string>> = {
  '2d': cena2d('2d', '0 30 480 200'),
  '2d-minha': cena2d('2d-minha', '0 30 480 200'),
}

// ── O encaixe ────────────────────────────────────────────────────────────────
// As definições do Estúdio trazem a cor de cada tipo: as áreas e as do Jogo 2D.
const B = criarBlocos([...FRAME_BLOCKS, ...gameTwoDBlocks])
const corDoInicio = () => B.cor('sz_frame_start')
/** O bloco que cria a chave do jogo, com os números do projeto e a imagem em destaque. */
function criarChave(imagemDaChave: string): string {
  const { x, y, w, h } = FAROL_LAYOUT.chave
  return B.bloco(
    'sz_g2d_create_image_sprite',
    `Criar sprite ${B.campo('chave')} em x ${B.numero(String(x))} y ${B.numero(String(y))} largura ${B.numero(String(w))} altura ${B.numero(String(h))} com imagem ${B.campo(imagemDaChave).replace('class="bk-campo"', 'class="bk-campo bk-campo--destaque"')}`,
  )
}
const drawings: Record<string, { area: string; corpo: () => string }> = {
  troca: {
    area: 'Ao iniciar',
    corpo: () =>
      B.area(
        'Ao iniciar',
        B.pronto('Os blocos que preparam o jogo e criam o personagem', corDoInicio()) +
          criarChave(VAGA_CHAVE) +
          B.pronto('Os outros blocos: o farol, o barco, o aviso e os controles', corDoInicio()),
      ),
  },
}

// ── As peças da página ───────────────────────────────────────────────────────
/** Card de cada caixa: o tom e o ícone seguem o que a caixa diz, como nas folhas de referência. */
function boxStyle(item: Item): { tom: 'azul' | 'amarelo' | 'lilas'; icone: string } {
  const titulo = item.title ?? ''
  if (/^Preciso de ajuda/.test(titulo)) return { tom: 'azul', icone: 'ajuda' }
  if (/^Comemore/.test(titulo)) return { tom: 'amarelo', icone: 'medalha' }
  if (/^Quer outra/.test(titulo)) return { tom: 'lilas', icone: 'repetir' }
  // A pergunta da Debinha, respondida como no vídeo.
  if (/\?$/.test(titulo)) return { tom: 'azul', icone: 'mensagem' }
  if (item.tone === 'experience') return { tom: 'amarelo', icone: 'controle' }
  if (item.tone === 'test') return { tom: 'amarelo', icone: 'olho' }
  return { tom: 'azul', icone: 'livro' }
}

/** O "O que você vai fazer": o card da aula, com a chave rosa, e os atalhos. */
function indexCards(item: Item): string {
  const aulas = (item.days ?? [])
    .map(
      (d) =>
        `<div class="indice-dia"><div class="indice-dia-texto"><div class="kicker">${d.kicker}</div><h3>${d.title}</h3><p>${d.text}</p><p class="indice-paginas">${d.pages}</p></div><img class="indice-chave" src="${CHAVE_EXEMPLO.dataUrl}" alt=""></div>`,
    )
    .join('')
  const extras = (item.extras ?? [])
    .map(
      (e) =>
        `<div class="indice-extra">${icone(e.icon, 'indice-icone')}<h3>${e.title}</h3><p>${e.text}</p></div>`,
    )
    .join('')
  return `<h3 class="titulo-secao">${item.title ?? ''}</h3><p class="texto">${item.text ?? ''}</p><div class="indice-dias">${aulas}</div><div class="indice-extras">${extras}</div>`
}

/** As cenas lado a lado, com legenda: na abertura, a chave do jogo e a chave desenhada. */
function views(item: Item): string {
  if (!item.images?.length) throw new Error('Item views sem imagens.')
  const figuras = item.images
    .map(
      (v) =>
        `<figure class="vista"><div class="vista-img" role="img" aria-label="${conteudo.cenas[v.scene]}" style="background-image:url(${VISTAS[v.scene] ?? CENAS[v.scene].src})"></div><figcaption>${v.caption}</figcaption></figure>`,
    )
    .join(`<span class="vista-seta">${icone('setas', 'vista-seta-icone')}</span>`)
  return `<div class="vistas">${figuras}</div>`
}

/**
 * Os prints da aula, em cartões, com a marca numerada sobre o controle (a caixa vem de
 * `telas/marcas.json`) e, embaixo, a legenda de cada número.
 */
function screens(item: Item): string {
  const figuras = (item.screens ?? [])
    .map((t) => {
      const caixas = marcas[t.image]?.caixas ?? {}
      const sobre = t.marks
        .map((m) => {
          const c = caixas[m.alvo]
          if (!c) throw new Error(`Marca sem caixa: ${t.image}/${m.alvo}`)
          // A folga em volta do controle: pouca dos lados, para não cobrir o vizinho.
          const [w, h] = [c.w + 1.2, c.h + 3.6]
          return `<span class="tela-alvo" style="left:${c.x - w / 2}%;top:${c.y - h / 2}%;width:${w}%;height:${h}%"></span><span class="tela-num" style="left:${Math.min(c.x + w / 2, 97)}%;top:${Math.min(c.y + h / 2, 94)}%">${m.n}</span>`
        })
        .join('')
      const legenda = t.marks
        .map((m) => `<li><span class="legenda-num">${m.n}</span><span>${m.text}</span></li>`)
        .join('')
      return `<figure class="tela"><div class="tela-print"><img src="${tela(t.image)}" alt="${t.caption}">${sobre}</div><div class="tela-texto"><figcaption>${t.caption}</figcaption><ol class="legenda">${legenda}</ol></div></figure>`
    })
    .join('')
  return `<h3 class="titulo-secao">${icone('tela', 'titulo-icone')}${item.title ?? ''}</h3><div class="telas telas--${item.layout ?? 'um'}">${figuras}</div>`
}

/** Os cards das ferramentas: o botão como está na tela, o nome e o que ele faz. */
function tools(item: Item): string {
  const cards = (item.tools ?? [])
    .map(
      (t) =>
        `<div class="ferramenta"><div class="ferramenta-botao"><img src="${tela(t.image)}" alt="${t.title}"><h3>${t.title}</h3></div><p>${t.text}</p></div>`,
    )
    .join('')
  return `<h3 class="titulo-secao">${item.title ?? ''}</h3><div class="ferramentas">${cards}</div>`
}

/**
 * A chave como a aula ensina, no quadro do Pinta, com o número de cada parte em cima dela (as
 * formas da chave de exemplo, no quadro de 64: argola, haste e dentes).
 */
const PARTES_DA_CHAVE = [
  { x: 17, y: 32 },
  { x: 43, y: 32 },
  { x: 51.5, y: 44 },
]
function figure(item: Item): string {
  if (item.name !== 'chave') throw new Error(`Figura desconhecida: ${item.name}`)
  const partes = item.parts ?? []
  if (partes.length !== PARTES_DA_CHAVE.length) throw new Error('A chave tem três partes.')
  const numeros = PARTES_DA_CHAVE.map(
    (p, i) =>
      `<span class="chave-num" style="left:${(p.x / 64) * 100}%;top:${(p.y / 64) * 100}%">${i + 1}</span>`,
  ).join('')
  const lista = partes
    .map(
      (p, i) =>
        `<li><span class="legenda-num">${i + 1}</span><span><b>${p.title}</b>: ${p.text}</span></li>`,
    )
    .join('')
  return `<figure class="chave-figura"><div class="chave-quadro"><img src="${CHAVE_EXEMPLO.dataUrl}" alt="A chave rosa: argola, haste e dois dentes">${numeros}</div><div class="chave-texto"><h3>${icone('brilho', 'titulo-icone')}${item.title ?? ''}</h3><ol class="legenda legenda--coluna">${lista}</ol>${item.text ? `<p>${item.text}</p>` : ''}</div></figure>`
}

function renderItem(item: Item): string {
  if (item.kind === 'drawing') {
    const drawing = drawings[item.name ?? '']
    if (!drawing) throw new Error(`Desenho desconhecido: ${item.name}`)
    return B.esquema(item.title ?? '', drawing.area, drawing.corpo())
  }
  if (item.kind === 'index') return indexCards(item)
  if (item.kind === 'views') return views(item)
  if (item.kind === 'screens') return screens(item)
  if (item.kind === 'tools') return tools(item)
  if (item.kind === 'figure') return figure(item)
  const text = item.text ?? ''
  if (item.kind === 'text') return `<div class="texto">${paragrafos(text)}</div>`
  if (item.kind === 'note') return nota(text)
  if (item.kind === 'step') {
    const match = item.title?.match(/^(\d+)\.\s*(.*)$/)
    return match ? passo(match[1] ?? '', match[2] ?? '', text) : secao(item.title ?? '', text)
  }
  if (item.kind === 'delivery') return entrega(item.title ?? '', text)
  if (item.kind === 'box') return caixa({ ...boxStyle(item), titulo: item.title, html: text })
  throw new Error(`Item desconhecido no caderno: ${item.kind}`)
}

/** A cor de cada folha segue a parte: o Pinta no rosa do curso, o Estúdio no azul do Farol. */
const tema = (page: Pagina) => (page.secao === 'trocar' ? 'tema-azul' : '')

// ── As folhas ────────────────────────────────────────────────────────────────
const montadas = pages.map((page) => {
  const body = page.items.map(renderItem).join('')
  const topo =
    page.id === 'p1'
      ? // A primeira folha apresenta o curso: título grande e as cenas, sem cabeçalho.
        `<div class="abertura"><div class="kicker">${page.kicker}</div><h2>${page.title}</h2><p>${page.subtitle}</p></div>`
      : cabecalho({
          cena: CENAS[page.scene ?? '2d'].src,
          alt: conteudo.cenas[page.scene ?? '2d'],
          kicker: page.kicker,
          titulo: page.title,
          resumo: page.subtitle,
          enquadre: CENAS[page.scene ?? '2d'].enquadre,
        })
  return {
    id: page.id,
    html: (numero: string) =>
      `<section class="page ${tema(page)} cena-${page.scene ?? 'abertura'}" data-id="${page.id}"><div class="inner">${topo}<div class="content">${body}</div></div>${rodape(conteudo.curso, numero)}</section>`,
  }
})
// A numeração conta a capa como página 1.
function pageNumber(id: string): number {
  const index = montadas.findIndex((sheet) => sheet.id === id)
  if (index < 0) throw new Error(`Página citada no caderno não existe: ${id}`)
  return index + 2
}
const withPages = (text: string) =>
  text.replace(/\{\{pagina:([a-z0-9-]+)\}\}/g, (_, id: string) => String(pageNumber(id)))
const total = montadas.length + 1
const cover = capaHtml({ arte, iconeSelo: 'mapa', ...conteudo.capa, tema: 'capa--desenho' })
/** Os nomes das imagens não quebram no hífen ("minha-/chave"): só no texto, nunca nas tags. */
const semQuebra = (html: string) =>
  html.replace(
    />([^<]+)</g,
    (_, texto: string) =>
      `>${texto.replace(/\b(minha-chave|chave-dourada)\b/g, '<span class="sem-quebra">$1</span>')}<`,
  )
const body = semQuebra(
  montadas.map((sheet, index) => withPages(sheet.html(`${index + 2} / ${total}`))).join('\n'),
)
// Cores do curso: o rosa da chave desenhada no Pinta nos destaques, a tinta de amora nos títulos,
// o azul do mar do Farol no caminho, na faixa da capa e nas folhas do Estúdio, e o amarelo da luz
// do farol no card do envio.
const cursoCss = `
body { --fundo: #fdf8fb; --tinta: #3b1430; --texto: #4a3f47; --destaque: #c2306f; --destaque-claro: #fbe3ee; --caminho: #2d5fc4;
  --entrega-fundo: #7a1c50; --entrega-borda: #7a1c50; --entrega-texto: #ffffff; --entrega-rotulo: #ffd23f; --entrega-forte: #ffd23f; }
.capa--desenho { --capa-painel: #c2306f; --capa-painel-fundo: linear-gradient(#c8357a, #6a1846); --capa-amarelo: #ffd23f; --capa-frase: #ffe1ee; --selo-fundo: #1f6fd1; --selo-topo: 608px; --selo-altura: 62px; --selo-largura: 534px; --selo-letra: 27px; --titulo-topo: 692px; --frase-largura: 470px; }
/* O nome do curso é longo: as duas linhas descem um pouco, na mesma proporção, para caber na folha. */
.capa--desenho .capa-titulo span { font-size: 82px; }
.capa--desenho .capa-titulo em { font-size: 77px; }
.capa--desenho .capa-titulo { top: 700px; }
.abertura { margin-bottom: 4mm; }
.abertura h2 { font-size: 28pt; margin: 1mm 0 1mm; }
.abertura p { font-size: 13pt; font-weight: 800; color: var(--tinta); }
.titulo-icone { width: 5.4mm; height: 5.4mm; color: var(--destaque); flex: none; }
.titulo-secao { display: flex; align-items: center; gap: 2.4mm; }
.vistas { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 2mm; align-items: center; }
.vista { margin: 0; background: #fff; border: 1px solid #ecdde5; border-radius: 16px; padding: 2.6mm; box-shadow: 0 4px 14px #3b143010; }
.vista-img { height: 28mm; border-radius: 10px; background-size: cover; background-position: center; }
.vista figcaption { font-size: 9.8pt; font-weight: 800; color: var(--tinta); text-align: center; margin-top: 1.6mm; }
.vista-seta { color: var(--destaque); }
.vista-seta-icone { width: 6mm; height: 6mm; }
.indice-dias { display: grid; gap: 3mm; }
.indice-dia { display: flex; align-items: center; gap: 4mm; border-radius: 14px; padding: 3.4mm 5mm; border: 1px solid #f1c6d8; background: #fbe6ef; }
.indice-dia-texto { flex: 1; }
.indice-dia h3 { font-size: 14pt; margin: 1mm 0 1.2mm; }
.indice-dia p { font-size: 10.2pt; font-weight: 600; line-height: 1.4; }
.indice-dia .indice-paginas { margin-top: 1.6mm; font-weight: 800; color: var(--destaque); }
.indice-chave { width: 24mm; height: 24mm; flex: none; background: #fff; border-radius: 12px; padding: 1.6mm; border: 1px solid #f1c6d8; }
.indice-extras { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2.4mm; }
.indice-extra { background: #fff; border: 1px solid #ecdde5; border-radius: 12px; padding: 2.6mm 3mm; }
.indice-icone { width: 5.4mm; height: 5.4mm; color: var(--destaque); }
.indice-extra h3 { font-family: Nunito, Arial, sans-serif; font-size: 9.6pt; font-weight: 800; line-height: 1.2; margin: 1.2mm 0 .6mm; }
.indice-extra p { font-size: 8.8pt; font-weight: 600; line-height: 1.3; }
/* Os prints da aula, com as marcas e a legenda. */
.telas { display: grid; gap: 3mm; align-items: start; }
.telas--menu { grid-template-columns: 1fr 1.25fr; }
.tela { margin: 0; background: #fff; border: 1px solid #ecdde5; border-radius: 14px; padding: 2mm 2mm 2.4mm; }
.tela-print { position: relative; border-radius: 9px; border: 1px solid #e6e0e4; }
.tela-print img { display: block; width: 100%; border-radius: 8px; }
.tela figcaption { margin: 1.8mm 1mm 0; font-size: 9.2pt; font-weight: 800; color: var(--texto); line-height: 1.3; }
/* O print largo com a legenda ao lado, em coluna. */
.telas--lado .tela { display: grid; grid-template-columns: minmax(0, 1fr) 47mm; gap: 3.4mm; align-items: center; padding: 2.4mm 3.4mm 2.4mm 2.4mm; }
.telas--lado figcaption { margin: 0 0 2.4mm; }
.telas--lado .legenda { flex-direction: column; gap: 1.7mm; margin: 0; }
.telas--lado .legenda li { align-items: flex-start; }
.tela-alvo { position: absolute; border: 2.2px solid var(--destaque); border-radius: 7px; box-shadow: 0 0 0 2px #ffffffd9; }
.tela-num { position: absolute; transform: translate(-30%, -30%); width: 6mm; height: 6mm; display: grid; place-items: center; border-radius: 50%; background: var(--destaque); color: #fff; font-family: 'Baloo 2', Arial, sans-serif; font-weight: 800; font-size: 10pt; border: 2px solid #fff; }
.legenda { list-style: none; margin: 1.8mm 1mm 0; padding: 0; display: flex; flex-wrap: wrap; gap: 1.4mm 4mm; }
.legenda li { display: flex; align-items: center; gap: 1.6mm; font-size: 9.6pt; font-weight: 700; color: var(--texto); line-height: 1.3; }
.legenda--coluna { flex-direction: column; gap: 1.8mm; margin: 0; }
.legenda--coluna li { align-items: flex-start; font-size: 10.4pt; }
.legenda-num { flex: none; width: 5.2mm; height: 5.2mm; display: grid; place-items: center; border-radius: 50%; background: var(--destaque); color: #fff; font-family: 'Baloo 2', Arial, sans-serif; font-weight: 800; font-size: 9pt; }
.telas--menu .tela-print { background: #fff; }
/* Os cards das ferramentas: o botão como está na tela, o nome e o que ele faz. */
.ferramentas { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2.4mm; }
.ferramenta { background: #fff; border: 1px solid #ecdde5; border-radius: 12px; padding: 2.4mm 3mm 2.6mm; }
.ferramenta-botao { display: flex; flex-wrap: wrap; align-items: center; gap: 1.2mm 2.4mm; margin-bottom: 1.2mm; }
.ferramenta-botao img { height: 8mm; width: auto; max-width: 100%; }
.ferramenta h3 { font-family: 'Baloo 2', Arial, sans-serif; font-size: 12pt; line-height: 1.1; }
.ferramenta p { font-size: 9.4pt; font-weight: 600; line-height: 1.36; color: var(--texto); text-wrap: pretty; }
/* A chave e as partes dela. */
.chave-figura { margin: 0; display: flex; gap: 6mm; align-items: center; background: #fff; border: 1px solid #ecdde5; border-radius: 16px; padding: 4mm 5mm; }
.chave-quadro { position: relative; flex: none; width: 44mm; height: 44mm; border-radius: 10px; border: 1px solid #e3dde1; background-color: #fff; background-image: linear-gradient(45deg, #e9e9ee 25%, transparent 25%, transparent 75%, #e9e9ee 75%), linear-gradient(45deg, #e9e9ee 25%, transparent 25%, transparent 75%, #e9e9ee 75%); background-size: 5.5mm 5.5mm; background-position: 0 0, 2.75mm 2.75mm; }
.chave-quadro img { display: block; width: 100%; height: 100%; }
.chave-num { position: absolute; transform: translate(-50%, -50%); width: 6mm; height: 6mm; display: grid; place-items: center; border-radius: 50%; background: #fff; color: var(--destaque); border: 2px solid var(--destaque); font-family: 'Baloo 2', Arial, sans-serif; font-weight: 800; font-size: 10pt; }
.chave-texto { flex: 1; display: flex; flex-direction: column; gap: 2.4mm; }
.chave-texto h3 { display: flex; align-items: center; gap: 2.4mm; font-size: 14pt; }
.chave-texto > p { font-size: 10.4pt; font-weight: 600; line-height: 1.45; }
.bk-campo--destaque { box-shadow: 0 0 0 2.5px #ffd23f; }
.sem-quebra { white-space: nowrap; }
/* O bloco que cria a chave é largo: na folha dele, o esquema fica um pouco menor, para o bloco
   caber numa linha, como no Estúdio. */
[data-id="troque"] .esquema-painel > * { zoom: .84; }
/* A abertura junta as cenas, a apresentação, o índice e o Antes de começar. */
[data-id="p1"] .content { gap: 3mm; }
/* No cabeçalho, a cena cobre a altura do texto. */
.cabecalho-cena { position: relative; overflow: hidden; background: #e9eef6; }
.cabecalho-cena img { position: absolute; inset: 0; }
`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Passo a passo do projeto - ${conteudo.curso}</title><style>${cssDoCaderno(fontes)}\n${cursoCss}</style></head><body>${cover}${body}</body></html>`
if (html.includes('{{')) throw new Error('Campo do caderno sem preencher.')
const pasta = 'tmp/pdfs/meu-primeiro-desenho'
const out = resolve(root, pasta)
mkdirSync(out, { recursive: true })
writeFileSync(resolve(out, 'caderno.html'), html)
writeFileSync(
  resolve(out, 'cores-estudio.json'),
  JSON.stringify(Object.fromEntries(B.usadas), null, 2),
)
console.log(`${total} páginas preparadas em ${pasta}/caderno.html`)
