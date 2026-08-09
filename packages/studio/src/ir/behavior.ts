import {
  isLegacyLoadEvent,
  LEGACY_ENGINE_BOOT_TYPES,
  LEGACY_START_WRAPPER_TYPES,
  lifecycleAreaForStatement,
  PERIODIC_STATEMENT_TYPES,
} from './lifecycle'
import type { BehaviorIR, JSStatement, SZIR, SZIRInput, SZIRV2 } from './schema'

export const BEHAVIOR_SECTION_MARKERS = {
  molds: '// Meus moldes',
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

/**
 * Monta o `BehaviorIR` OMITINDO `molds` quando não há molde nenhum.
 *
 * ⚠️ A omissão é deliberada e vale como contrato: projeto sem molde continua
 * com um `behavior` de forma IDÊNTICA à de antes da área existir, então nada
 * que compare IR por igualdade profunda (fixtures, drifts, dirty-check por
 * referência) enxerga uma mudança que não houve.
 */
function withMolds(molds: JSStatement[], rest: Omit<BehaviorIR, 'molds'>): BehaviorIR {
  return molds.length > 0 ? { molds, ...rest } : { ...rest }
}

/** Separa a lista plana antiga sem alterar os nós preservados. */
export function splitLegacyBehavior(statements: readonly JSStatement[]): BehaviorIR {
  const behavior: Required<BehaviorIR> = { molds: [], start: [], events: [], loops: [] }

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
    if (area === 'molds') {
      behavior.molds.push(statement)
      return
    }
    behavior.start.push(statement)
  }

  for (const statement of statements) visit(statement)
  return withMolds(behavior.molds, {
    start: behavior.start,
    events: behavior.events,
    loops: behavior.loops,
  })
}

/**
 * Move para 🧩 Meus moldes os statements que a IR trouxe em ⚙️ Ao iniciar mas
 * pertencem à área de definições, PRESERVANDO a ordem relativa dos dois lados.
 *
 * É a rede de compatibilidade para IR salva antes da área existir e para IR
 * importada de fora. Os exemplos oficiais já nascem particionados na fonte, e o
 * `moldPartition.test.ts` é quem prova isso — esta função não deve ser a
 * desculpa para deixar um exemplo desarrumado.
 *
 * ⚠️ A função (`funcDecl`) NÃO é movida: ela cabe nas duas áreas, então a
 * escolha de quem escreveu o projeto é preservada.
 */
export function partitionMolds(behavior: BehaviorIR): BehaviorIR {
  const molds = [...(behavior.molds ?? [])]
  const start: JSStatement[] = []
  for (const statement of behavior.start) {
    if (lifecycleAreaForStatement(statement) === 'molds') molds.push(statement)
    else start.push(statement)
  }
  return withMolds(molds, { start, events: behavior.events, loops: behavior.loops })
}

export function normalizeSZIR(input: SZIRInput): SZIRV2 {
  if ('behavior' in input) {
    // Preserva a IDENTIDADE quando não há nada a mover: consumidores comparam a
    // IR por referência para decidir se precisam reprocessar.
    if (!input.behavior.start.some((s) => lifecycleAreaForStatement(s) === 'molds')) return input
    return { ...input, behavior: partitionMolds(input.behavior) }
  }
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
  const { molds, start, events, loops } = normalizeSZIR(input).behavior
  return [...(molds ?? []), ...start, ...events, ...loops]
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
