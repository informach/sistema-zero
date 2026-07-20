import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { generateJS } from '#generators'
import { behaviorStatements, type SZIRV2, SZIRV2Schema } from '#ir'
import { parseJS } from '../../parsers/js'
import { FRAME_EVENTS, FRAME_LOOPS, FRAME_START, inferBlockContract } from '../blockContracts'
import type { BlockDefinition } from '../blocks/types'
import { buildIRFromWorkspace } from '../buildIR'
import { FieldNamePicker, type NameKind } from '../fields/FieldNamePicker'
import { PROGRAMMING_VISIBLE_DEFINITIONS } from '../programmingContract'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

interface BuiltCase {
  ir: SZIRV2
  targetId: string
}

const IMPLICIT_NAMES = new Set(['ctx', 'event', 'window', 'document'])

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as T
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) {
      if (key !== '__id' && key !== 'ctorId') output[key] = stripIds(child)
    }
    return output as T
  }
  return value
}

function containsRawJS(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRawJS)
  if (!value || typeof value !== 'object') return false
  if ('type' in value && value.type === 'rawJS') return true
  return Object.values(value).some(containsRawJS)
}

function containsBlockId(value: unknown, blockId: string): boolean {
  if (Array.isArray(value)) return value.some((child) => containsBlockId(child, blockId))
  if (!value || typeof value !== 'object') return false
  if (
    ('__id' in value && value.__id === blockId) ||
    ('ctorId' in value && value.ctorId === blockId)
  ) {
    return true
  }
  return Object.values(value).some((child) => containsBlockId(child, blockId))
}

function connect(slot: Blockly.Connection | null | undefined, block: Blockly.Block): void {
  if (!slot || !block.previousConnection) {
    throw new Error(`${block.type}: contexto sem encaixe de comando`)
  }
  slot.connect(block.previousConnection)
}

function loadExtraState(block: Blockly.Block, state: unknown): void {
  if (!('loadExtraState' in block) || typeof block.loadExtraState !== 'function') {
    throw new Error(`${block.type}: mutator sem loadExtraState`)
  }
  block.loadExtraState(state)
}

function appendStatement(
  slot: Blockly.Connection | null | undefined,
  block: Blockly.Block,
): Blockly.Connection | null {
  connect(slot, block)
  return block.nextConnection
}

function namePickerEntries(block: Blockly.Block): Array<{ kind: NameKind; value: string }> {
  return block.inputList.flatMap((input) =>
    input.fieldRow.flatMap((field) =>
      field instanceof FieldNamePicker
        ? [{ kind: field.kind, value: String(field.getValue()).trim() }]
        : [],
    ),
  )
}

function fallbackVariableNames(type: string): string[] {
  switch (type) {
    case 'sz_val_array_filter':
    case 'sz_val_index_get':
    case 'sz_js_for_each':
      return ['lista']
    case 'sz_val_object_op':
    case 'sz_val_member_get':
    case 'sz_val_member_get_optional':
    case 'sz_val_method_on':
    case 'sz_js_member_set':
    case 'sz_js_method_on':
    case 'sz_js_index_set':
      return ['objeto']
    case 'sz_val_distance':
      return ['player', 'enemy']
    default:
      return []
  }
}

function declarationNames(target: Blockly.Block): {
  variables: string[]
  functions: string[]
  classes: string[]
} {
  const variables = new Set(fallbackVariableNames(target.type))
  const functions = new Set<string>()
  const classes = new Set<string>()
  for (const { kind, value } of namePickerEntries(target)) {
    if (!value) continue
    if (kind === 'variable' || kind === 'mutable-variable' || kind === 'group') {
      if (!IMPLICIT_NAMES.has(value)) variables.add(value)
    } else if (kind === 'function') {
      functions.add(value)
    } else if (kind === 'class') {
      classes.add(value)
    } else if (kind === 'dom-target' && target.getFieldValue('TARGET_KIND') === 'var') {
      variables.add(value)
    }
  }
  return {
    variables: [...variables],
    functions: [...functions],
    classes: [...classes],
  }
}

function addPrelude(
  workspace: Blockly.Workspace,
  startFrame: Blockly.Block,
  target: Blockly.Block,
): Blockly.Connection | null {
  let slot = startFrame.getInput('CHILDREN')?.connection ?? null
  const names = declarationNames(target)

  if (target.type === 'sz_val_canvas_width' || target.type === 'sz_val_canvas_height') {
    const setup = workspace.newBlock('sz_canvas_setup')
    setup.setFieldValue('tela', 'CANVAS_ID')
    setup.setFieldValue('ctx', 'CTX')
    slot = appendStatement(slot, setup)
  }

  for (const name of names.variables) {
    const declaration = workspace.newBlock('sz_js_var_create')
    declaration.setFieldValue(name, 'NAME')
    slot = appendStatement(slot, declaration)
  }
  for (const name of names.classes) {
    const declaration = workspace.newBlock('sz_js_class')
    declaration.setFieldValue(name, 'NAME')
    slot = appendStatement(slot, declaration)
  }
  for (const name of names.functions) {
    const declaration = workspace.newBlock('sz_js_function')
    declaration.setFieldValue(name, 'NAME')
    slot = appendStatement(slot, declaration)
  }
  return slot
}

function attachReporter(host: Blockly.Block, input: string, target: Blockly.Block): void {
  const slot = host.getInput(input)?.connection
  if (!slot || !target.outputConnection) {
    throw new Error(`${target.type}: relator sem encaixe ${host.type}.${input}`)
  }
  slot.connect(target.outputConnection)
}

function attachInsideFunction(
  workspace: Blockly.Workspace,
  startSlot: Blockly.Connection | null,
  target: Blockly.Block,
  options: { async?: boolean; parameter?: string } = {},
): void {
  const fn = workspace.newBlock('sz_js_function')
  fn.setFieldValue('funcaoDeTeste', 'NAME')
  if (options.async) fn.setFieldValue('TRUE', 'ASYNC')
  if (options.parameter) {
    loadExtraState(fn, { params: [{ name: options.parameter, id: 'parametro-teste' }] })
  }
  connect(startSlot, fn)
  if (target.outputConnection) {
    const host = workspace.newBlock('sz_js_console_log_value')
    connect(fn.getInput('BODY')?.connection, host)
    attachReporter(host, 'VALUE', target)
  } else {
    connect(fn.getInput('BODY')?.connection, target)
  }
}

function attachInsideClass(
  workspace: Blockly.Workspace,
  startSlot: Blockly.Connection | null,
  target: Blockly.Block,
  mode: 'member' | 'constructor-body' | 'method-body',
  derived = false,
): void {
  let slot = startSlot
  if (derived) {
    const base = workspace.newBlock('sz_js_class')
    base.setFieldValue('Base', 'NAME')
    slot = appendStatement(slot, base)
  }

  const klass = workspace.newBlock('sz_js_class')
  klass.setFieldValue('ClasseDeTeste', 'NAME')
  if (derived) loadExtraState(klass, { extends: 'Base' })
  connect(slot, klass)

  if (mode === 'member') {
    connect(klass.getInput('MEMBERS')?.connection, target)
    return
  }

  const member = workspace.newBlock(
    mode === 'constructor-body' ? 'sz_js_constructor' : 'sz_js_class_method',
  )
  connect(klass.getInput('MEMBERS')?.connection, member)
  if (target.outputConnection) {
    const host = workspace.newBlock('sz_js_console_log_value')
    connect(member.getInput('BODY')?.connection, host)
    attachReporter(host, 'VALUE', target)
  } else {
    connect(member.getInput('BODY')?.connection, target)
  }
}

function buildCase(definition: BlockDefinition): BuiltCase {
  const workspace = new Blockly.Workspace()
  try {
    const target = workspace.newBlock(definition.type)
    const start = workspace.newBlock(FRAME_START)
    const startSlot = addPrelude(workspace, start, target)

    switch (definition.type) {
      case 'sz_js_event_method': {
        const events = workspace.newBlock(FRAME_EVENTS)
        const event = workspace.newBlock('sz_js_on_click_anywhere')
        connect(events.getInput('CHILDREN')?.connection, event)
        connect(event.getInput('DO')?.connection, target)
        break
      }
      case 'sz_val_event_pos':
      case 'sz_val_event_key': {
        const events = workspace.newBlock(FRAME_EVENTS)
        const event = workspace.newBlock(
          definition.type === 'sz_val_event_key' ? 'sz_js_on_key' : 'sz_js_on_click_anywhere',
        )
        const host = workspace.newBlock('sz_js_console_log_value')
        connect(events.getInput('CHILDREN')?.connection, event)
        connect(event.getInput('DO')?.connection, host)
        attachReporter(host, 'VALUE', target)
        break
      }
      case 'sz_js_break':
      case 'sz_js_continue': {
        const repeat = workspace.newBlock('sz_js_repeat')
        connect(startSlot, repeat)
        connect(repeat.getInput('DO')?.connection, target)
        break
      }
      case 'sz_js_case': {
        const choice = workspace.newBlock('sz_js_switch')
        connect(startSlot, choice)
        connect(choice.getInput('CASES')?.connection, target)
        break
      }
      case 'sz_js_await':
        attachInsideFunction(workspace, startSlot, target, { async: true })
        break
      case 'sz_js_return':
      case 'sz_js_return_void':
        attachInsideFunction(workspace, startSlot, target)
        break
      case 'sz_val_arg':
        attachInsideFunction(workspace, startSlot, target, {
          parameter: String(target.getFieldValue('NAME')),
        })
        break
      case 'sz_js_constructor':
      case 'sz_js_class_method':
        attachInsideClass(workspace, startSlot, target, 'member')
        break
      case 'sz_js_super_ctor':
        attachInsideClass(workspace, startSlot, target, 'constructor-body', true)
        break
      case 'sz_js_super_method':
        attachInsideClass(workspace, startSlot, target, 'method-body', true)
        break
      case 'sz_js_set_this_prop':
      case 'sz_val_this':
      case 'sz_val_this_prop':
        attachInsideClass(workspace, startSlot, target, 'method-body')
        break
      default:
        if (target.outputConnection) {
          const host = workspace.newBlock('sz_js_console_log_value')
          connect(startSlot, host)
          attachReporter(host, 'VALUE', target)
        } else {
          const role = inferBlockContract(definition).placement?.role
          if (role === 'event') {
            const events = workspace.newBlock(FRAME_EVENTS)
            connect(events.getInput('CHILDREN')?.connection, target)
          } else if (role === 'loop') {
            const loops = workspace.newBlock(FRAME_LOOPS)
            connect(loops.getInput('CHILDREN')?.connection, target)
          } else {
            connect(startSlot, target)
          }
        }
    }

    return { ir: buildIRFromWorkspace(workspace), targetId: target.id }
  } finally {
    workspace.dispose()
  }
}

function throughBlocks(ir: SZIRV2): SZIRV2 {
  const workspace = new Blockly.Workspace()
  try {
    const state = buildWorkspaceStateFromIR(ir)
    Blockly.serialization.workspaces.load(state, workspace)
    return buildIRFromWorkspace(workspace)
  } finally {
    workspace.dispose()
  }
}

beforeAll(() => ensureBlocklyInitialized())

describe('Programação — matriz ponta a ponta dos 149 blocos visíveis', () => {
  it('o inventário da matriz é exatamente o catálogo público', () => {
    expect(PROGRAMMING_VISIBLE_DEFINITIONS).toHaveLength(149)
    expect(new Set(PROGRAMMING_VISIBLE_DEFINITIONS.map(({ type }) => type)).size).toBe(149)
  })

  for (const definition of PROGRAMMING_VISIBLE_DEFINITIONS) {
    it(definition.type, () => {
      const { ir, targetId } = buildCase(definition)

      const validated = SZIRV2Schema.safeParse(ir)
      expect(
        validated.success,
        validated.success
          ? definition.type
          : validated.error.issues.map((issue) => issue.message).join('\n'),
      ).toBe(true)

      expect(stripIds(throughBlocks(ir))).toEqual(stripIds(ir))

      const statements = behaviorStatements(ir)
      expect(containsBlockId(ir, targetId)).toBe(true)
      const code = generateJS({ statements })
      const parsed = parseJS(code)
      expect(containsRawJS(parsed)).toBe(false)
      const canonicalCode = generateJS({ statements: parsed })
      expect(generateJS({ statements: parseJS(canonicalCode) })).toBe(canonicalCode)
    })
  }
})
