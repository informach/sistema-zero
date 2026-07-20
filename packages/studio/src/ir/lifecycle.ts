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

const LOOP_BODY_ONLY_TYPES = new Set([
  'g2d:onEnemyShotHit',
  'g2d:onGroupOverlap',
  'g2d:onSpriteGroupOverlap',
  'gk:overlapGroups',
])

const CORE_EVENT_TYPES = new Set([
  'eventHandler',
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

export function isEventStatement(statement: JSStatement): boolean {
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

export function isLoopRootStatement(statement: JSStatement): boolean {
  return LOOP_ROOT_TYPES.has(statement.type)
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

export interface LifecycleSemanticIssue {
  path: PropertyKey[]
  message: string
}

interface SemanticContext {
  nested: boolean
  loopDepth: number
  eventBody: boolean
  functionBody: boolean
  asyncFunctionBody: boolean
  derivedConstructorBody: boolean
  derivedMethodBody: boolean
  classBody: boolean
}

const STATEMENT_ARRAY_KEYS = new Set([
  'body',
  'bodyA',
  'bodyB',
  'catchBody',
  'default',
  'else',
  'errorBody',
  'finalizer',
  'handler',
  'statements',
  'then',
])

const SYNTACTIC_LOOP_TYPES = new Set(['repeat', 'while', 'doWhile', 'forOf', 'forRange', 'forEach'])

function issue(issues: LifecycleSemanticIssue[], path: PropertyKey[], message: string): void {
  issues.push({ path, message })
}

function validateContextDependentNode(
  node: Record<string, unknown>,
  context: SemanticContext,
  path: PropertyKey[],
  issues: LifecycleSemanticIssue[],
): void {
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
    case 'eventProp':
      if (!context.eventBody) {
        issue(issues, path, 'Este valor ou comando só existe dentro do corpo de um evento')
      }
      break
    case 'thisProp':
      if (!context.classBody) {
        issue(issues, path, '“this” só pode acessar propriedades dentro de uma classe')
      }
      break
  }
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
    visitUnknown(child, context, [...path, key], issues)
  }
}

function childContext(statement: JSStatement, context: SemanticContext): SemanticContext {
  return {
    ...context,
    nested: true,
    loopDepth: context.loopDepth + (SYNTACTIC_LOOP_TYPES.has(statement.type) ? 1 : 0),
    eventBody: context.eventBody || isEventStatement(statement),
  }
}

function visitStatement(
  statement: JSStatement,
  context: SemanticContext,
  path: PropertyKey[],
  issues: LifecycleSemanticIssue[],
): void {
  // Loops de motor e eventos aninhados no fluxo direto são raízes do lifecycle.
  // Uma função ou classe, porém, pode encapsular o registro de um listener que
  // depende dos seus parâmetros ou de `this`; esse registro é implementação da
  // unidade, não uma nova raiz pedagógica do projeto.
  const nestedLifecycleRoot =
    isLoopRootStatement(statement) || (isEventStatement(statement) && !context.functionBody)
  if (context.nested && nestedLifecycleRoot) {
    issue(issues, path, `A raiz “${statement.type}” deve ficar diretamente na sua Área do projeto`)
  }
  validateContextDependentNode(
    statement as unknown as Record<string, unknown>,
    context,
    path,
    issues,
  )

  if (statement.type === 'classDecl') {
    const derived = Boolean(statement.superClass)
    const constructorContext: SemanticContext = {
      ...context,
      nested: true,
      functionBody: true,
      asyncFunctionBody: false,
      derivedConstructorBody: derived,
      derivedMethodBody: false,
      classBody: true,
    }
    statement.ctorBody.forEach((child, index) => {
      visitStatement(child, constructorContext, [...path, 'ctorBody', index], issues)
    })
    statement.methods.forEach((method, methodIndex) => {
      const methodContext: SemanticContext = {
        ...context,
        nested: true,
        functionBody: true,
        asyncFunctionBody: method.async === true,
        derivedConstructorBody: false,
        derivedMethodBody: derived,
        classBody: true,
      }
      method.body.forEach((child, index) => {
        visitStatement(
          child,
          methodContext,
          [...path, 'methods', methodIndex, 'body', index],
          issues,
        )
      })
    })
    return
  }

  const nestedContext = childContext(statement, context)
  const functionContext: SemanticContext =
    statement.type === 'funcDecl'
      ? {
          ...nestedContext,
          functionBody: true,
          asyncFunctionBody: false,
          derivedConstructorBody: false,
          derivedMethodBody: false,
          classBody: false,
        }
      : nestedContext

  for (const [key, value] of Object.entries(statement)) {
    if (key === '__id' || key === 'type') continue
    if (STATEMENT_ARRAY_KEYS.has(key) && Array.isArray(value)) {
      value.forEach((child, index) => {
        visitStatement(child as JSStatement, functionContext, [...path, key, index], issues)
      })
      continue
    }
    visitUnknown(value, context, [...path, key], issues)
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
      loopDepth: 0,
      eventBody: false,
      functionBody: false,
      asyncFunctionBody: false,
      derivedConstructorBody: false,
      derivedMethodBody: false,
      classBody: false,
    },
    path,
    issues,
  )
  return issues
}
