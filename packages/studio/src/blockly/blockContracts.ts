import { BEHAVIOR_AREA_LABELS } from '../core/behaviorAreas'
import type {
  BehaviorArea,
  BlockDefinition,
  BlockMigration,
  BlockPlacement,
  BlockPlacementDeclaration,
  BlockPlacementPreset,
  EventObjectCapability,
  StatementBodyExecution,
  StatementContext,
  UserGestureActivation,
} from './blocks/types'

export type { BlockMigration } from './blocks/types'
export { BEHAVIOR_AREA_LABELS }

export type ProjectAreaKind = 'structure' | 'appearance' | BehaviorArea

export interface BlockContract {
  type: string
  domain: 'frame' | 'html' | 'css' | 'behavior' | 'value'
  placement?: BlockPlacement
  bodyExecution: StatementBodyExecution
  bodyContext?: StatementContext
  userGesture?: UserGestureActivation
  eventObject?: EventObjectCapability
  migration: BlockMigration
}

/** Eventos e loops de motor sempre entram por callback, mesmo sem anotação local. */
export function effectiveBodyExecution(
  contract: BlockContract | undefined,
): StatementBodyExecution {
  const role = contract?.placement?.role
  if (role === 'event' || role === 'loop') return 'deferred-callback'
  return contract?.bodyExecution ?? 'structural'
}

/** Avalia a ativação declarada sem depender de nomes de blocos. */
export function contractProvidesUserGesture(
  contract: BlockContract | undefined,
  fieldValue: (name: string) => unknown = () => undefined,
): boolean {
  const activation = contract?.userGesture
  if (activation === true) return true
  return Boolean(activation && fieldValue(activation.field) === activation.equals)
}

/** Retorna a especialização do objeto `Event` entregue ao corpo do bloco. */
export function contractEventObjectCapability(
  contract: BlockContract | undefined,
): EventObjectCapability | undefined {
  return contract?.eventObject
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
  nested: [
    'function-body',
    'async-function-body',
    'constructor-body',
    'derived-constructor-body',
    'derived-method-body',
  ] as const,
  forbiddenNested: ['loop-body'] as const,
  role: 'event',
})

export const EVENT_BODY_COMMAND_PLACEMENT: BlockPlacement = Object.freeze({
  root: [] as const,
  nested: ['event-body'] as const,
  role: 'command',
})

/**
 * A entrada em tela cheia exige ativação transitória do navegador. Uma função
 * nomeada não prova que sua chamada veio de um gesto, portanto só o corpo do
 * próprio evento libera o comando.
 */
export const USER_GESTURE_COMMAND_PLACEMENT: BlockPlacement = Object.freeze({
  root: [] as const,
  nested: ['user-gesture-body'] as const,
  role: 'command',
})

/**
 * Um passo de simulação pode ser reutilizado por uma função, mas não deve ser
 * executado uma única vez na raiz ou no corpo direto de um evento/construtor.
 * Um loop aninhado continua sendo um contexto contínuo válido, mesmo quando o
 * loop foi disparado por um desses contêineres.
 */
export const LOOP_COMMAND_PLACEMENT: BlockPlacement = Object.freeze({
  root: [] as const,
  nested: ['loop-body', 'function-body', 'async-function-body', 'derived-method-body'] as const,
  forbiddenDirectNested: ['event-body', 'constructor-body'] as const,
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
  'user-gesture-body',
  'loop-body',
  'syntactic-loop-body',
  'function-body',
  'async-function-body',
  'constructor-body',
  'derived-constructor-body',
  'derived-method-body',
  'draw-world',
  'draw-hud',
  'map-draw',
  'map-enter',
  'path-builder',
  'menu-options',
  'cutscene-steps',
  'trainer-team',
  'g3k-mold-parts',
]

export const ADVANCED_COMMAND_PLACEMENT: BlockPlacement = Object.freeze({
  root: ['start', 'events', 'loops'] as const,
  nested: BODY_CONTEXTS,
  role: 'command',
})

const PLACEMENT_PRESETS: Readonly<Record<BlockPlacementPreset, BlockPlacement>> = Object.freeze({
  command: Object.freeze({ root: ['start'] as const, nested: BODY_CONTEXTS, role: 'command' }),
  'advanced-command': ADVANCED_COMMAND_PLACEMENT,
  'start-declaration': START_ONLY_DECLARATION_PLACEMENT,
  event: EVENT_ROOT_PLACEMENT,
  'event-body': EVENT_BODY_COMMAND_PLACEMENT,
  'user-gesture-command': USER_GESTURE_COMMAND_PLACEMENT,
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
  'loop-command': LOOP_COMMAND_PLACEMENT,
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
  'user-gesture-body': 'JSUserGestureStmt',
  'loop-body': 'JSLoopStmt',
  'syntactic-loop-body': 'JSSyntacticLoopStmt',
  'function-body': 'JSFunctionStmt',
  'async-function-body': 'JSAsyncStmt',
  'constructor-body': 'JSConstructorStmt',
  'derived-constructor-body': 'JSDerivedConstructorStmt',
  'derived-method-body': 'JSDerivedMethodStmt',
  'class-member': 'ClassMember',
  'draw-world': 'JSStmt',
  'draw-hud': 'JSStmt',
  'map-draw': 'JSStmt',
  'map-enter': 'JSStmt',
  'path-builder': 'JSStmt',
  'menu-options': 'JSStmt',
  'cutscene-steps': 'JSStmt',
  'trainer-team': 'JSStmt',
  'g3k-mold-parts': 'JSStmt',
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
  const bodyExecution = definition.bodyExecution ?? 'structural'
  const bodyContext = definition.bodyContext
  const userGesture = definition.userGesture
  const eventObject = definition.eventObject
  if (PROJECT_AREA_TYPES.has(type)) {
    return {
      type,
      domain: 'frame',
      bodyExecution,
      bodyContext,
      userGesture,
      eventObject,
      migration: 'keep',
    }
  }

  const previous = definition.previousStatement
  const previousChecks = Array.isArray(previous) ? previous : previous ? [previous] : []
  if (previousChecks.includes('HTMLNode')) {
    return {
      type,
      domain: 'html',
      bodyExecution,
      bodyContext,
      userGesture,
      eventObject,
      migration: 'keep',
    }
  }
  if (
    previousChecks.includes('CSSEntry') ||
    previousChecks.includes('CSSDecl') ||
    previousChecks.includes('KeyframeStep')
  ) {
    return {
      type,
      domain: 'css',
      bodyExecution,
      bodyContext,
      userGesture,
      eventObject,
      migration: 'keep',
    }
  }
  if (definition.output != null) {
    return {
      type,
      domain: 'value',
      bodyExecution,
      bodyContext,
      userGesture,
      eventObject,
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
    bodyExecution,
    bodyContext,
    userGesture,
    eventObject,
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

/** Localiza o bloco que cria um contexto de corpo especializado. */
export function blockTypeProvidingBodyContext(context: StatementContext): string | undefined {
  for (const contract of contracts.values()) {
    if (contract.bodyContext === context) return contract.type
  }
  return undefined
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

export function areasForBlockType(type: string): readonly ProjectAreaKind[] | undefined {
  if (type === FRAME_STRUCTURE) return ['structure']
  if (type === FRAME_APPEARANCE) return ['appearance']
  if (type === FRAME_START || type === FRAME_BEHAVIOR_LEGACY) return ['start']
  if (type === FRAME_EVENTS) return ['events']
  if (type === FRAME_LOOPS) return ['loops']
  const contract = contracts.get(type)
  if (!contract) return undefined
  if (contract.domain === 'html') return ['structure']
  if (contract.domain === 'css') return ['appearance']
  return contract.placement?.root
}

/** Área canônica usada ao organizar blocos soltos ou migrar estados planos. */
export function areaForBlockType(type: string): ProjectAreaKind | undefined {
  return areasForBlockType(type)?.[0]
}
