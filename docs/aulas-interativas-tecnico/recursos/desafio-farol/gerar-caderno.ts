/** Material único dos dois públicos, com a mesma fonte e os mesmos blocos das aulas. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  FAROL_BARCOS,
  FAROL_CENARIOS,
  FAROL_CHAVES,
  FAROL_FAROIS,
  FAROL_PERSONAGENS,
  type FarolAssetName,
  farolSvg,
} from '../../../../packages/studio/src/arte/farol-assets'
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { JS_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/js'
import { VALUE_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/values'
import { gameTwoDBlocks } from '../../../../packages/studio/src/official-extensions/game-2d/blocks'
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
import { GUIA_CSS, guiaSecao } from '../guia-da-plataforma/guia'

/**
 * Todo texto que a criança lê mora em `caderno-conteudo.json` (13/10/2026), inclusive o índice,
 * a revisão e os títulos dos desenhos: é ele que o guarda do vocabulário
 * (`qa/vocabulario-crianca.test.ts`) confere. Aqui ficam só a composição, os desenhos dos
 * encaixes (com os rótulos que os blocos mostram no Estúdio) e a capa. O visual (capa, cards,
 * passos e blocos) vem de `../caderno-visual/visual.ts`, desde 14/11/2026.
 *
 * Itens do conteúdo: `text`, `step` (título "N. …" vira passo numerado), `box` (com `tone`),
 * `note`, `activity` (com `pill`), `delivery` (com `finish`), `gallery` (com `category`),
 * `drawing` (com `name`, um dos desenhos abaixo, e `title`) e `index` (o "Encontre seu passo" da
 * primeira folha, com `days` e `extras`). Em todo texto, `<br/>` separa parágrafos e um caminho
 * da paleta em negrito ("Jogo 2D &gt; …") ganha a cor de caminho. `{{pagina:<id>}}` vira o
 * número da página com aquele id, depois de montadas todas as folhas.
 *
 * Uma página `{ "id": "guia-…", "guia": true }` é uma das folhas "Conheça a plataforma" (o print
 * real da tela com as marcas), montada por `guia-da-plataforma/guia.ts` a partir do `id`.
 */
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
type ContentPage =
  | { id: string; guia: true }
  | {
      id: string
      guia?: false
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
const arte = arteDoCurso('capa-desafio-farol.jpg')
const imagem = (name: FarolAssetName) =>
  `data:image/svg+xml;base64,${Buffer.from(farolSvg(name)).toString('base64')}`

// Os blocos: as definições finais trazem os tons por família, não só a cor da categoria.
const B = criarBlocos([...FRAME_BLOCKS, ...JS_BLOCKS, ...VALUE_BLOCKS, ...gameTwoDBlocks])
const sprite = (nome: string) =>
  B.campo(nome, {
    miniatura:
      nome === 'personagem'
        ? 'pessoa'
        : imagem(
            (
              { farol: 'farol-listrado-apagado', chave: 'chave-dourada', barco: 'veleiro' } as const
            )[nome as 'farol' | 'chave' | 'barco'],
          ),
  })
const assign = (name: string, value: string) =>
  B.bloco(
    'sz_js_var_assign',
    `Alterar variável ${B.campo(name)} para ${B.valor('sz_val_bool', B.campo(value))}`,
  )
const message = (value: string) =>
  B.bloco(
    'sz_js_var_assign',
    `Alterar variável ${B.campo('aviso')} para ${B.texto('sz_val_text', value)}`,
  )
/**
 * Os eventos do Jogo 2D (encostar e "A cada quadro do jogo") mostram no Estúdio a palavra
 * "fazer" à esquerda da boca do bloco (`message1: 'fazer %1'`); o desenho repete, porque a
 * criança solta o bloco "ao lado da palavra fazer".
 */
const overlap = (target: string, body: string) =>
  B.area(
    'Quando acontecer',
    B.comBoca(
      'sz_g2d_on_overlap',
      `Quando o sprite ${sprite('personagem')} começar a encostar no sprite ${sprite(target)}`,
      body,
    ),
  )
const moveBlock = () =>
  B.bloco(
    'sz_g2d_top_down',
    `Mover sprite ${sprite('personagem')} em 4 direções com setas, velocidade ${B.numero('3')}`,
  )
const eachFrame = (body: string) => {
  const cor = B.cor('sz_g2d_update_each_frame')
  return B.area(
    'Enquanto estiver rodando',
    B.comBoca(
      'sz_g2d_update_each_frame',
      'A cada quadro do jogo',
      B.pronto('Blocos para limpar a tela e desenhar o cenário', cor) +
        body +
        B.pronto('Outros blocos do jogo', cor),
    ),
  )
}
const controls = () =>
  B.bloco(
    'sz_g2d_enable_classic_controls',
    `Ativar controles clássicos ${B.campo('só as quatro direções', { lista: true })}`,
  )
const corDoInicio = () => B.cor('sz_frame_start')
const ifTemChave = (ramos: { rotulo: string; explica: string; corpo: string }[]) =>
  B.se(
    'sz_js_if_else',
    B.valor('sz_val_variable', `valor da variável ${B.campo('temChave')}`),
    ramos,
  )
// Os desenhos dos encaixes. O conteúdo escolhe onde cada um entra e dá o título dele.
const drawings: Record<string, { area: string; corpo: () => string }> = {
  'controles-ao-iniciar': {
    area: 'Ao iniciar',
    corpo: () =>
      B.area(
        'Ao iniciar',
        B.pronto('Os blocos que já estão em Ao iniciar', corDoInicio()) + controls(),
      ),
  },
  'movimento-sem-limite': { area: 'Enquanto estiver rodando', corpo: () => eachFrame(moveBlock()) },
  movimento: {
    area: 'Enquanto estiver rodando',
    corpo: () =>
      eachFrame(
        moveBlock() +
          B.bloco(
            'sz_g2d_clamp_to_screen',
            `Manter o sprite ${sprite('personagem')} dentro da tela`,
          ),
      ),
  },
  retirada: {
    area: 'Quando acontecer',
    corpo: () =>
      overlap('chave', B.bloco('sz_g2d_destroy_sprite', `Destruir o sprite ${sprite('chave')}`)),
  },
  memoria: {
    area: 'Ao iniciar',
    corpo: () =>
      B.area(
        'Ao iniciar',
        B.pronto('Blocos anteriores do projeto', corDoInicio()) +
          controls() +
          B.bloco(
            'sz_js_var_create',
            `Criar variável ${B.campo('temChave')} com valor ${B.valor('sz_val_bool', B.campo('falso'))}`,
          ),
      ),
  },
  coleta: {
    area: 'Quando acontecer',
    corpo: () =>
      overlap(
        'chave',
        B.bloco('sz_g2d_destroy_sprite', `Destruir o sprite ${sprite('chave')}`) +
          assign('temChave', 'verdadeiro') +
          message('Você pegou a chave! Agora vá ao farol.'),
      ),
  },
  // Dia 3, parte 2: só o senão tem bloco; o então fica vazio até a parte seguinte.
  'sem-chave': {
    area: 'Quando acontecer',
    corpo: () =>
      overlap(
        'farol',
        ifTemChave([
          {
            rotulo: 'então',
            explica: 'quando temChave é verdadeiro',
            corpo: B.vazio('vazio por enquanto: você completa na próxima parte'),
          },
          {
            rotulo: 'senão',
            explica: 'quando temChave é falso',
            corpo: message('A porta não abriu. Falta a chave.'),
          },
        ]),
      ),
  },
  porta: {
    area: 'Quando acontecer',
    corpo: () =>
      overlap(
        'farol',
        ifTemChave([
          {
            rotulo: 'então',
            explica: 'quando temChave é verdadeiro',
            corpo:
              assign('ganhou', 'verdadeiro') +
              B.bloco(
                'sz_g2d_set_image',
                `Trocar imagem do sprite ${sprite('farol')} para ${B.campo('farol-listrado-aceso', { lista: true })}`,
              ) +
              message('Você acendeu o farol! Olhe o barco chegando.'),
          },
          {
            rotulo: 'senão',
            explica: 'quando temChave é falso',
            corpo: message('A porta não abriu. Falta a chave.'),
          },
        ]),
      ),
  },
}
function imageOption(name: FarolAssetName): string {
  return `<figure class="galeria-item farol-option" data-image-name="${name}"><img src="${imagem(name)}" alt="${name}"><figcaption>${name}</figcaption></figure>`
}
function gallery(category: string | undefined): string {
  if (category === 'farois')
    return `<div class="farol-pairs">${FAROL_FAROIS.map(({ nome, apagado, aceso }) => `<div class="farol-pair"><h3>${nome}</h3><div>${imageOption(apagado)}${imageOption(aceso)}</div></div>`).join('')}</div>`
  const groups: Record<string, readonly FarolAssetName[]> = {
    personagens: FAROL_PERSONAGENS,
    cenarios: FAROL_CENARIOS,
    barcos: FAROL_BARCOS,
    chaves: FAROL_CHAVES,
  }
  const names = groups[category ?? '']
  if (!names) throw new Error(`Galeria desconhecida: ${category}`)
  return `<div class="galeria farol-gallery farol-gallery--${category}">${names.map(imageOption).join('')}</div>`
}

/** Card de cada caixa: o tom e o ícone seguem o que a caixa diz, como nas folhas de referência. */
function boxStyle(item: Item): { tom: 'azul' | 'amarelo'; icone: string } {
  const titulo = item.title ?? ''
  if (/^Quer rever/.test(titulo)) return { tom: 'azul', icone: 'link' }
  if (/^Se Compartilhar/.test(titulo)) return { tom: 'amarelo', icone: 'boia' }
  if (/^Preciso de ajuda/.test(titulo)) return { tom: 'azul', icone: 'ajuda' }
  if (/nome que os blocos/.test(titulo)) return { tom: 'azul', icone: 'etiqueta' }
  if (/^O que investigar/.test(titulo)) return { tom: 'amarelo', icone: 'olho' }
  if (/^Comemore/.test(titulo)) return { tom: 'amarelo', icone: 'medalha' }
  if (/^Teste/.test(titulo)) return { tom: 'amarelo', icone: 'controle' }
  if (item.tone === 'experience') return { tom: 'amarelo', icone: 'setas' }
  if (item.tone === 'test') return { tom: 'amarelo', icone: 'controle' }
  return { tom: 'azul', icone: 'livro' }
}

function indexCards(item: Item): string {
  const tons = ['azul', 'ambar', 'vermelho']
  const dias = (item.days ?? [])
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
  return `<h3 class="titulo-secao">${item.title ?? ''}</h3><p class="texto">${item.text ?? ''}</p><div class="indice-dias">${dias}</div><div class="indice-extras">${extras}</div>`
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
    // Nas folhas de experiência, a ideia do vídeo abre a folha num card, antes dos testes.
    return /Experiência/i.test(page.kicker) && index === 0
      ? caixa({ tom: 'azul', icone: 'filme', html: text })
      : `<div class="texto">${paragrafos(text)}</div>`
  if (item.kind === 'note') return nota(text)
  if (item.kind === 'activity')
    return caixa({ tom: 'amarelo', icone: 'controle', titulo: item.pill, html: text })
  if (item.kind === 'step') {
    // O número do passo vem do kids; o título passa por `t()` sem ele.
    const match = item.title?.match(/^(\d+)\.\s*(.*)$/)
    return match ? passo(match[1] ?? '', match[2] ?? '', text) : secao(item.title ?? '', text)
  }
  if (item.kind === 'delivery')
    return entrega(
      'Confira antes de enviar',
      `Funcionou? Clique em <strong>Verificar projeto</strong>. Se faltar alguma coisa, corrija os blocos e clique novamente.<br/>Quando aparecer <strong>Objetivo cumprido!</strong>, clique em <strong>Enviar meu projeto</strong> e confirme em <strong>Enviar</strong>. Quando aparecer <strong>Projeto enviado!</strong>, clique em <strong>${item.finish}</strong>.`,
    )
  if (item.kind === 'box') {
    // "Verificar e continuar" e "Envie o seu jogo" fecham a folha no card escuro.
    if (item.tone === 'test' && /^(Verificar|Envie)/.test(item.title ?? ''))
      return entrega(item.title ?? '', text)
    return caixa({ ...boxStyle(item), titulo: item.title, html: text })
  }
  throw new Error(`Item desconhecido no caderno: ${item.kind}`)
}

/** A cor de cada folha segue o dia, como nas folhas de referência. */
function tema(kicker: string): string {
  if (/^Dia 2/.test(kicker)) return 'tema-ambar'
  const parte = Number(kicker.match(/^Dia 3 · Parte (\d+)/)?.[1] ?? 0)
  if (parte >= 1 && parte <= 3) return 'tema-vermelho'
  if (parte >= 4 && parte <= 7) return 'tema-roxo'
  return 'tema-azul'
}

type Sheet = { id: string; guia: boolean; html: (numero: string) => string }
const ui = {
  titulo: 'Passo a passo do projeto - A Chave do Farol',
  cenaAlt: 'Ilustração do jogo A Chave do Farol',
  curso: 'A Chave do Farol',
}
const sheetsSemNumero: { id: string; guia: boolean; montar: () => (numero: string) => string }[] =
  pages.map((page) => {
    if (page.guia)
      return {
        id: page.id,
        guia: true,
        montar: () => (numero: string) =>
          guiaSecao(page.id, {
            curso: 'desafio-primeiro-jogo',
            kicker: (parte) => `Dia 1 · Parte ${parte}`,
            rodape: rodape(ui.curso, numero),
          }),
      }
    return {
      id: page.id,
      guia: false,
      montar: () => {
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
        return (numero: string) =>
          `<section class="page ${tema(page.kicker)}" data-id="${page.id}"><div class="inner">${topo}<div class="content">${body}</div></div>${rodape(ui.curso, numero)}</section>`
      },
    }
  })
// A numeração conta a capa como página 1.
function pageNumber(id: string): number {
  const index = sheetsSemNumero.findIndex((sheet) => sheet.id === id)
  if (index < 0) throw new Error(`Página citada no caderno não existe: ${id}`)
  return index + 2
}
const withPages = (text: string) =>
  text.replace(/\{\{pagina:([a-z0-9-]+)\}\}/g, (_, id: string) => String(pageNumber(id)))
const total = sheetsSemNumero.length + 1
const sheets: Sheet[] = sheetsSemNumero.map((s) => ({ id: s.id, guia: s.guia, html: s.montar() }))
const cover = capaHtml({
  arte,
  iconeSelo: 'pegadas',
  linha1: 'A Chave',
  linha2: 'do Farol',
  frase: 'Todos os passos para construir as regras do seu curso.',
  fraseBaixo: 'Do primeiro movimento à luz que guia o barco.',
  tema: 'capa--farol',
})
const body = sheets
  .map((sheet, index) => withPages(sheet.html(`${index + 2} / ${total}`)))
  .join('\n')
// Cores do Farol: fundo azul bem claro, títulos em azul-marinho e caminhos em azul-violeta.
const cursoCss = `
body { --fundo: #f7fafe; --tinta: #0e2340; --texto: #3d4a5c; --destaque: #0b5394; --destaque-claro: #e3eefa; --caminho: #3d5ce0;
  --entrega-fundo: #0b5394; --entrega-borda: #0b5394; --entrega-texto: #ffffff; --entrega-rotulo: #ffc93c; --entrega-forte: #ffc93c; }
.capa--farol { --capa-painel: #106ec0; --capa-painel-fundo: linear-gradient(#1170c3, #0a3a68); --capa-amarelo: #ffc93c; --capa-frase: #e3f3ff; --selo-fundo: #e23b3b; --selo-topo: 608px; --selo-altura: 62px; --selo-largura: 534px; --selo-letra: 27px; --titulo-topo: 692px; --frase-largura: 360px; }
.abertura { margin-bottom: 4mm; }
.abertura h2 { font-size: 28pt; margin: 1mm 0 1mm; }
.abertura p { font-size: 13pt; font-weight: 800; color: var(--tinta); }
.abertura-faixa { margin-top: 3mm; background: #fff; border: 1px solid #dfe6ee; border-radius: 16px; padding: 3mm; box-shadow: 0 4px 14px #1b2a4a10; }
.abertura-faixa-arte { height: 21mm; border-radius: 10px; background-size: 125% auto; background-position: 35% 45%; }
.indice-dias { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3mm; }
.indice-dia { border-radius: 14px; padding: 3mm 4mm; border: 1px solid; }
.indice-dia h3 { font-size: 13pt; margin: 1mm 0 1.4mm; }
.indice-dia p { font-size: 10pt; font-weight: 600; line-height: 1.4; }
.indice-dia .indice-paginas { margin-top: 2mm; font-weight: 700; }
.indice-dia--azul { background: #e3eefa; border-color: #c8dcf0; --destaque: #0b5394; }
.indice-dia--ambar { background: #fdf1d6; border-color: #f0d9a2; --destaque: #a36a00; }
.indice-dia--vermelho { background: #fde8e8; border-color: #f4c8c8; --destaque: #c22a2a; }
.indice-extras { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 2.2mm; }
.indice-extra { background: #fff; border: 1px solid #dfe6ee; border-radius: 12px; padding: 2.6mm 2.6mm; }
.indice-icone { width: 5.4mm; height: 5.4mm; color: var(--destaque); }
.indice-extra h3 { font-family: Nunito, Arial, sans-serif; font-size: 9.4pt; font-weight: 800; line-height: 1.2; margin: 1.2mm 0 .6mm; }
.indice-extra p { font-size: 8.6pt; font-weight: 600; line-height: 1.3; }
/* O nome da imagem nunca quebra: a criança procura esse nome exato na lista do Estúdio. */
.nome { white-space: nowrap; }
.farol-gallery { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.farol-gallery--personagens img { height: 36mm; }
.farol-gallery--cenarios { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.farol-gallery--cenarios img { height: 52mm; }
.farol-gallery--chaves { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.farol-gallery--chaves img { height: 22mm; }
/* Um par por linha: o nome do modelo à esquerda, o apagado e o aceso lado a lado. */
.farol-pairs { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2.6mm; }
.farol-pair { display: grid; grid-template-columns: 40mm minmax(0, 1fr); align-items: center; gap: 3mm; background: #fff; border: 1px solid #dfe6ee; border-radius: 14px; padding: 2mm 4mm; }
.farol-pair > div { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2mm; }
.farol-pair h3 { font-size: 13pt; }
.farol-pair .farol-option { border: 0; padding: 1mm; background: transparent; }
.farol-pair img { height: 25mm; }
`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${ui.titulo}</title><style>${cssDoCaderno(fontes)}\n${cursoCss}\n${GUIA_CSS}</style></head><body>${cover}${body}</body></html>`
if (html.includes('{{')) throw new Error('Campo do caderno sem preencher.')
const pasta = `tmp/pdfs/desafio-farol`
const out = resolve(root, pasta)
mkdirSync(out, { recursive: true })
writeFileSync(resolve(out, 'caderno.html'), html)
writeFileSync(
  resolve(out, 'cores-estudio.json'),
  JSON.stringify(Object.fromEntries(B.usadas), null, 2),
)
console.log(`${total} páginas preparadas em ${pasta}/caderno.html`)
