import type { JSStatement } from './schema'

export type LifecycleArea = 'start' | 'events' | 'loops'
export type ProjectLifecycleTarget =
  | 'core'
  | 'game-2d'
  | 'game-2d-advanced'
  | 'game-3d'
  | 'game-3d-advanced'
  | 'world-3d'

export const LEGACY_START_WRAPPER_TYPES = new Set(['g2d:onStart', 'gk:onGameStart'])
export const LEGACY_ENGINE_BOOT_TYPES = new Set(['gk:start', 'g3k:start', 'w3d:start'])

export const PERIODIC_STATEMENT_TYPES = new Set([
  'setInterval',
  'setIntervalSeconds',
  'g2d:everyFrames',
  'g2d:everySeconds',
  'gk:everySeconds',
])

const LOOP_ROOT_TYPES = new Set([
  'animationLoop',
  'g2d:updateEachFrame',
  'g3d:animate',
  'gk:onUpdate',
  'gk:onDraw',
  'gk:onDrawHud',
  'g3k:onUpdate',
  'g3k:onEntityStateUpdate',
  'w3d:onUpdate',
  ...PERIODIC_STATEMENT_TYPES,
])

const LOOP_BODY_ONLY_TYPES = new Set([
  'g2d:onEnemyShotHit',
  'g2d:onGroupOverlap',
  'g2d:onSpriteGroupOverlap',
  'gk:overlapGroups',
])

const CORE_EVENT_TYPES = new Set([
  'imageOnLoad',
  'imageOnError',
  'onClickAssign',
  'physicsLiteCollisionEvent',
  'physicsLiteTriggerEvent',
])

export function isLegacyLoadEvent(statement: JSStatement): boolean {
  return (
    statement.type === 'event' && statement.event === 'load' && statement.targetKind === 'window'
  )
}

function isEventStatement(statement: JSStatement): boolean {
  if (statement.type === 'event') return !isLegacyLoadEvent(statement)
  if (
    LOOP_ROOT_TYPES.has(statement.type) ||
    LOOP_BODY_ONLY_TYPES.has(statement.type) ||
    LEGACY_START_WRAPPER_TYPES.has(statement.type)
  ) {
    return false
  }
  return (
    CORE_EVENT_TYPES.has(statement.type) ||
    /^(?:g2d|gk|g3k|w3d):on[A-Z]/.test(statement.type) ||
    /^gk:(?:rpg|cards|td)On[A-Z]/.test(statement.type) ||
    /^w3d:(?:race|bowling)On[A-Z]/.test(statement.type)
  )
}

/** Fonte única para classificar um statement nas três áreas de comportamento. */
export function lifecycleAreaForStatement(statement: JSStatement): LifecycleArea {
  if (LOOP_ROOT_TYPES.has(statement.type) || LOOP_BODY_ONLY_TYPES.has(statement.type)) {
    return 'loops'
  }
  if (isEventStatement(statement)) return 'events'
  return 'start'
}

/**
 * Além da área correta, raízes v2 não aceitam blocos antigos de boot/início nem
 * varreduras contínuas que só fazem sentido dentro do corpo de um loop.
 */
export function isLifecycleRootAllowed(statement: JSStatement, area: LifecycleArea): boolean {
  if (
    LEGACY_START_WRAPPER_TYPES.has(statement.type) ||
    LEGACY_ENGINE_BOOT_TYPES.has(statement.type) ||
    isLegacyLoadEvent(statement) ||
    LOOP_BODY_ONLY_TYPES.has(statement.type)
  ) {
    return false
  }
  return lifecycleAreaForStatement(statement) === area
}

export function projectLifecycleTarget(
  extensions: readonly { extensionId: string }[],
): ProjectLifecycleTarget {
  const installed = new Set(extensions.map((extension) => extension.extensionId))
  if (installed.has('game-2d-advanced')) return 'game-2d-advanced'
  if (installed.has('game-3d-advanced')) return 'game-3d-advanced'
  if (installed.has('world-3d')) return 'world-3d'
  if (installed.has('game-3d')) return 'game-3d'
  if (installed.has('game-2d')) return 'game-2d'
  return 'core'
}
