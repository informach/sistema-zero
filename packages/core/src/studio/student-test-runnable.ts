import {
  EXECUTION_LIMITS,
  executionRuleBudgetMs,
  isSectionExecutionRule,
} from '../learning/project-execution'
import type { StudentTestRule, StudioStudentTest } from './student-tests'

/**
 * O contrato inteiro de um teste da criança ("Meus testes"), conferido por quem o RODA antes de
 * rodar: a regra é um objetivo válido (cada passo, cada tecla, cada comparação, com os limites dos
 * objetivos) e as esperas somam até 15 segundos. Módulo à parte de `student-tests.ts` porque
 * importa o validador dos objetivos, que não cabe no pacote de abertura do Estúdio (a aba o baixa
 * sob demanda).
 *
 * Por linguagem, o que cada executor da aba sabe fazer:
 * - JavaScript (o palco escondido): o teste do jogo, com tecla, espera e clique no sprite de um
 *   grupo; confere a variável, a posição do sprite, o texto da página ou as mensagens.
 * - Python (a execução escondida): o teste do programa, com tecla e espera, conferindo a variável
 *   (ou a posição, `ator.x`) e as mensagens; e o teste de uma função. A tela do Python é um
 *   desenho, sem texto para ler, e o clique no sprite de um grupo é do Jogo 2D.
 */
export function isRunnableStudentTestRule(
  rule: StudentTestRule,
  language: 'javascript' | 'python' = 'javascript',
): boolean {
  if (!isSectionExecutionRule(rule, 'final', language)) return false
  if (rule.type === 'functionReturns') return language === 'python'
  if (
    language === 'python' &&
    (rule.steps.some((step) => step.action !== 'press' && step.action !== 'wait') ||
      (rule.expect.target.kind !== 'value' && rule.expect.target.kind !== 'console'))
  )
    return false
  return executionRuleBudgetMs(rule) <= EXECUTION_LIMITS.maxTotalWaitMs
}

export function isRunnableStudentTest(
  test: StudioStudentTest,
  language: 'javascript' | 'python' = 'javascript',
): boolean {
  return isRunnableStudentTestRule(test.rule, language)
}
