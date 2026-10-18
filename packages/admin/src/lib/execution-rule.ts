import {
  EXECUTION_COMPARES_WITHOUT_VALUE,
  type ExecutionCompare,
  type ExecutionJson,
  type ExecutionKey,
  type ExecutionStep,
  type ExecutionTarget,
  type SectionExecutionRule,
} from '@sistemazero/core/learning'

/**
 * A autoria dos objetivos que RODAM o jogo (etapa 3, 18/10/2026), na língua da professora. Puro:
 * o editor (`execution-rule-editor.tsx`) só liga os campos a estas funções.
 */
export const COMPARE_LABELS: Record<ExecutionCompare, string> = {
  changed: 'mudou',
  truthy: 'existe (não está vazio)',
  equals: 'é igual a',
  notEquals: 'é diferente de',
  greaterThan: 'é maior que',
  lessThan: 'é menor que',
  atLeast: 'é pelo menos',
  atMost: 'é no máximo',
  contains: 'contém o texto',
  notContains: 'não contém o texto',
}

const KEY_NAMES: Partial<Record<ExecutionKey, string>> = {
  ArrowUp: 'seta para cima',
  ArrowDown: 'seta para baixo',
  ArrowLeft: 'seta para a esquerda',
  ArrowRight: 'seta para a direita',
  Space: 'espaço',
  Enter: 'Enter',
  Escape: 'Esc',
  Shift: 'Shift',
}

export function keyLabel(key: ExecutionKey): string {
  return KEY_NAMES[key] ?? key.toUpperCase()
}

export function stepLabel(step: ExecutionStep): string {
  switch (step.action) {
    case 'wait':
      return `esperar ${step.ms} ms`
    case 'press':
      return `${step.holdMs ? `segurar ${keyLabel(step.key)} por ${step.holdMs} ms` : `apertar ${keyLabel(step.key)}`}`
    case 'click':
      return `clicar em ${step.x}, ${step.y}`
  }
}

export function targetLabel(target: ExecutionTarget): string {
  switch (target.kind) {
    case 'value':
      return target.path || '(variável)'
    case 'text':
      return 'o texto da página'
    case 'console':
      return 'o console'
    case 'game':
      return {
        phase: 'a fase do kit',
        score: 'os pontos do kit',
        goal: 'a meta do kit',
        health: 'a vida do kit',
      }[target.field]
  }
}

/** A linha-resumo do objetivo na lista do editor. */
export function describeExecutionRule(rule: SectionExecutionRule): string {
  if (rule.type === 'functionReturns')
    return `A função ${rule.name || '(nome)'} responde certo: ${rule.cases.length} ${
      rule.cases.length === 1 ? 'caso' : 'casos'
    }`
  if (rule.type === 'script') {
    const steps = rule.steps.length ? rule.steps.map(stepLabel).join(', ') : 'sem passos'
    const first = rule.code.trim().split('\n')[0] ?? ''
    return `Regra em JavaScript: ${steps}; ${first.length > 60 ? `${first.slice(0, 57)}...` : first}`
  }
  const steps = rule.steps.length ? rule.steps.map(stepLabel).join(', ') : 'sem passos'
  const { target, compare, value } = rule.expect
  const tail = EXECUTION_COMPARES_WITHOUT_VALUE.includes(compare)
    ? ''
    : ` ${formatJson(value ?? '')}`
  return `O jogo faz algo: ${steps}; conferir se ${targetLabel(target)} ${COMPARE_LABELS[compare]}${tail}`
}

/**
 * O valor esperado como a professora digita: número vira número e "verdadeiro"/"falso" viram
 * sim/não (a não ser em "contém", que é sempre texto).
 */
export function parseExpectedValue(
  text: string,
  compare: ExecutionCompare,
): string | number | boolean {
  if (compare === 'contains' || compare === 'notContains') return text
  const trimmed = text.trim()
  if (/^-?\d+(?:[.,]\d+)?$/.test(trimmed)) return Number(trimmed.replace(',', '.'))
  if (/^(?:verdadeiro|true)$/i.test(trimmed)) return true
  if (/^(?:falso|false)$/i.test(trimmed)) return false
  return text
}

export function formatJson(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

/** "3, 4" ou "[3, 4]" → [3, 4]. Texto solto vira texto (aspas são opcionais para uma palavra). */
export function parseArgs(text: string): ExecutionJson[] | null {
  const trimmed = text.trim()
  if (!trimmed) return []
  const json = trimmed.startsWith('[') ? trimmed : `[${trimmed}]`
  try {
    const parsed = JSON.parse(json) as unknown
    return Array.isArray(parsed) ? (parsed as ExecutionJson[]) : null
  } catch {
    return null
  }
}

export function formatArgs(args: readonly ExecutionJson[]): string {
  return args.map((arg) => JSON.stringify(arg)).join(', ')
}

/** A resposta esperada: JSON (`10`, `"oi"`, `[1, 2]`, `true`) ou, sem aspas, um texto. */
export function parseExpected(text: string): ExecutionJson | undefined {
  const trimmed = text.trim()
  if (!trimmed) return undefined
  try {
    return JSON.parse(trimmed) as ExecutionJson
  } catch {
    return /^[\p{L}\p{N} _.-]+$/u.test(trimmed) ? trimmed : undefined
  }
}

export function newExecutionRule(
  type: SectionExecutionRule['type'],
  isPro: boolean,
  /** Pro de kit: `jogo` é o estado do kit. Pro sem kit não tem estado: só texto e console. */
  isKit = isPro,
): SectionExecutionRule {
  if (type === 'script')
    return {
      type,
      steps: [{ action: 'wait', ms: 500 }],
      code: !isPro
        ? 'return jogo.pontos > 0'
        : isKit
          ? 'return jogo.score > 0'
          : "return texto.includes('Olá')",
    }
  if (type === 'functionReturns')
    return {
      type,
      name: '',
      ...(isPro ? { module: 'src/regras.ts' } : {}),
      cases: [{ args: [], expected: 0 }],
    }
  return {
    type,
    steps: [{ action: 'press', key: 'ArrowRight', holdMs: 500 }],
    expect: {
      target: isPro ? { kind: 'text' } : { kind: 'value', path: '' },
      compare: 'changed',
    },
  }
}
