/**
 * Passo a passo do projeto de O segredo da cabana (Poder 2 do Faísca), na receita do caderno
 * visual (23/11/2026, `../caderno-visual/README.md`), no molde do gerador da Ilha do Farol.
 *
 * Todo texto que a criança lê mora em `caderno-conteudo.json`: aqui ficam só a composição, as
 * cenas, os desenhos dos encaixes (com os rótulos que os blocos mostram no Estúdio: 2D na Aula 1,
 * 3D na Aula 2) e a capa. A arte da capa (`caderno-visual/arte/capa-o-segredo-da-cabana.jpg`) é a
 * ilha do jogo com a cabana, o emblema e a chave, renderizada com as peças publicadas por
 * `docs/design/o-segredo-da-cabana-capa/capa.py`. Nas folhas da Aula 1, o cabeçalho mostra a
 * praia do Farol do jogo 2D, montada com as mesmas artes e os mesmos lugares do projeto.
 *
 * O caderno acompanha a aula real (`qa/cabana-conteudo.ts`): cada folha de parte diz a sua seção
 * (`secao`), e o gerador confere que o "Aula N · Parte N" do kicker é o dessa seção, que o envio
 * fica só na parte de entrega e que os testes da experiência são os da tela.
 *
 * Itens do conteúdo: `text`, `step` (título "N. …" vira passo numerado), `box` (com `tone`),
 * `note`, `activity` (com `pill`), `delivery` (o card escuro de verificar e enviar), `drawing`
 * (com `name`, um dos desenhos abaixo, e `title`), `index` (o "O que você vai fazer" da abertura),
 * `views` (as cenas lado a lado), `investigate` (o que investigar, com `goals`) e `figure` (a
 * tabela das respostas da cabana). Em todo texto, `<br/>` separa parágrafos e um caminho da
 * paleta em negrito ("Jogo 2D &gt; …") ganha a cor de caminho. `{{pagina:<id>}}` vira o número
 * da página.
 *
 * Gerar e conferir: `bun gerar-caderno.ts` e depois `node renderizar-caderno.mjs` (as mesmas
 * conferências de `../desafio-farol/gerar-materiais.py`, mais um print de cada folha). Quando o
 * curso entrar na lista do `gerar-materiais.py`, ele também gera: `python
 * docs/aulas-interativas-tecnico/recursos/desafio-farol/gerar-materiais.py o-segredo-da-cabana`.
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
import { cabanaAulas, cabanaExperiencia } from '../../qa/cabana-conteudo'
import { CABANA_2D, CABANA_AVISO, EMBLEMA_2D } from '../../qa/cabana-projeto'
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

type Cena = '2d' | '2d-aberta' | '3d'
type Item = {
  kind: string
  title?: string
  text?: string
  tone?: string
  name?: string
  pill?: string
  days?: { kicker: string; title: string; text: string; pages: string }[]
  extras?: { icon: string; title: string; text: string }[]
  images?: { scene: Cena; caption: string }[]
  goals?: string[]
  columns?: string[]
  rows?: { op: 'e' | 'ou'; label: string; word: string }[]
  open?: string
  closed?: string
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

const root = resolve(import.meta.dir, '../../../..')
const conteudo = JSON.parse(
  readFileSync(resolve(import.meta.dir, 'caderno-conteudo.json'), 'utf8'),
) as Conteudo
const pages = conteudo.paginas
const fontes = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}
@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}`
const arte = arteDoCurso('capa-o-segredo-da-cabana.jpg')

// ── O caderno acompanha a aula real ──────────────────────────────────────────
for (const page of pages) {
  if (!page.secao) continue
  const m = page.kicker.match(/^Aula (\d+) · Parte (\d+) · /)
  const aula = m ? cabanaAulas[Number(m[1]) - 1] : undefined
  if (!m || !aula) throw new Error(`Kicker sem aula e parte: ${page.id}`)
  const parte = aula.trechos.findIndex((t) => t.key === page.secao) + 1
  if (parte !== Number(m[2]))
    throw new Error(`${page.id}: a seção ${page.secao} é a Parte ${parte} da aula, não a ${m[2]}.`)
  const envio = aula.trechos.find((t) => t.kind === 'delivery')?.key
  if (page.items.some((i) => i.kind === 'delivery') && page.secao !== envio)
    throw new Error(`${page.id}: o envio fica só na última construção (${envio}).`)
  for (const item of page.items)
    if (
      item.kind === 'investigate' &&
      JSON.stringify(item.goals) !== JSON.stringify(cabanaExperiencia.goals)
    )
      throw new Error(`${page.id}: o que investigar mudou na experiência (cabana-conteudo.ts).`)
}

// ── As cenas ─────────────────────────────────────────────────────────────────
const svgUrl = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
const imagem = (name: FarolAssetName) => svgUrl(farolSvg(name))
type Lugar = { x: number; y: number; w: number; h: number }
const peca = (name: FarolAssetName, l: Lugar) => {
  const a = FAROL_ASSETS[name]
  return `<svg x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" viewBox="0 0 ${a.width} ${a.height}">${a.body}</svg>`
}
/**
 * A praia do Farol do jogo 2D, com as artes e os lugares do projeto (`cabana-projeto.ts`). Aberta,
 * a cabana troca de imagem e o personagem fica ao lado dela. O recorte tira a faixa de cima e a de
 * baixo do palco, que o cabeçalho cortaria.
 */
function cena2d(aberta: boolean): string {
  const corpo = [
    peca('praia-tropical', { x: 0, y: 0, w: FAROL_LAYOUT.palco.w, h: FAROL_LAYOUT.palco.h }),
    peca('farol-listrado-apagado', FAROL_LAYOUT.farol),
    peca(aberta ? 'cabana-aberta' : 'cabana-fechada', CABANA_2D),
    ...(aberta ? [] : [peca('emblema', EMBLEMA_2D), peca('chave-dourada', FAROL_LAYOUT.chave)]),
    peca(
      'aventureiro',
      aberta ? { x: CABANA_2D.x + CABANA_2D.w, y: 254, w: 64, h: 64 } : FAROL_LAYOUT.personagem,
    ),
  ].join('')
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 36 480 300">${corpo}</svg>`,
  )
}
const CENAS: Record<Cena, { src: string; enquadre: string }> = {
  '2d': { src: cena2d(false), enquadre: 'center 60%' },
  '2d-aberta': { src: cena2d(true), enquadre: 'center 80%' },
  '3d': { src: arte, enquadre: 'center 30%' },
}

// ── Os blocos ────────────────────────────────────────────────────────────────
// As definições do Estúdio trazem a cor de cada tipo: as de Programação, as do Jogo 2D e as 3D.
const B = criarBlocos([
  ...FRAME_BLOCKS,
  ...JS_BLOCKS,
  ...VALUE_BLOCKS,
  ...gameTwoDBlocks,
  ...gameThreeDBlocks,
])
const lista = (valor: string) => B.campo(valor, { lista: true })
const bool = (valor: string) => B.valor('sz_val_bool', lista(valor))
const variavel = (nome: string) => B.valor('sz_val_variable', `valor da variável ${lista(nome)}`)
const alterar = (nome: string, valor: string) =>
  B.bloco('sz_js_var_assign', `Alterar variável ${lista(nome)} para ${valor}`)
const aviso = (texto: string) => alterar('aviso', B.texto('sz_val_text', texto))
const criarTemEmblema = () =>
  B.bloco('sz_js_var_create', `Criar variável ${B.campo('temEmblema')} com valor ${bool('falso')}`)
const guardarEmblema = () => alterar('temEmblema', bool('verdadeiro')) + aviso(CABANA_AVISO.emblema)
/** A pergunta da cabana: o bloco que tem a palavra "e" no meio, com as duas variáveis. */
const pergunta = () =>
  B.valor('sz_val_logic', `${variavel('temChave')} ${lista('e')} ${variavel('temEmblema')}`)
/** O lugar ao lado de Se, vazio depois que a pergunta x maior que 0 vai para a lixeira. */
const semPergunta = () =>
  '<span class="bk-vazio bk-vazio--valor">lugar vazio: a pergunta da cabana</span>'
const seCabana = (condicao: string, entao: string, senao?: string) =>
  B.se('sz_js_if_else', condicao, [
    { rotulo: 'então', explica: 'quando a resposta é sim', corpo: entao },
    ...(senao ? [{ rotulo: 'senão', explica: 'quando a resposta é não', corpo: senao }] : []),
  ])
/**
 * Antes de abrir o senão, a linha de baixo do Se mostra os dois sinais de mais ("+ senão se
 * + senão", `ifElseMutator.ts`); o desenho comum mostra o Se com o senão aberto ("+ senão se −").
 */
const PE_COM_SENAO = '<div class="bk-boca-pe bk-boca-pe--se">+ senão se −</div>'
function semSenao(html: string): string {
  if (!html.includes(PE_COM_SENAO)) throw new Error('O pé do Se mudou em caderno-visual/visual.ts.')
  return html.replace(PE_COM_SENAO, PE_COM_SENAO.replace('−', '+ senão'))
}
const vazio = (resposta: string) => B.vazio(`a resposta do ${resposta}: você monta daqui a pouco`)
const corDoInicio = () => B.cor('sz_frame_start')
const corDosEventos = () => B.cor('sz_frame_events')

// No 2D, os campos de sprite mostram o desenho do sprite, como no Estúdio.
const MINIATURA: Record<string, string> = {
  personagem: 'pessoa',
  emblema: imagem('emblema'),
  cabana: imagem('cabana-fechada'),
}
const sprite = (nome: string) => B.campo(nome, { miniatura: MINIATURA[nome] })
/** Os encontros, com a palavra "fazer" à esquerda da boca, como no Estúdio. */
const encontro2d = (outro: string, corpo: string) =>
  B.comBoca(
    'sz_g2d_on_overlap',
    `Quando o sprite ${sprite('personagem')} começar a encostar no sprite ${sprite(outro)}`,
    corpo,
  )
const encontro3d = (outro: string, corpo: string) =>
  B.comBoca('sz_g3d_on_touch', `Quando ${lista('personagem')} encostar em ${lista(outro)}`, corpo)
const quandoAcontecer = (antes: string, corpo: string) =>
  B.area('Quando acontecer', B.pronto(antes, corDosEventos()) + corpo)
const abrir2d = () =>
  B.bloco(
    'sz_g2d_set_image',
    `Trocar imagem do sprite ${sprite('cabana')} para ${lista('cabana-aberta')}`,
  )
const abrir3d = () =>
  B.bloco(
    'sz_g3d_play_animation',
    `Tocar a animação ${lista('abrir')} em ${lista('cabana')} ${lista('uma vez')}`,
  )
/** A cabana em cada passo da montagem: o Se esperando a pergunta, a pergunta e as respostas. */
const seSemPergunta = () => semSenao(seCabana(semPergunta(), vazio('sim')))
const comPergunta = () => seCabana(pergunta(), vazio('sim'), vazio('não'))
const respostas = (abrir: string) =>
  seCabana(pergunta(), abrir + aviso(CABANA_AVISO.abriu), aviso(CABANA_AVISO.falta))
const esconderEmblema = () =>
  B.bloco('sz_g3d_set_visible', `${lista('Esconder')} o objeto ${lista('emblema')}`)
const destruirEmblema = () =>
  B.bloco('sz_g2d_destroy_sprite', `Destruir o sprite ${sprite('emblema')}`)
const EVENTOS_2D = 'Os encontros com a chave e com o farol e o evento da tecla R'
const EVENTOS_3D = 'O evento da tecla R e os encontros com a chave e com o farol'
const OUTROS_EVENTOS = 'Os outros eventos e o encontro com o emblema'

// Os desenhos dos encaixes. O conteúdo escolhe onde cada um entra e dá o título dele.
const drawings: Record<string, { area: string; corpo: () => string }> = {
  'variavel-2d': {
    area: 'Ao iniciar',
    corpo: () =>
      B.area(
        'Ao iniciar',
        B.pronto('Os blocos que preparam o jogo, até o que cria o sprite cabana', corDoInicio()) +
          criarTemEmblema(),
      ),
  },
  'encontro-2d': {
    area: 'Quando acontecer',
    corpo: () => quandoAcontecer(EVENTOS_2D, encontro2d('emblema', destruirEmblema())),
  },
  'emblema-2d': {
    area: 'Quando acontecer',
    corpo: () =>
      quandoAcontecer(EVENTOS_2D, encontro2d('emblema', destruirEmblema() + guardarEmblema())),
  },
  'se-2d': {
    area: 'Quando acontecer',
    corpo: () => quandoAcontecer(OUTROS_EVENTOS, encontro2d('cabana', seSemPergunta())),
  },
  'pergunta-2d': {
    area: 'Quando acontecer',
    corpo: () => quandoAcontecer(OUTROS_EVENTOS, encontro2d('cabana', comPergunta())),
  },
  'porta-2d': {
    area: 'Quando acontecer',
    corpo: () => quandoAcontecer(OUTROS_EVENTOS, encontro2d('cabana', respostas(abrir2d()))),
  },
  'variavel-3d': {
    area: 'Ao iniciar',
    corpo: () =>
      B.area(
        'Ao iniciar',
        B.pronto('Os blocos que preparam a ilha, até Colocar o objeto cabana', corDoInicio()) +
          criarTemEmblema() +
          B.pronto('Os blocos que vêm depois, como antes', corDoInicio()),
      ),
  },
  'encontro-3d': {
    area: 'Quando acontecer',
    corpo: () => quandoAcontecer(EVENTOS_3D, encontro3d('emblema', esconderEmblema())),
  },
  'emblema-3d': {
    area: 'Quando acontecer',
    corpo: () =>
      quandoAcontecer(EVENTOS_3D, encontro3d('emblema', esconderEmblema() + guardarEmblema())),
  },
  'se-3d': {
    area: 'Quando acontecer',
    corpo: () => quandoAcontecer(OUTROS_EVENTOS, encontro3d('cabana', seSemPergunta())),
  },
  'pergunta-3d': {
    area: 'Quando acontecer',
    corpo: () => quandoAcontecer(OUTROS_EVENTOS, encontro3d('cabana', comPergunta())),
  },
  'porta-3d': {
    area: 'Quando acontecer',
    corpo: () => quandoAcontecer(OUTROS_EVENTOS, encontro3d('cabana', respostas(abrir3d()))),
  },
}

// ── As peças da página ───────────────────────────────────────────────────────
/** Card de cada caixa: o tom e o ícone seguem o que a caixa diz, como nas folhas de referência. */
function boxStyle(item: Item): { tom: 'azul' | 'amarelo' | 'lilas'; icone: string } {
  const titulo = item.title ?? ''
  if (/^Preciso de ajuda/.test(titulo)) return { tom: 'azul', icone: 'ajuda' }
  if (/^Comemore/.test(titulo)) return { tom: 'amarelo', icone: 'medalha' }
  if (/^Os dois jeitos/.test(titulo)) return { tom: 'lilas', icone: 'brilho' }
  // As perguntas da Debinha e do Dedé, respondidas como no vídeo.
  if (/\?$/.test(titulo)) return { tom: 'azul', icone: 'mensagem' }
  if (item.tone === 'experience') return { tom: 'amarelo', icone: 'setas' }
  if (item.tone === 'test') return { tom: 'amarelo', icone: 'controle' }
  return { tom: 'azul', icone: 'livro' }
}

function indexCards(item: Item): string {
  const tons = ['vermelho', 'azul']
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

/** As cenas lado a lado, com legenda: na abertura, o jogo 2D e a ilha em 3D. */
function views(item: Item): string {
  if (!item.images?.length) throw new Error('Item views sem imagens.')
  const figuras = item.images
    .map(
      (v) =>
        `<figure class="cabana-vista cabana-vista--${v.scene}"><div class="cabana-vista-img" role="img" aria-label="${conteudo.cenas[v.scene]}" style="background-image:url(${CENAS[v.scene].src})"></div><figcaption>${v.caption}</figcaption></figure>`,
    )
    .join('')
  return `<div class="cabana-vistas">${figuras}</div>`
}

/** O que investigar: a pergunta da experiência e os testes da tela, na ordem dos cartões. */
function investigate(item: Item): string {
  const testes = (item.goals ?? []).map((g) => `<li>${g}</li>`).join('')
  return `<div class="cartao cartao--amarelo">${icone('olho', 'cartao-icone')}<div class="cartao-corpo"><h3>${item.title ?? ''}</h3>${paragrafos(item.text ?? '')}<ol class="investigar">${testes}</ol></div></div>`
}

/**
 * A tabela das respostas da cabana: cada coluna é o que o personagem pegou, e cada linha é um
 * jeito de perguntar. A cabana abre quando a pergunta dá sim: com "e", as duas peças; com "ou",
 * uma basta.
 */
const PEGOU: readonly { chave: boolean; emblema: boolean }[] = [
  { chave: false, emblema: false },
  { chave: true, emblema: false },
  { chave: false, emblema: true },
  { chave: true, emblema: true },
]
function figure(item: Item): string {
  if (item.name !== 'respostas') throw new Error(`Figura desconhecida: ${item.name}`)
  const colunas = item.columns ?? []
  if (colunas.length !== PEGOU.length) throw new Error('A tabela das respostas tem quatro colunas.')
  const cabeca = colunas
    .map((c, i) => {
      const pegou = PEGOU[i] ?? { chave: false, emblema: false }
      const pecas = [
        pegou.chave ? `<img src="${imagem('chave-dourada')}" alt="">` : '',
        pegou.emblema ? `<img src="${imagem('emblema')}" alt="">` : '',
      ].join('')
      return `<th><span class="respostas-pecas">${pecas || '<span class="respostas-nada"></span>'}</span>${c}</th>`
    })
    .join('')
  const linhas = (item.rows ?? [])
    .map((r) => {
      const celulas = PEGOU.map(({ chave, emblema }) => {
        const abre = r.op === 'e' ? chave && emblema : chave || emblema
        return `<td class="${abre ? 'abre' : 'fechada'}"><img src="${imagem(abre ? 'cabana-aberta' : 'cabana-fechada')}" alt=""><span>${abre ? item.open : item.closed}</span></td>`
      }).join('')
      return `<tr><th>${r.label}<span class="respostas-palavra">${r.word}</span></th>${celulas}</tr>`
    })
    .join('')
  return `<figure class="respostas"><h3>${icone('lista', 'esquema-icone')}${item.title ?? ''}</h3><table><thead><tr><th></th>${cabeca}</tr></thead><tbody>${linhas}</tbody></table></figure>`
}

function renderItem(item: Item, page: Pagina, index: number): string {
  if (item.kind === 'drawing') {
    const drawing = drawings[item.name ?? '']
    if (!drawing) throw new Error(`Desenho desconhecido: ${item.name}`)
    return B.esquema(item.title ?? '', drawing.area, drawing.corpo())
  }
  if (item.kind === 'index') return indexCards(item)
  if (item.kind === 'views') return views(item)
  if (item.kind === 'investigate') return investigate(item)
  if (item.kind === 'figure') return figure(item)
  const text = item.text ?? ''
  if (item.kind === 'text')
    // Na folha da experiência, a ideia do vídeo abre a folha num card, antes do que investigar.
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

/** A cor de cada folha segue a aula: a Aula 1 (2D) no vermelho da cabana, a Aula 2 (3D) no azul. */
function tema(kicker: string): string {
  if (/^Aula 1/.test(kicker)) return 'tema-vermelho'
  if (/^Aula 2/.test(kicker)) return 'tema-azul'
  return ''
}

// ── As folhas ────────────────────────────────────────────────────────────────
const montadas = pages.map((page) => {
  const body = page.items.map((item, i) => renderItem(item, page, i)).join('')
  const cena = CENAS[page.scene ?? '3d']
  const topo =
    page.id === 'p1'
      ? // A primeira folha apresenta o curso: título grande e as cenas, sem cabeçalho.
        `<div class="abertura"><div class="kicker">${page.kicker}</div><h2>${page.title}</h2><p>${page.subtitle}</p></div>`
      : cabecalho({
          cena: cena.src,
          alt: conteudo.cenas[page.scene ?? '3d'],
          kicker: page.kicker,
          titulo: page.title,
          resumo: page.subtitle,
          enquadre: cena.enquadre,
        })
  return {
    id: page.id,
    html: (numero: string) =>
      `<section class="page ${tema(page.kicker)} cena-${page.scene ?? 'abertura'}" data-id="${page.id}"><div class="inner">${topo}<div class="content">${body}</div></div>${rodape(conteudo.curso, numero)}</section>`,
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
const cover = capaHtml({ arte, iconeSelo: 'mapa', ...conteudo.capa, tema: 'capa--cabana' })
const body = montadas
  .map((sheet, index) => withPages(sheet.html(`${index + 2} / ${total}`)))
  .join('\n')
// Cores da cabana: o vermelho do telhado, a madeira escura nos títulos, o azul do emblema no
// caminho e na faixa da capa, e o dourado da chave nos destaques.
const cursoCss = `
body { --fundo: #fbf8f4; --tinta: #3a1d12; --texto: #4a3f3a; --destaque: #b23b2b; --destaque-claro: #fbe5df; --caminho: #2d5fc4;
  --entrega-fundo: #8a2c20; --entrega-borda: #8a2c20; --entrega-texto: #ffffff; --entrega-rotulo: #ffd23f; --entrega-forte: #ffd23f; }
.capa--cabana { --capa-painel: #b8402f; --capa-painel-fundo: linear-gradient(#bd4332, #6b2017); --capa-amarelo: #ffd23f; --capa-frase: #ffe4da; --selo-fundo: #2d5fc4; --selo-topo: 608px; --selo-altura: 62px; --selo-largura: 534px; --selo-letra: 27px; --titulo-topo: 692px; --frase-largura: 470px; }
.abertura { margin-bottom: 4mm; }
.abertura h2 { font-size: 28pt; margin: 1mm 0 1mm; }
.abertura p { font-size: 13pt; font-weight: 800; color: var(--tinta); }
.cabana-vistas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3mm; }
.cabana-vista { margin: 0; background: #fff; border: 1px solid #eadfd8; border-radius: 16px; padding: 2.6mm; box-shadow: 0 4px 14px #3a1d1210; }
.cabana-vista-img { height: 33mm; border-radius: 10px; background-size: cover; background-position: center 100%; }
.cabana-vista--3d .cabana-vista-img { background-size: 160% auto; background-position: 29% 21%; }
.cabana-vista figcaption { font-size: 9.8pt; font-weight: 800; color: var(--tinta); text-align: center; margin-top: 1.6mm; }
.indice-dias { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3mm; }
.indice-dia { border-radius: 14px; padding: 3mm 4mm; border: 1px solid; }
.indice-dia h3 { font-size: 13pt; margin: 1mm 0 1.4mm; }
.indice-dia p { font-size: 10pt; font-weight: 600; line-height: 1.4; }
.indice-dia .indice-paginas { margin-top: 2mm; font-weight: 700; }
.indice-dia--azul { background: #e3eefa; border-color: #c8dcf0; --destaque: #0b5394; }
.indice-dia--vermelho { background: #fde8e8; border-color: #f4c8c8; --destaque: #c22a2a; }
.indice-extras { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2.4mm; }
.indice-extra { background: #fff; border: 1px solid #eadfd8; border-radius: 12px; padding: 2.6mm 3mm; }
.indice-icone { width: 5.4mm; height: 5.4mm; color: var(--destaque); }
.indice-extra h3 { font-family: Nunito, Arial, sans-serif; font-size: 9.6pt; font-weight: 800; line-height: 1.2; margin: 1.2mm 0 .6mm; }
.indice-extra p { font-size: 8.8pt; font-weight: 600; line-height: 1.3; }
.investigar { list-style: none; margin: 2.2mm 0 0; padding: 0; display: flex; flex-direction: column; gap: 1.6mm; counter-reset: teste; }
.investigar li { counter-increment: teste; display: flex; gap: 2.6mm; align-items: flex-start; font-size: 10.4pt; line-height: 1.4; font-weight: 700; color: var(--texto); }
.investigar li::before { content: counter(teste); flex: none; width: 6.2mm; height: 6.2mm; display: grid; place-items: center; border-radius: 50%; background: #fff; border: 1.5px solid #f0d9a2; color: #9a6400; font-family: 'Baloo 2', Arial, sans-serif; font-weight: 800; font-size: 10.4pt; }
.respostas { margin: 0; background: #fff; border: 1px solid #eadfd8; border-radius: 16px; padding: 3.6mm 4.4mm 3.2mm; }
.respostas h3 { display: flex; align-items: center; gap: 2.4mm; font-size: 13pt; margin-bottom: 2.6mm; }
.respostas table { width: 100%; border-collapse: separate; border-spacing: 2mm; table-layout: fixed; }
.respostas thead th { font-size: 9.6pt; font-weight: 800; color: var(--tinta); text-align: center; vertical-align: bottom; }
.respostas thead th:first-child { width: 30%; }
.respostas-pecas { display: flex; justify-content: center; align-items: center; gap: 1.4mm; height: 8mm; margin-bottom: 1mm; }
.respostas-pecas img { height: 7mm; }
.respostas-nada { width: 6.4mm; height: 6.4mm; border-radius: 50%; border: 1.6px dashed #b6a59b; }
.respostas tbody th { text-align: left; font-size: 10pt; font-weight: 800; color: var(--tinta); line-height: 1.25; }
.respostas-palavra { display: block; margin-top: 1mm; width: fit-content; border-radius: 999px; padding: .4mm 2.6mm; background: var(--destaque-claro); color: var(--destaque); font-size: 9pt; }
.respostas td { border-radius: 12px; padding: 1.6mm 1mm 1.4mm; text-align: center; font-size: 9.4pt; font-weight: 800; }
.respostas td img { display: block; height: 13mm; margin: 0 auto .8mm; }
.respostas td.abre { background: #e3f3ea; color: #087a54; }
.respostas td.fechada { background: #f3eeea; color: #7a6a60; }
.cabecalho-cena { background: #6f8fd8; }
.bk-vazio--valor { display: inline-block; padding: .7mm 3mm; border-radius: 999px; font-size: 9pt; }
/* No cabeçalho, a cena cobre a altura do texto (a arte 3D é mais alta que a 2D e esticaria o
   cabeçalho). Na 3D, a cena chega mais perto da cabana, das duas peças e do personagem. */
.cabecalho-cena { position: relative; overflow: hidden; }
.cabecalho-cena img { position: absolute; inset: 0; }
.cena-3d .cabecalho-cena img { transform: scale(1.35); transform-origin: 35% 30%; }
/* O Se inteiro da cabana é largo: nas folhas dele, o esquema fica um pouco menor, para a
   pergunta caber numa linha, como no Estúdio. */
[data-id="porta-2d-pergunta"] .esquema-painel > *, [data-id="porta-2d-respostas"] .esquema-painel > *,
[data-id="porta-3d-pergunta"] .esquema-painel > *, [data-id="porta-3d-respostas"] .esquema-painel > * { zoom: .86; }
/* Guarde e avise junta os dois últimos passos, o esquema, o teste e a verificação. */
[data-id="emblema-2d-guardar"] .content, [data-id="emblema-3d-guardar"] .content { gap: 3mm; }
[data-id="emblema-2d-guardar"] .cabecalho, [data-id="emblema-3d-guardar"] .cabecalho { min-height: 36mm; }
[data-id="emblema-2d-guardar"] .esquema-painel > *, [data-id="emblema-3d-guardar"] .esquema-painel > * { zoom: .9; }
`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Passo a passo do projeto - ${conteudo.curso}</title><style>${cssDoCaderno(fontes)}\n${cursoCss}</style></head><body>${cover}${body}</body></html>`
if (html.includes('{{')) throw new Error('Campo do caderno sem preencher.')
const pasta = 'tmp/pdfs/o-segredo-da-cabana'
const out = resolve(root, pasta)
mkdirSync(out, { recursive: true })
writeFileSync(resolve(out, 'caderno.html'), html)
writeFileSync(
  resolve(out, 'cores-estudio.json'),
  JSON.stringify(Object.fromEntries(B.usadas), null, 2),
)
console.log(`${total} páginas preparadas em ${pasta}/caderno.html`)
