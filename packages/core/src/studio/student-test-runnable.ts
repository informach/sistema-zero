import {
  EXECUTION_LIMITS,
  executionRuleBudgetMs,
  type FunctionCase,
  isSectionExecutionRule,
} from '../learning/project-execution'
import type {
  StudentTestBehaviorRule,
  StudentTestFunctionRule,
  StudentTestRule,
  StudioStudentTest,
} from './student-tests'

/** O teste de função conferido: os casos com os valores no formato dos objetivos. */
export type RunnableStudentTestFunctionRule = Omit<StudentTestFunctionRule, 'cases'> & {
  cases: FunctionCase[]
}

/** A regra que passou pelo contrato inteiro (a que os executores rodam e julgam). */
export type RunnableStudentTestRule = StudentTestBehaviorRule | RunnableStudentTestFunctionRule

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
 * - Pro em JavaScript (o executor do servidor, o do Verificar projeto): o teste do jogo, com
 *   tecla e espera, conferindo o texto da página, as mensagens ou o estado de um kit (`game`); e o
 *   teste de uma função exportada de um arquivo de `src` (o `module` é obrigatório). As variáveis
 *   do jogo não: no Pro o leitor das variáveis não entra (`value` é só do clássico).
 */
export function isRunnableStudentTestRule(
  rule: StudentTestRule,
  language: 'javascript' | 'python' = 'javascript',
  kind: 'classic' | 'pro' = 'classic',
): rule is RunnableStudentTestRule {
  if (!isSectionExecutionRule(rule, 'final', language)) return false
  if (kind === 'pro') {
    if (language !== 'javascript') return false
    if (rule.type === 'functionReturns') return rule.module?.startsWith('src/') === true
    if (
      rule.steps.some((step) => step.action !== 'press' && step.action !== 'wait') ||
      !['text', 'console', 'game'].includes(rule.expect.target.kind)
    )
      return false
    return executionRuleBudgetMs(rule) <= EXECUTION_LIMITS.maxTotalWaitMs
  }
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
  kind: 'classic' | 'pro' = 'classic',
): boolean {
  return isRunnableStudentTestRule(test.rule, language, kind)
}

/**
 * Os testes do Pro em lotes que o executor do servidor roda num pedido só: até 8 testes e até
 * 40 s de espera somada (`EXECUTION_LIMITS.maxObjectives` e `maxSectionWaitMs`, os tetos dos
 * objetivos), na ordem da lista. O Estúdio manda um lote por pedido (a borda espera 160 s por
 * pedido) e o Members recusa o pedido que não cabe num lote.
 */
export function studentTestServerBatches<Test extends { rule: StudentTestRule }>(
  tests: readonly Test[],
): Test[][] {
  const out: Test[][] = []
  let current: Test[] = []
  let budget = 0
  for (const test of tests) {
    const cost = test.rule.type === 'behavior' ? executionRuleBudgetMs(test.rule) : 0
    if (
      current.length >= EXECUTION_LIMITS.maxObjectives ||
      (current.length > 0 && budget + cost > EXECUTION_LIMITS.maxSectionWaitMs)
    ) {
      out.push(current)
      current = []
      budget = 0
    }
    current.push(test)
    budget += cost
  }
  if (current.length) out.push(current)
  return out
}
