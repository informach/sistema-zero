import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import * as Blockly from 'blockly/core'
import { registerPythonBlocks } from './blockly'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import type { PythonBlockCodec } from './contract'

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const roles = [
  'value',
  'statement',
  'parameter',
  'parameters',
  'keyword',
  'handler',
  'alias',
  'format',
]
function fail(): never {
  throw new Error(
    'Não foi possível restaurar este rascunho de blocos Python. O código foi mantido.',
  )
}

/** Validate untrusted drafts in a disposable workspace before touching the visible editor. */
export function readPythonWorkspaceState(
  raw: unknown,
  codecs: readonly PythonBlockCodec[] = PYTHON_PROGRAMMING_CODECS,
  /** Source-specific checks share the disposable preflight workspace. */
  check?: (workspace: Blockly.Workspace) => void,
): Record<string, unknown> {
  const state = copyStudioProjectJson(raw, { nodes: 160_000, textChars: 8_388_608, depth: 40_064 })
  if (
    !record(state) ||
    Object.keys(state).some((key) => !['blocks', 'workspaceComments'].includes(key))
  )
    fail()
  const allowed = new Set([
    ...codecs.map((codec) => codec.id),
    ...roles.map((role) => `sz_py_source_${role}`),
  ])
  const blockIds = new Set<string>()
  const queue: { value: unknown; depth: number }[] = []
  const savedFields = new Map<string, Record<string, unknown>>()
  if (state.blocks !== undefined) {
    if (
      !record(state.blocks) ||
      state.blocks.languageVersion !== 0 ||
      !Array.isArray(state.blocks.blocks) ||
      Object.keys(state.blocks).some((key) => !['blocks', 'languageVersion'].includes(key))
    )
      fail()
    for (const value of state.blocks.blocks) queue.push({ value, depth: 0 })
  }
  while (queue.length) {
    const { value, depth } = queue.pop()!
    // Blockly deserializes chains recursively. Bound stack depth independently
    // of Python AST depth; source remains available for larger programs.
    if (
      depth > 512 ||
      blockIds.size >= 20_000 ||
      !record(value) ||
      typeof value.type !== 'string' ||
      !allowed.has(value.type) ||
      typeof value.id !== 'string' ||
      !value.id.length ||
      value.id.length > 128 ||
      blockIds.has(value.id)
    )
      fail()
    blockIds.add(value.id)
    for (const key of ['x', 'y'])
      if (
        value[key] !== undefined &&
        (typeof value[key] !== 'number' || !Number.isFinite(value[key]))
      )
        fail()
    for (const key of ['collapsed', 'deletable', 'movable', 'editable', 'enabled', 'inline'])
      if (value[key] !== undefined && typeof value[key] !== 'boolean') fail()
    if (value.data !== undefined && typeof value.data !== 'string') fail()
    if (
      value.disabledReasons !== undefined &&
      (!Array.isArray(value.disabledReasons) ||
        value.disabledReasons.some((reason) => typeof reason !== 'string'))
    )
      fail()
    // A source-derived cache cannot promise different execution through a visual flag.
    if (
      value.enabled === false ||
      (Array.isArray(value.disabledReasons) && value.disabledReasons.length)
    )
      fail()
    if (
      value.icons !== undefined &&
      (!record(value.icons) || Object.keys(value.icons).some((key) => key !== 'comment'))
    )
      fail()
    if (record(value.icons) && value.icons.comment !== undefined) {
      const comment = value.icons.comment
      if (
        !record(comment) ||
        (comment.text !== undefined && typeof comment.text !== 'string') ||
        (comment.pinned !== undefined && typeof comment.pinned !== 'boolean')
      )
        fail()
      for (const key of ['x', 'y', 'width', 'height'])
        if (
          comment[key] !== undefined &&
          (typeof comment[key] !== 'number' || !Number.isFinite(comment[key]))
        )
          fail()
    }
    if (record(value.fields)) savedFields.set(value.id, value.fields)
    if (
      value.fields !== undefined &&
      (!record(value.fields) ||
        Object.values(value.fields).some((field) => typeof field !== 'string'))
    )
      fail()
    if (value.inputs !== undefined && !record(value.inputs)) fail()
    const connections = [
      ...Object.values(value.inputs ?? {}),
      ...(value.next !== undefined ? [value.next] : []),
    ]
    for (const connection of connections) {
      if (
        !record(connection) ||
        Object.keys(connection).some((key) => !['block', 'shadow'].includes(key))
      )
        fail()
      for (const child of Object.values(connection)) queue.push({ value: child, depth: depth + 1 })
    }
  }
  if (state.workspaceComments !== undefined) {
    if (!Array.isArray(state.workspaceComments) || state.workspaceComments.length > 2000) fail()
    const ids = new Set<string>()
    for (const comment of state.workspaceComments) {
      if (
        !record(comment) ||
        typeof comment.id !== 'string' ||
        comment.id.length > 128 ||
        ids.has(comment.id) ||
        (comment.text !== undefined && typeof comment.text !== 'string')
      )
        fail()
      ids.add(comment.id)
      for (const key of ['collapsed', 'editable', 'movable', 'deletable'])
        if (comment[key] !== undefined && typeof comment[key] !== 'boolean') fail()
      for (const key of ['x', 'y', 'width', 'height'])
        if (
          comment[key] !== undefined &&
          (typeof comment[key] !== 'number' || !Number.isFinite(comment[key]))
        )
          fail()
    }
  }
  registerPythonBlocks(codecs)
  const scratch = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(state, scratch)
    if (scratch.getAllBlocks(false).length !== blockIds.size) fail()
    for (const [id, fields] of savedFields) {
      const block = scratch.getBlockById(id)
      for (const [name, value] of Object.entries(fields))
        if (!block?.getField(name)?.isSerializable() || block.getFieldValue(name) !== value) fail()
    }
    check?.(scratch)
  } catch {
    fail()
  } finally {
    scratch.dispose()
  }
  return state
}
