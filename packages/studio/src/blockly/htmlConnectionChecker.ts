import * as Blockly from 'blockly/core'
import { htmlContentModelForBlock, isHTMLBlockChildAllowed } from '../html/catalog'
import { areaForBlockType, getBlockContract, isProjectAreaType } from './blockContracts'
import { getSuperName } from './blocks/extendsMutator'
import { getParamNames } from './blocks/paramsMutator'
import type { BehaviorArea, StatementContext } from './blocks/types'

function statementOwner(connection: Blockly.Connection): Blockly.Block | null {
  const source = connection.getSourceBlock()
  const ownsInput = source.inputList.some((input) => input.connection === connection)
  if (ownsInput) return source
  return source.getSurroundParent()
}

function ancestorTypes(block: Blockly.Block): string[] {
  const types = [block.type]
  let parent = block.getSurroundParent()
  while (parent) {
    types.push(parent.type)
    parent = parent.getSurroundParent()
  }
  return types
}

function chainFits(parent: Blockly.Block, child: Blockly.Block): boolean {
  const ancestors = ancestorTypes(parent)
  let current: Blockly.Block | null = child
  while (current) {
    if (!isHTMLBlockChildAllowed(parent.type, current.type)) return false
    if (current.type === 'sz_html_form' && ancestors.includes('sz_html_form')) return false
    current = current.getNextBlock()
  }
  return true
}

type ProgrammingRequirement =
  | 'loop'
  | 'function'
  | 'async-function'
  | 'event'
  | 'keyboard-event'
  | 'pointer-event'
  | 'derived-constructor'
  | 'derived-method'
  | 'parameter'
  | 'class-body'

function programmingRequirement(block: Blockly.Block): ProgrammingRequirement | null {
  switch (block.type) {
    case 'sz_js_break':
    case 'sz_js_continue':
      return 'loop'
    case 'sz_js_return':
    case 'sz_js_return_void':
      return 'function'
    case 'sz_js_await':
      return 'async-function'
    case 'sz_js_event_method':
      return 'event'
    case 'sz_val_event_key':
      return 'keyboard-event'
    case 'sz_val_event_pos':
      return 'pointer-event'
    case 'sz_js_super_ctor':
      return 'derived-constructor'
    case 'sz_js_super_method':
      return 'derived-method'
    case 'sz_val_arg':
      return 'parameter'
    case 'sz_val_this':
      return 'function'
    case 'sz_js_class_op':
    case 'sz_val_class_contains':
      return block.getFieldValue('TARGET_KIND') === 'this' ? 'function' : null
    case 'sz_js_set_this_prop':
    case 'sz_val_this_prop':
      return 'class-body'
    default:
      return null
  }
}

const SYNTACTIC_LOOP_TYPES = new Set([
  'sz_js_repeat',
  'sz_js_while',
  'sz_js_do_while',
  'sz_js_for_of',
  'sz_js_for_range',
  'sz_js_for_each',
])

const FUNCTION_BODY_TYPES = new Set(['sz_js_function', 'sz_js_class_method', 'sz_js_constructor'])

const KEYBOARD_EVENT_TYPES = new Set(['sz_js_on_key'])

const POINTER_EVENT_TYPES = new Set([
  'sz_js_on_click',
  'sz_js_on_click_anywhere',
  'sz_js_on_mouseover',
  'sz_js_on_mousemove',
  'sz_js_on_pointer_down',
  'sz_js_on_pointer_up',
  'sz_js_on_context_menu',
  'sz_js_element_onclick',
])

function prospectiveAncestors(
  block: Blockly.Block,
  movedRoot: Blockly.Block,
  destinationOwner: Blockly.Block,
): Blockly.Block[] {
  const ancestors: Blockly.Block[] = []
  let parent = block.getSurroundParent()
  while (parent) {
    ancestors.push(parent)
    if (parent === movedRoot) break
    parent = parent.getSurroundParent()
  }

  if (block === movedRoot || ancestors.at(-1) === movedRoot) {
    ancestors.push(destinationOwner)
    parent = destinationOwner.getSurroundParent()
    while (parent) {
      ancestors.push(parent)
      parent = parent.getSurroundParent()
    }
  }
  return ancestors
}

function isEventContainer(block: Blockly.Block): boolean {
  return getBlockContract(block.type)?.placement?.role === 'event'
}

function enclosingClass(ancestors: readonly Blockly.Block[]): Blockly.Block | null {
  return ancestors.find((block) => block.type === 'sz_js_class') ?? null
}

function requirementFits(
  block: Blockly.Block,
  requirement: ProgrammingRequirement,
  ancestors: readonly Blockly.Block[],
): boolean {
  switch (requirement) {
    case 'loop':
      return ancestors.some((ancestor) => SYNTACTIC_LOOP_TYPES.has(ancestor.type))
    case 'function':
      return ancestors.some((ancestor) => FUNCTION_BODY_TYPES.has(ancestor.type))
    case 'async-function':
      return ancestors.some(
        (ancestor) =>
          (ancestor.type === 'sz_js_class_method' || ancestor.type === 'sz_js_function') &&
          ancestor.getFieldValue('ASYNC') === 'TRUE',
      )
    case 'event':
      return ancestors.some(isEventContainer)
    case 'keyboard-event':
      return ancestors.some((ancestor) => KEYBOARD_EVENT_TYPES.has(ancestor.type))
    case 'pointer-event':
      return ancestors.some((ancestor) => POINTER_EVENT_TYPES.has(ancestor.type))
    case 'derived-constructor':
      return (
        ancestors.some((ancestor) => ancestor.type === 'sz_js_constructor') &&
        getSuperName(enclosingClass(ancestors)).length > 0
      )
    case 'derived-method':
      return (
        ancestors.some((ancestor) => ancestor.type === 'sz_js_class_method') &&
        getSuperName(enclosingClass(ancestors)).length > 0
      )
    case 'parameter': {
      const scope = ancestors.find((ancestor) => FUNCTION_BODY_TYPES.has(ancestor.type))
      if (!scope) return false
      // O Blockly conecta cada filho ANTES de restaurar seus campos. Durante a
      // desserialização, o relator ainda contém o nome padrão (`x`), embora o
      // mutator da função pai já tenha recuperado os parâmetros corretos. Nesse
      // estágio, valide apenas a existência do escopo; assim que os eventos são
      // reativados, edições e encaixes manuais continuam exigindo nome válido.
      if (!Blockly.Events.isEnabled()) return true
      return getParamNames(scope).includes(block.getFieldValue('NAME') ?? '')
    }
    case 'class-body':
      return ancestors.some(
        (ancestor) =>
          ancestor.type === 'sz_js_class_method' || ancestor.type === 'sz_js_constructor',
      )
  }
}

function directClassConstructors(classBlock: Blockly.Block): Blockly.Block[] {
  const constructors: Blockly.Block[] = []
  let member = classBlock.getInputTargetBlock('MEMBERS')
  while (member) {
    if (member.type === 'sz_js_constructor') constructors.push(member)
    member = member.getNextBlock()
  }
  return constructors
}

function constructorsInChain(root: Blockly.Block): number {
  let count = 0
  let current: Blockly.Block | null = root
  while (current) {
    if (current.type === 'sz_js_constructor') count += 1
    current = current.getNextBlock()
  }
  return count
}

function surroundingClass(block: Blockly.Block | null): Blockly.Block | null {
  let current = block
  while (current) {
    if (current.type === 'sz_js_class') return current
    current = current.getSurroundParent()
  }
  return null
}

function isInsideBlock(block: Blockly.Block, expectedAncestor: Blockly.Block): boolean {
  let current: Blockly.Block | null = block
  while (current) {
    if (current === expectedAncestor) return true
    current = current.getSurroundParent()
  }
  return false
}

/** Classes JavaScript aceitam exatamente zero ou um construtor. */
function constructorCardinalityFits(
  destinationOwner: Blockly.Block,
  movedRoot: Blockly.Block,
): boolean {
  for (const block of movedRoot.getDescendants(false)) {
    if (block.type === 'sz_js_class' && directClassConstructors(block).length > 1) return false
  }

  const destinationClass = surroundingClass(destinationOwner)
  if (!destinationClass || movedRoot.getSurroundParent() === destinationClass) return true
  return directClassConstructors(destinationClass).length + constructorsInChain(movedRoot) <= 1
}

function countDescendantsOfType(root: Blockly.Block | null, type: string): number {
  if (!root) return 0
  return root.getDescendants(false).filter((block) => block.type === type).length
}

function derivedClassIsComplete(classBlock: Blockly.Block): boolean {
  if (!getSuperName(classBlock)) return true
  const [constructorBlock] = directClassConstructors(classBlock)
  if (!constructorBlock) return true // O construtor padrão do JavaScript chama super().
  const first = constructorBlock.getInputTargetBlock('BODY')
  return (
    first?.type === 'sz_js_super_ctor' && countDescendantsOfType(first, 'sz_js_super_ctor') === 1
  )
}

/**
 * Ao ancorar uma classe no projeto, seu construtor derivado já precisa formar
 * JavaScript executável: `super()` é o primeiro comando e aparece uma única vez.
 */
function derivedConstructorsFit(
  destinationOwner: Blockly.Block,
  movedRoot: Blockly.Block,
): boolean {
  const prospectiveArea = ancestorTypes(destinationOwner).some(isProjectAreaType)
  if (!prospectiveArea) return true

  const classes = movedRoot.getDescendants(false).filter((block) => block.type === 'sz_js_class')
  const enclosing = surroundingClass(destinationOwner)
  if (enclosing && !classes.includes(enclosing)) classes.push(enclosing)
  if (!classes.every(derivedClassIsComplete)) return false
  if (!enclosing || !getSuperName(enclosing)) return true

  // Uma classe derivada já ancorada pode receber seu construtor ou novos
  // comandos depois. Valide a árvore prospectiva, não apenas a árvore atual.
  if (movedRoot.type === 'sz_js_constructor') {
    const first = movedRoot.getInputTargetBlock('BODY')
    return (
      first?.type === 'sz_js_super_ctor' && countDescendantsOfType(first, 'sz_js_super_ctor') === 1
    )
  }
  const [constructorBlock] = directClassConstructors(enclosing)
  if (!constructorBlock) return true
  if (!isInsideBlock(destinationOwner, constructorBlock)) return true

  const currentFirst = constructorBlock.getInputTargetBlock('BODY')
  const prospectiveFirst = currentFirst ?? movedRoot
  const existingSuperCalls = countDescendantsOfType(currentFirst, 'sz_js_super_ctor')
  const addedSuperCalls = countDescendantsOfType(movedRoot, 'sz_js_super_ctor')
  return prospectiveFirst.type === 'sz_js_super_ctor' && existingSuperCalls + addedSuperCalls === 1
}

function programmingTreeFits(destinationOwner: Blockly.Block, movedRoot: Blockly.Block): boolean {
  for (const block of movedRoot.getDescendants(false)) {
    const requirement = programmingRequirement(block)
    if (!requirement) continue
    const ancestors = prospectiveAncestors(block, movedRoot, destinationOwner)
    if (requirementFits(block, requirement, ancestors)) continue
    // Pilhas ainda soltas são rascunhos montáveis. A validação torna-se rígida
    // quando a árvore entra numa Área do projeto.
    if (!ancestors.some((ancestor) => isProjectAreaType(ancestor.type))) continue
    return false
  }
  return true
}

function nestedStatementContexts(ancestors: readonly Blockly.Block[]): Set<StatementContext> {
  const contexts = new Set<StatementContext>(['statement'])
  for (const ancestor of ancestors) {
    const placement = getBlockContract(ancestor.type)?.placement
    if (placement?.role === 'event') contexts.add('event-body')
    if (placement?.role === 'loop' || SYNTACTIC_LOOP_TYPES.has(ancestor.type)) {
      contexts.add('loop-body')
    }
    if (ancestor.type === 'sz_js_class_method') {
      contexts.add('function-body')
      if (ancestor.getFieldValue('ASYNC') === 'TRUE') contexts.add('async-function-body')
      if (getSuperName(enclosingClass(ancestors)).length > 0) contexts.add('derived-method-body')
    }
    if (ancestor.type === 'sz_js_constructor') {
      contexts.add('function-body')
      if (getSuperName(enclosingClass(ancestors)).length > 0) {
        contexts.add('derived-constructor-body')
      }
    }
    if (ancestor.type === 'sz_js_function') {
      contexts.add('function-body')
      if (ancestor.getFieldValue('ASYNC') === 'TRUE') contexts.add('async-function-body')
    }
    if (ancestor.type === 'sz_js_class') contexts.add('class-member')
  }
  return contexts
}

function placementFits(destinationOwner: Blockly.Block, movedRoot: Blockly.Block): boolean {
  for (const block of movedRoot.getDescendants(false)) {
    const contract = getBlockContract(block.type)
    const placement = contract?.domain === 'behavior' ? contract.placement : undefined
    if (!placement || placement.role === 'value') continue

    const ancestors = prospectiveAncestors(block, movedRoot, destinationOwner)
    const areaIndex = ancestors.findIndex((ancestor) => isProjectAreaType(ancestor.type))
    const containers = areaIndex >= 0 ? ancestors.slice(0, areaIndex) : ancestors

    if (containers.length === 0 && areaIndex >= 0) {
      const area = areaForBlockType(ancestors[areaIndex]?.type ?? '') as BehaviorArea | undefined
      if (!area || !placement.root.includes(area)) return false
      continue
    }

    const contexts = nestedStatementContexts(containers)
    if (placement.forbiddenNested?.some((context) => contexts.has(context))) return false
    if (placement.nested.some((context) => contexts.has(context))) continue

    // Eventos e loops de raiz nunca podem ser embrulhados. Para comandos
    // dependentes de contexto (break/return/await), a pilha solta continua
    // montável e fica rígida quando for ancorada numa Área do projeto.
    if (
      areaIndex >= 0 ||
      (placement.root.length > 0 && (placement.role === 'event' || placement.role === 'loop'))
    ) {
      return false
    }
  }
  return true
}

/**
 * Acrescenta o modelo de conteúdo HTML às verificações nativas do Blockly.
 * Pilhas soltas continuam livres para a criança organizar; ao encaixá-las num
 * contêiner, a pilha inteira precisa caber naquele conteúdo.
 */
export class HTMLConnectionChecker extends Blockly.ConnectionChecker {
  override doTypeChecks(a: Blockly.Connection, b: Blockly.Connection): boolean {
    if (!super.doTypeChecks(a, b)) return false

    const moved =
      a.type === Blockly.ConnectionType.PREVIOUS_STATEMENT
        ? a
        : b.type === Blockly.ConnectionType.PREVIOUS_STATEMENT
          ? b
          : a.type === Blockly.ConnectionType.OUTPUT_VALUE
            ? a
            : b.type === Blockly.ConnectionType.OUTPUT_VALUE
              ? b
              : null
    if (!moved) return true

    const destination = moved === a ? b : a
    const parent = statementOwner(destination)
    if (!parent) return true
    if (!constructorCardinalityFits(parent, moved.getSourceBlock())) return false
    if (!placementFits(parent, moved.getSourceBlock())) return false
    if (!programmingTreeFits(parent, moved.getSourceBlock())) return false
    if (!derivedConstructorsFit(parent, moved.getSourceBlock())) return false

    const previous =
      a.type === Blockly.ConnectionType.PREVIOUS_STATEMENT
        ? a
        : b.type === Blockly.ConnectionType.PREVIOUS_STATEMENT
          ? b
          : null
    if (!previous) return true

    if (!parent || htmlContentModelForBlock(parent.type) === undefined) return true
    return chainFits(parent, previous.getSourceBlock())
  }
}
