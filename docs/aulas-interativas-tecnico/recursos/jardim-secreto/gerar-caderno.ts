/**
 * Passo a passo do projeto de O Jardim Secreto (a missão do Faísca), na receita do caderno visual
 * (23/11/2026, `../caderno-visual/README.md`), no molde dos geradores dos Poderes e da Ilha.
 *
 * Todo texto que a criança lê mora em `caderno-conteudo.json`: aqui ficam só a composição, as
 * cenas do jogo, os desenhos dos encaixes (com os rótulos que os blocos mostram no Estúdio, 2D na
 * Aula 1 e 3D na Aula 2) e a capa. O caderno acompanha a aula real (`qa/jardim-conteudo.ts` e os
 * roteiros): as construções na ordem do vídeo, uma folha por pedaço de cada parte, o envio na
 * última construção de cada aula (a posição do regador) e o quiz no fim da Aula 2. O Jardim não
 * tem experiência, nem página de Mural, nem as páginas "Conheça a plataforma".
 *
 * A arte da capa (`caderno-visual/arte/capa-o-jardim-secreto.jpg`) é a cena do jogo 3D com o
 * regador, o personagem e a flor aberta, renderizada com as peças publicadas por
 * `docs/design/o-jardim-secreto-capa/capa.py`. A cena da Aula 1 é o jogo 2D montado com as artes,
 * os lugares e os avisos do próprio projeto (`qa/jardim-projeto.ts`).
 *
 * Itens do conteúdo: `text`, `box` (com `tone` e `icon`), `note`, `step` (título "N. …" vira
 * passo numerado; sem número, um teste), `activity` (com `pill`), `delivery` (o card escuro que
 * fecha a folha), `drawing` (com `name`, um dos desenhos abaixo, `title` e, se tiver encaixe
 * vazio, `blank`), `index` (o "O que você vai fazer" da abertura), `faixa` (as cenas das duas
 * aulas), `casos` (os dois testes da flor, com a cena do jogo 2D, o valor de temRegador e o aviso)
 * e `cena` (a arte 3D com legenda). A capa é o item `{ "id": "capa", "capa": true, … }`. Em todo
 * texto, `<br/>` separa parágrafos e um caminho da paleta em negrito ("Jogo 2D &gt; …") ganha a
 * cor de caminho. `{{pagina:<id>}}` vira o número da página.
 *
 * Gerar: `bun docs/aulas-interativas-tecnico/recursos/jardim-secreto/gerar-caderno.ts` (o HTML em
 * `tmp/pdfs/jardim-secreto`). Conferir e fazer o PDF: `renderizar-caderno.mjs`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { JS_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/js'
import { VALUE_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/values'
import { gameTwoDBlocks } from '../../../../packages/studio/src/official-extensions/game-2d/blocks'
import { gameThreeDBlocks } from '../../../../packages/studio/src/official-extensions/game-3d/blocks'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'
import { JARDIM_ASSETS_2D, montarProjetoJardim } from '../../qa/jardim-projeto'
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
  days?: { kicker: string; title: string; text: string; pages: string }[]
  extras?: { icon: string; title: string; text: string }[]
  images?: { image: string; caption: string }[]
  cards?: { title: string; caso: string; text: string }[]
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
const arte = arteDoCurso('capa-o-jardim-secreto.jpg')
const svgUrl = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

// ── O que vem do projeto da aula ────────────────────────────────────────────────────────────────
// Os lugares, os tamanhos e os textos saem do próprio projeto (`jardim-projeto.ts`): se a aula
// mudar, o caderno muda junto, e um projeto com outra forma faz o gerador parar.
type Sprite = { varName: string; x: number; y: number; w: number; h: number; image: string }
type Stmt = {
  type: string
  varName?: string
  objVar?: string
  name?: string
  bVar?: string
  value?: { value?: unknown }
  x?: { value?: unknown }
  y?: { value?: unknown }
  z?: { value?: unknown }
  text?: { value?: unknown }
  body?: Stmt[]
  then?: Stmt[]
  else?: Stmt[]
}
type Ir = { behavior: { start: Stmt[]; events: Stmt[]; loops: Stmt[] } }
const projeto2d = (etapa: 'decisao' | 'posicao') =>
  montarProjetoJardim('2d', etapa).ir as unknown as Ir
const decisao2d = projeto2d('decisao')
const sprites = (ir: Ir) =>
  Object.fromEntries(
    ir.behavior.start
      .filter((s) => s.type === 'g2d:createImageSprite')
      .map((s) => [s.varName, s as unknown as Sprite]),
  ) as Record<string, Sprite | undefined>
const DO_PROJETO = sprites(decisao2d)
const REGADOR_NOVO = sprites(projeto2d('posicao')).regador
const dica = decisao2d.behavior.loops[0]?.body?.find(
  (s) => s.type === 'g2d:drawLabel' && typeof s.text?.value === 'string',
)?.text?.value
const encontros = decisao2d.behavior.events.filter((s) => s.type === 'g2d:onOverlap')
const daFlor = encontros.find((s) => s.bVar === 'flor')?.body?.[0]
const AVISOS = {
  inicio: decisao2d.behavior.start.find((s) => s.name === 'aviso')?.value?.value,
  pegou: encontros.find((s) => s.bVar === 'regador')?.body?.at(-1)?.value?.value,
  abriu: daFlor?.then?.at(-1)?.value?.value,
  falta: daFlor?.else?.[0]?.value?.value,
}
const regador3d = (montarProjetoJardim('3d', 'posicao').ir as unknown as Ir).behavior.start.find(
  (p) => p.type === 'g3d:setPosition' && p.objVar === 'regador',
)
const REGADOR_3D = [regador3d?.x?.value, regador3d?.y?.value, regador3d?.z?.value]
const { personagem: PERSONAGEM, regador: REGADOR, flor: FLOR } = DO_PROJETO
if (
  !PERSONAGEM ||
  !REGADOR ||
  !FLOR ||
  !REGADOR_NOVO ||
  typeof dica !== 'string' ||
  Object.values(AVISOS).some((t) => typeof t !== 'string') ||
  REGADOR_3D.some((v) => typeof v !== 'number')
)
  throw new Error('O projeto do Jardim mudou: confira as cenas e os desenhos do caderno.')
const aviso = AVISOS as Record<keyof typeof AVISOS, string>
/** O número como o campo do Estúdio mostra, com o sinal de menos tipográfico nos negativos. */
const comSinal = (v: unknown) => String(v).replace('-', '−')

// ── A cena do jogo 2D ───────────────────────────────────────────────────────────────────────────
const ARTE = Object.fromEntries(JARDIM_ASSETS_2D.map((a) => [a.name, a.dataUrl]))
const imagem = (nome: string) => {
  const src = ARTE[nome]
  if (!src) throw new Error(`Arte 2D do Jardim ausente: ${nome}`)
  return src
}
type Ponto = { x: number; y: number }
type Cena2d = {
  recorte?: string
  /** `meet` mostra o recorte inteiro e deixa o jardim em volta preencher o resto do quadro. */
  ajuste?: 'slice' | 'meet'
  regador?: Ponto | false
  flor?: 'flor-fechada' | 'flor-aberta'
  personagem?: Ponto
  /** O texto da faixa do aviso; `false` deixa a faixa e a dica de fora. */
  aviso?: string | false
}
/**
 * O jogo 2D na ordem do "A cada quadro do jogo": o cenário, o regador, a flor, o personagem, a
 * faixa e o texto do aviso e a dica de baixo. `recorte` é o pedaço do palco (o viewBox).
 */
function cena2d({
  recorte = '0 0 960 600',
  ajuste = 'slice',
  regador = REGADOR,
  flor = 'flor-fechada',
  personagem = PERSONAGEM,
  aviso: texto = aviso.inicio,
}: Cena2d = {}): string {
  const peca = (nome: string, x: number, y: number, w: number, h: number) =>
    `<image href="${imagem(nome)}" x="${x}" y="${y}" width="${w}" height="${h}"/>`
  const corpo = [
    peca('jardim-acolhedor', 0, 0, 960, 600),
    regador ? peca(REGADOR.image, regador.x, regador.y, REGADOR.w, REGADOR.h) : '',
    peca(flor, FLOR.x, FLOR.y, FLOR.w, FLOR.h),
    peca(PERSONAGEM.image, personagem.x, personagem.y, PERSONAGEM.w, PERSONAGEM.h),
    texto === false
      ? ''
      : `<rect x="12" y="12" width="936" height="38" fill="#264e45"/><text x="28" y="38" font-family="Nunito, Arial, sans-serif" font-weight="800" font-size="19" fill="#ffffff">${texto}</text><text x="480" y="585" text-anchor="middle" font-family="Nunito, Arial, sans-serif" font-weight="800" font-size="17" fill="#264e45">${dica}</text>`,
  ].join('')
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${recorte}" preserveAspectRatio="xMidYMid ${ajuste}">${corpo}</svg>`,
  )
}
/**
 * No cabeçalho da Aula 1, o pedaço do palco com o personagem, o regador e a flor, inteiro em
 * qualquer altura de cabeçalho: o recorte cabe no quadro, e o resto do jardim preenche a sobra.
 */
const cenaAula1 = cena2d({ recorte: '115 90 730 415', ajuste: 'meet', aviso: false })
/** Na abertura, a faixa larga do mesmo pedaço. */
const CENAS: Record<string, string> = {
  'jogo-2d': cena2d({ recorte: '90 150 790 290', aviso: false }),
  'jogo-3d': arte,
}
/** O personagem encostado na flor, nos dois testes da Parte 7. */
const NA_FLOR = { x: FLOR.x - PERSONAGEM.w + 8, y: FLOR.y + 30 }
const RECORTE_DOS_CASOS = '370 170 490 210'
const CASOS: Record<string, { cena: string; temRegador: string; aviso: string }> = {
  'sem-regador': {
    cena: cena2d({
      recorte: RECORTE_DOS_CASOS,
      regador: REGADOR_NOVO,
      personagem: NA_FLOR,
      aviso: false,
    }),
    temRegador: 'falso',
    aviso: aviso.falta,
  },
  'com-regador': {
    cena: cena2d({
      recorte: RECORTE_DOS_CASOS,
      regador: false,
      flor: 'flor-aberta',
      personagem: NA_FLOR,
      aviso: false,
    }),
    temRegador: 'verdadeiro',
    aviso: aviso.abriu,
  },
}

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
const numero = (valor: number | string) => B.numero(String(valor))
const bool = (valor: string) => B.valor('sz_val_bool', lista(valor))
const variavel = (nome: string) => B.valor('sz_val_variable', `valor da variável ${lista(nome)}`)
const criar = (nome: string) =>
  B.bloco('sz_js_var_create', `Criar variável ${B.campo(nome)} com valor ${bool('falso')}`)
const alterar = (nome: string, valor: string) =>
  B.bloco('sz_js_var_assign', `Alterar variável ${lista(nome)} para ${bool(valor)}`)
const avisa = (texto: string) =>
  B.bloco(
    'sz_js_var_assign',
    `Alterar variável ${lista('aviso')} para ${B.texto('sz_val_text', texto)}`,
  )
const corInicio = () => B.cor('sz_frame_start')
const corEventos = () => B.cor('sz_frame_events')
/** O Se da flor: no então, a flor abre e avisa; no senão, o aviso pede o regador. */
const seRegador = (entao: string, senao?: string) =>
  B.se('sz_js_if_else', variavel('temRegador'), [
    { rotulo: 'então', explica: 'quando temRegador é verdadeiro', corpo: entao },
    ...(senao === undefined
      ? []
      : [{ rotulo: 'senão', explica: 'quando temRegador é falso', corpo: senao }]),
  ])

// 2D: o seletor de sprite mostra a miniatura da imagem, e o de imagem, o nome com a setinha.
const MINIATURA: Record<string, string> = { regador: 'regador-azul', flor: 'flor-fechada' }
const sprite = (nome: string) =>
  B.campo(nome, {
    miniatura: nome === 'personagem' ? 'pessoa' : imagem(MINIATURA[nome] ?? 'regador-azul'),
  })
const comImagem = (nome: string) => B.campo(nome, { lista: true, miniatura: imagem(nome) })
const controles = () =>
  B.bloco(
    'sz_g2d_enable_classic_controls',
    `Ativar controles clássicos ${lista('só as quatro direções')}`,
  )
const mover = () =>
  B.bloco(
    'sz_g2d_top_down',
    `Mover sprite ${sprite('personagem')} em 4 direções com setas, velocidade ${numero(5)}`,
  )
const manter = () =>
  B.bloco('sz_g2d_clamp_to_screen', `Manter o sprite ${sprite('personagem')} dentro da tela`)
const quadro2d = (corpo: string) =>
  B.area(
    'Enquanto estiver rodando',
    B.comBoca('sz_g2d_update_each_frame', 'A cada quadro do jogo', corpo),
  )
const corQuadro2d = () => B.cor('sz_g2d_update_each_frame')
const antesDoPassinho = () => B.pronto('Limpar a tela e Desenhar o cenário', corQuadro2d())
const depoisDoPassinho = () => B.pronto('Os desenhos dos sprites e dos avisos', corQuadro2d())
const prontoInicio2d = () => B.pronto('O palco, os sprites e a variável aviso', corInicio())
const encontro2d = (outro: string, corpo: string) =>
  B.comBoca(
    'sz_g2d_on_overlap',
    `Quando o sprite ${sprite('personagem')} começar a encostar no sprite ${sprite(outro)}`,
    corpo,
  )
const destruir = () => B.bloco('sz_g2d_destroy_sprite', `Destruir o sprite ${sprite('regador')}`)
const abrir2d = () =>
  B.bloco(
    'sz_g2d_set_image',
    `Trocar imagem do sprite ${sprite('flor')} para ${comImagem('flor-aberta')}`,
  )
const criarRegador2d = () =>
  B.bloco(
    'sz_g2d_create_image_sprite',
    `Criar sprite ${B.campo('regador')} em x ${numero(REGADOR_NOVO.x)} y ${numero(REGADOR_NOVO.y)} largura ${numero(REGADOR_NOVO.w)} altura ${numero(REGADOR_NOVO.h)} com imagem ${comImagem(REGADOR_NOVO.image)}`,
  )

// 3D: os nomes dos objetos e os clipes são listas.
const andar3d = () =>
  B.bloco(
    'sz_g3d_top_down',
    `Fazer ${lista('personagem')} andar com as setas (ou WASD), velocidade ${numero(4)}`,
  )
const encontro3d = (outro: string, corpo: string) =>
  B.comBoca('sz_g3d_on_touch', `Quando ${lista('personagem')} encostar em ${lista(outro)}`, corpo)
const esconder = () =>
  B.bloco('sz_g3d_set_visible', `${lista('Esconder')} o objeto ${lista('regador')}`)
const florescer = () =>
  B.bloco(
    'sz_g3d_play_animation',
    `Tocar a animação ${lista('florescer')} em ${lista('flor')} ${lista('uma vez')}`,
  )
const prontoInicio3d = () =>
  B.pronto('A cena, o jardim, os objetos e a variável aviso', corInicio())
const prontoTeclas3d = () => B.pronto('Escrever na tela, com as teclas do jogo', corInicio())
const colocarRegador3d = () => {
  const [x, y, z] = REGADOR_3D.map(comSinal)
  return B.bloco(
    'sz_g3d_set_position',
    `Colocar o objeto ${lista('regador')} em x ${numero(x ?? '')} y ${numero(y ?? '')} z ${numero(z ?? '')}`,
  )
}
/** O Se de fora, no fim da Aula 2: a partida ainda não foi ganha? */
const seNaoGanhou = (corpo: string) =>
  B.se('sz_js_if_else', B.valor('sz_val_not', `não ${variavel('ganhou')}`), [
    { rotulo: 'então', explica: 'quando a partida ainda não foi ganha', corpo },
  ])

// Os desenhos dos encaixes. O conteúdo escolhe onde cada um entra, o título e o texto do vazio.
// Uma parte longa ocupa mais de uma folha, e cada folha fecha com o desenho do que já foi montado.
const quando = (corpo: string) => B.area('Quando acontecer', corpo)
const prontoTeclaR = () => B.pronto('O evento da tecla R', corEventos())
const prontoComRegador = () =>
  B.pronto('O evento da tecla R e o encontro com o regador', corEventos())
const drawings: Record<string, { area: string; corpo: (vazio: string) => string }> = {
  'setas-2d': {
    area: 'Ao iniciar',
    corpo: () => B.area('Ao iniciar', prontoInicio2d() + controles()),
  },
  'passinho-2d': {
    area: 'Enquanto estiver rodando',
    corpo: () => quadro2d(antesDoPassinho() + mover() + depoisDoPassinho()),
  },
  'limite-2d': {
    area: 'Enquanto estiver rodando',
    corpo: () => quadro2d(antesDoPassinho() + mover() + manter() + depoisDoPassinho()),
  },
  'variavel-2d': {
    area: 'Ao iniciar',
    corpo: () => B.area('Ao iniciar', prontoInicio2d() + controles() + criar('temRegador')),
  },
  'encontro-2d': {
    area: 'Quando acontecer',
    corpo: () => quando(prontoTeclaR() + encontro2d('regador', destruir())),
  },
  'coleta-2d': {
    area: 'Quando acontecer',
    corpo: () =>
      quando(
        prontoTeclaR() +
          encontro2d(
            'regador',
            destruir() + alterar('temRegador', 'verdadeiro') + avisa(aviso.pegou),
          ),
      ),
  },
  'pergunta-2d': {
    area: 'Quando acontecer',
    corpo: (vazio) => quando(prontoComRegador() + encontro2d('flor', seRegador(B.vazio(vazio)))),
  },
  'sim-2d': {
    area: 'Quando acontecer',
    corpo: (vazio) =>
      quando(
        prontoComRegador() +
          encontro2d('flor', seRegador(abrir2d() + avisa(aviso.abriu), B.vazio(vazio))),
      ),
  },
  'decisao-2d': {
    area: 'Quando acontecer',
    corpo: () =>
      quando(
        prontoComRegador() +
          encontro2d('flor', seRegador(abrir2d() + avisa(aviso.abriu), avisa(aviso.falta))),
      ),
  },
  'posicao-2d': {
    area: 'Ao iniciar',
    corpo: () =>
      B.area(
        'Ao iniciar',
        B.pronto('O palco e o sprite personagem', corInicio()) +
          criarRegador2d() +
          B.pronto('O sprite flor e os outros blocos', corInicio()),
      ),
  },
  'movimento-3d': {
    area: 'Enquanto estiver rodando',
    corpo: () =>
      B.area(
        'Enquanto estiver rodando',
        B.comBoca(
          'sz_g3d_animate',
          `A cada quadro da cena ${lista('cena')}`,
          andar3d() + B.pronto('Escrever na tela, com o aviso', B.cor('sz_g3d_animate')),
        ),
      ),
  },
  'variavel-3d': {
    area: 'Ao iniciar',
    corpo: () => B.area('Ao iniciar', prontoInicio3d() + criar('temRegador') + prontoTeclas3d()),
  },
  'encontro-3d': {
    area: 'Quando acontecer',
    corpo: () => quando(prontoTeclaR() + encontro3d('regador', esconder())),
  },
  'coleta-3d': {
    area: 'Quando acontecer',
    corpo: () =>
      quando(
        prontoTeclaR() +
          encontro3d(
            'regador',
            esconder() + alterar('temRegador', 'verdadeiro') + avisa(aviso.pegou),
          ),
      ),
  },
  'pergunta-3d': {
    area: 'Quando acontecer',
    corpo: (vazio) => quando(prontoComRegador() + encontro3d('flor', seRegador(B.vazio(vazio)))),
  },
  'sim-3d': {
    area: 'Quando acontecer',
    corpo: (vazio) =>
      quando(
        prontoComRegador() +
          encontro3d('flor', seRegador(florescer() + avisa(aviso.abriu), B.vazio(vazio))),
      ),
  },
  'decisao-3d': {
    area: 'Quando acontecer',
    corpo: () =>
      quando(
        prontoComRegador() +
          encontro3d('flor', seRegador(florescer() + avisa(aviso.abriu), avisa(aviso.falta))),
      ),
  },
  'ganhou-3d': {
    area: 'Ao iniciar',
    corpo: () =>
      B.area(
        'Ao iniciar',
        prontoInicio3d() + criar('temRegador') + criar('ganhou') + prontoTeclas3d(),
      ),
  },
  // Depois dos passos 10 e 11: o Se novo no fazer, e o Se do regador logo abaixo dele.
  'se-novo-3d': {
    area: 'Quando acontecer',
    corpo: (vazio) =>
      quando(
        prontoComRegador() +
          encontro3d(
            'flor',
            seNaoGanhou(B.vazio(vazio)) +
              B.pronto('O Se do regador, com tudo o que está dentro dele', B.cor('sz_js_if_else')),
          ),
      ),
  },
  'uma-vez-3d': {
    area: 'Quando acontecer',
    corpo: () =>
      quando(
        prontoComRegador() +
          encontro3d(
            'flor',
            seNaoGanhou(
              seRegador(
                florescer() + alterar('ganhou', 'verdadeiro') + avisa(aviso.abriu),
                avisa(aviso.falta),
              ),
            ),
          ),
      ),
  },
  'posicao-3d': {
    area: 'Ao iniciar',
    corpo: () =>
      B.area(
        'Ao iniciar',
        B.pronto('A cena, o jardim e a criação do regador', corInicio()) +
          colocarRegador3d() +
          B.pronto('A flor, o personagem e os outros blocos', corInicio()),
      ),
  },
}

/** "O que você vai fazer": um card por aula, com as páginas, e os atalhos embaixo. */
function indexCards(item: Item): string {
  const tons = ['verde', 'rosa']
  const aulas = (item.days ?? [])
    .map(
      (d, i) =>
        `<div class="indice-dia indice-dia--${tons[i] ?? 'verde'}"><div class="kicker">${d.kicker}</div><h3>${d.title}</h3><p>${d.text}</p><p class="indice-paginas">${d.pages}</p></div>`,
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

/** Uma cena grande do jogo, com legenda (na Aula 2, a arte 3D do curso). */
function cena(item: Item): string {
  const src = CENAS[item.image ?? '']
  if (!src) throw new Error(`Cena desconhecida: ${item.image}`)
  return `<figure class="figura-cena figura-cena--${item.image}"><div class="figura-cena-arte" role="img" aria-label="${item.caption ?? ''}" style="background-image:url(${src})"></div><figcaption>${item.caption ?? ''}</figcaption></figure>`
}

/** Os dois testes da flor: a cena do jogo 2D, o valor de temRegador e o aviso que aparece. */
function casos(item: Item): string {
  const cards = (item.cards ?? [])
    .map((c) => {
      const caso = CASOS[c.caso]
      if (!caso) throw new Error(`Caso desconhecido: ${c.caso}`)
      return `<div class="caso"><h3>${c.title}</h3><img class="caso-cena" src="${caso.cena}" alt="${c.title}"><div class="caso-valor"><span>temRegador</span>${bool(caso.temRegador)}</div><div class="caso-aviso">${caso.aviso}</div><p>${c.text}</p></div>`
    })
    .join('')
  return `<div class="casos">${cards}</div>`
}

function renderItem(item: Item): string {
  const text = item.text ?? ''
  if (item.kind === 'faixa') return faixa(item)
  if (item.kind === 'index') return indexCards(item)
  if (item.kind === 'casos') return casos(item)
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

/** A cor de cada folha segue a aula: a Aula 1 (2D) no verde do jardim, a Aula 2 (3D) no rosa da flor. */
const aulaDe = (kicker: string) => Number(kicker.match(/^Aula (\d+)/)?.[1] ?? 0)
const TEMA: Record<number, string> = { 1: 'tema-jardim', 2: 'tema-rosa aula-3d' }

const ui = {
  titulo: 'Passo a passo do projeto - O Jardim Secreto',
  cena2d: 'O jardim no jogo 2D, com o personagem, o regador e a flor fechada',
  cena3d: 'O jardim em três dimensões, com o regador, o personagem e a flor aberta',
  curso: 'O Jardim Secreto',
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
          enquadre: aula === 2 ? '50% 32%' : 'center',
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
  tema: 'capa--jardim',
})
const body = montadas
  .map((sheet, index) => withPages(sheet.html(`${index + 2} / ${total}`)))
  .join('\n')
// Cores do Jardim, puxadas da arte: o verde do gramado e das moitas no painel e no destaque, o
// rosa da flor na faixa da capa e na Aula 2, o azul do regador no caminho da paleta, e o verde
// bem claro do gramado no fundo das folhas.
const cursoCss = `
body { --fundo: #f6faf2; --tinta: #163a24; --texto: #3d4a40; --destaque: #2f7a3c; --destaque-claro: #e2f1dc; --caminho: #1c6fae;
  --entrega-fundo: #1f5a37; --entrega-borda: #1f5a37; --entrega-texto: #ffffff; --entrega-rotulo: #ffd84a; --entrega-forte: #ffd84a; }
.tema-jardim { --destaque: #2f7a3c; --destaque-claro: #e2f1dc; }
.tema-rosa { --destaque: #b4336b; --destaque-claro: #fce6ef; }
.capa--jardim { --capa-painel: #2f7d45; --capa-painel-topo: #9fd27e; --capa-painel-fundo: linear-gradient(#5ea957, #2f7d45 22%, #20633a 55%, #154528); --capa-amarelo: #ffd84a; --capa-frase: #e2f5da; --selo-fundo: #d0477a; --selo-topo: 608px; --selo-altura: 62px; --selo-largura: 534px; --selo-letra: 27px; --titulo-topo: 692px; --frase-largura: 470px; }
/* O gramado claro do fim da arte some no verde do painel. */
.capa--jardim .capa-painel::before { height: 170px; opacity: 1; background: linear-gradient(to bottom, #9fd27e00, #8cc86fcc 62%, #5ea957); }
.abertura { margin-bottom: 3mm; }
.abertura h2 { font-size: 28pt; margin: 1mm 0 1mm; }
.abertura p { font-size: 12pt; font-weight: 800; color: var(--tinta); line-height: 1.4; text-wrap: pretty; }
.faixa { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3mm; }
.faixa-cena { margin: 0; background: #fff; border: 1px solid #d9e6d4; border-radius: 16px; padding: 2.4mm; box-shadow: 0 4px 14px #1b3a2410; position: relative; }
.faixa-arte { height: 36mm; border-radius: 10px; background-size: cover; background-position: center; }
.faixa-cena--jogo-3d .faixa-arte { background-size: 118% auto; background-position: 46% 30%; }
.faixa-cena figcaption { position: absolute; left: 5mm; bottom: 5mm; background: #163a24e0; color: #fff; font-size: 9pt; font-weight: 800; padding: 1.2mm 3.4mm; border-radius: 999px; }
.indice-dias { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3mm; }
.indice-dia { border-radius: 14px; padding: 3mm 4mm; border: 1px solid; }
.indice-dia h3 { font-size: 13pt; margin: 1mm 0 1.4mm; }
.indice-dia p { font-size: 10pt; font-weight: 600; line-height: 1.4; }
.indice-dia .indice-paginas { margin-top: 2mm; font-weight: 800; }
.indice-dia--verde { background: #e2f1dc; border-color: #c4e0b8; --destaque: #2f7a3c; }
.indice-dia--rosa { background: #fce6ef; border-color: #f3c6d8; --destaque: #b4336b; }
.indice-extras { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2.4mm; }
.indice-extra { background: #fff; border: 1px solid #d9e6d4; border-radius: 12px; padding: 2.6mm 3mm; }
.indice-icone { width: 5.4mm; height: 5.4mm; color: var(--destaque); }
.indice-extra h3 { font-family: Nunito, Arial, sans-serif; font-size: 9.6pt; font-weight: 800; line-height: 1.2; margin: 1.2mm 0 .6mm; }
.indice-extra p { font-size: 8.8pt; font-weight: 600; line-height: 1.3; }
.casos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3mm; }
.caso { background: #fff; border: 1px solid #d9e6d4; border-radius: 14px; padding: 3mm 3mm 3.2mm; display: flex; flex-direction: column; align-items: center; gap: 2mm; text-align: center; }
.caso h3 { font-size: 12pt; }
.caso-cena { display: block; width: 100%; aspect-ratio: 490 / 210; border-radius: 10px; }
.caso-valor { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 1mm 1.6mm; font-size: 9.4pt; font-weight: 800; color: var(--tinta); }
.caso-valor .bk-valor { font-size: 9.4pt; font-weight: 800; }
.caso-aviso { background: #264e45; color: #fff; border-radius: 8px; padding: 1.4mm 3mm; font-size: 9.4pt; font-weight: 800; line-height: 1.3; text-wrap: balance; }
.caso p { font-size: 9.8pt; font-weight: 700; line-height: 1.35; text-wrap: balance; }
.figura-cena { margin: 0; background: #fff; border: 1px solid #d9e6d4; border-radius: 16px; padding: 2.6mm; }
.figura-cena-arte { height: 66mm; border-radius: 10px; background-size: 112% auto; background-position: 50% 26%; }
.figura-cena figcaption { font-size: 10pt; font-weight: 700; color: var(--tinta); text-align: center; margin-top: 2mm; }
/* A cena do cabeçalho acompanha a altura do texto, sem esticar a folha. */
.cabecalho-cena { position: relative; overflow: hidden; }
.cabecalho-cena img { position: absolute; inset: 0; }
/* Na Aula 1, a cena 2D se ajusta sozinha ao quadro (o recorte com o personagem, o regador e a flor fica inteiro). */
.tema-jardim .cabecalho-cena img { object-fit: fill; }
/* Na Aula 2, o cabeçalho aproxima o regador, o personagem e a flor. */
.aula-3d .cabecalho-cena img { transform: scale(1.18); transform-origin: 50% 30%; }
/* A abertura com as cenas das duas aulas cabe numa folha. */
[data-id="p1"] .content { gap: 3mm; }
[data-id="p1"] .faixa-arte { height: 31mm; }
[data-id="p1"] .cartao { padding: 3.2mm 4.6mm; }
/* Folhas que passavam do limite por pouco: só elas ficam mais juntas. */
[data-id="coleta-guardar"] .content, [data-id="decisao"] .content, [data-id="decisao-sim"] .content, [data-id="decisao-nao"] .content, [data-id="decisao-3d-sim"] .content { gap: 2.6mm; }
[data-id="coleta-guardar"] .cabecalho, [data-id="decisao"] .cabecalho, [data-id="decisao-sim"] .cabecalho, [data-id="decisao-nao"] .cabecalho, [data-id="decisao-3d-sim"] .cabecalho { min-height: 36mm; }
`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${ui.titulo}</title><style>${cssDoCaderno(fontes)}\n${cursoCss}</style></head><body>${cover}${body}</body></html>`
if (html.includes('{{')) throw new Error('Campo do caderno sem preencher.')
const pasta = 'tmp/pdfs/jardim-secreto'
const out = resolve(root, pasta)
mkdirSync(out, { recursive: true })
writeFileSync(resolve(out, 'caderno.html'), html)
writeFileSync(
  resolve(out, 'cores-estudio.json'),
  JSON.stringify(Object.fromEntries(B.usadas), null, 2),
)
console.log(`${total} páginas preparadas em ${pasta}/caderno.html`)
