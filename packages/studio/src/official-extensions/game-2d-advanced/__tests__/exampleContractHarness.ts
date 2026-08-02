import type { ExtensionExample } from '#extensions'
import { behaviorStatements, type JSStatement, normalizeSZIR } from '#ir'
import { parseJS } from '../../../parsers/js'
import { withIndependentPeriodicLoops } from '../examples/withIndependentPeriodicLoops'

export function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key !== '__id') out[key] = stripIds(child)
    }
    return out as T
  }
  return value
}

export function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectTypes(item, out)
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.type === 'string') out.add(record.type)
    for (const child of Object.values(record)) collectTypes(child, out)
  }
  return out
}

export function collectStatements(value: unknown, type: string, out: unknown[] = []): unknown[] {
  if (Array.isArray(value)) {
    for (const item of value) collectStatements(item, type, out)
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (record.type === type) out.push(record)
    for (const child of Object.values(record)) collectStatements(child, type, out)
  }
  return out
}

/** Converte a fonte do exemplo pelo mesmo parser e contrato de persistência usados pelo Studio. */
export function parseExampleLifecycleSource(
  source: string,
  independentPeriodicLoops = false,
): JSStatement[] {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: [{ extensionId: 'game-2d-advanced' }],
  })
  const ir = independentPeriodicLoops
    ? withIndependentPeriodicLoops({
        name: 'Contrato do exemplo avançado',
        experience: 'game',
        ir: normalized,
      } satisfies ExtensionExample).ir
    : normalized

  // O parser aceita opcionais `undefined`; a IR persistida passa por JSON.
  return JSON.parse(JSON.stringify(behaviorStatements(ir))) as JSStatement[]
}
