import { z } from 'zod'
import type { ExecutionExpectation, ExecutionStep } from '../learning/project-execution'

/**
 * Os testes que a criança escreve no Estúdio, na aba "Meus testes" (proposta aprovada em
 * 20/11/2026, `docs/estudio-evolucao/paineis-proposta.md`). Mesmo formato e mesmo julgamento dos
 * objetivos das aulas (`learning/project-execution.ts`): uma regra `behavior` com os passos
 * (apertar ou segurar uma tecla, esperar, clicar num sprite) e uma conferência no fim, com os
 * mesmos limites (até 20 passos e 15 segundos de espera). Os testes ficam guardados no projeto
 * (`studentTests` do documento) e vão junto para a conta e para o arquivo baixado.
 *
 * Duas camadas, de propósito:
 * - AQUI, a forma que o documento guarda: a estrutura com tetos (tipo `behavior`, até 20 passos,
 *   nome e id, tamanho de cada teste). É o que o Members confere no envio e o Estúdio saneia na
 *   leitura. Este módulo entra no pacote de abertura do modo Blocos (o esquema do documento o
 *   importa), então NÃO importa o validador dos objetivos (só tipos).
 * - Em `student-test-runnable.ts`, o contrato inteiro dos objetivos (cada passo, cada tecla, os
 *   15 segundos), que quem RODA o teste confere antes, baixado sob demanda. Um teste que passa
 *   aqui e não lá aparece na aba como um teste que não pode rodar, em vez de sumir.
 *
 * Diferente de um objetivo de aula, o teste da criança só tem passos e a conferência do fim: sem
 * pontos intermediários nem a observação parado-e-anda (a aba não os oferece).
 *
 * No Python (tabela da proposta: "testar o programa e testar uma função"), o teste também pode ser
 * uma regra `functionReturns`: a função que a criança escreveu, chamada com os casos dela ("o que
 * ela recebe e o que ela tem de responder, um caso por linha"), no máximo 8 casos.
 */

/** Quantos testes um projeto guarda. */
export const STUDENT_TESTS_MAX = 20
/** O tamanho do nome de um teste. */
export const STUDENT_TEST_NAME_MAX = 60
/** Quantos passos um teste tem (o mesmo teto dos objetivos, `EXECUTION_LIMITS.maxSteps`). */
export const STUDENT_TEST_STEPS_MAX = 20
/**
 * O tamanho de um teste em JSON. Folgado para 20 passos com nomes de sprite e a conferência com
 * texto (um teste da aba fica bem abaixo); o teto existe para o documento não crescer sem fim.
 */
export const STUDENT_TEST_MAX_CHARS = 6_000

const STUDENT_TEST_ID = /^[A-Za-z0-9_-]{1,40}$/

/**
 * Quantos casos um teste de função tem: o mesmo teto dos objetivos (`EXECUTION_LIMITS.maxCases`,
 * que este módulo não importa; um teste do core confere que os dois andam juntos).
 */
export const STUDENT_TEST_CASES_MAX = 8

/** A regra de um teste do programa: só os passos e a conferência do fim. */
export interface StudentTestBehaviorRule {
  type: 'behavior'
  steps: ExecutionStep[]
  expect: ExecutionExpectation
}

/**
 * Um caso como o documento guarda. Os valores (JSON dentro dos tetos dos objetivos) são de
 * `student-test-runnable.ts`, que devolve o tipo exato (`FunctionCase`) a quem roda. ⚠️ O tipo do
 * documento não leva o JSON recursivo: o tipo do `page.evaluate` do Playwright não o percorre
 * (TS2589 nos testes que passam um projeto ao navegador, medido em 20/11/2026).
 */
export interface StudentTestCase {
  args: unknown[]
  expected: unknown
}

/** A regra de um teste de função: o nome da função e os casos (o que recebe, o que responde). */
export interface StudentTestFunctionRule {
  type: 'functionReturns'
  name: string
  /** O arquivo da função, quando não é o arquivo inicial. */
  module?: string
  cases: StudentTestCase[]
}

export type StudentTestRule = StudentTestBehaviorRule | StudentTestFunctionRule

export interface StudioStudentTest {
  id: string
  name: string
  rule: StudentTestRule
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** A forma que o documento guarda (a conferência inteira é de `student-test-runnable.ts`). */
export function isStudioStudentTest(value: unknown): value is StudioStudentTest {
  if (
    !record(value) ||
    !Object.keys(value).every((key) => key === 'id' || key === 'name' || key === 'rule') ||
    typeof value.id !== 'string' ||
    !STUDENT_TEST_ID.test(value.id) ||
    typeof value.name !== 'string' ||
    value.name.trim().length === 0 ||
    value.name.length > STUDENT_TEST_NAME_MAX
  )
    return false
  const rule = value.rule
  if (!record(rule)) return false
  const shaped =
    rule.type === 'behavior'
      ? Object.keys(rule).every((key) => key === 'type' || key === 'steps' || key === 'expect') &&
        Array.isArray(rule.steps) &&
        rule.steps.length <= STUDENT_TEST_STEPS_MAX &&
        rule.steps.every(record) &&
        record(rule.expect) &&
        record(rule.expect.target)
      : rule.type === 'functionReturns' &&
        Object.keys(rule).every(
          (key) => key === 'type' || key === 'name' || key === 'module' || key === 'cases',
        ) &&
        typeof rule.name === 'string' &&
        rule.name.length > 0 &&
        rule.name.length <= 100 &&
        (rule.module === undefined ||
          (typeof rule.module === 'string' &&
            rule.module.length > 0 &&
            rule.module.length <= 200)) &&
        Array.isArray(rule.cases) &&
        rule.cases.length > 0 &&
        rule.cases.length <= STUDENT_TEST_CASES_MAX &&
        rule.cases.every((item) => record(item) && Array.isArray(item.args))
  if (!shaped) return false
  let text: string
  try {
    text = JSON.stringify(value)
  } catch {
    return false
  }
  return text.length <= STUDENT_TEST_MAX_CHARS
}

/** A lista do documento: até 20 testes, cada um na forma, sem id repetido. */
export const StudioStudentTestsSchema = z
  .array(
    z.custom<StudioStudentTest>(isStudioStudentTest, {
      message: 'Teste com forma inválida.',
    }),
  )
  .max(STUDENT_TESTS_MAX)
  .superRefine((tests, context) => {
    const ids = new Set<string>()
    for (const [index, test] of tests.entries()) {
      if (ids.has(test.id))
        context.addIssue({ code: 'custom', path: [index, 'id'], message: 'Id de teste repetido.' })
      ids.add(test.id)
    }
  })

/**
 * A leitura tolerante (o Estúdio abrindo um projeto guardado): fica com os testes na forma, na
 * ordem, sem id repetido e até o teto; `undefined` quando não sobra nenhum (a chave some e o
 * projeto sem testes fica byte a byte igual ao de antes).
 */
export function sanitizeStudioStudentTests(raw: unknown): StudioStudentTest[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const ids = new Set<string>()
  const tests: StudioStudentTest[] = []
  for (const item of raw) {
    if (tests.length >= STUDENT_TESTS_MAX) break
    if (!isStudioStudentTest(item) || ids.has(item.id)) continue
    ids.add(item.id)
    tests.push(item)
  }
  return tests.length > 0 ? tests : undefined
}
