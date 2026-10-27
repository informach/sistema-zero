/** Mesmo template, tipografia e componentes do Cadê; desenhos usam as definições do Estúdio. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { JS_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/js'
import { VALUE_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/values'
import { gameThreeDBlocks } from '../../../../packages/studio/src/official-extensions/game-3d/blocks'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'
import { ilhaAulas } from '../../qa/ilha-do-farol-conteudo'

const root = resolve(import.meta.dirname, '../../../..')
const out = resolve(root, 'tmp/pdfs/ilha-farol')
mkdirSync(out, { recursive: true })
const reference = readFileSync(
  resolve(import.meta.dirname, '../cade-todo-mundo/caderno-do-aluno.template.html'),
  'utf8',
)
const baseCss = reference.match(/<style>([\s\S]*?)<\/style>/)?.[1]
if (!baseCss) throw Error('Template do Cadê sem CSS')
const css = baseCss.replace(
  '/* {{FONT_FACES}} */',
  `
@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}
@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}`,
)
const esc = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const definitions = new Map(
  [...FRAME_BLOCKS, ...JS_BLOCKS, ...VALUE_BLOCKS, ...gameThreeDBlocks].map((b) => [b.type, b]),
)
const colors: Record<string, string> = {}
function attrs(type: string) {
  const color = definitions.get(type)?.colour
  if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))
    throw Error('Cor ausente: ' + type)
  colors[type] = color
  return `data-block-type="${type}" style="background-color:${color}"`
}
const field = (s: string) => `<span class="field">${esc(s)}</span>`
const value = (type: string, s: string) =>
  `<span class="value-block" ${attrs(type)}>${type === 'sz_val_variable' ? 'valor da variável ' : type === 'sz_val_text' ? 'texto ' : ''}${field(s)}</span>`
const num = (n: string) => value('sz_val_number', n)
const bool = (b: string) => value('sz_val_bool', b)
const block = (type: string, s: string) => `<div class="block" ${attrs(type)}>${s}</div>`
const nested = (type: string, s: string, body: string) =>
  block(
    type,
    `${s}<div class="do-row"><span class="do-label">fazer</span><div class="event-body">${body}</div></div>`,
  )
const prepared = (s: string) => `<div class="prepared">${s} (já vem no projeto)</div>`
const area = (type: string, name: string, body: string) =>
  `<div class="event-block" ${attrs(type)}><span class="tag">Áreas do projeto · ${name}</span><div class="event-body">${body}</div></div>`
const visible = (name: string, show = false) =>
  block('sz_g3d_set_visible', `${field(show ? 'Mostrar' : 'Esconder')} o objeto ${field(name)}`)
const assign = (name: string, v: string) =>
  block('sz_js_var_assign', `Alterar variável ${field(name)} para ${v}`)
const message = (s: string) => assign('aviso', value('sz_val_text', s))
const encounter = (group: string, body: string) =>
  area(
    'sz_frame_events',
    'Quando acontecer',
    nested(
      'sz_g3d_on_touch_group',
      `Quando ${field('personagem')} encostar em algum do grupo ${field(group)}, chamando de ${field('item')}`,
      body,
    ),
  )
const choice = (yes: string, no: string) =>
  block(
    'sz_js_if_else',
    `Se ${value('sz_val_variable', 'temChave')}<div class="branch-label">então</div><div class="event-body">${yes}</div><div class="branch-label">senão</div><div class="event-body">${no}</div>`,
  )
const model = (name: string, file: string, size: string) =>
  block(
    'sz_g3d_create_model_file',
    `Criar o objeto ${field(name)} com o modelo ${field(file)} na cena ${field('cena')} tamanho ${num(size)}`,
  )
const drawings: Record<string, string> = {
  movimento: area(
    'sz_frame_loops',
    'Enquanto estiver rodando',
    nested(
      'sz_g3d_animate',
      `A cada quadro da cena ${field('cena')}`,
      block(
        'sz_g3d_control_keys',
        `Mover ${field('personagem')} com o teclado (WASD/setas), ${num('4')} por segundo`,
      ) +
        block('sz_g3d_update_group_no_gravity', `Mover o grupo ${field('jogadores')}`) +
        prepared('Conferência do caminho e outros blocos'),
    ),
  ),
  posicao: area(
    'sz_frame_start',
    'Ao iniciar',
    prepared('Outros objetos da ilha') +
      block(
        'sz_g3d_set_position',
        `Posição do objeto ${field('chave')} em x ${num('−3')} y ${num('1')} z ${num('−2')}`,
      ),
  ),
  recolher: encounter('chaves', visible('chave')),
  memoria:
    area(
      'sz_frame_start',
      'Ao iniciar',
      prepared('Blocos anteriores') +
        block('sz_js_var_create', `Criar variável ${field('temChave')} com valor ${bool('falso')}`),
    ) + encounter('chaves', visible('chave') + assign('temChave', bool('verdadeiro'))),
  aviso: encounter(
    'chaves',
    visible('chave') +
      assign('temChave', bool('verdadeiro')) +
      message('Você pegou a chave! Agora vá ao farol.'),
  ),
  aparencia: area(
    'sz_frame_start',
    'Ao iniciar',
    prepared('Criar a cena, a câmera e a luz') +
      model('cenario', 'noite-na-ilha', '140') +
      prepared('Posição do objeto cenario') +
      model('farol', 'farol-de-pedra', '5.3') +
      prepared('Posição do objeto farol') +
      model('barco', 'barco-pirata', '3.1') +
      prepared('Pedras e posições') +
      model('personagem', 'pirata', '1.66') +
      model('chave', 'chave-de-estrela', '1.24') +
      prepared('Outros blocos'),
  ),
  'sem-chave': encounter(
    'portas',
    choice(
      '<div class="prepared">Vazio nesta parte</div>',
      message('Falta a chave. Procure na ilha antes de voltar.'),
    ),
  ),
  decisao: encounter(
    'portas',
    choice(
      block(
        'sz_g3d_play_animation',
        `Tocar a animação ${field('acender')} em ${field('farol')} ${field('uma vez')}`,
      ) +
        assign('ganhou', bool('verdadeiro')) +
        message('Você acendeu o farol! O barco pode chegar.'),
      message('Falta a chave. Procure na ilha antes de voltar.'),
    ),
  ),
}
type Page = {
  id: string
  lesson: number
  kicker: string
  title: string
  subtitle: string
  body: string
  image?: string
}
const pages: Page[] = []
const text = (s: string) => `<p>${esc(s)}</p>`
const box = (title: string, s: string, tone = 'note') =>
  `<div class="soft-box box-${tone}"><h3>${esc(title)}</h3>${text(s)}</div>`
const steps = (ss: string[]) =>
  `<div class="steps">${ss.map((s, i) => `<div class="step"><span class="number">${i + 1}</span><p>${esc(s)}</p></div>`).join('')}</div>`
const exit = (delivery: boolean) =>
  `<div class="check"><span class="pill pill--test">${delivery ? 'Verificar e enviar' : 'Confira no seu jogo'}</span><p>Funcionou? Clique em <b>Verificar projeto</b>. Se faltar alguma coisa, corrija os blocos e clique novamente, até aparecer <b>Objetivo cumprido!</b> Espere <b>Salvo</b>. ${delivery ? 'Clique em <b>Enviar meu projeto</b> e confirme em <b>Enviar</b>. Quando aparecer <b>Projeto enviado!</b>, ' : ''}Clique em <b>Próxima parte</b>.</p></div>`
pages.push({
  id: 'inicio',
  lesson: 1,
  kicker: 'Seu passo a passo do projeto',
  title: 'A Ilha do Farol',
  subtitle: 'Encontre a chave e acenda o farol para o barco chegar.',
  body:
    text(
      'Você já construiu A Chave do Farol. Agora vai programar essa aventura em três dimensões. O chão tem duas direções e a altura tem outra. Uma mudança de câmera pode revelar o que estava escondido.',
    ) +
    box(
      'Use quando precisar',
      'Este material acompanha as partes das aulas. Primeiro deixe à vista o lugar do encaixe; depois procure o bloco na paleta. Você pode ler aqui mesmo ou clicar em Baixar para guardar.',
    ) +
    '<div class="index"></div>' +
    box(
      'Comece pela partida pronta',
      'Clique no jogo e use as setas do teclado ou W, A, S e D. Pressione R para recomeçar. Você pode continuar a aula mesmo sem terminar essa partida.',
      'experience',
    ),
})
const experiences: Record<string, { intro: string; steps: string[]; image: string }> = {
  'ponto-de-vista': {
    intro:
      'A câmera é o lugar de onde olhamos. Compare as vistas para procurar a chave, sem mudar os objetos.',
    steps: [
      'Use Ver de frente, Ver de lado e Ver de cima. Volte a uma vista para comparar.',
      'Responda o que mudou quando a chave apareceu. Se precisar, olhe novamente antes de tentar outra resposta.',
      'Continue explorando mesmo depois das descobertas. Desfazer volta uma ação; Recomeçar experiência limpa esse percurso.',
    ],
    image: 'vista-lado',
  },
  'posicao-3d': {
    intro:
      'Neste jogo, x e z são as duas direções do chão. Y indica a altura. No jogo 2D, y tinha outro papel: a posição na tela.',
    steps: [
      'Escolha um valor da chave: use os botões, a barra ou o campo numérico. Aumente e diminua cada um, na ordem que quiser.',
      'Compare o lugar inicial dourado, o anterior e o atual. O pontilhado liga a chave ao chão. Troque a vista para observar a altura.',
      'Voltar à posição inicial prepara outra tentativa e conserva as descobertas. Experimente os extremos e repita os testes.',
    ],
    image: 'posicao',
  },
  'contato-3d': {
    intro:
      'Parecer junto na imagem não garante contato no espaço. É preciso comparar o lugar no chão e a altura.',
    steps: [
      'Clique em Testar o encontro. Leia o resultado e compare a vista de cima com a vista de lado.',
      'Mude a posição da chave ou use os botões do personagem. Eles preparam o teste; não acrescentam blocos ao programa.',
      'Se quiser, clique em Mostrar onde encosta. Teste objetos separados e encostando. Repita em outra ordem e observe o que muda.',
    ],
    image: 'contato',
  },
}
for (const [li, a] of ilhaAulas.entries()) {
  for (const [ti, t] of a.trechos.entries()) {
    const part = ti + 1 + (li === 2 && ti >= 2 ? 1 : 0)
    if (li === 2 && t.key === 'aparencia')
      pages.push({
        id: 'quiz',
        lesson: 3,
        kicker: 'Aula 3 · Parte 3 · Revisão',
        title: 'O que você descobriu no 3D',
        subtitle: 'Responda na própria aula e observe a demonstração.',
        body:
          steps([
            'Escolha uma resposta. As opções têm a mesma aparência antes da sua escolha.',
            'Clique em Ver o que acontece. Observe a cena e leia a explicação.',
            'Se precisar, clique em Tentar de novo. Depois da resposta conferida, clique em Próxima pergunta. Na última, use Concluir revisão.',
            'Ao terminar a revisão, clique em Próxima parte e volte ao seu projeto.',
          ]) +
          box(
            'Retome suas descobertas',
            'Você pode voltar às experiências e comparar novamente. O importante é entender o que aconteceu, não decorar uma sequência de botões.',
            'experience',
          ),
      })
    if (t.kind === 'intro' || t.kind === 'material') continue
    if (t.kind === 'closing' && li < 2) continue
    const e = experiences[t.key]
    const body = e
      ? text(e.intro) +
        `<img class="experiment" data-image="${e.image}" alt="Cena da experiência 3D">` +
        steps(e.steps) +
        box(
          'Sua investigação',
          'Os controles ficam livres. Quando fizer as comparações, clique em Próxima parte.',
          'experience',
        )
      : t.steps
        ? steps(t.steps) + exit(t.kind === 'delivery')
        : box(
            'Sua ilha está pronta',
            'Você programou movimento, coleta, memória e decisão. Agora pode jogar de novo e mostrar sua criação a alguém. Clique em Concluir aula.',
            'test',
          ) +
          box(
            'Publique se quiser',
            'No Estúdio, clique em Compartilhar. O título já vem preenchido. Escreva um resumo, clique em Gerar capa e confira. Clique em Publicar e espere Seu jogo está no Mural! Copie o link de jogar para mostrar à família e aos amigos; peça ajuda a um adulto se precisar. Clique em Fechar para voltar. Você pode concluir sem publicar.',
          ) +
          box(
            'Se precisar de ajuda',
            'Volte ao vídeo da montagem e compare os encaixes. O Passo a passo fica na parte 2 da primeira aula. No rodapé, clique em Preciso de ajuda e conte o que tentou e o que aconteceu.',
          ) +
          box(
            'Se mudar depois do envio',
            'Espere Salvo, clique em Enviar de novo e confirme em Reenviar. Assim, a equipe recebe a versão atual do seu jogo.',
          )
    pages.push({
      id: `${li + 1}-${t.key}`,
      lesson: li + 1,
      kicker: `Aula ${li + 1} · Parte ${part}${e ? ' · Experiência' : t.steps ? ' · Construção' : ''}`,
      title: t.title,
      subtitle: e ? 'Explore, compare e repita.' : a.title,
      body,
    })
    if (drawings[t.key])
      pages.push({
        id: `${li + 1}-${t.key}-blocos`,
        lesson: li + 1,
        kicker: `Aula ${li + 1} · Parte ${part} · Encaixes`,
        title: 'Confira se ficou assim',
        subtitle: t.title,
        body:
          `<div class="blocks"><h3>Esquema dos encaixes</h3>${drawings[t.key]}<p class="diagram-note">As cores são as mesmas dos blocos no Estúdio. Os espaços cinza representam a preparação que já vem no projeto.</p></div>` +
          box('Teste antes de seguir', t.steps?.at(-1) ?? 'Execute o jogo e confira o resultado.'),
      })
  }
}
// A galeria da personalização: as miniaturas saem dos mesmos modelos do jogo
// (docs/design/ilha-do-farol-blender/galeria), com o nome que aparece na lista do bloco.
const galeriaDir = resolve(root, 'docs/design/ilha-do-farol-blender/galeria')
const tile = (nome: string) =>
  `<figure class="opcao"><img src="data:image/webp;base64,${readFileSync(resolve(galeriaDir, `${nome}.webp`)).toString('base64')}" alt="${esc(nome)}"><figcaption>${esc(nome)}</figcaption></figure>`
const grupo = (titulo: string, nomes: string[], largo = false) =>
  `<div class="galeria"><h3>${esc(titulo)}</h3><div class="opcoes${largo ? ' opcoes--largas' : ''}">${nomes.map(tile).join('')}</div></div>`
const galeria: Page[] = [
  {
    id: '3-galeria-1',
    lesson: 3,
    kicker: 'Aula 3 · Parte 4 · Escolhas',
    title: 'Todas as opções do seu jogo',
    subtitle: 'O nome embaixo de cada uma é o mesmo da lista do bloco.',
    body:
      grupo('Personagens', [
        'aventureiro',
        'menina-de-laco',
        'marinheira',
        'menino-de-bone',
        'exploradora-de-chapeu',
        'pirata',
        'mergulhador',
        'robo',
      ]) + grupo('Chaves', ['chave-dourada', 'chave-prateada', 'chave-de-estrela']),
  },
  {
    id: '3-galeria-2',
    lesson: 3,
    kicker: 'Aula 3 · Parte 4 · Escolhas',
    title: 'Barcos, faróis e cenários',
    subtitle: 'Todo farol sabe acender: troque o modelo num lugar só.',
    body:
      grupo('Barcos', ['veleiro', 'barco-de-pesca', 'lancha', 'barco-pirata']) +
      grupo('Faróis', ['farol-listrado', 'farol-de-pedra', 'farol-de-madeira', 'farol-colorido']) +
      grupo('Cenários', ['praia-tropical', 'costa-rochosa', 'ilha-nevada', 'noite-na-ilha'], true),
  },
]
pages.splice(
  pages.findIndex((p) => p.id === '3-aparencia'),
  0,
  ...galeria,
)
const index = ilhaAulas
  .map(
    (a, i) =>
      `<p><b>Aula ${i + 1} · ${esc(a.title)}</b><br>Página ${pages.findIndex((p) => p.id.startsWith(`${i + 1}-`)) + 2}</p>`,
  )
  .join('')
pages[0].body = pages[0].body.replace(
  '<div class="index"></div>',
  `<div class="soft-box box-note"><h3>Encontre sua aula</h3>${index}</div>`,
)
const cover = `<section class="page cover" data-id="capa"><div class="cover-art"><img class="scene" data-image="ilha" alt="Ilha em 3D com ponte e farol"></div><div class="cover-copy"><span class="badge">Passo a passo do projeto</span><h1>A Ilha<br>do <em>Farol</em></h1><p>Todos os passos para construir as regras do seu jogo em 3D.</p><div class="cover-bottom">Do primeiro movimento<br>à luz que guia o barco.</div></div></section>`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Passo a passo do projeto - A Ilha do Farol</title><style>${css}
.lesson-hero{min-height:38mm;margin-bottom:5mm}.lesson-hero .scene{width:32%;object-fit:cover;background:#94d5f5}.lesson-hero h2{font-size:22pt;text-wrap:balance}.lesson-hero .kicker{font-size:9pt;letter-spacing:.04em}.content{display:grid;gap:4mm;font-size:11pt}.content p{font-size:11pt;line-height:1.5;text-wrap:pretty}.content h3{margin-bottom:2mm}.box-note{background:var(--blue-soft)}.box-experience{background:var(--brand-soft);border:1px dashed #b9b0ff}.box-test{background:var(--green-soft)}.blocks{margin:0;padding:14px}.block,.event-block{line-height:1.65}.value-block{border:1px solid #ffffff70}.field{white-space:normal;box-decoration-break:clone}.prepared{color:var(--muted);background:#edf0f7;border-radius:8px;padding:6px 10px;font-size:9pt;font-weight:600}.branch-label{color:#fff;margin-top:6px}.diagram-note{font-size:9pt!important;color:var(--muted);margin-top:12px}.check p{margin-top:9px}.cover-art{height:50%;background:#94d5f5}.cover-art .scene{object-fit:contain}.cover .cover-bottom{margin-top:12mm}.experiment{width:100%;height:55mm;object-fit:contain;border-radius:14px;background:#eff5fa}.content .steps{gap:12px}.galeria h3{margin-bottom:2mm}.opcoes{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}.opcoes--largas{grid-template-columns:repeat(4,1fr)}.opcao{margin:0;background:#fff;border:1px solid #e3e8f2;border-radius:10px;padding:2mm;text-align:center}.opcao img{width:100%;aspect-ratio:1;object-fit:contain;border-radius:8px}.opcoes--largas .opcao img{aspect-ratio:1.6;object-fit:cover}.opcao figcaption{font-size:8.5pt;font-weight:700;margin-top:1mm;word-break:break-word}.lesson-three{--accent:var(--green);--accent-soft:var(--green-soft)}.lesson-three .number{background:var(--green-soft);color:var(--green)}
@media print{body{background:#fff}.page{margin:0}}
</style></head><body>${cover}${pages.map((p, i) => `<section class="page lesson-${['one', 'two', 'three'][p.lesson - 1]}" data-id="${p.id}"><div class="inner"><div class="lesson-hero"><img class="scene" data-image="ilha" alt="A Ilha do Farol"><div class="lesson-hero-text"><div class="kicker">${esc(p.kicker)}</div><h2>${esc(p.title)}</h2><p>${esc(p.subtitle)}</p></div></div><div class="content">${p.body}</div></div><div class="page-no"><span class="brand">A Ilha do Farol | Passo a passo do projeto</span><span>${i + 2} / ${pages.length + 1}</span></div></section>`).join('\n')}</body></html>`
writeFileSync(resolve(out, 'caderno.template.html'), html)
writeFileSync(resolve(out, 'cores-estudio.json'), JSON.stringify(colors, null, 2))
console.log(`${pages.length + 1} páginas no template compartilhado do Cadê.`)
