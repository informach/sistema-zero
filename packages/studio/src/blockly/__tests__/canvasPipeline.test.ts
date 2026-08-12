import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { generateHTML, generateJS, generateProjectFilesWithMap } from '#generators'
import { behaviorStatements, type JSStatement, type SZIRV2, SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import { parseHTML } from '../../parsers/html'
import { parseJS } from '../../parsers/js'
import { FRAME_START, FRAME_STRUCTURE } from '../blockContracts'
import { CANVAS_BLOCKS } from '../blocks/canvas'
import type { BlockDefinition } from '../blocks/types'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'
import { attachBlockInContractContext } from './blockContractTestUtils'

interface BuiltCase {
  ir: SZIRV2
  targetId: string
}

interface DropdownArg {
  type?: string
  name?: string
  options?: [string, string][]
}

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) {
      if (key !== '__id') output[key] = stripIds(child)
    }
    return output as T
  }
  return value
}

function dropdowns(definition: BlockDefinition): DropdownArg[] {
  return [
    definition.args0,
    definition.args1,
    definition.args2,
    definition.args3,
    definition.args4,
    definition.args5,
  ]
    .flatMap((args) => (Array.isArray(args) ? args : []))
    .filter((arg): arg is DropdownArg => Boolean(arg) && typeof arg === 'object')
    .filter((arg) => arg.type === 'field_dropdown' && typeof arg.name === 'string')
}

function buildCase(
  definition: BlockDefinition,
  configure?: (block: Blockly.Block) => void,
): BuiltCase {
  const workspace = new Blockly.Workspace()
  try {
    let block: Blockly.Block
    if (definition.type === 'sz_html_canvas') {
      const frame = workspace.newBlock(FRAME_STRUCTURE)
      block = workspace.newBlock(definition.type)
      const slot = frame.getInput('CHILDREN')?.connection
      if (!slot || !block.previousConnection)
        throw new Error('tela de desenho sem encaixe estrutural')
      slot.connect(block.previousConnection)
    } else if (definition.type === 'sz_canvas_request_frame') {
      const frame = workspace.newBlock(FRAME_START)
      const fn = workspace.newBlock('sz_js_function')
      fn.setFieldValue('animar', 'NAME')
      block = workspace.newBlock(definition.type)
      block.setFieldValue('animar', 'FN')
      frame.getInput('CHILDREN')?.connection?.connect(fn.previousConnection as Blockly.Connection)
      fn.getInput('BODY')?.connection?.connect(block.previousConnection as Blockly.Connection)
    } else {
      block = attachBlockInContractContext({
        workspace,
        type: definition.type,
        kind: definition.output ? 'expr' : 'statement',
        expressionHost: 'sz_js_var_create',
        expressionInput: 'VALUE',
        loopHost: 'sz_canvas_anim_loop',
      })
      if (definition.type === 'sz_js_image_onload' || definition.type === 'sz_js_image_onerror') {
        const start = workspace.newBlock(FRAME_START)
        const creator = workspace.newBlock('sz_js_new_image')
        creator.setFieldValue('img', 'VAR')
        start
          .getInput('CHILDREN')
          ?.connection?.connect(creator.previousConnection as Blockly.Connection)

        const image = workspace.newBlock('sz_val_variable')
        image.setFieldValue('img', 'NAME')
        block.getInput('TARGET')?.connection?.connect(image.outputConnection as Blockly.Connection)
      }
    }
    configure?.(block)
    const ir = buildIRFromWorkspace(workspace)
    if (usesCanvasContext(behaviorStatements(ir))) {
      ir.behavior.start.unshift({ type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' })
    }
    return { ir, targetId: block.id }
  } finally {
    workspace.dispose()
  }
}

function usesCanvasContext(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(usesCanvasContext)
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (
    typeof record.type === 'string' &&
    record.type.startsWith('canvas') &&
    typeof record.ctxVar === 'string'
  ) {
    return true
  }
  return Object.values(record).some(usesCanvasContext)
}

function throughBlocks(ir: SZIRV2): SZIRV2 {
  const workspace = new Blockly.Workspace()
  try {
    const state = buildWorkspaceStateFromIR(ir)
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, workspace)
    return buildIRFromWorkspace(workspace)
  } finally {
    workspace.dispose()
  }
}

function withCanvasSetup(type: string, statements: JSStatement[]): JSStatement[] {
  if (
    type === 'sz_canvas_setup' ||
    statements.some((statement) => statement.type === 'canvasSetup')
  ) {
    return statements
  }
  return [{ type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' }, ...statements]
}

beforeAll(() => ensureBlocklyInitialized())

describe('Auditoria Canvas — pipeline completo dos 55 blocos', () => {
  for (const definition of CANVAS_BLOCKS) {
    it(definition.type, () => {
      const { ir, targetId } = buildCase(definition)

      // Definição → IR válida e IR → blocos → IR sem perda.
      expect(SZIRV2Schema.safeParse(ir).success).toBe(true)
      expect(stripIds(throughBlocks(ir))).toEqual(stripIds(ir))

      // Todo bloco aponta para seu trecho na Ponte.
      const generatedProject = generateProjectFilesWithMap({ projectName: 'Canvas', ir })
      expect(generatedProject.sourceMap[targetId]?.startLine).toBeGreaterThan(0)

      if (definition.type === 'sz_html_canvas') {
        const html = generateHTML({ body: ir.html })
        expect(stripIds(parseHTML(html))).toEqual(stripIds(ir.html))
        return
      }

      // Blocos → código → blocos. O preparo dá ao parser o vínculo pincel↔tela
      // necessário para reconhecer as operações individuais do Canvas.
      const statements = withCanvasSetup(definition.type, behaviorStatements(ir))
      const code = generateJS({ statements })
      expect(stripIds(parseJS(code))).toEqual(stripIds(statements))
    })
  }
})

describe('Auditoria Canvas — todas as 11 escolhas dos menus', () => {
  const cases = CANVAS_BLOCKS.flatMap((definition) =>
    dropdowns(definition).flatMap((field) =>
      (field.options ?? []).map(([, value]) => ({ definition, field: field.name ?? '', value })),
    ),
  )

  it('inventário esperado', () => {
    expect(cases).toHaveLength(11)
  })

  it('a tecla livre preserva letras, números e teclas especiais', () => {
    const definition = CANVAS_BLOCKS.find((item) => item.type === 'sz_input_key_pressed')
    if (!definition) throw new Error('bloco de tecla ausente')
    for (const key of ['x', '2', 'Escape', 'Delete']) {
      const { ir } = buildCase(definition, (block) => block.setFieldValue(key, 'KEY'))
      expect(stripIds(throughBlocks(ir))).toEqual(stripIds(ir))
      const statements = behaviorStatements(ir)
      expect(JSON.stringify(statements)).toContain(`"key":"${key}"`)
      expect(stripIds(parseJS(generateJS({ statements })))).toEqual(stripIds(statements))
    }
  })

  for (const { definition, field, value } of cases) {
    it(`${definition.type}.${field}=${value || 'normal'}`, () => {
      const { ir } = buildCase(definition, (block) => block.setFieldValue(value, field))
      expect(stripIds(throughBlocks(ir))).toEqual(stripIds(ir))
      const statements = withCanvasSetup(definition.type, behaviorStatements(ir))
      expect(stripIds(parseJS(generateJS({ statements })))).toEqual(stripIds(statements))
    })
  }
})
