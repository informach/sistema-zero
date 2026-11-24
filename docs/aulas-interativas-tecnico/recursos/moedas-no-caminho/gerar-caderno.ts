/**
 * Passo a passo do projeto de Moedas no caminho (Poder 1 do Faísca), na receita do caderno visual
 * (23/11/2026, `../caderno-visual/README.md`), no molde do gerador da Ilha do Farol.
 *
 * Todo texto que a criança lê mora em `caderno-conteudo.json`, que acompanha a aula real
 * (`qa/moedas-conteudo.ts` e os roteiros): aqui ficam só a composição, os desenhos dos encaixes
 * (com os rótulos que os blocos mostram no Estúdio, 2D na Aula 1 e 3D na Aula 2), a cena do jogo
 * 2D, o quadro do baú e a capa. A arte da capa (`caderno-visual/arte/capa-moedas-no-caminho.jpg`)
 * é a ilha do jogo com as moedas e o baú, renderizada com as peças publicadas por
 * `docs/design/moedas-no-caminho-capa/capa.py`. As folhas da Aula 1 levam no cabeçalho a cena do
 * jogo 2D, montada com as artes e os lugares do próprio jogo (`qa/moedas-projeto.ts`).
 *
 * Itens do conteúdo: `text`, `step` (título "N. …" vira passo numerado), `box` (com `tone`),
 * `note`, `activity` (com `pill`), `delivery` (o card escuro do envio, com `title` e `text`),
 * `index` (o "O que você vai fazer" da primeira folha), `investigate` (o card "O que investigar"
 * com a lista dos testes da experiência, em `goals`), `discoveries` (os cards do que a experiência
 * mostrou), `figure` (o quadro do baú, com os rótulos em `labels`) e `drawing` (com `name`, um dos
 * desenhos abaixo, `title`, o que já vem no projeto em `ready` e a explicação de cada ramo do Se em
 * `branches`). Em todo texto, `<br/>` separa parágrafos e um caminho da paleta em negrito
 * ("Jogo 2D &gt; …") ganha a cor de caminho. `{{pagina:<id>}}` vira o número da página.
 *
 * Gerar e conferir: `python docs/aulas-interativas-tecnico/recursos/desafio-farol/gerar-materiais.py moedas-no-caminho`.
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
import { BAU_2D, MOEDAS_2D, MOEDAS_AVISO, montarProjetoMoedas } from '../../qa/moedas-projeto'
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
  name?: string
  pill?: string
  goals?: string[]
  ready?: string[]
  branches?: string[]
  cards?: { icon: string; title: string; text: string }[]
  labels?: { coluna: string; linhas: string[]; fechado: string; aberto: string }
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
const arte = arteDoCurso('capa-moedas-no-caminho.jpg')
const svgUrl = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
const imagem = (nome: FarolAssetName) => svgUrl(farolSvg(nome))

// ── A cena do jogo 2D (cabeçalho da Aula 1) ─────────────────────────────────────────────────────
/** Uma arte do Farol no lugar e no tamanho do sprite, como o Jogo 2D desenha. */
const peca = (nome: FarolAssetName, r: { x: number; y: number; w: number; h: number }) => {
  const a = FAROL_ASSETS[nome]
  return `<svg x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" viewBox="0 0 ${a.width} ${a.height}">${a.body}</svg>`
}
/**
 * O jogo 2D do começo da Aula 1 com o placar da Parte 6: o cenário, a chave, o farol, as seis
 * moedas, o baú, o personagem, o aviso e o placar, nos lugares e com os textos do projeto da aula.
 */
function cena2d(): string {
  const ir = montarProjetoMoedas('2d', 'bau').ir as {
    behavior: {
      start: { type: string; varName?: string; name?: string; value?: { value?: unknown } }[]
      loops: { body: { type: string; text?: { value?: unknown }; label?: string }[] }[]
    }
  }
  const aviso = ir.behavior.start.find((s) => s.type === 'var' && s.name === 'aviso')?.value?.value
  const quadro = ir.behavior.loops[0]?.body ?? []
  const dica = quadro.find((s) => s.type === 'g2d:drawLabel' && typeof s.text?.value === 'string')
    ?.text?.value
  const placar = quadro.find((s) => s.type === 'g2d:drawScore')?.label
  if (typeof aviso !== 'string' || typeof dica !== 'string' || !placar)
    throw new Error('O projeto 2D das Moedas mudou: confira a cena do cabeçalho.')
  const texto = (x: number, y: number, tamanho: number, conteudo: string) =>
    `<text x="${x}" y="${y}" font-family="Nunito, Arial, sans-serif" font-weight="800" font-size="${tamanho}" fill="#ffffff">${conteudo}</text>`
  const { palco } = FAROL_LAYOUT
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${palco.w * 2}" height="${palco.h * 2}" viewBox="0 0 ${palco.w} ${palco.h}">${peca('praia-tropical', { x: 0, y: 0, ...palco })}${peca('chave-dourada', FAROL_LAYOUT.chave)}${peca('farol-listrado-apagado', FAROL_LAYOUT.farol)}${MOEDAS_2D.map((m) => peca('moeda', { ...m, w: 24, h: 24 })).join('')}${peca('bau-fechado', BAU_2D)}${peca('aventureiro', FAROL_LAYOUT.personagem)}<rect x="8" y="8" width="464" height="28" fill="#143d35"/>${texto(20, 28, 16, aviso)}${peca('moeda', { x: 10, y: 42, w: 22, h: 22 })}${texto(38, 60, 20, `${placar} 0`)}${texto(12, 350, 13, dica)}</svg>`
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
/** O seletor de sprite do Jogo 2D mostra a miniatura da imagem ao lado do nome. */
const sprite = (nome: string) =>
  B.campo(nome, {
    miniatura:
      nome === 'personagem'
        ? 'pessoa'
        : imagem(({ moeda: 'moeda', bau: 'bau-fechado' } as const)[nome as 'moeda' | 'bau']),
  })
const variavel = (nome: string) => B.valor('sz_val_variable', `valor da variável ${lista(nome)}`)
const criarMoedas = () =>
  B.bloco('sz_js_var_create', `Criar variável ${B.campo('moedas')} com valor ${B.numero('0')}`)
const somar = () =>
  B.bloco('sz_js_var_increment', `Somar ${B.numero('1')} em variável ${lista('moedas')}`)
const aviso = (texto: string) =>
  B.bloco(
    'sz_js_var_assign',
    `Alterar variável ${lista('aviso')} para ${B.texto('sz_val_text', texto)}`,
  )
/** O Se do baú: moedas ≥ 5, com a resposta do sim no então e a do não no senão (os avisos do jogo). */
const seMoedas = (entao: string, explica: string[]) =>
  B.se(
    'sz_js_if_else',
    B.valor('sz_val_compare', `${variavel('moedas')} ${lista('≥')} ${B.numero('5')}`),
    [
      { rotulo: 'então', explica: explica[0], corpo: entao + aviso(MOEDAS_AVISO.abriu) },
      { rotulo: 'senão', explica: explica[1], corpo: aviso(MOEDAS_AVISO.falta) },
    ],
  )

/** O que já vem no projeto, com o texto do conteúdo, na cor do bloco onde fica. */
const pronto = (item: Item, i: number, tipo: string) => {
  const texto = item.ready?.[i]
  if (!texto) throw new Error(`O desenho ${item.name} precisa do texto ${i + 1} em "ready".`)
  return B.pronto(texto, B.cor(tipo))
}
const ramos = (item: Item) => {
  if (item.branches?.length !== 2) throw new Error(`O desenho ${item.name} precisa de "branches".`)
  return item.branches
}

// Os desenhos dos encaixes. O conteúdo escolhe onde cada um entra e dá os textos dele.
const drawings: Record<string, { area: string; corpo: (item: Item) => string }> = {
  contador: {
    area: 'Ao iniciar',
    corpo: (item) => B.area('Ao iniciar', pronto(item, 0, 'sz_frame_start') + criarMoedas()),
  },
  'coleta-2d': {
    area: 'Quando acontecer',
    corpo: (item) =>
      B.area(
        'Quando acontecer',
        pronto(item, 0, 'sz_frame_events') +
          B.comBoca(
            'sz_g2d_on_touch_group',
            `Quando o sprite ${sprite('personagem')} começar a encostar em algum do grupo ${lista('moedasDoCaminho')}, chamando de ${B.campo('moeda')}`,
            B.bloco(
              'sz_g2d_remove_from_group',
              `Tirar o sprite ${sprite('moeda')} do grupo ${lista('moedasDoCaminho')}`,
            ) + somar(),
          ),
      ),
  },
  'placar-2d': {
    area: 'Enquanto estiver rodando',
    corpo: (item) =>
      B.area(
        'Enquanto estiver rodando',
        B.comBoca(
          'sz_g2d_update_each_frame',
          'A cada quadro do jogo',
          pronto(item, 0, 'sz_g2d_update_each_frame') +
            B.bloco(
              'sz_g2d_draw_score',
              `Mostrar placar ${B.campo('Moedas:')} valor ${variavel('moedas')} em x ${B.numero('38')} y ${B.numero('60')} cor <span class="bk-cor"></span> tamanho ${B.numero('20')}`,
            ),
        ),
      ),
  },
  'bau-2d': {
    area: 'Quando acontecer',
    corpo: (item) =>
      B.area(
        'Quando acontecer',
        pronto(item, 0, 'sz_frame_events') +
          B.comBoca(
            'sz_g2d_on_overlap',
            `Quando o sprite ${sprite('personagem')} começar a encostar no sprite ${sprite('bau')}`,
            seMoedas(
              B.bloco(
                'sz_g2d_set_image',
                `Trocar imagem do sprite ${sprite('bau')} para ${B.campo('bau-aberto', { lista: true, miniatura: imagem('bau-aberto') })}`,
              ),
              ramos(item),
            ),
          ),
      ),
  },
  'coleta-3d': {
    area: 'Ao iniciar e Quando acontecer',
    corpo: (item) =>
      B.area('Ao iniciar', pronto(item, 0, 'sz_frame_start') + criarMoedas()) +
      B.area(
        'Quando acontecer',
        pronto(item, 1, 'sz_frame_events') +
          B.comBoca(
            'sz_g3d_on_touch_group',
            `Quando ${lista('personagem')} encostar em algum do grupo ${lista('moedasDoCaminho')}, chamando de ${B.campo('moeda')}`,
            B.bloco('sz_g3d_remove_object', `Remover ${lista('moeda')} da cena ${lista('cena')}`) +
              somar(),
          ),
      ),
  },
  'placar-3d': {
    area: 'Enquanto estiver rodando',
    corpo: (item) =>
      B.area(
        'Enquanto estiver rodando',
        B.comBoca(
          'sz_g3d_animate',
          `A cada quadro da cena ${lista('cena')}`,
          pronto(item, 0, 'sz_g3d_animate') +
            B.bloco(
              'sz_g3d_hud_text',
              `Escrever na tela ${lista('↖ em cima, à esquerda')}: ${variavel('moedas')}`,
            ),
        ),
      ),
  },
  'bau-3d': {
    area: 'Quando acontecer',
    corpo: (item) =>
      B.area(
        'Quando acontecer',
        pronto(item, 0, 'sz_frame_events') +
          B.comBoca(
            'sz_g3d_on_touch',
            `Quando ${lista('personagem')} encostar em ${lista('bau')}`,
            seMoedas(
              B.bloco(
                'sz_g3d_play_animation',
                `Tocar a animação ${lista('abrir')} em ${lista('bau')} ${lista('uma vez')}`,
              ),
              ramos(item),
            ),
          ),
      ),
  },
}

// ── As peças de conteúdo próprias do curso ──────────────────────────────────────────────────────
/** O card "O que investigar", com os testes da tela da experiência numa lista. */
function investigate(item: Item): string {
  const testes = (item.goals ?? []).map((g) => `<li>${g}</li>`).join('')
  if (!testes) throw new Error('O card de investigar precisa dos testes em "goals".')
  return `<div class="cartao cartao--amarelo">${icone('olho', 'cartao-icone')}<div class="cartao-corpo"><h3>${item.title ?? ''}</h3>${paragrafos(item.text ?? '')}<ol class="testes">${testes}</ol></div></div>`
}

/** O que a experiência mostrou: a pergunta de cada card e a descoberta. */
function discoveries(item: Item): string {
  const cards = (item.cards ?? [])
    .map(
      (c) =>
        `<div class="descoberta">${icone(c.icon, 'descoberta-icone')}<div><h3>${c.title}</h3><p>${c.text}</p></div></div>`,
    )
    .join('')
  return `<div class="descobertas">${cards}</div>`
}

/** O quadro do baú: com 4, 5 e 6 moedas, o que cada pergunta responde (a regra da experiência). */
function figure(item: Item): string {
  const l = item.labels
  if (item.name !== 'bau' || !l || l.linhas.length !== 2) throw new Error('Figura desconhecida.')
  const quantias = [4, 5, 6]
  const abre = [(n: number) => n >= 5, (n: number) => n === 5]
  const cabeca = quantias
    .map((n) => `<div class="quadro-quantia"><img src="${imagem('moeda')}" alt="">${n}</div>`)
    .join('')
  const linhas = l.linhas
    .map(
      (rotulo, i) =>
        `<div class="quadro-pergunta">${rotulo}</div>${quantias
          .map((n) => {
            const aberto = abre[i]?.(n) ?? false
            return `<div class="quadro-bau quadro-bau--${aberto ? 'aberto' : 'fechado'}"><img src="${imagem(aberto ? 'bau-aberto' : 'bau-fechado')}" alt=""><span>${aberto ? l.aberto : l.fechado}</span></div>`
          })
          .join('')}`,
    )
    .join('')
  return `<figure class="quadro"><figcaption>${icone('lista', 'quadro-icone')}${item.title ?? ''}</figcaption><div class="quadro-grade"><div class="quadro-canto">${l.coluna}</div>${cabeca}${linhas}</div></figure>`
}

/** Card de cada caixa: o tom e o ícone seguem o que a caixa diz, como nas folhas de referência. */
function boxStyle(item: Item): { tom: 'azul' | 'amarelo'; icone: string } {
  const titulo = item.title ?? ''
  if (/^Preciso de ajuda/.test(titulo)) return { tom: 'azul', icone: 'ajuda' }
  if (/^Se mudar/.test(titulo)) return { tom: 'azul', icone: 'repetir' }
  if (/^E se/.test(titulo)) return { tom: 'azul', icone: 'ajuda' }
  if (/^Comemore/.test(titulo)) return { tom: 'amarelo', icone: 'medalha' }
  if (item.tone === 'experience') return { tom: 'amarelo', icone: 'setas' }
  if (item.tone === 'test') return { tom: 'amarelo', icone: 'controle' }
  return { tom: 'azul', icone: 'livro' }
}

function indexCards(item: Item): string {
  const tons = ['ambar', 'anil']
  const aulas = (item.days ?? [])
    .map(
      (d, i) =>
        `<div class="indice-dia indice-dia--${tons[i] ?? 'ambar'}"><div class="kicker">${d.kicker}</div><h3>${d.title}</h3><p>${d.text}</p><p class="indice-paginas">${d.pages}</p></div>`,
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
  if (item.kind === 'drawing') {
    const drawing = drawings[item.name ?? '']
    if (!drawing) throw new Error(`Desenho desconhecido: ${item.name}`)
    return B.esquema(item.title ?? '', drawing.area, drawing.corpo(item))
  }
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

/** A cor de cada folha segue a aula: âmbar no jogo 2D, anil na ilha em 3D. */
function tema(kicker: string): string {
  if (/^Aula 1/.test(kicker)) return 'tema-ambar'
  if (/^Aula 2/.test(kicker)) return 'tema-anil'
  return ''
}

const ui = {
  titulo: 'Passo a passo do projeto - Moedas no caminho',
  cena2dAlt: 'O jogo 2D das moedas no caminho do Farol',
  cena3dAlt: 'As moedas e o baú na Ilha do Farol, em três dimensões',
  curso: 'Moedas no caminho',
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
          enquadre: doisD ? 'center 62%' : '42% 48%',
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
  linha1: 'Moedas',
  linha2: 'no caminho',
  frase: 'Todos os passos para contar as moedas do seu jogo em 2D e em 3D.',
  fraseBaixo: 'Da primeira moeda ao baú aberto.',
  tema: 'capa--moedas',
})
const body = montadas
  .map((sheet, index) => withPages(sheet.html(`${index + 2} / ${total}`)))
  .join('\n')
// Cores das Moedas: o ouro das moedas no destaque, o azul do mar da ilha no caminho e no painel da
// capa, e a faixa no laranja escuro da borda da moeda.
const cursoCss = `
body { --fundo: #fcfaf4; --tinta: #23264d; --texto: #44495c; --destaque: #a35f00; --destaque-claro: #fdf1d6; --caminho: #2f5fd0;
  --entrega-fundo: #2b3290; --entrega-borda: #2b3290; --entrega-texto: #ffffff; --entrega-rotulo: #ffc83d; --entrega-forte: #ffc83d; }
.tema-anil { --destaque: #3946b0; --destaque-claro: #e7e9fb; }
.capa--moedas { --capa-painel: #6387d5; --capa-painel-fundo: linear-gradient(#6387d5, #3f51ad 32%, #262d78 72%, #1c2058); --capa-amarelo: #ffc83d; --capa-frase: #e6ebff; --selo-fundo: #c9650a; --selo-topo: 608px; --selo-altura: 62px; --selo-largura: 534px; --selo-letra: 27px; --titulo-topo: 692px; --frase-largura: 440px; }
.abertura { margin-bottom: 4mm; }
.abertura h2 { font-size: 28pt; margin: 1mm 0 1mm; }
.abertura p { font-size: 13pt; font-weight: 800; color: var(--tinta); }
.abertura-faixa { margin-top: 3mm; background: #fff; border: 1px solid #ece4d2; border-radius: 16px; padding: 3mm; box-shadow: 0 4px 14px #3a2a0a10; }
.abertura-faixa-arte { height: 37mm; border-radius: 10px; background-size: 100% auto; background-position: 50% 54.5%; }
/* Na ilha, o cabeçalho aproxima a trilha: o aventureiro, as moedas, o baú e o farol. */
.tema-anil .cabecalho-cena { overflow: hidden; }
.tema-anil .cabecalho-cena img { transform: scale(1.38); transform-origin: 71% 39%; }
/* O caminho da paleta não quebra no meio: a criança lê "Programação > Valores" de uma vez. */
.caminho { white-space: nowrap; }
.indice-dias { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3mm; }
.indice-dia { border-radius: 14px; padding: 3mm 4mm; border: 1px solid; }
.indice-dia h3 { font-size: 13pt; margin: 1mm 0 1.4mm; }
.indice-dia p { font-size: 10pt; font-weight: 600; line-height: 1.4; }
.indice-dia .indice-paginas { margin-top: 2mm; font-weight: 700; }
.indice-dia--ambar { background: #fdf1d6; border-color: #f0d9a2; --destaque: #a36a00; }
.indice-dia--anil { background: #e7e9fb; border-color: #cdd2f4; --destaque: #3946b0; }
.indice-extras { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2.4mm; }
.indice-extra { display: flex; gap: 2.4mm; align-items: flex-start; background: #fff; border: 1px solid #ece4d2; border-radius: 12px; padding: 2.6mm 3mm; }
.indice-icone { flex: none; width: 5.4mm; height: 5.4mm; color: var(--destaque); }
.indice-extra h3 { font-family: Nunito, Arial, sans-serif; font-size: 9.6pt; font-weight: 800; line-height: 1.2; margin: 0 0 .6mm; }
.indice-extra p { font-size: 8.8pt; font-weight: 600; line-height: 1.3; }
.testes { margin: 1.6mm 0 0; padding-left: 5.4mm; color: var(--texto); }
.testes li { font-size: 10.2pt; line-height: 1.42; font-weight: 600; padding-left: .8mm; }
.testes li + li { margin-top: .9mm; }
.testes li::marker { color: #9a6400; font-weight: 800; }
.descobertas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2.6mm; }
.descoberta { display: flex; gap: 3mm; align-items: flex-start; background: #fff; border: 1px solid #ece4d2; border-radius: 12px; padding: 3mm 3.6mm; }
.descoberta-icone { flex: none; width: 5.6mm; height: 5.6mm; color: var(--destaque); margin-top: .4mm; }
.descoberta h3 { font-family: Nunito, Arial, sans-serif; font-size: 10.2pt; font-weight: 800; line-height: 1.25; margin-bottom: .8mm; }
.descoberta p { font-size: 10.2pt; font-weight: 700; line-height: 1.35; color: var(--destaque); }
.quadro { margin: 0; background: #fff; border: 1px solid #ece4d2; border-radius: 16px; padding: 3.6mm 4.4mm 4mm; }
.quadro figcaption { display: flex; align-items: center; gap: 2.4mm; font-family: 'Baloo 2', Arial, sans-serif; font-size: 13pt; font-weight: 800; color: var(--tinta); margin-bottom: 2.6mm; }
.quadro-icone { width: 5.4mm; height: 5.4mm; color: var(--destaque); flex: none; }
.quadro-grade { display: grid; grid-template-columns: 1.3fr repeat(3, minmax(0, 1fr)); gap: 2mm; align-items: stretch; }
.quadro-canto, .quadro-pergunta { display: flex; align-items: center; font-size: 10.4pt; font-weight: 800; color: var(--tinta); }
.quadro-canto { font-size: 9.4pt; color: #6b6f80; }
.quadro-quantia { display: flex; align-items: center; justify-content: center; gap: 1.6mm; font-family: 'Baloo 2', Arial, sans-serif; font-size: 15pt; font-weight: 800; color: var(--tinta); }
.quadro-quantia img { width: 6mm; height: 6mm; }
.quadro-bau { display: flex; flex-direction: column; align-items: center; gap: .6mm; border-radius: 10px; padding: 1.6mm 1mm 1.4mm; font-size: 9.6pt; font-weight: 800; }
.quadro-bau img { width: 12mm; height: 12mm; }
.quadro-bau--aberto { background: #fdf1d6; color: #8a5500; }
.quadro-bau--fechado { background: #eef0f4; color: #5a6578; }
.bk-cor { display: inline-block; width: 6mm; height: 5mm; border-radius: 4px; background: #ffffff; border: 1.5px solid #00000033; }
`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${ui.titulo}</title><style>${cssDoCaderno(fontes)}\n${cursoCss}</style></head><body>${cover}${body}</body></html>`
if (html.includes('{{')) throw new Error('Campo do caderno sem preencher.')
const pasta = 'tmp/pdfs/moedas-no-caminho'
const out = resolve(root, pasta)
mkdirSync(out, { recursive: true })
writeFileSync(resolve(out, 'caderno.html'), html)
writeFileSync(
  resolve(out, 'cores-estudio.json'),
  JSON.stringify(Object.fromEntries(B.usadas), null, 2),
)
console.log(`${total} páginas preparadas em ${pasta}/caderno.html`)
