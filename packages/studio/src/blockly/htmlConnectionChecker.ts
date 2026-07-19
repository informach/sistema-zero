import * as Blockly from 'blockly/core'
import { htmlContentModelForBlock, isHTMLBlockChildAllowed } from '../html/catalog'

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

/**
 * Acrescenta o modelo de conteúdo HTML às verificações nativas do Blockly.
 * Pilhas soltas continuam livres para a criança organizar; ao encaixá-las num
 * contêiner, a pilha inteira precisa caber naquele conteúdo.
 */
export class HTMLConnectionChecker extends Blockly.ConnectionChecker {
  override doTypeChecks(a: Blockly.Connection, b: Blockly.Connection): boolean {
    if (!super.doTypeChecks(a, b)) return false

    const previous =
      a.type === Blockly.ConnectionType.PREVIOUS_STATEMENT
        ? a
        : b.type === Blockly.ConnectionType.PREVIOUS_STATEMENT
          ? b
          : null
    if (!previous) return true

    const destination = previous === a ? b : a
    const parent = statementOwner(destination)
    if (!parent || htmlContentModelForBlock(parent.type) === undefined) return true
    return chainFits(parent, previous.getSourceBlock())
  }
}
