import type {
  BehaviorArea,
  BlockDefinition,
  BlockPlacement,
  StatementContext,
} from './blocks/types'

export type ProjectAreaKind = 'structure' | 'appearance' | BehaviorArea

export type BlockMigration =
  | 'keep'
  | 'unwrap-start'
  | 'unwrap-load'
  | 'remove-engine-boot'
  | 'lift-periodic-loop'

export interface BlockContract {
  type: string
  domain: 'frame' | 'html' | 'css' | 'behavior' | 'value'
  placement?: BlockPlacement
  migration: BlockMigration
}

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

const LEGACY_START_BLOCK_TYPES = new Set([
  'sz_g2d_on_start',
  'sz_gk_on_game_start',
  'sz_js_on_load',
])

const ENGINE_BOOT_BLOCK_TYPES = new Set(['sz_gk_start', 'sz_g3k_start', 'sz_w3d_start'])

const LOOP_BLOCK_TYPES = new Set([
  'sz_canvas_anim_loop',
  'sz_g2d_update_each_frame',
  'sz_g2d_every_frames',
  'sz_g2d_every_seconds',
  'sz_g3d_animate',
  'sz_gk_on_update',
  'sz_gk_on_draw',
  'sz_gk_on_draw_hud',
  'sz_gk_every_seconds',
  'sz_g3k_on_update',
  'sz_g3k_on_entity_state_update',
  'sz_w3d_on_update',
  'sz_js_set_interval',
  'sz_js_set_interval_seconds',
])

const LOOP_BODY_ONLY_BLOCK_TYPES = new Set([
  'sz_g2d_on_enemy_shot_hit',
  'sz_g2d_on_group_overlap',
  'sz_g2d_on_sprite_group_overlap',
  'sz_gk_overlap_groups',
])

const PERIODIC_BLOCK_TYPES = new Set([
  'sz_g2d_every_frames',
  'sz_g2d_every_seconds',
  'sz_gk_every_seconds',
  'sz_js_set_interval',
  'sz_js_set_interval_seconds',
])

const DRAW_WORLD_BLOCK_TYPES = new Set(['sz_gk_on_draw'])
const DRAW_HUD_BLOCK_TYPES = new Set(['sz_gk_on_draw_hud'])

const START_DECLARATION_BLOCK_TYPES = new Set([
  'sz_js_function',
  'sz_js_class',
  'sz_js_import_named',
  'sz_js_import_default',
  'sz_js_import_star',
])

const EVENT_BODY_ONLY_BLOCK_TYPES = new Set(['sz_js_event_method'])

const BODY_CONTEXTS: readonly StatementContext[] = [
  'statement',
  'event-body',
  'loop-body',
  'function-body',
  'draw-world',
  'draw-hud',
  'map-draw',
  'map-enter',
]

function isEventBlockType(type: string): boolean {
  if (
    LEGACY_START_BLOCK_TYPES.has(type) ||
    LOOP_BLOCK_TYPES.has(type) ||
    LOOP_BODY_ONLY_BLOCK_TYPES.has(type)
  ) {
    return false
  }
  if (
    type === 'sz_js_element_onclick' ||
    type === 'sz_js_image_onload' ||
    type === 'sz_js_image_onerror'
  ) {
    return true
  }
  return (
    type.startsWith('sz_js_on_') ||
    /^sz_(?:g2d|gk|g3k|w3d)_on_/.test(type) ||
    /^sz_gk_(?:rpg|cards|td)_on_/.test(type) ||
    /^sz_w3d_(?:race|bowling)_on_/.test(type) ||
    type.startsWith('sz_t3d_physics_on_')
  )
}

export function inferBehaviorAreaFromType(type: string): BehaviorArea {
  if (LOOP_BLOCK_TYPES.has(type) || LOOP_BODY_ONLY_BLOCK_TYPES.has(type)) return 'loops'
  if (isEventBlockType(type)) return 'events'
  return 'start'
}

function loopPhase(type: string): BlockPlacement['phase'] {
  if (DRAW_WORLD_BLOCK_TYPES.has(type)) return 'draw-world'
  if (DRAW_HUD_BLOCK_TYPES.has(type)) return 'draw-hud'
  if (PERIODIC_BLOCK_TYPES.has(type)) return 'periodic'
  return 'update'
}

function statementChecks(placement: BlockPlacement): string[] {
  const checks = new Set<string>()
  if (placement.root.includes('start')) checks.add('JSStartRoot')
  if (placement.root.includes('events')) checks.add('JSEventRoot')
  if (placement.root.includes('loops')) checks.add('JSLoopRoot')
  if (placement.nested.length > 0) checks.add('JSStmt')
  return [...checks]
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
      placement: definition.placement ?? { root: [], nested: [], role: 'value' },
    }
  }

  if (previousChecks.includes('ClassMember')) {
    return {
      type,
      domain: 'behavior',
      migration: 'keep',
      placement: definition.placement ?? {
        root: [],
        nested: ['class-member'],
        role: 'declaration',
      },
    }
  }
  if (previousChecks.includes('SwitchCase')) {
    return {
      type,
      domain: 'behavior',
      migration: 'keep',
      placement: definition.placement ?? { root: [], nested: ['statement'], role: 'command' },
    }
  }

  let placement = definition.placement
  let migration: BlockMigration = 'keep'
  if (!placement && LEGACY_START_BLOCK_TYPES.has(type)) {
    placement = { root: ['start'], nested: [], role: 'event' }
    migration = type === 'sz_js_on_load' ? 'unwrap-load' : 'unwrap-start'
  } else if (!placement && ENGINE_BOOT_BLOCK_TYPES.has(type)) {
    placement = { root: ['start'], nested: [], role: 'command' }
    migration = 'remove-engine-boot'
  } else if (!placement && LOOP_BLOCK_TYPES.has(type)) {
    placement = { root: ['loops'], nested: [], role: 'loop', phase: loopPhase(type) }
    migration = PERIODIC_BLOCK_TYPES.has(type) ? 'lift-periodic-loop' : 'keep'
  } else if (!placement && LOOP_BODY_ONLY_BLOCK_TYPES.has(type)) {
    placement = { root: [], nested: ['loop-body'], role: 'loop', phase: 'update' }
  } else if (!placement && isEventBlockType(type)) {
    placement = { root: ['events'], nested: [], role: 'event' }
  } else if (!placement && START_DECLARATION_BLOCK_TYPES.has(type)) {
    placement = { root: ['start'], nested: [], role: 'declaration' }
  } else if (!placement && EVENT_BODY_ONLY_BLOCK_TYPES.has(type)) {
    placement = { root: [], nested: ['event-body'], role: 'command' }
  } else if (
    !placement &&
    (definition.previousStatement != null || definition.nextStatement != null)
  ) {
    placement = { root: ['start'], nested: BODY_CONTEXTS, role: 'command' }
  }

  if (!placement) {
    throw new Error(`O bloco executável “${type}” não possui contrato de posicionamento`)
  }
  return { type, domain: 'behavior', placement, migration }
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
  const previous = definition.previousStatement
  const previousChecks = Array.isArray(previous) ? previous : previous ? [previous] : []
  if (!previousChecks.includes('JSStmt')) return definition
  const checks = statementChecks(contract.placement)
  if (checks.length === 0) return definition
  return {
    ...definition,
    previousStatement: definition.previousStatement == null ? definition.previousStatement : checks,
    nextStatement: definition.nextStatement == null ? definition.nextStatement : checks,
  }
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
