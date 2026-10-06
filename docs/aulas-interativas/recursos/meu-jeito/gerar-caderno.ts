/**
 * Caderno derivado da mesma fonte das aulas; CSS e fontes do Cadê Todo Mundo. Para a criança, o
 * caderno é o Mapa da Aventura e fala de fase, parte e guia (vocabulário da aventura, 06/10/2026).
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
import type { Block } from '../../qa/corre-dino-projetos-qa'
import { aulasMeuJeito, falasSecao } from '../../qa/gerar-meu-jeito'
import { etapasMeuJeito, projetoMeuJeito } from '../../qa/meu-jeito-etapas'
import { naveQuadro, pedraQuadro, svgSheet } from './artes-referencia'

const root = resolve(import.meta.dir, '../../../..')
const out = resolve(root, 'tmp/pdfs/meu-jeito')
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
const start = (body: string) => block('sz_frame_start', 'Ao iniciar', body)
// Os valores vêm dos programas originais, e os rótulos e cores das definições do Estúdio.
// Os trechos omitidos são indicados, sem fingir que o diagrama é o projeto inteiro.
type Argument = { type: string; name?: string; options?: [string, string][] }
type Definition = { output?: unknown; [key: string]: unknown }
const stages = etapasMeuJeito()
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

const piece = (n: number, type: string, predicate?: (b: Block) => boolean) =>
  render(pick(n, type, predicate))
const figure = (body: string, size: number, label: string) =>
  `<figure class="art-frame"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}">${body}</svg><figcaption>${label}</figcaption></figure>`
const pair = (name: 'nave' | 'asteroide') =>
  `<div class="art-pair">${[0, 1].map((i) => figure(name === 'nave' ? naveQuadro(i) : pedraQuadro(i), name === 'nave' ? 32 : 64, `Quadro ${i + 1}`)).join('')}</div><p class="small">O corpo fica no lugar. Compare o fogo${name === 'asteroide' ? ' e as crateras' : ''}. Este desenho é uma referência; escolha suas cores e formas.</p>`
const sheet = (name: 'nave' | 'asteroide') =>
  `<div class="sheet">${svgSheet(name)}</div><p class="small">Folha ${name === 'nave' ? '64 × 32' : '128 × 64'}: dois quadros de ${name === 'nave' ? '32 × 32' : '64 × 64'}. No bloco, a contagem dos quadros começa em 0.</p>`
const cards = (items: string[]) =>
  `<div class="flow">${items.map((s, i) => `<div><span>${i + 1}</span><p>${s}</p></div>`).join('')}</div>`
const diagrams: string[][] = [
  [
    cards([
      'Seu jogo concluído na última fase de Nave Contra Asteroides.',
      'Baixar o projeto guarda um arquivo .szproject.json.',
      'Importar abre uma cópia no seu Estúdio. Mudar a cópia não muda o jogo da fase.',
    ]),
  ],
  [
    figure(
      naveQuadro(0).replace(/<path d="M13 28[\s\S]*?<\/g>/, '</g>'),
      32,
      'Exemplo de nave: reserve as quatro linhas de baixo para o motor.',
    ),
  ],
  [pair('nave'), sheet('nave')],
  [
    figure(
      `<path d="M9 39 Q6 28 20 27 Q30 20 42 28 Q57 30 56 44 Q54 59 39 61 Q25 66 14 57 Q6 52 9 39Z" fill="#7f7198" stroke="#403951" stroke-width="2"/><ellipse cx="28" cy="39" rx="7" ry="5" fill="#574967"/><ellipse cx="40" cy="52" rx="5" ry="4" fill="#574967"/>`,
      64,
      'Exemplo de asteroide: forma fechada, crateras e espaço para o fogo.',
    ),
  ],
  [
    pair('asteroide'),
    cards([
      'Na frente: pedra e crateras.',
      'No meio: chama menor e clara.',
      'Atrás: chama maior. Confira a ordem nos dois quadros.',
    ]),
  ],
  [
    start(piece(6, 'sz_g2d_setup_stage') + piece(6, 'sz_g2d_create_image_sprite') + former),
    start(former + piece(6, 'sz_g2d_load_spritesheet') + piece(6, 'sz_g2d_animate_sprite')),
    sheet('nave'),
  ],
  [
    start(
      former + piece(7, 'sz_g2d_load_spritesheet', (b) => b.fields?.NAME === 'folha-asteroide'),
    ),
    block('sz_frame_loops', 'Enquanto estiver rodando', piece(7, 'sz_g2d_every_frames')),
    sheet('asteroide'),
  ],
  [
    cards([
      'Projeto salvo: você continua editando no Estúdio.',
      'Publicação: uma cópia daquele momento no Mural. Se quiser, compartilhe o seu jogo.',
      'Envio: escolher o cartão na galeria da fase e clicar em Enviar para o guia. Espere a confirmação Recebido pelo seu guia.',
    ]),
  ],
]

const chapters = aulasMeuJeito.map((lesson, i) => {
  const chunks: string[] = []
  for (const section of lesson.sections) {
    const heading = `<h3 class="section-head">${escapeHtml(section.title)}</h3>`
    if (section.questions) {
      chunks.push(
        `${heading}<div class="note">${escapeHtml(section.bridge)} As perguntas ficam na fase.</div>`,
      )
      continue
    }
    // O caderno é da criança. Desde 06/10/2026 o vídeo da experiência e o do jogo pronto são
    // demonstrações na primeira pessoa: na experiência entram as instruções dela, no imperativo, e
    // no jogo pronto sai o exemplo do narrador ("Olha aqui: …"). A apresentação do Mapa da
    // Aventura também começa com "Olha aqui:" e fica, porque é ela que diz o que o mapa traz.
    const speech = section.activity
      ? [section.activity.instructions, 'Quando terminar os testes, clique em Próxima parte.']
      : falasSecao(section).filter(
          (paragraph) => !(section.play && paragraph.startsWith('Olha aqui:')),
        )
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
        `<div class="blocks">${d}</div><p class="small">Compare com a sua criação. Nos diagramas de programação, rótulos, valores e cores vêm dos blocos reais do Estúdio; os trechos anteriores estão indicados.</p>`,
    ),
  }
})
const data = JSON.stringify(chapters).replaceAll('<', '\u003c')
const zappy = `data:image/webp;base64,${readFileSync(resolve(root, 'packages/community-kids/public/zappy/happy.webp')).toString('base64')}`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>O Jogo do Meu Jeito · Mapa da Aventura</title><style>${css}
.art-pair{display:flex;gap:8mm}.art-frame{margin:0;flex:1;text-align:center}.art-frame svg{width:60mm;height:60mm;background:#f5f1ff;border:1px solid #ddd6ee;border-radius:10px}.art-frame figcaption{font:700 11pt Nunito;margin-top:4mm}.sheet svg{width:125mm;height:auto;background:#f5f1ff;border:1px solid #ddd6ee;border-radius:10px}.flow{display:grid;gap:4mm}.flow>div{display:flex;gap:4mm;align-items:center;border:1px solid #dbd3ef;border-radius:12px;padding:4mm;background:#f8f5ff}.flow span{font:800 18pt Nunito;color:#7655b5}.flow p{margin:0;font-size:12pt}.content{padding-top:4mm}.content>.entry{margin-bottom:4mm}.content .section-head{margin-top:2mm}.content .step{font-size:11pt}.content .blocks{margin:0;display:grid;gap:10px}.former{font:700 10pt Nunito;color:#585a7a;padding:7px;background:#f2f3fa;border-radius:6px}.branch{font:800 10pt Nunito;color:#1f2042;padding:6px}.field{white-space:normal}.value-block{display:inline-block;border-radius:12px;padding:3px 8px;color:#fff;font-weight:800;line-height:1.6}.value-block .field{padding:1px 5px;font-size:inherit}.cover-art{height:48%;background:#07162e;display:flex;align-items:center}.cover-art img{width:100%;height:auto!important;object-fit:contain!important}.cover h1{font-size:38pt}.cover .cover-bottom{margin-top:10mm}.lesson-title{font-size:24pt;margin-top:3mm}.index{display:grid;gap:12px;margin-top:6mm}.index p{font-size:11pt}.diagram-page .content .block{font-size:9.5pt}.diagram-page .event-body{gap:5px;padding:6px;margin-top:6px}
</style></head><body><section class="page cover" data-id="capa"><div class="cover-art"><img class="scene" src="jogo.png" alt="O jogo O Jogo do Meu Jeito em funcionamento"></div><div class="cover-copy"><span class="badge">Mapa da Aventura</span><h1>O jogo<br><em>do meu jeito</em></h1><p>Desenhe, anime e coloque suas criações no jogo.</p><div class="cover-bottom">Do seu desenho à sua versão jogável.</div></div><img class="zappy" src="${zappy}" alt="Zappy"></section>
<script>const chapters=${data};
function page(chapter, more=false, diagram=false){const p=document.createElement('section');p.className='page'+(diagram?' diagram-page':'');p.dataset.id=chapter.label; p.innerHTML='<div class="inner"><div class="kicker">'+chapter.label+(more?' · continuação':'')+'</div><h2 class="lesson-title">'+chapter.title+'</h2><div class="content"></div></div><div class="page-no"><span class="brand">O Jogo do Meu Jeito | Mapa da Aventura</span><span class="count"></span></div>';document.body.append(p);return p;}
async function layout(){await document.fonts.ready;const index=page({label:'Seu percurso',title:'Seu desenho dentro do jogo'});const content=index.querySelector('.content');content.innerHTML='<p class="lead">Este é o seu Mapa da Aventura! Consulte quando precisar de um passo, um valor ou um teste: leia aqui na fase ou baixe para guardar.</p><div class="index">'+chapters.map(c=>'<p><strong>'+c.label+'.</strong> '+c.title+'</p>').join('')+'</div><div class="note" style="margin-top:6mm">Continue no seu cartão do Estúdio e nas suas artes do Pinta. As imagens deste mapa são exemplos; as cores e as formas das suas artes são escolha sua. Nomes, dimensões e animações precisam combinar com os blocos. Você envia as suas criações para o guia pela galeria da fase.</div>';
for(const chapter of chapters){let sheet=page(chapter);for(const chunk of chapter.chunks){const node=document.createElement('div');node.className='entry';node.innerHTML=chunk;sheet.querySelector('.content').append(node);const limit=sheet.querySelector('.page-no').getBoundingClientRect().top-24;if(node.getBoundingClientRect().bottom>limit){node.remove();sheet=page(chapter,true);sheet.querySelector('.content').append(node);}}

for(const fragment of chapter.diagrams){const diagram=document.createElement('div');diagram.className='entry';diagram.innerHTML='<h3 class="section-head">Referências para conferir</h3>'+fragment;sheet.classList.add('diagram-page');sheet.querySelector('.content').append(diagram);if(diagram.getBoundingClientRect().bottom>sheet.querySelector('.page-no').getBoundingClientRect().top-24){diagram.remove();if(!sheet.querySelector('.blocks'))sheet.classList.remove('diagram-page');sheet=page({label:chapter.label+' · referências',title:chapter.title},false,true);sheet.querySelector('.content').append(diagram);}}}
const pages=[...document.querySelectorAll('.page')];pages.forEach((p,i)=>{const c=p.querySelector('.count');if(c)c.textContent=(i+1)+' / '+pages.length});window.cadernoPronto=true;}
layout();</script></body></html>`
writeFileSync(resolve(out, 'caderno.html'), html)
writeFileSync(resolve(out, 'cores-estudio.json'), JSON.stringify(colors, null, 2))
const project = projetoMeuJeito(8)
writeFileSync(resolve(out, 'jogo.html'), await renderProjectToPreviewDocAsync(project))
console.log('Caderno e jogo de referência preparados em tmp/pdfs/meu-jeito.')
