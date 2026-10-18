import * as Blockly from 'blockly/core'
import { withMutation } from '../../blockly/blocks/mutatorEvents'
import { readPythonNode } from '../language/readNode'
import type { PythonNode } from '../language/types'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import type {
  PythonBlockCodec,
  PythonBlockField,
  PythonBlockRole,
  PythonBlockShape,
} from './contract'
import { pythonSemanticTree } from './nodes'
import { pythonPlaceholderNode as placeholder } from './placeholders'
import type { PythonBlockProjection, PythonVisualNode, PythonVisualOrigin } from './projection'
import { type PythonWorkspaceOrigins, withoutPythonOrigins } from './provenance'

interface Layout {
  fields: PythonBlockField[]
  inputs: { name: string; label: string; role: PythonBlockRole }[]
  extra?: PythonBlockShape['extra']
}
interface VisualState {
  version: 1
  layout: Layout
  origin?: PythonVisualOrigin
}
export interface PythonBlocklyBlock extends Blockly.Block {
  pythonState: VisualState
  setPythonLayout(shape: PythonBlockShape, origin?: PythonVisualOrigin): void
  setPythonOption(key: string, value: number | boolean): void
}
interface PythonSourceBlock extends Blockly.Block {
  pythonSource: Extract<PythonVisualNode, { kind: 'source' }>
}
const roles: readonly PythonBlockRole[] = [
  'value',
  'statement',
  'parameter',
  'parameters',
  'keyword',
  'handler',
  'alias',
  'format',
]
const check = (role: PythonBlockRole) => `Python:${role}`
const sourceType = (role: PythonBlockRole) => `sz_py_source_${role}`
const clone = <T>(value: T): T => structuredClone(value)
const layoutOf = (shape: PythonBlockShape): Layout => ({
  fields: clone(shape.fields),
  inputs: shape.inputs.map(({ name, label, role }) => ({ name, label, role })),
  extra: clone(shape.extra),
})
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

function readState(raw: unknown, codec: PythonBlockCodec): VisualState {
  if (!object(raw) || raw.version !== 1 || !object(raw.layout))
    throw new Error('Estado visual Python inválido.')
  const layout = raw.layout
  if (
    !Array.isArray(layout.fields) ||
    !Array.isArray(layout.inputs) ||
    layout.fields.length > 100 ||
    layout.inputs.length > 200
  )
    throw new Error('Estado visual Python excede o limite.')
  const fields: PythonBlockField[] = layout.fields.map((field) => {
    if (
      !object(field) ||
      typeof field.name !== 'string' ||
      field.name.length > 80 ||
      typeof field.value !== 'string' ||
      field.value.length > 1_048_576
    )
      throw new Error('Campo visual Python inválido.')
    return { name: field.name, label: '', value: field.value }
  })
  const inputs = layout.inputs.map((input) => {
    if (
      !object(input) ||
      typeof input.name !== 'string' ||
      input.name.length > 80 ||
      !roles.includes(input.role as PythonBlockRole)
    )
      throw new Error('Entrada visual Python inválida.')
    const role = input.role as PythonBlockRole
    return {
      name: input.name,
      label: '',
      role,
      nodes: role === 'statement' ? [] : [placeholder(role)],
    }
  })
  let extra: PythonBlockShape['extra']
  if (layout.extra !== undefined) {
    if (!object(layout.extra) || Object.keys(layout.extra).length > 100)
      throw new Error('Opções visuais Python inválidas.')
    extra = {}
    for (const [key, value] of Object.entries(layout.extra)) {
      if (
        ['__proto__', 'constructor', 'prototype'].includes(key) ||
        key.length > 80 ||
        !['string', 'number', 'boolean'].includes(typeof value) ||
        (typeof value === 'string' && value.length > 80) ||
        (typeof value === 'number' && !Number.isSafeInteger(value))
      )
        throw new Error('Opção visual Python inválida.')
      extra[key] = value as string | number | boolean
    }
  }
  // Layout validity is independent of unfinished learner text. Reconstruct its
  // shape from trusted defaults/controls, then preserve the exact editable text.
  let seed = codec.decode(codec.defaultNode())!
  for (const control of codec.controls ?? []) {
    const value = extra?.[control.key]
    if (value === undefined) continue
    if (
      !codec.reshape ||
      (control.kind === 'count' &&
        (typeof value !== 'number' ||
          !Number.isSafeInteger(value) ||
          value < (control.minimum ?? 0) ||
          value > (control.maximum ?? 32))) ||
      (control.kind === 'optional' && typeof value !== 'boolean')
    )
      throw new Error('Opção visual Python inválida.')
    seed = codec.reshape(seed, control.key, value as number | boolean)
  }
  const canonical = codec.decode(codec.encode({ fields: seed.fields, inputs, extra }))
  if (
    !canonical ||
    fields.length !== canonical.fields.length ||
    inputs.length !== canonical.inputs.length ||
    new Set(fields.map((field) => field.name)).size !== fields.length ||
    new Set(inputs.map((input) => input.name)).size !== inputs.length ||
    canonical.fields.some((field) => !fields.some((item) => item.name === field.name)) ||
    canonical.inputs.some(
      (input) => !inputs.some((item) => item.name === input.name && item.role === input.role),
    )
  )
    throw new Error('O formato salvo não corresponde ao bloco Python.')
  for (const field of canonical.fields) {
    const saved = fields.find((item) => item.name === field.name)!
    if (field.options && !field.options.some(([, value]) => value === saved.value))
      throw new Error('Opção visual Python inválida.')
    field.value = saved.value
  }
  let origin: PythonVisualOrigin | undefined
  if (raw.origin !== undefined) {
    if (!object(raw.origin)) throw new Error('Origem visual Python inválida.')
    origin = {}
    if (raw.origin.nodeId !== undefined) {
      if (typeof raw.origin.nodeId !== 'string' || !/^\d{1,6}$/.test(raw.origin.nodeId))
        throw new Error('Identidade visual Python inválida.')
      origin.nodeId = raw.origin.nodeId
    }
    if (raw.origin.range !== undefined) {
      const range = raw.origin.range
      if (
        !object(range) ||
        !Number.isSafeInteger(range.start) ||
        !Number.isSafeInteger(range.end) ||
        (range.start as number) < 0 ||
        (range.end as number) < (range.start as number) ||
        (range.end as number) > 1_048_576
      )
        throw new Error('Intervalo visual Python inválido.')
      origin.range = { start: range.start as number, end: range.end as number }
    }
  }
  return { version: 1, layout: layoutOf(canonical), origin }
}

function applyLayout(block: PythonBlocklyBlock, state: VisualState, codec: PythonBlockCodec) {
  const desired = new Set(state.layout.inputs.map((input) => input.name))
  const removed = block.inputList.filter(
    (input) => input.name !== 'HEADER' && !desired.has(input.name),
  )
  if (removed.some((input) => input.connection?.targetBlock()))
    throw new Error('Desconecte o valor antes de remover esta entrada.')
  for (const input of state.layout.inputs) {
    const existing = block.getInput(input.name)
    if (existing && !existing.connection?.getCheck()?.includes(check(input.role)))
      throw new Error('Não é possível mudar o tipo de uma entrada conectada.')
  }
  for (const input of removed) block.removeInput(input.name)
  // The title is host-owned presentation, not part of this mutation's layout.
  // Keep its current binding classification even while new inputs are incomplete.
  const title = block.getFieldValue('PYTHON_TITLE') ?? codec.title
  if (block.getInput('HEADER')) block.removeInput('HEADER')
  block.pythonState = state
  const header = block
    .appendDummyInput('HEADER')
    .appendField(new Blockly.FieldLabel(title), 'PYTHON_TITLE')
  for (const field of state.layout.fields) {
    header.appendField(field.label)
    if (field.options)
      header.appendField(
        new Blockly.FieldDropdown(field.options.map(([label, value]) => [label, value])),
        field.name,
      )
    else header.appendField(new Blockly.FieldTextInput(field.value), field.name)
    block.setFieldValue(field.value, field.name)
  }
  for (const input of state.layout.inputs) {
    if (!block.getInput(input.name)) {
      const target =
        input.role === 'statement'
          ? block.appendStatementInput(input.name)
          : block.appendValueInput(input.name)
      target.setCheck(check(input.role)).appendField(input.label)
    }
    block.moveInputBefore(input.name, null)
  }
}

/** Lazy and namespaced; does not register or modify any JavaScript block or generator. */
export function registerPythonBlocks(
  codecs: readonly PythonBlockCodec[] = PYTHON_PROGRAMMING_CODECS,
) {
  for (const codec of codecs) {
    if (Blockly.Blocks[codec.id]) continue
    Blockly.Blocks[codec.id] = {
      init(this: PythonBlocklyBlock) {
        this.setColour(codec.owner === 'python-turtle' ? 140 : 210)
        this.setTooltip(`${codec.help}\nPython: ${codec.api}`)
        if (codec.role === 'statement') {
          this.setPreviousStatement(true, check('statement'))
          this.setNextStatement(true, check('statement'))
        } else
          this.setOutput(
            true,
            codec.id === 'sz_py_text' ? [check('value'), check('format')] : check(codec.role),
          )
        this.setPythonLayout(codec.decode(codec.defaultNode())!)
      },
      setPythonLayout(
        this: PythonBlocklyBlock,
        shape: PythonBlockShape,
        origin?: PythonVisualOrigin,
      ) {
        applyLayout(this, readState({ version: 1, layout: layoutOf(shape), origin }, codec), codec)
      },
      setPythonOption(this: PythonBlocklyBlock, key: string, value: number | boolean) {
        const control = codec.controls?.find((control) => control.key === key)
        if (!control || !codec.reshape) throw new Error('Este bloco não tem essa opção.')
        if (
          (control.kind === 'count' &&
            (typeof value !== 'number' ||
              !Number.isSafeInteger(value) ||
              value < (control.minimum ?? 0) ||
              value > (control.maximum ?? 32))) ||
          (control.kind === 'optional' && typeof value !== 'boolean')
        )
          throw new Error('Valor inválido para a opção do bloco.')
        const state = this.saveExtraState!() as VisualState
        const shape: PythonBlockShape = {
          fields: state.layout.fields,
          extra: state.layout.extra,
          inputs: state.layout.inputs.map((input) => ({
            ...input,
            nodes: input.role === 'statement' ? [] : [placeholder(input.role)],
          })),
        }
        const next = codec.reshape(shape, key, value)
        const validated = readState(
          { version: 1, layout: layoutOf(next), origin: state.origin },
          codec,
        )
        withMutation(this, () => applyLayout(this, validated, codec))
        this.setWarningText(null, 'python-layout')
      },
      customContextMenu(
        this: PythonBlocklyBlock & Blockly.BlockSvg,
        options: Blockly.ContextMenuRegistry.ContextMenuOption[],
      ) {
        if (!this.isEditable()) return
        for (const control of codec.controls ?? []) {
          const current = this.pythonState.layout.extra?.[control.key]
          const choose = (value: number | boolean) => {
            try {
              this.setPythonOption(control.key, value)
            } catch (error) {
              this.setWarningText(
                error instanceof Error ? error.message : 'Não foi possível mudar esta entrada.',
                'python-layout',
              )
            }
          }
          if (control.kind === 'optional')
            options.push({
              scope: { block: this, focusedNode: this },
              weight: 110,
              text: `${current ? 'Ocultar' : 'Adicionar'} ${control.label}`,
              enabled: true,
              callback: () => choose(!current),
            })
          else if (typeof current === 'number') {
            options.push({
              scope: { block: this, focusedNode: this },
              weight: 110,
              text: `Adicionar ${control.label}`,
              enabled: current < (control.maximum ?? 32),
              callback: () => choose(current + 1),
            })
            options.push({
              scope: { block: this, focusedNode: this },
              weight: 111,
              text: `Remover ${control.label}`,
              enabled: current > (control.minimum ?? 0),
              callback: () => choose(current - 1),
            })
          }
        }
      },
      saveExtraState(this: PythonBlocklyBlock) {
        const state = clone(this.pythonState)
        for (const field of state.layout.fields)
          field.value = String(this.getFieldValue(field.name))
        return state
      },
      loadExtraState(this: PythonBlocklyBlock, state: unknown) {
        applyLayout(this, readState(state, codec), codec)
      },
    }
  }
  for (const role of roles) {
    const type = sourceType(role)
    if (Blockly.Blocks[type]) continue
    Blockly.Blocks[type] = {
      init(this: PythonSourceBlock) {
        this.appendDummyInput('SOURCE').appendField('Código Python — editar no modo fonte')
        this.setColour(0)
        this.setEditable(false)
        if (role === 'statement') {
          this.setPreviousStatement(true, check(role))
          this.setNextStatement(true, check(role))
        } else this.setOutput(true, check(role))
        this.setTooltip(
          'Este trecho está preservado por inteiro. Ele usa uma sintaxe sem bloco visual correspondente.',
        )
      },
      saveExtraState(this: PythonSourceBlock) {
        return clone(this.pythonSource)
      },
      loadExtraState(this: PythonSourceBlock, state: unknown) {
        // Opaque data is a derived cache. The authoritative source must always be
        // reparsed/validated before this workspace can commit a change or execute.
        if (
          !object(state) ||
          state.kind !== 'source' ||
          state.role !== role ||
          !object(state.node) ||
          typeof state.node.kind !== 'string' ||
          !object(state.node.fields)
        )
          throw new Error('Trecho Python preservado inválido.')
        const node = clone(readPythonNode(state.node, 1_048_576, false))
        this.pythonSource = {
          kind: 'source',
          role,
          node,
          origin: { nodeId: node.id, range: node.range },
        }
      },
    }
  }
}

/** AST→visual→Blockly. Returned roots retain source order independently of screen coordinates. */
export function pythonVisualToWorkspace(
  projection: PythonBlockProjection,
  workspace: Blockly.Workspace,
  codecs: readonly PythonBlockCodec[] = PYTHON_PROGRAMMING_CODECS,
): string[] {
  registerPythonBlocks(codecs)
  function state(value: PythonVisualNode): Blockly.serialization.blocks.State {
    if (value.kind === 'source') return { type: sourceType(value.role), extraState: value }
    const inputs: NonNullable<Blockly.serialization.blocks.State['inputs']> = {}
    for (const input of value.inputs)
      if (input.nodes.length) inputs[input.name] = { block: chain(input.nodes) }
    return {
      type: value.codecId,
      fields: Object.fromEntries(value.fields.map((field) => [field.name, field.value])),
      extraState: {
        version: 1,
        layout: {
          fields: value.fields,
          inputs: value.inputs.map(({ name, label, role }) => ({ name, label, role })),
          extra: value.extra,
        },
        origin: value.origin,
      },
      inputs,
    }
  }
  function chain(values: PythonVisualNode[]) {
    const first = state(values[0]!)
    let tail = first
    for (const value of values.slice(1)) {
      const next = state(value)
      tail.next = { block: next }
      tail = next
    }
    return first
  }
  if (!projection.body.length) return []
  const first = Blockly.serialization.blocks.append(chain(projection.body), workspace)
  return [first.id]
}

/** Blockly→visual→AST. Missing inputs are errors, never silently replaced by default values. */
export function pythonWorkspaceToVisual(
  workspace: Blockly.Workspace,
  rootIds: readonly string[],
  typeIgnores: PythonNode[] = [],
  codecs: readonly PythonBlockCodec[] = PYTHON_PROGRAMMING_CODECS,
  origins?: PythonWorkspaceOrigins,
): PythonBlockProjection {
  const registry = new Map(codecs.map((codec) => [codec.id, codec]))
  const visited = new Set<string>()
  function read(block: Blockly.Block, role: PythonBlockRole, depth = 0): PythonVisualNode {
    if (!block.isEnabled())
      throw new Error(
        'Este bloco está desativado. Use uma condição Python para controlar o que será executado.',
      )
    if (visited.has(block.id) || visited.size >= 20_000 || depth > 80)
      throw new Error('A estrutura visual Python contém um ciclo ou excede o limite.')
    visited.add(block.id)
    if (block.type === sourceType(role)) {
      const value = clone((block as PythonSourceBlock).pythonSource)
      if (!origins) return { ...value, blockId: block.id }
      const parsed = origins.get(block.id)
      const node =
        parsed &&
        JSON.stringify(pythonSemanticTree(parsed)) ===
          JSON.stringify(pythonSemanticTree(value.node))
          ? clone(parsed)
          : withoutPythonOrigins(value.node)
      return { ...value, blockId: block.id, node, origin: { nodeId: node.id, range: node.range } }
    }
    const codec = registry.get(block.type)
    if (!codec || (codec.role !== role && !(role === 'format' && codec.id === 'sz_py_text')))
      throw new Error('O bloco não pertence a esta entrada Python.')
    const state = (block as PythonBlocklyBlock).pythonState
    const inputs = state.layout.inputs.map((input) => {
      const child = block.getInputTargetBlock(input.name)
      if (input.role !== 'statement' && !child)
        throw new Error('Preencha todas as entradas do bloco Python.')
      return {
        ...input,
        nodes: child
          ? input.role === 'statement'
            ? readChain(child, depth + 1)
            : [read(child, input.role, depth + 1)]
          : [],
      }
    })
    return {
      kind: 'block',
      blockId: block.id,
      codecId: codec.id,
      role,
      fields: state.layout.fields.map((field) => ({
        ...field,
        value: String(block.getFieldValue(field.name)),
      })),
      inputs,
      extra: clone(state.layout.extra),
      origin: origins
        ? { nodeId: origins.get(block.id)?.id, range: clone(origins.get(block.id)?.range) }
        : clone(state.origin),
    }
  }
  function readChain(first: Blockly.Block, depth = 0) {
    const result: PythonVisualNode[] = []
    let block: Blockly.Block | null = first
    while (block) {
      result.push(read(block, 'statement', depth))
      block = block.getNextBlock()
    }
    return result
  }
  const body = rootIds.flatMap((id) => {
    const block = workspace.getBlockById(id)
    if (!block || block.getParent())
      throw new Error('A ordem dos comandos Python precisa ser atualizada.')
    return readChain(block)
  })
  if (workspace.getAllBlocks(false).some((block) => !visited.has(block.id)))
    throw new Error('Há blocos soltos. Conecte ou remova esses blocos antes de gerar Python.')
  return { body, typeIgnores }
}
