/**
 * Caderno derivado da mesma fonte das aulas; CSS e fontes do Cadê Todo Mundo. Para a criança, ele
 * é o Mapa da Aventura, com fases e partes (Diretrizes, seção 6, 06/10/2026).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { JS_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/js'
import { VALUE_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/values'
import { gameTwoDBlocks } from '../../../../packages/studio/src/official-extensions/game-2d/blocks'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'
import { renderProjectToPreviewDocAsync } from '../../../../packages/studio/src/preview/renderProject'
import { aulasNave, falasSecao } from '../../qa/gerar-nave-contra-asteroides'
import { projetoNave } from '../../qa/nave-contra-asteroides-etapas'

const root = resolve(import.meta.dir, '../../../..')
const out = resolve(root, 'tmp/pdfs/nave-contra-asteroides')
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
  [...FRAME_BLOCKS, ...JS_BLOCKS, ...VALUE_BLOCKS, ...gameTwoDBlocks].map((b) => [b.type, b]),
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
const diagrams = [
  start(
    block('sz_g2d_setup_stage', `Preparar o jogo · tela ${field('800 × 480')}`) +
      block(
        'sz_g2d_create_ship',
        `Criar nave ${field('nave')} · x ${field('400')} · y ${field('410')}<br>largura ${field('54')} · altura ${field('62')}`,
      ),
  ) + frame(block('sz_g2d_draw_sprite', `Desenhar o sprite ${field('nave')}`)),
  frame(
    block('sz_g2d_clear', 'Limpar a tela') +
      block('sz_g2d_starfield', `Desenhar fundo de estrelas · velocidade ${field('1')}`) +
      block(
        'sz_g2d_arrows_x',
        `Mover o sprite ${field('nave')} com as setas · velocidade ${field('7')}`,
      ) +
      block('sz_g2d_clamp_to_screen', `Manter o sprite ${field('nave')} dentro da tela`) +
      block('sz_g2d_draw_sprite', `Desenhar o sprite ${field('nave')}`),
  ),
  block(
    'sz_frame_events',
    'Quando acontecer',
    block(
      'sz_g2d_on_key',
      `Quando apertar a tecla ${field('barra de espaço')}`,
      block(
        'sz_g2d_spawn_bullet',
        `Criar tiro no grupo ${field('tiros')}<br>x ${value('sz_g2d_center_x', `centro x de ${field('nave')}`)} · y ${value('sz_g2d_sprite_y', `posição y de ${field('nave')}`)}<br>raio ${field('5')} · vx ${field('0')} · vy ${field('-9')}`,
      ) + block('sz_g2d_play_fx', `Tocar efeito ${field('tiro')}`),
    ),
  ) +
    frame(
      former +
        block('sz_g2d_update_group', `Mover os sprites do grupo ${field('tiros')}`) +
        block('sz_g2d_prune_offscreen', `Tirar do grupo ${field('tiros')} quem sair da tela`) +
        block('sz_g2d_draw_group', `Desenhar o grupo ${field('tiros')}`),
    ),
  block(
    'sz_frame_loops',
    'Enquanto estiver rodando',
    block(
      'sz_g2d_update_each_frame',
      'A cada quadro do jogo',
      former +
        block('sz_g2d_update_group', `Mover os sprites do grupo ${field('asteroides')}`) +
        block('sz_g2d_prune_offscreen', `Tirar do grupo ${field('asteroides')} quem sair da tela`) +
        block('sz_g2d_draw_group', `Desenhar o grupo ${field('asteroides')}`),
    ) +
      block(
        'sz_g2d_every_frames',
        `A cada ${field('40')} quadros`,
        block(
          'sz_g2d_spawn_asteroid',
          `No grupo ${field('asteroides')} criar um asteroide<br>x ${value('sz_g2d_random_x', 'um x aleatório na tela')} · y ${field('-30')}<br>tamanho ${field('40')} · vx ${field('0')} · vy ${field('3')}`,
        ),
      ),
  ),
  frame(
    former +
      block(
        'sz_g2d_on_group_overlap',
        `Para cada colisão entre ${field('tiros')} e ${field('asteroides')}<br>apelidos ${field('tiro')} e ${field('asteroide')}`,
        block('sz_g2d_remove_from_group', `Tirar ${field('tiro')} do grupo ${field('tiros')}`) +
          block(
            'sz_g2d_remove_from_group',
            `Tirar ${field('asteroide')} do grupo ${field('asteroides')}`,
          ) +
          block('sz_g2d_explode', `Soltar explosão no sprite ${field('asteroide')}`) +
          block('sz_g2d_play_fx', `Tocar efeito ${field('explosão')}`),
      ),
  ),
  start(
    former + block('sz_js_var_create', `Criar variável ${field('pontos')} com valor ${field('0')}`),
  ) +
    frame(
      former +
        block(
          'sz_g2d_on_group_overlap',
          'Na colisão entre tiros e asteroides',
          former +
            block('sz_js_var_increment', `Somar ${field('1')} em variável ${field('pontos')}`),
        ) +
        block(
          'sz_g2d_draw_score',
          `Mostrar placar ${field('Pontos:')} · valor ${value('sz_val_variable', `valor da variável ${field('pontos')}`)}<br>x ${field('12')} · y ${field('30')} · tamanho ${field('24')}`,
        ),
    ),
  start(
    former + block('sz_g2d_set_health', `Dar ao sprite ${field('nave')} ${field('3')} de vida`),
  ) +
    frame(
      former +
        block(
          'sz_g2d_on_sprite_group_overlap',
          `Para cada sprite de ${field('asteroides')} que colidir com ${field('nave')}<br>apelido ${field('inimigo')}`,
          block(
            'sz_g2d_remove_from_group',
            `Tirar ${field('inimigo')} do grupo ${field('asteroides')}`,
          ) +
            block('sz_g2d_explode', `Soltar explosão no sprite ${field('inimigo')}`) +
            block(
              'sz_g2d_damage_sprite',
              `Machucar ${field('nave')} em ${field('1')}<br>e deixá-la invencível por ${field('45')} quadros`,
            ) +
            block('sz_g2d_shake', `Tremer a tela · intensidade ${field('8')}`),
        ) +
        block(
          'sz_g2d_draw_sprite_health',
          `Desenhar vidas de ${field('nave')} como ${field('corações')}<br>x ${field('12')} · y ${field('48')} · tamanho ${field('22')}`,
        ),
    ),
  frame(
    block(
      'sz_js_if_else',
      `Se ${value('sz_g2d_scene_is', `o estado do jogo é ${field('jogando')}`)}`,
      former +
        `<div class="branch">Senão se ${value('sz_g2d_scene_is', `o estado do jogo é ${field('inicio')}`)}:</div>` +
        block('sz_g2d_show_screen', 'Mostrar a tela de abertura'),
    ),
  ) +
    block(
      'sz_frame_loops',
      'No intervalo que já existe',
      block(
        'sz_g2d_every_frames',
        `A cada ${field('40')} quadros`,
        condition(
          'jogando',
          block('sz_g2d_spawn_asteroid', 'Criar o asteroide com os valores da fase 4'),
        ),
      ),
    ) +
    block(
      'sz_frame_events',
      'Quando acontecer',
      block(
        'sz_g2d_on_key',
        'Quando apertar barra de espaço',
        condition(
          'jogando',
          block('sz_g2d_spawn_bullet', 'Criar o tiro com os valores da fase 3') +
            block('sz_g2d_play_fx', 'Tocar efeito tiro'),
        ),
      ),
    ),
  start(
    former +
      block('sz_js_const_create', `Criar constante ${field('alvo')} com valor ${field('26')}`) +
      block('sz_g2d_set_scene', `Mudar o estado do jogo para ${field('inicio')}`),
  ) +
    block(
      'sz_frame_events',
      'Quando acontecer',
      block(
        'sz_g2d_on_key',
        `Quando apertar a tecla ${field('Enter')}`,
        block(
          'sz_js_if_else',
          `Se ${value('sz_g2d_scene_is', `o estado do jogo é ${field('inicio')}`)}`,
          block('sz_g2d_set_scene', `Mudar o estado para ${field('jogando')}`) +
            `<div class="branch">Senão se ${value('sz_g2d_scene_is', `o estado do jogo é ${field('fim')}`)}:</div>` +
            block('sz_g2d_restart', 'Reiniciar o jogo') +
            `<div class="branch">Senão se ${value('sz_g2d_scene_is', `o estado do jogo é ${field('vitoria')}`)}:</div>` +
            block('sz_g2d_restart', 'Reiniciar o jogo'),
        ),
      ),
    ),
]

const chapters = aulasNave.map((lesson, i) => {
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
    // Os vídeos da experiência e do jogo pronto são demonstrações do narrador, na primeira pessoa
    // (Diretrizes, 06/10/2026). O caderno é a consulta de quem faz: ali ficam os passos no imperativo.
    const speech =
      section.activity?.activity.type === 'experimentation'
        ? [section.activity.instructions]
        : section.play
          ? [section.bridge]
          : falasSecao(section)
    speech.forEach((paragraph, p) => {
      chunks.push(
        `${p === 0 ? heading : ''}<div class="step"><span class="number">${p + 1}</span><p>${escapeHtml(paragraph)}</p></div>`,
      )
    })
  }
  return {
    title: lesson.title,
    label: `Fase ${i + 1}`,
    chunks,
    diagram: `<div class="blocks">${diagrams[i]}</div><p class="small">Esquema dos encaixes desta fase, com as cores dos blocos do Estúdio. Os passos anteriores trazem os caminhos, os campos e os testes completos.</p>`,
  }
})
const data = JSON.stringify(chapters).replaceAll('<', '\u003c')
const zappy = `data:image/webp;base64,${readFileSync(resolve(root, 'packages/community-kids/public/zappy/happy.webp')).toString('base64')}`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Nave Contra Asteroides · Mapa da Aventura</title><style>${css}
.content{padding-top:4mm}.content>.entry{margin-bottom:4mm}.content .section-head{margin-top:2mm}.content .step{font-size:11pt}.content .blocks{margin:0;display:grid;gap:10px}.former{font:700 10pt Nunito;color:#585a7a;padding:7px;background:#f2f3fa;border-radius:6px}.branch{font:800 10pt Nunito;color:#1f2042;padding:6px}.field{white-space:normal}.value-block{display:inline-block;border-radius:12px;padding:3px 8px;color:#fff;font-weight:800;line-height:1.6}.value-block .field{padding:1px 5px;font-size:inherit}.cover-art{height:48%;background:#07162e;display:flex;align-items:center}.cover-art img{width:100%;height:auto!important;object-fit:contain!important}.cover h1{font-size:38pt}.cover .cover-bottom{margin-top:10mm}.lesson-title{font-size:24pt;margin-top:3mm}.index{display:grid;gap:12px;margin-top:6mm}.index p{font-size:11pt}.diagram-page .content .block{font-size:9.5pt}.diagram-page .event-body{gap:5px;padding:6px;margin-top:6px}
</style></head><body><section class="page cover" data-id="capa"><div class="cover-art"><img class="scene" src="jogo.png" alt="O jogo Nave Contra Asteroides em funcionamento"></div><div class="cover-copy"><span class="badge">Mapa da Aventura</span><h1>Nave Contra<br><em>Asteroides</em></h1><p>Os passos para construir, testar e recomeçar seu jogo.</p><div class="cover-bottom">Da primeira nave à partida completa.</div></div><img class="zappy" src="${zappy}" alt="Zappy"></section>
<script>const chapters=${data};
function page(chapter, more=false, diagram=false){const p=document.createElement('section');p.className='page'+(diagram?' diagram-page':'');p.dataset.id=chapter.label; p.innerHTML='<div class="inner"><div class="kicker">'+chapter.label+(more?' · continuação':'')+'</div><h2 class="lesson-title">'+chapter.title+'</h2><div class="content"></div></div><div class="page-no"><span class="brand">Nave Contra Asteroides | Mapa da Aventura</span><span class="count"></span></div>';document.body.append(p);return p;}
async function layout(){await document.fonts.ready;const index=page({label:'Seu percurso',title:'Uma parte do jogo por fase'});const content=index.querySelector('.content');content.innerHTML='<p class="lead">Consulte este mapa quando precisar de um passo, um valor ou um teste: leia aqui na fase ou baixe para guardar.</p><div class="index">'+chapters.map(c=>'<p><strong>'+c.label+'.</strong> '+c.title+'</p>').join('')+'</div><div class="note" style="margin-top:6mm">Os desenhos da nave, das estrelas e dos efeitos vêm nos blocos. Você vai programar como eles participam do jogo. Continue sempre no projeto que você enviou na fase anterior.</div>';
for(const chapter of chapters){let sheet=page(chapter);for(const chunk of chapter.chunks){const node=document.createElement('div');node.className='entry';node.innerHTML=chunk;sheet.querySelector('.content').append(node);const limit=sheet.querySelector('.page-no').getBoundingClientRect().top-24;if(node.getBoundingClientRect().bottom>limit){node.remove();sheet=page(chapter,true);sheet.querySelector('.content').append(node);}}

const diagram=document.createElement('div');diagram.className='entry';diagram.innerHTML='<h3 class="section-head">Confira os encaixes</h3>'+chapter.diagram;sheet.classList.add('diagram-page');sheet.querySelector('.content').append(diagram);if(diagram.getBoundingClientRect().bottom>sheet.querySelector('.page-no').getBoundingClientRect().top-24){diagram.remove();sheet.classList.remove('diagram-page');const lastContent=sheet.querySelector('.content');const prior=sheet.previousElementSibling;if(prior?.dataset.id===chapter.label){const priorContent=prior.querySelector('.content');const limit=sheet.querySelector('.page-no').getBoundingClientRect().top-24;const minimum=(limit-lastContent.getBoundingClientRect().top)*0.3;while(lastContent.getBoundingClientRect().height<minimum&&priorContent.children.length>1){const moved=priorContent.lastElementChild;lastContent.prepend(moved);if(lastContent.getBoundingClientRect().bottom>limit){priorContent.append(moved);break;}}}const drawing=page({label:chapter.label+' · confira os encaixes',title:chapter.title},false,true);drawing.querySelector('.content').innerHTML=chapter.diagram;}}
const pages=[...document.querySelectorAll('.page')];pages.forEach((p,i)=>{const c=p.querySelector('.count');if(c)c.textContent=(i+1)+' / '+pages.length});window.cadernoPronto=true;}
layout();</script></body></html>`
writeFileSync(resolve(out, 'caderno.html'), html)
writeFileSync(resolve(out, 'cores-estudio.json'), JSON.stringify(colors, null, 2))
const project = projetoNave(9)
writeFileSync(resolve(out, 'jogo.html'), await renderProjectToPreviewDocAsync(project))
console.log('Caderno e jogo de referência preparados em tmp/pdfs/nave-contra-asteroides.')
