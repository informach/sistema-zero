import { BEHAVIOR_AREA_LABELS } from '../core/behaviorAreas'
import type {
  BehaviorArea,
  BlockDefinition,
  BlockMigration,
  BlockPlacement,
  BlockPlacementDeclaration,
  BlockPlacementPreset,
  StatementContext,
} from './blocks/types'

export type { BlockMigration } from './blocks/types'
export { BEHAVIOR_AREA_LABELS }

export type ProjectAreaKind = 'structure' | 'appearance' | BehaviorArea

export interface BlockContract {
  type: string
  domain: 'frame' | 'html' | 'css' | 'behavior' | 'value'
  placement?: BlockPlacement
  migration: BlockMigration
}

/**
 * Posicionamentos explícitos reutilizados pelas categorias oficiais. Manter
 * estes objetos aqui evita que cada extensão invente uma variação incompatível
 * do mesmo contrato pedagógico.
 */
export const START_ONLY_COMMAND_PLACEMENT: BlockPlacement = Object.freeze({
  root: ['start'] as const,
  nested: [] as const,
  role: 'command',
})

export const START_ONLY_DECLARATION_PLACEMENT: BlockPlacement = Object.freeze({
  root: ['start'] as const,
  nested: [] as const,
  role: 'declaration',
})

/**
 * Recursos podem nascer no início, em eventos ou em funções, mas não diretamente
 * no corpo executado a cada quadro. O schema mantém a mesma regra em profundidade.
 */
export const RESOURCE_CREATOR_PLACEMENT: BlockPlacement = Object.freeze({
  root: ['start'] as const,
  nested: [
    'statement',
    'event-body',
    'function-body',
    'async-function-body',
    'derived-constructor-body',
    'derived-method-body',
  ] as const,
  forbiddenNested: ['loop-body'] as const,
  role: 'command',
})

export const EVENT_ROOT_PLACEMENT: BlockPlacement = Object.freeze({
  root: ['events'] as const,
  nested: ['function-body'] as const,
  role: 'event',
})

export const EVENT_BODY_COMMAND_PLACEMENT: BlockPlacement = Object.freeze({
  root: [] as const,
  nested: ['event-body'] as const,
  role: 'command',
})

export const FRAME_STRUCTURE = 'sz_frame_structure'
export const FRAME_APPEARANCE = 'sz_frame_appearance'
export const FRAME_BEHAVIOR_LEGACY = 'sz_frame_behavior'
export const FRAME_START = 'sz_frame_start'
export const FRAME_EVENTS = 'sz_frame_events'
export const FRAME_LOOPS = 'sz_frame_loops'

export const PROJECT_AREA_TYPES = new Set<string>([
  FRAME_STRUCTURE,
  FRAME_APPEARANCE,
  FRAME_BEHAVIOR_LEGACY,
  FRAME_START,
  FRAME_EVENTS,
  FRAME_LOOPS,
])

export function isProjectAreaType(type: string): boolean {
  return PROJECT_AREA_TYPES.has(type)
}

const BODY_CONTEXTS: readonly StatementContext[] = [
  'statement',
  'event-body',
  'loop-body',
  'function-body',
  'async-function-body',
  'derived-constructor-body',
  'derived-method-body',
  'draw-world',
  'draw-hud',
  'map-draw',
  'map-enter',
]

const PLACEMENT_PRESETS: Readonly<Record<BlockPlacementPreset, BlockPlacement>> = Object.freeze({
  command: Object.freeze({ root: ['start'] as const, nested: BODY_CONTEXTS, role: 'command' }),
  'start-declaration': START_ONLY_DECLARATION_PLACEMENT,
  event: EVENT_ROOT_PLACEMENT,
  'event-body': EVENT_BODY_COMMAND_PLACEMENT,
  'loop-update': Object.freeze({
    root: ['loops'] as const,
    nested: [] as const,
    role: 'loop',
    phase: 'update',
  }),
  'loop-periodic': Object.freeze({
    root: ['loops'] as const,
    nested: [] as const,
    role: 'loop',
    phase: 'periodic',
  }),
  'loop-draw-world': Object.freeze({
    root: ['loops'] as const,
    nested: [] as const,
    role: 'loop',
    phase: 'draw-world',
  }),
  'loop-draw-hud': Object.freeze({
    root: ['loops'] as const,
    nested: [] as const,
    role: 'loop',
    phase: 'draw-hud',
  }),
  'loop-body': Object.freeze({
    root: [] as const,
    nested: ['loop-body'] as const,
    role: 'loop',
    phase: 'update',
  }),
  'legacy-start': Object.freeze({
    root: ['start'] as const,
    nested: [] as const,
    role: 'event',
  }),
  'start-only-command': START_ONLY_COMMAND_PLACEMENT,
  'resource-creator': RESOURCE_CREATOR_PLACEMENT,
  'class-member': Object.freeze({
    root: [] as const,
    nested: ['class-member'] as const,
    role: 'declaration',
  }),
  'switch-case': Object.freeze({
    root: [] as const,
    nested: ['statement'] as const,
    role: 'command',
  }),
})

function resolvePlacement(declaration: BlockPlacementDeclaration): BlockPlacement {
  if (typeof declaration !== 'string') return declaration
  const placement = PLACEMENT_PRESETS[declaration]
  if (!placement) throw new Error(`Preset de posicionamento desconhecido: ${declaration}`)
  return placement
}

const CHECK_BY_CONTEXT: Readonly<Record<StatementContext, string>> = {
  statement: 'JSStmt',
  'event-body': 'JSEventStmt',
  'loop-body': 'JSLoopStmt',
  'function-body': 'JSFunctionStmt',
  'async-function-body': 'JSAsyncStmt',
  'derived-constructor-body': 'JSDerivedConstructorStmt',
  'derived-method-body': 'JSDerivedMethodStmt',
  'class-member': 'ClassMember',
  'draw-world': 'JSStmt',
  'draw-hud': 'JSStmt',
  'map-draw': 'JSStmt',
  'map-enter': 'JSStmt',
}

export const NESTED_STATEMENT_CHECKS = [
  ...new Set(BODY_CONTEXTS.map((context) => CHECK_BY_CONTEXT[context])),
]

function statementChecks(placement: BlockPlacement): string[] {
  const checks = new Set<string>()
  if (placement.root.includes('start')) checks.add('JSStartRoot')
  if (placement.root.includes('events')) checks.add('JSEventRoot')
  if (placement.root.includes('loops')) checks.add('JSLoopRoot')
  for (const context of placement.nested) checks.add(CHECK_BY_CONTEXT[context])
  return [...checks]
}

function materializeStatementInputs(definition: BlockDefinition): BlockDefinition {
  const rewrite = (args: unknown[] | undefined): unknown[] | undefined =>
    args?.map((arg) => {
      if (typeof arg !== 'object' || arg === null) return arg
      const input = arg as { type?: unknown; check?: unknown }
      if (
        input.type !== 'input_statement' ||
        (input.check !== undefined && input.check !== 'JSStmt')
      ) {
        return arg
      }
      return { ...input, check: NESTED_STATEMENT_CHECKS }
    })

  return {
    ...definition,
    ...(definition.args0 ? { args0: rewrite(definition.args0) } : {}),
    ...(definition.args1 ? { args1: rewrite(definition.args1) } : {}),
    ...(definition.args2 ? { args2: rewrite(definition.args2) } : {}),
    ...(definition.args3 ? { args3: rewrite(definition.args3) } : {}),
    ...(definition.args4 ? { args4: rewrite(definition.args4) } : {}),
    ...(definition.args5 ? { args5: rewrite(definition.args5) } : {}),
  }
}

export function inferBlockContract(definition: BlockDefinition): BlockContract {
  const { type } = definition
  if (PROJECT_AREA_TYPES.has(type)) return { type, domain: 'frame', migration: 'keep' }

  const previous = definition.previousStatement
  const previousChecks = Array.isArray(previous) ? previous : previous ? [previous] : []
  if (previousChecks.includes('HTMLNode')) return { type, domain: 'html', migration: 'keep' }
  if (
    previousChecks.includes('CSSEntry') ||
    previousChecks.includes('CSSDecl') ||
    previousChecks.includes('KeyframeStep')
  ) {
    return { type, domain: 'css', migration: 'keep' }
  }
  if (definition.output != null) {
    return {
      type,
      domain: 'value',
      migration: 'keep',
      placement: definition.placement
        ? resolvePlacement(definition.placement)
        : { root: [], nested: [], role: 'value' },
    }
  }

  if (!definition.placement) {
    throw new Error(`O bloco executável “${type}” não possui contrato de posicionamento`)
  }
  return {
    type,
    domain: 'behavior',
    placement: resolvePlacement(definition.placement),
    migration: definition.migration ?? 'keep',
  }
}

const contracts = new Map<string, BlockContract>()

export function registerBlockContracts(definitions: readonly BlockDefinition[]): void {
  for (const definition of definitions) {
    const next = inferBlockContract(definition)
    const previous = contracts.get(definition.type)
    if (previous && JSON.stringify(previous) !== JSON.stringify(next)) {
      throw new Error(`O bloco “${definition.type}” possui contratos contraditórios`)
    }
    contracts.set(definition.type, next)
  }
}

export function getBlockContract(type: string): BlockContract | undefined {
  return contracts.get(type)
}

export function requireBlockContract(type: string): BlockContract {
  const contract = contracts.get(type)
  if (!contract) throw new Error(`O bloco “${type}” não foi registrado no catálogo semântico`)
  return contract
}

export function materializeBlockDefinition(definition: BlockDefinition): BlockDefinition {
  const contract = inferBlockContract(definition)
  if (contract.domain !== 'behavior' || !contract.placement) return definition
  const withInputs = {
    ...materializeStatementInputs(definition),
    placement: contract.placement,
  }
  const previous = definition.previousStatement
  const previousChecks = Array.isArray(previous) ? previous : previous ? [previous] : []
  if (!previousChecks.includes('JSStmt')) return withInputs
  const checks = statementChecks(contract.placement)
  if (checks.length === 0) return withInputs
  return {
    ...withInputs,
    previousStatement: definition.previousStatement == null ? definition.previousStatement : checks,
    nextStatement: definition.nextStatement == null ? definition.nextStatement : checks,
  } as BlockDefinition
}

export function areaForBlockType(type: string): ProjectAreaKind | undefined {
  if (type === FRAME_STRUCTURE) return 'structure'
  if (type === FRAME_APPEARANCE) return 'appearance'
  if (type === FRAME_START || type === FRAME_BEHAVIOR_LEGACY) return 'start'
  if (type === FRAME_EVENTS) return 'events'
  if (type === FRAME_LOOPS) return 'loops'
  const contract = contracts.get(type)
  if (!contract) return undefined
  if (contract.domain === 'html') return 'structure'
  if (contract.domain === 'css') return 'appearance'
  return contract.placement?.root[0]
}
