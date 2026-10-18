import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import {
  pythonVisualToWorkspace,
  pythonWorkspaceToVisual,
  registerPythonBlocks,
} from '../../blocks/blockly'
import { PYTHON_PROGRAMMING_CODECS } from '../../blocks/catalog'
import {
  attribute,
  call,
  expression,
  integer,
  moduleNode,
  name,
  node,
  pythonSemanticTree,
  text,
  withTargetContext,
} from '../../blocks/nodes'
import {
  type PythonVisualNode,
  pythonASTToVisual,
  pythonVisualToAST,
} from '../../blocks/projection'
import { describePythonCatalog, selectPythonPalette } from '../../blocks/selection'
import { PYTHON_TURTLE_CODECS } from './catalog'

const codecs = [...PYTHON_TURTLE_CODECS, ...PYTHON_PROGRAMMING_CODECS]
const imported = (asname: string | null = null) =>
  node('Import', { names: [node('alias', { name: 'turtle', asname })] })
const assigned = (id: string, value: ReturnType<typeof call>) =>
  node('Assign', { targets: [name(id, 'Store')], value, type_comment: null })
function types(values: PythonVisualNode[]): string[] {
  return values.flatMap((value) =>
    value.kind === 'source'
      ? []
      : [value.codecId, ...value.inputs.flatMap((input) => types(input.nodes))],
  )
}

test('all Turtle owners and aliases have distinct lossless blocks and serializable Blockly layouts', () => {
  expect(PYTHON_TURTLE_CODECS).toHaveLength(178)
  expect(new Set(codecs.map((codec) => codec.id)).size).toBe(codecs.length)
  registerPythonBlocks(codecs)
  const workspace = new Blockly.Workspace()
  try {
    for (const codec of PYTHON_TURTLE_CODECS) {
      const original = codec.defaultNode(),
        shape = codec.decode(original)
      expect(shape, codec.id).toBeDefined()
      expect(pythonSemanticTree(codec.encode(shape!)), codec.id).toEqual(
        pythonSemanticTree(original),
      )
      const block = workspace.newBlock(codec.id)
      expect(block.getTooltip()).toContain(codec.api)
      const saved = Blockly.serialization.blocks.save(block)!
      block.dispose()
      const restored = Blockly.serialization.blocks.append(saved, workspace)
      expect(Blockly.serialization.blocks.save(restored)).toEqual(saved)
      restored.dispose()
    }
  } finally {
    workspace.dispose()
  }
})

test('aliases and direct Turtle/Screen instances keep names and source semantics through Blockly', () => {
  const original = moduleNode([
    imported('desenho'),
    assigned('artista', call(attribute(name('desenho'), 'Turtle'))),
    assigned('janela', call(attribute(name('desenho'), 'Screen'))),
    expression(call(attribute(name('artista'), 'fd'), [integer('40')])),
    expression(call(attribute(name('janela'), 'clear'))),
    expression(call(attribute(name('desenho'), 'right'), [integer('90')])),
    node('ImportFrom', {
      module: 'turtle',
      level: { literal: 'int', value: '0' },
      names: [node('alias', { name: 'forward', asname: 'andar' })],
    }),
    expression(call(name('andar'), [integer('20')])),
  ])
  const projection = pythonASTToVisual(original, { codecs, officialModules: new Set(['turtle']) })
  expect(types(projection.body)).toEqual(
    expect.arrayContaining([
      'sz_py_turtle_module_Turtle',
      'sz_py_turtle_module_Screen',
      'sz_py_turtle_turtle_fd',
      'sz_py_turtle_screen_clear',
      'sz_py_turtle_module_right',
      'sz_py_turtle_module_forward',
    ]),
  )
  const workspace = new Blockly.Workspace()
  try {
    const roots = pythonVisualToWorkspace(projection, workspace, codecs)
    const restored = pythonVisualToAST(
      pythonWorkspaceToVisual(workspace, roots, [], codecs),
      codecs,
    )
    expect(pythonSemanticTree(restored)).toEqual(pythonSemanticTree(original))
  } finally {
    workspace.dispose()
  }
})

test('custom modules, reassigned objects and unavailable official modules stay generic', () => {
  const base = [imported(), assigned('t', call(attribute(name('turtle'), 'Turtle')))]
  const command = expression(call(attribute(name('t'), 'forward'), [integer('10')]))
  for (const body of [
    ...['setattr', 'delattr'].flatMap((operation) =>
      ['t', 'turtle'].map((target) => [
        ...base,
        expression(
          call(name(operation), [
            name(target),
            text('forward'),
            ...(operation === 'setattr' ? [name('custom')] : []),
          ]),
        ),
        command,
        expression(call(attribute(name('turtle'), 'forward'), [integer('10')])),
      ]),
    ),
    [...base, assigned('t', call(name('OutraClasse'))), command],
    [assigned('t', call(name('OutraClasse'))), command],
    [
      imported(),
      node('Assign', {
        targets: [withTargetContext(attribute(name('turtle'), 'forward'), 'Store')],
        value: name('outra'),
        type_comment: null,
      }),
      expression(call(attribute(name('turtle'), 'forward'))),
    ],
  ]) {
    const result = pythonASTToVisual(moduleNode(body), {
      codecs,
      officialModules: new Set(['turtle']),
    })
    expect(types(result.body).includes('sz_py_turtle_turtle_forward')).toBe(false)
    expect(types(result.body).includes('sz_py_turtle_module_forward')).toBe(false)
  }
  const unavailable = pythonASTToVisual(moduleNode([...base, command]), { codecs })
  expect(types(unavailable.body).some((id) => id.startsWith('sz_py_turtle_'))).toBe(false)
})

test('event, animation and fill selections include their operational partners', () => {
  const catalog = describePythonCatalog(codecs)
  const approvedBlockIds = new Set(catalog.map((entry) => entry.id))
  for (const [chosen, required] of [
    ['module_onkey', ['module_listen', 'module_mainloop']],
    ['screen_onkeypress', ['module_listen', 'module_mainloop']],
    ['turtle_onclick', ['module_mainloop']],
    ['module_ontimer', ['module_mainloop']],
    ['module_tracer', ['module_update']],
    ['screen_tracer', ['module_update']],
    ['turtle_end_fill', ['turtle_begin_fill']],
    ['module_begin_fill', ['module_end_fill']],
  ] as const) {
    const selected = selectPythonPalette({
      level: 1,
      catalog,
      approvedBlockIds,
      allowBlocks: [`sz_py_turtle_${chosen}`],
      installedExtensions: new Set(['python-turtle']),
    })
    for (const id of required)
      expect(selected.entries.map((entry) => entry.id)).toContain(`sz_py_turtle_${id}`)
  }
})

test('Turtle is optional and event curation includes imports, functions and receiver construction', () => {
  const catalog = describePythonCatalog(codecs)
  const approvedBlockIds = new Set(catalog.map((entry) => entry.id))
  const selection = {
    level: 1 as const,
    catalog,
    approvedBlockIds,
    allowBlocks: ['sz_py_turtle_turtle_onclick'],
  }
  expect(() => selectPythonPalette({ ...selection, installedExtensions: new Set() })).toThrow(
    'indisponível',
  )
  const selected = selectPythonPalette({
    ...selection,
    installedExtensions: new Set(['python-turtle']),
  })
  const ids = selected.entries.map((entry) => entry.id)
  expect(ids).toEqual(
    expect.arrayContaining([
      'sz_py_import',
      'sz_py_function',
      'sz_py_turtle_module_Turtle',
      'sz_py_assign',
    ]),
  )
  expect(ids).not.toContain('sz_py_turtle_module_addshape')
  const plain = selectPythonPalette({
    level: 3,
    catalog,
    approvedBlockIds,
    installedExtensions: new Set(),
  })
  expect(plain.entries.every((entry) => entry.owner === 'programming')).toBe(true)
  const initial = selectPythonPalette({
    level: 1,
    catalog,
    approvedBlockIds,
    installedExtensions: new Set(['python-turtle']),
  })
  const initialTurtle = initial.entries.filter((entry) => entry.owner === 'python-turtle')
  expect(initialTurtle).toHaveLength(10)
  expect(initialTurtle.map((entry) => entry.id)).toContain('sz_py_turtle_module_forward')
  expect(initialTurtle.map((entry) => entry.id)).not.toContain('sz_py_turtle_module_fd')
})
