import type { JSStatement } from './schema'

export type ProgrammingBodyTiming = 'immediate' | 'deferred' | 'invocable'

export interface ProgrammingChildBodyEntry {
  path: (string | number)[]
  body: JSStatement[]
  timing: ProgrammingBodyTiming
  localVariables: string[]
  canvasContexts: string[]
}

const STATEMENT_BODY_KEYS: ReadonlySet<string> = new Set([
  'body',
  'then',
  'else',
  'handler',
  'finalizer',
  'catchBody',
  'ctorBody',
  'default',
  'bodyA',
  'bodyB',
  'errorBody',
  'methods',
])

const DEFERRED_CALLBACK_STATEMENTS: ReadonlySet<string> = new Set([
  'animationLoop',
  'event',
  'fetchJson',
  'imageOnError',
  'imageOnLoad',
  'loaderLoad',
  'onClickAssign',
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

/** Informa se uma propriedade contém statements filhos em vez de valores comuns. */
export function isProgrammingStatementBodyKey(key: string): boolean {
  return STATEMENT_BODY_KEYS.has(key)
}

/**
 * Diz quando um corpo filho pode executar em relação ao trecho que o declara.
 * Loops/condições são imediatos; callbacks observam declarações posteriores;
 * funções e classes são revalidadas no ponto de chamada/instanciação.
 */
export function programmingBodyTiming(statement: JSStatement): ProgrammingBodyTiming {
  if (statement.type === 'funcDecl' || statement.type === 'classDecl') return 'invocable'
  if (
    DEFERRED_CALLBACK_STATEMENTS.has(statement.type) ||
    /^(?:g2d|g3d|gk|g3k|w3d):on[A-Z]/.test(statement.type)
  ) {
    return 'deferred'
  }
  return 'immediate'
}

function childStatementBodies(
  statement: JSStatement,
): Array<{ path: (string | number)[]; body: JSStatement[] }> {
  const bodies: Array<{ path: (string | number)[]; body: JSStatement[] }> = []
  for (const [key, value] of Object.entries(statement)) {
    if (key === 'elseif' && Array.isArray(value)) {
      value.forEach((branch, index) => {
        if (branch && typeof branch === 'object' && Array.isArray(branch.then)) {
          bodies.push({ path: ['elseif', index, 'then'], body: branch.then })
        }
      })
      continue
    }
    if (STATEMENT_BODY_KEYS.has(key) && Array.isArray(value)) {
      if (key === 'methods') {
        value.forEach((method, index) => {
          if (method && typeof method === 'object' && Array.isArray(method.body)) {
            bodies.push({ path: ['methods', index, 'body'], body: method.body })
          }
        })
      } else {
        bodies.push({ path: [key], body: value as JSStatement[] })
      }
      continue
    }
    if (key === 'cases' && Array.isArray(value)) {
      value.forEach((branch, index) => {
        if (branch && typeof branch === 'object' && Array.isArray(branch.body)) {
          bodies.push({ path: ['cases', index, 'body'], body: branch.body })
        }
      })
    }
  }
  return bodies
}

function localVariablesForChild(
  statement: JSStatement,
  path: readonly (string | number)[],
): string[] {
  const first = path[0]
  switch (statement.type) {
    case 'event':
      return first === 'body' ? ['event'] : []
    case 'funcDecl':
      return first === 'body' ? statement.params : []
    case 'forRange':
      return first === 'body' ? [statement.varName] : []
    case 'forOf':
      return first === 'body' ? [statement.itemName] : []
    case 'forEach':
      return first === 'body'
        ? [statement.itemName, statement.indexName].filter(
            (name): name is string => typeof name === 'string' && name.length > 0,
          )
        : []
    case 'tryCatch':
      return first === 'handler' && statement.errorName ? [statement.errorName] : []
    case 'fetchJson':
      if (first === 'body') return [statement.okName]
      return first === 'catchBody' && statement.catchName ? [statement.catchName] : []
    case 'classDecl':
      if (first === 'ctorBody') return statement.ctorParams ?? []
      if (first === 'methods' && typeof path[1] === 'number') {
        return statement.methods[path[1]]?.params ?? []
      }
      return []
    case 'requestFrameDo':
      return first === 'body' && statement.param ? [statement.param] : []
    case 'loaderLoad':
      if (first === 'body') return [statement.param]
      return first === 'errorBody' && statement.errorParam ? [statement.errorParam] : []
    case 'traverseEach':
      return first === 'body' ? [statement.param] : []
    case 'physicsLiteCollisionEvent':
      return first === 'body' ? [statement.bodyParam, statement.colliderParam] : []
    case 'physicsLiteTriggerEvent':
      return first === 'body'
        ? [statement.bodyParam, statement.triggerParam, statement.enteringParam]
        : []
    case 'animationLoop':
      return first === 'body'
        ? [statement.handle, statement.timeVar, statement.deltaVar].filter(
            (name): name is string => typeof name === 'string' && name.length > 0,
          )
        : []
    case 'g2d:defineShape':
      return first === 'body' ? ['ctx'] : []
    case 'g2d:onPointer':
      return first === 'body' ? [statement.xName, statement.yName] : []
    case 'g2d:onGroupOverlap':
      return first === 'body' ? [statement.aName, statement.bName] : []
    case 'g2d:forEachInGroup':
    case 'g2d:pruneOffscreen':
    case 'g2d:onSpriteGroupOverlap':
    case 'g2d:onEnemyDefeated':
    case 'g2d:onEnemyShotHit':
      return first === 'body' ? [statement.itemName] : []
    case 'g3d:forEachInSwarm':
      return first === 'body' ? [statement.itemName] : []
    case 'gk:onUpdate':
    case 'g3k:onUpdate':
    case 'w3d:onUpdate':
      return first === 'body' ? [statement.dtName] : []
    case 'gk:onDraw':
    case 'gk:onDrawHud':
      return first === 'body' ? [statement.ctxName] : []
    case 'gk:onGameClick':
    case 'gk:tdOnBuy':
      return first === 'body' ? [statement.xName, statement.yName] : []
    case 'gk:rpgCreateMap':
    case 'gk:defineLook':
      return first === 'body' ? [statement.ctxName] : []
    case 'gk:forEachActive':
    case 'g3k:forEachAlive':
    case 'g3k:forEachNear':
    case 'g3k:onEnterEntityState':
    case 'g3k:onExitEntityState':
    case 'g3k:onEntityDeath':
      return first === 'body' ? [statement.itemName] : []
    case 'gk:overlapGroups':
      return first === 'body' ? [statement.aName, statement.bName] : []
    case 'g3k:onEntityStateUpdate':
      return first === 'body' ? [statement.itemName, statement.dtName] : []
    case 'g3k:onOverlap':
      return first === 'body' ? [statement.zoneName, statement.whoName] : []
    default:
      return []
  }
}

function localCanvasContextsForChild(
  statement: JSStatement,
  path: readonly (string | number)[],
): string[] {
  if (path[0] !== 'body') return []
  switch (statement.type) {
    case 'g2d:defineShape':
      return ['ctx']
    case 'gk:onDraw':
    case 'gk:onDrawHud':
    case 'gk:rpgCreateMap':
    case 'gk:defineLook':
      return [statement.ctxName]
    default:
      return []
  }
}

/** Fonte única dos corpos aninhados, do seu timing e dos nomes que eles declaram. */
export function programmingChildBodyEntries(statement: JSStatement): ProgrammingChildBodyEntry[] {
  const timing = programmingBodyTiming(statement)
  return childStatementBodies(statement).map(({ path, body }) => ({
    path,
    body,
    timing,
    localVariables: localVariablesForChild(statement, path),
    canvasContexts: localCanvasContextsForChild(statement, path),
  }))
}
