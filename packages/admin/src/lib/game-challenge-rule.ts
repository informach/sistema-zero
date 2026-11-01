import type { SectionObjectiveRule } from '@sistemazero/core/learning'
import { newExecutionRule } from './execution-rule'

/**
 * A regra nova de um objetivo de desafio, pelo tipo escolhido no editor. Fica no Admin (lacunas,
 * 01/11/2026): o editor de objetivos e as regras de execução também servem às aulas; o resto da
 * autoria dos desafios mora em `@sistemazero/arquipelago-admin`.
 */
export function challengeRule(type: string): SectionObjectiveRule {
  switch (type) {
    case 'behavior':
    case 'functionReturns':
    case 'script':
      return newExecutionRule(type, false, false)
    case 'usesLoop':
      return { type }
    case 'gameCausality':
      return { type, actor: 'guia', step: 'encounter' }
    case 'declaresVariable':
    case 'definesFunction':
    case 'callsFunction':
      return { type, name: '' }
    default:
      return { type: 'usesBlock', blockType: '' }
  }
}
