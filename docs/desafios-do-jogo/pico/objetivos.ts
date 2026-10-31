import type {
  ExecutionExpectation,
  ExecutionStep,
  SectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import type { Variacao } from './projetos'

/** Espaço pula (no toque, A), uma tecla da trilha (C01b). */
export const pular: ExecutionStep = { action: 'press', key: 'Space', holdMs: 30 }
const wait = (ms: number): ExecutionStep => ({ action: 'wait', ms })
const press = (key: 'ArrowRight' | 'ArrowLeft' | 'ArrowUp', holdMs: number): ExecutionStep => ({
  action: 'press',
  key,
  holdMs,
})
const val = (
  path: string,
  compare: ExecutionExpectation['compare'],
  value: number | boolean | string,
): ExecutionExpectation => ({ target: { kind: 'value', path }, compare, value })
const point = (
  afterStep: number,
  path: string,
  compare: ExecutionExpectation['compare'],
  value: number | boolean | string,
) => ({ afterStep, expect: val(path, compare, value) })
type Points = Extract<SectionExecutionRule, { type: 'behavior' }>['checkpoints']
const behavior = (
  id: string,
  label: string,
  steps: ExecutionStep[],
  expect: ExecutionExpectation,
  checkpoints: Points = [],
  optional = false,
): SectionJavaScriptProjectCheck => ({
  id,
  label,
  programmingLanguage: 'javascript',
  ...(optional ? { optional: true as const } : {}),
  rule: { type: 'behavior', steps, expect, checkpoints },
})
/** Tempo para o pinguim cair do começo (y 300) e ficar de pé no primeiro gelo. */
export const pousarNoComeco: ExecutionStep = wait(700)
/**
 * Do começo, andando até passar do primeiro gelo e cair no buraco. A seta ainda está apertada
 * quando o pinguim volta ao começo, então ele anda um pouco de novo: por isso os objetivos olham
 * se ele está PERTO do começo, e não numa posição exata.
 */
export const cairNoBuraco: ExecutionStep[] = [press('ArrowRight', 950), wait(1300)]
/**
 * Do começo até a bandeira da fase 1 (medido no executor: cerca de 0,29 px por ms). Com 500 ms o
 * pinguim para em x 184, ainda no gelo; pula o buraco e anda até a bandeira. A última seta dura
 * pouco depois de encostar na bandeira, para o pinguim recomeçar a fase 2 longe do buraco.
 */
export const ateABandeira: ExecutionStep[] = [
  press('ArrowRight', 500),
  pular,
  press('ArrowRight', 700),
  press('ArrowRight', 900),
]

const extra = behavior(
  'pular-com-seta',
  'Extra: a seta para cima também faz o pinguim pular, só quando ele está no gelo.',
  [pousarNoComeco, press('ArrowUp', 30), wait(250), press('ArrowUp', 30), wait(300), wait(1200)],
  val('noChao', 'equals', true),
  [
    point(1, 'noChao', 'equals', true),
    point(3, 'pinguim.y', 'lessThan', 300),
    point(5, 'pinguim.y', 'greaterThan', 200),
    point(6, 'pinguim.y', 'lessThan', 372),
  ],
  true,
)

export const objetivos: Record<Variacao, SectionJavaScriptProjectCheck[]> = {
  plataforma: [
    behavior(
      'andar-e-pousar',
      'As setas levam o pinguim para os lados sobre o gelo, sem sair da tela.',
      [pousarNoComeco, press('ArrowRight', 500), press('ArrowLeft', 2200)],
      val('pinguim.x', 'equals', 0),
      [
        point(1, 'noChao', 'equals', true),
        point(1, 'pinguim.y', 'greaterThan', 360),
        point(2, 'pinguim.x', 'greaterThan', 100),
        point(2, 'noChao', 'equals', true),
        point(3, 'pinguim.y', 'lessThan', 372),
      ],
    ),
    behavior(
      'pular',
      'Espaço faz o pinguim subir e voltar ao gelo, sem pular de novo enquanto ele está no ar.',
      [pousarNoComeco, pular, wait(250), pular, wait(300), wait(1200)],
      val('noChao', 'equals', true),
      [
        point(1, 'noChao', 'equals', true),
        point(3, 'pinguim.y', 'lessThan', 300),
        point(5, 'pinguim.y', 'greaterThan', 200),
        point(6, 'pinguim.y', 'lessThan', 372),
      ],
    ),
    behavior(
      'agua',
      'Cair na água do buraco devolve o pinguim ao começo, de pé no primeiro gelo.',
      [pousarNoComeco, ...cairNoBuraco],
      val('recado', 'contains', 'caiu na água'),
      [
        point(1, 'noChao', 'equals', true),
        point(3, 'pinguim.x', 'lessThan', 100),
        point(3, 'noChao', 'equals', true),
        point(3, 'pinguim.y', 'lessThan', 372),
      ],
    ),
    behavior(
      'bandeira',
      'Passar o buraco e chegar à bandeira da fase 1 leva à fase 2, com o pinguim de volta ao começo.',
      [pousarNoComeco, ...ateABandeira, wait(600)],
      val('fase', 'equals', 2),
      [
        point(2, 'fase', 'equals', 1),
        point(4, 'pinguim.x', 'greaterThan', 300),
        point(4, 'noChao', 'equals', true),
        point(5, 'pinguim.x', 'lessThan', 300),
        point(5, 'chegou', 'equals', false),
      ],
    ),
    behavior(
      'fase-2',
      'Na fase 2, subir no gelo do alto e chegar à bandeira termina o jogo.',
      [
        pousarNoComeco,
        ...ateABandeira,
        wait(1500),
        pular,
        wait(900),
        press('ArrowRight', 250),
        wait(300),
      ],
      val('chegou', 'equals', true),
      [point(5, 'fase', 'equals', 2), point(5, 'chegou', 'equals', false)],
    ),
    extra,
  ],
  'pulo-alto': [
    behavior(
      'pulo-alto',
      'O pulo fica mais alto e o pinguim continua voltando ao gelo.',
      [pousarNoComeco, pular, wait(300), wait(1300)],
      val('noChao', 'equals', true),
      [
        point(1, 'noChao', 'equals', true),
        point(3, 'pinguim.y', 'lessThan', 270),
        point(4, 'pinguim.y', 'lessThan', 372),
      ],
    ),
    extra,
  ],
  floco: [
    behavior(
      'floco',
      'Pegar o floco de neve soma um floco uma única vez e o floco some, mesmo pulando de novo no mesmo lugar.',
      [pousarNoComeco, pular, wait(1200), pular, wait(1200)],
      val('flocos', 'equals', 1),
      [
        point(3, 'pegouFloco', 'equals', true),
        point(3, 'flocos', 'equals', 1),
        point(5, 'flocos', 'equals', 1),
      ],
    ),
    extra,
  ],
  quedas: [
    behavior(
      'quedas',
      'Cada queda na água soma uma queda no placar, uma vez só por queda.',
      [pousarNoComeco, ...cairNoBuraco, ...cairNoBuraco],
      val('quedas', 'equals', 2),
      [
        point(3, 'quedas', 'equals', 1),
        point(3, 'pinguim.x', 'lessThan', 100),
        point(5, 'pinguim.x', 'lessThan', 100),
      ],
    ),
    extra,
  ],
}
