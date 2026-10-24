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
import { attachPythonResolverOptions } from '../../blocks/resolverOptions'
import { describePythonCatalog, selectPythonPalette } from '../../blocks/selection'
import { PYTHON_TURTLE_CODECS, TURTLE_STAR_EXPORTS } from './catalog'

const codecs = attachPythonResolverOptions(
  [...PYTHON_TURTLE_CODECS, ...PYTHON_PROGRAMMING_CODECS],
  {
    starExports: new Map([['turtle', TURTLE_STAR_EXPORTS]]),
  },
)
const official = { codecs, officialModules: new Set(['turtle']) }
const imported = (asname: string | null = null) =>
  node('Import', { names: [node('alias', { name: 'turtle', asname })] })
const assigned = (id: string, value: ReturnType<typeof node>) =>
  node('Assign', { targets: [name(id, 'Store')], value, type_comment: null })
const turtleCall = (receiver: string, method: string, args = [integer('10')]) =>
  expression(call(attribute(name(receiver), method), args))
function types(values: PythonVisualNode[]): string[] {
  return values.flatMap((value) =>
    value.kind === 'source'
      ? []
      : [value.codecId, ...value.inputs.flatMap((input) => types(input.nodes))],
  )
}
function roundTripThroughBlockly(original: ReturnType<typeof moduleNode>) {
  const projection = pythonASTToVisual(original, official)
  const workspace = new Blockly.Workspace()
  try {
    const roots = pythonVisualToWorkspace(projection, workspace, codecs)
    const saved = Blockly.serialization.workspaces.save(workspace)
    workspace.clear()
    Blockly.serialization.workspaces.load(saved, workspace)
    const restored = pythonVisualToAST(
      pythonWorkspaceToVisual(workspace, roots, [], codecs),
      codecs,
    )
    expect(pythonSemanticTree(restored)).toEqual(pythonSemanticTree(original))
  } finally {
    workspace.dispose()
  }
  return types(projection.body)
}

test('every Turtle concept is one lossless block whose palette layout survives Blockly', () => {
  expect(new Set(codecs.map((codec) => codec.id)).size).toBe(codecs.length)
  // One block per concept (plus hidden getters), not one per alias and owner.
  expect(PYTHON_TURTLE_CODECS.filter((codec) => !codec.hidden).length).toBeLessThan(80)
  registerPythonBlocks(codecs)
  const workspace = new Blockly.Workspace()
  try {
    for (const codec of PYTHON_TURTLE_CODECS) {
      const original = codec.defaultNode()
      const shape = codec.decode(original)
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

test('commands are statement blocks with named, filled sockets (no "executar" wrapper)', () => {
  const projection = pythonASTToVisual(
    moduleNode([imported(), turtleCall('turtle', 'forward', [integer('40')])]),
    official,
  )
  const command = projection.body[1]
  expect(command).toMatchObject({ kind: 'block', codecId: 'sz_py_turtle_turtle_forward' })
  if (command?.kind !== 'block') throw new Error('block')
  expect(command.inputs.map((input) => input.label)).toEqual(['passos'])
  const forward = PYTHON_TURTLE_CODECS.find((codec) => codec.id === 'sz_py_turtle_turtle_forward')!
  expect(forward.role).toBe('statement')
  expect(forward.title).toBe('andar para frente')
})

test('aliases, procedural, imported and object forms share one block and keep their spelling', () => {
  const original = moduleNode([
    imported('desenho'),
    assigned('artista', call(attribute(name('desenho'), 'Turtle'))),
    assigned('janela', call(attribute(name('desenho'), 'Screen'))),
    turtleCall('artista', 'fd', [integer('40')]),
    turtleCall('janela', 'clear', []),
    turtleCall('desenho', 'right', [integer('90')]),
    turtleCall('desenho', 'clearscreen', []),
    node('ImportFrom', {
      module: 'turtle',
      level: { literal: 'int', value: '0' },
      names: [node('alias', { name: 'forward', asname: null })],
    }),
    expression(call(name('forward'), [integer('20')])),
    expression(
      call(
        attribute(name('desenho'), 'goto'),
        [],
        [
          node('keyword', { arg: 'y', value: integer('5') }),
          node('keyword', { arg: 'x', value: integer('1') }),
        ],
      ),
    ),
  ])
  const ids = roundTripThroughBlockly(original)
  expect(ids).toEqual(
    expect.arrayContaining([
      'sz_py_turtle_new_turtle',
      'sz_py_turtle_new_screen',
      'sz_py_turtle_turtle_forward',
      'sz_py_turtle_screen_clear',
      'sz_py_turtle_turtle_right',
      'sz_py_turtle_turtle_goto',
    ]),
  )
  expect(ids.filter((id) => id === 'sz_py_turtle_turtle_forward')).toHaveLength(2)
  expect(ids.filter((id) => id === 'sz_py_turtle_screen_clear')).toHaveLength(2)
  expect(ids).not.toContain('sz_py_method')
})

test('the object receiver is shown only when the code names an object', () => {
  const body = pythonASTToVisual(
    moduleNode([
      imported('t'),
      turtleCall('t', 'forward'),
      assigned('caneta', call(attribute(name('t'), 'Turtle'))),
      turtleCall('caneta', 'forward'),
    ]),
    official,
  ).body
  const procedural = body[1]
  const object = body[3]
  if (procedural?.kind !== 'block' || object?.kind !== 'block') throw new Error('blocks')
  expect(procedural.inputs.map((input) => input.name)).toEqual(['distance'])
  expect(object.inputs.map((input) => input.name)).toEqual(['receiver', 'distance'])
})

test('distinctive Turtle methods stay specialized on turtles kept in self, lists or dicts', () => {
  const pen = attribute(name('self'), 'caneta')
  const ids = types(
    pythonASTToVisual(
      moduleNode([
        imported(),
        expression(call(attribute(pen, 'penup'))),
        expression(call(attribute(pen, 'goto'), [integer('0'), integer('0')])),
        // speed/color/clear are common names of other objects: keep the generic call.
        expression(call(attribute(pen, 'speed'), [integer('0')])),
      ]),
      official,
    ).body,
  )
  expect(ids).toContain('sz_py_turtle_turtle_penup')
  expect(ids).toContain('sz_py_turtle_turtle_goto')
  expect(ids).toContain('sz_py_method')
  expect(ids).not.toContain('sz_py_turtle_turtle_speed')
})

test('global and star imports no longer downgrade the official blocks', () => {
  const ids = types(
    pythonASTToVisual(
      moduleNode([
        node('ImportFrom', {
          module: 'turtle',
          level: { literal: 'int', value: '0' },
          names: [node('alias', { name: '*', asname: null })],
        }),
        assigned('pontos', integer('0')),
        node('FunctionDef', {
          name: 'marcar',
          args: node('arguments', {
            posonlyargs: [],
            args: [],
            vararg: null,
            kwonlyargs: [],
            kw_defaults: [],
            kwarg: null,
            defaults: [],
          }),
          body: [
            node('Global', { names: ['pontos'] }),
            node('AugAssign', {
              target: name('pontos', 'Store'),
              op: node('Add'),
              value: integer('1'),
            }),
            expression(call(name('forward'), [integer('10')])),
          ],
          decorator_list: [],
          returns: null,
          type_comment: null,
          type_params: [],
        }),
      ]),
      official,
    ).body,
  )
  expect(ids).toContain('sz_py_import_all')
  expect(ids).toContain('sz_py_global')
  expect(ids).toContain('sz_py_turtle_turtle_forward')
})

test('custom modules, reassigned objects and unavailable official modules stay generic', () => {
  const base = [imported(), assigned('t', call(attribute(name('turtle'), 'Turtle')))]
  const command = turtleCall('t', 'speed')
  for (const body of [
    ...['setattr', 'delattr'].flatMap((operation) =>
      ['t', 'turtle'].map((target) => [
        ...base,
        expression(
          call(name(operation), [
            name(target),
            text('speed'),
            ...(operation === 'setattr' ? [name('custom')] : []),
          ]),
        ),
        command,
      ]),
    ),
    [...base, assigned('t', call(name('OutraClasse'))), command],
    [assigned('t', call(name('OutraClasse'))), command],
    [
      ...base,
      node('Assign', {
        targets: [withTargetContext(attribute(name('turtle'), 'speed'), 'Store')],
        value: name('outra'),
        type_comment: null,
      }),
      command,
    ],
  ]) {
    const result = pythonASTToVisual(moduleNode(body), official)
    expect(types(result.body)).not.toContain('sz_py_turtle_turtle_speed')
  }
  const unavailable = pythonASTToVisual(moduleNode([...base, command]), { codecs })
  expect(types(unavailable.body).some((id) => id.startsWith('sz_py_turtle_'))).toBe(false)
})

test('a distinctive method keeps its block on a parameter, but not on proof of another object', () => {
  const forward = turtleCall('t', 'forward')
  const used = (body: ReturnType<typeof node>[]) =>
    types(pythonASTToVisual(moduleNode(body), official).body)
  const fromTurtle = assigned('t', call(attribute(name('turtle'), 'Turtle')))
  expect(used([imported(), fromTurtle, forward])).toContain('sz_py_turtle_turtle_forward')
  // A parameter or a loop target may hold a turtle kept in a list.
  const parameter = node('FunctionDef', {
    name: 'andar',
    args: node('arguments', {
      posonlyargs: [],
      args: [node('arg', { arg: 't', annotation: null, type_comment: null })],
      vararg: null,
      kwonlyargs: [],
      kw_defaults: [],
      kwarg: null,
      defaults: [],
    }),
    body: [forward],
    decorator_list: [],
    returns: null,
    type_comment: null,
    type_params: [],
  })
  expect(used([imported(), parameter])).toContain('sz_py_turtle_turtle_forward')
  // Rebuilt from another class, or made by a module that is only called turtle: not a turtle.
  expect(
    used([imported(), fromTurtle, assigned('t', call(name('OutraClasse'))), forward]),
  ).not.toContain('sz_py_turtle_turtle_forward')
  const otherModule = node('Import', {
    names: [node('alias', { name: 'meu_desenho', asname: 'turtle' })],
  })
  expect(used([otherModule, fromTurtle, forward])).not.toContain('sz_py_turtle_turtle_forward')
  // A list is never a turtle.
  expect(
    used([imported(), assigned('t', node('List', { elts: [], ctx: node('Load') })), forward]),
  ).not.toContain('sz_py_turtle_turtle_forward')
})

test('object state keeps specialized blocks; replacing an official name or a dunder does not', () => {
  const base = [imported(), assigned('t', call(attribute(name('turtle'), 'Turtle')))]
  const command = turtleCall('t', 'speed')
  const store = (target: ReturnType<typeof attribute>, value = name('outra')) =>
    node('Assign', { targets: [withTargetContext(target, 'Store')], value, type_comment: null })
  const project = (body: ReturnType<typeof node>[]) =>
    types(pythonASTToVisual(moduleNode(body), official).body)
  const method = (statements: ReturnType<typeof node>[]) =>
    node('ClassDef', {
      name: 'Jogo',
      bases: [],
      keywords: [],
      body: [
        node('FunctionDef', {
          name: 'iniciar',
          args: node('arguments', {
            posonlyargs: [],
            args: [node('arg', { arg: 'self', annotation: null, type_comment: null })],
            vararg: null,
            kwonlyargs: [],
            kw_defaults: [],
            kwarg: null,
            defaults: [],
          }),
          body: statements,
          decorator_list: [],
          returns: null,
          type_comment: null,
          type_params: [],
        }),
      ],
      decorator_list: [],
      type_params: [],
    })
  // self.speed of the child's own class is ordinary object state.
  expect(
    project([...base, method([store(attribute(name('self'), 'speed'), integer('3'))]), command]),
  ).toContain('sz_py_turtle_turtle_speed')
  for (const body of [
    [...base, store(attribute(attribute(name('turtle'), 'Turtle'), '_goto')), command],
    [...base, store(attribute(name('t'), 'speed')), command],
    [...base, store(attribute(name('jogador'), 'speed')), command],
    [...base, method([store(attribute(name('self'), '__class__'))]), command],
  ])
    expect(project(body)).not.toContain('sz_py_turtle_turtle_speed')
})

test('official compound shapes keep their receiver, Python API and feature gate through Blockly', () => {
  const component = expression(
    call(attribute(name('desenho'), 'addcomponent'), [
      node('Tuple', {
        elts: [node('Tuple', { elts: [integer('0'), integer('10')], ctx: node('Load') })],
        ctx: node('Load'),
      }),
      text('red'),
    ]),
  )
  const original = moduleNode([
    node('ImportFrom', {
      module: 'turtle',
      level: { literal: 'int', value: '0' },
      names: [node('alias', { name: 'Shape', asname: null })],
    }),
    assigned('desenho', call(name('Shape'), [text('compound')])),
    component,
  ])
  const ids = roundTripThroughBlockly(original)
  expect(ids).toContain('sz_py_turtle_new_shape')
  expect(ids).toContain('sz_py_turtle_shape_addcomponent')
  for (const id of ['sz_py_turtle_new_shape', 'sz_py_turtle_shape_addcomponent']) {
    const codec = PYTHON_TURTLE_CODECS.find((entry) => entry.id === id)!
    expect(codec.requiredRuntimeFeatures).toEqual(['turtle-compound-shapes'])
  }
})

test('event, animation and fill selections include their operational partners', () => {
  const catalog = describePythonCatalog(codecs)
  const approvedBlockIds = new Set(catalog.map((entry) => entry.id))
  for (const [chosen, required] of [
    ['screen_onkey', ['screen_listen', 'screen_mainloop', 'def']],
    ['screen_onkeypress', ['screen_listen', 'screen_mainloop']],
    ['turtle_onclick', ['screen_mainloop']],
    ['screen_ontimer', ['screen_mainloop']],
    ['screen_tracer', ['screen_update']],
    ['turtle_end_fill', ['turtle_begin_fill']],
    ['turtle_begin_fill', ['turtle_end_fill']],
  ] as const) {
    const selected = selectPythonPalette({
      level: 1,
      catalog,
      approvedBlockIds,
      allowBlocks: [`sz_py_turtle_${chosen}`],
      installedExtensions: new Set(['python-turtle']),
    }).entries.map((entry) => entry.id)
    for (const id of required)
      expect(selected).toContain(id === 'def' ? 'sz_py_function' : `sz_py_turtle_${id}`)
  }
})

test('the first Turtle palette is a short teaching set without aliases or hidden getters', () => {
  const catalog = describePythonCatalog(codecs)
  const approvedBlockIds = new Set(catalog.map((entry) => entry.id))
  const initial = selectPythonPalette({
    level: 1,
    catalog,
    approvedBlockIds,
    installedExtensions: new Set(['python-turtle']),
  })
  const turtle = initial.entries.filter((entry) => entry.owner === 'python-turtle')
  const ids = turtle.map((entry) => entry.id)
  expect(ids).toEqual(
    expect.arrayContaining([
      'sz_py_turtle_turtle_forward',
      'sz_py_turtle_turtle_goto',
      'sz_py_turtle_turtle_begin_fill',
      'sz_py_turtle_screen_mainloop',
    ]),
  )
  expect(ids.some((id) => id.endsWith('_valor'))).toBe(false)
  // Turtle comes before Programming, in its teaching order.
  expect(initial.entries[0]?.owner).toBe('python-turtle')
  expect(initial.entries[0]?.path[1]).toBe('Movimento')
  const plain = selectPythonPalette({
    level: 3,
    catalog,
    approvedBlockIds,
    installedExtensions: new Set(),
  })
  expect(plain.entries.every((entry) => entry.owner === 'programming')).toBe(true)
})
