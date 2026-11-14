/** Material único dos dois públicos, com a mesma fonte e os mesmos blocos das aulas. */
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  JARDIM_ASSETS,
  JARDIM_BICHOS,
  JARDIM_ESCONDERIJOS,
  JARDIM_PARES,
  type JardimSpriteName,
  jardimSpriteRect,
  jardimSvg,
} from '../../../../packages/studio/src/arte/jardim-assets'
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
  nota,
  passo,
  rodape,
  rotulo,
} from '../caderno-visual/visual'
import { GUIA_CSS, guiaSecao } from '../guia-da-plataforma/guia'

/**
 * Todo texto que a criança lê mora em `caderno-conteudo.json` (14/11/2026). Aqui ficam a
 * composição, as cenas do jardim, as galerias e os desenhos dos encaixes, com o visual de
 * `../caderno-visual/visual.ts`. `{{pagina:<id>}}` vira o número da folha com aquele id; a capa
 * conta como página 1.
 *
 * Itens: `scene` (cena do jardim com legenda), `map` (os três cards de "O que você vai fazer"),
 * `note`, `box` (com `tone`: `experience` ou `observe`), `label` (a pílula "Montar no Estúdio"),
 * `heading`, `steps` (passos numerados), `drawing` (um dos desenhos abaixo, com `title`),
 * `gallery` (`bichos` ou `esconderijos`) e `delivery` (o card verde de verificar e enviar).
 * Uma página `{ "id": "guia-…", "guia": true }` é uma folha "Conheça a plataforma".
 *
 * O `caderno-do-aluno.template.html` continua no repositório só porque outros cursos ainda leem
 * o CSS dele; o Cadê não usa mais.
 */
type Item = {
  kind: string
  title?: string
  text?: string
  tone?: string
  name?: string
  scene?: string
  category?: string
  steps?: string[]
  screens?: {
    image: string
    caption: string
    marks: { n: string; x: number; y: number; w: number; h: number }[]
  }[]
  cards?: { title: string; text: string }[]
}
type ContentPage =
  | { id: string; guia: true }
  | {
      id: string
      guia?: false
      kicker: string
      title: string
      subtitle: string
      scene?: string
      header?: 'simple'
      items: Item[]
    }

const scriptDir = import.meta.dir
const root = resolve(scriptDir, '../../../..')
const output = resolve(
  root,
  'docs/aulas-interativas/faisca/cade-todo-mundo/passo-a-passo-do-projeto.pdf',
)
const pages = JSON.parse(
  readFileSync(resolve(scriptDir, 'caderno-conteudo.json'), 'utf8'),
) as ContentPage[]
const fontes = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}
@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}`

const item = (name: JardimSpriteName, centroX: number) => {
  const asset = JARDIM_ASSETS[name]
  const { x, y } = jardimSpriteRect(name, centroX)
  return `<svg x="${x}" y="${y}" width="${asset.width}" height="${asset.height}" viewBox="${asset.viewBox}">${asset.body}</svg>`
}
/** Cena do jardim com a arte do próprio jogo. `achados` mostra o placar do jogo no canto. */
function scene(kind: string) {
  const revealed = kind !== 'escondido'
  const characters = JARDIM_PARES.map(({ personagem, centroX }) => item(personagem, centroX)).join(
    '',
  )
  const hiding = revealed
    ? kind === 'coelho'
      ? JARDIM_PARES.slice(1)
          .map(({ esconderijo, centroX }) => item(esconderijo, centroX))
          .join('')
      : ''
    : JARDIM_PARES.map(({ esconderijo, centroX }) => item(esconderijo, centroX)).join('')
  const placar =
    kind === 'achados'
      ? `<text x="18" y="34" font-family="Nunito, Arial, sans-serif" font-weight="800" font-size="20" fill="#1f2a3c">Achados: 3</text>`
      : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">${JARDIM_ASSETS.jardim.body}${characters}${hiding}${placar}</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}
/** Enquadre de cada cena no cabeçalho (a cena é mais larga que o espaço dela). */
const ENQUADRE: Record<string, string> = { coelho: '12% 70%', achados: 'center 60%' }
function gallery(category: string | undefined) {
  const names =
    category === 'bichos' ? JARDIM_BICHOS : category === 'esconderijos' ? JARDIM_ESCONDERIJOS : null
  if (!names) throw new Error(`Galeria desconhecida: ${category}`)
  return `<div class="galeria galeria--${category}">${names
    .map((name) => {
      const src = `data:image/svg+xml;base64,${Buffer.from(jardimSvg(name)).toString('base64')}`
      return `<figure class="galeria-item"><img src="${src}" alt="${name}"><figcaption>${name}</figcaption></figure>`
    })
    .join('')}</div>`
}

const B = criarBlocos([...FRAME_BLOCKS, ...JS_BLOCKS, ...VALUE_BLOCKS, ...gameTwoDBlocks])
const toque = (dentro: string) =>
  B.area(
    'Quando acontecer',
    B.comBoca(
      'sz_g2d_on_group_click',
      `Quando clicar/tocar num sprite do grupo ${B.campo('esconderijos')} chamá-lo de ${B.campo('escolhido')}`,
      dentro,
    ),
  )
const visibilidade = () =>
  B.bloco(
    'sz_g2d_set_opacity',
    `Deixar o sprite ${B.campo('escolhido')} com ${B.numero('0')} % de visibilidade`,
  )
const drawings: Record<string, { area: string; corpo: () => string }> = {
  visibilidade: { area: 'Quando acontecer', corpo: () => toque(visibilidade()) },
  contagem: {
    area: 'Quando acontecer',
    corpo: () =>
      toque(
        visibilidade() +
          B.bloco(
            'sz_js_var_increment',
            `Somar ${B.numero('1')} em variável ${B.campo('achados')}`,
          ),
      ),
  },
  // A surpresa do final: o nome da imagem no Criar sprite e a frase do Escrever, em destaque.
  escolhas: {
    area: 'Ao iniciar e Enquanto estiver rodando',
    corpo: () =>
      B.area(
        'Ao iniciar',
        B.bloco(
          'sz_g2d_create_image_sprite',
          `Criar sprite ${B.campo('bicho1')} em x ${B.numero('101')} y ${B.numero('181')} largura ${B.numero('72')} altura ${B.numero('87')} com imagem <span class="bk-campo bk-campo--destaque">coelho</span>`,
        ),
      ) +
      B.area(
        'Enquanto estiver rodando',
        B.comBoca(
          'sz_g2d_update_each_frame',
          'A cada quadro do jogo',
          `<span class="bk-ramo">… outros blocos …</span>${B.se(
            'sz_js_if_else',
            `${B.valor('sz_val_compare', `${B.valor('sz_val_variable', `valor da variável ${B.campo('achados')}`)} ≥ ${B.numero('3')}`)} então`,
            [
              {
                rotulo: 'então',
                corpo: B.bloco(
                  'sz_g2d_draw_label',
                  `Escrever ${B.valor('sz_val_text', `texto <span class="bk-campo bk-campo--destaque">Você achou todo mundo!</span>`)} em x ${B.numero('174')} y ${B.numero('72')} cor <span class="bk-cor"></span> tamanho ${B.numero('27')} alinhado à ${B.campo('esquerda', { lista: true })}`,
                ),
              },
            ],
          )}`,
        ),
      ),
  },
}

function renderItem(item: Item): string {
  const text = item.text ?? ''
  if (item.kind === 'scene')
    return `<figure class="cena"><img src="${scene(item.scene ?? 'escondido')}" alt="${text}"><figcaption>${text}</figcaption></figure>`
  if (item.kind === 'map')
    return `<h3 class="titulo-secao">${item.title ?? ''}</h3><div class="mapa">${(item.cards ?? [])
      .map(
        (c, i) =>
          `<div class="mapa-card"><span class="mapa-numero">${i + 1}</span><div><h3>${c.title}</h3><p>${c.text}</p></div></div>`,
      )
      .join('')}</div>`
  if (item.kind === 'note') return nota(text)
  if (item.kind === 'box')
    return caixa({
      tom: 'verde',
      icone: item.tone === 'observe' ? 'olho' : 'toque',
      titulo: `<span class="cartao-rotulo">${item.title ?? ''}</span>`,
      html: text,
    })
  if (item.kind === 'label') return rotulo(text)
  if (item.kind === 'heading') return `<h3 class="titulo-secao">${text}</h3>`
  if (item.kind === 'steps')
    return `<div class="passos">${(item.steps ?? []).map((s, i) => passo(i + 1, '', s)).join('')}</div>`
  if (item.kind === 'drawing') {
    const drawing = drawings[item.name ?? '']
    if (!drawing) throw new Error(`Desenho desconhecido: ${item.name}`)
    if (!item.title)
      return `<div class="esquema esquema--solto"><div class="esquema-painel">${drawing.corpo()}</div></div>`
    return B.esquema(item.title, drawing.area, drawing.corpo())
  }
  if (item.kind === 'gallery')
    return `<h3 class="titulo-galeria">${item.title ?? ''}</h3>${gallery(item.category)}`
  if (item.kind === 'screens')
    // Prints da plataforma com a marca de cada passo (centro x/y e tamanho em % da imagem).
    return `<h3 class="titulo-secao">${item.title ?? ''}</h3><div class="telas">${(
      item.screens ?? []
    )
      .map(
        (t) =>
          `<figure class="tela"><div class="tela-print"><img src="${arteDoCurso(t.image)}" alt="${t.caption}">${t.marks
            .map(
              (m) =>
                `<span class="tela-alvo" style="left:${m.x - m.w / 2}%;top:${m.y - m.h / 2}%;width:${m.w}%;height:${m.h}%"></span><span class="tela-num" style="left:${Math.min(m.x + m.w / 2, 96)}%;top:${Math.min(m.y + m.h / 2, 96)}%">${m.n}</span>`,
            )
            .join('')}</div><figcaption>${t.caption}</figcaption></figure>`,
      )
      .join('')}</div>`
  if (item.kind === 'delivery') return entrega(item.title ?? '', text)
  throw new Error(`Item desconhecido no caderno: ${item.kind}`)
}

const curso = 'Cadê Todo Mundo?'
const total = pages.length + 1
const numeroDe = (id: string) => {
  const indice = pages.findIndex((p) => p.id === id)
  if (indice < 0) throw new Error(`Página citada no caderno não existe: ${id}`)
  return indice + 2
}
const withPages = (html: string) =>
  html.replace(/\{\{pagina:([a-z0-9-]+)\}\}/g, (_, id: string) => String(numeroDe(id)))
const folhas = pages.map((page, index) => {
  const numero = `${index + 2} / ${total}`
  if (page.guia)
    return guiaSecao(page.id, {
      curso: 'cade-todo-mundo',
      kicker: (parte) => `Aula 1 · Parte ${parte}`,
      rodape: rodape(curso, numero),
    })
  const corpo = page.items.map(renderItem).join('')
  const topo =
    page.scene && page.header !== 'simple'
      ? cabecalho({
          cena: scene(page.scene),
          alt: 'Cena do jardim do jogo Cadê Todo Mundo?',
          kicker: page.kicker,
          titulo: page.title,
          resumo: page.subtitle,
          enquadre: ENQUADRE[page.scene],
        })
      : `<div class="abertura"><div class="kicker">${page.kicker}</div><h2>${page.title}</h2><p>${page.subtitle}</p></div>`
  return withPages(
    `<section class="page" data-id="${page.id}"><div class="inner">${topo}<div class="content">${corpo}</div></div>${rodape(curso, numero)}</section>`,
  )
})
const cover = capaHtml({
  arte: arteDoCurso('capa-cade-todo-mundo.jpg'),
  iconeSelo: 'mapa',
  linha1: 'Cadê',
  linha2: 'Todo Mundo?',
  frase: 'Todos os passos para construir o seu jogo.',
  fraseBaixo: 'Do primeiro toque aos três personagens encontrados.',
  tema: 'capa--cade',
})
// Cores do Cadê: fundo creme, títulos em verde bem escuro e destaque verde.
const cursoCss = `
body { --fundo: #fafbf7; --tinta: #133826; --texto: #3f4a45; --destaque: #087a54; --destaque-claro: #e1f2ea; --caminho: #087a54;
  --numero-raio: 9px; --numero-fundo: #dcf0e5; --numero-cor: #087a54;
  --entrega-fundo: #e3f3ea; --entrega-borda: #bfe0cd; --entrega-texto: #3f4a45; --entrega-rotulo: #ffffff; --entrega-rotulo-fundo: #087a54; --entrega-rotulo-espaco: 1.6mm 4mm; --entrega-forte: #087a54; }
.capa--cade { --capa-painel: #087a54; --capa-amarelo: #ffc02e; --capa-frase: #e9fff7; --selo-fundo: #07583e; --selo-topo: 592px; --selo-altura: 73px; --selo-largura: 625px; --selo-letra: 24px; --titulo-topo: 692px; }
.abertura { margin-bottom: 4mm; }
.abertura h2 { font-size: 28pt; margin: 1mm 0 1.6mm; }
.abertura p { font-size: 11.4pt; font-weight: 600; line-height: 1.5; }
.cartao-rotulo { font-family: Nunito, Arial, sans-serif; font-size: 9.6pt; letter-spacing: .07em; text-transform: uppercase; color: #087a54; }
.cartao--verde h3 { margin-bottom: 1.2mm; }
.passo-numero { width: 8.4mm; height: 8.4mm; font-size: 12pt; }
.passos { gap: 2.6mm; }
.passo-corpo { padding-top: 1.4mm; }
.cena { margin: 0; background: #fff; border: 1px solid #d6e5dc; border-radius: 18px; padding: 3mm; box-shadow: 0 6px 18px #13382614; position: relative; }
.cena img { display: block; width: 100%; height: 76mm; object-fit: cover; object-position: center 70%; border-radius: 12px; }
.cena figcaption { position: absolute; left: 6mm; bottom: 6mm; background: #0f5a3ee6; color: #fff; font-size: 9.4pt; font-weight: 700; padding: 1.6mm 4mm; border-radius: 999px; }
.mapa { display: flex; flex-direction: column; gap: 3mm; }
.mapa-card { display: flex; gap: 5mm; align-items: flex-start; border-radius: 16px; padding: 5mm 6mm; border: 1px solid; }
.mapa-card h3 { font-size: 14pt; margin-bottom: 1mm; }
.mapa-card p { font-size: 10.6pt; font-weight: 700; line-height: 1.45; }
.mapa-numero { flex: none; width: 10mm; height: 10mm; display: grid; place-items: center; background: #fff; border-radius: 9px; font-family: 'Baloo 2', Arial, sans-serif; font-weight: 800; font-size: 13pt; }
.mapa-card:nth-child(1) { background: #e1f2ea; border-color: #c4e2d1; color: #087a54; }
.mapa-card:nth-child(2) { background: #fff3dc; border-color: #f2dcab; color: #a36a00; }
.mapa-card:nth-child(2) h3 { color: #4a3000; }
.mapa-card:nth-child(3) { background: #f0eafd; border-color: #dcd0f7; color: #6a3cc4; }
.mapa-card:nth-child(3) h3 { color: #2c1a5c; }
.mapa-card p { color: #4a5250; }
.titulo-galeria { font-size: 14pt; color: #087a54; margin-bottom: -1mm; }
.galeria--bichos { grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2mm; }
.galeria--esconderijos { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 2mm; }
.galeria-item { padding: 2mm 1mm 1.6mm; border-radius: 12px; }
.galeria-item img { height: 13mm; }
.galeria-item figcaption { margin-top: 1.2mm; font-size: 9.6pt; }
.esquema--solto { padding: 3mm; }
.esquema--solto .esquema-painel { gap: 3mm; }
.bk-campo--destaque { box-shadow: 0 0 0 2px #ffc02e; }
[data-id="surpresa"] .content { gap: 2.6mm; }
[data-id="surpresa"] .abertura { margin-bottom: 2.4mm; }
[data-id="surpresa"] .abertura h2 { font-size: 25pt; }
[data-id="surpresa"] .abertura p { font-size: 10.6pt; }
[data-id="surpresa"] .passos { gap: 2mm; }
[data-id="surpresa"] .entrega { padding: 3.4mm 5mm; }
[data-id="surpresa"] .entrega p { font-size: 10pt; line-height: 1.4; }
[data-id="surpresa"] .esquema--solto { padding: 2.4mm; }
[data-id="surpresa"] .esquema-painel > * { zoom: .8; }
[data-id="surpresa"] .galeria-item figcaption { margin-top: .8mm; }
[data-id="fase-2"] .cabecalho, [data-id="fase-1"] .cabecalho { min-height: 36mm; }
[data-id="fase-2"] .content { gap: 3mm; }
[data-id="surpresa"] .galeria-item img { height: 11mm; }
[data-id="surpresa"] .esquema-painel { padding: 2.4mm 3mm; gap: 2mm; }
.telas { display: grid; grid-template-columns: 2.05fr 1.15fr .85fr; gap: 3mm; align-items: start; }
.tela { margin: 0; background: #fff; border: 1px solid #d6e5dc; border-radius: 14px; padding: 2mm 2mm 2.4mm; }
.tela-print { position: relative; border-radius: 9px; overflow: visible; border: 1px solid #e3e8e5; }
.tela-print img { display: block; width: 100%; border-radius: 8px; }
.tela figcaption { margin-top: 2mm; font-size: 9.2pt; font-weight: 800; color: #3f4a45; line-height: 1.3; }
.tela-alvo { position: absolute; border: 2.2px solid #087a54; border-radius: 7px; box-shadow: 0 0 0 2px #ffffffd9; }
.tela-num { position: absolute; transform: translate(-30%, -30%); width: 6mm; height: 6mm; display: grid; place-items: center; border-radius: 50%; background: #087a54; color: #fff; font-family: 'Baloo 2', Arial, sans-serif; font-weight: 800; font-size: 10pt; border: 2px solid #fff; }
.bk-cor { display: inline-block; width: 6mm; height: 5mm; border-radius: 4px; background: #222; border: 1.5px solid #fff; }
`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Passo a passo do projeto - Cadê Todo Mundo?</title><style>${cssDoCaderno(fontes)}\n${cursoCss}\n${GUIA_CSS}</style></head><body>${cover}${folhas.join('\n')}</body></html>`
if (html.includes('{{')) throw new Error('Campo do caderno sem preencher.')
const previewDir = resolve(root, `tmp/pdfs/cade-todo-mundo`)
mkdirSync(previewDir, { recursive: true })
writeFileSync(join(previewDir, 'caderno.html'), html)
writeFileSync(
  join(previewDir, 'cores-estudio.json'),
  JSON.stringify(Object.fromEntries(B.usadas), null, 2),
)
if (process.argv.includes('--html-only')) process.exit(0)
const browser = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync)
if (!browser)
  throw new Error('Chrome ou Edge não encontrado para gerar o Passo a passo do projeto.')
const temporary = mkdtempSync(join(tmpdir(), 'sistema-zero-caderno-'))
const htmlPath = join(temporary, 'caderno.html')
const temporaryPdf = join(temporary, 'caderno.pdf')
const browserProfile = join(temporary, 'chrome-profile')
try {
  writeFileSync(htmlPath, html)
  const result = spawnSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${browserProfile}`,
      '--virtual-time-budget=5000',
      '--print-to-pdf-no-header',
      `--print-to-pdf=${temporaryPdf}`,
      pathToFileURL(htmlPath).href,
    ],
    { encoding: 'utf8', timeout: 60000 },
  )
  if (
    result.error ||
    result.status !== 0 ||
    !existsSync(temporaryPdf) ||
    statSync(temporaryPdf).size < 1000
  ) {
    throw new Error(`Falha ao gerar o PDF: ${result.error?.message ?? result.stderr}`)
  }
  copyFileSync(temporaryPdf, output)
  console.log(output)
} finally {
  // Só remove a pasta temporária exclusiva criada acima, nunca um caminho amplo.
  const resolvedTemporary = realpathSync(temporary)
  const resolvedTempRoot = realpathSync(tmpdir())
  if (
    dirname(resolvedTemporary) === resolvedTempRoot &&
    basename(resolvedTemporary).startsWith('sistema-zero-caderno-') &&
    resolvedTemporary.startsWith(`${resolvedTempRoot}${sep}`)
  ) {
    rmSync(resolvedTemporary, { recursive: true, force: true })
  }
}
