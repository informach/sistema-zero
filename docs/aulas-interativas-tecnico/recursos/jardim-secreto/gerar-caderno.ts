import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { JS_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/js'
import { VALUE_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/values'
import { gameTwoDBlocks } from '../../../../packages/studio/src/official-extensions/game-2d/blocks'
import { gameThreeDBlocks } from '../../../../packages/studio/src/official-extensions/game-3d/blocks'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'
import { jardimAjuda, jardimAulas } from '../../qa/jardim-conteudo'
import { JARDIM_ASSETS_2D } from '../../qa/jardim-projeto'

const root = resolve(import.meta.dirname, '../../../..'),
  out = resolve(root, 'tmp/pdfs/jardim-secreto')
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
const assign = (name: string, val: string) =>
  block('sz_js_var_assign', `Alterar variável ${field(name)} para ${val}`)
const message = (s: string) => assign('aviso', value('sz_val_text', s))
const num = (s: string) => value('sz_val_number', s),
  bool = (s: string) => value('sz_val_bool', s)
function drawings(three: boolean): Record<string, string> {
  const encounter = (other: string, body: string) =>
    area(
      'sz_frame_events',
      'Quando acontecer',
      prepared('Evento da tecla R, separado deste encontro') +
        nested(
          three ? 'sz_g3d_on_touch' : 'sz_g2d_on_overlap',
          three
            ? `Quando ${field('personagem')} encostar em ${field(other)}`
            : `Quando o sprite ${field('personagem')} começar a encostar no sprite ${field(other)}`,
          body,
        ),
    )
  const remove = three
    ? block('sz_g3d_set_visible', `${field('Esconder')} o objeto ${field('regador')}`)
    : block('sz_g2d_destroy_sprite', `Destruir o sprite ${field('regador')}`)
  const move = three
    ? block(
        'sz_g3d_top_down',
        `Andar com ${field('personagem')} usando WASD/setas, velocidade ${num('4')}`,
      )
    : block(
        'sz_g2d_top_down',
        `Mover sprite ${field('personagem')} em 4 direções com setas, velocidade ${num('5')}`,
      )
  const loop = (body: string) =>
    area(
      'sz_frame_loops',
      'Enquanto estiver rodando',
      nested(
        three ? 'sz_g3d_animate' : 'sz_g2d_update_each_frame',
        three ? `A cada quadro da cena ${field('cena')}` : 'A cada quadro do jogo',
        body,
      ),
    )
  return {
    movimento:
      (!three
        ? area(
            'sz_frame_start',
            'Ao iniciar',
            prepared('Criação do jardim e dos sprites') +
              block(
                'sz_g2d_enable_classic_controls',
                `Ativar controles clássicos ${field('só as quatro direções')}`,
              ),
          )
        : '') +
      loop(
        prepared(three ? 'Cena pronta' : 'Limpar e desenhar fundo') +
          move +
          prepared(three ? 'Aviso' : 'Desenhar sprites e avisos'),
      ),
    limite: loop(
      prepared('Limpar e desenhar fundo') +
        move +
        block('sz_g2d_clamp_to_screen', `Manter o sprite ${field('personagem')} dentro da tela`) +
        prepared('Desenhar sprites e avisos'),
    ),
    coleta: encounter('regador', remove),
    memoria:
      area(
        'sz_frame_start',
        'Ao iniciar',
        prepared('Outros blocos') +
          block(
            'sz_js_var_create',
            `Criar variável ${field('temRegador')} com valor ${bool('falso')}`,
          ),
      ) + encounter('regador', remove + assign('temRegador', bool('verdadeiro'))),
    aviso: encounter(
      'regador',
      remove +
        assign('temRegador', bool('verdadeiro')) +
        message('Você pegou o regador! Agora vá até a flor.'),
    ),
    decisao: encounter(
      'flor',
      block(
        'sz_js_if_else',
        `Se ${value('sz_val_variable', 'temRegador')}<div class="branch-label">então</div><div class="event-body">${three ? block('sz_g3d_play_animation', `Tocar a animação ${field('florescer')} em ${field('flor')} ${field('uma vez')}`) : block('sz_g2d_set_image', `Trocar imagem do sprite ${field('flor')} para ${field('flor-aberta')}`)}${message('A flor abriu! Você fez o jardim florescer.')}</div><div class="branch-label">senão</div><div class="event-body">${message('Busque o regador primeiro. A flor espera por você.')}</div>`,
      ),
    ),
    posicao: area(
      'sz_frame_start',
      'Ao iniciar',
      prepared('Outros blocos') +
        (three
          ? block(
              'sz_g3d_set_position',
              `Posição do objeto ${field('regador')} em x ${num('-2')} y ${num('0.54')} z ${num('-2')}`,
            )
          : block(
              'sz_g2d_create_image_sprite',
              `Criar sprite ${field('regador')} em x ${num('390')} y ${num('190')} largura ${num('60')} altura ${num('53')} com imagem ${field('regador-azul')}`,
            )),
    ),
  }
}
const image = JARDIM_ASSETS_2D.find((a) => a.name === 'jardim-acolhedor')!.dataUrl
const flower = JARDIM_ASSETS_2D.find((a) => a.name === 'flor-aberta')!.dataUrl
const box = (title: string, text: string, tone = 'note') =>
  `<div class="soft-box box-${tone}"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`
const pages: { title: string; kicker: string; subtitle: string; body: string; lesson: number }[] = [
  {
    title: 'Use a ajuda do seu jeito',
    kicker: 'Missão Faísca',
    subtitle: 'Dois jardins, a mesma relação entre coleta, memória e decisão.',
    lesson: 1,
    body: `${box('Sua missão', 'Faça o personagem andar, recolher o regador e abrir a flor somente depois da coleta. Sem o regador, o aviso deve pedir o que falta.') + box('Escolha por onde começar', 'O cenário e o reinício já vêm preparados. As regras ficam para você. Os próximos títulos ajudam a encontrar uma dificuldade. Cada um traz um lembrete, a montagem completa, o desenho dos encaixes e um teste.')}<div class="index"></div>${box('Experimentar faz parte', 'Você pode usar a ajuda desde o começo, testar várias vezes, mudar mensagens e escolher outro lugar alcançável para o regador. Não há pontos por recusar ajuda.', 'test')}`,
  },
]
for (const [i, aula] of jardimAulas.entries())
  for (const h of jardimAjuda(aula.dimension)) {
    pages.push({
      title: h.title,
      kicker: `Aula ${i + 1} · ${aula.dimension.toUpperCase()} · Ajuda opcional`,
      subtitle: 'Relembre a ideia e monte se precisar.',
      lesson: i + 1,
      body: `${box('A ideia', h.idea)}<div class="steps">${h.steps.map((s, n) => `<div class="step"><span class="number">${n + 1}</span><p>${esc(s)}</p></div>`).join('')}</div>${box('Teste no seu jogo', h.test, 'test')}`,
    })
    pages.push({
      title: 'Confira os encaixes',
      kicker: `Aula ${i + 1} · ${aula.dimension.toUpperCase()} · ${h.title}`,
      subtitle:
        h.key === 'posicao'
          ? 'Um exemplo de posição. Você pode escolher outro lugar.'
          : 'Um jeito de montar a regra; conserve as regras anteriores.',
      lesson: i + 1,
      body: `<div class="blocks"><h3>Esquema dos blocos</h3>${drawings(aula.dimension === '3d')[h.key]}<p class="diagram-note">As cores vêm das definições do Estúdio. O cinza representa a preparação que você conserva. Textos e nomes da sua variável podem ser diferentes.</p></div>${box('Se não funcionar', h.correction)}`,
    })
  }
pages.push({
  title: 'Teste e envie seus jardins',
  kicker: 'Entrega da missão',
  subtitle: 'Um envio em cada aula, com a versão atual do projeto.',
  lesson: 2,
  body:
    box(
      'Antes de enviar',
      'Teste as quatro direções, a parada, o limite da tela no 2D, a coleta no lugar escolhido e a flor com e sem o regador. Depois de um sucesso, pressione R: o regador volta e a flor começa fechada. Seus blocos e sua posição continuam iguais.',
      'test',
    ) +
    box(
      'Envie o projeto atual',
      'Clique em Verificar projeto e corrija os objetivos que faltarem. Aguarde Salvo. Clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.',
    ) +
    box(
      'Se mudar depois de enviar',
      'Aguarde Salvo, clique em Enviar de novo e confirme em Reenviar. Assim, a entrega acompanha sua versão atual.',
    ) +
    box(
      'A jornada continua',
      'A missão não emite certificado e não exige publicação na comunidade. Confira a jornada: para avançar de posto, ela também verifica o par de cursos-base e um Poder distinto.',
    ),
})
pages[0]!.body = pages[0]!.body.replace(
  '<div class="index"></div>',
  box(
    'Encontre sua versão',
    `Jardim 2D: página 3. Jardim 3D: página ${pages.findIndex((p) => p.lesson === 2) + 2}. Entrega: página ${pages.length + 1}.`,
  ),
)
const cover = `<section class="page cover" data-id="capa"><div class="cover-art"><img class="scene" src="${image}" alt="Jardim"><img class="flower" src="${flower}" alt="Flor aberta"></div><div class="cover-copy"><span class="badge">Passo a passo do projeto</span><h1>O Jardim<br><em>Secreto</em></h1><p>Ajuda para construir sua missão em 2D e 3D.</p><div class="cover-bottom">Recolher. Lembrar.<br>Fazer florescer.</div></div></section>`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>O Jardim Secreto - Passo a passo do projeto</title><style>${css}
.lesson-hero{min-height:35mm;margin-bottom:5mm}.lesson-hero .scene{width:28%;object-fit:cover}.lesson-hero h2{font-size:22pt;text-wrap:balance}.lesson-hero .kicker{font-size:8pt;letter-spacing:.02em}.content{display:grid;gap:4mm;font-size:11pt}.content p{font-size:11pt;line-height:1.5;text-wrap:pretty}.content h3{margin-bottom:2mm}.box-note{background:var(--blue-soft)}.box-test{background:var(--green-soft)}.blocks{margin:0;padding:14px}.block,.event-block{line-height:1.65}.value-block{border:1px solid #ffffff70}.field{white-space:normal;box-decoration-break:clone}.prepared{color:var(--muted);background:#edf0f7;border-radius:8px;padding:6px 10px;font-size:9pt;font-weight:600}.branch-label{color:white;margin-top:6px}.diagram-note{font-size:9pt!important;color:var(--muted);margin-top:12px}.cover-art{height:48%;position:relative}.cover-art .scene{object-fit:cover}.cover-art .flower{position:absolute;width:25%;left:38%;top:26%}.cover .cover-bottom{margin-top:12mm}.content .steps{gap:12px}@media print{body{background:white}.page{margin:0}}
</style></head><body>${cover}${pages.map((p, i) => `<section class="page lesson-${p.lesson === 1 ? 'one' : 'two'}" data-id="${i + 2}"><div class="inner"><div class="lesson-hero"><img class="scene" src="${image}" alt="Jardim"><div class="lesson-hero-text"><div class="kicker">${esc(p.kicker)}</div><h2>${esc(p.title)}</h2><p>${esc(p.subtitle)}</p></div></div><div class="content">${p.body}</div></div><div class="page-no"><span class="brand">O Jardim Secreto | Passo a passo do projeto</span><span>${i + 2} / ${pages.length + 1}</span></div></section>`).join('\n')}</body></html>`
writeFileSync(resolve(out, 'caderno.html'), html)
console.log(`${pages.length + 1} páginas com o template, fontes e cores do Cadê e dos Faróis.`)
