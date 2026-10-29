import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { JS_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/js'
import { VALUE_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/values'
import { gameTwoDBlocks } from '../../../../packages/studio/src/official-extensions/game-2d/blocks'
import { gameThreeDBlocks } from '../../../../packages/studio/src/official-extensions/game-3d/blocks'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'
import { ponteAjuda, ponteAulas } from '../../qa/ponte-conteudo'
import { PONTE_ASSETS_2D } from '../../qa/ponte-projeto'

// O mesmo template do Cadê Todo Mundo, com as fontes e as cores reais dos blocos do Estúdio,
// como os cadernos dos Faróis e do Jardim Secreto.
const root = resolve(import.meta.dirname, '../../../..'),
  out = resolve(root, 'tmp/pdfs/a-ponte-apressada')
mkdirSync(out, { recursive: true })
const reference = readFileSync(
  resolve(import.meta.dirname, '../cade-todo-mundo/caderno-do-aluno.template.html'),
  'utf8',
)
const base = reference.match(/<style>([\s\S]*?)<\/style>/)?.[1]
if (!base) throw Error('Template do Cadê ausente')
const css = base.replace(
  '/* {{FONT_FACES}} */',
  `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}`,
)
const esc = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const defs = new Map(
  [...FRAME_BLOCKS, ...JS_BLOCKS, ...VALUE_BLOCKS, ...gameTwoDBlocks, ...gameThreeDBlocks].map(
    (b) => [b.type, b],
  ),
)
const attrs = (type: string) => {
  const definition = defs.get(type)
  const color = definition && 'colour' in definition ? definition.colour : undefined
  if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))
    throw Error(`Cor ausente: ${type}`)
  return `data-block-type="${type}" style="background-color:${color}"`
}
const field = (s: string) => `<span class="field">${esc(s)}</span>`
const value = (type: string, s: string) =>
  `<span class="value-block" ${attrs(type)}>${type === 'sz_val_variable' ? 'valor da variável ' : ''}${field(s)}</span>`
const block = (type: string, s: string) => `<div class="block" ${attrs(type)}>${s}</div>`
const nested = (type: string, s: string, body: string) =>
  block(
    type,
    `${s}<div class="do-row"><span class="do-label">fazer</span><div class="event-body">${body}</div></div>`,
  )
const area = (type: string, title: string, body: string) =>
  `<div class="event-block" ${attrs(type)}><span class="tag">Áreas do projeto · ${title}</span><div class="event-body">${body}</div></div>`
const prepared = (s: string) => `<div class="prepared">${esc(s)} (já vem no projeto)</div>`
const num = (s: string) => value('sz_val_number', s)
const bool = (s: string) => value('sz_val_bool', s)
const message = (s: string) =>
  block('sz_js_var_assign', `Alterar variável ${field('aviso')} para ${value('sz_val_text', s)}`)
function drawings(three: boolean): Record<string, string> {
  const events = (body: string) => area('sz_frame_events', 'Quando acontecer', body)
  const encontro = (other: string, body: string) =>
    nested(
      three ? 'sz_g3d_on_touch' : 'sz_g2d_on_overlap',
      three
        ? `Quando ${field('personagem')} encostar em ${field(other)}`
        : `Quando o sprite ${field('personagem')} começar a encostar no sprite ${field(other)}`,
      body,
    )
  /** No 3D, uma animação do modelo; no 2D, a troca de imagem com a mesma ideia. */
  const muda = (objeto: string, clipe: string, imagem: string) =>
    three
      ? block(
          'sz_g3d_play_animation',
          `Tocar a animação ${field(clipe)} em ${field(objeto)} ${field('uma vez')}`,
        )
      : block('sz_g2d_set_image', `Trocar imagem do sprite ${field(objeto)} para ${field(imagem)}`)
  const guarda = (v: 'verdadeiro' | 'falso') =>
    block('sz_js_var_assign', `Alterar variável ${field('ponteAberta')} para ${bool(v)}`)
  const baixa =
    muda('alavanca', 'puxar', 'alavanca-baixo') +
    muda('ponte', 'baixar', 'ponte-baixada') +
    guarda('verdadeiro') +
    message('A ponte baixou! Atravesse antes que ela suba.')
  const sobe = nested(
    'sz_js_set_timeout_seconds',
    `depois de ${num('4')} segundos`,
    muda('alavanca', 'soltar', 'alavanca-cima') +
      muda('ponte', 'subir', 'ponte-levantada') +
      guarda('falso') +
      message('A ponte subiu. Puxe a alavanca de novo.'),
  )
  const naPedra = three
    ? block(
        'sz_g3d_set_position',
        `Colocar o objeto ${field('personagem')} em x ${num('-3.9')} y ${num('1.42')} z ${num('3.8')}`,
      )
    : block(
        'sz_g2d_set_position',
        `Mudar a posição do sprite ${field('personagem')} para x ${num('96')} y ${num('240')}`,
      )
  return {
    alavanca:
      area(
        'sz_frame_start',
        'Ao iniciar',
        prepared(
          three
            ? 'A ilha, o laguinho, a pedra do sino, a ponte e a alavanca'
            : 'O jogo do Farol, o laguinho, a pedra do sino, a ponte e a alavanca',
        ) +
          block(
            'sz_js_var_create',
            `Criar variável ${field('ponteAberta')} com valor ${bool('falso')}`,
          ),
      ) + events(prepared('Evento da tecla R e as regras do Farol') + encontro('alavanca', baixa)),
    // O que a parte anterior montou fica resumido: o desenho inteiro não cabe na página.
    sobe: events(
      encontro(
        'alavanca',
        `<div class="prepared">${esc('As trocas da alavanca e da ponte, ponteAberta verdadeiro e o aviso (você montou na parte anterior)')}</div>${sobe}`,
      ),
    ),
    atravessar: events(
      prepared('O encontro com a alavanca, com o depois de 4 segundos') +
        encontro(
          'ponte',
          block(
            'sz_js_if_else',
            `Se ${value('sz_val_variable', 'ponteAberta')}<div class="branch-label">então</div><div class="event-body">${naPedra}${muda('sino', 'tocar', 'pedra-do-sino-tocando')}${message('Você atravessou e tocou o sino!')}</div><div class="branch-label">senão</div><div class="event-body">${message('A ponte está levantada. Puxe a alavanca primeiro.')}</div>`,
          ),
        ),
    ),
  }
}
const asset = (name: string) => PONTE_ASSETS_2D.find((a) => a.name === name)!.dataUrl
const image = asset('praia-tropical'),
  bridge = asset('ponte-baixada'),
  lever = asset('alavanca-baixo'),
  bell = asset('pedra-do-sino-tocando')
const box = (title: string, text: string, tone = 'note') =>
  `<div class="soft-box box-${tone}"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`
const pages: { title: string; kicker: string; subtitle: string; body: string; lesson: number }[] = [
  {
    title: 'O que você vai construir',
    kicker: 'Poder do Faísca',
    subtitle: 'Uma ponte que baixa com a alavanca, espera alguns segundos e sobe sozinha.',
    lesson: 1,
    body: `${box('O seu jogo', 'No Farol aparece um laguinho com a pedra do sino no meio e uma ponte levadiça. A alavanca baixa a ponte, e o jogo guarda em ponteAberta se ela está baixada. Depois de 4 segundos a ponte sobe sozinha: quem chega a tempo atravessa e toca o sino. O farol continua pedindo a chave.') + box('Duas aulas, a mesma regra', 'Na primeira aula você monta tudo no jogo 2D, com o vídeo mostrando cada passo. Na segunda, leva a mesma regra para a Ilha do Farol, em 3D. Este Passo a passo tem as duas montagens completas.')}<div class="index"></div>${box('Consulte quando quiser', 'Cada montagem tem a ideia, o caminho na paleta, o desenho dos encaixes, um teste e o que conferir se algo não funcionar.', 'test')}`,
  },
]
for (const [i, aula] of ponteAulas.entries())
  for (const h of ponteAjuda(aula.dimension)) {
    pages.push({
      title: h.title,
      kicker: `Aula ${i + 1} · ${aula.dimension === '2d' ? 'Jogo 2D' : 'Ilha 3D'}`,
      subtitle: 'Relembre a ideia e monte.',
      lesson: i + 1,
      body: `${box('A ideia', h.idea)}<div class="steps">${h.steps.map((s, n) => `<div class="step"><span class="number">${n + 1}</span><p>${esc(s)}</p></div>`).join('')}</div>${box('Teste no seu jogo', h.test, 'test')}`,
    })
    pages.push({
      title: 'Confira os encaixes',
      kicker: `Aula ${i + 1} · ${aula.dimension === '2d' ? 'Jogo 2D' : 'Ilha 3D'} · ${h.title}`,
      subtitle: 'Um jeito de montar a regra; conserve as regras que já estavam no jogo.',
      lesson: i + 1,
      body: `<div class="blocks"><h3>Esquema dos blocos</h3>${drawings(aula.dimension === '3d')[h.key]}<p class="diagram-note">As cores vêm das definições do Estúdio. O cinza representa o que já vem no projeto. Os textos dos avisos podem ser do seu jeito.</p></div>${box('Se não funcionar', h.correction)}`,
    })
  }
pages.push({
  title: 'Teste e envie o seu jogo',
  kicker: 'Entrega',
  subtitle: 'Um envio em cada aula, com a versão atual do projeto.',
  lesson: 2,
  body:
    box(
      'Antes de enviar',
      'Jogue uma partida inteira: encoste na ponte sem puxar, puxe a alavanca e atravesse a tempo, depois puxe e espere a ponte subir antes de chegar. Puxe de novo: ela baixa outra vez. Pressione R: a ponte volta levantada.',
      'test',
    ) +
    box(
      'Envie o projeto atual',
      'Clique em Verificar projeto e corrija os objetivos que faltarem. Clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.',
    ) +
    box(
      'Se mudar depois de enviar',
      'Clique em Enviar de novo e confirme. Assim, a entrega acompanha a sua versão atual.',
    ) +
    box(
      'O Poder fica registrado',
      'O Poder conta na sua jornada quando as duas aulas estão concluídas: a do jogo 2D e a da ilha em 3D.',
    ),
})
pages[0]!.body = pages[0]!.body.replace(
  '<div class="index"></div>',
  box(
    'Encontre a sua aula',
    `Jogo 2D: página 3. Ilha 3D: página ${pages.findIndex((p) => p.lesson === 2) + 2}. Entrega: página ${pages.length + 1}.`,
  ),
)
const cover = `<section class="page cover" data-id="capa"><div class="cover-art"><img class="scene" src="${image}" alt="Praia do Farol"><img class="cabin" src="${bridge}" alt="Ponte levadiça baixada"><img class="piece p1" src="${bell}" alt=""><img class="piece p2" src="${lever}" alt=""></div><div class="cover-copy"><span class="badge">Passo a passo do projeto</span><h1>A ponte<br><em>apressada</em></h1><p>Ajuda para construir o Poder em 2D e em 3D.</p><div class="cover-bottom">A alavanca baixa a ponte.<br>Quatro segundos depois, ela sobe.</div></div></section>`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>A ponte apressada - Passo a passo do projeto</title><style>${css}
.lesson-hero{min-height:35mm;margin-bottom:5mm}.lesson-hero .scene{width:28%;object-fit:cover}.lesson-hero h2{font-size:22pt;text-wrap:balance}.lesson-hero .kicker{font-size:8pt;letter-spacing:.02em}.content{display:grid;gap:4mm;font-size:11pt}.content p{font-size:11pt;line-height:1.5;text-wrap:pretty}.content h3{margin-bottom:2mm}.box-note{background:var(--blue-soft)}.box-test{background:var(--green-soft)}.blocks{margin:0;padding:14px}.block,.event-block{line-height:1.65}.value-block{border:1px solid #ffffff70}.field{white-space:normal;box-decoration-break:clone}.prepared{color:var(--muted);background:#edf0f7;border-radius:8px;padding:6px 10px;font-size:9pt;font-weight:600}.branch-label{color:white;margin-top:6px}.diagram-note{font-size:9pt!important;color:var(--muted);margin-top:12px}.cover-art{height:48%;position:relative}.cover-art .scene{object-fit:cover}.cover-art .cabin{position:absolute;width:30%;left:35%;top:26%}.cover-art .piece{position:absolute;width:10%}.cover-art .p1{left:16%;top:42%}.cover-art .p2{left:60%;top:36%}.cover .cover-bottom{margin-top:12mm}.content .steps{gap:12px}@media print{body{background:white}.page{margin:0}}
</style></head><body>${cover}${pages.map((p, i) => `<section class="page lesson-${p.lesson === 1 ? 'one' : 'two'}" data-id="${i + 2}"><div class="inner"><div class="lesson-hero"><img class="scene" src="${image}" alt="Praia do Farol"><div class="lesson-hero-text"><div class="kicker">${esc(p.kicker)}</div><h2>${esc(p.title)}</h2><p>${esc(p.subtitle)}</p></div></div><div class="content">${p.body}</div></div><div class="page-no"><span class="brand">A ponte apressada | Passo a passo do projeto</span><span>${i + 2} / ${pages.length + 1}</span></div></section>`).join('\n')}</body></html>`
writeFileSync(resolve(out, 'caderno.html'), html)
console.log(`${pages.length + 1} páginas com o template, fontes e cores do Cadê e dos Faróis.`)
