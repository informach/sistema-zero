import {
  isLegacyLoadEvent,
  LEGACY_ENGINE_BOOT_TYPES,
  LEGACY_START_WRAPPER_TYPES,
  lifecycleAreaForStatement,
  PERIODIC_STATEMENT_TYPES,
} from './lifecycle'
import type { BehaviorIR, JSStatement, SZIR, SZIRInput, SZIRV2 } from './schema'

export const BEHAVIOR_SECTION_MARKERS = {
  start: '// Ao iniciar',
  events: '// Quando acontecer',
  loops: '// Enquanto estiver rodando',
} as const

function bodyOf(statement: JSStatement): JSStatement[] {
  const body = (statement as { body?: unknown }).body
  return Array.isArray(body) ? (body as JSStatement[]) : []
}

function liftDirectPeriodicLoops(statement: JSStatement, loops: JSStatement[]): JSStatement {
  if (statement.type !== 'g2d:updateEachFrame') return statement
  const body = statement.body.filter((child) => {
    if (!PERIODIC_STATEMENT_TYPES.has(child.type)) return true
    loops.push(child)
    return false
  })
  return body.length === statement.body.length ? statement : { ...statement, body }
}

/** Separa a lista plana antiga sem alterar os nós preservados. */
export function splitLegacyBehavior(statements: readonly JSStatement[]): BehaviorIR {
  const behavior: BehaviorIR = { start: [], events: [], loops: [] }

  const visit = (statement: JSStatement): void => {
    if (LEGACY_START_WRAPPER_TYPES.has(statement.type) || isLegacyLoadEvent(statement)) {
      for (const child of bodyOf(statement)) visit(child)
      return
    }
    if (LEGACY_ENGINE_BOOT_TYPES.has(statement.type)) return
    const area = lifecycleAreaForStatement(statement)
    if (area === 'loops') {
      behavior.loops.push(liftDirectPeriodicLoops(statement, behavior.loops))
      return
    }
    if (area === 'events') {
      behavior.events.push(statement)
      return
    }
    behavior.start.push(statement)
  }

  for (const statement of statements) visit(statement)
  return behavior
}

export function normalizeSZIR(input: SZIRInput): SZIRV2 {
  if ('behavior' in input) return input
  const normalized: SZIRV2 = {
    version: 2,
    html: input.html,
    css: input.css,
    behavior: splitLegacyBehavior(input.js),
    extensions: input.extensions,
  }
  if (input.htmlShell) normalized.htmlShell = input.htmlShell
  return normalized
}

/** Vista linear somente para consumidores legados durante a migração do pipeline. */
export function behaviorStatements(input: SZIRInput): JSStatement[] {
  const { start, events, loops } = normalizeSZIR(input).behavior
  return [...start, ...events, ...loops]
}

export function legacySZIRFromV2(input: SZIRV2): SZIR {
  const legacy: SZIR = {
    html: input.html,
    css: input.css,
    js: behaviorStatements(input),
    extensions: input.extensions,
  }
  if (input.htmlShell) legacy.htmlShell = input.htmlShell
  return legacy
}
