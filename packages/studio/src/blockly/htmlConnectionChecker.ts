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
    case 'sz_val_event_pos':
    case 'sz_val_event_key':
      return 'event'
    case 'sz_js_super_ctor':
      return 'derived-constructor'
    case 'sz_js_super_method':
      return 'derived-method'
    case 'sz_val_arg':
      return 'parameter'
    case 'sz_js_set_this_prop':
    case 'sz_val_this_prop':
    case 'sz_val_this':
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
          ancestor.type === 'sz_js_class_method' && ancestor.getFieldValue('ASYNC') === 'TRUE',
      )
    case 'event':
      return ancestors.some(isEventContainer)
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
      return Boolean(scope && getParamNames(scope).includes(block.getFieldValue('NAME') ?? ''))
    }
    case 'class-body':
      return ancestors.some(
        (ancestor) =>
          ancestor.type === 'sz_js_class_method' || ancestor.type === 'sz_js_constructor',
      )
  }
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
    if (ancestor.type === 'sz_js_function') contexts.add('function-body')
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
    if (!placementFits(parent, moved.getSourceBlock())) return false
    if (!programmingTreeFits(parent, moved.getSourceBlock())) return false

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
