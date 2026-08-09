import type { BehaviorArea } from '#core'
import type { BehaviorIR, JSStatement } from '#ir'
import { lifecycleAreaForStatement, MOLD_OR_START_STATEMENT_TYPES, partitionMolds } from '#ir'

export interface ParsedBehaviorSections {
  /** Código anterior ao primeiro marcador; segue as regras de compatibilidade do início. */
  preamble?: readonly JSStatement[]
  molds?: readonly JSStatement[]
  start: readonly JSStatement[]
  events: readonly JSStatement[]
  loops: readonly JSStatement[]
}

function compatibleStartStatement(statement: JSStatement): JSStatement {
  const partitioned = partitionMolds({ start: [statement], events: [], loops: [] })
  return partitioned.molds?.[0] ?? partitioned.start[0] ?? statement
}

function targetArea(statement: JSStatement, sourceArea: BehaviorArea): BehaviorArea {
  // Código bruto é deliberadamente multiárea: o marcador faz parte da sua semântica.
  if (statement.type === 'rawJS') return sourceArea
  // Variáveis e funções cabem em dois lugares; somente “Meus moldes” muda a raiz.
  if (MOLD_OR_START_STATEMENT_TYPES.has(statement.type)) {
    return sourceArea === 'molds' ? 'molds' : 'start'
  }
  return lifecycleAreaForStatement(statement)
}

/**
 * Reconstrói as áreas por contrato. Marcadores preservam apenas escolhas que o
 * tipo do statement não consegue representar sozinho.
 */
export function routeBehaviorSections(sections: ParsedBehaviorSections): BehaviorIR {
  const routed: Record<BehaviorArea, JSStatement[]> = {
    molds: [],
    start: [],
    events: [],
    loops: [],
  }

  const route = (
    statements: readonly JSStatement[],
    sourceArea: BehaviorArea,
    preserveLegacyStart: boolean,
  ): void => {
    for (const original of statements) {
      const statement = preserveLegacyStart ? compatibleStartStatement(original) : original
      routed[targetArea(statement, sourceArea)].push(statement)
    }
  }

  route(sections.preamble ?? [], 'start', true)
  route(sections.molds ?? [], 'molds', false)
  route(sections.start, 'start', true)
  route(sections.events, 'events', false)
  route(sections.loops, 'loops', false)

  const rest = { start: routed.start, events: routed.events, loops: routed.loops }
  return routed.molds.length > 0 ? { molds: routed.molds, ...rest } : rest
}
