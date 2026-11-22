import { PYTHON_AREA_FRAME_TYPES } from './areas'

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

/** Área do projeto com linhas do programa (no estado salvo do Blockly, sem Blockly). */
export function isExecutablePythonAreaState(block: unknown): boolean {
  if (!record(block) || typeof block.type !== 'string' || !PYTHON_AREA_FRAME_TYPES.has(block.type))
    return false
  const inputs = record(block.inputs) ? block.inputs : {}
  const children = record(inputs.CHILDREN) ? inputs.CHILDREN : undefined
  return !!children && record(children.block)
}

/**
 * Separa o programa (as áreas com linhas) do resto: rascunhos e áreas vazias, que não mudam o
 * código e por isso sobrevivem às edições da Ponte junto com os rascunhos.
 */
export function splitPythonWorkspace(workspace: Record<string, unknown>) {
  const blocks = workspace.blocks
  if (!record(blocks) || !Array.isArray(blocks.blocks)) return { program: workspace }
  const program = blocks.blocks.filter(isExecutablePythonAreaState)
  const scratch = blocks.blocks.filter((block) => !program.includes(block))
  return {
    program: { ...workspace, blocks: { ...blocks, blocks: program } },
    scratch: scratch.length ? { blocks: { ...blocks, blocks: scratch } } : null,
  }
}
