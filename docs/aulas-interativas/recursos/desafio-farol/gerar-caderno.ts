/** Prepara o caderno do Farol com o CSS e as fontes do Cadê Todo Mundo. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  FAROL_ASSETS,
  FAROL_LAYOUT,
  type FarolAssetName,
} from '../../../../packages/studio/src/arte/farol-assets'
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { JS_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/js'
import { VALUE_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/values'
import { gameTwoDBlocks } from '../../../../packages/studio/src/official-extensions/game-2d/blocks'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'

type Item = { kind: string; title?: string; text?: string; tone?: string; finish?: string }
type ContentPage = { id: string; kicker: string; title: string; subtitle: string; items: Item[] }
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
const zappy = `data:image/webp;base64,${readFileSync(resolve(root, 'packages/community-kids/public/zappy/happy.webp')).toString('base64')}`
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${palco.w}" height="${palco.h}" viewBox="0 0 ${palco.w} ${palco.h}">${FAROL_ASSETS.cenario.body}${sprite(lit ? 'farol-aceso' : 'farol-apagado', farol)}${sprite('personagem', lit ? personagemNaPorta : personagem)}${lit ? sprite('barco', { ...barco, x: chegadaBarcoX }) : sprite('chave', chave)}</svg>`
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
  `<div class="prepared">${text} <span>(já vêm no projeto)</span></div>`
const areaTypes: Record<string, string> = {
  'Ao iniciar': 'sz_frame_start',
  'Quando acontecer': 'sz_frame_events',
  'Enquanto estiver rodando': 'sz_frame_loops',
}
const area = (name: string, body: string) =>
  `<div class="event-block" ${colorAttributes(areaTypes[name] ?? '')}><span class="tag">Áreas do projeto · ${name}</span><div class="event-body">${body}</div></div>`
const nested = (type: string, title: string, body: string) =>
  `<div class="block" ${colorAttributes(type)}>${title}<div class="event-body">${body}</div></div>`
const diagram = (title: string, body: string) =>
  `<div class="blocks"><h3>${title}</h3>${body}<p class="diagram-note">Esquema dos encaixes, com as cores dos blocos do Estúdio.</p></div>`
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
    ),
  )
const movement = diagram(
  'Primeiro move. Depois confere a borda.',
  area(
    'Enquanto estiver rodando',
    nested(
      'sz_g2d_update_each_frame',
      'A cada quadro',
      prepared('Blocos para limpar a tela e desenhar o cenário') +
        block(
          'sz_g2d_top_down',
          `Mover sprite ${field('personagem')} em 4 direções com setas · velocidade ${valueBlock('sz_val_number', field('3'))}`,
        ) +
        block('sz_g2d_clamp_to_screen', `Manter o sprite ${field('personagem')} dentro da tela`) +
        prepared('Outros blocos do jogo'),
    ),
  ),
)
const controls = () =>
  block('sz_g2d_enable_classic_controls', 'Ativar controles clássicos · só as quatro direções')
const memory = diagram(
  'A informação começa em falso',
  area(
    'Ao iniciar',
    prepared('Blocos anteriores do projeto') +
      controls() +
      block(
        'sz_js_var_create',
        `Criar variável ${field('temChave')} com valor ${valueBlock('sz_val_bool', field('falso'))}`,
      ),
  ),
)
const collection = diagram(
  'Três ações dentro do encontro com a chave',
  overlap(
    'chave',
    block('sz_g2d_destroy_sprite', `Destruir o sprite ${field('chave')}`) +
      assign('temChave', 'verdadeiro') +
      message('Você pegou a chave! Agora vá ao farol.'),
  ),
)
const door = diagram(
  'Duas respostas para a mesma pergunta',
  overlap(
    'farol',
    nested(
      'sz_js_if_else',
      `Se ${valueBlock('sz_val_variable', `valor da variável ${field('temChave')}`)}`,
      '<div class="branch-label">então · quando temChave é verdadeiro</div>' +
        assign('ganhou', 'verdadeiro') +
        block(
          'sz_g2d_set_image',
          `Trocar imagem do sprite ${field('farol')} para ${field('farol-aceso')}`,
        ) +
        message('Você acendeu o farol! Olhe o barco chegando.') +
        '<div class="branch-label">senão · quando temChave é falso</div>' +
        message('A porta não abriu. Falta a chave.'),
    ),
  ),
)
function renderItem(item: Item): string {
  if (item.kind === 'index') return '<!-- course-index -->'
  if (item.kind === 'text') return `<p class="body-text">${item.text}</p>`
  if (item.kind === 'step') {
    const match = item.title?.match(/^(\d+)\.\s*(.*)$/)
    return match
      ? `<div class="step"><span class="number">${match[1]}</span><div><h3>${match[2]}</h3><p>${item.text}</p></div></div>`
      : `<div class="text-section"><h3>${item.title}</h3><p>${item.text}</p></div>`
  }
  if (item.kind === 'delivery')
    return `<div class="check"><span class="pill pill--test">Confira antes de enviar</span><p>Teste o jogo e aperte <strong>Verificar esta etapa</strong>. Se aparecer uma pendência, corrija o bloco indicado e verifique novamente.</p><p>Quando aparecer <strong>Objetivo da etapa cumprido!</strong>, espere <strong>Salvo</strong>. Aperte <strong>Enviar para o professor</strong> e confirme em <strong>Enviar</strong>. Espere o envio terminar e aperte <strong>${item.finish}</strong>.</p></div>`
  if (item.kind === 'box')
    return `<div class="soft-box box-${item.tone ?? 'note'}"><h3>${item.title}</h3><p>${item.text}</p></div>`
  return '' // Os diagramas antigos em texto foram substituídos por encaixes desenhados.
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
const sheets: Sheet[] = []
for (const page of pages) {
  const items = page.items
  let body = items
    .map((item) => (item.kind === 'diagram' && page.id === 'p3' ? movement : renderItem(item)))
    .join('')
  if (page.id === 'p2') {
    const first = renderItem(items[0]!)
    body = body.replace(
      first,
      first +
        diagram(
          'No fim da área Ao iniciar',
          area('Ao iniciar', prepared('Blocos do projeto') + controls()),
        ),
    )
  }
  if (page.id === 'p4') body = items.slice(0, 2).map(renderItem).join('') + memory
  const theme = page.kicker.startsWith('Dia 2') ? 'lesson-two' : 'lesson-one'
  if (page.id === 'p10')
    sheets.push({
      id: 'revisao-final',
      theme: 'lesson-one',
      lit: true,
      kicker: 'Seu certificado · Revisão',
      title: 'As regras da sua aventura',
      subtitle:
        'Você programou o movimento, a coleta e a decisão do farol. Agora confira o que faz essas regras funcionarem.',
      body: '<div class="soft-box activity"><span class="pill pill--experience">Na aula, antes do certificado</span><p>Leia a fala do Zappy e responda às quatro perguntas sobre seu jogo. Esta seção tem somente a conversa do Zappy e o quiz, sem vídeo.</p></div><div class="step"><span class="number">1</span><div><h3>Pense no que você construiu</h3><p>As perguntas retomam o movimento, a informação da chave, a resposta do farol e os testes da porta. Escolha uma resposta para cada pergunta e envie para conferir.</p></div></div><div class="step"><span class="number">2</span><div><h3>Leia e confira</h3><p>Depois do envio, leia as explicações. Se algo precisar mudar, corrija e envie novamente. Você pode tentar de novo sem esperar.</p></div></div><div class="step"><span class="number">3</span><div><h3>Siga para a celebração</h3><p>Quando todas as respostas estiverem corretas, clique em <strong>Próxima seção</strong>. O vídeo e o certificado ficam na seção seguinte.</p></div></div><div class="note">Se quiser rever uma regra, volte ao seu jogo e aos passos deste caderno. A revisão ajuda a entender a aventura que você programou.</div>',
    })
  sheets.push({ ...page, theme, body, lit: page.id === 'p10' })
  if (page.id === 'p4')
    sheets.push({
      id: 'encontro-chave',
      theme: 'lesson-two',
      kicker: 'Dia 2 · Montagem',
      title: 'O encontro recolhe a chave',
      subtitle:
        'A informação já começa em falso. Agora programe o que acontece quando o personagem encontra a chave.',
      body:
        items.slice(2).map(renderItem).join('') +
        diagram(
          'A retirada acontece dentro do encontro',
          overlap('chave', block('sz_g2d_destroy_sprite', `Destruir o sprite ${field('chave')}`)),
        ),
    })
  if (page.id === 'p5')
    sheets.push({
      id: 'blocos-chave',
      theme: 'lesson-two',
      kicker: 'Dia 2 · Confira a montagem',
      title: 'Retirar, guardar e avisar',
      subtitle: 'A coleta faz três coisas. Cada uma tem uma função diferente no jogo.',
      body:
        collection +
        '<div class="note">A mensagem conta o que aconteceu. Quem guarda a informação da coleta é <strong>temChave</strong>. O jogo pode continuar sabendo da chave mesmo quando ela não está mais no chão.</div><div class="check"><span class="pill pill--test">Confira no seu projeto</span><p>As três ações ficam dentro do encontro entre <strong>personagem</strong> e <strong>chave</strong>, na ordem mostrada. Se o texto não mudar, confira o bloco que altera <strong>aviso</strong> e o texto encaixado nele.</p></div>',
    })
  if (page.id === 'p7')
    sheets.push({
      id: 'blocos-porta',
      theme: 'lesson-one',
      kicker: 'Dia 3 · Confira a montagem',
      title: 'A porta confere a chave',
      subtitle: 'Este encontro é com o farol. Ele fica separado do encontro com a chave.',
      body:
        door +
        '<div class="note">As ações da luz, do barco e da mensagem de chegada ficam em <strong>então</strong>. A mensagem de falta da chave fica em <strong>senão</strong>. Depois da montagem, teste os dois caminhos.</div>',
    })
}
// A numeração acompanha as folhas ilustradas inseridas pelo gerador e a capa.
function pageNumber(id: string): number {
  const index = sheets.findIndex((sheet) => sheet.id === id)
  if (index < 0) throw new Error(`Página do índice ausente: ${id}`)
  return index + 2
}
const courseIndex = renderItem({
  kind: 'step',
  title: 'Encontre seu passo',
  text: `<b>Dia 1:</b> movimento, velocidades e bordas, páginas ${pageNumber('p2')} a ${pageNumber('p3')}.<br><b>Dia 2:</b> experiência, coleta e memória, páginas ${pageNumber('memoria-experiencia')} a ${pageNumber('coleta-testes')}.<br><b>Dia 3:</b> experiência, duas respostas e testes, páginas ${pageNumber('porta-experiencia')} a ${pageNumber('p8')}.<br><b>Seu jogo no Mural:</b> página ${pageNumber('p9')}.<br><b>Revisão das regras:</b> página ${pageNumber('revisao-final')}.<br><b>Certificado e ajuda:</b> página ${pageNumber('p10')}.`,
})
for (const sheet of sheets) sheet.body = sheet.body.replace('<!-- course-index -->', courseIndex)
const total = sheets.length + 1
const cover = `<section class="page cover" data-id="capa"><div class="cover-art"><img class="scene" src="${scene(true)}" alt="Ilustração da aventura com o farol aceso"></div><div class="cover-copy"><span class="badge">Caderno do Aluno</span><h1>A Chave<br>do <em>Farol</em></h1><p>Todos os passos para construir as regras da sua aventura.</p><div class="cover-bottom">Do primeiro movimento<br>à luz que guia o barco.</div></div><img class="zappy" src="${zappy}" alt="Zappy feliz"></section>`
const body = sheets
  .map(
    (sheet, index) =>
      `<section class="page ${sheet.theme}" data-id="${sheet.id}"><div class="inner"><div class="lesson-hero"><img class="scene" src="${scene(sheet.lit)}" alt="Ilustração do jogo A Chave do Farol"><div class="lesson-hero-text"><div class="kicker">${sheet.kicker}</div><h2>${sheet.title}</h2><p>${sheet.subtitle}</p></div></div><div class="content">${sheet.body}</div></div><div class="page-no"><span class="brand">A Chave do Farol | Caderno do Aluno</span><span>${index + 2} / ${total}</span></div></section>`,
  )
  .join('\n')
const extraCss = `
.lesson-hero .scene { width: 35%; object-fit: contain; background: #e3f6ec; }
.lesson-hero { min-height: 43mm; margin-bottom: 6mm; }
.lesson-hero h2 { font-size: 22pt; }
.lesson-hero .kicker { font-size: 9pt; letter-spacing: .06em; }
.content { display: grid; gap: 4mm; font-size: 11pt; }
.content p { font-size: 11pt; line-height: 1.5; }
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
`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Caderno do Aluno - A Chave do Farol</title><style>${css}\n${extraCss}</style></head><body>${cover}${body}</body></html>`
if (html.includes('{{')) throw new Error('Campo do caderno sem preencher.')
const out = resolve(root, 'tmp/pdfs/desafio-farol')
mkdirSync(out, { recursive: true })
writeFileSync(resolve(out, 'caderno.html'), html)
writeFileSync(
  resolve(out, 'cores-estudio.json'),
  JSON.stringify(Object.fromEntries(usedColors), null, 2),
)
console.log(`${total} páginas preparadas em tmp/pdfs/desafio-farol/caderno.html`)
