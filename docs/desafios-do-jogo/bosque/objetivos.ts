import type {
  ExecutionExpectation,
  ExecutionStep,
  SectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { bichos, type Variacao } from './projetos'

const tecla = (key: string): ExecutionStep => ({ action: 'press', key, holdMs: 30 })
const largada = tecla('Enter')
const wait = (ms: number): ExecutionStep => ({ action: 'wait', ms })
const val = (
  path: string,
  compare: ExecutionExpectation['compare'],
  value: string | number | boolean,
): ExecutionExpectation => ({ target: { kind: 'value', path }, compare, value })
const point = (
  afterStep: number,
  path: string,
  compare: ExecutionExpectation['compare'],
  value: string | number | boolean,
) => ({ afterStep, expect: val(path, compare, value) })
type Points = Extract<SectionExecutionRule, { type: 'behavior' }>['checkpoints']
const behavior = (
  id: string,
  label: string,
  steps: ExecutionStep[],
  expect: ExecutionExpectation,
  checkpoints?: Points,
  optional = false,
): SectionJavaScriptProjectCheck => ({
  id,
  label,
  programmingLanguage: 'javascript',
  ...(optional ? { optional: true as const } : {}),
  rule: { type: 'behavior', steps, expect, ...(checkpoints ? { checkpoints } : {}) },
})

export const objetivos: Record<Variacao, SectionJavaScriptProjectCheck[]> = {
  corrida: [
    behavior(
      'largada',
      'A Largada traz os quatro bichos de volta ao começo.',
      [largada, wait(900), largada],
      val('correndo', 'equals', true),
      bichos.flatMap((b) => [
        point(2, `${b}.x`, 'greaterThan', 20),
        point(3, `${b}.x`, 'lessThan', 20),
      ]),
    ),
    behavior(
      'movimento',
      'Os quatro bichos avançam enquanto a corrida está acontecendo.',
      [largada, wait(900)],
      val('correndo', 'equals', true),
      bichos.map((b) => point(2, `${b}.x`, 'greaterThan', 20)),
    ),
    {
      id: 'sorteio',
      label: 'Cada bicho sorteia um passo curto ou longo dentro do laço.',
      programmingLanguage: 'javascript',
      rule: {
        type: 'usesBlock',
        area: 'loops',
        withinBlock: 'sz_g2d_every_frames',
        blockType: 'sz_g2d_random_x',
        count: 4,
      },
    },
    ...bichos.map((b) => ({
      id: `fala-${b}`,
      label: `Ao tocar a chegada, o ${b} diz Ganhei se a corrida ainda estiver acontecendo.`,
      programmingLanguage: 'javascript' as const,
      rule: {
        type: 'usesBlock' as const,
        area: 'events' as const,
        blockType: 'sz_g2d_on_overlap',
        fields: { A: b, B: 'chegada' },
        inputBlocks: {
          BODY: {
            blockType: 'sz_js_if_else',
            inputBlocks: {
              COND: { blockType: 'sz_val_variable', fields: { NAME: 'correndo' } },
              THEN: {
                blockType: 'sz_js_var_assign',
                fields: { NAME: `fala_${b}` },
                inputs: { VALUE: 'Ganhei' },
              },
            },
          },
        },
      },
    })),
    behavior(
      'chegada',
      'A corrida tem um vencedor e todos param na chegada.',
      [largada, wait(8000), wait(600)],
      val('vencedor', 'notEquals', ''),
      [
        point(0, 'vencedor', 'equals', ''),
        point(2, 'correndo', 'equals', false),
        ...bichos.map((b) => point(3, `${b}.vx`, 'equals', 0)),
      ],
    ),
    behavior(
      'espaco',
      'Extra: o bicho escolhido fica parado e anda quando você aperta espaço.',
      [tecla('ArrowUp'), largada, wait(500), { action: 'press', key: 'Space', holdMs: 30 }],
      val('cachorro.x', 'greaterThan', 0),
      [point(3, 'cachorro.x', 'equals', 0)],
      true,
    ),
  ],
  pedras: [
    behavior(
      'pular',
      'Os quatro bichos sobem para passar pelas pedras.',
      [largada, wait(3450)],
      val('correndo', 'equals', true),
      bichos.flatMap((b, i) => [
        point(2, `${b}.x`, 'greaterThan', 205),
        point(2, `${b}.y`, 'lessThan', 88 + i * 70),
      ]),
    ),
    behavior(
      'aterrissar',
      'Depois das pedras, os bichos voltam ao chão e a corrida tem um vencedor.',
      [largada, wait(8000)],
      val('vencedor', 'notEquals', ''),
      bichos.flatMap((b, i) => [
        point(2, `pulo_${b}`, 'equals', 40),
        point(2, `${b}.y`, 'equals', 90 + i * 70),
      ]),
    ),
    behavior(
      'largada-enter',
      'Extra: Espaço ou A também traz os quatro bichos ao começo e inicia outra corrida.',
      [largada, wait(900), tecla('Space')],
      val('correndo', 'equals', true),
      bichos.flatMap((b) => [
        point(2, `${b}.x`, 'greaterThan', 20),
        point(3, `${b}.x`, 'lessThan', 20),
      ]),
      true,
    ),
  ],
  noite: [
    behavior(
      'acender',
      'Espaço ou A ilumina a pista sem tirar os bichos do lugar.',
      [tecla('Space')],
      val('noite.opacity', 'atMost', 0.2),
      [
        point(0, 'noite.opacity', 'atLeast', 0.9),
        ...bichos.map((b) => point(1, `${b}.x`, 'equals', 0)),
      ],
    ),
    behavior(
      'apagar',
      'Extra: aperte Espaço ou A de novo para apagar, e outra vez para acender.',
      Array.from({ length: 3 }, () => tecla('Space')),
      val('noite.opacity', 'atMost', 0.2),
      [point(1, 'noite.opacity', 'atMost', 0.2), point(2, 'noite.opacity', 'atLeast', 0.9)],
      true,
    ),
  ],
  placar: [
    ...bichos.map((b) => ({
      id: `ponto-${b}`,
      label: `A vitória do ${b} soma um ponto no placar dele.`,
      programmingLanguage: 'javascript' as const,
      rule: {
        type: 'usesBlock' as const,
        area: 'events' as const,
        blockType: 'sz_g2d_on_overlap',
        fields: { A: b, B: 'chegada' },
        inputBlocks: {
          BODY: {
            blockType: 'sz_js_if_else',
            inputBlocks: {
              COND: { blockType: 'sz_val_variable', fields: { NAME: 'correndo' } },
              THEN: {
                blockType: 'sz_js_var_increment',
                fields: { NAME: `vitorias_${b}`, DELTA: 1 },
              },
            },
          },
        },
      },
    })),
    behavior(
      'vitoria',
      'O placar registra uma única corrida, sem continuar contando depois da chegada.',
      [largada, wait(8000), wait(600)],
      val('corridas', 'equals', 1),
      [point(0, 'corridas', 'equals', 0), point(2, 'corridas', 'equals', 1)],
    ),
    behavior(
      'guardar',
      'A Largada preserva as vitórias da corrida anterior.',
      [largada, wait(8000), largada],
      val('corridas', 'equals', 1),
      [point(3, 'correndo', 'equals', true), point(3, 'vencedor', 'equals', '')],
    ),
    behavior(
      'zerar',
      'Extra: Espaço ou A deixa todas as vitórias em zero.',
      [largada, wait(8000), tecla('Space')],
      val('corridas', 'equals', 0),
      [
        point(2, 'corridas', 'equals', 1),
        ...bichos.map((b) => point(3, `vitorias_${b}`, 'equals', 0)),
      ],
      true,
    ),
  ],
}
