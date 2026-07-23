import { CONTINUOUS_EXTENSION_STATEMENT_TYPES } from '../official-extensions/continuousCommandContract'
import { CANVAS3D_CONTINUOUS_STATEMENT_TYPES } from '../three/canvas3dContract'
import {
  GAME3D_RUNNING_CONTEXT_STATEMENT_TYPES,
  GAME3D_START_ONLY_STATEMENT_TYPES,
} from '../three/game3dContract'
import { resolveEventTargetKind } from './eventTargets'
import {
  type ProgrammingBodyExecution,
  type ProgrammingEventObjectCapability,
  programmingChildBodyEntries,
  programmingEmbeddedBodyEntries,
} from './programmingExecution'
import type { JSStatement } from './schema'

export type LifecycleArea = 'start' | 'events' | 'loops'

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

/**
 * Statements que constroem recursos persistentes ou registram configurações de
 * uma partida. Eles só podem existir diretamente em `behavior.start`; executar
 * qualquer um dentro de evento, loop ou função duplicaria recursos/listeners.
 *
 * Esta lista revalida nós importados da IR. O teste de contratos gera a IR real
 * de cada bloco com placement exclusivo de início e impede divergência.
 */
export const START_ONLY_STATEMENT_TYPES = new Set([
  'importStar',
  'importNamed',
  'funcDecl',
  'classDecl',
  'canvasSetup',

  'g2d:setupStage',
  'g2d:setupFull',
  'g2d:fitScreen',
  'g2d:setStageDescription',
  'g2d:createSprite',
  'g2d:createImageSprite',
  'g2d:createShapeSprite',
  'g2d:createShip',
  'g2d:createDino',
  'g2d:createCity',
  'g2d:placeThrower',
  'g2d:createStickHero',
  'g2d:createBalloon',
  'g2d:createGroup',
  'g2d:score',
  'g2d:setHealth',
  'g2d:loadSpritesheet',
  'g2d:setStateAnim',
  'g2d:defineEnemyType',
  'g2d:enemyStateAnim',
  'g2d:createTileMapFromAsset',
  'g2d:createTileMap',
  'g2d:defineShape',

  'gk:setup',
  'gk:setupFull',
  'gk:loadImage',
  'gk:createScreen',
  'gk:addButton',
  'gk:setScreenBg',
  'gk:setPauseKey',
  'gk:defineMold',
  'gk:defineLook',
  'gk:setSheet',
  'gk:rpgSetStartMap',
  'gk:rpgCreateMap',
  'gk:rpgDefineBattler',
  'gk:defineEffect',
  'gk:loadSound',
  'gk:loadTilemap',
  'gk:tilemapSolid',
  'gk:boardCreate',
  'gk:defineRegion',
  'gk:createEmptyTilemap',
  'gk:pkmCreature',
  'gk:pkmMove',
  'gk:pkmTypeChart',
  'gk:pkmEvolve',
  'gk:pkmCatchDifficulty',
  'gk:pkmEncounterRate',
  'gk:cardsEnergyPerTurn',
  'gk:stateAnim',
  'gk:definePath',
  'gk:playersSetup',
  'gk:tdSlot',

  ...GAME3D_START_ONLY_STATEMENT_TYPES,

  'g3k:setup',
  'g3k:defineMold',
  'g3k:setPauseKey',
  'g3k:stateTimer',
  'g3k:defineEffect',
  'g3k:defineEmitter',
  'g3k:addAttractor',
  'g3k:makeSolid',
  'g3k:setStateAnim',
  'g3k:setPhysics',
  'g3k:setCollider',
  'g3k:makeTrigger',
  'g3k:setBounce',
  'g3k:setFriction',
  'g3k:setSkyPhoto',
  'g3k:setScreenText',
  'g3k:createScreen',
  'g3k:addButton',
  'g3k:loadSound',

  'w3d:setup',
  'w3d:terrain',
  'w3d:flatten',
  'w3d:path',
  'w3d:water',
  'w3d:skyPhoto',
  'w3d:car',
  'w3d:carStats',
  'w3d:carBoost',
  'w3d:engineSound',
  'w3d:grass',
  'w3d:scatter',
  'w3d:scatterModel',
  'w3d:placeThing',
  'w3d:placeModel',
  'w3d:clearArea',
  'w3d:horn',
  'w3d:carLights',
  'w3d:tireMarks',
  'w3d:minimap',
  'w3d:racePodium',
  'w3d:whisperCorner',
  'w3d:flameNote',
  'w3d:coinsScatter',
  'w3d:coinsRing',
  'w3d:coinsLine',
  'w3d:quest',
  'w3d:marker',
  'w3d:npc',
  'w3d:npcWander',
  'w3d:islands',
  'w3d:boat',
  'w3d:bridge',
  'w3d:lighthouse',
  'w3d:person',
  'w3d:personStats',
  'w3d:personAccessory',
  'w3d:waterfall',
  'w3d:lamp',
  'w3d:fireflies',
  'w3d:campfire',
  'w3d:pushPlace',
  'w3d:pushScatter',
  'w3d:letters',
  'w3d:explosive',
  'w3d:point',
  'w3d:zone',
  'w3d:totemText',
  'w3d:totemImage',
  'w3d:galleryCreate',
  'w3d:galleryAdd',
  'w3d:raceCreate',
  'w3d:raceCheckpoint',
  'w3d:bowlingCreate',
  'w3d:stack',
  'w3d:effects',
  'w3d:loadSound',
  'w3d:city',
  'w3d:crops',
  'w3d:barn',
  'w3d:windmill',
  'w3d:fence',
  'w3d:animals',
  'w3d:crater',
  'w3d:flag',
  'w3d:rocket',
  'w3d:door',
  'w3d:traffic',
  'w3d:stringLights',
  'w3d:district',
  'w3d:roadGrid',
  'w3d:houseRow',
  'w3d:quality',
])

const EVENT_BODY_ONLY_TYPES = new Set(['w3d:npcAsk'])

type SpecializedBodyContext =
  | 'draw-world'
  | 'draw-hud'
  | 'map-draw'
  | 'map-enter'
  | 'path-builder'
  | 'menu-options'
  | 'cutscene-steps'
  | 'trainer-team'
  | 'g3k-mold-parts'

const SPECIALIZED_BODY_CONTEXTS: ReadonlyMap<string, SpecializedBodyContext> = new Map([
  ['gk:onDraw', 'draw-world'],
  ['gk:onDrawHud', 'draw-hud'],
  ['gk:rpgCreateMap', 'map-draw'],
  ['gk:rpgOnEnterMap', 'map-enter'],
  ['gk:definePath', 'path-builder'],
  ['gk:rpgMenu', 'menu-options'],
  ['gk:rpgCutscene', 'cutscene-steps'],
  ['gk:pkmBattleTrainer', 'trainer-team'],
  ['g3k:defineMold', 'g3k-mold-parts'],
])

const CONTAINER_ONLY_STATEMENTS: ReadonlyMap<string, SpecializedBodyContext> = new Map([
  ['gk:rpgOnStep', 'map-enter'],
  ['gk:pathPoint', 'path-builder'],
  ['gk:rpgOption', 'menu-options'],
  ['gk:rpgWait', 'cutscene-steps'],
  ['gk:pkmTrainerCreature', 'trainer-team'],
  ['g3k:part', 'g3k-mold-parts'],
])

const SPECIALIZED_BODY_LABELS: Readonly<Record<SpecializedBodyContext, string>> = {
  'draw-world': 'Desenhar o jogo',
  'draw-hud': 'Desenhar por cima (HUD)',
  'map-draw': 'Criar o mapa-cenário',
  'map-enter': 'Quando entrar no mapa-cenário',
  'path-builder': 'Criar o caminho',
  'menu-options': 'Menu de escolha',
  'cutscene-steps': 'Fazer a cena',
  'trainer-team': 'batalha contra o treinador',
  'g3k-mold-parts': 'Criar o molde 3D',
}

const CORE_EVENT_TYPES = new Set([
  'eventHandler',
  'imageOnLoad',
  'imageOnError',
  'onClickAssign',
  'physicsLiteCollisionEvent',
  'physicsLiteTriggerEvent',
])

function isContinuousCommandType(type: string): boolean {
  return (
    CONTINUOUS_EXTENSION_STATEMENT_TYPES.has(type) || CANVAS3D_CONTINUOUS_STATEMENT_TYPES.has(type)
  )
}

export function isLegacyLoadEvent(statement: JSStatement): boolean {
  return (
    statement.type === 'event' &&
    statement.event === 'load' &&
    resolveEventTargetKind(statement.target, statement.targetKind) === 'window'
  )
}

export function isEventStatement(statement: JSStatement): boolean {
  if (statement.type === 'event') return !isLegacyLoadEvent(statement)
  if (
    LOOP_ROOT_TYPES.has(statement.type) ||
    isContinuousCommandType(statement.type) ||
    LEGACY_START_WRAPPER_TYPES.has(statement.type)
  ) {
    return false
  }
  return (
    CORE_EVENT_TYPES.has(statement.type) ||
    statement.type === 'w3d:npcTalk' ||
    /^(?:g2d|gk|g3k|w3d):on[A-Z]/.test(statement.type) ||
    /^gk:(?:rpg|cards|td)On[A-Z]/.test(statement.type) ||
    /^w3d:(?:race|bowling)On[A-Z]/.test(statement.type)
  )
}

export function isLoopRootStatement(statement: JSStatement): boolean {
  return LOOP_ROOT_TYPES.has(statement.type)
}

/** Fonte única para classificar um statement nas três áreas de comportamento. */
export function lifecycleAreaForStatement(statement: JSStatement): LifecycleArea {
  if (LOOP_ROOT_TYPES.has(statement.type) || isContinuousCommandType(statement.type)) {
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
    isContinuousCommandType(statement.type) ||
    GAME3D_RUNNING_CONTEXT_STATEMENT_TYPES.has(statement.type) ||
    EVENT_BODY_ONLY_TYPES.has(statement.type) ||
    CONTAINER_ONLY_STATEMENTS.has(statement.type)
  ) {
    return false
  }
  // Código bruto é opaco: a área escolhida pelo projeto é parte da sua
  // semântica e espelha o contrato multiárea do bloco `sz_adv_raw_js`.
  if (statement.type === 'rawJS') return true
  return lifecycleAreaForStatement(statement) === area
}

export interface LifecycleSemanticIssue {
  path: PropertyKey[]
  message: string
}

interface SemanticContext {
  nested: boolean
  directEventContainer: boolean
  loopDepth: number
  continuousBody: boolean
  eventBody: boolean
  activeEventObjectBody: boolean
  userGestureBody: boolean
  keyboardEventBody: boolean
  pointerEventBody: boolean
  functionBody: boolean
  constructorBody: boolean
  asyncFunctionBody: boolean
  derivedConstructorBody: boolean
  derivedMethodBody: boolean
  classBody: boolean
  directSpecializedBody?: SpecializedBodyContext
}

const SYNTACTIC_LOOP_TYPES = new Set(['repeat', 'while', 'doWhile', 'forOf', 'forRange'])

/** Verdadeiro para raízes contínuas e para laços sintáticos aninháveis. */
export function isLoopStatement(statement: JSStatement): boolean {
  return isLoopRootStatement(statement) || SYNTACTIC_LOOP_TYPES.has(statement.type)
}

function issue(issues: LifecycleSemanticIssue[], path: PropertyKey[], message: string): void {
  issues.push({ path, message })
}

function validateContextDependentNode(
  node: Record<string, unknown>,
  context: SemanticContext,
  path: PropertyKey[],
  issues: LifecycleSemanticIssue[],
): void {
  const requiredBody = CONTAINER_ONLY_STATEMENTS.get(String(node.type))
  if (requiredBody && context.directSpecializedBody !== requiredBody) {
    issue(
      issues,
      path,
      `“${String(node.type)}” só pode ser usado diretamente dentro de “${SPECIALIZED_BODY_LABELS[requiredBody]}”`,
    )
  }

  if (
    isContinuousCommandType(String(node.type)) &&
    !context.continuousBody &&
    (!context.functionBody || context.eventBody || context.constructorBody)
  ) {
    issue(
      issues,
      path,
      'Este comando contínuo só pode ser usado dentro de um loop, função ou método',
    )
  }

  if (
    context.nested &&
    GAME3D_RUNNING_CONTEXT_STATEMENT_TYPES.has(String(node.type)) &&
    !context.continuousBody &&
    !context.eventBody &&
    !context.functionBody
  ) {
    issue(issues, path, 'Este comando só pode ser usado enquanto o jogo estiver rodando')
  }

  switch (node.type) {
    case 'break':
    case 'continue':
      if (context.loopDepth === 0) {
        issue(issues, path, `“${node.type}” só pode ser usado dentro de um laço`)
      }
      break
    case 'return':
      if (!context.functionBody) {
        issue(issues, path, '“return” só pode ser usado dentro de uma função ou método')
      }
      break
    case 'awaitStmt':
      if (!context.asyncFunctionBody) {
        issue(issues, path, '“await” só pode ser usado dentro de uma função assíncrona')
      }
      break
    case 'requestFullscreen':
    case 'toggleFullscreen':
      if (!context.userGestureBody) {
        issue(issues, path, 'Entrar em tela cheia exige um clique ou uma tecla ainda ativos')
      }
      break
    case 'superCall':
      if (!context.derivedConstructorBody) {
        issue(issues, path, '“super” só pode chamar o construtor dentro de uma classe derivada')
      }
      break
    case 'superMethodCall':
      if (!context.derivedMethodBody) {
        issue(issues, path, 'Métodos da classe-mãe só podem ser chamados em uma classe derivada')
      }
      break
    case 'eventMethod':
      if (!context.activeEventObjectBody) {
        issue(issues, path, 'Este comando exige um objeto Event ainda ativo do navegador')
      }
      break
    case 'w3d:npcAsk':
      if (!context.eventBody) {
        issue(issues, path, 'Este comando só existe dentro do corpo de um evento')
      }
      break
    case 'eventProp': {
      const prop = node.prop
      if ((prop === 'key' || prop === 'code') && !context.keyboardEventBody) {
        issue(issues, path, 'A tecla do evento só existe dentro de um evento de teclado')
      }
      if ((prop === 'clientX' || prop === 'clientY') && !context.pointerEventBody) {
        issue(issues, path, 'A posição do evento só existe dentro de um evento de ponteiro')
      }
      break
    }
    case 'thisProp':
      if (!context.classBody) {
        issue(issues, path, '“this” só pode acessar propriedades dentro de uma classe')
      }
      break
    case 'thisRef':
      if (!context.functionBody) {
        issue(issues, path, '“this” só pode ser usado dentro de uma função ou método')
      }
      break
    case 'classOp':
    case 'classContains':
      if (node.targetKind === 'this' && !context.functionBody) {
        issue(issues, path, '“this” só pode ser usado dentro de uma função ou método')
      }
      break
  }
}

const USER_GESTURE_EVENTS = new Set([
  'click',
  'keydown',
  'mousedown',
  'mouseup',
  'pointerdown',
  'pointerup',
])
function providesUserGesture(statement: JSStatement): boolean {
  if (statement.type === 'event') {
    return USER_GESTURE_EVENTS.has(statement.event)
  }
  if (statement.type === 'g2d:onKey') return true
  if (statement.type === 'g2d:onPointer' || statement.type === 'gk:onGameClick') return true
  if (
    statement.type === 'gk:addButton' ||
    statement.type === 'g3k:addButton' ||
    statement.type === 'gk:rpgOption' ||
    statement.type === 'gk:tdOnBuy'
  ) {
    return true
  }
  return statement.type === 'onClickAssign'
}

function visitUnknown(
  value: unknown,
  context: SemanticContext,
  path: PropertyKey[],
  issues: LifecycleSemanticIssue[],
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      visitUnknown(entry, context, [...path, index], issues)
    })
    return
  }
  if (typeof value !== 'object' || value === null) return
  const record = value as Record<string, unknown>
  validateContextDependentNode(record, context, path, issues)
  for (const [key, child] of Object.entries(record)) {
    if (key === '__id' || key === 'type') continue
    // O executor da Promise é visitado como um corpo próprio, com seu limite
    // de função síncrona, por `programmingEmbeddedBodyEntries`.
    if (record.type === 'newPromise' && key === 'body') continue
    visitUnknown(child, context, [...path, key], issues)
  }
}

function childContext(
  statement: JSStatement,
  path: readonly (string | number)[],
  execution: ProgrammingBodyExecution,
  eventObject: ProgrammingEventObjectCapability | undefined,
  context: SemanticContext,
): SemanticContext {
  const createsBoundary = execution !== 'structural'
  const resetsActivation = execution === 'deferred-callback' || execution === 'function'
  const providesEventObject = eventObject !== undefined
  const isFunction = execution === 'function'
  const isSynchronousCallback = execution === 'sync-callback'
  const classStatement = statement.type === 'classDecl' ? statement : null
  const isConstructor = classStatement !== null && path[0] === 'ctorBody'
  const methodIndex = classStatement && path[0] === 'methods' ? path[1] : undefined
  const method = typeof methodIndex === 'number' ? classStatement?.methods[methodIndex] : undefined
  const asyncFunction =
    statement.type === 'funcDecl' ? statement.async === true : method?.async === true
  const derived = Boolean(classStatement?.superClass)

  return {
    ...context,
    nested: true,
    directEventContainer: isFunction || isSynchronousCallback,
    // Loops do motor executam o corpo dentro de callbacks; eles não criam um
    // laço sintático JavaScript onde `break`/`continue` possam atuar.
    loopDepth:
      (createsBoundary ? 0 : context.loopDepth) +
      (execution === 'structural' && SYNTACTIC_LOOP_TYPES.has(statement.type) ? 1 : 0),
    continuousBody:
      (resetsActivation ? false : context.continuousBody) || isLoopStatement(statement),
    eventBody: context.eventBody || isEventStatement(statement),
    activeEventObjectBody:
      providesEventObject || (resetsActivation ? false : context.activeEventObjectBody),
    userGestureBody:
      (resetsActivation ? false : context.userGestureBody) || providesUserGesture(statement),
    keyboardEventBody: providesEventObject ? eventObject === 'keyboard' : context.keyboardEventBody,
    pointerEventBody: providesEventObject ? eventObject === 'pointer' : context.pointerEventBody,
    // Callbacks oficiais são arrows: encerram await/break, mas preservam `this`
    // e o contexto léxico da função ou método que os criou.
    functionBody: isFunction || isSynchronousCallback || context.functionBody,
    constructorBody: isFunction ? isConstructor : context.constructorBody,
    asyncFunctionBody: createsBoundary ? isFunction && asyncFunction : context.asyncFunctionBody,
    derivedConstructorBody: isFunction ? isConstructor && derived : context.derivedConstructorBody,
    derivedMethodBody: isFunction ? Boolean(method) && derived : context.derivedMethodBody,
    classBody: classStatement !== null || (execution !== 'function' && context.classBody),
    directSpecializedBody:
      path[0] === 'body' ? SPECIALIZED_BODY_CONTEXTS.get(statement.type) : undefined,
  }
}

function embeddedCallbackContext(context: SemanticContext): SemanticContext {
  return {
    ...context,
    nested: true,
    directEventContainer: true,
    loopDepth: 0,
    functionBody: true,
    constructorBody: context.constructorBody,
    asyncFunctionBody: false,
    derivedConstructorBody: context.derivedConstructorBody,
    derivedMethodBody: context.derivedMethodBody,
    directSpecializedBody: undefined,
  }
}

function countNodeType(value: unknown, type: string): number {
  if (Array.isArray(value)) {
    return value.reduce((total, child) => total + countNodeType(child, type), 0)
  }
  if (typeof value !== 'object' || value === null) return 0
  const record = value as Record<string, unknown>
  let total = record.type === type ? 1 : 0
  for (const [key, child] of Object.entries(record)) {
    if (key !== '__id' && key !== 'type') total += countNodeType(child, type)
  }
  return total
}

function validateDerivedConstructor(
  statement: Extract<JSStatement, { type: 'classDecl' }>,
  path: PropertyKey[],
  issues: LifecycleSemanticIssue[],
): void {
  if (!statement.superClass) return
  const explicitConstructor =
    statement.ctorId !== undefined ||
    (statement.ctorParams?.length ?? 0) > 0 ||
    statement.ctorBody.length > 0
  if (!explicitConstructor) return

  const superCalls = countNodeType(statement.ctorBody, 'superCall')
  if (statement.ctorBody[0]?.type !== 'superCall') {
    issue(
      issues,
      [...path, 'ctorBody'],
      'O construtor de uma classe derivada deve começar chamando super()',
    )
  }
  if (superCalls !== 1) {
    issue(
      issues,
      [...path, 'ctorBody'],
      'O construtor de uma classe derivada deve chamar super() exatamente uma vez',
    )
  }
}

function visitStatement(
  statement: JSStatement,
  context: SemanticContext,
  path: PropertyKey[],
  issues: LifecycleSemanticIssue[],
): void {
  // Loops de motor e eventos aninhados no fluxo são raízes do lifecycle. Uma
  // função, método ou construtor pode encapsular diretamente um listener que
  // depende dos seus parâmetros ou de `this`, mas nenhum comando intermediário
  // pode esconder esse registro.
  const nestedLifecycleRoot =
    isLoopRootStatement(statement) ||
    (isEventStatement(statement) &&
      !context.directEventContainer &&
      !(statement.type === 'gk:rpgOnStep' && context.directSpecializedBody === 'map-enter'))
  if (context.nested && nestedLifecycleRoot) {
    issue(issues, path, `A raiz “${statement.type}” deve ficar diretamente na sua Área do projeto`)
  }
  if (context.nested && START_ONLY_STATEMENT_TYPES.has(statement.type)) {
    issue(issues, path, `“${statement.type}” só pode ser usado diretamente em Ao iniciar`)
  }
  if (context.directSpecializedBody === 'g3k-mold-parts' && statement.type !== 'g3k:part') {
    issue(issues, path, 'O corpo de “Criar o molde 3D” aceita somente blocos “Peça” diretos')
  }
  validateContextDependentNode(
    statement as unknown as Record<string, unknown>,
    context,
    path,
    issues,
  )

  if (statement.type === 'classDecl') validateDerivedConstructor(statement, path, issues)

  const childBodies = programmingChildBodyEntries(statement)
  const bodyRoots = new Set(childBodies.map((entry) => String(entry.path[0])))
  for (const entry of childBodies) {
    const nestedContext = childContext(
      statement,
      entry.path,
      entry.execution,
      entry.eventObject,
      context,
    )
    entry.body.forEach((child, index) => {
      visitStatement(child, nestedContext, [...path, ...entry.path, index], issues)
    })
  }

  for (const entry of programmingEmbeddedBodyEntries(statement)) {
    const nestedContext = embeddedCallbackContext(context)
    entry.body.forEach((child, index) => {
      visitStatement(child, nestedContext, [...path, ...entry.path, index], issues)
    })
  }

  for (const [key, value] of Object.entries(statement)) {
    if (key !== '__id' && key !== 'type' && !bodyRoots.has(key)) {
      visitUnknown(value, context, [...path, key], issues)
    }
  }
}

/**
 * Repete no IR as travas da interface. Importações e a Ponte não passam pelo
 * connection checker do Blockly, portanto a gramática precisa ser validada na
 * fronteira canônica também.
 */
export function validateLifecycleSemantics(
  statement: JSStatement,
  path: PropertyKey[],
): LifecycleSemanticIssue[] {
  const issues: LifecycleSemanticIssue[] = []
  visitStatement(
    statement,
    {
      nested: false,
      directEventContainer: false,
      loopDepth: 0,
      continuousBody: false,
      eventBody: false,
      activeEventObjectBody: false,
      userGestureBody: false,
      keyboardEventBody: false,
      pointerEventBody: false,
      functionBody: false,
      constructorBody: false,
      asyncFunctionBody: false,
      derivedConstructorBody: false,
      derivedMethodBody: false,
      classBody: false,
      directSpecializedBody: undefined,
    },
    path,
    issues,
  )
  return issues
}
