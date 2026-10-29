import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { JS_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/js'
import { VALUE_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/values'
import { gameTwoDBlocks } from '../../../../packages/studio/src/official-extensions/game-2d/blocks'
import { gameThreeDBlocks } from '../../../../packages/studio/src/official-extensions/game-3d/blocks'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'
import { cabanaAjuda, cabanaAulas } from '../../qa/cabana-conteudo'
import { CABANA_ASSETS_2D } from '../../qa/cabana-projeto'

// O mesmo template do Cadê Todo Mundo, com as fontes e as cores reais dos blocos do Estúdio,
// como os cadernos dos Faróis e do Jardim Secreto.
const root = resolve(import.meta.dirname, '../../../..'),
  out = resolve(root, 'tmp/pdfs/o-segredo-da-cabana')
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
  const pergunta = `<span class="value-block" ${attrs('sz_val_logic')}>${value('sz_val_variable', 'temChave')} ${field('e')} ${value('sz_val_variable', 'temEmblema')}</span>`
  const abrir = three
    ? block(
        'sz_g3d_play_animation',
        `Tocar a animação ${field('abrir')} em ${field('cabana')} ${field('uma vez')}`,
      )
    : block(
        'sz_g2d_set_image',
        `Trocar imagem do sprite ${field('cabana')} para ${field('cabana-aberta')}`,
      )
  return {
    emblema:
      area(
        'sz_frame_start',
        'Ao iniciar',
        prepared(
          three
            ? 'A ilha, a chave, temChave, o emblema e a cabana'
            : 'O jogo do Farol, temChave, o emblema e a cabana',
        ) +
          block(
            'sz_js_var_create',
            `Criar variável ${field('temEmblema')} com valor ${bool('falso')}`,
          ),
      ) +
      events(
        prepared('Evento da tecla R e as regras do Farol') +
          encontro(
            'emblema',
            (three
              ? block('sz_g3d_set_visible', `${field('Esconder')} o objeto ${field('emblema')}`)
              : block('sz_g2d_destroy_sprite', `Destruir o sprite ${field('emblema')}`)) +
              block(
                'sz_js_var_assign',
                `Alterar variável ${field('temEmblema')} para ${bool('verdadeiro')}`,
              ) +
              message('Você pegou o emblema!'),
          ),
      ),
    porta: events(
      prepared('O encontro com o emblema') +
        encontro(
          'cabana',
          block(
            'sz_js_if_else',
            `Se ${pergunta}<div class="branch-label">então</div><div class="event-body">${abrir}${message('A cabana abriu! Você tinha as duas peças.')}</div><div class="branch-label">senão</div><div class="event-body">${message('A cabana pede a chave e o emblema.')}</div>`,
          ),
        ),
    ),
  }
}
const asset = (name: string) => CABANA_ASSETS_2D.find((a) => a.name === name)!.dataUrl
const image = asset('praia-tropical'),
  cabin = asset('cabana-aberta'),
  emblem = asset('emblema'),
  key = asset('chave-dourada')
const box = (title: string, text: string, tone = 'note') =>
  `<div class="soft-box box-${tone}"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`
const pages: { title: string; kicker: string; subtitle: string; body: string; lesson: number }[] = [
  {
    title: 'O que você vai construir',
    kicker: 'Poder do Faísca',
    subtitle: 'Duas informações guardadas e uma porta que pergunta as duas ao mesmo tempo.',
    lesson: 1,
    body: `${box('O seu jogo', 'No Farol aparece a cabana do faroleiro, com a porta trancada, e um emblema novo no gramado de baixo. O jogo guarda se o personagem já pegou a chave e se já pegou o emblema, e a cabana só abre com as duas peças, em qualquer ordem. O farol continua pedindo só a chave.') + box('Duas aulas, a mesma regra', 'Na primeira aula você monta tudo no jogo 2D, com o vídeo mostrando cada passo. Na segunda, leva a mesma pergunta para a Ilha do Farol, em 3D. Este Passo a passo tem as duas montagens completas.')}<div class="index"></div>${box('Consulte quando quiser', 'Cada montagem tem a ideia, o caminho na paleta, o desenho dos encaixes, um teste e o que conferir se algo não funcionar.', 'test')}`,
  },
]
for (const [i, aula] of cabanaAulas.entries())
  for (const h of cabanaAjuda(aula.dimension)) {
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
      'Jogue uma partida inteira: tente a cabana sem peças, só com a chave e só com o emblema, e depois com as duas. Pegue as peças nas duas ordens. Pressione R: as peças voltam ao chão e a cabana volta fechada.',
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
const cover = `<section class="page cover" data-id="capa"><div class="cover-art"><img class="scene" src="${image}" alt="Praia do Farol"><img class="cabin" src="${cabin}" alt="Cabana do faroleiro aberta"><img class="piece p1" src="${key}" alt=""><img class="piece p2" src="${emblem}" alt=""></div><div class="cover-copy"><span class="badge">Passo a passo do projeto</span><h1>O segredo<br><em>da cabana</em></h1><p>Ajuda para construir o Poder em 2D e em 3D.</p><div class="cover-bottom">A chave e o emblema.<br>As duas peças abrem.</div></div></section>`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>O segredo da cabana - Passo a passo do projeto</title><style>${css}
.lesson-hero{min-height:35mm;margin-bottom:5mm}.lesson-hero .scene{width:28%;object-fit:cover}.lesson-hero h2{font-size:22pt;text-wrap:balance}.lesson-hero .kicker{font-size:8pt;letter-spacing:.02em}.content{display:grid;gap:4mm;font-size:11pt}.content p{font-size:11pt;line-height:1.5;text-wrap:pretty}.content h3{margin-bottom:2mm}.box-note{background:var(--blue-soft)}.box-test{background:var(--green-soft)}.blocks{margin:0;padding:14px}.block,.event-block{line-height:1.65}.value-block{border:1px solid #ffffff70}.field{white-space:normal;box-decoration-break:clone}.prepared{color:var(--muted);background:#edf0f7;border-radius:8px;padding:6px 10px;font-size:9pt;font-weight:600}.branch-label{color:white;margin-top:6px}.diagram-note{font-size:9pt!important;color:var(--muted);margin-top:12px}.cover-art{height:48%;position:relative}.cover-art .scene{object-fit:cover}.cover-art .cabin{position:absolute;width:30%;left:35%;top:26%}.cover-art .piece{position:absolute;width:10%}.cover-art .p1{left:16%;top:42%}.cover-art .p2{left:72%;top:50%}.cover .cover-bottom{margin-top:12mm}.content .steps{gap:12px}@media print{body{background:white}.page{margin:0}}
</style></head><body>${cover}${pages.map((p, i) => `<section class="page lesson-${p.lesson === 1 ? 'one' : 'two'}" data-id="${i + 2}"><div class="inner"><div class="lesson-hero"><img class="scene" src="${image}" alt="Praia do Farol"><div class="lesson-hero-text"><div class="kicker">${esc(p.kicker)}</div><h2>${esc(p.title)}</h2><p>${esc(p.subtitle)}</p></div></div><div class="content">${p.body}</div></div><div class="page-no"><span class="brand">O segredo da cabana | Passo a passo do projeto</span><span>${i + 2} / ${pages.length + 1}</span></div></section>`).join('\n')}</body></html>`
writeFileSync(resolve(out, 'caderno.html'), html)
console.log(`${pages.length + 1} páginas com o template, fontes e cores do Cadê e dos Faróis.`)
