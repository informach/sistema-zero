/** Kept independent of Blockly: persistence and source-only exports also use it. */
export const PYTHON_PROGRAM = 'sz_py_program'

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

/** Separate source-derived display state from the student's independent scratch pieces. */
export function splitPythonWorkspace(workspace: Record<string, unknown>) {
  const blocks = workspace.blocks
  if (!record(blocks) || !Array.isArray(blocks.blocks)) return { program: workspace }
  const program = blocks.blocks.filter((block) => record(block) && block.type === PYTHON_PROGRAM)
  if (!program.length) return { program: workspace }
  const scratch = blocks.blocks.filter((block) => !program.includes(block))
  return {
    program: { ...workspace, blocks: { ...blocks, blocks: program } },
    scratch: scratch.length ? { blocks: { ...blocks, blocks: scratch } } : null,
  }
}
