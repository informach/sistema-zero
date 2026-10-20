/**
 * Prepara o caderno do Farol com o CSS e as fontes do Cadê Todo Mundo. Com `--adulto`, o mesmo
 * caderno sai como Caderno do Aluno, com o texto de
 * `qa/adulto/traducoes/desafio-primeiro-jogo/_caderno.json` (ver `../caderno-adulto.ts`);
 * `--coletar` atualiza essa lista de textos.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  FAROL_ASSETS,
  FAROL_BARCOS,
  FAROL_CENARIOS,
  FAROL_CHAVES,
  FAROL_FAROIS,
  FAROL_LAYOUT,
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
import { criarTradutor } from '../caderno-adulto'

/**
 * Todo texto que a criança lê mora em `caderno-conteudo.json` (13/10/2026), inclusive o índice,
 * a revisão e os títulos dos desenhos: é ele que o guarda do vocabulário
 * (`qa/vocabulario-crianca.test.ts`) confere. Aqui ficam só a composição, os desenhos dos
 * encaixes (com os rótulos que os blocos mostram no Estúdio) e a capa.
 *
 * Itens do conteúdo: `text`, `step` (título "N. …" vira passo numerado), `box` (com `tone`),
 * `note`, `activity` (com `pill`), `delivery` (com `finish`), `gallery` (com `category`) e
 * `drawing` (com `name`, um dos desenhos abaixo, e `title`). `{{pagina:<id>}}` vira o número
 * da página com aquele id, depois de montadas todas as folhas.
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
}
type ContentPage = {
  id: string
  kicker: string
  title: string
  subtitle: string
  lit?: boolean
  items: Item[]
}
const tradutor = criarTradutor('desafio-primeiro-jogo')
const t = tradutor.t
const root = resolve(import.meta.dir, '../../../..')
const pages = JSON.parse(
  readFileSync(resolve(import.meta.dir, 'caderno-conteudo.json'), 'utf8'),
) as ContentPage[]
const reference = readFileSync(
  resolve(import.meta.dir, '../cade-todo-mundo/caderno-do-aluno.template.html'),
  'utf8',
)
const baseCss = reference.match(/<style>([\s\S]*?)<\/style>/)?.[1]
if (!baseCss) throw new Error('CSS do caderno de referência não encontrado.')
const fonts = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}
@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}`
const css = baseCss.replace('/* {{FONT_FACES}} */', fonts)
function sprite(
  name: FarolAssetName,
  { x, y, w, h }: { x: number; y: number; w: number; h: number },
) {
  const asset = FAROL_ASSETS[name]
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${asset.width} ${asset.height}">${asset.body}</svg>`
}
function scene(lit = false) {
  // Ilustração com a arte do próprio jogo, não uma captura da interface.
  const { palco, farol, personagem, personagemNaPorta, barco, chegadaBarcoX, chave } = FAROL_LAYOUT
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${palco.w}" height="${palco.h}" viewBox="0 0 ${palco.w} ${palco.h}">${FAROL_ASSETS['praia-tropical'].body}${sprite(lit ? 'farol-listrado-aceso' : 'farol-listrado-apagado', farol)}${sprite('aventureiro', lit ? personagemNaPorta : personagem)}${lit ? sprite('veleiro', { ...barco, x: chegadaBarcoX }) : sprite('chave-dourada', chave)}</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}
// Importar as definições finais inclui os tons por família, não só a cor da categoria.
const definitions = new Map(
  [...FRAME_BLOCKS, ...JS_BLOCKS, ...VALUE_BLOCKS, ...gameTwoDBlocks].map((definition) => [
    definition.type,
    definition,
  ]),
)
const usedColors = new Map<string, string>()
function colorAttributes(type: string) {
  const colour = definitions.get(type)?.colour
  if (typeof colour !== 'string' || !/^#[0-9a-f]{6}$/i.test(colour))
    throw new Error(`Cor do Estúdio ausente para ${type}`)
  usedColors.set(type, colour)
  return `data-block-type="${type}" style="background-color:${colour}"`
}
const field = (value: string) => `<span class="field">${value}</span>`
const valueBlock = (type: string, body: string) =>
  `<span class="value-block" ${colorAttributes(type)}>${body}</span>`
const block = (type: string, text: string) =>
  `<div class="block" ${colorAttributes(type)}>${text}</div>`
const prepared = (text: string) =>
  `<div class="prepared">${t(text)} <span>${t('(já vêm no projeto)')}</span></div>`
const areaTypes: Record<string, string> = {
  'Ao iniciar': 'sz_frame_start',
  'Quando acontecer': 'sz_frame_events',
  'Enquanto estiver rodando': 'sz_frame_loops',
}
const area = (name: string, body: string) =>
  `<div class="event-block" ${colorAttributes(areaTypes[name] ?? '')}><span class="tag">Áreas do projeto · ${name}</span><div class="event-body">${body}</div></div>`
/**
 * Bloco com corpo. Os eventos do Jogo 2D (encostar e "A cada quadro do jogo") mostram no Estúdio
 * a palavra "fazer" à esquerda da boca do bloco (`message1: 'fazer %1'`); o desenho repete, com
 * as classes `do-row`/`do-label` do CSS de referência, porque a criança solta o bloco "ao lado da
 * palavra fazer".
 */
const nested = (type: string, title: string, body: string, doLabel = '') =>
  doLabel
    ? `<div class="block" ${colorAttributes(type)}>${title}<div class="do-row"><span class="do-label">${doLabel}</span><div class="event-body">${body}</div></div></div>`
    : `<div class="block" ${colorAttributes(type)}>${title}<div class="event-body">${body}</div></div>`
const diagram = (title: string, body: string) =>
  `<div class="blocks"><h3>${title}</h3>${body}<p class="diagram-note">${t('Esquema dos encaixes, com as cores dos blocos do Estúdio.')}</p></div>`
const assign = (name: string, value: string) =>
  block(
    'sz_js_var_assign',
    `Alterar variável ${field(name)} para ${valueBlock('sz_val_bool', field(value))}`,
  )
const message = (value: string) =>
  block(
    'sz_js_var_assign',
    `Alterar variável ${field('aviso')} para <span class="text-value" ${colorAttributes('sz_val_text')}>texto <span class="text-field">${value}</span></span>`,
  )
const overlap = (target: string, body: string) =>
  area(
    'Quando acontecer',
    nested(
      'sz_g2d_on_overlap',
      `Quando o sprite ${field('personagem')} começar a encostar no sprite ${field(target)}`,
      body,
      'fazer',
    ),
  )
const moveBlock = () =>
  block(
    'sz_g2d_top_down',
    `Mover sprite ${field('personagem')} em 4 direções com setas, velocidade ${valueBlock('sz_val_number', field('3'))}`,
  )
const eachFrame = (body: string) =>
  area(
    'Enquanto estiver rodando',
    nested(
      'sz_g2d_update_each_frame',
      'A cada quadro do jogo',
      prepared('Blocos para limpar a tela e desenhar o cenário') +
        body +
        prepared('Outros blocos do jogo'),
      'fazer',
    ),
  )
const controls = () =>
  block(
    'sz_g2d_enable_classic_controls',
    `Ativar controles clássicos ${field('só as quatro direções')}`,
  )
const ifTemChave = (body: string) =>
  nested(
    'sz_js_if_else',
    `Se ${valueBlock('sz_val_variable', `valor da variável ${field('temChave')}`)}`,
    body,
  )
// Os desenhos dos encaixes. O conteúdo escolhe onde cada um entra e dá o título dele.
const drawings: Record<string, string> = {
  'controles-ao-iniciar': area(
    'Ao iniciar',
    prepared('Os blocos que já estão em Ao iniciar') + controls(),
  ),
  'movimento-sem-limite': eachFrame(moveBlock()),
  movimento: eachFrame(
    moveBlock() +
      block('sz_g2d_clamp_to_screen', `Manter o sprite ${field('personagem')} dentro da tela`),
  ),
  retirada: overlap('chave', block('sz_g2d_destroy_sprite', `Destruir o sprite ${field('chave')}`)),
  memoria: area(
    'Ao iniciar',
    prepared('Blocos anteriores do projeto') +
      controls() +
      block(
        'sz_js_var_create',
        `Criar variável ${field('temChave')} com valor ${valueBlock('sz_val_bool', field('falso'))}`,
      ),
  ),
  coleta: overlap(
    'chave',
    block('sz_g2d_destroy_sprite', `Destruir o sprite ${field('chave')}`) +
      assign('temChave', 'verdadeiro') +
      message('Você pegou a chave! Agora vá ao farol.'),
  ),
  // Dia 3, parte 2: só o senão tem bloco; o então fica vazio até a parte seguinte.
  'sem-chave': overlap(
    'farol',
    ifTemChave(
      `<div class="branch-label">${t('então · quando temChave é verdadeiro')}</div>` +
        `<div class="empty-slot">${t('vazio por enquanto: você completa na próxima parte')}</div>` +
        `<div class="branch-label">${t('senão · quando temChave é falso')}</div>` +
        message('A porta não abriu. Falta a chave.'),
    ),
  ),
  porta: overlap(
    'farol',
    ifTemChave(
      `<div class="branch-label">${t('então · quando temChave é verdadeiro')}</div>` +
        assign('ganhou', 'verdadeiro') +
        block(
          'sz_g2d_set_image',
          `Trocar imagem do sprite ${field('farol')} para ${field('farol-listrado-aceso')}`,
        ) +
        message('Você acendeu o farol! Olhe o barco chegando.') +
        `<div class="branch-label">${t('senão · quando temChave é falso')}</div>` +
        message('A porta não abriu. Falta a chave.'),
    ),
  ),
}
function imageOption(name: FarolAssetName): string {
  const src = `data:image/svg+xml;base64,${Buffer.from(farolSvg(name)).toString('base64')}`
  return `<figure class="farol-option" data-image-name="${name}"><img src="${src}" alt="${name}"><figcaption>${name}</figcaption></figure>`
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
  return `<div class="farol-gallery farol-gallery--${category}">${names.map(imageOption).join('')}</div>`
}
function renderItem(item: Item): string {
  if (item.kind === 'gallery')
    return `${item.title ? `<h3>${t(item.title)}</h3>` : ''}${gallery(item.category)}`
  if (item.kind === 'drawing') {
    const drawing = drawings[item.name ?? '']
    if (!drawing) throw new Error(`Desenho desconhecido: ${item.name}`)
    return diagram(t(item.title ?? ''), drawing)
  }
  const text = t(item.text ?? '')
  if (item.kind === 'text') return `<p class="body-text">${text}</p>`
  if (item.kind === 'note') return `<div class="note">${text}</div>`
  if (item.kind === 'activity')
    return `<div class="soft-box activity"><span class="pill pill--experience">${t(item.pill ?? '')}</span><p>${text}</p></div>`
  if (item.kind === 'step') {
    // O número do passo vem do kids; o título passa por `t()` sem ele.
    const match = item.title?.match(/^(\d+)\.\s*(.*)$/)
    return match
      ? `<div class="step"><span class="number">${match[1]}</span><div><h3>${t(match[2] ?? '')}</h3><p>${text}</p></div></div>`
      : `<div class="text-section"><h3>${t(item.title ?? '')}</h3><p>${text}</p></div>`
  }
  if (item.kind === 'delivery')
    return `<div class="check"><span class="pill pill--test">${t('Confira antes de enviar')}</span><p>${t('Funcionou? Clique em <strong>Verificar esta parte</strong>. Se faltar alguma coisa, corrija os blocos e clique novamente.')}</p><p>${t(`Quando aparecer <strong>Objetivo cumprido!</strong>, clique em <strong>Enviar meu projeto</strong> e confirme em <strong>Enviar</strong>. Quando aparecer <strong>Projeto enviado!</strong>, clique em <strong>${item.finish}</strong>.`)}</p></div>`
  if (item.kind === 'box')
    return `<div class="soft-box box-${item.tone ?? 'note'}"><h3>${t(item.title ?? '')}</h3><p>${text}</p></div>`
  throw new Error(`Item desconhecido no caderno: ${item.kind}`)
}
type Sheet = {
  id: string
  theme: string
  kicker: string
  title: string
  subtitle: string
  body: string
  lit?: boolean
}
const sheets: Sheet[] = pages.map((page) => ({
  id: page.id,
  // O tema segue o kicker kids: o texto adulto não muda as cores da página.
  theme: page.kicker.startsWith('Dia 2') ? 'lesson-two' : 'lesson-one',
  kicker: t(page.kicker),
  title: t(page.title),
  subtitle: t(page.subtitle),
  body: page.items.map(renderItem).join(''),
  lit: page.lit === true,
}))
// A numeração conta a capa como página 1.
function pageNumber(id: string): number {
  const index = sheets.findIndex((sheet) => sheet.id === id)
  if (index < 0) throw new Error(`Página citada no caderno não existe: ${id}`)
  return index + 2
}
const withPages = (text: string) =>
  text.replace(/\{\{pagina:([a-z0-9-]+)\}\}/g, (_, id: string) => String(pageNumber(id)))
for (const sheet of sheets) {
  sheet.kicker = withPages(sheet.kicker)
  sheet.title = withPages(sheet.title)
  sheet.subtitle = withPages(sheet.subtitle)
  sheet.body = withPages(sheet.body)
}
const total = sheets.length + 1
const ui = {
  titulo: t('Mapa da Aventura - A Chave do Farol'),
  selo: t('Mapa da Aventura'),
  capaAlt: t('Ilustração da aventura com o farol aceso'),
  capa: t('Todos os passos para construir as regras da sua aventura.'),
  capaFim: t('Do primeiro movimento<br>à luz que guia o barco.'),
  cenaAlt: t('Ilustração do jogo A Chave do Farol'),
  rodape: t('A Chave do Farol | Mapa da Aventura'),
}
if (tradutor.concluir()) process.exit(0)
// O adulto não tem mascote: a capa sai sem o Zappy.
const zappy = tradutor.adulto
  ? ''
  : `<img class="zappy" src="data:image/webp;base64,${readFileSync(resolve(root, 'packages/community-kids/public/zappy/happy.webp')).toString('base64')}" alt="Zappy feliz">`
const cover = `<section class="page cover" data-id="capa"><div class="cover-art"><img class="scene" src="${scene(true)}" alt="${ui.capaAlt}"></div><div class="cover-copy"><span class="badge">${ui.selo}</span><h1>A Chave<br>do <em>Farol</em></h1><p>${ui.capa}</p><div class="cover-bottom">${ui.capaFim}</div></div>${zappy}</section>`
const body = sheets
  .map(
    (sheet, index) =>
      `<section class="page ${sheet.theme}" data-id="${sheet.id}"><div class="inner"><div class="lesson-hero"><img class="scene" src="${scene(sheet.lit)}" alt="${ui.cenaAlt}"><div class="lesson-hero-text"><div class="kicker">${sheet.kicker}</div><h2>${sheet.title}</h2><p>${sheet.subtitle}</p></div></div><div class="content">${sheet.body}</div></div><div class="page-no"><span class="brand">${ui.rodape}</span><span>${index + 2} / ${total}</span></div></section>`,
  )
  .join('\n')
// Estilo só do Farol. O CSS de referência (Cadê) não muda por causa dele.
const extraCss = `
.lesson-hero .scene { width: 35%; object-fit: contain; background: #e3f6ec; }
.lesson-hero { min-height: 43mm; margin-bottom: 6mm; }
.lesson-hero h2 { font-size: 22pt; text-wrap: balance; }
.lesson-hero .kicker { font-size: 9pt; letter-spacing: .06em; }
.content { display: grid; gap: 4mm; font-size: 11pt; }
.content p { font-size: 11pt; line-height: 1.5; }
/* Sem palavra sozinha na última linha dos parágrafos e dos subtítulos. */
.content p, .lesson-hero p { text-wrap: pretty; }
.content h3 { margin-bottom: 2mm; }
.step h3 { font-size: 13pt; line-height: 1.25; }
.step .number { margin-top: 1px; }
.box-note { background: var(--blue-soft); }
.box-experience { background: var(--brand-soft); border: 1px dashed #b9b0ff; }
.box-test { background: var(--green-soft); }
.blocks { margin: 0; padding: 14px; }
.blocks h3 { font-size: 14pt; margin-bottom: 12px; }
.content .diagram-note { font-size: 9pt; margin-top: 10px; color: var(--muted); font-weight: 400; }
.event-block, .block { line-height: 1.8; }
.event-body { gap: 6px; }
.value-block { display: inline-block; border-radius: 16px; padding: 2px 5px; border: 1px solid #ffffff70; }
.text-value { display: block; border-radius: 8px; padding: 5px 8px; margin-top: 5px; }
.text-field { display: block; background: #fff; border-radius: 8px; padding: 3px 9px; color: var(--ink); margin-top: 5px; line-height: 1.5; }
.branch-label { color: var(--ink); font-size: 10pt; line-height: 1.5; }
.empty-slot { border: 2px dashed #c9cde6; border-radius: 8px; padding: 4px 10px; color: var(--muted); font-size: 9pt; font-weight: 600; line-height: 1.5; }
.prepared { color: var(--muted); background: #edf0f7; border-radius: 8px; padding: 6px 10px; font-size: 9pt; font-weight: 600; }
.prepared span { color: var(--muted); font-weight: 400; }
.check p { margin-top: 9px; }
.note strong { color: var(--brand); }
.cover-art { height: 50%; background: #b9dfd0; }
.cover-art .scene { object-fit: contain; }
.cover h1 { font-size: 43pt; }
.cover p { max-width: 140mm; }
.cover .cover-bottom { margin-top: 12mm; }
.cover .zappy { bottom: 10mm; }
.farol-gallery { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4mm; }
.farol-option { margin: 0; padding: 3mm 2mm; border: 1px solid #dce5f5; border-radius: 12px; background: #f8faff; text-align: center; }
.farol-option img { width: 100%; height: 37mm; object-fit: contain; display: block; }
/* O nome da imagem nunca quebra: a criança procura esse nome exato na lista do Estúdio. */
.nome { white-space: nowrap; }
.farol-option figcaption { margin-top: 2mm; font-size: 11pt; font-weight: 800; line-height: 1.3; white-space: nowrap; }
.farol-gallery--personagens { display: flex; flex-wrap: wrap; justify-content: center; }
.farol-gallery--personagens .farol-option { flex: 0 0 calc((100% - 8mm) / 3); }
.farol-gallery--personagens img { height: 33mm; }
.farol-gallery--cenarios { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.farol-gallery--cenarios img { height: 54mm; }
.farol-gallery--chaves { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.farol-gallery--chaves img { height: 22mm; }
/* Um par por linha: o nome do modelo à esquerda, o apagado e o aceso lado a lado. */
.farol-pairs { display: grid; grid-template-columns: minmax(0, 1fr); gap: 3mm; }
.farol-pair { display: grid; grid-template-columns: 42mm minmax(0, 1fr); align-items: center; gap: 3mm; border: 1px solid #dce5f5; border-radius: 12px; padding: 2mm 3mm; }
.farol-pair > div { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2mm; }
.content .farol-pair h3 { margin: 0; }
.farol-pair .farol-option { border: 0; padding: 1mm; }
.farol-pair img { height: 27mm; }
`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${ui.titulo}</title><style>${css}\n${extraCss}</style></head><body>${cover}${body}</body></html>`
if (html.includes('{{')) throw new Error('Campo do caderno sem preencher.')
const pasta = `tmp/pdfs/desafio-farol${tradutor.adulto ? '-adulto' : ''}`
const out = resolve(root, pasta)
mkdirSync(out, { recursive: true })
writeFileSync(resolve(out, 'caderno.html'), html)
writeFileSync(
  resolve(out, 'cores-estudio.json'),
  JSON.stringify(Object.fromEntries(usedColors), null, 2),
)
console.log(`${total} páginas preparadas em ${pasta}/caderno.html`)
