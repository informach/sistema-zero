import {
  CANVAS3D_SEMANTIC_DECLARATION_FIELDS,
  CANVAS3D_SEMANTIC_PHYSICS_ID_DECLARATION_FIELDS,
  CANVAS3D_SEMANTIC_REFERENCE_FIELDS,
  type Canvas3DReferenceField,
  type Canvas3DSymbolKind,
  canvas3DSymbolKindsForClass,
} from '../three/canvas3dContract'
import {
  GAME3D_OBJECT_EXPRESSION_TYPES,
  GAME3D_SEMANTIC_DECLARATION_FIELDS,
  GAME3D_SEMANTIC_REFERENCE_FIELDS,
  type Game3DSymbolKind,
} from '../three/game3dContract'
import {
  isProgrammingStatementBodyKey,
  programmingChildBodyEntries,
  programmingEmbeddedBodyEntries,
} from './programmingExecution'
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
  threeSceneSetup: 'scene',
  threeRendererSetup: 'renderer',
  threeCameraSetup: 'camera',
  threeLightSetup: 'light',
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
  'g2d:allEnemiesGroup': 'varName',
  'g2d:loadSpritesheet': 'varName',
  'g2d:defineEnemyType': 'varName',
  'g2d:defineEnemySmart': 'varName',
  'g2d:spawnInGroup': 'varName',
  'g2d:spawnImageInGroup': 'varName',
  'g2d:spawnEnemy': 'varName',
  'g2d:createTileMap': 'varName',
  'g2d:createTileMapFromAsset': 'varName',
  'g2d:createWorld': 'varName',
  'g2d:createWorldFromTileMap': 'varName',
  'g2d:createLevel': 'varName',
  'g2d:createShip': 'varName',
  'g2d:createDino': 'varName',
  'g2d:createCity': 'varName',
  'g2d:placeThrower': 'varName',
  'g2d:createStickHero': 'varName',
  'g2d:createStickPath': 'varName',
  'g2d:createBalloon': 'varName',
  'g2d:createBalloonPath': 'varName',
  ...Object.fromEntries(
    Object.entries(GAME3D_SEMANTIC_DECLARATION_FIELDS).map(([type, declaration]) => [
      type,
      declaration.field,
    ]),
  ),
}

const IMPLICIT_VARIABLES = new Set([
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
  canvasIds: Set<string>
  canvas3d: Record<Canvas3DSymbolKind, Set<string>>
  canvas3dPhysicsBodies: Map<string, Set<string>>
  canvas3dPhysicsCharacters: Map<string, Set<string>>
  canvas3dPhysicsResources: Map<string, Set<string>>
  canvas3dImportedClasses: Set<string>
  game3d: Record<Game3DSymbolKind, Set<string>>
  classes: Set<string>
  functions: Set<string>
  functionDefinitions: Map<string, FunctionDefinition>
  checkingFunctions: Set<string>
  classDefinitions: Map<string, ClassDefinition>
  instances: Map<string, string>
  checkingClassBodies: Set<string>
}

function cloneSymbols(symbols: ProgrammingSymbols): ProgrammingSymbols {
  return {
    variables: new Set(symbols.variables),
    canvasContexts: new Set(symbols.canvasContexts),
    canvasIds: new Set(symbols.canvasIds),
    canvas3d: cloneCanvas3DSymbols(symbols.canvas3d),
    canvas3dPhysicsBodies: cloneOwnedNames(symbols.canvas3dPhysicsBodies),
    canvas3dPhysicsCharacters: cloneOwnedNames(symbols.canvas3dPhysicsCharacters),
    canvas3dPhysicsResources: cloneOwnedNames(symbols.canvas3dPhysicsResources),
    canvas3dImportedClasses: new Set(symbols.canvas3dImportedClasses),
    game3d: cloneGame3DSymbols(symbols.game3d),
    classes: new Set(symbols.classes),
    functions: new Set(symbols.functions),
    functionDefinitions: new Map(symbols.functionDefinitions),
    checkingFunctions: new Set(symbols.checkingFunctions),
    classDefinitions: new Map(symbols.classDefinitions),
    instances: new Map(symbols.instances),
    checkingClassBodies: new Set(symbols.checkingClassBodies),
  }
}

/**
 * Combina o escopo atual com nomes que estarão disponíveis quando a execução
 * retornar ao callback/continuação. O escopo atual vence em mapas para manter
 * o shadowing léxico; o futuro só acrescenta declarações ainda não vistas.
 */
function mergeFutureSymbols(
  current: ProgrammingSymbols,
  future: ProgrammingSymbols,
): ProgrammingSymbols {
  const merged = cloneSymbols(current)
  for (const name of future.variables) merged.variables.add(name)
  for (const name of future.canvasContexts) merged.canvasContexts.add(name)
  for (const name of future.canvasIds) merged.canvasIds.add(name)
  for (const kind of CANVAS3D_SYMBOL_KINDS) {
    for (const name of future.canvas3d[kind]) merged.canvas3d[kind].add(name)
  }
  mergeOwnedNames(merged.canvas3dPhysicsBodies, future.canvas3dPhysicsBodies)
  mergeOwnedNames(merged.canvas3dPhysicsCharacters, future.canvas3dPhysicsCharacters)
  mergeOwnedNames(merged.canvas3dPhysicsResources, future.canvas3dPhysicsResources)
  for (const kind of GAME3D_SYMBOL_KINDS) {
    for (const name of future.game3d[kind]) merged.game3d[kind].add(name)
  }
  for (const name of future.classes) merged.classes.add(name)
  for (const name of future.functions) merged.functions.add(name)
  future.functionDefinitions.forEach((definition, name) => {
    if (!merged.functionDefinitions.has(name)) merged.functionDefinitions.set(name, definition)
  })
  for (const name of future.checkingFunctions) merged.checkingFunctions.add(name)
  future.classDefinitions.forEach((definition, name) => {
    if (!merged.classDefinitions.has(name)) merged.classDefinitions.set(name, definition)
  })
  future.instances.forEach((className, name) => {
    if (!merged.instances.has(name)) merged.instances.set(name, className)
  })
  for (const name of future.checkingClassBodies) merged.checkingClassBodies.add(name)
  return merged
}

function addName(target: Set<string>, value: unknown): void {
  if (typeof value !== 'string') return
  const name = value.trim()
  if (name) target.add(name)
}

function cloneOwnedNames(
  source: ReadonlyMap<string, ReadonlySet<string>>,
): Map<string, Set<string>> {
  return new Map([...source].map(([owner, names]) => [owner, new Set(names)]))
}

function mergeOwnedNames(
  target: Map<string, Set<string>>,
  source: ReadonlyMap<string, ReadonlySet<string>>,
): void {
  source.forEach((names, owner) => {
    const owned = target.get(owner) ?? new Set<string>()
    for (const name of names) owned.add(name)
    target.set(owner, owned)
  })
}

function addOwnedName(
  target: Map<string, Set<string>>,
  ownerValue: unknown,
  nameValue: unknown,
): void {
  if (typeof ownerValue !== 'string' || typeof nameValue !== 'string') return
  const owner = ownerValue.trim()
  const name = nameValue.trim()
  if (!owner || !name) return
  const owned = target.get(owner) ?? new Set<string>()
  owned.add(name)
  target.set(owner, owned)
}

const GAME3D_SYMBOL_KINDS: readonly Game3DSymbolKind[] = ['world', 'object', 'group', 'swarm']

function emptyGame3DSymbols(): Record<Game3DSymbolKind, Set<string>> {
  return Object.fromEntries(GAME3D_SYMBOL_KINDS.map((kind) => [kind, new Set<string>()])) as Record<
    Game3DSymbolKind,
    Set<string>
  >
}

function cloneGame3DSymbols(
  symbols: Readonly<Record<Game3DSymbolKind, ReadonlySet<string>>>,
): Record<Game3DSymbolKind, Set<string>> {
  return Object.fromEntries(
    GAME3D_SYMBOL_KINDS.map((kind) => [kind, new Set(symbols[kind])]),
  ) as Record<Game3DSymbolKind, Set<string>>
}

const CANVAS3D_SYMBOL_KINDS: readonly Canvas3DSymbolKind[] = [
  'scene3d',
  'renderer3d',
  'camera3d',
  'perspective-camera3d',
  'light3d',
  'composer3d',
  'object3d',
  'loader3d',
  'model-loader3d',
  'audio-loader3d',
  'water3d',
  'grass3d',
  'instanced-mesh3d',
  'color-target3d',
  'shadow-caster3d',
  'shadow-receiver3d',
  'physics-collider3d',
  'physics-city3d',
  'physics-world',
]

function emptyCanvas3DSymbols(): Record<Canvas3DSymbolKind, Set<string>> {
  return Object.fromEntries(
    CANVAS3D_SYMBOL_KINDS.map((kind) => [kind, new Set<string>()]),
  ) as Record<Canvas3DSymbolKind, Set<string>>
}

function cloneCanvas3DSymbols(
  symbols: Readonly<Record<Canvas3DSymbolKind, ReadonlySet<string>>>,
): Record<Canvas3DSymbolKind, Set<string>> {
  return Object.fromEntries(
    CANVAS3D_SYMBOL_KINDS.map((kind) => [kind, new Set(symbols[kind])]),
  ) as Record<Canvas3DSymbolKind, Set<string>>
}

function addCanvas3DSymbols(
  symbols: ProgrammingSymbols,
  value: unknown,
  kinds: readonly Canvas3DSymbolKind[],
): void {
  for (const kind of kinds) addName(symbols.canvas3d[kind], value)
}

function removeCanvas3DSymbolName(symbols: ProgrammingSymbols, rawName: unknown): void {
  if (typeof rawName !== 'string') return
  const name = rawName.trim()
  if (!name) return
  for (const kind of CANVAS3D_SYMBOL_KINDS) symbols.canvas3d[kind].delete(name)
  symbols.canvas3dImportedClasses.delete(name)
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

const CANVAS3D_REFERENCE_LABELS: Readonly<Record<Canvas3DSymbolKind, string>> = {
  scene3d: 'cena 3D',
  renderer3d: 'renderizador 3D',
  camera3d: 'câmera 3D',
  'perspective-camera3d': 'câmera de perspectiva 3D',
  light3d: 'luz 3D',
  composer3d: 'compositor de efeitos',
  object3d: 'objeto 3D',
  loader3d: 'carregador 3D',
  'model-loader3d': 'carregador de modelo 3D',
  'audio-loader3d': 'carregador de áudio 3D',
  water3d: 'água 3D',
  grass3d: 'grama 3D',
  'instanced-mesh3d': 'malha de cópias 3D',
  'color-target3d': 'material ou luz 3D',
  'shadow-caster3d': 'objeto que projeta sombra',
  'shadow-receiver3d': 'objeto que recebe sombra',
  'physics-collider3d': 'objeto com dados de colisão',
  'physics-city3d': 'cidade com mapa de colisão',
  'physics-world': 'mundo físico',
}

const EMPTY_NAMES: ReadonlySet<string> = new Set()

function validateCanvas3DReferences(
  type: string,
  record: Record<string, unknown>,
  symbols: ProgrammingSymbols,
  path: (string | number)[],
  issues: ProgrammingReferenceIssue[],
): void {
  const loaderKind: Canvas3DSymbolKind =
    record.resourceKind === 'audio' ? 'audio-loader3d' : 'model-loader3d'
  const references: readonly Canvas3DReferenceField[] =
    type === 'loaderLoad'
      ? [{ field: 'loaderVar', kind: loaderKind }]
      : (CANVAS3D_SEMANTIC_REFERENCE_FIELDS[type] ?? [])
  for (const reference of references) {
    const value = record[reference.field]
    if (typeof value !== 'string' || !value.trim()) continue
    const name = value.trim()
    let available: ReadonlySet<string>
    let label: string
    if (reference.kind === 'canvas') {
      available = symbols.canvasIds
      label = 'tela Canvas'
    } else if (reference.kind === 'function') {
      available = symbols.functions
      label = 'função'
      if (IMPLICIT_FUNCTIONS.has(name)) continue
    } else if (
      reference.kind === 'physics-body-id' ||
      reference.kind === 'physics-character-id' ||
      reference.kind === 'physics-resource-id'
    ) {
      const owner = reference.ownerField
      const world = owner && typeof record[owner] === 'string' ? record[owner].trim() : ''
      available =
        (reference.kind === 'physics-body-id'
          ? symbols.canvas3dPhysicsBodies
          : reference.kind === 'physics-character-id'
            ? symbols.canvas3dPhysicsCharacters
            : symbols.canvas3dPhysicsResources
        ).get(world) ?? EMPTY_NAMES
      label =
        reference.kind === 'physics-body-id'
          ? 'corpo deste mundo físico'
          : reference.kind === 'physics-character-id'
            ? 'personagem deste mundo físico'
            : 'item deste mundo físico'
    } else {
      available = symbols.canvas3d[reference.kind]
      label = CANVAS3D_REFERENCE_LABELS[reference.kind]
    }
    if (!available.has(name)) {
      issues.push({
        path: [...path, reference.field],
        message: `O recurso “${name}” não está disponível como ${label} neste ponto`,
      })
    }
  }
}

function validateCanvas3DPhysicsIdDeclarations(
  statement: JSStatement,
  symbols: ProgrammingSymbols,
  path: (string | number)[],
  issues: ProgrammingReferenceIssue[],
): void {
  const checked = new Set<string>()
  const fields = new Map(Object.entries(statement))
  for (const declaration of CANVAS3D_SEMANTIC_PHYSICS_ID_DECLARATION_FIELDS[statement.type] ?? []) {
    const ownerValue = fields.get(declaration.ownerField)
    const idValue = fields.get(declaration.field)
    if (typeof ownerValue !== 'string' || typeof idValue !== 'string') continue
    const world = ownerValue.trim()
    const id = idValue.trim()
    const key = `${world}\0${id}`
    if (!world || !id || checked.has(key)) continue
    checked.add(key)
    const alreadyClaimed =
      symbols.canvas3dPhysicsBodies.get(world)?.has(id) === true ||
      symbols.canvas3dPhysicsResources.get(world)?.has(id) === true
    if (alreadyClaimed) {
      issues.push({
        path: [...path, declaration.field],
        message: `O nome físico “${id}” já existe neste mundo. Escolha outro nome.`,
      })
    }
  }
}

const GAME3D_REFERENCE_LABELS: Readonly<Record<Game3DSymbolKind, string>> = {
  world: 'mundo do Jogo 3D',
  object: 'objeto do Jogo 3D',
  group: 'grupo do Jogo 3D',
  swarm: 'enxame do Jogo 3D',
}

function validateGame3DReferences(
  type: string,
  record: Record<string, unknown>,
  symbols: ProgrammingSymbols,
  path: (string | number)[],
  issues: ProgrammingReferenceIssue[],
): void {
  for (const reference of GAME3D_SEMANTIC_REFERENCE_FIELDS[type] ?? []) {
    const value = record[reference.field]
    if (typeof value !== 'string' || !value.trim()) continue
    const name = value.trim()
    const acceptsCanvas3DObject =
      reference.kind === 'object' && reference.objectScope !== 'game-world-object'
    const isCanvas3DObject = acceptsCanvas3DObject && symbols.canvas3d.object3d.has(name)
    if (!symbols.game3d[reference.kind].has(name) && !isCanvas3DObject) {
      const label =
        reference.kind === 'object' && reference.objectScope === 'game-world-object'
          ? 'objeto que pertence a um mundo do Jogo 3D'
          : GAME3D_REFERENCE_LABELS[reference.kind]
      issues.push({
        path: [...path, reference.field],
        message: `O ${label} “${name}” ainda não foi criado neste ponto`,
      })
    }
  }
}

function validateValue(
  value: unknown,
  symbols: ProgrammingSymbols,
  futureSymbols: ProgrammingSymbols,
  path: (string | number)[],
  issues: ProgrammingReferenceIssue[],
): void {
  if (Array.isArray(value)) {
    value.forEach((child, index) => {
      validateValue(child, symbols, futureSymbols, [...path, index], issues)
    })
    return
  }
  if (typeof value !== 'object' || value === null) return
  const record = value as Record<string, unknown>
  const type = typeof record.type === 'string' ? record.type : ''

  validateCanvas3DReferences(type, record, symbols, path, issues)
  validateGame3DReferences(type, record, symbols, path, issues)

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
    validateCalledFunction(record.name, symbols, futureSymbols, path, issues)
  }
  if (type === 'newExpr' && !hasText(record.namespace)) {
    validateConstructedClass(record.className, symbols, futureSymbols, path, issues)
  }
  if (
    type === 'callMethodExpr' &&
    typeof record.objectVar === 'string' &&
    typeof record.method === 'string'
  ) {
    validateCalledMethod(record.objectVar, record.method, symbols, futureSymbols, path, issues)
  }

  if (
    (type === 'arrayMap' || type === 'arrayFind' || type === 'arrayFilter') &&
    typeof record.itemName === 'string'
  ) {
    const nested = cloneSymbols(symbols)
    const nestedFuture = cloneSymbols(futureSymbols)
    addName(nested.variables, record.itemName)
    addName(nestedFuture.variables, record.itemName)
    for (const [key, child] of Object.entries(record)) {
      if (key === 'transform' || key === 'cond') {
        validateValue(child, nested, nestedFuture, [...path, key], issues)
      } else if (key !== '__id' && key !== 'type' && key !== 'itemName' && key !== 'arrayVar') {
        validateValue(child, symbols, futureSymbols, [...path, key], issues)
      }
    }
    return
  }

  if (type === 'newPromise' && typeof record.param === 'string' && Array.isArray(record.body)) {
    const nested = cloneSymbols(symbols)
    const nestedFuture = cloneSymbols(futureSymbols)
    addName(nested.functions, record.param)
    addName(nestedFuture.functions, record.param)
    validateStatements(
      record.body as JSStatement[],
      nested,
      nestedFuture,
      nestedFuture,
      [...path, 'body'],
      issues,
    )
    return
  }

  for (const [key, child] of Object.entries(record)) {
    if (
      key === '__id' ||
      key === 'type' ||
      key === 'arrayVar' ||
      key === 'className' ||
      key === 'superClass' ||
      isProgrammingStatementBodyKey(key)
    ) {
      continue
    }
    if (key === 'elseif' && Array.isArray(child)) {
      child.forEach((branch, index) => {
        if (branch && typeof branch === 'object') {
          validateValue(
            (branch as Record<string, unknown>).cond,
            symbols,
            futureSymbols,
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
            futureSymbols,
            [...path, 'cases', index, 'match'],
            issues,
          )
        }
      })
      continue
    }
    validateValue(child, symbols, futureSymbols, [...path, key], issues)
  }
}

function validateCalledFunction(
  rawName: string,
  symbols: ProgrammingSymbols,
  futureSymbols: ProgrammingSymbols,
  path: (string | number)[],
  issues: ProgrammingReferenceIssue[],
): void {
  const name = rawName.trim()
  const definition = symbols.functionDefinitions.get(name)
  if (!definition || symbols.checkingFunctions.has(name)) return

  const callSymbols = cloneSymbols(symbols)
  const callFutureSymbols = mergeFutureSymbols(callSymbols, futureSymbols)
  callSymbols.checkingFunctions.add(name)
  callFutureSymbols.checkingFunctions.add(name)
  definition.params.forEach((parameter) => {
    addName(callSymbols.variables, parameter)
    addName(callFutureSymbols.variables, parameter)
  })
  validateStatements(
    definition.body,
    callSymbols,
    callFutureSymbols,
    callFutureSymbols,
    [...path, 'body'],
    issues,
  )
}

function validateConstructedClass(
  rawName: unknown,
  symbols: ProgrammingSymbols,
  futureSymbols: ProgrammingSymbols,
  path: (string | number)[],
  issues: ProgrammingReferenceIssue[],
): void {
  if (typeof rawName !== 'string') return
  const name = rawName.trim()
  const definition = symbols.classDefinitions.get(name)
  const guard = `constructor:${name}`
  if (!definition || symbols.checkingClassBodies.has(guard)) return

  const callSymbols = cloneSymbols(symbols)
  const callFutureSymbols = mergeFutureSymbols(callSymbols, futureSymbols)
  callSymbols.checkingClassBodies.add(guard)
  callFutureSymbols.checkingClassBodies.add(guard)
  if (definition.superClass) {
    validateConstructedClass(definition.superClass, callSymbols, callFutureSymbols, path, issues)
  }
  definition.ctorParams.forEach((parameter) => {
    addName(callSymbols.variables, parameter)
    addName(callFutureSymbols.variables, parameter)
  })
  validateStatements(
    definition.ctorBody,
    callSymbols,
    callFutureSymbols,
    callFutureSymbols,
    [...path, 'ctorBody'],
    issues,
  )
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
  futureSymbols: ProgrammingSymbols,
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
  const callFutureSymbols = mergeFutureSymbols(callSymbols, futureSymbols)
  callSymbols.checkingClassBodies.add(guard)
  callFutureSymbols.checkingClassBodies.add(guard)
  resolved.method.params.forEach((parameter) => {
    addName(callSymbols.variables, parameter)
    addName(callFutureSymbols.variables, parameter)
  })
  validateStatements(
    resolved.method.body,
    callSymbols,
    callFutureSymbols,
    callFutureSymbols,
    [...path, 'body'],
    issues,
  )
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
    if (statement.type === 'importNamed') {
      statement.names.forEach((name) => {
        addName(symbols.functions, name)
        addName(symbols.variables, name)
        addName(symbols.classes, name)
        if (statement.module === 'three' || statement.module.startsWith('three/addons/')) {
          addName(symbols.canvas3dImportedClasses, name)
        }
      })
    }
    if (statement.type === 'importStar') addName(symbols.variables, statement.name)
  }
}

function addStatementDeclarations(statement: JSStatement, symbols: ProgrammingSymbols): void {
  const record = statement as unknown as Record<string, unknown>
  const field = VARIABLE_DECLARATION_FIELDS[statement.type]
  if (field) {
    addName(symbols.variables, record[field])
    if (typeof record[field] === 'string') symbols.instances.delete(record[field].trim())
  }
  const game3dDeclaration = GAME3D_SEMANTIC_DECLARATION_FIELDS[statement.type]
  if (game3dDeclaration) {
    addName(symbols.game3d[game3dDeclaration.kind], record[game3dDeclaration.field])
  }
  if (statement.type === 'importNamed') {
    statement.names.forEach((name) => {
      addName(symbols.variables, name)
      addName(symbols.classes, name)
      if (statement.module === 'three' || statement.module.startsWith('three/addons/')) {
        addName(symbols.canvas3dImportedClasses, name)
      }
    })
  }
  if (statement.type === 'importStar') {
    addName(symbols.variables, statement.name)
    symbols.instances.delete(statement.name.trim())
  }
  // A função do terreno fecha sobre constantes inicializadas pelo próprio bloco.
  // Diferente de uma declaração de função comum, ela só é segura depois do preparo.
  if (statement.type === 'terrainSetup') addName(symbols.functions, statement.heightFunction)
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

  for (const declaration of CANVAS3D_SEMANTIC_DECLARATION_FIELDS[statement.type] ?? []) {
    addCanvas3DSymbols(symbols, record[declaration.field], declaration.kinds)
  }

  const physicsWorld = typeof record.world === 'string' ? record.world.trim() : ''
  if (statement.type === 'physicsLiteClear' && physicsWorld) {
    symbols.canvas3dPhysicsBodies.delete(physicsWorld)
    symbols.canvas3dPhysicsCharacters.delete(physicsWorld)
    symbols.canvas3dPhysicsResources.delete(physicsWorld)
  } else if (
    statement.type === 'physicsLiteRemove' &&
    physicsWorld &&
    typeof record.id === 'string'
  ) {
    const id = record.id.trim()
    symbols.canvas3dPhysicsBodies.get(physicsWorld)?.delete(id)
    symbols.canvas3dPhysicsCharacters.get(physicsWorld)?.delete(id)
    symbols.canvas3dPhysicsResources.get(physicsWorld)?.delete(id)
  }
  if (statement.type === 'physicsLiteBody' && record.kind === 'character') {
    addOwnedName(symbols.canvas3dPhysicsCharacters, record.world, record.id)
  }
  for (const declaration of CANVAS3D_SEMANTIC_PHYSICS_ID_DECLARATION_FIELDS[statement.type] ?? []) {
    for (const kind of declaration.kinds) {
      addOwnedName(
        kind === 'body' ? symbols.canvas3dPhysicsBodies : symbols.canvas3dPhysicsResources,
        record[declaration.ownerField],
        record[declaration.field],
      )
    }
  }

  if (statement.type === 'newInstance') {
    const namespace = statement.namespace?.trim() ?? ''
    if (
      namespace === 'THREE' ||
      (!namespace && symbols.canvas3dImportedClasses.has(statement.className.trim()))
    ) {
      addCanvas3DSymbols(
        symbols,
        statement.varName,
        canvas3DSymbolKindsForClass(
          namespace ? `${namespace}.${statement.className}` : statement.className,
        ),
      )
    }
  }

  const declaredName = field && typeof record[field] === 'string' ? record[field].trim() : ''
  const value = record.value
  const valueType =
    value &&
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>).type === 'string'
      ? String((value as Record<string, unknown>).type)
      : ''
  if (declaredName && GAME3D_OBJECT_EXPRESSION_TYPES.has(valueType)) {
    addName(symbols.game3d.object, declaredName)
  }
  if (statement.type === 'newInstance' && !statement.namespace?.trim()) {
    symbols.instances.set(statement.varName.trim(), statement.className.trim())
  } else if (
    declaredName &&
    value &&
    typeof value === 'object' &&
    (value as Record<string, unknown>).type === 'newExpr' &&
    hasText((value as Record<string, unknown>).className)
  ) {
    const expression = value as Record<string, unknown>
    const className = String(expression.className).trim()
    const namespace = hasText(expression.namespace) ? String(expression.namespace).trim() : ''
    if (!namespace) symbols.instances.set(declaredName, className)
    if (namespace === 'THREE' || (!namespace && symbols.canvas3dImportedClasses.has(className))) {
      const qualifiedClassName = namespace ? `${namespace}.${className}` : className
      addCanvas3DSymbols(symbols, declaredName, canvas3DSymbolKindsForClass(qualifiedClassName))
    }
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

/**
 * Foto imutável dos nomes Canvas 3D visíveis antes de executar um statement.
 * A Bridge e as regras de lifecycle consomem o mesmo contexto léxico usado
 * pelos seletores, sem inferir o domínio pela presença global de Three.js.
 */
export interface Canvas3DStatementContext {
  symbols: Readonly<Record<Canvas3DSymbolKind, ReadonlySet<string>>>
  importedClasses: ReadonlySet<string>
}

export type Canvas3DStatementContextIndex = WeakMap<JSStatement, Canvas3DStatementContext>

function snapshotCanvas3DContext(symbols: ProgrammingSymbols): Canvas3DStatementContext {
  return {
    symbols: cloneCanvas3DSymbols(symbols.canvas3d),
    importedClasses: new Set(symbols.canvas3dImportedClasses),
  }
}

export function canvas3DContextHasSymbol(
  context: Canvas3DStatementContext | undefined,
  rawName: string,
  kind: Canvas3DSymbolKind,
): boolean {
  const name = rawName.trim()
  return Boolean(name && context?.symbols[kind].has(name))
}

export function canvas3DContextHasImportedClass(
  context: Canvas3DStatementContext | undefined,
  rawName: string,
): boolean {
  const name = rawName.trim()
  return Boolean(name && context?.importedClasses.has(name))
}

/** Aplica somente as mudanças de binding que afetam a classificação Canvas 3D. */
function applyCanvas3DContextDeclarations(
  statement: JSStatement,
  symbols: ProgrammingSymbols,
): void {
  for (const declaration of statementDeclarations(statement)) {
    removeCanvas3DSymbolName(symbols, declaration.name)
  }
  if (statement.type === 'assign') removeCanvas3DSymbolName(symbols, statement.name)

  addStatementDeclarations(statement, symbols)

  if (statement.type !== 'assign' || statement.value.type !== 'newExpr') return
  const namespace = statement.value.namespace?.trim() ?? ''
  const className = statement.value.className.trim()
  if (namespace === 'THREE' || (!namespace && symbols.canvas3dImportedClasses.has(className))) {
    addCanvas3DSymbols(
      symbols,
      statement.name,
      canvas3DSymbolKindsForClass(namespace ? `${namespace}.${className}` : className),
    )
  }
}

function addCanvas3DChildLocals(symbols: ProgrammingSymbols, names: readonly string[]): void {
  for (const name of names) {
    removeCanvas3DSymbolName(symbols, name)
    addName(symbols.variables, name)
  }
}

function indexCanvas3DStatements(
  statements: JSStatement[],
  inherited: ProgrammingSymbols,
  callbackBase: ProgrammingSymbols,
  suspensionBase: ProgrammingSymbols,
  index: Canvas3DStatementContextIndex,
): void {
  let symbols = cloneSymbols(inherited)
  hoistFunctions(statements, symbols)

  const afterSequenceSymbols = mergeFutureSymbols(symbols, callbackBase)
  for (const statement of statements) {
    applyCanvas3DContextDeclarations(statement, afterSequenceSymbols)
  }
  hoistFunctions(statements, afterSequenceSymbols)

  for (const statement of statements) {
    index.set(statement, snapshotCanvas3DContext(symbols))

    for (const child of programmingChildBodyEntries(statement)) {
      const childSymbols = cloneSymbols(
        child.timing === 'immediate' ? symbols : afterSequenceSymbols,
      )
      const childCallbackBase = cloneSymbols(afterSequenceSymbols)
      const childSuspensionBase = cloneSymbols(
        child.timing === 'immediate' ? suspensionBase : afterSequenceSymbols,
      )
      addCanvas3DChildLocals(childSymbols, child.localVariables)
      addCanvas3DChildLocals(childCallbackBase, child.localVariables)
      addCanvas3DChildLocals(childSuspensionBase, child.localVariables)
      if (statement.type === 'classDecl') {
        addCanvas3DChildLocals(childSymbols, [statement.name])
        addCanvas3DChildLocals(childCallbackBase, [statement.name])
        addCanvas3DChildLocals(childSuspensionBase, [statement.name])
      }
      indexCanvas3DStatements(
        child.body,
        childSymbols,
        childCallbackBase,
        childSuspensionBase,
        index,
      )
    }

    for (const embedded of programmingEmbeddedBodyEntries(statement)) {
      indexCanvas3DStatements(embedded.body, symbols, afterSequenceSymbols, suspensionBase, index)
    }

    applyCanvas3DContextDeclarations(statement, symbols)
    if (statement.type === 'awaitStmt') {
      symbols = mergeFutureSymbols(symbols, suspensionBase)
    }
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
  if (statement.type === 'terrainSetup' && statement.heightFunction.trim()) {
    declarations.push({ name: statement.heightFunction.trim(), path: ['heightFunction'] })
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
  callbackBase: ProgrammingSymbols,
  suspensionBase: ProgrammingSymbols,
  path: (string | number)[],
  issues: ProgrammingReferenceIssue[],
): void {
  let symbols = cloneSymbols(inherited)
  const declaredHere = new Map<string, string>()
  hoistFunctions(statements, symbols)
  const afterSequenceSymbols = mergeFutureSymbols(symbols, callbackBase)
  for (const statement of statements) addStatementDeclarations(statement, afterSequenceSymbols)
  hoistFunctions(statements, afterSequenceSymbols)

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
    const valueFutureSymbols =
      statement.type === 'awaitStmt'
        ? mergeFutureSymbols(symbols, suspensionBase)
        : afterSequenceSymbols
    validateCanvas3DPhysicsIdDeclarations(statement, symbols, statementPath, issues)
    validateValue(statement, symbols, valueFutureSymbols, statementPath, issues)

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
      validateConstructedClass(
        statement.className,
        symbols,
        afterSequenceSymbols,
        statementPath,
        issues,
      )
    }
    if (statement.type === 'callMethod') {
      validateCalledMethod(
        statement.objectVar,
        statement.method,
        symbols,
        afterSequenceSymbols,
        statementPath,
        issues,
      )
    }

    for (const child of programmingChildBodyEntries(statement)) {
      const childSymbols = cloneSymbols(
        child.timing === 'immediate' ? symbols : afterSequenceSymbols,
      )
      const childCallbackBase = cloneSymbols(afterSequenceSymbols)
      const childSuspensionBase = cloneSymbols(
        child.timing === 'immediate' ? suspensionBase : afterSequenceSymbols,
      )
      if (statement.type === 'funcDecl') {
        childSymbols.checkingFunctions.add(statement.name)
        childCallbackBase.checkingFunctions.add(statement.name)
        childSuspensionBase.checkingFunctions.add(statement.name)
      }
      child.localVariables.forEach((name) => {
        addName(childSymbols.variables, name)
        addName(childCallbackBase.variables, name)
        addName(childSuspensionBase.variables, name)
      })
      if (statement.type === 'g3d:forEachInSwarm') {
        addName(childSymbols.game3d.object, statement.itemName)
        addName(childCallbackBase.game3d.object, statement.itemName)
        addName(childSuspensionBase.game3d.object, statement.itemName)
      }
      child.canvasContexts.forEach((name) => {
        addName(childSymbols.canvasContexts, name)
        addName(childCallbackBase.canvasContexts, name)
        addName(childSuspensionBase.canvasContexts, name)
      })
      if (statement.type === 'classDecl') {
        addName(childSymbols.classes, statement.name)
        addName(childCallbackBase.classes, statement.name)
        addName(childSuspensionBase.classes, statement.name)
      }
      validateStatements(
        child.body,
        childSymbols,
        childCallbackBase,
        childSuspensionBase,
        [...statementPath, ...child.path],
        issues,
      )
    }

    addStatementDeclarations(statement, symbols)
    updateAssignedInstance(statement, symbols)
    if (statement.type === 'awaitStmt') {
      symbols = mergeFutureSymbols(symbols, suspensionBase)
    }
  })
}

export interface ProgrammingReferenceOptions {
  canvasIds?: Iterable<string>
  /** Pincéis já entregues por runtime de extensão (ex.: `ctx` do Jogo 2D). */
  providedCanvasContexts?: Iterable<string>
}

function createInitialProgrammingSymbols(
  options: ProgrammingReferenceOptions = {},
): ProgrammingSymbols {
  return {
    variables: new Set(IMPLICIT_VARIABLES),
    canvasContexts: new Set(options.providedCanvasContexts ?? []),
    canvasIds: new Set(options.canvasIds ?? []),
    canvas3d: emptyCanvas3DSymbols(),
    canvas3dPhysicsBodies: new Map(),
    canvas3dPhysicsCharacters: new Map(),
    canvas3dPhysicsResources: new Map(),
    canvas3dImportedClasses: new Set(),
    game3d: emptyGame3DSymbols(),
    classes: new Set(IMPLICIT_CLASSES),
    functions: new Set(IMPLICIT_FUNCTIONS),
    functionDefinitions: new Map(),
    checkingFunctions: new Set(),
    classDefinitions: new Map(),
    instances: new Map(),
    checkingClassBodies: new Set(),
  }
}

/** Indexa a visibilidade Canvas 3D por ordem, callback e escopo léxico. */
export function createCanvas3DStatementContextIndex(
  statements: JSStatement[],
): Canvas3DStatementContextIndex {
  const index: Canvas3DStatementContextIndex = new WeakMap()
  const initialSymbols = createInitialProgrammingSymbols()
  indexCanvas3DStatements(statements, initialSymbols, initialSymbols, initialSymbols, index)
  return index
}

export function validateProgrammingReferences(
  statements: JSStatement[],
  path: (string | number)[] = ['js'],
  options: ProgrammingReferenceOptions = {},
): ProgrammingReferenceIssue[] {
  const issues: ProgrammingReferenceIssue[] = []
  const initialSymbols = createInitialProgrammingSymbols(options)
  validateStatements(statements, initialSymbols, initialSymbols, initialSymbols, path, issues)
  return issues
}
