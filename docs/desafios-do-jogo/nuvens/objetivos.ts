import type {
  ExecutionExpectation,
  ExecutionStep,
  SectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import type { Variacao } from './projetos'

/**
 * Os objetivos olham o comportamento do jardim (as variáveis ao longo do tempo), nunca a arte. A
 * simulação anda de segundo em segundo, e cada conferência é feita depois que toda a água ou todo
 * o sol já foi gasto: o resultado não depende de em que ponto do segundo o clique caiu.
 */
/** Espaço rega (A no toque) e a seta para cima dá sol: teclas da trilha (C01b). */
export const regar: ExecutionStep = { action: 'press', key: 'Space', holdMs: 30 }
export const darSol: ExecutionStep = { action: 'press', key: 'ArrowUp', holdMs: 30 }
const wait = (ms: number): ExecutionStep => ({ action: 'wait', ms })
const press = (key: 'Enter', holdMs: number): ExecutionStep => ({ action: 'press', key, holdMs })
const val = (
  path: string,
  compare: ExecutionExpectation['compare'],
  value: number | boolean,
): ExecutionExpectation => ({ target: { kind: 'value', path }, compare, value })
const point = (
  afterStep: number,
  path: string,
  compare: ExecutionExpectation['compare'],
  value: number | boolean,
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
  // Sem pontos no meio, a regra vai sem a lista (uma lista vazia não vale no executor).
  rule: { type: 'behavior', steps, expect, ...(checkpoints.length ? { checkpoints } : {}) },
})

/** Três segundos e meio: três passos da simulação, com folga, gastam três de água e três de sol. */
const TRES_PASSOS = 3600

/**
 * O extra: Enter recomeça. Antes, dois passos já fizeram a flor crescer 20 ou mais; logo depois do
 * Enter um segundo pode virar (e, na variação da chuva, cair um de água e a flor crescer 10), então
 * a conferência aceita até um passo novo.
 */
const extra = behavior(
  'recomecar-enter',
  'Extra: Enter recomeça o jardim, com a água, o sol, o tempo e o crescimento do começo.',
  [regar, wait(2600), press('Enter', 30)],
  val('crescimento', 'lessThan', 11),
  [
    point(2, 'crescimento', 'greaterThan', 19),
    point(3, 'tempo', 'lessThan', 2),
    point(3, 'agua', 'lessThan', 2),
    point(3, 'florida', 'equals', false),
  ],
  true,
)

export const objetivos: Record<Variacao, SectionJavaScriptProjectCheck[]> = {
  jardim: [
    behavior(
      'tempo',
      'A cada segundo, o tempo do jardim aumenta um.',
      [wait(2500)],
      val('tempo', 'greaterThan', 1),
    ),
    behavior(
      'botoes',
      'Espaço guarda três de água e a seta para cima guarda três de sol.',
      [regar, darSol],
      val('sol', 'greaterThan', 4),
      [point(1, 'agua', 'greaterThan', 1)],
    ),
    behavior(
      'sem-agua',
      'Sem água a flor não cresce, mesmo com sol e com o tempo passando.',
      [wait(2500)],
      val('crescimento', 'equals', 0),
      [point(1, 'tempo', 'greaterThan', 1)],
    ),
    behavior(
      'crescer',
      'Com água e sol, a flor cresce dez por segundo e gasta um de água e um de sol.',
      [regar, wait(TRES_PASSOS)],
      val('crescimento', 'equals', 30),
      [point(2, 'agua', 'equals', 0), point(2, 'sol', 'equals', 0)],
    ),
    behavior(
      'florescer',
      'Com água e sol de sobra, a flor chega a cem e o jardim floresce.',
      // Doze de água e doze de sol: dez passos chegam a cem (uma espera passa de 10 s, então duas).
      [regar, regar, regar, regar, darSol, darSol, darSol, wait(6000), wait(5000)],
      val('florida', 'equals', true),
      [point(8, 'florida', 'equals', false), point(9, 'crescimento', 'greaterThan', 99)],
    ),
    extra,
  ],
  'rega-forte': [
    behavior(
      'rega-forte',
      'Espaço guarda cinco de água de uma vez.',
      [regar, wait(TRES_PASSOS)],
      val('agua', 'equals', 2),
      [point(1, 'agua', 'greaterThan', 3), point(2, 'crescimento', 'equals', 30)],
    ),
    extra,
  ],
  'sol-forte': [
    // Com nove de sol, três passos fortes (60); depois, com seis, cinco e quatro de sol, um forte e
    // dois fracos (mais 40). Crescer vinte sempre daria 120; dez sempre, 60.
    behavior(
      'sol-forte',
      'Com o sol forte, de seis para cima, a flor cresce vinte por segundo; com menos, dez.',
      [darSol, darSol, regar, wait(TRES_PASSOS), regar, wait(TRES_PASSOS)],
      val('crescimento', 'equals', 100),
      [
        point(4, 'crescimento', 'equals', 60),
        point(4, 'sol', 'equals', 6),
        point(6, 'sol', 'equals', 3),
      ],
    ),
    extra,
  ],
  chuva: [
    behavior(
      'chuva',
      'A cada segundo chove um de água, e a flor cresce sem regar enquanto há sol.',
      [wait(TRES_PASSOS)],
      val('crescimento', 'equals', 30),
      // Cada gota de chuva é gasta no mesmo passo; sem sol, sobra no máximo uma.
      [point(1, 'sol', 'equals', 0), point(1, 'agua', 'lessThan', 2)],
    ),
    extra,
  ],
}
