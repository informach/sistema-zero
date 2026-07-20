import { programmingBodyTiming } from './programmingExecution'
import {
  PROGRAMMING_REFERENCE_FIELDS,
  type ProgrammingReferenceField,
} from './programmingReferenceContract'
import type { JSStatement } from './schema'

export { PROGRAMMING_REFERENCE_FIELDS } from './programmingReferenceContract'

export interface ProgrammingReferenceIssue {
  path: (string | number)[]
  message: string
}

const VARIABLE_DECLARATION_FIELDS: Readonly<Record<string, string>> = {
  var: 'name',
  declareVar: 'name',
  getProperty: 'varName',
  getAttribute: 'varName',
  querySelector: 'varName',
  querySelectorAll: 'varName',
  getElementById: 'varName',
  createElement: 'varName',
  createElementNS: 'varName',
  canvasSetup: 'varName',
  canvasGradient: 'varName',
  keyboardSimple: 'varName',
  newInstance: 'varName',
  newImage: 'varName',
  rendererResponsive: 'cleanup',
  environmentLoad: 'texture',
  bloomSetup: 'composer',
  particlesSetup: 'particles',
  waterSetup: 'water',
  grassSetup: 'grass',
  signSetup: 'sign',
  primitiveSetup: 'mesh',
  terrainSetup: 'terrain',
  roadSetup: 'road',
  buildingSetup: 'building',
  citySetup: 'city',
  physicsLiteSetup: 'world',
  physicsLiteRaycast: 'result',
  physicsLiteBodyState: 'result',
  physicsLiteStats: 'result',
  'g2d:createSprite': 'varName',
  'g2d:createImageSprite': 'varName',
  'g2d:createShapeSprite': 'varName',
  'g2d:score': 'varName',
  'g2d:collides': 'varName',
  'g2d:circleCollides': 'varName',
  'g2d:createGroup': 'varName',
  'g2d:loadSpritesheet': 'varName',
  'g2d:defineEnemyType': 'varName',
  'g2d:createTileMap': 'varName',
  'g2d:createTileMapFromAsset': 'varName',
  'g2d:createShip': 'varName',
  'g2d:createDino': 'varName',
  'g2d:createCity': 'varName',
  'g2d:placeThrower': 'varName',
  'g2d:createStickHero': 'varName',
  'g2d:createBalloon': 'varName',
  'g3d:createScene': 'varName',
  'g3d:createFullscreenScene': 'varName',
  'g3d:createGroup': 'varName',
  'g3d:createCrossingScene': 'varName',
  'g3d:createRaceScene': 'varName',
  'g3d:createStackScene': 'varName',
  'g3d:createModel': 'varName',
  'g3d:createSwarm': 'varName',
}

const IMPLICIT_VARIABLES = new Set([
  'ctx',
  'event',
  'window',
  'document',
  'Math',
  'JSON',
  'Object',
  'Array',
  'Date',
  'Promise',
  'console',
  'performance',
  'SZGame2D',
  'SZGame3D',
  'SZGameKit',
  'SZGameKit3D',
  'SZWorld3D',
  'THREE',
])

const IMPLICIT_CLASSES = new Set([
  'Array',
  'Audio',
  'Date',
  'Error',
  'Image',
  'Map',
  'Object',
  'Promise',
  'Set',
  'URL',
])

const IMPLICIT_FUNCTIONS = new Set([
  'alert',
  'cancelAnimationFrame',
  'clearInterval',
  'clearTimeout',
  'confirm',
  'fetch',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'prompt',
  'requestAnimationFrame',
  'setInterval',
  'setTimeout',
])

const STATEMENT_BODY_KEYS = new Set([
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

interface ChildStatementEntry {
  path: (string | number)[]
  body: JSStatement[]
}

interface FunctionDefinition {
  params: readonly string[]
  body: JSStatement[]
}

interface ClassMethodDefinition {
  params: readonly string[]
  body: JSStatement[]
}

interface ClassDefinition {
  superClass?: string
  ctorParams: readonly string[]
  ctorBody: JSStatement[]
  methods: ReadonlyMap<string, ClassMethodDefinition>
}

interface ProgrammingSymbols {
  variables: Set<string>
  canvasContexts: Set<string>
  classes: Set<string>
  functions: Set<string>
  functionDefinitions: Map<string, FunctionDefinition>
  checkingFunctions: Set<string>
  classDefinitions: Map<string, ClassDefinition>
  instances: Map<string, string>
  checkingClassBodies: Set<string>
}

function childStatementEntries(statement: JSStatement): ChildStatementEntry[] {
  const bodies: ChildStatementEntry[] = []
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

function cloneSymbols(symbols: ProgrammingSymbols): ProgrammingSymbols {
  return {
    variables: new Set(symbols.variables),
    canvasContexts: new Set(symbols.canvasContexts),
    classes: new Set(symbols.classes),
    functions: new Set(symbols.functions),
    functionDefinitions: new Map(symbols.functionDefinitions),
    checkingFunctions: new Set(symbols.checkingFunctions),
    classDefinitions: new Map(symbols.classDefinitions),
    instances: new Map(symbols.instances),
    checkingClassBodies: new Set(symbols.checkingClassBodies),
  }
}

function addName(target: Set<string>, value: unknown): void {
  if (typeof value !== 'string') return
  const name = value.trim()
  if (name) target.add(name)
}

function localVariablesForChild(statement: JSStatement, path: readonly PropertyKey[]): string[] {
  const first = path[0]
  switch (statement.type) {
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
  path: readonly PropertyKey[],
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

function missingIssue(
  issues: ProgrammingReferenceIssue[],
  kind: 'variável' | 'lista' | 'classe' | 'função',
  name: string,
  path: (string | number)[],
): void {
  issues.push({ path, message: `A ${kind} “${name}” ainda não foi declarada neste ponto` })
}

function validateName(
  value: unknown,
  names: ReadonlySet<string>,
  implicit: ReadonlySet<string>,
  kind: 'variável' | 'lista' | 'classe' | 'função',
  path: (string | number)[],
  issues: ProgrammingReferenceIssue[],
): void {
  if (typeof value !== 'string') return
  const name = value.trim()
  if (name && !names.has(name) && !implicit.has(name)) missingIssue(issues, kind, name, path)
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function validateReferenceField(
  record: Record<string, unknown>,
  reference: ProgrammingReferenceField,
  symbols: ProgrammingSymbols,
  path: (string | number)[],
  issues: ProgrammingReferenceIssue[],
): void {
  if (reference.when && record[reference.when.field] !== reference.when.equals) return
  if (reference.unlessPresent && hasText(record[reference.unlessPresent])) return

  switch (reference.kind) {
    case 'variable':
      validateName(
        record[reference.field],
        symbols.variables,
        IMPLICIT_VARIABLES,
        'variável',
        [...path, reference.field],
        issues,
      )
      return
    case 'list':
      validateName(
        record[reference.field],
        symbols.variables,
        IMPLICIT_VARIABLES,
        'lista',
        [...path, reference.field],
        issues,
      )
      return
    case 'class':
      validateName(
        record[reference.field],
        symbols.classes,
        IMPLICIT_CLASSES,
        'classe',
        [...path, reference.field],
        issues,
      )
      return
    case 'function':
      validateName(
        record[reference.field],
        symbols.functions,
        IMPLICIT_FUNCTIONS,
        'função',
        [...path, reference.field],
        issues,
      )
      return
  }
}

function validateCanvasContext(
  value: unknown,
  symbols: ProgrammingSymbols,
  path: (string | number)[],
  issues: ProgrammingReferenceIssue[],
): void {
  if (typeof value !== 'string') return
  const name = value.trim()
  if (name && !symbols.canvasContexts.has(name)) {
    issues.push({
      path,
      message: `O pincel “${name}” ainda não foi preparado. Use “Preparar a tela” antes de desenhar.`,
    })
  }
}

function validateValue(
  value: unknown,
  symbols: ProgrammingSymbols,
  path: (string | number)[],
  issues: ProgrammingReferenceIssue[],
): void {
  if (Array.isArray(value)) {
    value.forEach((child, index) => {
      validateValue(child, symbols, [...path, index], issues)
    })
    return
  }
  if (typeof value !== 'object' || value === null) return
  const record = value as Record<string, unknown>
  const type = typeof record.type === 'string' ? record.type : ''

  if (type.startsWith('canvas') && type !== 'canvasSetup') {
    validateCanvasContext(record.ctxVar, symbols, [...path, 'ctxVar'], issues)
  }

  if (type === 'var' && !Object.hasOwn(record, 'value')) {
    validateName(
      record.name,
      symbols.variables,
      IMPLICIT_VARIABLES,
      'variável',
      [...path, 'name'],
      issues,
    )
    return
  }

  for (const reference of PROGRAMMING_REFERENCE_FIELDS[type] ?? []) {
    validateReferenceField(record, reference, symbols, path, issues)
  }

  if ((type === 'call' || type === 'callFunction') && typeof record.name === 'string') {
    validateCalledFunction(record.name, symbols, path, issues)
  }
  if (type === 'newExpr' && !hasText(record.namespace)) {
    validateConstructedClass(record.className, symbols, path, issues)
  }
  if (
    type === 'callMethodExpr' &&
    typeof record.objectVar === 'string' &&
    typeof record.method === 'string'
  ) {
    validateCalledMethod(record.objectVar, record.method, symbols, path, issues)
  }

  if (
    (type === 'arrayMap' || type === 'arrayFind' || type === 'arrayFilter') &&
    typeof record.itemName === 'string'
  ) {
    const nested = cloneSymbols(symbols)
    addName(nested.variables, record.itemName)
    for (const [key, child] of Object.entries(record)) {
      if (key === 'transform' || key === 'cond') {
        validateValue(child, nested, [...path, key], issues)
      } else if (key !== '__id' && key !== 'type' && key !== 'itemName' && key !== 'arrayVar') {
        validateValue(child, symbols, [...path, key], issues)
      }
    }
    return
  }

  if (type === 'newPromise' && typeof record.param === 'string' && Array.isArray(record.body)) {
    const nested = cloneSymbols(symbols)
    addName(nested.functions, record.param)
    validateStatements(record.body as JSStatement[], nested, [...path, 'body'], issues)
    return
  }

  for (const [key, child] of Object.entries(record)) {
    if (
      key === '__id' ||
      key === 'type' ||
      key === 'arrayVar' ||
      key === 'className' ||
      key === 'superClass' ||
      STATEMENT_BODY_KEYS.has(key)
    ) {
      continue
    }
    if (key === 'elseif' && Array.isArray(child)) {
      child.forEach((branch, index) => {
        if (branch && typeof branch === 'object') {
          validateValue(
            (branch as Record<string, unknown>).cond,
            symbols,
            [...path, 'elseif', index, 'cond'],
            issues,
          )
        }
      })
      continue
    }
    if (key === 'cases' && Array.isArray(child)) {
      child.forEach((branch, index) => {
        if (branch && typeof branch === 'object') {
          validateValue(
            (branch as Record<string, unknown>).match,
            symbols,
            [...path, 'cases', index, 'match'],
            issues,
          )
        }
      })
      continue
    }
    validateValue(child, symbols, [...path, key], issues)
  }
}

function validateCalledFunction(
  rawName: string,
  symbols: ProgrammingSymbols,
  path: (string | number)[],
  issues: ProgrammingReferenceIssue[],
): void {
  const name = rawName.trim()
  const definition = symbols.functionDefinitions.get(name)
  if (!definition || symbols.checkingFunctions.has(name)) return

  const callSymbols = cloneSymbols(symbols)
  callSymbols.checkingFunctions.add(name)
  definition.params.forEach((parameter) => {
    addName(callSymbols.variables, parameter)
  })
  validateStatements(definition.body, callSymbols, [...path, 'body'], issues)
}

function validateConstructedClass(
  rawName: unknown,
  symbols: ProgrammingSymbols,
  path: (string | number)[],
  issues: ProgrammingReferenceIssue[],
): void {
  if (typeof rawName !== 'string') return
  const name = rawName.trim()
  const definition = symbols.classDefinitions.get(name)
  const guard = `constructor:${name}`
  if (!definition || symbols.checkingClassBodies.has(guard)) return

  const callSymbols = cloneSymbols(symbols)
  callSymbols.checkingClassBodies.add(guard)
  if (definition.superClass) {
    validateConstructedClass(definition.superClass, callSymbols, path, issues)
  }
  definition.ctorParams.forEach((parameter) => {
    addName(callSymbols.variables, parameter)
  })
  validateStatements(definition.ctorBody, callSymbols, [...path, 'ctorBody'], issues)
}

function resolveClassMethod(
  className: string,
  methodName: string,
  symbols: ProgrammingSymbols,
  visited: Set<string> = new Set(),
): { owner: string; method: ClassMethodDefinition } | undefined {
  if (visited.has(className)) return undefined
  visited.add(className)
  const definition = symbols.classDefinitions.get(className)
  if (!definition) return undefined
  const method = definition.methods.get(methodName)
  if (method) return { owner: className, method }
  return definition.superClass
    ? resolveClassMethod(definition.superClass, methodName, symbols, visited)
    : undefined
}

function validateCalledMethod(
  rawObjectName: string,
  rawMethodName: string,
  symbols: ProgrammingSymbols,
  path: (string | number)[],
  issues: ProgrammingReferenceIssue[],
): void {
  const className = symbols.instances.get(rawObjectName.trim())
  const methodName = rawMethodName.trim()
  if (!className || !methodName) return
  const resolved = resolveClassMethod(className, methodName, symbols)
  if (!resolved) return
  const guard = `method:${resolved.owner}.${methodName}`
  if (symbols.checkingClassBodies.has(guard)) return

  const callSymbols = cloneSymbols(symbols)
  callSymbols.checkingClassBodies.add(guard)
  resolved.method.params.forEach((parameter) => {
    addName(callSymbols.variables, parameter)
  })
  validateStatements(resolved.method.body, callSymbols, [...path, 'body'], issues)
}

function hoistFunctions(statements: readonly JSStatement[], symbols: ProgrammingSymbols): void {
  for (const statement of statements) {
    if (statement.type === 'funcDecl') {
      addName(symbols.functions, statement.name)
      symbols.functionDefinitions.set(statement.name.trim(), {
        params: statement.params,
        body: statement.body,
      })
    }
    if (statement.type === 'terrainSetup') addName(symbols.functions, statement.heightFunction)
    if (statement.type === 'importNamed')
      statement.names.forEach((name) => {
        addName(symbols.functions, name)
      })
  }
}

function addStatementDeclarations(statement: JSStatement, symbols: ProgrammingSymbols): void {
  const record = statement as unknown as Record<string, unknown>
  const field = VARIABLE_DECLARATION_FIELDS[statement.type]
  if (field) {
    addName(symbols.variables, record[field])
    if (typeof record[field] === 'string') symbols.instances.delete(record[field].trim())
  }
  if (statement.type === 'importNamed') {
    statement.names.forEach((name) => {
      addName(symbols.variables, name)
      addName(symbols.classes, name)
    })
  }
  if (statement.type === 'importStar') {
    addName(symbols.variables, statement.name)
    symbols.instances.delete(statement.name.trim())
  }
  if (statement.type === 'canvasSetup') {
    addName(symbols.variables, 'canvas')
    addName(symbols.canvasContexts, statement.varName)
  }
  if (statement.type === 'classDecl') {
    addName(symbols.classes, statement.name)
    symbols.classDefinitions.set(statement.name.trim(), {
      superClass: statement.superClass?.trim() || undefined,
      ctorParams: statement.ctorParams ?? [],
      ctorBody: statement.ctorBody,
      methods: new Map(
        statement.methods.map((method) => [
          method.name.trim(),
          { params: method.params, body: method.body },
        ]),
      ),
    })
  }

  const declaredName = field && typeof record[field] === 'string' ? record[field].trim() : ''
  const value = record.value
  if (statement.type === 'newInstance' && !statement.namespace?.trim()) {
    symbols.instances.set(statement.varName.trim(), statement.className.trim())
  } else if (
    declaredName &&
    value &&
    typeof value === 'object' &&
    (value as Record<string, unknown>).type === 'newExpr' &&
    !hasText((value as Record<string, unknown>).namespace) &&
    hasText((value as Record<string, unknown>).className)
  ) {
    symbols.instances.set(declaredName, String((value as Record<string, unknown>).className).trim())
  }
}

function updateAssignedInstance(statement: JSStatement, symbols: ProgrammingSymbols): void {
  if (statement.type !== 'assign') return
  const name = statement.name.trim()
  const value = statement.value as unknown as Record<string, unknown>
  if (
    value &&
    typeof value === 'object' &&
    value.type === 'newExpr' &&
    !hasText(value.namespace) &&
    hasText(value.className)
  ) {
    symbols.instances.set(name, String(value.className).trim())
  } else {
    symbols.instances.delete(name)
  }
}

interface StatementDeclaration {
  name: string
  path: (string | number)[]
}

function statementDeclarations(statement: JSStatement): StatementDeclaration[] {
  const record = statement as unknown as Record<string, unknown>
  const field = VARIABLE_DECLARATION_FIELDS[statement.type]
  const declarations: StatementDeclaration[] = []
  if (field && typeof record[field] === 'string' && record[field].trim()) {
    declarations.push({ name: record[field].trim(), path: [field] })
  }

  if (statement.type === 'importNamed') {
    statement.names.forEach((name, index) => {
      if (name.trim()) declarations.push({ name: name.trim(), path: ['names', index] })
    })
  } else if (statement.type === 'importStar' && statement.name.trim()) {
    declarations.push({ name: statement.name.trim(), path: ['name'] })
  } else if (statement.type === 'funcDecl' && statement.name.trim()) {
    declarations.push({ name: statement.name.trim(), path: ['name'] })
  } else if (statement.type === 'classDecl' && statement.name.trim()) {
    declarations.push({ name: statement.name.trim(), path: ['name'] })
  }

  return declarations
}

function validateStatements(
  statements: JSStatement[],
  inherited: ProgrammingSymbols,
  path: (string | number)[],
  issues: ProgrammingReferenceIssue[],
): void {
  const symbols = cloneSymbols(inherited)
  const declaredHere = new Map<string, string>()
  hoistFunctions(statements, symbols)
  const deferredSymbols = cloneSymbols(symbols)
  for (const statement of statements) addStatementDeclarations(statement, deferredSymbols)
  hoistFunctions(statements, deferredSymbols)

  statements.forEach((statement, index) => {
    const statementPath = [...path, index]
    for (const declaration of statementDeclarations(statement)) {
      const previousType = declaredHere.get(declaration.name)
      // O diagnóstico Canvas já prende a duplicidade aos dois blocos de
      // preparo. Deixá-la para essa camada preserva os demais avisos visuais
      // (como ids HTML repetidos) em vez de interromper no parse do schema.
      if (previousType === 'canvasSetup' && statement.type === 'canvasSetup') continue
      if (previousType) {
        issues.push({
          path: [...statementPath, ...declaration.path],
          message: `O nome “${declaration.name}” já foi declarado neste trecho. Escolha outro nome.`,
        })
      } else {
        declaredHere.set(declaration.name, statement.type)
      }
    }
    validateValue(statement, symbols, statementPath, issues)

    if (statement.type === 'assign') {
      validateName(
        statement.name,
        symbols.variables,
        IMPLICIT_VARIABLES,
        'variável',
        [...statementPath, 'name'],
        issues,
      )
    }

    if (statement.type === 'newInstance' && !statement.namespace?.trim()) {
      validateConstructedClass(statement.className, symbols, statementPath, issues)
    }
    if (statement.type === 'callMethod') {
      validateCalledMethod(statement.objectVar, statement.method, symbols, statementPath, issues)
    }

    for (const child of childStatementEntries(statement)) {
      const timing = programmingBodyTiming(statement, child.path)
      const childSymbols = cloneSymbols(timing === 'immediate' ? symbols : deferredSymbols)
      if (statement.type === 'funcDecl') childSymbols.checkingFunctions.add(statement.name)
      localVariablesForChild(statement, child.path).forEach((name) => {
        addName(childSymbols.variables, name)
      })
      localCanvasContextsForChild(statement, child.path).forEach((name) => {
        addName(childSymbols.canvasContexts, name)
      })
      if (statement.type === 'classDecl') addName(childSymbols.classes, statement.name)
      validateStatements(child.body, childSymbols, [...statementPath, ...child.path], issues)
    }

    addStatementDeclarations(statement, symbols)
    updateAssignedInstance(statement, symbols)
  })
}

export function validateProgrammingReferences(
  statements: JSStatement[],
  path: (string | number)[] = ['js'],
): ProgrammingReferenceIssue[] {
  const issues: ProgrammingReferenceIssue[] = []
  validateStatements(
    statements,
    {
      variables: new Set(IMPLICIT_VARIABLES),
      canvasContexts: new Set(),
      classes: new Set(IMPLICIT_CLASSES),
      functions: new Set(IMPLICIT_FUNCTIONS),
      functionDefinitions: new Map(),
      checkingFunctions: new Set(),
      classDefinitions: new Map(),
      instances: new Map(),
      checkingClassBodies: new Set(),
    },
    path,
    issues,
  )
  return issues
}
