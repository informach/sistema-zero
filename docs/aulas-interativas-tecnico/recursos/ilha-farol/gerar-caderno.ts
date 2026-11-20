/**
 * Passo a passo do projeto de A Ilha do Farol, na receita do caderno visual (20/11/2026,
 * `../caderno-visual/README.md`), no molde do gerador da Chave do Farol.
 *
 * Todo texto que a criança lê mora em `caderno-conteudo.json`: aqui ficam só a composição, os
 * desenhos dos encaixes (com os rótulos que os blocos 3D mostram no Estúdio), as galerias das
 * escolhas e a capa. A arte da capa (`caderno-visual/arte/capa-ilha-farol.jpg`) é a ilha do jogo,
 * renderizada com as peças publicadas por `docs/design/ilha-do-farol-blender/capa.py`.
 *
 * Itens do conteúdo: `text`, `step` (título "N. …" vira passo numerado), `box` (com `tone`),
 * `note`, `activity` (com `pill`), `delivery` (com `finish`), `gallery` (com `category`),
 * `drawing` (com `name`, um dos desenhos abaixo, e `title`) e `index` (o "Encontre seu passo" da
 * primeira folha). Em todo texto, `<br/>` separa parágrafos e um caminho da paleta em negrito
 * ("Jogo 3D &gt; …") ganha a cor de caminho. `{{pagina:<id>}}` vira o número da página.
 *
 * Gerar e conferir: `python docs/aulas-interativas-tecnico/recursos/desafio-farol/gerar-materiais.py ilha-farol`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { JS_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/js'
import { VALUE_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/values'
import { gameThreeDBlocks } from '../../../../packages/studio/src/official-extensions/game-3d/blocks'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'
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

type Item = {
  kind: string
  title?: string
  text?: string
  tone?: string
  finish?: string
  category?: string
  name?: string
  pill?: string
  days?: { kicker: string; title: string; text: string; pages: string }[]
  extras?: { icon: string; title: string; text: string }[]
}
type ContentPage = {
  id: string
  kicker: string
  title: string
  subtitle: string
  lit?: boolean
  items: Item[]
}
const root = resolve(import.meta.dir, '../../../..')
const pages = JSON.parse(
  readFileSync(resolve(import.meta.dir, 'caderno-conteudo.json'), 'utf8'),
) as ContentPage[]
const fontes = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}
@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}`
const arte = arteDoCurso('capa-ilha-farol.jpg')

// Os blocos: as definições do Estúdio trazem a cor de cada tipo (os 3D em tons de dourado).
const B = criarBlocos([...FRAME_BLOCKS, ...JS_BLOCKS, ...VALUE_BLOCKS, ...gameThreeDBlocks])
const lista = (valor: string) => B.campo(valor, { lista: true })
const bool = (valor: string) => B.valor('sz_val_bool', lista(valor))
const variavel = (nome: string) => B.valor('sz_val_variable', `valor da variável ${lista(nome)}`)
const assign = (nome: string, valor: string) =>
  B.bloco('sz_js_var_assign', `Alterar variável ${lista(nome)} para ${valor}`)
const aviso = (texto: string) => assign('aviso', B.texto('sz_val_text', texto))
const esconder = () =>
  B.bloco('sz_g3d_set_visible', `${lista('Esconder')} o objeto ${lista('chave')}`)
const FALTA = 'Falta a chave. Procure na ilha antes de voltar.'
/** O encontro, com a palavra "fazer" à esquerda da boca, como no Estúdio. */
const encontro = (outro: string, pronto: string, corpo: string) =>
  B.area(
    'Quando acontecer',
    B.pronto(pronto, B.cor('sz_frame_events')) +
      B.comBoca(
        'sz_g3d_on_touch',
        `Quando ${lista('personagem')} encostar em ${lista(outro)}`,
        corpo,
      ),
  )
const encontroChave = (corpo: string) => encontro('chave', 'Quando apertar a tecla R', corpo)
const encontroFarol = (corpo: string) =>
  encontro('farol', 'Quando apertar a tecla R e o encontro com a chave', corpo)
const seChave = (entao: string, senao: string) =>
  B.se('sz_js_if_else', variavel('temChave'), [
    { rotulo: 'então', explica: 'quando temChave é verdadeiro', corpo: entao },
    { rotulo: 'senão', explica: 'quando temChave é falso', corpo: senao },
  ])
const acender = () =>
  B.bloco(
    'sz_g3d_play_animation',
    `Tocar a animação ${lista('acender')} em ${lista('farol')} ${lista('uma vez')}`,
  ) +
  assign('ganhou', bool('verdadeiro')) +
  aviso('Você acendeu o farol! O barco pode chegar.')

// Os desenhos dos encaixes. O conteúdo escolhe onde cada um entra e dá o título dele.
const drawings: Record<string, { area: string; corpo: () => string }> = {
  movimento: {
    area: 'Enquanto estiver rodando',
    corpo: () =>
      B.area(
        'Enquanto estiver rodando',
        B.comBoca(
          'sz_g3d_animate',
          `A cada quadro da cena ${lista('cena')}`,
          B.bloco(
            'sz_g3d_top_down',
            `Fazer ${lista('personagem')} andar com as setas (ou WASD), velocidade ${B.numero('4')}`,
          ) + B.pronto('Escrever na tela e a chegada do barco', B.cor('sz_g3d_animate')),
        ),
      ),
  },
  posicao: {
    area: 'Ao iniciar',
    corpo: () =>
      B.area(
        'Ao iniciar',
        B.pronto('Os objetos da ilha e as outras posições', B.cor('sz_frame_start')) +
          B.bloco(
            'sz_g3d_set_position',
            `Colocar o objeto ${lista('chave')} em x ${B.numero('−3')} y ${B.numero('1')} z ${B.numero('−2')}`,
          ),
      ),
  },
  recolher: { area: 'Quando acontecer', corpo: () => encontroChave(esconder()) },
  memoria: {
    area: 'Ao iniciar e Quando acontecer',
    corpo: () =>
      B.area(
        'Ao iniciar',
        B.pronto(
          'Os blocos que já estão em Ao iniciar, até o que cria aviso',
          B.cor('sz_frame_start'),
        ) +
          B.bloco(
            'sz_js_var_create',
            `Criar variável ${B.campo('temChave')} com valor ${bool('falso')}`,
          ),
      ) + encontroChave(esconder() + assign('temChave', bool('verdadeiro'))),
  },
  aviso: {
    area: 'Quando acontecer',
    corpo: () =>
      encontroChave(
        esconder() +
          assign('temChave', bool('verdadeiro')) +
          aviso('Você pegou a chave! Agora vá ao farol.'),
      ),
  },
  // Aula 3, parte 1: só o senão tem bloco; o então fica vazio até a parte seguinte.
  'sem-chave': {
    area: 'Quando acontecer',
    corpo: () =>
      encontroFarol(
        seChave(B.vazio('vazio por enquanto: você completa na próxima parte'), aviso(FALTA)),
      ),
  },
  decisao: {
    area: 'Quando acontecer',
    corpo: () => encontroFarol(seChave(acender(), aviso(FALTA))),
  },
  // A guarda da partida: o Se temChave inteiro mora no então do Se não ganhou.
  'uma-vez': {
    area: 'Quando acontecer',
    corpo: () =>
      encontroFarol(
        B.se('sz_js_if_else', B.valor('sz_val_not', `não ${variavel('ganhou')}`), [
          {
            rotulo: 'então',
            explica: 'enquanto a partida ainda não foi ganha',
            corpo: seChave(
              B.pronto('Tocar a animação, ganhou e o aviso da vitória', B.cor('sz_js_if_else')),
              B.pronto('O aviso de que falta a chave', B.cor('sz_js_if_else')),
            ),
          },
        ]),
      ),
  },
}

// As escolhas da personalização: as miniaturas saem dos mesmos modelos do jogo
// (docs/design/ilha-do-farol-blender/galeria), com o nome que aparece na lista do bloco.
const galeriaDir = resolve(root, 'docs/design/ilha-do-farol-blender/galeria')
const GALERIAS: Record<string, readonly string[]> = {
  personagens: [
    'aventureiro',
    'menina-de-laco',
    'marinheira',
    'menino-de-bone',
    'exploradora-de-chapeu',
    'pirata',
    'mergulhador',
    'robo',
  ],
  cenarios: ['praia-tropical', 'costa-rochosa', 'ilha-nevada', 'noite-na-ilha'],
  barcos: ['veleiro', 'barco-de-pesca', 'lancha', 'barco-pirata'],
  chaves: ['chave-dourada', 'chave-prateada', 'chave-de-estrela'],
  farois: ['farol-listrado', 'farol-de-pedra', 'farol-de-madeira', 'farol-colorido'],
}
const opcao = (nome: string) =>
  `<figure class="galeria-item ilha-opcao"><img src="data:image/webp;base64,${readFileSync(resolve(galeriaDir, `${nome}.webp`)).toString('base64')}" alt="${nome}"><figcaption>${nome}</figcaption></figure>`
function gallery(category: string | undefined): string {
  const nomes = GALERIAS[category ?? '']
  if (!nomes) throw new Error(`Galeria desconhecida: ${category}`)
  return `<div class="galeria ilha-galeria ilha-galeria--${category}">${nomes.map(opcao).join('')}</div>`
}

/** Card de cada caixa: o tom e o ícone seguem o que a caixa diz, como nas folhas de referência. */
function boxStyle(item: Item): { tom: 'azul' | 'amarelo'; icone: string } {
  const titulo = item.title ?? ''
  if (/^Se Compartilhar/.test(titulo)) return { tom: 'amarelo', icone: 'boia' }
  if (/^Preciso de ajuda/.test(titulo)) return { tom: 'azul', icone: 'ajuda' }
  if (/nome que os blocos/.test(titulo)) return { tom: 'azul', icone: 'etiqueta' }
  if (/^O que investigar/.test(titulo)) return { tom: 'amarelo', icone: 'olho' }
  if (/^Comemore/.test(titulo)) return { tom: 'amarelo', icone: 'medalha' }
  if (/^Um lugar para/.test(titulo)) return { tom: 'amarelo', icone: 'mapa' }
  if (/^Teste/.test(titulo)) return { tom: 'amarelo', icone: 'controle' }
  if (item.tone === 'experience') return { tom: 'amarelo', icone: 'setas' }
  if (item.tone === 'test') return { tom: 'amarelo', icone: 'controle' }
  return { tom: 'azul', icone: 'livro' }
}

function indexCards(item: Item): string {
  const tons = ['azul', 'ambar', 'vermelho']
  const aulas = (item.days ?? [])
    .map(
      (d, i) =>
        `<div class="indice-dia indice-dia--${tons[i] ?? 'azul'}"><div class="kicker">${d.kicker}</div><h3>${d.title}</h3><p>${d.text}</p><p class="indice-paginas">${d.pages}</p></div>`,
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

function renderItem(item: Item, page: { kicker: string }, index: number): string {
  if (item.kind === 'gallery')
    return `${item.title ? `<h3 class="titulo-secao">${item.title}</h3>` : ''}${gallery(item.category)}`
  if (item.kind === 'drawing') {
    const drawing = drawings[item.name ?? '']
    if (!drawing) throw new Error(`Desenho desconhecido: ${item.name}`)
    return B.esquema(item.title ?? '', drawing.area, drawing.corpo())
  }
  if (item.kind === 'index') return indexCards(item)
  const text = item.text ?? ''
  if (item.kind === 'text')
    // Nas folhas de experiência, a ideia do vídeo abre a folha num card, antes do convite.
    return /Experiência/i.test(page.kicker) && index === 0
      ? caixa({ tom: 'azul', icone: 'filme', html: text })
      : `<div class="texto">${paragrafos(text)}</div>`
  if (item.kind === 'note') return nota(text)
  if (item.kind === 'activity')
    return caixa({ tom: 'amarelo', icone: 'controle', titulo: item.pill, html: text })
  if (item.kind === 'step') {
    const match = item.title?.match(/^(\d+)\.\s*(.*)$/)
    return match ? passo(match[1] ?? '', match[2] ?? '', text) : secao(item.title ?? '', text)
  }
  if (item.kind === 'delivery')
    return entrega(
      'Confira antes de enviar',
      `Funcionou? Clique em <strong>Verificar projeto</strong>. Se faltar alguma coisa, corrija os blocos e clique novamente.<br/>Quando aparecer <strong>Objetivo cumprido!</strong>, clique em <strong>Enviar meu projeto</strong> e confirme em <strong>Enviar</strong>. Quando aparecer <strong>Projeto enviado!</strong>, clique em <strong>${item.finish}</strong>.`,
    )
  if (item.kind === 'box') {
    // "Verificar e continuar" fecha a folha no card escuro.
    if (item.tone === 'test' && /^Verificar/.test(item.title ?? ''))
      return entrega(item.title ?? '', text)
    return caixa({ ...boxStyle(item), titulo: item.title, html: text })
  }
  throw new Error(`Item desconhecido no caderno: ${item.kind}`)
}

/** A cor de cada folha segue a aula; na Aula 3, a surpresa e o fim ganham cores próprias. */
function tema(kicker: string): string {
  if (/^Aula 1/.test(kicker)) return 'tema-azul'
  if (/^Aula 2/.test(kicker)) return 'tema-ambar'
  const parte = Number(kicker.match(/^Aula 3 · Parte (\d+)/)?.[1] ?? 0)
  if (parte >= 1 && parte <= 5) return 'tema-vermelho'
  if (parte >= 6 && parte <= 7) return 'tema-roxo'
  if (parte === 8 || /^Seu jogo/.test(kicker)) return 'tema-verde'
  return 'tema-azul'
}

const ui = {
  titulo: 'Passo a passo do projeto - A Ilha do Farol',
  cenaAlt: 'A Ilha do Farol em três dimensões',
  curso: 'A Ilha do Farol',
}
const montadas = pages.map((page) => {
  const body = page.items.map((item, i) => renderItem(item, page, i)).join('')
  const topo =
    page.id === 'p1'
      ? // A primeira folha apresenta o curso: título grande e a faixa da arte, sem cabeçalho.
        `<div class="abertura"><div class="kicker">${page.kicker}</div><h2>${page.title}</h2><p>${page.subtitle}</p><div class="abertura-faixa"><div class="abertura-faixa-arte" role="img" aria-label="${ui.cenaAlt}" style="background-image:url(${arte})"></div></div></div>`
      : cabecalho({
          cena: arte,
          alt: ui.cenaAlt,
          kicker: page.kicker,
          titulo: page.title,
          resumo: page.subtitle,
        })
  return {
    id: page.id,
    html: (numero: string) =>
      `<section class="page ${tema(page.kicker)}" data-id="${page.id}"><div class="inner">${topo}<div class="content">${body}</div></div>${rodape(ui.curso, numero)}</section>`,
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
const cover = capaHtml({
  arte,
  iconeSelo: 'mapa',
  linha1: 'A Ilha',
  linha2: 'do Farol',
  frase: 'Todos os passos para construir as regras do seu jogo em três dimensões.',
  fraseBaixo: 'Do primeiro passo na ilha à luz que guia o barco.',
  tema: 'capa--ilha',
})
const body = montadas
  .map((sheet, index) => withPages(sheet.html(`${index + 2} / ${total}`)))
  .join('\n')
// Cores da Ilha: o verde-água do mar raso, a areia no fundo das folhas e o azul do caminho.
const cursoCss = `
body { --fundo: #f6fbfa; --tinta: #0b3036; --texto: #3a4b4e; --destaque: #0e7c86; --destaque-claro: #ddf2f1; --caminho: #1f6fd1;
  --entrega-fundo: #0e6871; --entrega-borda: #0e6871; --entrega-texto: #ffffff; --entrega-rotulo: #ffd23f; --entrega-forte: #ffd23f; }
.capa--ilha { --capa-painel: #0f8a8f; --capa-painel-fundo: linear-gradient(#11939a, #0a4f59); --capa-amarelo: #ffd23f; --capa-frase: #dcf6f3; --selo-fundo: #e2563b; --selo-topo: 608px; --selo-altura: 62px; --selo-largura: 534px; --selo-letra: 27px; --titulo-topo: 692px; --frase-largura: 430px; }
.abertura { margin-bottom: 4mm; }
.abertura h2 { font-size: 28pt; margin: 1mm 0 1mm; }
.abertura p { font-size: 13pt; font-weight: 800; color: var(--tinta); }
.abertura-faixa { margin-top: 3mm; background: #fff; border: 1px solid #dbe9e8; border-radius: 16px; padding: 3mm; box-shadow: 0 4px 14px #1b3a3a10; }
.abertura-faixa-arte { height: 24mm; border-radius: 10px; background-size: 112% auto; background-position: 40% 38%; }
.indice-dias { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3mm; }
.indice-dia { border-radius: 14px; padding: 3mm 4mm; border: 1px solid; }
.indice-dia h3 { font-size: 13pt; margin: 1mm 0 1.4mm; }
.indice-dia p { font-size: 10pt; font-weight: 600; line-height: 1.4; }
.indice-dia .indice-paginas { margin-top: 2mm; font-weight: 700; }
.indice-dia--azul { background: #e3eefa; border-color: #c8dcf0; --destaque: #0b5394; }
.indice-dia--ambar { background: #fdf1d6; border-color: #f0d9a2; --destaque: #a36a00; }
.indice-dia--vermelho { background: #fde8e8; border-color: #f4c8c8; --destaque: #c22a2a; }
.indice-extras { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2.4mm; }
.indice-extra { background: #fff; border: 1px solid #dbe9e8; border-radius: 12px; padding: 2.6mm 3mm; }
.indice-icone { width: 5.4mm; height: 5.4mm; color: var(--destaque); }
.indice-extra h3 { font-family: Nunito, Arial, sans-serif; font-size: 9.6pt; font-weight: 800; line-height: 1.2; margin: 1.2mm 0 .6mm; }
.indice-extra p { font-size: 8.8pt; font-weight: 600; line-height: 1.3; }
/* O nome do modelo nunca quebra: a criança procura esse nome exato na lista do Estúdio. */
.nome { white-space: nowrap; }
.ilha-galeria { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.ilha-galeria img { height: 34mm; object-fit: contain; }
.ilha-galeria figcaption { white-space: nowrap; }
.ilha-galeria--cenarios { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.ilha-galeria--cenarios img { height: 46mm; object-fit: cover; border-radius: 8px; }
.ilha-galeria--chaves { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.ilha-galeria--chaves img { height: 26mm; }
.ilha-galeria--barcos img, .ilha-galeria--farois img { height: 30mm; }
`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${ui.titulo}</title><style>${cssDoCaderno(fontes)}\n${cursoCss}</style></head><body>${cover}${body}</body></html>`
if (html.includes('{{')) throw new Error('Campo do caderno sem preencher.')
const pasta = 'tmp/pdfs/ilha-farol'
const out = resolve(root, pasta)
mkdirSync(out, { recursive: true })
writeFileSync(resolve(out, 'caderno.html'), html)
writeFileSync(
  resolve(out, 'cores-estudio.json'),
  JSON.stringify(Object.fromEntries(B.usadas), null, 2),
)
console.log(`${total} páginas preparadas em ${pasta}/caderno.html`)
