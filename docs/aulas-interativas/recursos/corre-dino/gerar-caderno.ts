/**
 * Caderno derivado da mesma fonte das aulas; CSS e fontes do Cadê Todo Mundo. Para a criança, ele
 * é o Mapa da Aventura: o texto impresso usa fase, parte e guia (Diretrizes, seção 6).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { JS_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/js'
import { MATH_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/math'
import { VALUE_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/values'
import { gameTwoDBlocks } from '../../../../packages/studio/src/official-extensions/game-2d/blocks'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'
import { renderProjectToPreviewDocAsync } from '../../../../packages/studio/src/preview/renderProject'
import { etapasDino, projetoDino } from '../../qa/corre-dino-etapas'
import type { Block } from '../../qa/corre-dino-projetos-qa'
import { aulasDino, falasSecao } from '../../qa/gerar-corre-dino'

const root = resolve(import.meta.dir, '../../../..')
const out = resolve(root, 'tmp/pdfs/corre-dino')
mkdirSync(out, { recursive: true })
const reference = readFileSync(
  resolve(import.meta.dir, '../cade-todo-mundo/caderno-do-aluno.template.html'),
  'utf8',
)
const fonts = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}`
const css = reference
  .match(/<style>([\s\S]*?)<\/style>/)?.[1]
  ?.replace('/* {{FONT_FACES}} */', fonts)
if (!css) throw new Error('CSS de referência ausente')
const escapeHtml = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const definitions = new Map(
  [...FRAME_BLOCKS, ...JS_BLOCKS, ...MATH_BLOCKS, ...VALUE_BLOCKS, ...gameTwoDBlocks].map((b) => [
    b.type,
    b,
  ]),
)
const colors: Record<string, string> = {}
const field = (s: string) => `<span class="field">${escapeHtml(s)}</span>`
function blockColor(type: string) {
  const color = definitions.get(type)?.colour
  if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))
    throw new Error(`Cor ausente: ${type}`)
  colors[type] = color
  return color
}
function value(type: string, label: string) {
  return `<span class="value-block" data-block-type="${type}" style="background-color:${blockColor(type)}">${label}</span>`
}
function block(type: string, label: string, children = '') {
  const color = blockColor(type)
  return `<div class="block" data-block-type="${type}" style="background-color:${color}">${label}${children ? `<div class="event-body">${children}</div>` : ''}</div>`
}
const former = '<div class="former">Blocos que você já montou nas fases anteriores</div>'
const frame = (body: string) =>
  block(
    'sz_frame_loops',
    'Enquanto estiver rodando',
    block('sz_g2d_update_each_frame', 'A cada quadro do jogo', body),
  )
const start = (body: string) => block('sz_frame_start', 'Ao iniciar', body)
const condition = (name: string, body: string) =>
  block(
    'sz_js_if_else',
    `Se ${value('sz_g2d_scene_is', `o estado do jogo é ${field(name)}`)}`,
    body,
  )
// Os valores vêm dos programas originais, e os rótulos e cores das definições do Estúdio.
// Os trechos omitidos são indicados, sem fingir que o diagrama é o projeto inteiro.
type Argument = { type: string; name?: string; options?: [string, string][] }
type Definition = { output?: unknown; [key: string]: unknown }
const stages = etapasDino()
function all(value: unknown): Block[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(all)
  const object = value as Record<string, unknown>
  return [
    ...(typeof object.type === 'string' ? [value as Block] : []),
    ...Object.values(object).flatMap(all),
  ]
}
function pick(n: number, type: string, predicate: (b: Block) => boolean = () => true): Block {
  const found = all(stages[n]).find((b) => b.type === type && predicate(b))
  if (!found) throw new Error(`Bloco ausente na etapa ${n}: ${type}`)
  const copy = structuredClone(found)
  delete copy.next
  return copy
}
function renderChain(node: Block | undefined): string {
  return node ? render(node) + renderChain(node.next?.block) : ''
}
function input(node: Block, key: string): string {
  const child = node.inputs?.[key]?.block ?? node.inputs?.[key]?.shadow
  return child ? render(child) : ''
}
function render(node: Block): string {
  if (node.type === 'previous-content') return former
  if (node.type === 'sz_val_number') return field(String(node.fields?.NUM ?? 0))
  if (node.type === 'sz_val_text') return value(node.type, field(String(node.fields?.TEXT ?? '')))
  if (node.type === 'sz_val_join')
    return value(
      node.type,
      `juntar texto ${Object.keys(node.inputs ?? {})
        .map((key) => input(node, key))
        .join(' + ')}`,
    )
  if (node.type === 'sz_js_if_else') {
    let branches = renderChain(node.inputs?.THEN?.block)
    const state = node.extraState as { elseIf?: number; hasElse?: boolean } | undefined
    for (let i = 0; i < (state?.elseIf ?? 0); i++)
      branches += `<div class="branch">Senão se ${input(node, `ELSEIF_COND${i}`)}</div>${renderChain(node.inputs?.[`ELSEIF_THEN${i}`]?.block)}`
    if (state?.hasElse)
      branches += `<div class="branch">Senão</div>${renderChain(node.inputs?.ELSE?.block)}`
    return block(node.type, `Se ${input(node, 'COND')}`, branches)
  }
  const definition = definitions.get(node.type) as Definition | undefined
  if (!definition) throw new Error(`Definição ausente: ${node.type}`)
  const lines: string[] = []
  let children = ''
  for (let row = 0; typeof definition[`message${row}`] === 'string'; row++) {
    const args = (definition[`args${row}`] ?? []) as Argument[]
    const label = escapeHtml(definition[`message${row}`] as string)
      .replace(/%(\d+)/g, (_, digit: string) => {
        const argument = args[Number(digit) - 1]
        if (!argument?.name) return ''
        if (argument.type === 'input_statement') {
          children += renderChain(node.inputs?.[argument.name]?.block)
          return ''
        }
        if (argument.type === 'input_value') return input(node, argument.name)
        const raw = String(node.fields?.[argument.name] ?? '')
        const option = argument.options?.find((entry) => entry[1] === raw)?.[0]
        return field(typeof option === 'string' ? option : raw)
      })
      .trim()
    if (label) lines.push(label)
  }
  const label = lines.join('<br>')
  return definition.output !== undefined
    ? value(node.type, label)
    : block(node.type, label, children)
}
const piece = (n: number, type: string) => render(pick(n, type))
const loops = (body: string) => block('sz_frame_loops', 'Enquanto estiver rodando', body)
const events = (body: string) => block('sz_frame_events', 'Quando acontecer', body)
const timer = (n: number, seconds: number) =>
  render(pick(n, 'sz_g2d_every_seconds', (b) => b.inputs?.SECS?.shadow?.fields?.NUM === seconds))
function screens(n: number, showOpening: boolean): string {
  const branch = pick(
    n,
    'sz_js_if_else',
    (b) => Boolean(b.extraState) && b.inputs?.COND?.block?.fields?.SCENE === 'jogando',
  )
  branch.inputs!.THEN = { block: { type: 'previous-content' } }
  if (!showOpening) branch.inputs!.ELSEIF_THEN0 = { block: { type: 'previous-content' } }
  return frame(former + render(branch))
}
const diagrams: string[][] = [
  [render(pick(1, 'sz_frame_start'))],
  [
    render(pick(2, 'sz_frame_start')),
    frame(piece(2, 'sz_g2d_clear') + piece(2, 'sz_g2d_forest') + piece(2, 'sz_g2d_draw_sprite')),
  ],
  [
    frame(
      former +
        piece(3, 'sz_g2d_apply_gravity') +
        piece(3, 'sz_g2d_control_dino') +
        piece(3, 'sz_g2d_draw_sprite'),
    ),
  ],
  [events(piece(4, 'sz_g2d_on_jump'))],
  [
    start(former + piece(5, 'sz_g2d_create_group')),
    frame(former + piece(5, 'sz_g2d_update_group') + piece(5, 'sz_g2d_draw_group')),
    loops(timer(5, 1.4)),
  ],
  [frame(former + piece(6, 'sz_g2d_prune_offscreen'))],
  [
    start(former + piece(7, 'sz_g2d_set_scene')),
    frame(piece(7, 'sz_g2d_clear') + piece(7, 'sz_g2d_forest') + condition('jogando', former)),
    loops(timer(7, 1.4)),
  ],
  [screens(8, true), events(piece(8, 'sz_g2d_on_any_input'))],
  [
    frame(
      condition(
        'jogando',
        former + piece(9, 'sz_g2d_on_sprite_group_overlap') + piece(9, 'sz_g2d_prune_offscreen'),
      ),
    ),
    screens(9, false),
    events(piece(9, 'sz_g2d_on_any_input')),
  ],
  [start(former + piece(10, 'sz_g2d_set_hitbox_scale'))],
  [
    start(former + piece(11, 'sz_js_var_create')),
    frame(condition('jogando', former + piece(11, 'sz_g2d_draw_score'))),
    loops(timer(11, 1)),
    screens(11, false),
  ],
  [loops(timer(12, 1.4))],
  [
    start(former + render(pick(13, 'sz_js_var_create', (b) => b.fields?.NAME === 'velocidade'))),
    loops(timer(13, 1.4)),
    loops(timer(13, 5)),
    start(piece(13, 'sz_g2d_setup_stage') + piece(13, 'sz_g2d_set_stage_description') + former),
  ],
]

const chapters = aulasDino.map((lesson, i) => {
  const chunks: string[] = []
  for (const section of lesson.sections) {
    if (section.materials) continue
    const heading = `<h3 class="section-head">${escapeHtml(section.title)}</h3>`
    if (section.questions) {
      chunks.push(
        `${heading}<div class="note">${escapeHtml(section.bridge)} As perguntas ficam na fase.</div>`,
      )
      continue
    }
    // Onde o vídeo é demonstração na primeira pessoa, o caderno traz os passos no imperativo.
    const speech = section.caderno ?? falasSecao(section)
    // Mantenha a abertura junto da primeira ação e a saída junto do último teste.
    // Cada passo conserva seu parágrafo e número, mesmo quando ocupa a mesma página.
    for (let p = 0; p < speech.length; ) {
      const remaining = speech.length - p
      const size = p === 0 ? Math.min(2, remaining) : remaining === 2 ? 2 : 1
      chunks.push(
        `${p === 0 ? heading : ''}${speech
          .slice(p, p + size)
          .map(
            (paragraph, offset) =>
              `<div class="step"><span class="number">${p + offset + 1}</span><p>${escapeHtml(paragraph)}</p></div>`,
          )
          .join('')}`,
      )
      p += size
    }
  }
  return {
    title: lesson.title,
    label: `Fase ${i + 1}`,
    chunks,
    diagrams: diagrams[i]!.map(
      (d) =>
        `<div class="blocks">${d}</div><p class="small">Encaixes desta fase, com as cores dos blocos do Estúdio. As instruções trazem os caminhos, os valores e os testes completos.</p>`,
    ),
  }
})
const data = JSON.stringify(chapters).replaceAll('<', '\u003c')
const zappy = `data:image/webp;base64,${readFileSync(resolve(root, 'packages/community-kids/public/zappy/happy.webp')).toString('base64')}`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Corre, Dino! · Mapa da Aventura</title><style>${css}
.content{padding-top:4mm}.content>.entry{margin-bottom:4mm}.content .section-head{margin-top:2mm}.content .step{font-size:11pt}.content .blocks{margin:0;display:grid;gap:10px}.former{font:700 10pt Nunito;color:#585a7a;padding:7px;background:#f2f3fa;border-radius:6px}.branch{font:800 10pt Nunito;color:#1f2042;padding:6px}.field{white-space:normal}.value-block{display:inline-block;border-radius:12px;padding:3px 8px;color:#fff;font-weight:800;line-height:1.6}.value-block .field{padding:1px 5px;font-size:inherit}.cover-art{height:48%;background:#07162e;display:flex;align-items:center}.cover-art img{width:100%;height:auto!important;object-fit:contain!important}.cover h1{font-size:38pt}.cover .cover-bottom{margin-top:10mm}.lesson-title{font-size:24pt;margin-top:3mm}.index{display:grid;gap:12px;margin-top:6mm}.index p{font-size:11pt}.diagram-page .content .block{font-size:9.5pt}.diagram-page .event-body{gap:5px;padding:6px;margin-top:6px}
</style></head><body><section class="page cover" data-id="capa"><div class="cover-art"><img class="scene" src="jogo.png" alt="O jogo Corre, Dino! em funcionamento"></div><div class="cover-copy"><span class="badge">Mapa da Aventura</span><h1>Corre,<br><em>Dino!</em></h1><p>Os passos para construir, testar e recomeçar seu jogo.</p><div class="cover-bottom">Da primeira tela à corrida completa.</div></div><img class="zappy" src="${zappy}" alt="Zappy"></section>
<script>const chapters=${data};
function page(chapter, more=false, diagram=false){const p=document.createElement('section');p.className='page'+(diagram?' diagram-page':'');p.dataset.id=chapter.label; p.innerHTML='<div class="inner"><div class="kicker">'+chapter.label+(more?' · continuação':'')+'</div><h2 class="lesson-title">'+chapter.title+'</h2><div class="content"></div></div><div class="page-no"><span class="brand">Corre, Dino! | Mapa da Aventura</span><span class="count"></span></div>';document.body.append(p);return p;}
async function layout(){await document.fonts.ready;const index=page({label:'Seu percurso',title:'Uma parte do jogo por fase'});const content=index.querySelector('.content');content.innerHTML='<p class="lead">Este é o seu Mapa da Aventura! Consulte quando precisar de um passo, um valor ou um teste: você pode ler aqui na fase ou baixar para guardar.</p><div class="index">'+chapters.map(c=>'<p><strong>'+c.label+'.</strong> '+c.title+'</p>').join('')+'</div><div class="note" style="margin-top:6mm">Os desenhos do Dino, da floresta e dos efeitos vêm nos blocos. Você vai programar como eles participam do jogo. Continue sempre no projeto que você enviou na fase anterior.</div>';
for(const chapter of chapters){let sheet=page(chapter);for(const chunk of chapter.chunks){const node=document.createElement('div');node.className='entry';node.innerHTML=chunk;sheet.querySelector('.content').append(node);const limit=sheet.querySelector('.page-no').getBoundingClientRect().top-24;if(node.getBoundingClientRect().bottom>limit){node.remove();sheet=page(chapter,true);sheet.querySelector('.content').append(node);}}

for(const fragment of chapter.diagrams){const diagram=document.createElement('div');diagram.className='entry';diagram.innerHTML='<h3 class="section-head">Confira os encaixes</h3>'+fragment;sheet.classList.add('diagram-page');sheet.querySelector('.content').append(diagram);if(diagram.getBoundingClientRect().bottom>sheet.querySelector('.page-no').getBoundingClientRect().top-24){diagram.remove();if(!sheet.querySelector('.blocks'))sheet.classList.remove('diagram-page');sheet=page({label:chapter.label+' · confira os encaixes',title:chapter.title},false,true);sheet.querySelector('.content').append(diagram);}}}
const pages=[...document.querySelectorAll('.page')];pages.forEach((p,i)=>{const c=p.querySelector('.count');if(c)c.textContent=(i+1)+' / '+pages.length});window.cadernoPronto=true;}
layout();</script></body></html>`
writeFileSync(resolve(out, 'caderno.html'), html)
writeFileSync(resolve(out, 'cores-estudio.json'), JSON.stringify(colors, null, 2))
const project = projetoDino(13)
writeFileSync(resolve(out, 'jogo.html'), await renderProjectToPreviewDocAsync(project))
console.log('Caderno e jogo de referência preparados em tmp/pdfs/corre-dino.')
