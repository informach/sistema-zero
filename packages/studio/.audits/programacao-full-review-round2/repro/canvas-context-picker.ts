import * as Blockly from 'blockly/core'
import { buildIRFromWorkspace } from '../../../src/blockly/buildIR'
import { collectReadableVariables } from '../../../src/blockly/fields/FieldNamePicker'
import { ensureBlocklyInitialized } from '../../../src/blockly/setup'
import { SZIRV2Schema } from '../../../src/ir/schema'

ensureBlocklyInitialized()
const workspace = new Blockly.Workspace()

try {
  const frame = workspace.newBlock('sz_frame_start')
  const variable = workspace.newBlock('sz_js_var_create')
  const setup = workspace.newBlock('sz_canvas_setup')
  const log = workspace.newBlock('sz_js_console_log_value')
  const width = workspace.newBlock('sz_val_canvas_width')

  variable.setFieldValue('pontos', 'NAME')
  setup.setFieldValue('pincel', 'CTX')
  width.setFieldValue('pontos', 'CTX')
  frame.getInput('CHILDREN')?.connection?.connect(variable.previousConnection)
  variable.nextConnection?.connect(setup.previousConnection)
  setup.nextConnection?.connect(log.previousConnection)
  log.getInput('VALUE')?.connection?.connect(width.outputConnection)

  const offered = collectReadableVariables(width)
  const result = SZIRV2Schema.safeParse(buildIRFromWorkspace(workspace))
  console.log(
    JSON.stringify(
      {
        offered,
        selected: width.getFieldValue('CTX'),
        valid: result.success,
        issues: result.success ? [] : result.error.issues,
      },
      null,
      2,
    ),
  )
} finally {
  workspace.dispose()
}
