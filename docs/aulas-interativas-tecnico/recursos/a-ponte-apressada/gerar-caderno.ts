/**
 * Passo a passo do projeto de A ponte apressada (Poder 3 do Faísca), na receita do caderno visual
 * (23/11/2026, `../caderno-visual/README.md`), no molde do gerador de A Ilha do Farol.
 *
 * Todo texto que a criança lê mora em `caderno-conteudo.json`: aqui ficam só a composição, as
 * cenas do jogo, os desenhos dos encaixes (com os rótulos que os blocos mostram no Estúdio, 2D na
 * Aula 1 e 3D na Aula 2) e a capa. O caderno acompanha a aula real (`qa/ponte-conteudo.ts` e os
 * roteiros): a experiência da Aula 1, o que ela mostrou, as construções na ordem do vídeo (na
 * Aula 2, o objeto do Tocar a animação vem antes do clipe, porque é ele que decide a lista), o
 * envio na última construção de cada aula e a revisão no fim.
 *
 * A arte da capa (`caderno-visual/arte/capa-a-ponte-apressada.jpg`) é a cena do jogo 3D,
 * renderizada com as peças publicadas por `docs/design/a-ponte-apressada-capa/capa.py`. A cena
 * da Aula 1 é o jogo 2D montado com as artes e os lugares do próprio jogo.
 *
 * Itens do conteúdo: `text`, `box` (com `tone` e `icon`), `note`, `step` (título "N. …" vira
 * passo numerado; sem número, um teste), `activity` (com `pill`), `delivery` (o card escuro que
 * fecha a folha), `drawing` (com `name`, um dos desenhos abaixo, `title` e, se tiver encaixe
 * vazio, `blank`), `index` (o "O que você vai fazer" da abertura), `faixa` (as cenas das duas
 * aulas), `tests` (o que investigar, com a lista da tela da experiência), `momentos` e `casos` (os
 * estados da ponte e os três testes da travessia, com as artes do jogo 2D) e `cena` (a arte 3D com
 * legenda). A capa é o item `{ "id": "capa", "capa": true, … }`. Em todo texto, `<br/>` separa parágrafos e um caminho da
 * paleta em negrito ("Jogo 2D &gt; …") ganha a cor de caminho. `{{pagina:<id>}}` vira o número
 * da página.
 *
 * Gerar: `bun docs/aulas-interativas-tecnico/recursos/a-ponte-apressada/gerar-caderno.ts` (o HTML
 * em `tmp/pdfs/a-ponte-apressada`). Conferir e fazer o PDF: `renderizar-caderno.mjs`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  FAROL_LAYOUT,
  type FarolAssetName,
  farolSvg,
} from '../../../../packages/studio/src/arte/farol-assets'
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { JS_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/js'
import { VALUE_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/values'
import { gameTwoDBlocks } from '../../../../packages/studio/src/official-extensions/game-2d/blocks'
import { gameThreeDBlocks } from '../../../../packages/studio/src/official-extensions/game-3d/blocks'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'
import {
  ALAVANCA_2D,
  LAGUINHO_2D,
  NA_PEDRA_2D,
  PONTE_2D,
  PONTE_AVISO,
  PONTE_SEGUNDOS,
  SINO_2D,
} from '../../qa/ponte-projeto'
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

type Tom = 'azul' | 'amarelo' | 'verde' | 'lilas' | 'vermelho'
type Item = {
  kind: string
  title?: string
  text?: string
  tone?: Tom
  icon?: string
  name?: string
  blank?: string
  pill?: string
  list?: string[]
  days?: { kicker: string; title: string; text: string; pages: string }[]
  extras?: { icon: string; title: string; text: string }[]
  images?: { image: string; caption: string }[]
  cards?: {
    title: string
    images: FarolAssetName[]
    personagem?: string
    valor: string
    text: string
  }[]
  image?: string
  caption?: string
}
type Capa = {
  id: 'capa'
  capa: true
  linha1: string
  linha2: string
  frase: string
  fraseBaixo: string
}
type Folha = { id: string; kicker: string; title: string; subtitle: string; items: Item[] }
const root = resolve(import.meta.dir, '../../../..')
const conteudo = JSON.parse(
  readFileSync(resolve(import.meta.dir, 'caderno-conteudo.json'), 'utf8'),
) as (Capa | Folha)[]
const capa = conteudo.find((p): p is Capa => 'capa' in p)
if (!capa) throw new Error('O conteúdo não tem a capa.')
const pages = conteudo.filter((p): p is Folha => !('capa' in p))
const fontes = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}
@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}`
const arte = arteDoCurso('capa-a-ponte-apressada.jpg')
const svgUrl = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
const imagem = (name: FarolAssetName) => svgUrl(farolSvg(name))

type Ponto = { x: number; y: number }
type Caixa = Ponto & { w: number; h: number }
/** Onde o personagem aparece nas cenas dos testes: na entrada da ponte ou em cima da pedra. */
const LUGAR_DO_PERSONAGEM: Record<string, Ponto> = {
  margem: { x: 190, y: 256 },
  pedra: NA_PEDRA_2D,
}
type Cena2d = {
  recorte?: string
  ponte?: FarolAssetName
  alavanca?: FarolAssetName
  sino?: FarolAssetName
  /** O lugar do personagem; `false` deixa ele fora da cena. */
  personagem?: Ponto | false
}
/**
 * O jogo 2D, com as artes e os lugares do próprio jogo (`ponte-projeto.ts` e o Farol), desenhados
 * na ordem do "A cada quadro do jogo". `recorte` é o pedaço do palco (o viewBox); a ponte, a
 * alavanca e o sino podem vir em outro estado, e o personagem pode mudar de lugar ou ficar de fora.
 */
function cena2d({
  recorte = '0 0 480 360',
  ponte = 'ponte-levantada',
  alavanca = 'alavanca-cima',
  sino = 'pedra-do-sino',
  personagem = FAROL_LAYOUT.personagem,
}: Cena2d = {}): string {
  const pecas: [FarolAssetName, Caixa][] = [
    ['praia-tropical', { x: 0, y: 0, w: 480, h: 360 }],
    ['chave-dourada', FAROL_LAYOUT.chave],
    ['farol-listrado-apagado', FAROL_LAYOUT.farol],
    ['laguinho', LAGUINHO_2D],
    [sino, SINO_2D],
    [ponte, PONTE_2D],
    [alavanca, ALAVANCA_2D],
  ]
  // O personagem tem a caixa de 64 × 64 de todas as imagens de personagem do Farol.
  if (personagem) pecas.push(['aventureiro', { ...personagem, w: 64, h: 64 }])
  const corpo = pecas
    .map(
      ([nome, r]) =>
        `<image href="${imagem(nome)}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>`,
    )
    .join('')
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${recorte}" preserveAspectRatio="xMidYMid slice">${corpo}</svg>`,
  )
}
/** No cabeçalho da Aula 1, o laguinho com a ponte, a pedra do sino e a alavanca. */
const cenaAula1 = cena2d({ recorte: '62 206 250 146', personagem: false })
/** Na abertura, a faixa larga: o laguinho, a alavanca e a areia até o mar. */
const CENAS: Record<string, string> = {
  'jogo-2d': cena2d({ recorte: '40 200 380 140' }),
  'jogo-3d': arte,
}
/** O laguinho de perto, com a ponte, a alavanca e o sino no estado de cada momento. */
const laguinho = (imagens: FarolAssetName[], lugar?: string) =>
  cena2d({
    recorte: '88 234 214 114',
    ponte: imagens[0],
    alavanca: imagens[1],
    sino: imagens[2],
    personagem: (lugar && LUGAR_DO_PERSONAGEM[lugar]) || false,
  })

// Os blocos: as definições do Estúdio trazem a cor de cada tipo (os 2D em rosa, os 3D em dourado).
const B = criarBlocos([
  ...FRAME_BLOCKS,
  ...JS_BLOCKS,
  ...VALUE_BLOCKS,
  ...gameTwoDBlocks,
  ...gameThreeDBlocks,
])
const lista = (valor: string) => B.campo(valor, { lista: true })
const numero = (valor: number | string) => B.numero(String(valor))
const bool = (valor: string) => B.valor('sz_val_bool', lista(valor))
const ponteAberta = (valor: 'verdadeiro' | 'falso') =>
  B.bloco('sz_js_var_assign', `Alterar variável ${lista('ponteAberta')} para ${bool(valor)}`)
const aviso = (texto: string) =>
  B.bloco(
    'sz_js_var_assign',
    `Alterar variável ${lista('aviso')} para ${B.texto('sz_val_text', texto)}`,
  )
const criarPonteAberta = () =>
  B.bloco('sz_js_var_create', `Criar variável ${B.campo('ponteAberta')} com valor ${bool('falso')}`)
const relogio = (corpo: string) =>
  B.comBoca('sz_js_set_timeout_seconds', `depois de ${numero(PONTE_SEGUNDOS)} segundos`, corpo)
const sePonteAberta = (entao: string, senao: string) =>
  B.se('sz_js_if_else', B.valor('sz_val_variable', `valor da variável ${lista('ponteAberta')}`), [
    { rotulo: 'então', explica: 'quando ponteAberta é verdadeiro', corpo: entao },
    { rotulo: 'senão', explica: 'quando ponteAberta é falso', corpo: senao },
  ])
const corInicio = () => B.cor('sz_frame_start')
const corEventos = () => B.cor('sz_frame_events')

// 2D: o seletor de sprite mostra a miniatura do sprite, e o de imagem, o nome com a setinha.
const MINIATURA: Record<string, FarolAssetName> = {
  alavanca: 'alavanca-cima',
  ponte: 'ponte-levantada',
  sino: 'pedra-do-sino',
}
const sprite = (nome: string) =>
  B.campo(nome, {
    miniatura: nome === 'personagem' ? 'pessoa' : imagem(MINIATURA[nome] ?? 'alavanca-cima'),
  })
const trocar = (nome: string, imagemNova: string) =>
  B.bloco('sz_g2d_set_image', `Trocar imagem do sprite ${sprite(nome)} para ${lista(imagemNova)}`)
const encontro2d = (outro: string, corpo: string) =>
  B.comBoca(
    'sz_g2d_on_overlap',
    `Quando o sprite ${sprite('personagem')} começar a encostar no sprite ${sprite(outro)}`,
    corpo,
  )
const criarAlavanca2d = () =>
  B.bloco(
    'sz_g2d_create_image_sprite',
    `Criar sprite ${B.campo('alavanca')} em x ${numero(ALAVANCA_2D.x)} y ${numero(ALAVANCA_2D.y)} largura ${numero(ALAVANCA_2D.w)} altura ${numero(ALAVANCA_2D.h)} com imagem ${lista('alavanca-cima')}`,
  )
const baixar2d = () =>
  trocar('alavanca', 'alavanca-baixo') +
  trocar('ponte', 'ponte-baixada') +
  ponteAberta('verdadeiro') +
  aviso(PONTE_AVISO.baixou)
const subir2d = () =>
  trocar('alavanca', 'alavanca-cima') +
  trocar('ponte', 'ponte-levantada') +
  ponteAberta('falso') +
  aviso(PONTE_AVISO.subiu)
const naPedra2d = () =>
  B.bloco(
    'sz_g2d_set_position',
    `Mudar a posição do sprite ${sprite('personagem')} para x ${numero(NA_PEDRA_2D.x)} y ${numero(NA_PEDRA_2D.y)}`,
  )
/** A resposta do sim no 2D: para cima da pedra, o sino tocando e o aviso de sucesso. */
const sim2d = () =>
  naPedra2d() + trocar('sino', 'pedra-do-sino-tocando') + aviso(PONTE_AVISO.atravessou)

// 3D: os nomes dos objetos e os clipes são listas; o lugar da pedra é o que o vídeo dita.
const encontro3d = (outro: string, corpo: string) =>
  B.comBoca('sz_g3d_on_touch', `Quando ${lista('personagem')} encostar em ${lista(outro)}`, corpo)
const tocar = (objeto: string, clipe: string) =>
  B.bloco(
    'sz_g3d_play_animation',
    `Tocar a animação ${lista(clipe)} em ${lista(objeto)} ${lista('uma vez')}`,
  )
const escreverNaTela = () =>
  B.bloco(
    'sz_g3d_hud_text',
    `Escrever na tela ${lista('↓ embaixo, no meio')}: ${B.texto('sz_val_text', 'Setas ou WASD: andar. R: recomeçar.')}`,
  )
const baixar3d = () =>
  tocar('alavanca', 'puxar') +
  tocar('ponte', 'baixar') +
  ponteAberta('verdadeiro') +
  aviso(PONTE_AVISO.baixou)
const subir3d = () =>
  tocar('alavanca', 'soltar') +
  tocar('ponte', 'subir') +
  ponteAberta('falso') +
  aviso(PONTE_AVISO.subiu)
const naPedra3d = () =>
  B.bloco(
    'sz_g3d_set_position',
    `Colocar o objeto ${lista('personagem')} em x ${numero('−3.9')} y ${numero('1.4')} z ${numero('3.8')}`,
  )
/** A resposta do sim no 3D: Colocar o objeto em cima da pedra, o sino e o aviso de sucesso. */
const sim3d = () => naPedra3d() + tocar('sino', 'tocar') + aviso(PONTE_AVISO.atravessou)

// Os desenhos dos encaixes. O conteúdo escolhe onde cada um entra, o título e o texto do vazio.
// Uma parte longa ocupa mais de uma folha, e cada folha fecha com o desenho do que já foi montado.
const quando = (corpo: string) => B.area('Quando acontecer', corpo)
const prontoEventos2d = () => B.pronto('Os encontros do Farol e o evento da tecla R', corEventos())
const prontoEventos3d = () =>
  B.pronto('O evento da tecla R e os encontros com a chave e com o farol', corEventos())
const prontoAlavanca = () =>
  B.pronto('O encontro com a alavanca, com o depois de 4 segundos', corEventos())
const prontoBaixou3d = () =>
  B.pronto('puxar, baixar, ponteAberta verdadeiro e o aviso', B.cor('sz_g3d_on_touch'))
const prontoBaixou2d = () =>
  B.pronto('As duas trocas de imagem, ponteAberta verdadeiro e o aviso', B.cor('sz_g2d_on_overlap'))
/** O Se da ponte logo depois de criado: só o então, antes de a criança abrir o senão. */
const seSoEntao = (corpo: string) =>
  B.se('sz_js_if_else', B.valor('sz_val_variable', `valor da variável ${lista('ponteAberta')}`), [
    { rotulo: 'então', explica: 'quando ponteAberta é verdadeiro', corpo },
  ])
const drawings: Record<string, { area: string; corpo: (vazio: string) => string }> = {
  'variavel-2d': {
    area: 'Ao iniciar',
    corpo: () =>
      B.area(
        'Ao iniciar',
        B.pronto('O jogo do Farol, o laguinho, a pedra do sino e a ponte', corInicio()) +
          criarAlavanca2d() +
          criarPonteAberta(),
      ),
  },
  'reacao-2d': {
    area: 'Quando acontecer',
    corpo: () =>
      quando(
        prontoEventos2d() +
          encontro2d(
            'alavanca',
            trocar('alavanca', 'alavanca-baixo') +
              trocar('ponte', 'ponte-baixada') +
              ponteAberta('verdadeiro'),
          ),
      ),
  },
  'alavanca-2d': {
    area: 'Quando acontecer',
    corpo: () => quando(prontoEventos2d() + encontro2d('alavanca', baixar2d())),
  },
  'relogio-2d': {
    area: 'Quando acontecer',
    corpo: () =>
      quando(
        encontro2d(
          'alavanca',
          prontoBaixou2d() +
            relogio(trocar('alavanca', 'alavanca-cima') + trocar('ponte', 'ponte-levantada')),
        ),
      ),
  },
  'sobe-2d': {
    area: 'Quando acontecer',
    corpo: () => quando(encontro2d('alavanca', prontoBaixou2d() + relogio(subir2d()))),
  },
  'pergunta-2d': {
    area: 'Quando acontecer',
    corpo: (vazio) => quando(prontoAlavanca() + encontro2d('ponte', seSoEntao(B.vazio(vazio)))),
  },
  'posicao-2d': {
    area: 'Quando acontecer',
    corpo: (vazio) =>
      quando(prontoAlavanca() + encontro2d('ponte', sePonteAberta(naPedra2d(), B.vazio(vazio)))),
  },
  'atravessar-2d': {
    area: 'Quando acontecer',
    corpo: () =>
      quando(
        prontoAlavanca() +
          encontro2d('ponte', sePonteAberta(sim2d(), aviso(PONTE_AVISO.levantada))),
      ),
  },
  'variavel-3d': {
    area: 'Ao iniciar',
    corpo: () =>
      B.area(
        'Ao iniciar',
        B.pronto('Os objetos da ilha, do laguinho, da ponte e da alavanca', corInicio()) +
          escreverNaTela() +
          criarPonteAberta(),
      ),
  },
  'baixou-3d': {
    area: 'Quando acontecer',
    corpo: () => quando(prontoEventos3d() + encontro3d('alavanca', baixar3d())),
  },
  'relogio-3d': {
    area: 'Quando acontecer',
    corpo: () =>
      quando(
        encontro3d(
          'alavanca',
          prontoBaixou3d() + relogio(tocar('alavanca', 'soltar') + tocar('ponte', 'subir')),
        ),
      ),
  },
  'sobe-3d': {
    area: 'Quando acontecer',
    corpo: () => quando(encontro3d('alavanca', prontoBaixou3d() + relogio(subir3d()))),
  },
  'pergunta-3d': {
    area: 'Quando acontecer',
    corpo: (vazio) => quando(prontoAlavanca() + encontro3d('ponte', seSoEntao(B.vazio(vazio)))),
  },
  'posicao-3d': {
    area: 'Quando acontecer',
    corpo: (vazio) =>
      quando(prontoAlavanca() + encontro3d('ponte', sePonteAberta(naPedra3d(), B.vazio(vazio)))),
  },
  'atravessar-3d': {
    area: 'Quando acontecer',
    corpo: () =>
      quando(
        prontoAlavanca() +
          encontro3d('ponte', sePonteAberta(sim3d(), aviso(PONTE_AVISO.levantada))),
      ),
  },
}

/** "O que você vai fazer": um card por aula, com as páginas, e os atalhos embaixo. */
function indexCards(item: Item): string {
  const tons = ['azul', 'ambar']
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

/** As cenas das duas aulas lado a lado, na abertura. */
function faixa(item: Item): string {
  const cenas = (item.images ?? [])
    .map((c) => {
      const src = CENAS[c.image]
      if (!src) throw new Error(`Cena desconhecida: ${c.image}`)
      return `<figure class="faixa-cena faixa-cena--${c.image}"><div class="faixa-arte" role="img" aria-label="${c.caption}" style="background-image:url(${src})"></div><figcaption>${c.caption}</figcaption></figure>`
    })
    .join('')
  return `<div class="faixa">${cenas}</div>`
}

/** O que investigar: o convite e a lista de testes da tela da experiência, sem as respostas. */
function tests(item: Item): string {
  const itens = (item.list ?? []).map((t) => `<li>${t}</li>`).join('')
  return `<div class="cartao cartao--amarelo">${icone('olho', 'cartao-icone')}<div class="cartao-corpo"><h3>${item.title ?? ''}</h3>${paragrafos(item.text ?? '')}<ol class="testes">${itens}</ol></div></div>`
}

/** Uma cena grande do jogo, com legenda (na Aula 2, a arte 3D do curso). */
function cena(item: Item): string {
  const src = CENAS[item.image ?? '']
  if (!src) throw new Error(`Cena desconhecida: ${item.image}`)
  return `<figure class="figura-cena figura-cena--${item.image}"><div class="figura-cena-arte" role="img" aria-label="${item.caption ?? ''}" style="background-image:url(${src})"></div><figcaption>${item.caption ?? ''}</figcaption></figure>`
}

/**
 * Os estados da ponte, com as artes do jogo 2D e o valor de ponteAberta em cada um: `momentos`
 * são uma sequência (com setas entre os cards), e `casos` são testes separados (sem setas).
 */
function momentos(item: Item): string {
  const emSequencia = item.kind === 'momentos'
  const cards = (item.cards ?? [])
    .map(
      (c, i) =>
        `${i && emSequencia ? `<span class="momento-seta">${icone('seta', 'momento-seta-icone')}</span>` : ''}<div class="momento"><h3>${c.title}</h3><img class="momento-cena" src="${laguinho(c.images, c.personagem)}" alt="${c.images.join(', ')}"><div class="momento-valor"><span>ponteAberta</span>${bool(c.valor)}</div><p>${c.text}</p></div>`,
    )
    .join('')
  return `<div class="momentos momentos--${item.kind}">${cards}</div>`
}

function renderItem(item: Item): string {
  const text = item.text ?? ''
  if (item.kind === 'faixa') return faixa(item)
  if (item.kind === 'index') return indexCards(item)
  if (item.kind === 'tests') return tests(item)
  if (item.kind === 'momentos' || item.kind === 'casos') return momentos(item)
  if (item.kind === 'cena') return cena(item)
  if (item.kind === 'drawing') {
    const drawing = drawings[item.name ?? '']
    if (!drawing) throw new Error(`Desenho desconhecido: ${item.name}`)
    return B.esquema(item.title ?? '', drawing.area, drawing.corpo(item.blank ?? ''))
  }
  if (item.kind === 'text') return `<div class="texto">${paragrafos(text)}</div>`
  if (item.kind === 'note') return nota(text)
  if (item.kind === 'box')
    return caixa({
      tom: item.tone ?? 'azul',
      icone: item.icon ?? 'livro',
      titulo: item.title,
      html: text,
    })
  if (item.kind === 'activity')
    return caixa({ tom: 'amarelo', icone: 'controle', titulo: item.pill, html: text })
  if (item.kind === 'step') {
    const match = item.title?.match(/^(\d+)\.\s*(.*)$/)
    return match ? passo(match[1] ?? '', match[2] ?? '', text) : secao(item.title ?? '', text)
  }
  if (item.kind === 'delivery') return entrega(item.title ?? '', text)
  throw new Error(`Item desconhecido no caderno: ${item.kind}`)
}

/** A cor de cada folha segue a aula: a Aula 1 (2D) em azul e a Aula 2 (3D) em âmbar. */
const aulaDe = (kicker: string) => Number(kicker.match(/^Aula (\d+)/)?.[1] ?? 0)
const TEMA: Record<number, string> = { 1: 'tema-azul', 2: 'tema-ambar aula-3d' }

const ui = {
  titulo: 'Passo a passo do projeto - A ponte apressada',
  cena2d: 'O laguinho com a ponte levadiça no jogo 2D',
  cena3d: 'O laguinho com a ponte levadiça na ilha em três dimensões',
  curso: 'A ponte apressada',
}
const montadas = pages.map((page) => {
  const body = page.items.map(renderItem).join('')
  const aula = aulaDe(page.kicker)
  const topo =
    page.id === 'p1'
      ? // A primeira folha apresenta o curso: título grande e as cenas das duas aulas.
        `<div class="abertura"><div class="kicker">${page.kicker}</div><h2>${page.title}</h2><p>${page.subtitle}</p></div>`
      : cabecalho({
          cena: aula === 2 ? arte : cenaAula1,
          alt: aula === 2 ? ui.cena3d : ui.cena2d,
          kicker: page.kicker,
          titulo: page.title,
          resumo: page.subtitle,
          enquadre: aula === 2 ? '24% 42%' : 'center',
        })
  return {
    id: page.id,
    html: (numero: string) =>
      `<section class="page ${TEMA[aula] ?? ''}" data-id="${page.id}"><div class="inner">${topo}<div class="content">${body}</div></div>${rodape(ui.curso, numero)}</section>`,
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
  linha1: capa.linha1,
  linha2: capa.linha2,
  frase: capa.frase,
  fraseBaixo: capa.fraseBaixo,
  tema: 'capa--ponte',
})
const body = montadas
  .map((sheet, index) => withPages(sheet.html(`${index + 2} / ${total}`)))
  .join('\n')
// Cores da Ponte, puxadas da arte: o azul do mar no painel e no destaque, a madeira da ponte e
// do sino na faixa, a areia clara no fundo das folhas.
const cursoCss = `
body { --fundo: #f6f8fd; --tinta: #10244a; --texto: #3b4659; --destaque: #2457b8; --destaque-claro: #e2eafb; --caminho: #2f62d6;
  --entrega-fundo: #1d3f8c; --entrega-borda: #1d3f8c; --entrega-texto: #ffffff; --entrega-rotulo: #ffd23f; --entrega-forte: #ffd23f; }
.capa--ponte { --capa-painel: #2f5cc0; --capa-painel-topo: #5a7bd0; --capa-painel-fundo: linear-gradient(#5a7bd0, #2a52b4 30%, #14306f); --capa-amarelo: #ffd23f; --capa-frase: #e3ebff; --selo-fundo: #c9692a; --selo-topo: 600px; --selo-altura: 66px; --selo-largura: 560px; --selo-letra: 26px; --titulo-topo: 692px; --frase-largura: 470px; }
.abertura { margin-bottom: 3mm; }
.abertura h2 { font-size: 28pt; margin: 1mm 0 1mm; }
.abertura p { font-size: 12pt; font-weight: 800; color: var(--tinta); line-height: 1.4; text-wrap: pretty; }
.faixa { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3mm; }
.faixa-cena { margin: 0; background: #fff; border: 1px solid #dbe3f3; border-radius: 16px; padding: 2.4mm; box-shadow: 0 4px 14px #1b2a4a10; position: relative; }
.faixa-arte { height: 36mm; border-radius: 10px; background-size: cover; background-position: center; }
.faixa-cena--jogo-3d .faixa-arte { background-size: 150% auto; background-position: 28% 30%; }
.faixa-cena figcaption { position: absolute; left: 5mm; bottom: 5mm; background: #10244ae0; color: #fff; font-size: 9pt; font-weight: 800; padding: 1.2mm 3.4mm; border-radius: 999px; }
.indice-dias { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3mm; }
.indice-dia { border-radius: 14px; padding: 3mm 4mm; border: 1px solid; }
.indice-dia h3 { font-size: 13pt; margin: 1mm 0 1.4mm; }
.indice-dia p { font-size: 10pt; font-weight: 600; line-height: 1.4; }
.indice-dia .indice-paginas { margin-top: 2mm; font-weight: 800; }
.indice-dia--azul { background: #e3eefa; border-color: #c8dcf0; --destaque: #0b5394; }
.indice-dia--ambar { background: #fdf1d6; border-color: #f0d9a2; --destaque: #a36a00; }
.indice-extras { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2.4mm; }
.indice-extra { background: #fff; border: 1px solid #dbe3f3; border-radius: 12px; padding: 2.6mm 3mm; }
.indice-icone { width: 5.4mm; height: 5.4mm; color: var(--destaque); }
.indice-extra h3 { font-family: Nunito, Arial, sans-serif; font-size: 9.6pt; font-weight: 800; line-height: 1.2; margin: 1.2mm 0 .6mm; }
.indice-extra p { font-size: 8.8pt; font-weight: 600; line-height: 1.3; }
.testes { margin: 2mm 0 0; padding-left: 6mm; display: flex; flex-direction: column; gap: 1.1mm; }
.testes li { font-size: 10.4pt; font-weight: 600; line-height: 1.4; color: var(--texto); padding-left: 1mm; }
.testes li::marker { font-family: 'Baloo 2', Arial, sans-serif; font-weight: 800; color: #9a6400; }
.momentos { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr); align-items: stretch; gap: 2mm; }
.momento { background: #fff; border: 1px solid #dbe3f3; border-radius: 14px; padding: 3mm 3mm 3.2mm; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 2mm; }
.momento h3 { font-size: 12pt; }
.momento-cena { display: block; width: 100%; aspect-ratio: 214 / 114; border-radius: 10px; }
.figura-cena { margin: 0; background: #fff; border: 1px solid #dbe3f3; border-radius: 16px; padding: 2.6mm; }
.figura-cena-arte { height: 74mm; border-radius: 10px; background-size: 115% auto; background-position: 50% 22%; }
.figura-cena figcaption { font-size: 10pt; font-weight: 700; color: var(--tinta); text-align: center; margin-top: 2mm; }
.momentos--casos { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3mm; }
.momento-valor { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 1mm 1.6mm; font-size: 9.4pt; font-weight: 800; color: var(--tinta); }
.momento-valor .bk-valor { font-size: 9.4pt; font-weight: 800; }
.momento p { font-size: 9.8pt; font-weight: 700; line-height: 1.35; text-wrap: balance; }
.momento-seta { display: grid; place-items: center; color: var(--destaque); }
.momento-seta-icone { width: 6mm; height: 6mm; transform: rotate(-90deg); stroke-width: 2.6; }
/* A arte da Ponte termina em areia à esquerda: o degradê é mais longo para a areia sumir no mar. */
.capa--ponte .capa-painel::before { height: 180px; opacity: 1; background: linear-gradient(to bottom, #5a7bd000, #5a7bd0cc 70%, #5a7bd0); }
/* A abertura com as cenas das duas aulas cabe numa folha. */
[data-id="p1"] .content { gap: 3mm; }
[data-id="p1"] .faixa-arte { height: 31mm; }
[data-id="p1"] .cartao { padding: 3.2mm 4.6mm; }
/* Folhas que passavam do limite por pouco: só elas ficam mais juntas. */
[data-id="alavanca-encontro"] .content, [data-id="sobe-fim"] .content, [data-id="atravessar"] .content, [data-id="ilha-encontro"] .content { gap: 2.6mm; }
[data-id="alavanca-encontro"] .cabecalho, [data-id="sobe-fim"] .cabecalho { min-height: 36mm; }
[data-id="atravessar"] .esquema-painel > * { zoom: .92; }
/* A cena do cabeçalho acompanha a altura do texto, sem esticar a folha. */
.cabecalho-cena { position: relative; overflow: hidden; }
.cabecalho-cena img { position: absolute; inset: 0; }
/* Na Aula 2, o cabeçalho aproxima a cena do laguinho. */
.aula-3d .cabecalho-cena img { transform: scale(1.5); transform-origin: 26% 40%; }
`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${ui.titulo}</title><style>${cssDoCaderno(fontes)}\n${cursoCss}</style></head><body>${cover}${body}</body></html>`
if (html.includes('{{')) throw new Error('Campo do caderno sem preencher.')
const pasta = 'tmp/pdfs/a-ponte-apressada'
const out = resolve(root, pasta)
mkdirSync(out, { recursive: true })
writeFileSync(resolve(out, 'caderno.html'), html)
writeFileSync(
  resolve(out, 'cores-estudio.json'),
  JSON.stringify(Object.fromEntries(B.usadas), null, 2),
)
console.log(`${total} páginas preparadas em ${pasta}/caderno.html`)
