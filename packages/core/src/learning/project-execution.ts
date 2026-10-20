import {
  createExecutionObservationCodec,
  isEncodedExecutionObservation,
} from './execution-observation'

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
  /**
   * A soma das esperas (e do tempo das funções) de TODOS os objetivos que rodam o jogo numa
   * parte: eles rodam no mesmo pedido, que tem prazo. Sem o teto, uma parte válida objetivo a
   * objetivo estourava o prazo em toda verificação (review da etapa 3).
   */
  maxSectionWaitMs: 40_000,
  maxHoldMs: 5_000,
  maxIdleBaselineMs: 250,
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
  | { action: 'clickTarget'; target: ExecutionClickTarget }

/** Um gesto no palco atual, nunca uma posição ou aparência da solução da professora. */
export type ExecutionClickTarget =
  | { kind: 'sprite'; path: string; groupPath: string }
  | { kind: 'outsideGroup'; path: string }
  | { kind: 'lastPoint' }

/**
 * O que olhar no fim:
 * - `value`: uma variável ou uma propriedade dela (`pontos`, `heroi.x`), no jogo clássico;
 * - `text`: o texto que aparece na página;
 * - `console`: o que o jogo escreveu no console;
 * - `game`: o estado do kit Pro (`phase`, `score`, `goal` = a meta do `src/config.ts`, `health`).
 */
export type ExecutionTarget =
  | { kind: 'value'; path: string }
  | { kind: 'spritePosition'; path: string; axis: 'x' | 'y' }
  | { kind: 'text' }
  | { kind: 'console' }
  | { kind: 'game'; field: ExecutionGameField }

/** O que o estado de um kit Pro (`window.__studioGame.inspect()`) mostra para conferir. */
export const EXECUTION_GAME_FIELDS = ['phase', 'score', 'goal', 'health'] as const
export type ExecutionGameField = (typeof EXECUTION_GAME_FIELDS)[number]

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
  'increased',
  'decreased',
  'truthy',
] as const
export type ExecutionCompare = (typeof EXECUTION_COMPARES)[number]

/** Comparações que não usam valor: `changed` compara com o começo e `truthy` só pergunta "tem?". */
export const EXECUTION_COMPARES_WITHOUT_VALUE: readonly ExecutionCompare[] = [
  'changed',
  'truthy',
  'increased',
  'decreased',
]

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
  | {
      type: 'behavior'
      steps: ExecutionStep[]
      expect: ExecutionExpectation
      observation?: { type: 'idleBeforeAction'; idleMs: number }
    }
  | {
      type: 'functionReturns'
      name: string
      /** No Pro, o arquivo que EXPORTA a função (`src/regras.ts`). No clássico, ausente. */
      module?: string
      cases: FunctionCase[]
    }
  /**
   * Regra em JavaScript (etapa 4): o CORPO de uma função que a autora escreve, roda na página
   * depois dos passos e devolve `true` para passar (pode usar `await`). Recebe `jogo` (as
   * variáveis do jogo clássico, ou o estado do kit no Pro: `jogo.score`, `jogo.phase`),
   * `texto` (o texto da página) e `console` (a lista das linhas que o jogo escreveu).
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

export function isExecutionJson(value: unknown): value is ExecutionJson {
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

export type ExecutionStepValidationContext = 'draft' | 'final'

/** Draft permits only unfinished adaptive-path text; execution is always final. */
export function isExecutionStep(
  step: unknown,
  context: ExecutionStepValidationContext = 'final',
): step is ExecutionStep {
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
    case 'clickTarget': {
      if (Object.keys(step).length !== 2 || !record(step.target)) return false
      const target = step.target
      const safePath = (path: unknown) =>
        context === 'draft'
          ? typeof path === 'string' && path.length <= 200
          : isExecutionValuePath(path) &&
            !path
              .split('.')
              .some((part) => ['__proto__', 'constructor', 'prototype'].includes(part))
      if (target.kind === 'lastPoint') return Object.keys(target).length === 1
      if (target.kind === 'outsideGroup')
        return Object.keys(target).length === 2 && safePath(target.path)
      return (
        target.kind === 'sprite' &&
        Object.keys(target).length === 3 &&
        safePath(target.path) &&
        safePath(target.groupPath)
      )
    }
    default:
      return false
  }
}

/** Quanto tempo do prazo um objetivo de execução pode gastar (esperas, teclas e casos). */
export function executionRuleBudgetMs(rule: SectionExecutionRule): number {
  if (rule.type === 'functionReturns') return rule.cases.length * FUNCTION_CASE_BUDGET_MS
  return (
    (rule.type === 'script' ? SCRIPT_BUDGET_MS : 0) +
    (rule.type === 'behavior' ? (rule.observation?.idleMs ?? 0) : 0) +
    rule.steps.reduce(
      (sum, step) =>
        sum +
        (step.action === 'wait' ? step.ms : step.action === 'press' ? (step.holdMs ?? 80) : 0),
      0,
    )
  )
}
/** O tempo máximo que o executor dá a cada caso de função e a cada regra em JavaScript. */
const FUNCTION_CASE_BUDGET_MS = 2_000
const SCRIPT_BUDGET_MS = 3_000

function areSteps(steps: unknown): steps is ExecutionStep[] {
  if (
    !Array.isArray(steps) ||
    steps.length > EXECUTION_LIMITS.maxSteps ||
    !steps.every((step) => isExecutionStep(step, 'final'))
  )
    return false
  // Um clique absoluto não identifica um alvo nem admite uma repetição adaptativa.
  let hasPoint = false
  for (const step of steps) {
    if (step.action !== 'clickTarget') continue
    if (step.target.kind === 'lastPoint' && !hasPoint) return false
    hasPoint = true
  }
  const waited = steps.reduce(
    (sum: number, step: ExecutionStep) =>
      sum + (step.action === 'wait' ? step.ms : step.action === 'press' ? (step.holdMs ?? 0) : 0),
    0,
  )
  return waited <= EXECUTION_LIMITS.maxTotalWaitMs
}

function isTarget(
  target: unknown,
  context: ExecutionStepValidationContext,
): target is ExecutionTarget {
  if (!record(target)) return false
  switch (target.kind) {
    case 'spritePosition':
      return (
        Object.keys(target).length === 3 &&
        (context === 'draft'
          ? typeof target.path === 'string' && target.path.length <= 200
          : isExecutionValuePath(target.path) &&
            !target.path
              .split('.')
              .some((part) => ['__proto__', 'prototype', 'constructor'].includes(part))) &&
        (target.axis === 'x' || target.axis === 'y')
      )
    case 'value':
      return isExecutionValuePath(target.path) && Object.keys(target).length === 2
    case 'text':
    case 'console':
      return Object.keys(target).length === 1
    case 'game':
      return (
        EXECUTION_GAME_FIELDS.some((field) => field === target.field) &&
        Object.keys(target).length === 2
      )
    default:
      return false
  }
}

function isExpectation(
  expect: unknown,
  context: ExecutionStepValidationContext,
): expect is ExecutionExpectation {
  if (!record(expect) || !isTarget(expect.target, context)) return false
  if (
    expect.target.kind === 'spritePosition' &&
    Object.keys(expect).some((key) => !['target', 'compare', 'value'].includes(key))
  )
    return false
  if (!EXECUTION_COMPARES.some((compare) => compare === expect.compare)) return false
  const compare = expect.compare as ExecutionCompare
  if (
    (compare === 'increased' || compare === 'decreased') &&
    (expect.target.kind === 'text' ||
      expect.target.kind === 'console' ||
      (expect.target.kind === 'game' && expect.target.field === 'phase'))
  )
    return false
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
export function isSectionExecutionRule(
  rule: unknown,
  context: ExecutionStepValidationContext = 'final',
): rule is SectionExecutionRule {
  if (!record(rule)) return false
  switch (rule.type) {
    case 'behavior':
      return (
        Object.keys(rule).every((key) =>
          ['type', 'steps', 'expect', 'observation'].includes(key),
        ) &&
        areSteps(rule.steps) &&
        isExpectation(rule.expect, context) &&
        (rule.observation === undefined
          ? rule.expect.target.kind !== 'spritePosition'
          : record(rule.observation) &&
            Object.keys(rule.observation).length === 2 &&
            rule.observation.type === 'idleBeforeAction' &&
            typeof rule.observation.idleMs === 'number' &&
            Number.isInteger(rule.observation.idleMs) &&
            rule.observation.idleMs > 0 &&
            rule.observation.idleMs <= EXECUTION_LIMITS.maxIdleBaselineMs &&
            rule.expect.target.kind === 'spritePosition' &&
            ['increased', 'decreased'].includes(rule.expect.compare) &&
            rule.steps.length === 1 &&
            rule.steps[0]?.action === 'press' &&
            (rule.steps[0].holdMs ?? 80) > 0)
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
            item.args.every(isExecutionJson) &&
            Object.hasOwn(item, 'expected') &&
            isExecutionJson(item.expected),
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
    return (
      a === b ||
      (Number.isFinite(a) &&
        Number.isFinite(b) &&
        Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)))
    )
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

/**
 * O navegador não manda `undefined`, `NaN` nem função pelo JSON: ele manda um marcador
 * (`{ $sz: 'undefined' }`). Antes de comparar, o marcador volta ao valor que ele representa; os
 * que querem dizer "não deu para ler direito" (grande demais, fundo demais, deu erro) tornam a
 * leitura INCONCLUSIVA, e leitura inconclusiva nunca aprova (nem "é diferente de", nem "não
 * contém": um texto cortado não prova que a palavra não está lá). Achado do review da etapa 3.
 */
const INCONCLUSIVE = new Set(['large', 'deep', 'error'])
const observationCodec = createExecutionObservationCodec()
const marker = (value: unknown): string | null =>
  record(value) && typeof value.$sz === 'string' && Object.keys(value).length === 1
    ? value.$sz
    : null

export function isInconclusiveObservedValue(value: unknown): boolean {
  if (isEncodedExecutionObservation(value)) {
    try {
      observationCodec.decode(value)
      return false
    } catch {
      return true
    }
  }
  const mark = marker(value)
  if (mark !== null && INCONCLUSIVE.has(mark)) return true
  return Array.isArray(value)
    ? value.some(isInconclusiveObservedValue)
    : record(value)
      ? Object.values(value).some(isInconclusiveObservedValue)
      : false
}

function fromObserved(value: unknown): unknown {
  if (isEncodedExecutionObservation(value)) return observationCodec.decode(value)
  const mark = marker(value)
  if (mark === null) return value
  if (mark === 'undefined') return undefined
  if (mark === 'NaN' || mark === 'Infinity' || mark === '-Infinity') return Number(mark)
  if (mark === 'function') return () => undefined
  return value
}

/** A comparação do fim de um objetivo "O jogo faz algo", igual no executor e nos testes. */
export function compareExecutionValue(
  observed: unknown,
  compare: ExecutionCompare,
  expected: string | number | boolean | undefined,
  observedInitial?: unknown,
): boolean {
  if (isInconclusiveObservedValue(observed)) return false
  if (
    (compare === 'changed' || compare === 'increased' || compare === 'decreased') &&
    isInconclusiveObservedValue(observedInitial)
  )
    return false
  const actual = fromObserved(observed)
  const initial = fromObserved(observedInitial)
  switch (compare) {
    case 'increased':
    case 'decreased':
      return (
        typeof actual === 'number' &&
        Number.isFinite(actual) &&
        typeof initial === 'number' &&
        Number.isFinite(initial) &&
        (compare === 'increased' ? actual > initial : actual < initial)
      )
    case 'truthy':
      return Boolean(actual) && !(Array.isArray(actual) && actual.length === 0)
    case 'changed':
      if (typeof actual === 'function' || typeof initial === 'function') return false
      return !executionValuesEqual(actual, initial)
    case 'equals':
      return executionValuesEqual(
        typeof expected === 'number' && typeof actual === 'string' && actual.trim() !== ''
          ? Number(actual)
          : actual,
        expected,
      )
    case 'notEquals':
      return !executionValuesEqual(
        typeof expected === 'number' && typeof actual === 'string' && actual.trim() !== ''
          ? Number(actual)
          : actual,
        expected,
      )
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
    ) &&
    value.reduce(
      (sum: number, item) => sum + executionRuleBudgetMs((item as ExecutionObjectiveRequest).rule),
      0,
    ) <= EXECUTION_LIMITS.maxSectionWaitMs
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
  motion?: {
    baselineInitial: ExecutionMotionSample
    baselineFinal: ExecutionMotionSample
    actionInitial: ExecutionMotionSample
    actionFinal: ExecutionMotionSample
  }
  /** `functionReturns`: a função não existe (ou não é função). */
  missing?: boolean
  cases?: { ok: boolean; value?: unknown; error?: string }[]
  /** `script`: a regra devolveu `true` (etapa 4). */
  verdict?: boolean
  /** `script`: o que ela devolveu, em poucas letras (`false`, `3`, `nada`, `object`). */
  returned?: string
  /** `script`: a regra deu erro (escrita, variável que não existe, tempo esgotado). */
  scriptError?: string
  /** Exceções do jogo durante o teste (para a equipe). */
  errors?: string[]
  /** O teste em si não terminou (página não abriu, tempo esgotado). */
  error?: string
}

/** Primitive copies from the official motor, never authored callbacks or accessors. */
export interface ExecutionMotionSample {
  x: number
  y: number
  frame: number
  generation: number
  errors: number
  paused: boolean
}

function isMotionSample(value: unknown): value is ExecutionMotionSample {
  if (!record(value) || Object.keys(value).length !== 6) return false
  return (
    typeof value.x === 'number' &&
    Number.isFinite(value.x) &&
    typeof value.y === 'number' &&
    Number.isFinite(value.y) &&
    ['frame', 'generation', 'errors'].every(
      (key) =>
        typeof value[key] === 'number' && Number.isSafeInteger(value[key]) && value[key] >= 0,
    ) &&
    typeof value.paused === 'boolean'
  )
}

/** Falha de observação não é uma resposta falsa do programa e não pode virar progresso salvo. */
export function executionObservationUnavailableReason(
  rule: SectionExecutionRule,
  observation: ExecutionObservation | undefined,
): string | undefined {
  if (!observation || observation.type !== rule.type) return 'O teste não relatou este objetivo.'
  if (observation.error) return observation.error
  if (rule.type !== 'behavior') return undefined
  if (rule.expect.compare === 'increased' || rule.expect.compare === 'decreased') {
    for (const value of [observation.initial, observation.final])
      if (
        !value?.found ||
        value.error ||
        isInconclusiveObservedValue(value.value) ||
        typeof fromObserved(value.value) !== 'number' ||
        !Number.isFinite(fromObserved(value.value))
      )
        return 'Não foi possível observar a coordenada inteira.'
    if (observation.errors?.length) return 'O jogo relatou erro durante a observação.'
  }
  if (rule.observation) {
    const motion = observation.motion
    if (!motion) return 'O teste não relatou o controle sem tecla.'
    const samples = [
      motion.baselineInitial,
      motion.baselineFinal,
      motion.actionInitial,
      motion.actionFinal,
    ]
    if (!samples.every(isMotionSample)) return 'A observação do motor está incompleta.'
    if (
      samples.some(
        (sample) =>
          sample.paused ||
          sample.errors !== 0 ||
          sample.generation !== motion.baselineInitial.generation,
      )
    )
      return 'O motor pausou, reiniciou ou relatou erro.'
    if (
      motion.baselineFinal.frame <= motion.baselineInitial.frame ||
      motion.actionInitial.frame < motion.baselineFinal.frame ||
      motion.actionFinal.frame <= motion.actionInitial.frame
    )
      return 'O motor não avançou durante a observação.'
    if (
      rule.expect.target.kind !== 'spritePosition' ||
      fromObserved(observation.initial?.value) !== motion.actionInitial[rule.expect.target.axis] ||
      fromObserved(observation.final?.value) !== motion.actionFinal[rule.expect.target.axis]
    )
      return 'A coordenada não corresponde à observação do motor.'
  }
  const final = observation.final
  if (!final || final.error || (final.found && isInconclusiveObservedValue(final.value)))
    return final?.error || 'Não foi possível observar o resultado inteiro.'
  if (rule.expect.compare === 'changed') {
    const initial = observation.initial
    if (!initial || initial.error || (initial.found && isInconclusiveObservedValue(initial.value)))
      return initial?.error || 'Não foi possível observar o início inteiro.'
  }
  return undefined
}

const shortJson = (value: unknown) => {
  const encoded = isEncodedExecutionObservation(value)
  if (encoded) {
    try {
      value = observationCodec.decode(value)
    } catch {
      return 'leitura inconclusiva'
    }
  }
  if (value === undefined || (!encoded && record(value) && value.$sz === 'undefined'))
    return 'nada (undefined)'
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
  increased: 'que aumentasse',
  decreased: 'que diminuísse',
  truthy: 'que existisse',
}

function targetName(target: ExecutionTarget): string {
  switch (target.kind) {
    case 'value':
      return target.path
    case 'spritePosition':
      return `${target.path}.${target.axis}`
    case 'text':
      return 'o texto da página'
    case 'console':
      return 'o console'
    case 'game':
      return (
        { phase: 'a fase', score: 'os pontos', goal: 'a meta', health: 'a vida' }[target.field] +
        ' do jogo'
      )
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
      if (isInconclusiveObservedValue(outcome.value))
        return { passed: false, detail: 'Não consegui ler a resposta inteira da função.' }
      if (!executionValuesEqual(fromObserved(outcome.value), item.expected))
        return {
          passed: false,
          detail: `Com (${args}) respondeu ${shortJson(outcome.value)}; esperava ${shortJson(item.expected)}.`,
        }
    }
    return { passed: true }
  }
  if (rule.type === 'script') {
    if (observation.scriptError)
      return { passed: false, detail: `A regra em JavaScript deu erro: ${observation.scriptError}` }
    if (observation.verdict === true) return { passed: true }
    return {
      passed: false,
      detail:
        observation.returned === 'false'
          ? 'A regra em JavaScript devolveu false.'
          : `A regra em JavaScript precisa devolver true ou false; devolveu ${observation.returned ?? 'nada'}.`,
    }
  }
  if (
    rule.observation ||
    rule.expect.compare === 'increased' ||
    rule.expect.compare === 'decreased'
  ) {
    const unavailable = executionObservationUnavailableReason(rule, observation)
    if (unavailable) return { passed: false, detail: unavailable }
    const motion = observation.motion
    if (
      rule.observation &&
      motion &&
      (motion.baselineInitial.x !== motion.baselineFinal.x ||
        motion.baselineInitial.y !== motion.baselineFinal.y ||
        motion.baselineFinal.x !== motion.actionInitial.x ||
        motion.baselineFinal.y !== motion.actionInitial.y)
    )
      return { passed: false, detail: 'O personagem se moveu antes de apertar a tecla.' }
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
  // "Mudou" compara com o começo: sem a leitura do começo (a variável ainda não existia, por
  // exemplo a da partida que só nasce depois de apertar uma tecla) não há com o que comparar.
  if (compare === 'changed' && !observation.initial?.found)
    return {
      passed: false,
      detail: `Não consegui ler ${targetName(target)} no começo do teste, então não sei se mudou.`,
    }
  if (isInconclusiveObservedValue(final.value))
    return {
      passed: false,
      detail: `Não consegui ler ${targetName(target)} inteiro (grande demais ou com erro).`,
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

function isExecutionObjectiveResult(value: unknown): value is ExecutionObjectiveResult {
  return (
    record(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    value.id.length <= 100 &&
    typeof value.passed === 'boolean' &&
    (value.detail === undefined || typeof value.detail === 'string')
  )
}

/** A transport response is evidence only when its verdicts have the canonical wire shape. */
export function isProjectCheckResponse(value: unknown): value is ProjectCheckResponse {
  if (!record(value)) return false
  if (value.ok === false)
    return (
      ['INVALID_REQUEST', 'BUILD_FAILED', 'RATE_LIMITED', 'CHECK_FAILED'].some(
        (code) => code === value.code,
      ) &&
      typeof value.message === 'string' &&
      (value.output === undefined || typeof value.output === 'string')
    )
  return (
    value.ok === true &&
    Array.isArray(value.results) &&
    value.results.length <= EXECUTION_LIMITS.maxObjectives &&
    value.results.every(isExecutionObjectiveResult) &&
    new Set(value.results.map((item) => item.id)).size === value.results.length &&
    (value.screenshots === undefined ||
      (record(value.screenshots) &&
        Object.values(value.screenshots).every((item) => typeof item === 'string')))
  )
}
