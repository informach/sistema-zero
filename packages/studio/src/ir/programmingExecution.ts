import type { JSStatement } from './schema'

export type ProgrammingBodyTiming = 'immediate' | 'deferred' | 'invocable'

const DEFERRED_CALLBACK_STATEMENTS: ReadonlySet<string> = new Set([
  'animationLoop',
  'event',
  'fetchJson',
  'loaderLoad',
  'physicsLiteCollisionEvent',
  'physicsLiteTriggerEvent',
  'requestFrameDo',
  'setInterval',
  'setIntervalSeconds',
  'setTimeout',
  'setTimeoutSeconds',
  'g2d:defineShape',
  'g2d:updateEachFrame',
])

/**
 * Diz quando um corpo filho pode executar em relação ao trecho que o declara.
 * Loops/condições são imediatos; callbacks observam declarações posteriores;
 * funções e classes são revalidadas no ponto de chamada/instanciação.
 */
export function programmingBodyTiming(
  statement: JSStatement,
  _path: readonly PropertyKey[],
): ProgrammingBodyTiming {
  if (statement.type === 'funcDecl' || statement.type === 'classDecl') return 'invocable'
  if (
    DEFERRED_CALLBACK_STATEMENTS.has(statement.type) ||
    /^(?:g2d|g3d|gk|g3k|w3d):on[A-Z]/.test(statement.type)
  ) {
    return 'deferred'
  }
  return 'immediate'
}
