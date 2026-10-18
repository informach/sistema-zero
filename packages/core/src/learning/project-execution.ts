/**
 * Objetivos que RODAM o jogo (18/10/2026, etapa 3 dos objetivos do Estúdio): o servidor abre o
 * projeto num navegador isolado (o `studio-runtime`), faz o que a regra manda (esperar, apertar
 * tecla, clicar) e confere o resultado. A regra carrega a resposta esperada, então ela nunca sai
 * do members: a criança recebe só a vista do objetivo.
 *
 * Puro e sem framework: o mesmo validador serve ao members (publicação e DTO), ao Admin (editor)
 * e ao executor (que confere de novo antes de rodar).
 */

/** Teclas que um passo pode apertar, com o nome que o navegador de teste entende. */
export const EXECUTION_KEYS = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'Enter',
  'Escape',
  'Shift',
  ...'abcdefghijklmnopqrstuvwxyz'.split(''),
  ...'0123456789'.split(''),
] as const
export type ExecutionKey = (typeof EXECUTION_KEYS)[number]

export const EXECUTION_LIMITS = {
  /** Objetivos que rodam o jogo, por parte (cada um abre o jogo do zero). */
  maxObjectives: 8,
  maxSteps: 20,
  /** Espera de um passo e a soma das esperas de um objetivo. */
  maxWaitMs: 10_000,
  maxTotalWaitMs: 15_000,
  maxHoldMs: 5_000,
  /** Coordenada de clique, na tela do jogo. */
  maxCoordinate: 4_000,
  maxCases: 8,
  maxArgs: 6,
  /** Tamanho do JSON de um argumento ou de uma resposta esperada. */
  maxValueChars: 2_000,
  maxPathSegments: 4,
  maxTextChars: 200,
  maxScriptChars: 4_000,
} as const

export type ExecutionStep =
  | { action: 'wait'; ms: number }
  | { action: 'press'; key: ExecutionKey; holdMs?: number }
  | { action: 'click'; x: number; y: number }

/**
 * O que olhar no fim:
 * - `value`: uma variável ou uma propriedade dela (`pontos`, `heroi.x`), no jogo clássico;
 * - `text`: o texto que aparece na página;
 * - `console`: o que o jogo escreveu no console;
 * - `game`: o estado do kit Pro (`phase`, `score`, `health`).
 */
export type ExecutionTarget =
  | { kind: 'value'; path: string }
  | { kind: 'text' }
  | { kind: 'console' }
  | { kind: 'game'; field: 'phase' | 'score' | 'health' }

export const EXECUTION_COMPARES = [
  'equals',
  'notEquals',
  'greaterThan',
  'lessThan',
  'atLeast',
  'atMost',
  'contains',
  'notContains',
  'changed',
  'truthy',
] as const
export type ExecutionCompare = (typeof EXECUTION_COMPARES)[number]

/** Comparações que não usam valor: `changed` compara com o começo e `truthy` só pergunta "tem?". */
export const EXECUTION_COMPARES_WITHOUT_VALUE: readonly ExecutionCompare[] = ['changed', 'truthy']

export interface ExecutionExpectation {
  target: ExecutionTarget
  compare: ExecutionCompare
  value?: string | number | boolean
}

/** Um valor que vai e volta em JSON: argumento de função e resposta esperada. */
export type ExecutionJson =
  | null
  | boolean
  | number
  | string
  | ExecutionJson[]
  | { [key: string]: ExecutionJson }

export interface FunctionCase {
  args: ExecutionJson[]
  expected: ExecutionJson
}

export type SectionExecutionRule =
  | { type: 'behavior'; steps: ExecutionStep[]; expect: ExecutionExpectation }
  | {
      type: 'functionReturns'
      name: string
      /** No Pro, o arquivo que EXPORTA a função (`src/regras.ts`). No clássico, ausente. */
      module?: string
      cases: FunctionCase[]
    }
  /**
   * Regra em JavaScript (etapa 4): um corpo de função que a autora escreve, roda na página depois
   * dos passos e devolve verdadeiro para passar. Recebe `jogo` (as variáveis do jogo clássico, ou
   * os módulos exportados no Pro), `texto` (o texto da página) e `console` (as linhas escritas).
   */
  | { type: 'script'; steps: ExecutionStep[]; code: string }

export const EXECUTION_RULE_TYPES = ['behavior', 'functionReturns', 'script'] as const

export function isExecutionRuleType(type: unknown): type is SectionExecutionRule['type'] {
  return EXECUTION_RULE_TYPES.some((known) => known === type)
}

export function isExecutionRule(rule: { type: string }): rule is SectionExecutionRule {
  return isExecutionRuleType(rule.type)
}

const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/
/** `src/regras.ts`: caminho relativo de arquivo de código, sem subir pastas. */
const MODULE_PATH = /^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(?:m?js|jsx|ts|tsx)$/

export function isExecutionValuePath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length > 200) return false
  const parts = path.split('.')
  return (
    parts.length >= 1 &&
    parts.length <= EXECUTION_LIMITS.maxPathSegments &&
    parts.every((part) => IDENTIFIER.test(part))
  )
}

export function isExecutionModulePath(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    path.length <= 200 &&
    MODULE_PATH.test(path) &&
    !path.split('/').some((part) => part === '..' || part === '.' || part === 'node_modules')
  )
}

function jsonFits(value: unknown): value is ExecutionJson {
  let text: string
  try {
    text = JSON.stringify(value)
  } catch {
    return false
  }
  if (text === undefined || text.length > EXECUTION_LIMITS.maxValueChars) return false
  const stack: unknown[] = [value]
  while (stack.length) {
    const item = stack.pop()
    if (item === null || typeof item === 'boolean' || typeof item === 'string') continue
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) return false
      continue
    }
    if (Array.isArray(item)) {
      stack.push(...item)
      continue
    }
    if (!record(item)) return false
    stack.push(...Object.values(item))
  }
  return true
}

function isStep(step: unknown): step is ExecutionStep {
  if (!record(step)) return false
  switch (step.action) {
    case 'wait':
      return (
        Object.keys(step).length === 2 &&
        Number.isInteger(step.ms) &&
        Number(step.ms) >= 0 &&
        Number(step.ms) <= EXECUTION_LIMITS.maxWaitMs
      )
    case 'press':
      return (
        EXECUTION_KEYS.some((key) => key === step.key) &&
        (step.holdMs === undefined ||
          (Number.isInteger(step.holdMs) &&
            Number(step.holdMs) >= 0 &&
            Number(step.holdMs) <= EXECUTION_LIMITS.maxHoldMs)) &&
        Object.keys(step).every((key) => ['action', 'key', 'holdMs'].includes(key))
      )
    case 'click':
      return (
        Object.keys(step).length === 3 &&
        [step.x, step.y].every(
          (n) =>
            typeof n === 'number' &&
            Number.isFinite(n) &&
            n >= 0 &&
            n <= EXECUTION_LIMITS.maxCoordinate,
        )
      )
    default:
      return false
  }
}

function areSteps(steps: unknown): steps is ExecutionStep[] {
  if (!Array.isArray(steps) || steps.length > EXECUTION_LIMITS.maxSteps || !steps.every(isStep))
    return false
  const waited = steps.reduce(
    (sum: number, step: ExecutionStep) =>
      sum + (step.action === 'wait' ? step.ms : step.action === 'press' ? (step.holdMs ?? 0) : 0),
    0,
  )
  return waited <= EXECUTION_LIMITS.maxTotalWaitMs
}

function isTarget(target: unknown): target is ExecutionTarget {
  if (!record(target)) return false
  switch (target.kind) {
    case 'value':
      return isExecutionValuePath(target.path) && Object.keys(target).length === 2
    case 'text':
    case 'console':
      return Object.keys(target).length === 1
    case 'game':
      return (
        ['phase', 'score', 'health'].includes(String(target.field)) &&
        Object.keys(target).length === 2
      )
    default:
      return false
  }
}

function isExpectation(expect: unknown): expect is ExecutionExpectation {
  if (!record(expect) || !isTarget(expect.target)) return false
  if (!EXECUTION_COMPARES.some((compare) => compare === expect.compare)) return false
  const compare = expect.compare as ExecutionCompare
  if (EXECUTION_COMPARES_WITHOUT_VALUE.includes(compare)) return expect.value === undefined
  const value = expect.value
  const fits =
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' && value.length <= EXECUTION_LIMITS.maxTextChars)
  if (!fits) return false
  // Maior/menor só fazem sentido com número; "contém" só com texto.
  if (['greaterThan', 'lessThan', 'atLeast', 'atMost'].includes(compare))
    return typeof value === 'number'
  if (compare === 'contains' || compare === 'notContains')
    return typeof value === 'string' && value.length > 0
  return true
}

/** A forma de uma regra de execução. Onde ela vale (Pro ou clássico) é da autoria do Estúdio. */
export function isSectionExecutionRule(rule: unknown): rule is SectionExecutionRule {
  if (!record(rule)) return false
  switch (rule.type) {
    case 'behavior':
      return (
        Object.keys(rule).every((key) => ['type', 'steps', 'expect'].includes(key)) &&
        areSteps(rule.steps) &&
        isExpectation(rule.expect)
      )
    case 'functionReturns':
      return (
        Object.keys(rule).every((key) => ['type', 'name', 'module', 'cases'].includes(key)) &&
        typeof rule.name === 'string' &&
        IDENTIFIER.test(rule.name) &&
        rule.name.length <= 100 &&
        (rule.module === undefined || isExecutionModulePath(rule.module)) &&
        Array.isArray(rule.cases) &&
        rule.cases.length >= 1 &&
        rule.cases.length <= EXECUTION_LIMITS.maxCases &&
        rule.cases.every(
          (item) =>
            record(item) &&
            Object.keys(item).every((key) => key === 'args' || key === 'expected') &&
            Array.isArray(item.args) &&
            item.args.length <= EXECUTION_LIMITS.maxArgs &&
            item.args.every(jsonFits) &&
            Object.hasOwn(item, 'expected') &&
            jsonFits(item.expected),
        )
      )
    case 'script':
      return (
        Object.keys(rule).every((key) => ['type', 'steps', 'code'].includes(key)) &&
        areSteps(rule.steps) &&
        typeof rule.code === 'string' &&
        rule.code.trim().length > 0 &&
        rule.code.length <= EXECUTION_LIMITS.maxScriptChars
      )
    default:
      return false
  }
}

/** O resultado de um objetivo de execução, como o executor devolve. */
export interface ExecutionObjectiveResult {
  id: string
  passed: boolean
  /** Para a equipe: o que o teste viu (nunca vai à criança). */
  detail?: string
}

/** Igualdade de valores do teste: JSON com número tolerante a arredondamento de ponto flutuante. */
export function executionValuesEqual(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number')
    return a === b || Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, index) => executionValuesEqual(item, b[index]))
  }
  if (record(a) && record(b)) {
    const keys = Object.keys(a)
    if (keys.length !== Object.keys(b).length) return false
    return keys.every((key) => Object.hasOwn(b, key) && executionValuesEqual(a[key], b[key]))
  }
  return a === b
}

/** A comparação do fim de um objetivo "O jogo faz algo", igual no executor e nos testes. */
export function compareExecutionValue(
  actual: unknown,
  compare: ExecutionCompare,
  expected: string | number | boolean | undefined,
  initial?: unknown,
): boolean {
  switch (compare) {
    case 'truthy':
      return Boolean(actual) && !(Array.isArray(actual) && actual.length === 0)
    case 'changed':
      return !executionValuesEqual(actual, initial)
    case 'equals':
      return executionValuesEqual(
        typeof expected === 'number' && typeof actual === 'string' && actual.trim() !== ''
          ? Number(actual)
          : actual,
        expected,
      )
    case 'notEquals':
      return !compareExecutionValue(actual, 'equals', expected)
    case 'contains':
    case 'notContains': {
      const text =
        typeof actual === 'string'
          ? actual
          : actual === undefined || actual === null
            ? ''
            : JSON.stringify(actual)
      const has = text
        .toLocaleLowerCase('pt-BR')
        .includes(String(expected).toLocaleLowerCase('pt-BR'))
      return compare === 'contains' ? has : !has
    }
    default: {
      const value = typeof actual === 'string' && actual.trim() !== '' ? Number(actual) : actual
      if (typeof value !== 'number' || !Number.isFinite(value) || typeof expected !== 'number')
        return false
      if (compare === 'greaterThan') return value > expected
      if (compare === 'lessThan') return value < expected
      if (compare === 'atLeast') return value >= expected
      return value <= expected
    }
  }
}

/** Um objetivo como viaja até o executor: só o id e a regra (o rótulo e a dica ficam no members). */
export interface ExecutionObjectiveRequest {
  id: string
  rule: SectionExecutionRule
}

export function isExecutionObjectiveList(value: unknown): value is ExecutionObjectiveRequest[] {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= EXECUTION_LIMITS.maxObjectives &&
    new Set(value.map((item) => (record(item) ? item.id : null))).size === value.length &&
    value.every(
      (item) =>
        record(item) &&
        Object.keys(item).every((key) => key === 'id' || key === 'rule') &&
        typeof item.id === 'string' &&
        item.id.length >= 1 &&
        item.id.length <= 100 &&
        isSectionExecutionRule(item.rule),
    )
  )
}

/** O que o executor VIU num objetivo (o navegador relata; quem julga é `judgeExecutionObservation`). */
export interface ExecutionObservedValue {
  found: boolean
  value?: unknown
  error?: string
}

export interface ExecutionObservation {
  id: string
  type: SectionExecutionRule['type']
  initial?: ExecutionObservedValue
  final?: ExecutionObservedValue
  /** `functionReturns`: a função não existe (ou não é função). */
  missing?: boolean
  cases?: { ok: boolean; value?: unknown; error?: string }[]
  /** `script`: o que a regra devolveu (etapa 4). */
  verdict?: boolean
  /** Exceções do jogo durante o teste (para a equipe). */
  errors?: string[]
  /** O teste em si não terminou (página não abriu, tempo esgotado). */
  error?: string
}

const shortJson = (value: unknown) => {
  if (record(value) && value.$sz === 'undefined') return 'nada (undefined)'
  let text: string
  try {
    text = JSON.stringify(value) ?? 'nada'
  } catch {
    text = String(value)
  }
  return text.length > 80 ? `${text.slice(0, 77)}...` : text
}

const COMPARE_WORDS: Record<ExecutionCompare, string> = {
  equals: 'igual a',
  notEquals: 'diferente de',
  greaterThan: 'maior que',
  lessThan: 'menor que',
  atLeast: 'pelo menos',
  atMost: 'no máximo',
  contains: 'contendo',
  notContains: 'sem',
  changed: 'que mudasse',
  truthy: 'que existisse',
}

function targetName(target: ExecutionTarget): string {
  switch (target.kind) {
    case 'value':
      return target.path
    case 'text':
      return 'o texto da página'
    case 'console':
      return 'o console'
    case 'game':
      return `o ${target.field} do jogo`
  }
}

/**
 * A régua de cada objetivo de execução a partir do que o executor viu. Pura e no core para o
 * Worker e os testes julgarem do mesmo jeito. O `detail` é para a EQUIPE (o "Testar agora" do
 * Admin): a criança recebe só passou ou não.
 */
export function judgeExecutionObservation(
  rule: SectionExecutionRule,
  observation: ExecutionObservation | undefined,
): { passed: boolean; detail?: string } {
  if (!observation) return { passed: false, detail: 'O teste não relatou este objetivo.' }
  if (observation.error)
    return { passed: false, detail: `O teste não terminou: ${observation.error}` }
  if (rule.type === 'functionReturns') {
    if (observation.missing)
      return {
        passed: false,
        detail: `Não achei a função ${rule.name}${rule.module ? ` exportada em ${rule.module}` : ''}.`,
      }
    const cases = observation.cases ?? []
    for (const [index, item] of rule.cases.entries()) {
      const outcome = cases[index]
      const args = item.args.map(shortJson).join(', ')
      if (!outcome?.ok)
        return {
          passed: false,
          detail: `Com (${args}) a função deu erro: ${outcome?.error ?? 'sem resposta'}.`,
        }
      if (!executionValuesEqual(outcome.value, item.expected))
        return {
          passed: false,
          detail: `Com (${args}) respondeu ${shortJson(outcome.value)}; esperava ${shortJson(item.expected)}.`,
        }
    }
    return { passed: true }
  }
  if (rule.type === 'script') {
    return observation.verdict === true
      ? { passed: true }
      : { passed: false, detail: 'A regra em JavaScript não devolveu verdadeiro.' }
  }
  const { target, compare, value } = rule.expect
  const final = observation.final
  if (!final?.found)
    return {
      passed: false,
      detail:
        target.kind === 'value'
          ? `Não achei ${target.path} no jogo.`
          : target.kind === 'game'
            ? 'Este jogo não tem o estado do kit Pro.'
            : `Não consegui ler ${targetName(target)}.`,
    }
  const passed = compareExecutionValue(final.value, compare, value, observation.initial?.value)
  return passed
    ? { passed: true }
    : {
        passed: false,
        detail: `Esperava ${targetName(target)} ${COMPARE_WORDS[compare]}${
          EXECUTION_COMPARES_WITHOUT_VALUE.includes(compare) ? '' : ` ${shortJson(value)}`
        }; o jogo mostrou ${shortJson(final.value)}.`,
      }
}

/** A resposta do `POST /v1/check` do `studio-runtime`. */
export type ProjectCheckResponse =
  | {
      ok: true
      results: ExecutionObjectiveResult[]
      /** Captura da tela final por objetivo (JPEG em base64), para a equipe. */
      screenshots?: Record<string, string>
    }
  | {
      ok: false
      code: 'INVALID_REQUEST' | 'BUILD_FAILED' | 'RATE_LIMITED' | 'CHECK_FAILED'
      message: string
      output?: string
    }
