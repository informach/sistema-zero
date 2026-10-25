import * as Blockly from 'blockly/core'
import { pythonCallArgumentLabel, pythonDefinedParams } from './flowCatalog'

const DEFINITION = 'sz_py_def'
const CALLS = new Set(['sz_py_run', 'sz_py_run_value'])

/**
 * The parameters of each function the workspace defines once, outside a class or another
 * function: the only case where a call by name surely reaches that definition. A name defined
 * twice, or with a parameter the child is still typing, has no known parameters.
 */
export function pythonWorkspaceFunctionParams(workspace: Blockly.Workspace) {
  const found = new Map<string, readonly string[] | undefined>()
  for (const block of workspace.getBlocksByType(DEFINITION, false)) {
    const name = String(block.getFieldValue('NAME') ?? '').trim()
    if (!name) continue
    const outside = block.getSurroundParent() === null
    const params = pythonDefinedParams(String(block.getFieldValue('PARAMS') ?? ''))
    found.set(name, found.has(name) || !outside ? undefined : params)
  }
  return found
}

/**
 * Writes on each "chamar" block the parameter that receives each value. The labels are only
 * presentation: no event, no undo step, no change in the program or in the saved blocks.
 */
export function refreshPythonCallLabels(workspace: Blockly.Workspace) {
  const params = pythonWorkspaceFunctionParams(workspace)
  // Changing a label fires a change event: without this, a refresh would be an undo step and a
  // gesture to commit.
  Blockly.Events.disable()
  try {
    for (const block of workspace.getAllBlocks(false)) {
      if (!CALLS.has(block.type)) continue
      const called = params.get(String(block.getFieldValue('NAME') ?? '').trim())
      for (const input of block.inputList) {
        const index = /^args:(\d+)$/.exec(input.name)?.[1]
        if (index === undefined) continue
        const field = input.fieldRow[0]
        const label = pythonCallArgumentLabel(Number(index), called)
        if (field instanceof Blockly.FieldLabel && field.getValue() !== label) field.setValue(label)
      }
    }
  } finally {
    Blockly.Events.enable()
  }
}

/** Keeps the labels up to date while the child edits: one refresh per batch of changes. */
export function attachPythonCallLabels(workspace: Blockly.Workspace) {
  let queued = false
  let disposed = false
  const listener = (event: Blockly.Events.Abstract) => {
    if (event.isUiEvent || queued) return
    queued = true
    queueMicrotask(() => {
      queued = false
      if (!disposed) refreshPythonCallLabels(workspace)
    })
  }
  workspace.addChangeListener(listener)
  refreshPythonCallLabels(workspace)
  return () => {
    disposed = true
    workspace.removeChangeListener(listener)
  }
}
