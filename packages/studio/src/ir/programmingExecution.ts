import type { JSStatement } from './schema'

export type ProgrammingBodyTiming = 'immediate' | 'deferred' | 'invocable'
export type ProgrammingEventObjectCapability = 'generic' | 'keyboard' | 'pointer'
export type ProgrammingBodyExecution =
  | 'structural'
  | 'sync-callback'
  | 'deferred-callback'
  | 'function'

export interface ProgrammingChildBodyEntry {
  path: (string | number)[]
  body: JSStatement[]
  timing: ProgrammingBodyTiming
  execution: ProgrammingBodyExecution
  localVariables: string[]
  canvasContexts: string[]
  eventObject?: ProgrammingEventObjectCapability
}

export interface ProgrammingEmbeddedBodyEntry {
  path: (string | number)[]
  body: JSStatement[]
  execution: 'sync-callback'
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

/**
 * Contrato exaustivo dos statements que entregam um corpo a outra função.
 * Timing e limite léxico derivam desta única tabela; nomes como `on...` não
 * dizem se o runtime registra o callback ou o chama imediatamente.
 */
type CallbackBodyExecution = Extract<
  ProgrammingBodyExecution,
  'sync-callback' | 'deferred-callback'
>

function callbackEntries(
  execution: CallbackBodyExecution,
  types: readonly string[],
): Array<readonly [string, CallbackBodyExecution]> {
  return types.map((type) => [type, execution] as const)
}

const CALLBACK_BODY_EXECUTION: ReadonlyMap<string, CallbackBodyExecution> = new Map([
  ...callbackEntries('deferred-callback', [
    // Núcleo.
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

    // Jogo 2D: eventos e raízes contínuas registram; varreduras chamam agora.
    'g2d:onStart',
    'g2d:updateEachFrame',
    'g2d:onPointer',
    'g2d:onKey',
    'g2d:onOverlap',
    'g2d:onEnemyDefeated',
    'g2d:defineShape',
    'g2d:everyFrames',
    'g2d:everySeconds',

    // Jogo 2D avançado.
    'gk:addButton',
    'gk:defineLook',
    'gk:onGameStart',
    'gk:onEnterState',
    'gk:onUpdate',
    'gk:onDraw',
    'gk:onDrawHud',
    'gk:onGameClick',
    'gk:rpgOnTalk',
    'gk:rpgCreateMap',
    'gk:rpgOnEnterMap',
    'gk:rpgOnBattleEnd',
    'gk:rpgOnFoeTurn',
    'gk:rpgOnStep',
    'gk:rpgOption',
    'gk:onTurnChange',
    'gk:onLandSpace',
    'gk:cardsOnTurn',
    'gk:cardsOnEnemyTurn',
    'gk:everySeconds',
    'gk:tdOnBuy',
    'gk:waitThen',
    'gk:onEvent',

    // Jogo 3D e Jogo 3D avançado.
    'g3d:animate',
    'g3k:onUpdate',
    'g3k:onTimerEnd',
    'g3k:onOverlap',
    'g3k:onEnterEntityState',
    'g3k:onEntityStateUpdate',
    'g3k:onExitEntityState',
    'g3k:onEntityDeath',
    'g3k:addButton',
    'g3k:onEnterState',
    'g3k:onEvent',

    // Mundo 3D.
    'w3d:onPoint',
    'w3d:onZone',
    'w3d:raceOnStart',
    'w3d:raceOnCheckpoint',
    'w3d:raceOnFinish',
    'w3d:bowlingOnStrike',
    'w3d:onCrash',
    'w3d:onHorn',
    'w3d:onAchievement',
    'w3d:onCollect',
    'w3d:onQuestDone',
    'w3d:npcTalk',
    'w3d:onVehicle',
    'w3d:npcAsk',
    'w3d:onExplosion',
    'w3d:onDayNight',
    'w3d:onUpdate',
  ]),
  ...callbackEntries('sync-callback', [
    'forEach',
    'traverseEach',
    'g2d:forEachInGroup',
    'g2d:pruneOffscreen',
    'g2d:onGroupOverlap',
    'g2d:onSpriteGroupOverlap',
    'g2d:onEnemyShotHit',
    'g3d:forEachInSwarm',
    'gk:forEachActive',
    'gk:overlapGroups',
    'gk:rpgCutscene',
    'gk:rpgMenu',
    'gk:pkmBattleTrainer',
    'gk:definePath',
    'g3k:defineMold',
    'g3k:forEachAlive',
    'g3k:forEachNear',
  ]),
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
function programmingBodyTiming(statement: JSStatement): ProgrammingBodyTiming {
  if (statement.type === 'funcDecl' || statement.type === 'classDecl') return 'invocable'
  if (CALLBACK_BODY_EXECUTION.get(statement.type) === 'deferred-callback') return 'deferred'
  return 'immediate'
}

function programmingBodyExecution(statement: JSStatement): ProgrammingBodyExecution {
  if (statement.type === 'funcDecl' || statement.type === 'classDecl') return 'function'
  return CALLBACK_BODY_EXECUTION.get(statement.type) ?? 'structural'
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
    case 'onClickAssign':
    case 'imageOnLoad':
    case 'imageOnError':
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

const KEYBOARD_BROWSER_EVENTS = new Set(['keydown', 'keyup'])
const POINTER_BROWSER_EVENTS = new Set([
  'click',
  'mouseover',
  'mouseout',
  'mousemove',
  'mousedown',
  'mouseup',
  'pointermove',
  'pointerdown',
  'pointerup',
  'contextmenu',
])

/** Capacidade do parâmetro `event` realmente entregue ao corpo indicado. */
function eventObjectForChild(
  statement: JSStatement,
  path: readonly (string | number)[],
): ProgrammingEventObjectCapability | undefined {
  if (path[0] !== 'body') return undefined
  if (statement.type === 'event') {
    if (KEYBOARD_BROWSER_EVENTS.has(statement.event)) return 'keyboard'
    if (POINTER_BROWSER_EVENTS.has(statement.event)) return 'pointer'
    return 'generic'
  }
  if (statement.type === 'onClickAssign') return 'pointer'
  if (statement.type === 'imageOnLoad' || statement.type === 'imageOnError') return 'generic'
  return undefined
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
  const execution = programmingBodyExecution(statement)
  return childStatementBodies(statement).map(({ path, body }) => ({
    path,
    body,
    timing,
    execution,
    localVariables: localVariablesForChild(statement, path),
    canvasContexts: localCanvasContextsForChild(statement, path),
    eventObject: eventObjectForChild(statement, path),
  }))
}

/**
 * Corpos de statements escondidos em expressões do statement, hoje o executor
 * síncrono de `new Promise`. Corpos estruturais comuns continuam vindo de
 * `programmingChildBodyEntries`, evitando duas travessias concorrentes.
 */
export function programmingEmbeddedBodyEntries(
  statement: JSStatement,
): ProgrammingEmbeddedBodyEntry[] {
  const entries: ProgrammingEmbeddedBodyEntry[] = []
  const statementBodyRoots = new Set(
    childStatementBodies(statement).map(({ path }) => String(path[0])),
  )

  const visit = (value: unknown, path: (string | number)[]): void => {
    if (Array.isArray(value)) {
      value.forEach((child, index) => {
        visit(child, [...path, index])
      })
      return
    }
    if (typeof value !== 'object' || value === null) return
    const record = value as Record<string, unknown>
    if (record.type === 'newPromise' && Array.isArray(record.body)) {
      entries.push({
        path: [...path, 'body'],
        body: record.body as JSStatement[],
        execution: 'sync-callback',
      })
      for (const [key, child] of Object.entries(record)) {
        if (key !== '__id' && key !== 'type' && key !== 'body') {
          visit(child, [...path, key])
        }
      }
      return
    }
    for (const [key, child] of Object.entries(record)) {
      if (key !== '__id' && key !== 'type') visit(child, [...path, key])
    }
  }

  for (const [key, value] of Object.entries(statement)) {
    if (key !== '__id' && key !== 'type' && !statementBodyRoots.has(key)) {
      visit(value, [key])
    }
  }
  return entries
}
