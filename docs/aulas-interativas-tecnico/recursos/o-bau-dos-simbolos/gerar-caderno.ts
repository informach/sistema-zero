/**
 * Passo a passo do projeto de O baú dos símbolos (Poder 4 do Faísca), na receita do caderno visual
 * (23/11/2026, `../caderno-visual/README.md`), no molde do gerador de Moedas no caminho e da Ilha
 * do Farol.
 *
 * Todo texto que a criança lê mora em `caderno-conteudo.json`, que acompanha a aula real
 * (`qa/simbolos-conteudo.ts` e os roteiros): aqui ficam só a composição, os desenhos dos encaixes
 * (com os rótulos que os blocos mostram no Estúdio, 2D na Aula 1 e 3D na Aula 2), a cena do jogo
 * 2D, o quadro da senha e a capa. A arte da capa (`caderno-visual/arte/capa-o-bau-dos-simbolos.jpg`)
 * é a fileira do sol, da lua e da estrela na ilha, com o baú aberto, renderizada com as peças
 * publicadas por `docs/design/o-bau-dos-simbolos-capa/capa.py`. As folhas da Aula 1 levam no
 * cabeçalho a cena do jogo 2D, montada com as artes e os lugares do próprio jogo
 * (`qa/simbolos-projeto.ts`); as da Aula 2, a fileira da capa de perto.
 *
 * Itens do conteúdo: `text`, `step` (título "N. …" vira passo numerado), `box` (com `tone`),
 * `note`, `activity` (com `pill`), `delivery` (o card escuro do envio, com `title` e `text`),
 * `index` (o "O que você vai fazer" da primeira folha), `investigate` (o card "O que investigar"
 * com a lista dos testes da experiência, em `goals`), `discoveries` (os cards do que a experiência
 * mostrou), `figure` (o quadro da senha, com os rótulos em `senha`) e `drawing` (com `name`, um dos
 * desenhos abaixo, `title`, o que já vem no projeto em `ready` e a explicação de cada ramo do Se em
 * `branches`). Em todo texto, `<br/>` separa parágrafos e um caminho da paleta em negrito
 * ("Jogo 2D &gt; …") ganha a cor de caminho. `{{pagina:<id>}}` vira o número da página.
 *
 * Gerar e conferir: `python docs/aulas-interativas-tecnico/recursos/desafio-farol/gerar-materiais.py o-bau-dos-simbolos`
 * (o curso ainda precisa entrar na lista `outros` desse script) ou
 * `bun …/o-bau-dos-simbolos/gerar-caderno.ts && node …/o-bau-dos-simbolos/renderizar-caderno.mjs`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  FAROL_ASSETS,
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
  BAU_2D,
  montarProjetoSimbolos,
  PEDRAS_2D,
  PLACA_2D,
  SIMBOLOS,
  SIMBOLOS_AVISO,
  type Simbolo,
  type SimbolosDimensao,
} from '../../qa/simbolos-projeto'
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

type Senha = {
  inicio: string
  passos: { pergunta: string; resposta: string }[]
  fora: string
}
type Item = {
  kind: string
  title?: string
  text?: string
  tone?: string
  name?: string
  pill?: string
  goals?: string[]
  ready?: string[]
  branches?: string[]
  cards?: { icon: string; title: string; text: string }[]
  senha?: Senha
  days?: { kicker: string; title: string; text: string; pages: string }[]
  extras?: { icon: string; title: string; text: string }[]
}
type Page = { id: string; kicker: string; title: string; subtitle: string; items: Item[] }
const root = resolve(import.meta.dir, '../../../..')
const pages = JSON.parse(
  readFileSync(resolve(import.meta.dir, 'caderno-conteudo.json'), 'utf8'),
) as Page[]
const fontes = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}
@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}`
const arte = arteDoCurso('capa-o-bau-dos-simbolos.jpg')
const svgUrl = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
const imagem = (nome: FarolAssetName) => svgUrl(farolSvg(nome))

// ── A cena do jogo 2D (cabeçalho da Aula 1) ─────────────────────────────────────────────────────
/** Uma arte do Farol no lugar e no tamanho do sprite, como o Jogo 2D desenha. */
const peca = (nome: FarolAssetName, r: { x: number; y: number; w: number; h: number }) => {
  const a = FAROL_ASSETS[nome]
  return `<svg x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" viewBox="0 0 ${a.width} ${a.height}">${a.body}</svg>`
}
/**
 * O jogo 2D do começo da Aula 1: o cenário, a chave, o farol, a placa da ordem, as três pedras
 * apagadas, o baú fechado, o personagem, a faixa do aviso e a dica das teclas, nos lugares e com
 * os textos do projeto da aula.
 */
function cena2d(): string {
  type Expr = { type?: string; value?: unknown; name?: string }
  const ir = montarProjetoSimbolos('2d').ir as unknown as {
    behavior: {
      start: {
        type: string
        varName?: string
        name?: string
        value?: Expr
        x?: number
        y?: number
        w?: number
        h?: number
        color?: string
      }[]
      loops: { body: { type: string; text?: Expr; x?: number; y?: number; size?: number }[] }[]
    }
  }
  const inicio = ir.behavior.start
  const aviso = inicio.find((s) => s.type === 'var' && s.name === 'aviso')?.value?.value
  const faixa = inicio.find((s) => s.varName === 'fundoAviso')
  const quadro = ir.behavior.loops[0]?.body ?? []
  const rotulos = quadro.filter((s) => s.type === 'g2d:drawLabel')
  const doAviso = rotulos.find((s) => s.text?.type === 'var' && s.text.name === 'aviso')
  const dica = rotulos.find((s) => s.text?.type === 'str')
  if (
    typeof aviso !== 'string' ||
    !faixa?.color ||
    !doAviso ||
    typeof dica?.text?.value !== 'string'
  )
    throw new Error('O projeto 2D dos símbolos mudou: confira a cena do cabeçalho.')
  const texto = (s: { x?: number; y?: number; size?: number }, conteudo: string) =>
    `<text x="${s.x}" y="${s.y}" font-family="Nunito, Arial, sans-serif" font-weight="800" font-size="${s.size}" fill="#ffffff">${conteudo}</text>`
  const { palco } = FAROL_LAYOUT
  const pedras = SIMBOLOS.map((s) => peca(`pedra-${s}`, PEDRAS_2D[s])).join('')
  // A imagem não enxerga as fontes da página: a Nunito do jogo vai dentro dela, para o aviso
  // ocupar na cena a largura que ocupa no jogo.
  const fonte = `<defs><style>@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}</style></defs>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${palco.w * 2}" height="${palco.h * 2}" viewBox="0 0 ${palco.w} ${palco.h}">${fonte}${peca('praia-tropical', { x: 0, y: 0, ...palco })}${peca('chave-dourada', FAROL_LAYOUT.chave)}${peca('farol-listrado-apagado', FAROL_LAYOUT.farol)}${peca('placa-da-ordem', PLACA_2D)}${pedras}${peca('bau-fechado', BAU_2D)}${peca('aventureiro', FAROL_LAYOUT.personagem)}<rect x="${faixa.x}" y="${faixa.y}" width="${faixa.w}" height="${faixa.h}" fill="${faixa.color}"/>${texto(doAviso, aviso)}${texto(dica, dica.text.value)}</svg>`
  return svgUrl(svg)
}
const cena2D = cena2d()

// ── Os blocos ───────────────────────────────────────────────────────────────────────────────────
// As definições do Estúdio trazem a cor de cada tipo (os 2D em rosa, os 3D em tons de dourado).
const B = criarBlocos([
  ...FRAME_BLOCKS,
  ...JS_BLOCKS,
  ...VALUE_BLOCKS,
  ...gameTwoDBlocks,
  ...gameThreeDBlocks,
])
const lista = (valor: string) => B.campo(valor, { lista: true })
/** A imagem de cada sprite do jogo 2D, que o seletor de sprite mostra ao lado do nome. */
const IMAGEM_DO_SPRITE: Record<Simbolo | 'bau', FarolAssetName> = {
  sol: 'pedra-sol',
  lua: 'pedra-lua',
  estrela: 'pedra-estrela',
  bau: 'bau-fechado',
}
const sprite = (nome: Simbolo | 'bau' | 'personagem') =>
  B.campo(nome, { miniatura: nome === 'personagem' ? 'pessoa' : imagem(IMAGEM_DO_SPRITE[nome]) })
const variavel = (nome: string) => B.valor('sz_val_variable', `valor da variável ${lista(nome)}`)
const criarPasso = () =>
  B.bloco('sz_js_var_create', `Criar variável ${B.campo('passo')} com valor ${B.numero('0')}`)
const mudaPasso = (n: string) =>
  B.bloco('sz_js_var_assign', `Alterar variável ${lista('passo')} para ${B.numero(n)}`)
const aviso = (texto: string) =>
  B.bloco(
    'sz_js_var_assign',
    `Alterar variável ${lista('aviso')} para ${B.texto('sz_val_text', texto)}`,
  )

/** O que muda de uma dimensão para a outra: o encontro e como as pedras e o baú mudam. */
type Dimensao = {
  encontro: (com: Simbolo, corpo: string) => string
  acende: (s: Simbolo) => string
  apaga: (s: Simbolo) => string
  abreBau: () => string
}
const troca = (s: Simbolo | 'bau', figura: FarolAssetName) =>
  B.bloco(
    'sz_g2d_set_image',
    `Trocar imagem do sprite ${sprite(s)} para ${B.campo(figura, { lista: true, miniatura: imagem(figura) })}`,
  )
const animacao = (clipe: string, objeto: string) =>
  B.bloco(
    'sz_g3d_play_animation',
    `Tocar a animação ${lista(clipe)} em ${lista(objeto)} ${lista('uma vez')}`,
  )
const DIMENSAO: Record<SimbolosDimensao, Dimensao> = {
  '2d': {
    encontro: (com, corpo) =>
      B.comBoca(
        'sz_g2d_on_overlap',
        `Quando o sprite ${sprite('personagem')} começar a encostar no sprite ${sprite(com)}`,
        corpo,
      ),
    acende: (s) => troca(s, `pedra-${s}-acesa`),
    apaga: (s) => troca(s, `pedra-${s}`),
    abreBau: () => troca('bau', 'bau-aberto'),
  },
  '3d': {
    encontro: (com, corpo) =>
      B.comBoca(
        'sz_g3d_on_touch',
        `Quando ${lista('personagem')} encostar em ${lista(com)}`,
        corpo,
      ),
    acende: (s) => animacao('acender', s),
    apaga: (s) => animacao('apagar', s),
    abreBau: () => animacao('abrir', 'bau'),
  },
}

/** O que já vem no projeto, com o texto do conteúdo, na cor da área onde fica. */
const pronto = (item: Item, i: number, tipo: string) => {
  const texto = item.ready?.[i]
  if (!texto) throw new Error(`O desenho ${item.name} precisa do texto ${i + 1} em "ready".`)
  return B.pronto(texto, B.cor(tipo))
}
const ramos = (item: Item) => {
  if (item.branches?.length !== 2) throw new Error(`O desenho ${item.name} precisa de "branches".`)
  return item.branches
}
/** O recomeço do senão, igual na lua e na estrela: passo volta a 0, o sol e a lua apagam. */
const recomeco = (d: Dimensao) =>
  mudaPasso('0') + d.apaga('sol') + d.apaga('lua') + aviso(SIMBOLOS_AVISO.errou)
/** O Se de um símbolo: passo = n, com a resposta do sim no então e a do não no senão. */
const pergunta = (n: string, entao: string, senao: string, explica: string[]) =>
  B.se(
    'sz_js_if_else',
    B.valor('sz_val_compare', `${variavel('passo')} ${lista('=')} ${B.numero(n)}`),
    [
      { rotulo: 'então', explica: explica[0], corpo: entao },
      { rotulo: 'senão', explica: explica[1], corpo: senao },
    ],
  )

/**
 * O Se antes do senão (as partes da pergunta, 24/11/2026): só o então, e a linha de baixo ainda com
 * os dois sinais de mais ("+ senão se + senão", `ifElseMutator.ts`).
 */
const PE_COM_SENAO = '<div class="bk-boca-pe bk-boca-pe--se">+ senão se −</div>'
const perguntaSoEntao = (n: string, entao: string, explica: string) => {
  const html = B.se(
    'sz_js_if_else',
    B.valor('sz_val_compare', `${variavel('passo')} ${lista('=')} ${B.numero(n)}`),
    [{ rotulo: 'então', explica, corpo: entao }],
  )
  if (!html.includes(PE_COM_SENAO)) throw new Error('O pé do Se mudou em caderno-visual/visual.ts.')
  return html.replace(PE_COM_SENAO, PE_COM_SENAO.replace('−', '+ senão'))
}
const ramo = (item: Item) => {
  const r = item.branches?.[0]
  if (!r || item.branches?.length !== 1)
    throw new Error(`O desenho ${item.name} precisa de um ramo.`)
  return r
}

// Os desenhos dos encaixes. O conteúdo escolhe onde cada um entra e dá os textos dele.
function desenhos(dimensao: SimbolosDimensao) {
  const d = DIMENSAO[dimensao]
  const eventos = (item: Item, i: number, corpo: string) =>
    B.area('Quando acontecer', pronto(item, i, 'sz_frame_events') + corpo)
  return {
    // No 3D, Criar variável passo entra no meio de Ao iniciar (logo abaixo de Colocar o objeto
    // bau); no 2D, no fim dela.
    sol: {
      area: 'Ao iniciar e Quando acontecer',
      corpo: (item: Item) =>
        B.area(
          'Ao iniciar',
          pronto(item, 0, 'sz_frame_start') +
            criarPasso() +
            (dimensao === '3d' ? pronto(item, 1, 'sz_frame_start') : ''),
        ) +
        eventos(
          item,
          dimensao === '3d' ? 2 : 1,
          d.encontro('sol', mudaPasso('1') + d.acende('sol') + aviso(SIMBOLOS_AVISO.sol)),
        ),
    },
    lua: {
      area: 'Quando acontecer',
      corpo: (item: Item) =>
        eventos(
          item,
          0,
          d.encontro(
            'lua',
            pergunta(
              '1',
              mudaPasso('2') + d.acende('lua') + aviso(SIMBOLOS_AVISO.lua),
              recomeco(d),
              ramos(item),
            ),
          ),
        ),
    },
    luavez: {
      area: 'Quando acontecer',
      corpo: (item: Item) =>
        eventos(
          item,
          0,
          d.encontro(
            'lua',
            perguntaSoEntao(
              '1',
              mudaPasso('2') + d.acende('lua') + aviso(SIMBOLOS_AVISO.lua),
              ramo(item),
            ),
          ),
        ),
    },
    estrelavez: {
      area: 'Quando acontecer',
      corpo: (item: Item) =>
        eventos(
          item,
          0,
          d.encontro(
            'estrela',
            perguntaSoEntao(
              '2',
              d.acende('estrela') + d.abreBau() + aviso(SIMBOLOS_AVISO.abriu),
              ramo(item),
            ),
          ),
        ),
    },
    estrela: {
      area: 'Quando acontecer',
      corpo: (item: Item) =>
        eventos(
          item,
          0,
          d.encontro(
            'estrela',
            pergunta(
              '2',
              d.acende('estrela') + d.abreBau() + aviso(SIMBOLOS_AVISO.abriu),
              recomeco(d),
              ramos(item),
            ),
          ),
        ),
    },
  }
}
const DESENHOS = { '2d': desenhos('2d'), '3d': desenhos('3d') }
function drawing(item: Item): string {
  const [simbolo, dimensao] = (item.name ?? '').split('-') as [
    Simbolo | 'luavez' | 'estrelavez',
    SimbolosDimensao,
  ]
  const desenho = DESENHOS[dimensao]?.[simbolo]
  if (!desenho) throw new Error(`Desenho desconhecido: ${item.name}`)
  return B.esquema(item.title ?? '', desenho.area, desenho.corpo(item))
}

// ── As peças de conteúdo próprias do curso ──────────────────────────────────────────────────────
/** O card "O que investigar", com os testes da tela da experiência numa lista. */
function investigate(item: Item): string {
  const testes = (item.goals ?? []).map((g) => `<li>${g}</li>`).join('')
  if (!testes) throw new Error('O card de investigar precisa dos testes em "goals".')
  return `<div class="cartao cartao--amarelo">${icone('olho', 'cartao-icone')}<div class="cartao-corpo"><h3>${item.title ?? ''}</h3>${paragrafos(item.text ?? '')}<ol class="testes">${testes}</ol></div></div>`
}

/** O que a experiência mostrou: a pergunta de cada cartão da tela e a descoberta. */
function discoveries(item: Item): string {
  const cards = (item.cards ?? [])
    .map(
      (c) =>
        `<div class="descoberta">${icone(c.icon, 'descoberta-icone')}<div><h3>${c.title}</h3><p>${c.text}</p></div></div>`,
    )
    .join('')
  return `<div class="descobertas">${cards}</div>`
}

/**
 * O quadro da senha: do passo 0 do começo da partida, cada símbolo aceso na ordem da placa, a
 * pergunta dele e o que acontece na vez dele; embaixo, o que acontece fora da vez.
 */
function figure(item: Item): string {
  const l = item.senha
  if (item.name !== 'senha' || !l || l.passos.length !== SIMBOLOS.length)
    throw new Error('Figura desconhecida.')
  const seta = icone('seta', 'senha-seta')
  const passos = SIMBOLOS.map((s, i) => {
    const p = l.passos[i]
    const bau =
      s === 'estrela' ? `<img class="senha-bau" src="${imagem('bau-aberto')}" alt="">` : ''
    return `${seta}<div class="senha-passo"><div class="senha-figuras"><img src="${imagem(`pedra-${s}-acesa`)}" alt="">${bau}</div><span class="senha-pergunta">${p?.pergunta ?? ''}</span><b>${p?.resposta ?? ''}</b></div>`
  }).join('')
  return `<figure class="senha"><figcaption>${icone('lista', 'senha-icone')}${item.title ?? ''}</figcaption><div class="senha-trilha"><div class="senha-inicio"><span class="senha-zero">0</span><span>${l.inicio}</span></div>${passos}</div><p class="senha-fora">${icone('repetir', 'senha-fora-icone')}<span>${l.fora}</span></p></figure>`
}

/** Card de cada caixa: o tom e o ícone seguem o que a caixa diz, como nas folhas de referência. */
function boxStyle(item: Item): { tom: 'azul' | 'amarelo'; icone: string } {
  const titulo = item.title ?? ''
  if (/^Preciso de ajuda/.test(titulo)) return { tom: 'azul', icone: 'ajuda' }
  if (/^Se mudar/.test(titulo)) return { tom: 'azul', icone: 'repetir' }
  if (/^E |^No 3D/.test(titulo)) return { tom: 'azul', icone: 'ajuda' }
  if (/^Comemore/.test(titulo)) return { tom: 'amarelo', icone: 'medalha' }
  if (item.tone === 'experience') return { tom: 'amarelo', icone: 'setas' }
  if (item.tone === 'test') return { tom: 'amarelo', icone: 'controle' }
  return { tom: 'azul', icone: 'livro' }
}

function indexCards(item: Item): string {
  const tons = ['noite', 'ilha']
  const aulas = (item.days ?? [])
    .map(
      (d, i) =>
        `<div class="indice-dia indice-dia--${tons[i] ?? 'noite'}"><div class="kicker">${d.kicker}</div><h3>${d.title}</h3><p>${d.text}</p><p class="indice-paginas">${d.pages}</p></div>`,
    )
    .join('')
  const extras = (item.extras ?? [])
    .map(
      (e) =>
        `<div class="indice-extra">${icone(e.icon, 'indice-icone')}<div><h3>${e.title}</h3><p>${e.text}</p></div></div>`,
    )
    .join('')
  return `<h3 class="titulo-secao">${item.title ?? ''}</h3><p class="texto">${item.text ?? ''}</p><div class="indice-dias">${aulas}</div><div class="indice-extras">${extras}</div>`
}

function renderItem(item: Item, page: Page, index: number): string {
  if (item.kind === 'drawing') return drawing(item)
  if (item.kind === 'index') return indexCards(item)
  if (item.kind === 'investigate') return investigate(item)
  if (item.kind === 'discoveries') return discoveries(item)
  if (item.kind === 'figure') return figure(item)
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
  if (item.kind === 'delivery') return entrega(item.title ?? '', text)
  if (item.kind === 'box') {
    // "Verificar e continuar" fecha a folha no card escuro.
    if (item.tone === 'test' && /^Verificar/.test(item.title ?? ''))
      return entrega(item.title ?? '', text)
    return caixa({ ...boxStyle(item), titulo: item.title, html: text })
  }
  throw new Error(`Item desconhecido no caderno: ${item.kind}`)
}

/** A cor de cada folha segue a aula: o violeta da noite no jogo 2D, o verde da ilha em 3D. */
function tema(kicker: string): string {
  if (/^Aula 2/.test(kicker)) return 'tema-ilha'
  return ''
}

const ui = {
  titulo: 'Passo a passo do projeto - O baú dos símbolos',
  cena2dAlt: 'O jogo 2D dos símbolos no Farol: as três pedras, a placa da ordem e o baú',
  cena3dAlt: 'O sol, a lua e a estrela acesos na Ilha do Farol, com o baú aberto',
  curso: 'O baú dos símbolos',
}
const montadas = pages.map((page) => {
  const body = page.items.map((item, i) => renderItem(item, page, i)).join('')
  const doisD = /^Aula 1/.test(page.kicker)
  const topo =
    page.id === 'p1'
      ? // A primeira folha apresenta o curso: título grande e a faixa da arte, sem cabeçalho.
        `<div class="abertura"><div class="kicker">${page.kicker}</div><h2>${page.title}</h2><p>${page.subtitle}</p><div class="abertura-faixa"><div class="abertura-faixa-arte" role="img" aria-label="${ui.cena3dAlt}" style="background-image:url(${arte})"></div></div></div>`
      : cabecalho({
          cena: doisD ? cena2D : arte,
          alt: doisD ? ui.cena2dAlt : ui.cena3dAlt,
          kicker: page.kicker,
          titulo: page.title,
          resumo: page.subtitle,
          enquadre: doisD ? 'center 92%' : '30% 58%',
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
  iconeSelo: 'brilho',
  linha1: 'O baú dos',
  linha2: 'símbolos',
  frase: 'Todos os passos para programar a senha do baú no seu jogo em 2D e em 3D.',
  fraseBaixo: 'Do sol aceso ao baú aberto, na ordem certa.',
  tema: 'capa--simbolos',
})
const body = montadas
  .map((sheet, index) => withPages(sheet.html(`${index + 2} / ${total}`)))
  .join('\n')
/**
 * As folhas do desenho da lua, nas duas aulas: o Se com três blocos no então e quatro no senão,
 * mais o Verificar, passa da folha no tamanho comum. Só elas ganham os encaixes mais justos.
 */
const COMPACTAS = ['lua-blocos', 'lua-3d-blocos']
const naFolhaCompacta = (seletores: string) =>
  seletores
    .split(',')
    .flatMap((s) => COMPACTAS.map((id) => `[data-id="${id}"] ${s.trim()}`))
    .join(', ')
// Cores dos símbolos: o violeta da noite do sol, da lua e da estrela no destaque da Aula 1, o
// verde do gramado da ilha no da Aula 2, o azul do mar no caminho e no alto do painel da capa, o
// dourado das pedras acesas no título e nos destaques do envio, e a faixa no verde do gramado.
const cursoCss = `
body { --fundo: #fbfaff; --tinta: #241d52; --texto: #44465c; --destaque: #5b3cc0; --destaque-claro: #eee9fc; --caminho: #2f5fd0;
  --entrega-fundo: #2e2373; --entrega-borda: #2e2373; --entrega-texto: #ffffff; --entrega-rotulo: #ffd23f; --entrega-forte: #ffd23f; }
.tema-ilha { --destaque: #0b7a5a; --destaque-claro: #e0f2ea; }
.capa--simbolos { --capa-painel: #6c86d3; --capa-painel-fundo: linear-gradient(#6c86d3, #5a49b4 30%, #36257f 68%, #221852); --capa-amarelo: #ffd23f; --capa-frase: #ece8ff; --selo-fundo: #17865a; --selo-topo: 608px; --selo-altura: 62px; --selo-largura: 534px; --selo-letra: 27px; --titulo-topo: 692px; --frase-largura: 470px; }
.abertura { margin-bottom: 4mm; }
.abertura h2 { font-size: 28pt; margin: 1mm 0 1mm; }
.abertura p { font-size: 13pt; font-weight: 800; color: var(--tinta); }
.abertura-faixa { margin-top: 3mm; background: #fff; border: 1px solid #e6e1f3; border-radius: 16px; padding: 3mm; box-shadow: 0 4px 14px #24185210; }
.abertura-faixa-arte { height: 37mm; border-radius: 10px; background-size: 100% auto; background-position: 50% 53%; }
/* Na ilha, o cabeçalho aproxima a fileira: o sol, a lua, a estrela e o baú aberto. */
.tema-ilha .cabecalho-cena { overflow: hidden; }
.tema-ilha .cabecalho-cena img { transform: scale(1.5); transform-origin: 9% 66%; }
/* O caminho da paleta não quebra no meio: a criança lê "Programação > Valores" de uma vez. */
.caminho { white-space: nowrap; }
.indice-dias { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3mm; }
.indice-dia { border-radius: 14px; padding: 3mm 4mm; border: 1px solid; }
.indice-dia h3 { font-size: 13pt; margin: 1mm 0 1.4mm; }
.indice-dia p { font-size: 10pt; font-weight: 600; line-height: 1.4; }
.indice-dia .indice-paginas { margin-top: 2mm; font-weight: 700; }
.indice-dia--noite { background: #eee9fc; border-color: #d6ccf4; --destaque: #5b3cc0; }
.indice-dia--ilha { background: #e0f2ea; border-color: #bfe0cd; --destaque: #0b7a5a; }
.indice-extras { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2.4mm; }
.indice-extra { display: flex; gap: 2.4mm; align-items: flex-start; background: #fff; border: 1px solid #e6e1f3; border-radius: 12px; padding: 2.6mm 3mm; }
.indice-icone { flex: none; width: 5.4mm; height: 5.4mm; color: var(--destaque); }
.indice-extra h3 { font-family: Nunito, Arial, sans-serif; font-size: 9.6pt; font-weight: 800; line-height: 1.2; margin: 0 0 .6mm; }
.indice-extra p { font-size: 8.8pt; font-weight: 600; line-height: 1.3; }
.testes { margin: 1.6mm 0 0; padding-left: 5.4mm; color: var(--texto); }
.testes li { font-size: 10.2pt; line-height: 1.42; font-weight: 600; padding-left: .8mm; }
.testes li + li { margin-top: .9mm; }
.testes li::marker { color: #9a6400; font-weight: 800; }
.descobertas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2.6mm; }
.descoberta { display: flex; gap: 3mm; align-items: flex-start; background: #fff; border: 1px solid #e6e1f3; border-radius: 12px; padding: 3mm 3.6mm; }
.descoberta-icone { flex: none; width: 5.6mm; height: 5.6mm; color: var(--destaque); margin-top: .4mm; }
.descoberta h3 { font-family: Nunito, Arial, sans-serif; font-size: 10.2pt; font-weight: 800; line-height: 1.25; margin-bottom: .8mm; }
.descoberta p { font-size: 10.2pt; font-weight: 700; line-height: 1.35; color: var(--destaque); }
.senha { margin: 0; background: #fff; border: 1px solid #e6e1f3; border-radius: 16px; padding: 3.6mm 4.4mm 3.8mm; }
.senha figcaption { display: flex; align-items: center; gap: 2.4mm; font-family: 'Baloo 2', Arial, sans-serif; font-size: 13pt; font-weight: 800; color: var(--tinta); margin-bottom: 2.6mm; }
.senha-icone { width: 5.4mm; height: 5.4mm; color: var(--destaque); flex: none; }
.senha-trilha { display: flex; align-items: stretch; gap: 1.6mm; }
.senha-inicio, .senha-passo { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 1mm; border-radius: 12px; padding: 2.4mm 2mm; }
.senha-inicio { flex: .8; background: #f1f2f7; color: #5a6578; font-size: 9.4pt; font-weight: 700; line-height: 1.3; }
.senha-zero { display: grid; place-items: center; width: 11mm; height: 11mm; border-radius: 50%; background: #fff; border: 2px solid #c9cfdc; font-family: 'Baloo 2', Arial, sans-serif; font-size: 16pt; font-weight: 800; color: var(--tinta); }
.senha-passo { background: #fff6d8; }
.senha-figuras { display: flex; align-items: flex-end; justify-content: center; gap: 1mm; height: 13mm; }
.senha-figuras img { width: 13mm; height: 13mm; }
.senha-figuras .senha-bau { width: 11mm; height: 11mm; }
.senha-pergunta { font-size: 9.6pt; font-weight: 700; color: #6b5a2a; }
.senha-passo b { font-size: 10.4pt; color: var(--tinta); }
.senha-seta { flex: none; align-self: center; width: 5mm; height: 5mm; color: var(--destaque); transform: rotate(-90deg); }
.senha-fora { display: flex; align-items: center; gap: 2.4mm; margin-top: 2.6mm; font-size: 10.2pt; font-weight: 700; color: var(--texto); }
.senha-fora-icone { flex: none; width: 5mm; height: 5mm; color: var(--destaque); }
.bk-campo-mini { width: 5mm; height: 5mm; }
/* As folhas da lua: os encaixes mais justos, para o aviso caber numa linha só. */
${naFolhaCompacta('.esquema')} { padding: 3mm 3.6mm 2.2mm; }
${naFolhaCompacta('.esquema-painel')} { padding: 2.4mm 2.8mm 2.8mm; gap: 1.8mm; }
${naFolhaCompacta('.bk, .bk-boca-rotulo, .bk-chapeu')} { font-size: 9pt; }
${naFolhaCompacta('.bk')} { padding: 1.1mm 2.4mm; gap: 1.1mm; }
${naFolhaCompacta('.bk-boca-rotulo')} { min-width: 11.5mm; padding: 1.1mm 2.2mm; }
${naFolhaCompacta('.bk-pilha')} { gap: .7mm; }
${naFolhaCompacta('.bk-boca-meio > .bk-pilha')} { padding: .7mm 0 .7mm .8mm; }
${naFolhaCompacta('.bk-campo')} { padding: .4mm 1.8mm; }
${naFolhaCompacta('.bk-valor')} { padding: .5mm 1.4mm .5mm 2.4mm; gap: 1.1mm; }
${naFolhaCompacta('.bk-numero')} { min-width: 5.6mm; height: 5.6mm; padding: 0 1.6mm; }
${naFolhaCompacta('.bk-ramo, .bk-pronto, .bk-boca-pe--se')} { font-size: 8.6pt; }
`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${ui.titulo}</title><style>${cssDoCaderno(fontes)}\n${cursoCss}</style></head><body>${cover}${body}</body></html>`
if (html.includes('{{')) throw new Error('Campo do caderno sem preencher.')
const pasta = 'tmp/pdfs/o-bau-dos-simbolos'
const out = resolve(root, pasta)
mkdirSync(out, { recursive: true })
writeFileSync(resolve(out, 'caderno.html'), html)
writeFileSync(
  resolve(out, 'cores-estudio.json'),
  JSON.stringify(Object.fromEntries(B.usadas), null, 2),
)
console.log(`${total} páginas preparadas em ${pasta}/caderno.html`)
