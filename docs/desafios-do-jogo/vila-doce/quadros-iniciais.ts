import {
  DesafioDoManifestoSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import type {
  ExecutionExpectation,
  ExecutionStep,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'

const n = (value: number): JSExpr => ({ type: 'num', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const set = (name: string, value: number | JSExpr): JSStatement => ({
  type: 'assign',
  name,
  value: typeof value === 'number' ? n(value) : value,
})
const inc = (name: string, delta: number) =>
  set(name, { type: 'binop', op: delta < 0 ? '-' : '+', left: v(name), right: n(Math.abs(delta)) })
const eq = (name: string, value: number): JSExpr => ({
  type: 'binop',
  op: '===',
  left: v(name),
  right: n(value),
})
const iff = (cond: JSExpr, then: JSStatement[]): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: [],
})
const key = (key: string, body: JSStatement[]): JSStatement => ({ type: 'g2d:onKey', key, body })
const label = (text: string | JSExpr, x: number, y: number): JSStatement => ({
  type: 'g2d:drawLabel',
  ctxVar: 'ctx',
  text,
  x,
  y,
  size: 20,
  color: '#583529',
  align: 'left',
})

export const QUADROS_INICIAIS_DA_VILA = [
  {
    slug: 'forno-da-vez',
    titulo: 'O forno da vez',
    linhas: ['Esquerda: forno 1. Direita: forno 2.', 'Espaço assa no forno escolhido.'],
    texto:
      'A encomenda pede o forno 2. As setas já escolhem o forno. Complete Espaço para somar um em assados somente quando escolhido for 2 e assados ainda for zero. O forno errado não assa e a mesma encomenda não conta duas vezes.',
    dica: 'Use dois Se: confira o forno escolhido e depois se ainda não assou esta encomenda.',
  },
  {
    slug: 'caixa-de-paes',
    titulo: 'A caixa de pães',
    linhas: ['Espaço entrega um pão.', 'Há três pães na caixa.'],
    texto:
      'A caixa começa com três pães. Complete Espaço para entregar somente quando estoque for maior que zero. Em cada entrega, diminua estoque em um e aumente entregas em um. Depois dos três pães, novos pedidos esperam sem deixar o estoque negativo.',
    dica: 'As duas mudanças ficam dentro da mesma condição de estoque disponível.',
  },
  {
    slug: 'suco-na-ordem',
    titulo: 'Suco na ordem',
    linhas: ['Esquerda: laranja. Direita: água.', 'Espaço serve o suco pronto.'],
    texto:
      'O copo começa vazio, com etapa zero. Na seta esquerda, passe para etapa 1 somente se estiver em zero. Na direita, passe de 1 para 2. Espaço só serve na etapa 2: some um em servidos e passe para etapa 3. Assim não serve vazio, não pula a laranja e não serve o mesmo copo duas vezes.',
    dica: 'Cada evento confere a etapa anterior antes de mudar para a próxima.',
  },
  {
    slug: 'doce-esfriou',
    titulo: 'O doce esfriou',
    linhas: ['Espaço começa a esfriar o doce.', 'Direita entrega quando faltar zero.'],
    texto:
      'Espaço e o resfriamento já estão prontos. Complete a seta direita para entregar só quando comecou for 1, faltam for zero e entregas ainda for zero. Some uma entrega. Apertar antes de começar ou enquanto estiver quente não entrega nada.',
    dica: 'O resfriamento é parte do cenário pronto. No evento da direita, confira as três informações.',
  },
  {
    slug: 'bandejas-da-padaria',
    titulo: 'Bandejas da padaria',
    linhas: ['Direita põe um pão. Esquerda retira.', 'Espaço entrega o pedido de dois.'],
    texto:
      'As setas já montam a bandeja. O pedido é de dois pães. Complete Espaço para aceitar somente quando bandeja for 2. Some um em atendidos e deixe bandeja em zero. Falta e sobra não são aceitas. Uma bandeja entregue não pode atender de novo sem montar outro pedido.',
    dica: 'Compare a quantidade com dois. Depois de contar o atendimento, esvazie a bandeja.',
  },
] as const
export type QuadroInicialDaVila = 1 | 2 | 3 | 4 | 5

const desenho = (corpo: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">${corpo}</svg>`
const imagens = {
  forno: desenho(
    '<rect x="10" y="15" width="100" height="95" rx="12" fill="#d88369"/><rect x="20" y="42" width="80" height="55" rx="8" fill="#553829"/><circle cx="30" cy="28" r="5" fill="#fff1cf"/><path d="M38 87q5-40 17-10q4-50 19-3q9-20 14 13" fill="#ffc362"/>',
  ),
  pao: desenho(
    '<ellipse cx="60" cy="66" rx="49" ry="34" fill="#e8a746"/><path d="m35 45 8 24m17-29 8 24m17-19 7 22" stroke="#ffe3a1" stroke-width="7" stroke-linecap="round"/>',
  ),
  copo: desenho(
    '<path d="m26 18 8 91h52l8-91Z" fill="#ccecf0" stroke="#3e7883" stroke-width="4"/><path d="m32 53 5 51h46l5-51Z" fill="#f6b642"/><path d="m70 10-8 55" stroke="#c96a62" stroke-width="6"/>',
  ),
  doce: desenho(
    '<path d="m16 59 13 45h62l13-45Z" fill="#c683a2"/><path d="M15 59c0-29 27-16 30-34c6-22 38-8 33 7c30-5 31 27 26 27Z" fill="#fff0dc"/><circle cx="61" cy="18" r="10" fill="#d45e6f"/>',
  ),
}
const assets: ProjectAsset[] = Object.entries(imagens).map(([name, svg]) => ({
  id: `vila-quadros-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
}))

export function projetoDoQuadroVila(quadro: QuadroInicialDaVila, pronto: boolean): Project {
  const meta = QUADROS_INICIAIS_DA_VILA[quadro - 1]!
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: 640, height: 480, bg: '#fff0db' },
    { type: 'g2d:enableClassicControls', mode: 'always' },
  ]
  const events: JSStatement[] = [key('Enter', pronto ? [{ type: 'g2d:restart' }] : [])]
  const atualizacao: JSStatement[] = []
  const drawing: JSStatement[] = [
    label(meta.titulo, 24, 38),
    label(meta.linhas[0], 24, 77),
    label(meta.linhas[1], 24, 108),
  ]
  const vars = (dados: Record<string, number>) => {
    for (const [name, value] of Object.entries(dados))
      start.push({ type: 'var', name, value: n(value) })
  }
  const imagem = (name: keyof typeof imagens, sprite: string, x: number) => {
    start.push({
      type: 'g2d:createImageSprite',
      varName: sprite,
      image: name,
      x,
      y: 160,
      w: 120,
      h: 120,
    })
    drawing.push({ type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: sprite })
  }
  const valor = (titulo: string, name: string, y: number) =>
    drawing.push(label(titulo, 24, y), label(v(name), 290, y))
  if (quadro === 1) {
    vars({ escolhido: 1, assados: 0 })
    imagem('forno', 'forno1', 150)
    imagem('forno', 'forno2', 370)
    drawing.push(label('1', 202, 300), label('2', 422, 300))
    events.push(
      key('ArrowLeft', [set('escolhido', 1)]),
      key('ArrowRight', [set('escolhido', 2)]),
      key(
        'Space',
        pronto ? [iff(eq('escolhido', 2), [iff(eq('assados', 0), [inc('assados', 1)])])] : [],
      ),
    )
    valor('Forno escolhido:', 'escolhido', 350)
    valor('Encomendas assadas:', 'assados', 390)
  } else if (quadro === 2) {
    vars({ estoque: 3, entregas: 0 })
    imagem('pao', 'paes', 260)
    events.push(
      key(
        'Space',
        pronto
          ? [
              iff({ type: 'binop', op: '>', left: v('estoque'), right: n(0) }, [
                inc('estoque', -1),
                inc('entregas', 1),
              ]),
            ]
          : [],
      ),
    )
    valor('Pães na caixa:', 'estoque', 350)
    valor('Pães entregues:', 'entregas', 390)
  } else if (quadro === 3) {
    vars({ etapa: 0, servidos: 0 })
    imagem('copo', 'suco', 260)
    events.push(
      key('ArrowLeft', pronto ? [iff(eq('etapa', 0), [set('etapa', 1)])] : []),
      key('ArrowRight', pronto ? [iff(eq('etapa', 1), [set('etapa', 2)])] : []),
      key('Space', pronto ? [iff(eq('etapa', 2), [inc('servidos', 1), set('etapa', 3)])] : []),
    )
    valor('Etapa do suco:', 'etapa', 350)
    valor('Copos servidos:', 'servidos', 390)
  } else if (quadro === 4) {
    vars({ comecou: 0, faltam: 120, entregas: 0 })
    imagem('doce', 'doce', 260)
    events.push(
      key('Space', [set('comecou', 1)]),
      key(
        'ArrowRight',
        pronto
          ? [
              iff(eq('comecou', 1), [
                iff(eq('faltam', 0), [iff(eq('entregas', 0), [inc('entregas', 1)])]),
              ]),
            ]
          : [],
      ),
    )
    atualizacao.push(
      iff(eq('comecou', 1), [
        iff({ type: 'binop', op: '>', left: v('faltam'), right: n(0) }, [inc('faltam', -1)]),
      ]),
    )
    valor('Calor restante:', 'faltam', 350)
    valor('Doces entregues:', 'entregas', 390)
  } else {
    vars({ bandeja: 0, atendidos: 0 })
    imagem('pao', 'bandejaDePaes', 260)
    events.push(
      key('ArrowRight', [
        iff({ type: 'binop', op: '<', left: v('bandeja'), right: n(5) }, [inc('bandeja', 1)]),
      ]),
      key('ArrowLeft', [
        iff({ type: 'binop', op: '>', left: v('bandeja'), right: n(0) }, [inc('bandeja', -1)]),
      ]),
      key('Space', pronto ? [iff(eq('bandeja', 2), [inc('atendidos', 1), set('bandeja', 0)])] : []),
    )
    valor('Pães na bandeja:', 'bandeja', 350)
    valor('Pedidos atendidos:', 'atendidos', 390)
  }
  drawing.push(label('Enter: nova rodada depois de completar o extra.', 24, 442))
  const ir = assignStableIdsToIR(
    {
      version: 2,
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-2d' }],
      behavior: {
        start,
        events,
        loops: [
          {
            type: 'g2d:updateEachFrame',
            body: [...atualizacao, { type: 'g2d:clear' }, ...drawing],
          },
        ],
      },
    } satisfies SZIRV2,
    `vila-quadro-${quadro}`,
  )
  return {
    ...createEmptyProject(`vila-${meta.slug}`, meta.titulo),
    programmingLanguage: 'javascript',
    mode: 'blocks',
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: meta.titulo }),
    assets,
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}

const press = (key: string): ExecutionStep => ({ action: 'press', key, holdMs: 30 })
const space = () => press('Space')
const right = () => press('ArrowRight')
const left = () => press('ArrowLeft')
const value = (path: string, value: number): ExecutionExpectation => ({
  target: { kind: 'value', path },
  compare: 'equals',
  value,
})
export function objetivosDoQuadroVila(
  quadro: QuadroInicialDaVila,
): SectionJavaScriptProjectCheck[] {
  const check = (
    id: string,
    label: string,
    steps: ExecutionStep[],
    path: string,
    expected: number,
    checkpoints: { afterStep: number; expect: ExecutionExpectation }[] = [],
  ): SectionJavaScriptProjectCheck => ({
    id,
    label,
    programmingLanguage: 'javascript',
    rule: { type: 'behavior', steps, expect: value(path, expected), checkpoints },
  })
  const at = (afterStep: number, path: string, expected: number) => ({
    afterStep,
    expect: value(path, expected),
  })
  const passos: ExecutionStep[] =
    quadro === 1
      ? [right(), space()]
      : quadro === 2
        ? [space(), space(), space()]
        : quadro === 3
          ? [left(), right(), space()]
          : quadro === 4
            ? [space(), { action: 'wait', ms: 3500 }, right()]
            : [right(), right(), space()]
  const alvo =
    quadro === 1 ? 'assados' : quadro === 3 ? 'servidos' : quadro === 5 ? 'atendidos' : 'entregas'
  const final = quadro === 2 ? 3 : 1
  const checks = [
    check('acao', 'Complete a encomenda com as ações indicadas.', passos, alvo, final, [
      at(0, alvo, 0),
    ]),
  ]
  if (quadro === 1)
    checks.push(
      check(
        'forno-certo',
        'O forno errado espera e a encomenda só conta uma vez.',
        [space(), right(), space(), space(), left(), space()],
        'assados',
        1,
        [at(1, 'assados', 0), at(3, 'assados', 1)],
      ),
    )
  if (quadro === 2)
    checks.push(
      check(
        'estoque',
        'Cada pão entregue sai da caixa; caixa vazia espera.',
        [space(), space(), space(), space(), space()],
        'estoque',
        0,
        [at(1, 'estoque', 2), at(2, 'estoque', 1), at(5, 'entregas', 3)],
      ),
    )
  if (quadro === 3)
    checks.push(
      check(
        'ordem',
        'Não sirva vazio nem pule a laranja, e conte o copo uma vez.',
        [space(), right(), space(), left(), right(), space(), space()],
        'servidos',
        1,
        [
          at(3, 'servidos', 0),
          at(2, 'etapa', 0),
          at(4, 'etapa', 1),
          at(5, 'etapa', 2),
          at(6, 'etapa', 3),
        ],
      ),
    )
  if (quadro === 4)
    checks.push(
      check(
        'quente',
        'Espere começar e esfriar; o mesmo doce só sai uma vez.',
        [right(), space(), right(), { action: 'wait', ms: 3500 }, right(), right()],
        'entregas',
        1,
        [at(1, 'entregas', 0), at(3, 'entregas', 0), at(5, 'entregas', 1)],
      ),
    )
  if (quadro === 5)
    checks.push(
      check(
        'quantidade',
        'Falta e sobra esperam; aceitar esvazia a bandeja.',
        [space(), right(), space(), right(), right(), space(), left(), space(), space()],
        'atendidos',
        1,
        [at(3, 'atendidos', 0), at(6, 'atendidos', 0), at(8, 'bandeja', 0)],
      ),
    )
  checks.push({
    ...check(
      'recomecar',
      'Extra: Enter começa outra rodada.',
      [...passos, press('Enter')],
      alvo,
      0,
      [at(passos.length, alvo, final)],
    ),
    optional: true,
  })
  return checks
}

export function desafiosIniciaisDaVila(publico: PublicoDoDesafio) {
  return QUADROS_INICIAIS_DA_VILA.map((meta, i) => {
    const quadro = (i + 1) as QuadroInicialDaVila
    const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
    return DesafioDoManifestoSchema.parse({
      slug: `vila-doce-${meta.slug}${publico === 'adulto' ? '-adulto' : ''}`,
      publico,
      ilha: 'vila-doce',
      tipo: 'quadro-das-cores',
      quadro,
      ordem: quadro * 10,
      publicar: false,
      conteudo: {
        versao: 1,
        titulo: meta.titulo,
        enunciado: meta.texto,
        dicas: [
          meta.dica,
          'O cenário e os desenhos já estão prontos. Complete apenas as ações indicadas.',
        ],
        projetoInicial: projetoDoQuadroVila(quadro, false),
        gabarito: projetoDoQuadroVila(quadro, true),
        objetivos: objetivosDoQuadroVila(quadro),
        desafioExtra: {
          titulo: 'Mais um desafio',
          texto: 'Complete o evento Enter para começar uma nova rodada do início.',
        },
        recompensa: {
          cor: true,
          atracao: `vila-doce-${meta.slug}`,
          moedas: moedas.principal,
          moedasExtra: moedas.extra,
        },
        blocosManuais: { acrescentar: [], retirar: [] },
      },
    })
  })
}
