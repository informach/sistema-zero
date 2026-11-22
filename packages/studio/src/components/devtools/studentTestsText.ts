import {
  createExecutionObservationCodec,
  EXECUTION_COMPARES_WITHOUT_VALUE,
  EXECUTION_GAME_FIELDS,
  EXECUTION_KEYS,
  EXECUTION_LIMITS,
  type ExecutionCompare,
  type ExecutionExpectation,
  type ExecutionKey,
  type ExecutionObservedValue,
  type ExecutionStep,
  executionRuleBudgetMs,
} from '@sistemazero/core/learning'
import { isRunnableStudentTestRule } from '@sistemazero/core/studio/student-test-runnable'
import {
  isStudioStudentTest,
  STUDENT_TEST_CASES_MAX,
  STUDENT_TEST_NAME_MAX,
  STUDENT_TEST_STEPS_MAX,
  type StudentTestBehaviorRule,
  type StudentTestFunctionRule,
  type StudioStudentTest,
} from '@sistemazero/core/studio/student-tests'
import type { Translator } from '../../core/i18n/translator'
import type { StudentTestOutcome } from '../../studentTests/outcome'
import {
  type CasesProblem,
  casesLanguageOf,
  parsePythonCases,
  pythonCall,
  pythonCasesText,
  pythonLiteral,
} from './studentTestsPython'

/**
 * Como a aba Meus testes escreve cada teste e cada resultado (pranchas aprovadas em 20/11/2026):
 * "Quando eu apertar Enter e segurar → por 4 segundos. No fim, a posição x do heroi é no máximo
 * 296." e "Não passou: a posição x do heroi terminou em 412.". E o formulário: o que a criança
 * escolhe vira uma regra dos objetivos, conferida pelo contrato inteiro antes de salvar.
 */

const ARROWS: Partial<Record<ExecutionKey, string>> = {
  ArrowLeft: '←',
  ArrowUp: '↑',
  ArrowRight: '→',
  ArrowDown: '↓',
}

/** As teclas na ordem do formulário: as do jogo primeiro, depois letras e números. */
export const FORM_KEYS: readonly ExecutionKey[] = EXECUTION_KEYS

export function keyLabel(t: Translator, key: ExecutionKey): string {
  const arrow = ARROWS[key]
  if (arrow) return arrow
  if (key === 'Space' || key === 'Escape' || key === 'Shift' || key === 'Enter')
    return t(`tests.key.${key}`)
  return key.toUpperCase()
}

function numberText(t: Translator, value: number): string {
  return new Intl.NumberFormat(t.locale === 'en' ? 'en' : 'pt-BR', {
    maximumFractionDigits: 3,
  }).format(value)
}

function secondsText(t: Translator, ms: number): { seconds: string; unit: string } {
  const seconds = ms / 1000
  return {
    seconds: numberText(t, seconds),
    unit: t(seconds < 2 ? 'tests.second' : 'tests.seconds'),
  }
}

function stepText(t: Translator, step: ExecutionStep): string {
  if (step.action === 'wait') return t('tests.step.wait', secondsText(t, step.ms))
  if (step.action === 'clickTarget' && step.target.kind === 'sprite')
    return t('tests.step.click', { sprite: step.target.path })
  if (step.action === 'press')
    return step.holdMs === undefined
      ? t('tests.step.press', { key: keyLabel(t, step.key) })
      : t('tests.step.hold', { key: keyLabel(t, step.key), ...secondsText(t, step.holdMs) })
  return ''
}

function joinSteps(t: Translator, parts: string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} ${t('tests.and')} ${parts.at(-1)}`
}

/**
 * O que a conferência olha: a variável, a posição do sprite, o texto ou as mensagens; no Pro, o
 * estado de um kit (`game`: a fase, os pontos, a meta ou a vida, pelo `__studioGame.inspect`).
 */
export type CheckKind = 'value' | 'spriteX' | 'spriteY' | 'text' | 'console' | 'game'

/** A conferência do teste como o formulário a vê (a posição do sprite é `<sprite>.x` no contrato). */
export function checkOf(expect: ExecutionExpectation): { kind: CheckKind; name: string } {
  const target = expect.target
  if (target.kind === 'text') return { kind: 'text', name: '' }
  if (target.kind === 'console') return { kind: 'console', name: '' }
  if (target.kind === 'game') return { kind: 'game', name: target.field }
  if (target.kind === 'value') {
    const position = /^(.+)\.([xy])$/.exec(target.path)
    if (position?.[1])
      return { kind: position[2] === 'x' ? 'spriteX' : 'spriteY', name: position[1] }
    return { kind: 'value', name: target.path }
  }
  return { kind: 'value', name: '' }
}

function subjectText(t: Translator, expect: ExecutionExpectation): string {
  const { kind, name } = checkOf(expect)
  if (kind === 'value') return name
  if (kind === 'spriteX') return t('tests.subject.spriteX', { name })
  if (kind === 'spriteY') return t('tests.subject.spriteY', { name })
  if (kind === 'game') return t(`tests.subject.game.${name}`)
  return t(kind === 'text' ? 'tests.subject.text' : 'tests.subject.console')
}

const LONG_TEXT = 60

export function valueText(t: Translator, value: unknown): string {
  if (typeof value === 'number') return numberText(t, value)
  if (typeof value === 'boolean') return t(value ? 'tests.value.true' : 'tests.value.false')
  if (value === undefined || value === null) return t('tests.value.nothing')
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const short = text.length > LONG_TEXT ? `${text.slice(0, LONG_TEXT)}…` : text
  return `"${short.replace(/\s+/g, ' ')}"`
}

/** "dobro(2) responde 4; dobro(5) responde 10." (o teste de função do Python). */
function describeFunction(t: Translator, rule: StudentTestFunctionRule): string {
  const language = casesLanguageOf(rule)
  const cases = rule.cases.map((item) =>
    t('tests.function.case', {
      call: pythonCall(rule.name, item.args, language),
      expected: pythonLiteral(item.expected, language),
    }),
  )
  return t('tests.function.describe', { cases: cases.join('; ') })
}

/** A conferência do fim escrita por inteiro ("pontos aumentou", "o texto na tela tem "Oi""). */
function checkText(t: Translator, expect: ExecutionExpectation): string {
  const compare = t(`tests.compare.${expect.compare}`)
  return EXECUTION_COMPARES_WITHOUT_VALUE.includes(expect.compare)
    ? `${subjectText(t, expect)} ${compare}`
    : `${subjectText(t, expect)} ${compare} ${valueText(t, expect.value)}`
}

/** "Quando eu apertar Enter. No fim, pontos aumentou." */
export function describeTest(t: Translator, test: StudioStudentTest): string {
  if (test.rule.type === 'functionReturns') return describeFunction(t, test.rule)
  const { expect } = test.rule
  const check = checkText(t, expect)
  const steps = test.rule.steps.map((step) => stepText(t, step)).filter(Boolean)
  return steps.length
    ? t('tests.when', { steps: joinSteps(t, steps), check })
    : t('tests.whenNothing', { check })
}

const codec = createExecutionObservationCodec()

/** O valor lido no jogo, já decodificado; `null` quando a leitura não veio inteira. */
function decoded(observed: ExecutionObservedValue | undefined): { value: unknown } | null {
  if (!observed?.found) return null
  try {
    return { value: codec.decode(observed.value) }
  } catch {
    // O codificador marca o que não coube (grande ou fundo demais): a leitura não veio inteira.
    return null
  }
}

export interface OutcomeLine {
  tone: 'passed' | 'failed' | 'note'
  text: string
}

/** O resultado de um teste de função: os casos certos, ou o primeiro que não respondeu certo. */
function describeFunctionOutcome(
  t: Translator,
  rule: StudentTestFunctionRule,
  outcome: Extract<StudentTestOutcome, { status: 'passed' | 'failed' }>,
): OutcomeLine {
  if (outcome.status === 'passed') {
    const what =
      rule.cases.length === 1
        ? t('tests.what.functionRight.one')
        : t('tests.what.functionRight.many', { n: rule.cases.length })
    return { tone: 'passed', text: t('tests.passed', { what }) }
  }
  const failed = (what: string): OutcomeLine => ({
    tone: 'failed',
    text: t('tests.failed', { what }),
  })
  const { observation } = outcome
  if (observation.error) return failed(t('tests.what.unfinished', { error: observation.error }))
  if (observation.errors?.length) return failed(t('tests.what.gameError'))
  if (observation.missing) return failed(t('tests.what.functionMissing', { name: rule.name }))
  const language = casesLanguageOf(rule)
  for (const [index, item] of rule.cases.entries()) {
    const seen = observation.cases?.[index]
    const call = pythonCall(rule.name, item.args, language)
    if (!seen?.ok) return failed(t('tests.what.functionError', { call }))
    if (JSON.stringify(seen.value) !== JSON.stringify(item.expected))
      return failed(
        t('tests.what.functionWrong', { call, value: pythonLiteral(seen.value, language) }),
      )
  }
  return failed(outcome.detail)
}

/**
 * O resultado que veio do executor do servidor (o Pro): passou ou não, e o que ele viu. Passou: a
 * conferência por inteiro (ou "a função respondeu certo"); não passou: o que o executor viu,
 * numa frase só ("com (2) respondeu 7; esperava 10").
 */
function describeRemoteOutcome(
  t: Translator,
  test: StudioStudentTest,
  outcome: Extract<StudentTestOutcome, { status: 'remote' }>,
): OutcomeLine {
  const rule = test.rule
  if (outcome.passed) {
    const what =
      rule.type === 'functionReturns'
        ? rule.cases.length === 1
          ? t('tests.what.functionRight.one')
          : t('tests.what.functionRight.many', { n: rule.cases.length })
        : checkText(t, rule.expect)
    return { tone: 'passed', text: t('tests.passed', { what }) }
  }
  const seen = (outcome.detail ?? '').trim().replace(/\.$/, '')
  // O projeto que não compila: o executor do servidor responde que nada passou, com a saída do
  // Vite no recado (`studio-runtime/src/index.ts`, "O projeto não compilou: …"). A criança lê a
  // mesma frase do JavaScript clássico e do Python; o erro de escrita aparece no editor.
  const what = PRO_COMPILE_FAILED.test(seen)
    ? t('tests.what.gameError')
    : seen
      ? `${seen.charAt(0).toLowerCase()}${seen.slice(1)}`
      : t('tests.what.remoteFailed')
  return { tone: 'failed', text: t('tests.failed', { what }) }
}

/** O começo do recado do executor do servidor quando o projeto Pro não compila. */
const PRO_COMPILE_FAILED = /^O projeto não compilou\b/

/** A linha do resultado embaixo do teste ("Passou: …", "Não passou: …" ou um recado). */
export function describeOutcome(
  t: Translator,
  test: StudioStudentTest,
  outcome: StudentTestOutcome,
): OutcomeLine | null {
  if (outcome.status === 'cancelled') return null
  if (outcome.status === 'invalid') return { tone: 'note', text: t('tests.invalid') }
  if (outcome.status === 'unsupported') return { tone: 'note', text: t('tests.unsupported') }
  if (outcome.status === 'unavailable') return { tone: 'note', text: t('tests.unavailable') }
  if (outcome.status === 'unsaved') return { tone: 'note', text: t('tests.unsaved') }
  if (outcome.status === 'timeout')
    return { tone: 'failed', text: t('tests.failed', { what: t('tests.what.timeout') }) }
  if (outcome.status === 'remote') return describeRemoteOutcome(t, test, outcome)
  if (test.rule.type === 'functionReturns') return describeFunctionOutcome(t, test.rule, outcome)
  const { expect } = test.rule
  const subject = subjectText(t, expect)
  const expected = valueText(t, expect.value)
  const { observation } = outcome
  const initial = decoded(observation.initial)
  const final = decoded(observation.final)
  const shown = (value: { value: unknown } | null) => (value ? valueText(t, value.value) : '')
  const changing =
    expect.compare === 'changed' || expect.compare === 'increased' || expect.compare === 'decreased'
  if (outcome.status === 'passed') {
    const what = changing
      ? t('tests.what.wentFrom', { subject, initial: shown(initial), final: shown(final) })
      : expect.compare === 'truthy'
        ? t('tests.what.exists', { subject })
        : expect.compare === 'contains'
          ? t('tests.what.has', { subject, value: expected })
          : expect.compare === 'notContains'
            ? t('tests.what.hasNot', { subject, value: expected })
            : t('tests.what.stayed', { subject, final: shown(final) })
    return { tone: 'passed', text: t('tests.passed', { what }) }
  }
  const failed = (what: string): OutcomeLine => ({
    tone: 'failed',
    text: t('tests.failed', { what }),
  })
  if (observation.error) return failed(t('tests.what.unfinished', { error: observation.error }))
  if (observation.errors?.length) return failed(t('tests.what.gameError'))
  if (!observation.final?.found) {
    const { kind, name } = checkOf(expect)
    return failed(
      kind === 'value' || kind === 'spriteX' || kind === 'spriteY'
        ? t('tests.what.notFound', { name: name || subject })
        : t('tests.what.unreadable', { subject }),
    )
  }
  if (!final) return failed(t('tests.what.unreadable', { subject }))
  if (changing && initial)
    return failed(
      valueText(t, initial.value) === valueText(t, final.value)
        ? t('tests.what.stayedAt', { subject, final: shown(final) })
        : t('tests.what.wentFrom', { subject, initial: shown(initial), final: shown(final) }),
    )
  if (expect.compare === 'truthy') return failed(t('tests.what.missing', { subject }))
  if (expect.compare === 'contains')
    return failed(t('tests.what.hasNot', { subject, value: expected }))
  if (expect.compare === 'notContains')
    return failed(t('tests.what.has', { subject, value: expected }))
  return failed(t('tests.what.endedAt', { subject, final: shown(final) }))
}

/** As comparações que fazem sentido para cada conferência (o contrato aceita as doze). */
export function comparesFor(kind: CheckKind): ExecutionCompare[] {
  if (kind === 'text' || kind === 'console')
    return ['equals', 'notEquals', 'contains', 'notContains', 'changed', 'truthy']
  if (kind === 'game')
    return [
      'equals',
      'notEquals',
      'greaterThan',
      'lessThan',
      'atLeast',
      'atMost',
      'changed',
      'increased',
      'decreased',
    ]
  if (kind === 'spriteX' || kind === 'spriteY')
    return [
      'equals',
      'notEquals',
      'greaterThan',
      'lessThan',
      'atLeast',
      'atMost',
      'changed',
      'increased',
      'decreased',
    ]
  return [
    'equals',
    'notEquals',
    'greaterThan',
    'lessThan',
    'atLeast',
    'atMost',
    'contains',
    'notContains',
    'changed',
    'increased',
    'decreased',
    'truthy',
  ]
}

/** Um passo como o formulário o guarda (os segundos como a criança digitou). */
export type FormStep =
  | { kind: 'press'; key: ExecutionKey }
  | { kind: 'hold'; key: ExecutionKey; seconds: string }
  | { kind: 'wait'; seconds: string }
  /** Clicar no sprite de um grupo (o `clickTarget` do Jogo 2D). */
  | { kind: 'click'; sprite: string; group: string }

export interface TestForm {
  /** Testar o programa (passos e a conferência do fim) ou testar uma função (só no Python). */
  kind: 'behavior' | 'function'
  name: string
  steps: FormStep[]
  check: CheckKind
  subject: string
  compare: ExecutionCompare
  value: string
  /** A função do teste de função (`functionKey`: o nome, ou `arquivo.py:nome`). */
  fn: string
  /** Os casos, um por linha, como a criança escreveu (`2, 3 -> 5`). */
  cases: string
}

function secondsInput(t: Translator, ms: number): string {
  return numberText(t, ms / 1000).replace(/\s/g, '')
}

export function formFromTest(
  t: Translator,
  test: StudioStudentTest | null,
  /** O teste novo começa testando uma função (o Python sem biblioteca de jogo só testa função). */
  startWith: TestForm['kind'] = 'behavior',
): TestForm {
  const blank: TestForm = {
    kind: startWith,
    name: '',
    steps: [{ kind: 'press', key: 'Enter' }],
    check: 'value',
    subject: '',
    compare: 'equals',
    value: '',
    fn: '',
    cases: '',
  }
  if (!test) return blank
  if (test.rule.type === 'functionReturns')
    return {
      ...blank,
      kind: 'function',
      name: test.name,
      fn: test.rule.module ? `${test.rule.module}:${test.rule.name}` : test.rule.name,
      cases: pythonCasesText(test.rule.cases, casesLanguageOf(test.rule)),
    }
  const rule: StudentTestBehaviorRule = test.rule
  const { kind, name } = checkOf(rule.expect)
  const value = rule.expect.value
  return {
    ...blank,
    kind: 'behavior',
    name: test.name,
    steps: rule.steps.flatMap((step): FormStep[] => {
      if (step.action === 'wait') return [{ kind: 'wait', seconds: secondsInput(t, step.ms) }]
      if (step.action === 'clickTarget' && step.target.kind === 'sprite')
        return [{ kind: 'click', sprite: step.target.path, group: step.target.groupPath }]
      if (step.action === 'press')
        return [
          step.holdMs === undefined
            ? { kind: 'press', key: step.key }
            : { kind: 'hold', key: step.key, seconds: secondsInput(t, step.holdMs) },
        ]
      return []
    }),
    check: kind,
    subject: name,
    compare: rule.expect.compare,
    value:
      value === undefined
        ? ''
        : typeof value === 'boolean'
          ? t(value ? 'tests.value.true' : 'tests.value.false')
          : typeof value === 'number'
            ? numberText(t, value).replace(/\s/g, '')
            : value,
  }
}

/** O número que a criança digitou ("1,5" ou "1.5"); `null` quando não é número. */
export function parseNumberInput(text: string): number | null {
  const clean = text.trim().replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(clean)) return null
  return Number(clean)
}

/** O valor da conferência: número, verdadeiro ou falso, ou o texto como veio. */
export function parseValueInput(t: Translator, text: string): string | number | boolean {
  const number = parseNumberInput(text)
  if (number !== null) return number
  const lower = text.trim().toLocaleLowerCase(t.locale === 'en' ? 'en' : 'pt-BR')
  if (lower === t('tests.value.true')) return true
  if (lower === t('tests.value.false')) return false
  return text
}

/** As teclas do contrato (o `<select>` do formulário só oferece estas). */
export const isFormKey = (key: string): key is ExecutionKey =>
  EXECUTION_KEYS.some((item) => item === key)

/** Um id novo de teste (o formato do documento: letras, números, `-` e `_`, até 40). */
export function newTestId(taken: ReadonlySet<string>): string {
  for (;;) {
    const id = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    if (!taken.has(id)) return id
  }
}

export type FormProblem =
  | 'tests.form.needName'
  | 'tests.form.needSprite'
  | 'tests.form.needSubject'
  | 'tests.form.needValue'
  | 'tests.form.needFunction'
  | 'tests.form.tooLong'
  | 'tests.form.limits'
  | CasesProblem

/** O teste de função do formulário (no Python e no Pro em JavaScript). */
function functionTestFromForm(
  form: TestForm,
  id: string,
  name: string,
  language: 'javascript' | 'python',
  kind: 'classic' | 'pro',
): { test: StudioStudentTest } | { problem: FormProblem } {
  if (!form.fn) return { problem: 'tests.form.needFunction' }
  const parsed = parsePythonCases(form.cases, STUDENT_TEST_CASES_MAX, language)
  if ('problem' in parsed) return parsed
  const split = form.fn.lastIndexOf(':')
  const rule: StudentTestFunctionRule = {
    type: 'functionReturns',
    name: split < 0 ? form.fn : form.fn.slice(split + 1),
    ...(split < 0 ? {} : { module: form.fn.slice(0, split) }),
    cases: parsed.cases,
  }
  const test: StudioStudentTest = { id, name, rule }
  if (!isRunnableStudentTestRule(rule, language, kind) || !isStudioStudentTest(test))
    return { problem: 'tests.form.badCase' }
  return { test }
}

/** O formulário como teste, ou o primeiro problema que impede salvar. */
export function testFromForm(
  t: Translator,
  form: TestForm,
  id: string,
  language: 'javascript' | 'python' = 'javascript',
  kind: 'classic' | 'pro' = 'classic',
): { test: StudioStudentTest } | { problem: FormProblem } {
  const name = form.name.trim().slice(0, STUDENT_TEST_NAME_MAX)
  if (!name) return { problem: 'tests.form.needName' }
  if (form.kind === 'function' && (language === 'python' || kind === 'pro'))
    return functionTestFromForm(form, id, name, language, kind)
  const needsSubject = form.check !== 'text' && form.check !== 'console'
  if (needsSubject && !form.subject) return { problem: 'tests.form.needSubject' }
  const gameField = EXECUTION_GAME_FIELDS.find((field) => field === form.subject)
  if (form.check === 'game' && !gameField) return { problem: 'tests.form.needSubject' }
  const needsValue = !EXECUTION_COMPARES_WITHOUT_VALUE.includes(form.compare)
  if (needsValue && !form.value.trim()) return { problem: 'tests.form.needValue' }
  const steps: ExecutionStep[] = []
  for (const step of form.steps.slice(0, STUDENT_TEST_STEPS_MAX)) {
    if (step.kind === 'press') {
      steps.push({ action: 'press', key: step.key })
      continue
    }
    if (step.kind === 'click') {
      if (!step.sprite || !step.group) return { problem: 'tests.form.needSprite' }
      steps.push({
        action: 'clickTarget',
        target: { kind: 'sprite', path: step.sprite, groupPath: step.group },
      })
      continue
    }
    const seconds = parseNumberInput(step.seconds)
    if (seconds === null || seconds < 0) return { problem: 'tests.form.limits' }
    const ms = Math.round(seconds * 1000)
    steps.push(
      step.kind === 'hold'
        ? { action: 'press', key: step.key, holdMs: ms }
        : { action: 'wait', ms },
    )
  }
  const path =
    form.check === 'spriteX'
      ? `${form.subject}.x`
      : form.check === 'spriteY'
        ? `${form.subject}.y`
        : form.subject
  const rule: StudentTestBehaviorRule = {
    type: 'behavior',
    steps,
    expect: {
      target:
        form.check === 'text'
          ? { kind: 'text' }
          : form.check === 'console'
            ? { kind: 'console' }
            : form.check === 'game' && gameField
              ? { kind: 'game', field: gameField }
              : { kind: 'value', path },
      compare: form.compare,
      ...(needsValue ? { value: parseValueInput(t, form.value) } : {}),
    },
  }
  if (executionRuleBudgetMs(rule) > EXECUTION_LIMITS.maxTotalWaitMs)
    return { problem: 'tests.form.tooLong' }
  const test: StudioStudentTest = { id, name, rule }
  if (!isRunnableStudentTestRule(rule, language, kind) || !isStudioStudentTest(test))
    return { problem: 'tests.form.limits' }
  return { test }
}
