import type {
  ExecutionExpectation,
  ExecutionStep,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import type { Variacao } from './projetos'

/**
 * Os objetivos do Guardião dos ninhos (lacunas, 01/11/2026). O relógio solta uma cinza por segundo
 * e a cinza leva cerca de 1,6 s até o alcance da torre e 3,5 s até o ninho: as esperas deixam
 * margem para o relógio, que começa quando o jogo abre (não quando a onda começa).
 */
export const press = (k: string, holdMs = 30): ExecutionStep => ({
  action: 'press',
  key: k,
  holdMs,
})
export const wait = (ms: number): ExecutionStep => ({ action: 'wait', ms })
export const val = (
  path: string,
  value: number | boolean,
  compare: ExecutionExpectation['compare'] = 'equals',
): ExecutionExpectation => ({ target: { kind: 'value', path }, compare, value })
export const check = (
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
/** Uma onda de 3 cinzas termina de sair (3 batidas do relógio cabem em 3,8 s). */
export const ONDA_DE_3 = 3800
/** Uma onda de 4 cinzas. */
export const ONDA_DE_4 = 4800
/** Toda a cinza de uma onda de 3 chega ao alcance da torre (ou ao ninho, sem a torre). */
export const ONDA_INTEIRA = 8000

export const recomecar = check(
  'recomecar',
  'Extra: Enter recomeça a defesa.',
  [press('Space'), press('Enter')],
  val('onda', 0),
  [{ afterStep: 1, expect: val('onda', 1) }],
  true,
)

export const objetivos: Record<Variacao, SectionJavaScriptProjectCheck[]> = {
  'mais-cinzas': [
    check(
      'mais-cinzas',
      'Cada onda traz uma cinza a mais: a primeira tem 4.',
      [press('Space'), wait(ONDA_DE_4 + 600)],
      val('cinzasNaOnda', 4),
      [{ afterStep: 1, expect: val('tamanhoDaOnda', 4) }],
    ),
    recomecar,
  ],
  'dois-pontos': [
    check(
      'dois-pontos',
      'Cada cinza limpa pela torre vale dois pontos.',
      [press('Space'), wait(ONDA_INTEIRA)],
      val('pontos', 6),
    ),
    recomecar,
  ],
  'ondas-contadas': [
    check(
      'tres-ondas',
      'Depois da terceira onda, Espaço não começa outra.',
      [
        press('Space'),
        wait(ONDA_DE_3),
        press('Space'),
        wait(ONDA_DE_4),
        press('Space'),
        wait(5800),
        press('Space'),
      ],
      val('onda', 3),
      [{ afterStep: 5, expect: val('onda', 3) }],
    ),
    recomecar,
  ],
  'onda-limpa': [
    check(
      'onda-limpa',
      'Uma onda sem cinza no ninho ganha 5 pontos de bônus.',
      [press('Space'), wait(ONDA_INTEIRA)],
      val('pontos', 8),
    ),
    recomecar,
  ],
}
