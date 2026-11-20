import {
  EXECUTION_LIMITS,
  executionRuleBudgetMs,
  isSectionExecutionRule,
} from '../learning/project-execution'
import type { StudentTestRule, StudioStudentTest } from './student-tests'

/**
 * O contrato inteiro de um teste da criança ("Meus testes"), conferido por quem o RODA antes de
 * rodar: a regra é um objetivo `behavior` válido (cada passo, cada tecla, cada comparação, com os
 * limites dos objetivos) e as esperas somam até 15 segundos. Módulo à parte de
 * `student-tests.ts` porque importa o validador dos objetivos, que não cabe no pacote de abertura
 * do Estúdio (a aba o baixa sob demanda).
 */
export function isRunnableStudentTestRule(rule: StudentTestRule): boolean {
  return (
    isSectionExecutionRule(rule, 'final', 'javascript') &&
    executionRuleBudgetMs(rule) <= EXECUTION_LIMITS.maxTotalWaitMs
  )
}

export function isRunnableStudentTest(test: StudioStudentTest): boolean {
  return isRunnableStudentTestRule(test.rule)
}
