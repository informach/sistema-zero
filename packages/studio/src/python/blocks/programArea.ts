import * as Blockly from 'blockly/core'
import { PYTHON_PROGRAM } from './workspaceParts'

export { PYTHON_PROGRAM } from './workspaceParts'

export function registerPythonProgramArea() {
  if (Blockly.Blocks[PYTHON_PROGRAM]) return
  Blockly.Blocks[PYTHON_PROGRAM] = {
    init(this: Blockly.Block) {
      // Redesenho do clássico (11/2026): "Programa · roda de cima para baixo" numa linha só,
      // como as áreas do JavaScript. O nome do arquivo já está no cabeçalho do editor; o campo
      // FILE continua (a migração o preenche) mas não aparece.
      this.appendDummyInput()
        .appendField('Programa')
        .appendField(new Blockly.FieldLabel(''), 'FILE')
        .appendField(new Blockly.FieldLabel('· roda de cima para baixo', 'sz-area-hint'))
      this.getField('FILE')?.setVisible(false)
      this.appendStatementInput('BODY').setCheck('Python:statement')
      this.setColour('#5169b5')
      this.setDeletable(false)
      this.setTooltip(
        'Os blocos daqui rodam um depois do outro, de cima para baixo. Peças fora do Programa são rascunhos e não rodam.',
      )
    },
  }
}

export function pythonProgramArea(workspace: Blockly.Workspace): Blockly.Block | undefined {
  const areas = workspace.getBlocksByType(PYTHON_PROGRAM, false)
  if (areas.length > 1 || areas[0]?.getParent())
    throw new Error('O arquivo Python precisa ter uma única área Programa.')
  return areas[0]
}

/** Migrate executable roots in their recorded order, never by screen position. */
export function ensurePythonProgramArea(
  workspace: Blockly.Workspace,
  rootIds: readonly string[],
  path: string,
): string[] {
  registerPythonProgramArea()
  let area = pythonProgramArea(workspace)
  if (!area) {
    const roots = rootIds.map((id) => workspace.getBlockById(id))
    if (roots.some((block) => !block || block.getParent() || !block.previousConnection))
      throw new Error('A ordem dos comandos Python precisa ser atualizada.')
    area = workspace.newBlock(PYTHON_PROGRAM)
    let connection = area.getInput('BODY')!.connection!
    for (const root of roots) {
      connection.connect(root!.previousConnection!)
      let tail = root!
      while (tail.getNextBlock()) tail = tail.getNextBlock()!
      connection = tail.nextConnection!
    }
    area.moveBy(24, 24)
    if (area instanceof Blockly.BlockSvg) {
      area.initSvg()
      area.render()
    }
  }
  area.setDeletable(false)
  area.setFieldValue(path, 'FILE')
  return [area.id]
}

export function pythonScratchRoots(workspace: Blockly.Workspace) {
  return workspace.getTopBlocks(false).filter((block) => block.type !== PYTHON_PROGRAM)
}

export function pythonProgramContextMenu(
  block: Blockly.BlockSvg,
  options: Blockly.ContextMenuRegistry.ContextMenuOption[],
) {
  const area = pythonProgramArea(block.workspace)
  if (!area || block.workspace.isReadOnly() || !block.isEditable()) return
  const inside = block.getRootBlock() === area
  if (!inside && (!block.previousConnection || block.getParent())) return
  options.push({
    scope: { block, focusedNode: block },
    weight: 105,
    enabled: true,
    text: inside ? 'Mover este bloco para Rascunhos' : 'Inserir pilha no final do Programa',
    callback() {
      const group = Blockly.Events.getGroup()
      if (!group) Blockly.Events.setGroup(true)
      try {
        if (inside) {
          block.unplug(true)
          const position = block.getRelativeToSurfaceXY()
          const origin = area.getRelativeToSurfaceXY()
          const width = area instanceof Blockly.BlockSvg ? area.getHeightWidth().width : 600
          block.moveBy(origin.x + width + 80 - position.x, origin.y - position.y)
        } else {
          let tail = area.getInputTargetBlock('BODY')
          while (tail?.getNextBlock()) tail = tail.getNextBlock()
          const connection = tail?.nextConnection ?? area.getInput('BODY')!.connection!
          connection.connect(block.previousConnection!)
        }
      } finally {
        if (!group) Blockly.Events.setGroup(false)
      }
    },
  })
}
