import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import {
  type PythonBlocklyBlock,
  pythonVisualToWorkspace,
  pythonWorkspaceToVisual,
  registerPythonBlocks,
} from './blockly'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import {
  attribute,
  call,
  integer,
  moduleNode,
  name,
  node,
  pass,
  pythonSemanticTree,
  text,
} from './nodes'
import { pythonASTToVisual, pythonVisualToAST } from './projection'

function fixture() {
  return moduleNode([
    node('Assign', {
      targets: [name('pontos', 'Store')],
      value: integer('90071992547409931234567890'),
      type_comment: null,
    }),
    node('If', {
      test: name('pontos'),
      body: [
        node('Expr', {
          value: call(
            name('print'),
            [text('🐢\n"ação"'), name('pontos')],
            [node('keyword', { arg: 'end', value: text('!') })],
          ),
        }),
      ],
      orelse: [pass()],
    }),
    node('Expr', {
      value: node('JoinedStr', {
        values: [
          text('Pontos: '),
          node('FormattedValue', {
            value: name('pontos'),
            conversion: { literal: 'int', value: '-1' },
            format_spec: null,
          }),
        ],
      }),
    }),
  ])
}

test('Python blocks preserve AST through real Blockly connections and saved workspace state', () => {
  const first = new Blockly.Workspace(),
    second = new Blockly.Workspace()
  try {
    const original = fixture()
    const roots = pythonVisualToWorkspace(pythonASTToVisual(original), first)
    expect(pythonSemanticTree(pythonVisualToAST(pythonWorkspaceToVisual(first, roots)))).toEqual(
      pythonSemanticTree(original),
    )
    const saved = Blockly.serialization.workspaces.save(first)
    Blockly.serialization.workspaces.load(saved, second)
    expect(pythonSemanticTree(pythonVisualToAST(pythonWorkspaceToVisual(second, roots)))).toEqual(
      pythonSemanticTree(original),
    )
    const integerBlock = second.getAllBlocks(false).find((block) => block.type === 'sz_py_integer')!
    integerBlock.setFieldValue('42', 'NUMBER')
    const changed = pythonVisualToAST(pythonWorkspaceToVisual(second, roots))
    expect(JSON.stringify(changed)).toContain('42')
    expect(JSON.stringify(changed)).not.toContain('90071992547409931234567890')
  } finally {
    first.dispose()
    second.dispose()
  }
})

test('every catalog definition creates a namespaced block with valid layout', () => {
  registerPythonBlocks()
  const workspace = new Blockly.Workspace()
  try {
    for (const codec of PYTHON_PROGRAMMING_CODECS)
      expect(workspace.newBlock(codec.id).type).toBe(codec.id)
  } finally {
    workspace.dispose()
  }
})

test('missing values and disconnected blocks are diagnosed instead of dropped or replaced', () => {
  const workspace = new Blockly.Workspace()
  try {
    const roots = pythonVisualToWorkspace(
      pythonASTToVisual(moduleNode([node('Expr', { value: call(name('print'), [text('Olá')]) })])),
      workspace,
    )
    const string = workspace.getAllBlocks(false).find((block) => block.type === 'sz_py_text')!
    string.unplug()
    expect(() => pythonWorkspaceToVisual(workspace, roots)).toThrow('Preencha')
    const print = workspace.getAllBlocks(false).find((block) => block.type === 'sz_py_print')!
    print.getInput('args:0')!.connection!.connect(string.outputConnection!)
    workspace.newBlock('sz_py_integer')
    expect(() => pythonWorkspaceToVisual(workspace, roots)).toThrow('soltos')
  } finally {
    workspace.dispose()
  }
})

test('opaque source and target contexts survive the Blockly representation', () => {
  const workspace = new Blockly.Workspace()
  try {
    const original = moduleNode([
      node('Assign', {
        targets: [
          node('Tuple', {
            elts: [
              name('first', 'Store'),
              node('Starred', { value: name('rest', 'Store'), ctx: node('Store') }),
            ],
            ctx: node('Store'),
          }),
        ],
        value: name('items'),
        type_comment: null,
      }),
      node('Assign', {
        targets: [
          node('Attribute', { ...attribute(name('self'), 'pontos').fields, ctx: node('Store') }),
        ],
        value: integer('1'),
        type_comment: null,
      }),
      node('Assert', { test: name('ready'), msg: null }),
    ])
    const roots = pythonVisualToWorkspace(pythonASTToVisual(original), workspace)
    // `*rest` is a block of its own now; the assert stays a source block.
    expect(
      workspace.getAllBlocks(false).filter((block) => block.type.startsWith('sz_py_source_')),
    ).toHaveLength(1)
    expect(workspace.getAllBlocks(false).some((block) => block.type === 'sz_py_starred')).toBe(true)
    expect(
      pythonSemanticTree(pythonVisualToAST(pythonWorkspaceToVisual(workspace, roots))),
    ).toEqual(pythonSemanticTree(original))
  } finally {
    workspace.dispose()
  }
})

test('argument resizing preserves connections and participates in Blockly undo and redo', async () => {
  const workspace = new Blockly.Workspace()
  try {
    const roots = pythonVisualToWorkspace(
      pythonASTToVisual(moduleNode([node('Expr', { value: call(name('print'), [text('Olá')]) })])),
      workspace,
    )
    const block = workspace
      .getAllBlocks(false)
      .find((block) => block.type === 'sz_py_print') as PythonBlocklyBlock
    const connected = block.getInputTargetBlock('args:0')!
    await new Promise((resolve) => setTimeout(resolve, 10))
    workspace.clearUndo()
    block.setPythonOption('args:count', 2)
    expect(block.getInputTargetBlock('args:0')?.id).toBe(connected.id)
    expect(block.getInput('args:1')).not.toBeNull()
    // The new socket starts with the documented default as a shadow, as in the palette.
    const added = block.getInputTargetBlock('args:1')
    expect(added?.isShadow()).toBe(true)
    expect(added?.getFieldValue('TEXT')).toBe('Olá!')
    expect(() => pythonWorkspaceToVisual(workspace, roots)).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 10))
    workspace.undo(false)
    expect(block.getInput('args:1')).toBeNull()
    expect(block.getInputTargetBlock('args:0')?.id).toBe(connected.id)
    workspace.undo(true)
    expect(block.getInput('args:1')).not.toBeNull()
    expect(block.getInputTargetBlock('args:0')?.id).toBe(connected.id)
    // Redo brings the socket back with its default, not empty.
    expect(block.getInputTargetBlock('args:1')?.getFieldValue('TEXT')).toBe('Olá!')
    expect(() => pythonWorkspaceToVisual(workspace, roots)).not.toThrow()
    // Removing the socket that holds only the default shadow is allowed; a placed block is not.
    block.getInputTargetBlock('args:1')!.setFieldValue('Tchau', 'TEXT')
    await new Promise((resolve) => setTimeout(resolve, 10))
    block.setPythonOption('args:count', 1)
    expect(block.getInput('args:1')).toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 10))
    // Undoing the removal brings the shadow back with what the child had typed in it.
    workspace.undo(false)
    expect(block.getInputTargetBlock('args:1')?.getFieldValue('TEXT')).toBe('Tchau')
    workspace.undo(true)
    expect(block.getInput('args:1')).toBeNull()
    expect(() => block.setPythonOption('args:count', 0)).toThrow('Desconecte')
    expect(block.getInputTargetBlock('args:0')?.id).toBe(connected.id)
  } finally {
    workspace.dispose()
  }
})

test('all advertised count and optional controls produce coherent layouts', () => {
  registerPythonBlocks()
  const workspace = new Blockly.Workspace()
  try {
    for (const codec of PYTHON_PROGRAMMING_CODECS)
      for (const control of codec.controls ?? []) {
        const block = workspace.newBlock(codec.id) as PythonBlocklyBlock
        const current = block.pythonState.layout.extra![control.key]
        const next = control.kind === 'optional' ? !current : Number(current) + 1
        block.setPythonOption(control.key, next)
        expect(block.pythonState.layout.extra![control.key], `${codec.id}/${control.key}`).toBe(
          next,
        )
        const saved = Blockly.serialization.blocks.save(block)!
        const restored = Blockly.serialization.blocks.append(saved, workspace) as PythonBlocklyBlock
        expect(restored.pythonState.layout.extra![control.key]).toBe(next)
        block.dispose()
        restored.dispose()
      }
  } finally {
    workspace.dispose()
  }
})

test('setting an optional input twice preserves the learner value and connection', () => {
  registerPythonBlocks()
  const workspace = new Blockly.Workspace()
  try {
    const alias = workspace.newBlock('sz_py_alias') as PythonBlocklyBlock
    alias.setPythonOption('asname:present', true)
    alias.setFieldValue('minha_tartaruga', 'asname')
    alias.setPythonOption('asname:present', true)
    expect(alias.getFieldValue('asname')).toBe('minha_tartaruga')
    const returned = workspace.newBlock('sz_py_return') as PythonBlocklyBlock
    const connected = workspace.newBlock('sz_py_integer')
    returned.getInput('value')!.connection!.connect(connected.outputConnection!)
    returned.setPythonOption('value:present', true)
    expect(returned.getInputTargetBlock('value')?.id).toBe(connected.id)
  } finally {
    workspace.dispose()
  }
})

test('the title label is presentation only; the editable literal field carries the source value', () => {
  const workspace = new Blockly.Workspace()
  try {
    const roots = pythonVisualToWorkspace(pythonASTToVisual(fixture()), workspace)
    const block = workspace.getAllBlocks(false).find((item) => item.type === 'sz_py_integer')!
    const named = block.inputList.flatMap((input) => input.fieldRow).filter((field) => field.name)
    // A gesture driver that picks the first named field hits the label, not the number.
    expect(named.map((field) => [field.name, field.EDITABLE])).toEqual([
      ['PYTHON_TITLE', false],
      ['NUMBER', true],
    ])
    block.getField('PYTHON_TITLE')!.setValue('4')
    expect(
      pythonSemanticTree(pythonVisualToAST(pythonWorkspaceToVisual(workspace, roots))),
    ).toEqual(pythonSemanticTree(fixture()))
    block.getField('NUMBER')!.setValue('4')
    expect(JSON.stringify(pythonVisualToAST(pythonWorkspaceToVisual(workspace, roots)))).toContain(
      '{"literal":"int","value":"4"}',
    )
  } finally {
    workspace.dispose()
  }
})

const settle = () => new Promise((resolve) => setTimeout(resolve, 10))

test('adding and removing a case or except is one undo step each way, even for a fresh empty piece', async () => {
  registerPythonBlocks()
  for (const [type, key, piece] of [
    ['sz_py_match', 'cases:count', 'sz_py_case'],
    ['sz_py_try', 'handlers:count', 'sz_py_except'],
  ] as const) {
    const workspace = new Blockly.Workspace()
    try {
      const block = workspace.newBlock(type) as PythonBlocklyBlock
      const prefix = key.replace(':count', '')
      const before = Number(block.pythonState.layout.extra![key])
      const last = `${prefix}:${before}`
      await settle()
      workspace.clearUndo()
      // Adicionar: a real piece arrives in the new input.
      block.setPythonOption(key, before + 1)
      const added = block.getInputTargetBlock(last)!
      expect(added.type, type).toBe(piece)
      expect(added.isShadow(), type).toBe(false)
      await settle()
      // Remover right away: the untouched piece goes with its input.
      block.setPythonOption(key, before)
      expect(block.getInput(last), type).toBeNull()
      expect(workspace.getBlockById(added.id), type).toBeNull()
      await settle()
      // Undo the removal: the input and its piece come back, connected.
      workspace.undo(false)
      expect(block.pythonState.layout.extra![key], type).toBe(before + 1)
      expect(block.getInputTargetBlock(last)?.type, type).toBe(piece)
      // Undo the addition: back to the original shape, nothing left floating.
      workspace.undo(false)
      expect(block.pythonState.layout.extra![key], type).toBe(before)
      expect(block.getInput(last), type).toBeNull()
      expect(workspace.getTopBlocks(false).length, type).toBe(1)
      // Redo brings the piece back together with its input (its default shadows too).
      workspace.undo(true)
      const redone = block.getInputTargetBlock(last)!
      expect(redone?.type, type).toBe(piece)
      expect(
        redone.getChildren(false).some((child) => child.isShadow()),
        type,
      ).toBe(true)
      workspace.undo(true)
      expect(block.getInput(last), type).toBeNull()
      expect(workspace.getTopBlocks(false).length, type).toBe(1)
      // A piece the child changed still has to be moved out first.
      block.setPythonOption(key, before + 1)
      const changed = block.getInputTargetBlock(last)!
      const command = workspace.newBlock('sz_py_pass')
      changed.getInput('body')!.connection!.connect(command.previousConnection!)
      expect(() => block.setPythonOption(key, before), type).toThrow('Desconecte')
      expect(block.getInputTargetBlock(last)?.id, type).toBe(changed.id)
    } finally {
      workspace.dispose()
    }
  }
})

test('a node above the block ceiling stays as exact Python text, and the rest loads', () => {
  const arg = (id: string) => node('arg', { arg: id, annotation: null, type_comment: null })
  const args = Array.from({ length: 400 }, (_, i) => arg(`a${i}`))
  const keywordOnly = Array.from({ length: 300 }, (_, i) => arg(`k${i}`))
  // 400 parameters + 400 defaults + 300 keyword-only + 300 defaults: 1400 sockets.
  const parameters = node('arguments', {
    posonlyargs: [],
    args,
    vararg: null,
    kwonlyargs: keywordOnly,
    kw_defaults: keywordOnly.map(() => integer('0')),
    kwarg: null,
    defaults: args.map(() => integer('1')),
  })
  const tree = moduleNode([
    node('FunctionDef', {
      name: 'f',
      args: parameters,
      body: [pass()],
      decorator_list: [],
      returns: null,
      type_comment: null,
      type_params: [],
    }),
    // A full call: 512 values and 512 named values still fit one block.
    node('Expr', {
      value: call(
        name('f'),
        Array.from({ length: 512 }, (_, i) => integer(String(i))),
        Array.from({ length: 512 }, (_, i) =>
          node('keyword', { arg: `n${i}`, value: integer('0') }),
        ),
      ),
    }),
  ])
  const projection = pythonASTToVisual(tree)
  const definition = projection.body[0]!
  expect(definition.kind).toBe('block')
  const held = definition.kind === 'block' ? definition.inputs.flatMap((input) => input.nodes) : []
  expect(held.some((item) => item.kind === 'source' && item.node.kind === 'arguments')).toBe(true)
  const callBlock = projection.body[1]!
  expect(callBlock.kind).toBe('block')
  const workspace = new Blockly.Workspace()
  try {
    const roots = pythonVisualToWorkspace(projection, workspace)
    expect(
      pythonSemanticTree(pythonVisualToAST(pythonWorkspaceToVisual(workspace, roots))),
    ).toEqual(pythonSemanticTree(tree))
  } finally {
    workspace.dispose()
  }
})
