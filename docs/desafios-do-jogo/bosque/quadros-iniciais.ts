import type {
  DesafioDoManifesto,
  PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import {
  DesafioDoManifestoSchema,
  MOEDAS_PADRAO_POR_TIPO,
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

const bool = (value: boolean): JSExpr => ({ type: 'bool', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const assign = (name: string, value: boolean): JSStatement => ({
  type: 'assign',
  name,
  value: bool(value),
})
const iff = (name: string, then: JSStatement[], otherwise: JSStatement[] = []): JSStatement => ({
  type: 'if',
  cond: v(name),
  then,
  else: otherwise,
})
const image = (varName: string, asset: string, x: number, y: number): JSStatement => ({
  type: 'g2d:createImageSprite',
  varName,
  image: asset,
  x,
  y,
  w: 48,
  h: 48,
})
const draw = (spriteVar: string): JSStatement => ({
  type: 'g2d:drawSprite',
  ctxVar: 'ctx',
  spriteVar,
})
const label = (text: string | JSExpr, x: number, y: number): JSStatement => ({
  type: 'g2d:drawLabel',
  ctxVar: 'ctx',
  text,
  x,
  y,
  size: 18,
  color: '#184d3c',
  align: 'left',
})
const key = (key: string, body: JSStatement[]): JSStatement => ({ type: 'g2d:onKey', key, body })
const contact = (bVar: string, body: JSStatement[]): JSStatement => ({
  type: 'g2d:onOverlap',
  aVar: 'guia',
  bVar,
  body,
})
const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${body}</svg>`
const arts = {
  guia: svg(
    '<circle cx="24" cy="25" r="18" fill="#51a897"/><circle cx="18" cy="21" r="3" fill="#183e38"/><circle cx="30" cy="21" r="3" fill="#183e38"/><path d="M17 31q7 6 14 0" fill="none" stroke="#183e38" stroke-width="2"/>',
  ),
  alface: svg(
    '<path d="M24 43C1 40 3 14 14 9q10-16 20 0c16 9 9 29-10 34Z" fill="#65b84e"/><path d="M24 42V15m0 14L12 19m12 17 12-17" stroke="#31743d" stroke-width="3"/>',
  ),
  coelho: svg(
    '<ellipse cx="15" cy="12" rx="6" ry="11" fill="#faf4db"/><ellipse cx="33" cy="12" rx="6" ry="11" fill="#faf4db"/><circle cx="24" cy="29" r="18" fill="#faf4db"/><circle cx="18" cy="26" r="2"/><circle cx="30" cy="26" r="2"/><path d="m21 32 3 3 3-3" fill="#c97780"/>',
  ),
  pegada: svg(
    '<ellipse cx="24" cy="31" rx="13" ry="10" fill="#b47746"/><circle cx="10" cy="19" r="5" fill="#b47746"/><circle cx="20" cy="12" r="5" fill="#b47746"/><circle cx="32" cy="12" r="5" fill="#b47746"/><circle cx="40" cy="22" r="5" fill="#b47746"/>',
  ),
  luz: svg(
    '<circle cx="24" cy="24" r="22" fill="#fff09a"/><ellipse cx="24" cy="28" rx="7" ry="13" fill="#c3a843"/><circle cx="24" cy="17" r="7" fill="#405e46"/><path d="m21 11-6-6m12 6 6-6" stroke="#405e46" stroke-width="2"/>',
  ),
  apagado: svg(
    '<circle cx="24" cy="24" r="22" fill="#b8c8bd"/><ellipse cx="24" cy="28" rx="7" ry="13" fill="#70887a"/><circle cx="24" cy="17" r="7" fill="#405e46"/>',
  ),
  chegada: svg('<path d="M10 45V3h30v22H10" fill="#f6cc72" stroke="#89613d" stroke-width="3"/>'),
}
const assets: ProjectAsset[] = Object.entries(arts).map(([name, body]) => ({
  id: `bosque-quadros-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(body).toString('base64')}`,
}))
const press = (key: string, holdMs = 30): ExecutionStep => ({ action: 'press', key, holdMs })
const val = (
  path: string,
  value: boolean | number,
  compare: ExecutionExpectation['compare'] = 'equals',
): ExecutionExpectation => ({
  target: { kind: 'value', path },
  compare,
  value,
})
const check = (
  id: string,
  label: string,
  steps: ExecutionStep[],
  expect: ExecutionExpectation,
  checkpoints: { afterStep: number; expect: ExecutionExpectation }[] = [],
  optional = false,
): SectionJavaScriptProjectCheck => ({
  id,
  label,
  programmingLanguage: 'javascript',
  ...(optional ? { optional: true } : {}),
  rule: { type: 'behavior', steps, expect, ...(checkpoints.length ? { checkpoints } : {}) },
})

export const QUADROS_INICIAIS_DO_BOSQUE = [
  {
    slug: 'vagalume-aceso',
    titulo: 'Vagalume aceso',
    instrucao: 'Espaço acende o vagalume.',
    texto:
      'O vagalume espera um sinal. Complete o evento da tecla Espaço para guardar verdadeiro em aceso. O desenho já acompanha essa informação. Segurar ou apertar de novo deve manter a luz acesa.',
    dica: 'O evento da tecla já está no espaço de blocos. Dentro dele, mude aceso para verdadeiro.',
  },
  {
    slug: 'lanche-do-coelho',
    titulo: 'O lanche do coelho',
    instrucao: 'Pegue a alface e leve ao coelho.',
    texto:
      'Mova o guia com as setas. No contato com a alface, guarde que temAlface e retire a alface do cenário. No contato com o coelho, entregue só se tiver a alface: marque entregue e deixe temAlface falso. Chegar sem alimento não entrega nada.',
    dica: 'A informação temAlface faz o papel da chave. O coelho só recebe dentro de um Se.',
  },
  {
    slug: 'trilha-das-pegadas',
    titulo: 'Trilha das pegadas',
    instrucao: 'Siga as três pegadas, da esquerda para a direita.',
    texto:
      'As três pegadas mostram o caminho. Marque primeira ao tocar a primeira. A segunda só marca segunda se a primeira já foi visitada. A terceira só marca terminou se a segunda já foi visitada. Passar direto pela última não termina a trilha.',
    dica: 'Use informações verdadeiras ou falsas para lembrar as marcas que já visitou.',
  },
  {
    slug: 'cuide-dos-quatro',
    titulo: 'Cuide dos quatro',
    instrucao: 'Visite os quatro bichos. Cada cuidado conta uma vez.',
    texto:
      'Quatro bichos esperam uma visita. Para cada contato, confira se o bicho já recebeu cuidado. Se ainda não recebeu, marque a informação daquele bicho e some um em cuidados. Ficar encostado ou voltar ao mesmo bicho não soma de novo.',
    dica: 'Use cuidado1, cuidado2, cuidado3 e cuidado4. O Senão é o lugar de cuidar quando a informação ainda é falsa.',
  },
  {
    slug: 'travessia-tranquila',
    titulo: 'Travessia tranquila',
    instrucao: 'Espaço começa. A bandeira encerra a travessia.',
    texto:
      'O guia começa parado. Espaço marca correndo como verdadeiro. No laço, só aplique a velocidade enquanto correndo for verdadeiro. No contato com a bandeira, marque chegou e pare a corrida. Uma chegada não deve continuar movendo o guia.',
    dica: 'O cenário e a velocidade já estão preparados. Separe o evento que começa, a condição do movimento e o contato que termina.',
  },
] as const
export type QuadroInicialDoBosque = 1 | 2 | 3 | 4 | 5

export function projetoDoQuadroBosque(quadro: QuadroInicialDoBosque, pronto: boolean): Project {
  const meta = QUADROS_INICIAIS_DO_BOSQUE[quadro - 1]!
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: 640, height: 480, bg: '#e7f3d5' },
    { type: 'g2d:enableClassicControls', mode: 'always' },
  ]
  const events: JSStatement[] = [key('Enter', pronto ? [{ type: 'g2d:restart' }] : [])]
  const movement: JSStatement[] = []
  const drawing: JSStatement[] = [label(meta.titulo, 20, 35), label(meta.instrucao, 20, 68)]
  const informacoes = (...names: string[]) =>
    start.push(...names.map((name): JSStatement => ({ type: 'var', name, value: bool(false) })))
  if (quadro === 1) {
    informacoes('aceso')
    start.push(image('vagalume', 'apagado', 296, 210))
    events.push(key('Space', pronto ? [assign('aceso', true)] : []))
    drawing.push(
      iff(
        'aceso',
        [{ type: 'g2d:setImage', spriteVar: 'vagalume', image: 'luz' }],
        [{ type: 'g2d:setImage', spriteVar: 'vagalume', image: 'apagado' }],
      ),
      draw('vagalume'),
    )
  } else {
    start.push(image('guia', 'guia', 48, 240))
    drawing.push(draw('guia'))
    if (quadro !== 5)
      movement.push(
        { type: 'g2d:topDown', spriteVar: 'guia', speed: 4 },
        { type: 'g2d:clampToScreen', spriteVar: 'guia', ctxVar: 'ctx' },
      )
    if (quadro === 2) {
      informacoes('temAlface', 'entregue')
      start.push(image('alface', 'alface', 220, 240), image('coelho', 'coelho', 480, 240))
      drawing.push(
        draw('alface'),
        draw('coelho'),
        iff('entregue', [label('Lanche entregue.', 20, 120)]),
      )
      events.push(
        contact(
          'alface',
          pronto
            ? [assign('temAlface', true), { type: 'g2d:destroySprite', spriteVar: 'alface' }]
            : [],
        ),
        contact(
          'coelho',
          pronto ? [iff('temAlface', [assign('entregue', true), assign('temAlface', false)])] : [],
        ),
      )
    } else if (quadro === 3) {
      informacoes('primeira', 'segunda', 'terminou')
      for (const [i, name] of ['primeira', 'segunda', 'terminou'].entries()) {
        const sprite = `pegada${i + 1}`
        start.push(image(sprite, 'pegada', 200 + i * 160, 240))
        drawing.push(draw(sprite), label(String(i + 1), 216 + i * 160, 225))
        const acao = [assign(name, true)]
        events.push(
          contact(
            sprite,
            pronto ? (i === 0 ? acao : [iff(i === 1 ? 'primeira' : 'segunda', acao)]) : [],
          ),
        )
      }
      drawing.push(iff('terminou', [label('Trilha completa.', 20, 120)]))
    } else if (quadro === 4) {
      start.push({ type: 'var', name: 'cuidados', value: { type: 'num', value: 0 } })
      for (let i = 1; i <= 4; i++) {
        const name = `cuidado${i}`
        const sprite = `bicho${i}`
        informacoes(name)
        start.push(image(sprite, 'coelho', 160 + (i - 1) * 125, 240))
        drawing.push(draw(sprite))
        events.push(
          contact(
            sprite,
            pronto
              ? [
                  iff(
                    name,
                    [],
                    [
                      assign(name, true),
                      {
                        type: 'assign',
                        name: 'cuidados',
                        value: {
                          type: 'binop',
                          op: '+',
                          left: v('cuidados'),
                          right: { type: 'num', value: 1 },
                        },
                      },
                    ],
                  ),
                ]
              : [],
          ),
        )
      }
      drawing.push(label('Cuidados:', 20, 120), label(v('cuidados'), 125, 120))
    } else {
      informacoes('correndo', 'chegou')
      start.push(image('bandeira', 'chegada', 540, 240), {
        type: 'g2d:setVelocity',
        spriteVar: 'guia',
        vx: { type: 'num', value: 3 },
        vy: { type: 'num', value: 0 },
      })
      events.push(
        key('Space', pronto ? [iff('chegou', [], [assign('correndo', true)])] : []),
        contact('bandeira', pronto ? [assign('chegou', true), assign('correndo', false)] : []),
      )
      if (pronto) movement.push(iff('correndo', [{ type: 'g2d:applyVelocity', spriteVar: 'guia' }]))
      drawing.push(draw('bandeira'), iff('chegou', [label('Travessia completa.', 20, 120)]))
    }
  }
  const source: SZIRV2 = {
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d' }],
    behavior: {
      start,
      events,
      loops: [
        { type: 'g2d:updateEachFrame', body: [...movement, { type: 'g2d:clear' }, ...drawing] },
      ],
    },
  }
  const ir = assignStableIdsToIR(source, `bosque-quadro-${quadro}`)
  return {
    ...createEmptyProject(`bosque-${meta.slug}`, meta.titulo),
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

export function objetivosDoQuadroBosque(
  quadro: QuadroInicialDoBosque,
): SectionJavaScriptProjectCheck[] {
  const right = (ms: number) => press('ArrowRight', ms)
  const passos =
    quadro === 1
      ? [press('Space'), press('Space')]
      : quadro === 5
        ? [press('Space'), { action: 'wait' as const, ms: 3500 }]
        : [right(650), right(1700)]
  const final =
    quadro === 1
      ? val('aceso', true)
      : quadro === 2
        ? val('entregue', true)
        : quadro === 3
          ? val('terminou', true)
          : quadro === 4
            ? val('cuidados', 4)
            : val('chegou', true)
  const inicio =
    quadro === 1
      ? val('aceso', false)
      : quadro === 2
        ? val('entregue', false)
        : quadro === 3
          ? val('terminou', false)
          : quadro === 4
            ? val('cuidados', 0)
            : val('chegou', false)
  const instrucoes = [
    'Espaço acende o vagalume e mantém a luz acesa.',
    'Pegue a alface e entregue ao coelho.',
    'Visite as três pegadas na ordem para terminar.',
    'Visite os quatro bichos para contar quatro cuidados.',
    'Espaço começa a travessia e a bandeira marca a chegada.',
  ]
  const checks = [
    check('acao', instrucoes[quadro - 1]!, passos, final, [{ afterStep: 0, expect: inicio }]),
  ]
  if (quadro === 2)
    checks.push(
      check(
        'sem-alface',
        'Chegar ao coelho sem alface espera; buscar e voltar entrega.',
        [
          press('ArrowUp', 400),
          right(1800),
          press('ArrowDown', 400),
          press('ArrowLeft', 1100),
          right(1100),
        ],
        val('entregue', true),
        [{ afterStep: 3, expect: val('entregue', false) }],
      ),
      check(
        'alface-entregue',
        'A alface entregue não pode ser recolhida de novo.',
        [right(650), right(1100), press('ArrowLeft', 1100)],
        val('temAlface', false),
        [
          { afterStep: 1, expect: val('temAlface', true) },
          { afterStep: 2, expect: val('entregue', true) },
        ],
      ),
    )
  if (quadro === 3)
    checks.push(
      check(
        'sem-atalho',
        'A última pegada só termina depois das anteriores.',
        [
          press('ArrowUp', 400),
          right(1950),
          press('ArrowDown', 400),
          press('ArrowLeft', 1400),
          right(1500),
        ],
        val('terminou', true),
        [{ afterStep: 3, expect: val('terminou', false) }],
      ),
    )
  if (quadro === 4)
    checks.push(
      check(
        'uma-vez',
        'O mesmo bicho conta uma vez, mesmo saindo e voltando.',
        [right(350), press('ArrowLeft', 350), right(350), { action: 'wait', ms: 500 }],
        val('cuidados', 1),
        [{ afterStep: 1, expect: val('cuidados', 1) }],
      ),
    )
  if (quadro === 5)
    checks.push(
      check(
        'parar',
        'Depois da chegada, o guia permanece junto da bandeira.',
        [...passos, { action: 'wait', ms: 900 }, press('Space'), { action: 'wait', ms: 500 }],
        val('guia.x', 590, 'lessThan'),
        [
          { afterStep: 2, expect: val('correndo', false) },
          { afterStep: 5, expect: val('chegou', true) },
        ],
      ),
    )
  checks.push(
    check(
      'recomecar',
      'Extra: Enter recomeça o minijogo.',
      [...passos, press('Enter')],
      inicio,
      [{ afterStep: passos.length, expect: final }],
      true,
    ),
  )
  return checks
}

export function desafiosIniciaisDoBosque(publico: PublicoDoDesafio): DesafioDoManifesto[] {
  return QUADROS_INICIAIS_DO_BOSQUE.map((meta, i) => {
    const quadro = (i + 1) as QuadroInicialDoBosque
    const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
    return DesafioDoManifestoSchema.parse({
      slug: `bosque-${meta.slug}${publico === 'adulto' ? '-adulto' : ''}`,
      publico,
      ilha: 'bosque',
      tipo: 'quadro-das-cores',
      quadro,
      ordem: quadro * 10,
      // §6.28 A1: o Bosque publica como está (todos os blocos têm fonte nos cursos).
      publicar: true,
      conteudo: {
        versao: 1,
        titulo: meta.titulo,
        enunciado: meta.texto,
        dicas: [meta.dica, 'O cenário já está pronto. Complete somente as ações indicadas.'],
        projetoInicial: projetoDoQuadroBosque(quadro, false),
        gabarito: projetoDoQuadroBosque(quadro, true),
        objetivos: objetivosDoQuadroBosque(quadro),
        desafioExtra: {
          titulo: 'Mais um desafio',
          texto: 'Complete o evento Enter para recomeçar o minijogo do início.',
        },
        recompensa: {
          cor: true,
          atracao: `bosque-${meta.slug}`,
          moedas: moedas.principal,
          moedasExtra: moedas.extra,
        },
        blocosManuais: { acrescentar: [], retirar: [] },
      },
    })
  })
}
