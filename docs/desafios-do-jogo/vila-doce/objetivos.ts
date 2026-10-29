import type {
  ExecutionExpectation,
  ExecutionStep,
  SectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import type { Variacao } from './projetos'

export const largada: ExecutionStep = {
  action: 'clickTarget',
  target: { kind: 'sprite', path: 'largada', groupPath: 'botoesLargada' },
}
const wait = (ms: number): ExecutionStep => ({ action: 'wait', ms })
const press = (
  key: 'ArrowUp' | 'ArrowDown' | 'ArrowRight' | 'Enter',
  holdMs: number,
): ExecutionStep => ({ action: 'press', key, holdMs })
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
/** Há folga nas ruas e nos alvos: o teste usa as mesmas setas que a criança. */
export const rotaPorCima: ExecutionStep[] = [
  press('ArrowUp', 700),
  press('ArrowRight', 2900),
  press('ArrowDown', 700),
  wait(150),
]
export const rotaPorBaixo: ExecutionStep[] = [
  press('ArrowDown', 650),
  press('ArrowRight', 2900),
  press('ArrowUp', 650),
  wait(150),
]
const extra = (prazo: number) =>
  behavior(
    'recomecar-enter',
    'Extra: Enter recoloca o entregador no começo e inicia outra corrida.',
    [largada, press('ArrowRight', 1500), press('Enter', 30)],
    val('correndo', 'equals', true),
    [
      point(2, 'entregador.x', 'greaterThan', 100),
      point(3, 'entregador.x', 'equals', 48),
      point(3, 'entregador.y', 'equals', 270),
      point(3, 'entregas', 'equals', 0),
      point(3, 'tempo', 'atLeast', prazo - 1),
      point(3, 'recado', 'equals', ''),
    ],
    true,
  )

export const objetivos: Record<Variacao, SectionJavaScriptProjectCheck[]> = {
  corrida: [
    behavior(
      'largada',
      'A Largada recoloca o entregador no começo, zera as entregas e inicia o prazo.',
      [largada, ...rotaPorCima, largada],
      val('correndo', 'equals', true),
      [
        point(5, 'entregas', 'equals', 1),
        point(6, 'entregador.x', 'equals', 48),
        point(6, 'entregador.y', 'equals', 270),
        point(6, 'entregas', 'equals', 0),
        point(6, 'tempo', 'atLeast', 11),
        point(6, 'recado', 'equals', ''),
      ],
    ),
    behavior(
      'entregar',
      'Contornar a caixa e chegar a tempo conclui uma entrega e encerra a corrida.',
      [largada, ...rotaPorCima, wait(300)],
      val('recado', 'equals', 'Entrega feita. Os doces chegaram.'),
      [
        point(5, 'entregas', 'equals', 1),
        point(6, 'entregas', 'equals', 1),
        point(6, 'correndo', 'equals', false),
        point(6, 'tempo', 'greaterThan', 0),
        point(6, 'entregador.vx', 'equals', 0),
        point(6, 'entregador.vy', 'equals', 0),
      ],
    ),
    behavior(
      'caixa',
      'Encostar na caixa interrompe a corrida sem contar entrega.',
      [largada, press('ArrowRight', 1500), wait(200)],
      val('recado', 'equals', 'A caixa ficou no caminho. Tente outra rota.'),
      [
        point(3, 'correndo', 'equals', false),
        point(3, 'entregas', 'equals', 0),
        point(3, 'entregador.vx', 'equals', 0),
      ],
    ),
    behavior(
      'prazo',
      'O tempo diminui e, quando chega a zero, a corrida para sem contar entrega.',
      [largada, wait(1200), wait(10000), wait(1500)],
      val('recado', 'equals', 'O tempo acabou. Tente de novo.'),
      [
        point(1, 'tempo', 'atLeast', 11),
        point(2, 'tempo', 'atMost', 11),
        point(4, 'tempo', 'equals', 0),
        point(4, 'correndo', 'equals', false),
        point(4, 'entregas', 'equals', 0),
      ],
    ),
    extra(12),
  ],
  entregas: [
    behavior(
      'primeira-entrega',
      'A primeira parada conta uma entrega só, mesmo ficando perto dela.',
      [largada, press('ArrowUp', 700), press('ArrowRight', 900), wait(400)],
      val('entregas', 'equals', 1),
      [point(4, 'correndo', 'equals', true), point(4, 'primeiraEntregue', 'equals', true)],
    ),
    behavior(
      'ordem',
      'A chegada espera a entrega 1 antes de encerrar a corrida.',
      [largada, ...rotaPorBaixo],
      val('correndo', 'equals', true),
      [
        point(5, 'entregas', 'equals', 0),
        point(5, 'recado', 'equals', 'Passe primeiro na entrega 1.'),
      ],
    ),
    behavior(
      'duas-entregas',
      'Passar pela entrega 1 e depois pela chegada conclui duas entregas, sem repetir os pontos.',
      [
        largada,
        press('ArrowUp', 700),
        press('ArrowRight', 900),
        press('ArrowRight', 2000),
        press('ArrowDown', 700),
        wait(300),
      ],
      val('entregas', 'equals', 2),
      [
        point(3, 'entregas', 'equals', 1),
        point(6, 'correndo', 'equals', false),
        point(6, 'recado', 'equals', 'Entrega feita. Os doces chegaram.'),
      ],
    ),
    extra(12),
  ],
  tempo: [
    behavior(
      'oito-segundos',
      'A corrida começa com oito segundos e termina quando esse prazo acaba.',
      [largada, wait(8500), wait(500)],
      val('recado', 'equals', 'O tempo acabou. Tente de novo.'),
      [
        point(1, 'tempo', 'equals', 8),
        point(2, 'tempo', 'equals', 0),
        point(3, 'tempo', 'equals', 0),
        point(3, 'correndo', 'equals', false),
        point(3, 'entregas', 'equals', 0),
      ],
    ),
    extra(8),
  ],
  caixa: [
    behavior(
      'caixa-nova',
      'A caixa nova interrompe a corrida ao encostar, e outra rota permite entregar os doces.',
      [
        largada,
        press('ArrowUp', 700),
        press('ArrowRight', 2400),
        wait(150),
        largada,
        ...rotaPorBaixo,
      ],
      val('recado', 'equals', 'Entrega feita. Os doces chegaram.'),
      [
        point(4, 'recado', 'equals', 'A caixa nova ficou no caminho. Tente outra rota.'),
        point(4, 'correndo', 'equals', false),
        point(4, 'entregas', 'equals', 0),
        point(9, 'entregas', 'equals', 1),
        point(9, 'correndo', 'equals', false),
      ],
    ),
    extra(12),
  ],
}
