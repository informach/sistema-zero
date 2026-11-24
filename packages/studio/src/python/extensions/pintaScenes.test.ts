import { expect, test } from 'bun:test'
import { PYTHON_PINTA_REGIONS_FEATURE } from '@sistemazero/core/studio/python-runtime-features'
import * as Blockly from 'blockly/core'
import { PGZERO_EXTENSION } from '../../runtime/python/pgzero/contract'
import { PYGAME_EXTENSION } from '../../runtime/python/pygame/contract'
import { RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION } from '../../runtime/python/raylib/contract'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { loadPythonAuthoring, selectPythonPalette } from '../blocks/authoring'
import { pythonVisualToWorkspace, pythonWorkspaceToVisual } from '../blocks/blockly'
import { PYTHON_PROGRAMMING_CODECS } from '../blocks/catalog'
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
} from '../blocks/nodes'
import { type PythonVisualNode, pythonASTToVisual, pythonVisualToAST } from '../blocks/projection'
import { isPythonCourseBlock } from '../course-unlocks'
import type { PythonNode } from '../language/types'
import { pythonOfficialModules } from '../officialModules'
import { PYTHON_PGZERO_CODECS, PYTHON_PGZERO_PINTA_SCENE_CODECS } from './pgzero/catalog'
import { PYTHON_PYGAME_CODECS, PYTHON_PYGAME_PINTA_SCENE_CODECS } from './pygame/catalog'
import { PYTHON_RAYLIB_2D_CODECS, PYTHON_RAYLIB_2D_PINTA_SCENE_CODECS } from './raylib2d/catalog'

const features = [PYTHON_PINTA_REGIONS_FEATURE]
const suffixes = [
  'load',
  'draw',
  'start',
  'objects',
  'property',
  'open_door',
  'blocked',
  'landing',
  'dispose',
] as const
const access = [
  {
    extension: PYGAME_EXTENSION,
    prefix: 'sz_py_pygame_',
    oldCodecs: PYTHON_PYGAME_CODECS,
    sceneCodecs: PYTHON_PYGAME_PINTA_SCENE_CODECS,
    target: [name('tela')],
    offset: 'deslocamento',
  },
  {
    extension: PGZERO_EXTENSION,
    prefix: 'sz_py_pgzero_',
    oldCodecs: PYTHON_PGZERO_CODECS,
    sceneCodecs: PYTHON_PGZERO_PINTA_SCENE_CODECS,
    target: [name('screen')],
    offset: 'camera',
  },
  {
    extension: RAYLIB_2D_EXTENSION,
    prefix: 'sz_py_rl2d_',
    oldCodecs: PYTHON_RAYLIB_2D_CODECS,
    sceneCodecs: PYTHON_RAYLIB_2D_PINTA_SCENE_CODECS,
    target: [],
    offset: 'camera',
  },
]

const assignment = (receiver: string, value: PythonNode) =>
  node('Assign', {
    targets: [withTargetContext(name(receiver), 'Store')],
    value,
    type_comment: null,
  })
const keyword = (arg: string, value: PythonNode) => node('keyword', { arg, value })
const paint = (target: string, args: PythonNode[]) =>
  expression(call(attribute(name(target), 'desenhar'), args))
const api = (method: string, args: PythonNode[] = [], options: PythonNode[] = []) =>
  call(attribute(name('lugar'), method), args, options)
const importar = node('Import', {
  names: [node('alias', { name: 'pinta', asname: 'arte' })],
})
const officialLoad = call(
  attribute(name('arte'), 'carregar_cenario'),
  [text('vila')],
  [keyword('lugar', text('cabana'))],
)
function ids(nodes: PythonVisualNode[]): string[] {
  return nodes.flatMap((item) =>
    item.kind === 'block'
      ? [item.codecId, ...item.inputs.flatMap((input) => ids(input.nodes))]
      : ['source'],
  )
}
async function load(id: string, version: string, blockIds: string[], sceneSupport: boolean) {
  const { project, environment } = await pythonEnvironmentFixture(
    'classic',
    sceneSupport ? features : [],
  )
  if (project.kind !== 'classic') throw new Error('Projeto clássico esperado')
  project.installedExtensions = [{ id, version, installedAt: 1 }]
  const authoring = {
    ...environment,
    pythonAuthoring: [
      {
        runtime: project.runtime,
        blockIds: [...PYTHON_PROGRAMMING_CODECS.map(({ id }) => id), ...blockIds],
      },
    ],
  }
  return { project, loaded: await loadPythonAuthoring(project, authoring) }
}

for (const { extension, prefix, sceneCodecs, oldCodecs, target, offset } of access) {
  test(`${extension.id} preserves AST, aliases and authored scene operations in both directions`, async () => {
    const expectedIds = suffixes.map((suffix) => `${prefix}pinta_scene_${suffix}`)
    expect(sceneCodecs.map((entry) => entry.id)).toEqual(expectedIds)
    const { project, loaded } = await load(extension.id, extension.version, expectedIds, true)
    const officialModules = pythonOfficialModules(project, features)
    const tree = moduleNode([
      importar,
      assignment('lugar', officialLoad),
      assignment('inicio', api('ponto_inicial')),
      assignment('coisas', api('objetos', [], [keyword('tipo', text('door'))])),
      assignment('destino', api('propriedade', [name('porta'), text('destino')])),
      assignment('outro', api('abrir_destino', [name('porta')])),
      assignment('barreira', api('bloqueado', [name('jogador')])),
      assignment(
        'ajustado',
        api('pouso', [name('antes'), name('jogador')], [keyword('gravidade', integer('1'))]),
      ),
      paint('lugar', target),
      expression(
        api('desenhar', target, [
          keyword('tempo', integer('125')),
          keyword('frente', node('Constant', { value: true, kind: null })),
          keyword(offset, name('ponto_camera')),
        ]),
      ),
      paint('outro', target),
      expression(api('descartar')),
    ])
    const visual = pythonASTToVisual(tree, { codecs: loaded.codecs, officialModules })
    const visible = ids(visual.body)
    expect(visible).not.toContain('source')
    for (const id of expectedIds) expect(visible).toContain(id)
    expect(visible.filter((id) => id === `${prefix}pinta_scene_draw`)).toHaveLength(3)
    const workspace = new Blockly.Workspace()
    try {
      const roots = pythonVisualToWorkspace(visual, workspace, loaded.codecs)
      const saved = Blockly.serialization.workspaces.save(workspace)
      workspace.clear()
      Blockly.serialization.workspaces.load(saved, workspace)
      const restored = pythonWorkspaceToVisual(workspace, roots, [], loaded.codecs)
      expect(pythonSemanticTree(pythonVisualToAST(restored, loaded.codecs))).toEqual(
        pythonSemanticTree(tree),
      )
    } finally {
      workspace.dispose()
    }

    const previous = await load(extension.id, extension.version, [], false)
    expect(previous.loaded.codecs.slice(0, oldCodecs.length).map((entry) => entry.id)).toEqual(
      oldCodecs.map((entry) => entry.id),
    )
    expect(previous.loaded.catalog.map((entry) => entry.id)).not.toContain(expectedIds[0])
    expect(expectedIds.some(isPythonCourseBlock)).toBe(false)
    const palette = selectPythonPalette({ ...loaded, level: 2 })
    const sceneEntries = palette.entries.filter(({ id }) => id.startsWith(`${prefix}pinta_scene_`))
    expect(sceneEntries.map(({ id }) => id).sort()).toEqual([...expectedIds].sort())
    expect(sceneEntries.every(({ path }) => path.includes('Cenários do Pinta'))).toBe(true)

    const onlySome = await load(extension.id, extension.version, expectedIds.slice(0, 1), true)
    expect(
      selectPythonPalette({ ...onlySome.loaded, level: 2 })
        .entries.filter(({ id }) => id.startsWith(`${prefix}pinta_scene_`))
        .map(({ id }) => id),
    ).toEqual(expectedIds.slice(0, 1))
  })

  test(`${extension.id} does not claim a drawing call on a learner object or a shadowed import`, async () => {
    const { project, loaded } = await load(extension.id, extension.version, [], true)
    const officialModules = pythonOfficialModules(project, features)
    const negative = moduleNode([
      importar,
      assignment('lugar', call(name('Heroi'))),
      paint('lugar', target),
    ])
    const shadow = moduleNode([importar, assignment('lugar', officialLoad), paint('lugar', target)])
    project.files['pinta.py'] = '# módulo autoral'
    const shadowed = pythonOfficialModules(project, features)
    expect(shadowed.has('pinta')).toBe(false)
    for (const [tree, official] of [
      [negative, officialModules],
      [shadow, shadowed],
    ] as const) {
      const visual = pythonASTToVisual(tree, { codecs: loaded.codecs, officialModules: official })
      expect(ids(visual.body).some((id) => id.startsWith(`${prefix}pinta_scene_`))).toBe(false)
      expect(pythonSemanticTree(pythonVisualToAST(visual, loaded.codecs))).toEqual(
        pythonSemanticTree(tree),
      )
    }
  })
}

test('the candidate never changes the CE map codec or offers the 2D blocks in Raylib 3D', async () => {
  const { project, loaded } = await load(PYGAME_EXTENSION.id, PYGAME_EXTENSION.version, [], true)
  const tree = moduleNode([
    node('Import', { names: [node('alias', { name: 'pinta', asname: null })] }),
    assignment('mapa', call(attribute(name('pinta'), 'carregar_mapa'), [text('fazenda')])),
    paint('mapa', [name('tela')]),
  ])
  const visual = pythonASTToVisual(tree, {
    codecs: loaded.codecs,
    officialModules: pythonOfficialModules(project, features),
  })
  expect(ids(visual.body)).toContain('sz_py_pygame_pinta_map')
  expect(ids(visual.body)).toContain('sz_py_pygame_pinta_draw')
  expect(pythonSemanticTree(pythonVisualToAST(visual, loaded.codecs))).toEqual(
    pythonSemanticTree(tree),
  )
  const three = await load(RAYLIB_3D_EXTENSION.id, RAYLIB_3D_EXTENSION.version, [], true)
  expect(three.loaded.codecs.some(({ id }) => id.includes('pinta_scene_'))).toBe(false)
})

test('a scene result is inferred only from direct initialization and an unchanged receiver', async () => {
  const { project, loaded } = await load(PGZERO_EXTENSION.id, PGZERO_EXTENSION.version, [], true)
  const options = {
    codecs: loaded.codecs,
    officialModules: pythonOfficialModules(project, features),
  }
  const open = assignment('outro', api('abrir_destino', [name('porta')]))
  const loadScene = assignment('lugar', officialLoad)
  const draw = paint('outro', [name('screen')])
  const condition = { test: name('condicao'), orelse: [] }
  for (const preparation of [
    [node('If', { ...condition, body: [loadScene] }), open],
    [loadScene, node('If', { ...condition, body: [open] })],
    [loadScene, open, assignment('outro', call(name('OutraCoisa')))],
    [
      loadScene,
      node('Assign', {
        targets: [withTargetContext(attribute(name('lugar'), 'abrir_destino'), 'Store')],
        value: name('outra_funcao'),
        type_comment: null,
      }),
      open,
    ],
    [assignment('lugar', call(name('Heroi'))), open],
    [open, loadScene],
  ]) {
    const tree = moduleNode([importar, ...preparation, draw])
    const visual = pythonASTToVisual(tree, options)
    expect(ids(visual.body)).not.toContain('sz_py_pgzero_pinta_scene_draw')
    expect(pythonSemanticTree(pythonVisualToAST(visual, loaded.codecs))).toEqual(
      pythonSemanticTree(tree),
    )
  }
  const beforeAssignment = moduleNode([importar, loadScene, draw, open])
  const before = pythonASTToVisual(beforeAssignment, options)
  expect(ids(before.body)).not.toContain('sz_py_pgzero_pinta_scene_draw')
  expect(pythonSemanticTree(pythonVisualToAST(before, loaded.codecs))).toEqual(
    pythonSemanticTree(beforeAssignment),
  )
})

test('a proven place that goes through its own door stays a scene', async () => {
  const { project, loaded } = await load(PGZERO_EXTENSION.id, PGZERO_EXTENSION.version, [], true)
  const options = {
    codecs: loaded.codecs,
    officialModules: pythonOfficialModules(project, features),
  }
  const loadScene = assignment('lugar', officialLoad)
  const through = (receiver: string) =>
    assignment('lugar', call(attribute(name(receiver), 'abrir_destino'), [name('porta')]))
  const draw = paint('lugar', [name('screen')])
  const enter = node('FunctionDef', {
    name: 'entrar',
    args: node('arguments', {
      posonlyargs: [],
      args: [],
      vararg: null,
      kwonlyargs: [],
      kw_defaults: [],
      kwarg: null,
      defaults: [],
    }),
    body: [node('Global', { names: ['lugar'] }), through('lugar'), draw],
    decorator_list: [],
    returns: null,
    type_comment: null,
    type_params: [],
  })
  for (const program of [
    [importar, loadScene, draw, through('lugar'), draw],
    [importar, loadScene, enter, draw],
  ]) {
    const tree = moduleNode(program)
    const visual = pythonASTToVisual(tree, options)
    const visible = ids(visual.body)
    expect(visible.filter((id) => id === 'sz_py_pgzero_pinta_scene_draw')).toHaveLength(2)
    expect(visible).toContain('sz_py_pgzero_pinta_scene_open_door')
    expect(pythonSemanticTree(pythonVisualToAST(visual, loaded.codecs))).toEqual(
      pythonSemanticTree(tree),
    )
  }
  // Another receiver, no scene before the door or a replaced door prove nothing about `lugar`.
  const replaced = node('Assign', {
    targets: [withTargetContext(attribute(name('lugar'), 'abrir_destino'), 'Store')],
    value: name('outra_funcao'),
    type_comment: null,
  })
  for (const program of [
    [importar, loadScene, through('outro'), draw],
    [importar, through('lugar'), draw],
    [importar, loadScene, through('lugar'), assignment('lugar', call(name('Heroi'))), draw],
    [importar, loadScene, replaced, through('lugar'), draw],
  ]) {
    const tree = moduleNode(program)
    const visual = pythonASTToVisual(tree, options)
    expect(ids(visual.body)).not.toContain('sz_py_pgzero_pinta_scene_draw')
    expect(pythonSemanticTree(pythonVisualToAST(visual, loaded.codecs))).toEqual(
      pythonSemanticTree(tree),
    )
  }
})

test('a learner field named descartar keeps the Raylib blocks when scenes are available', async () => {
  const sceneIds = suffixes.map((suffix) => `sz_py_rl2d_pinta_scene_${suffix}`)
  const { project, loaded } = await load(
    RAYLIB_2D_EXTENSION.id,
    RAYLIB_2D_EXTENSION.version,
    [...PYTHON_RAYLIB_2D_CODECS.map(({ id }) => id), ...sceneIds],
    true,
  )
  const tree = moduleNode([
    node('Import', { names: [node('alias', { name: 'pyray', asname: 'ray' })] }),
    node('Assign', {
      targets: [withTargetContext(attribute(name('laser'), 'descartar'), 'Store')],
      value: name('terminou'),
      type_comment: null,
    }),
    expression(call(attribute(name('ray'), 'close_window'))),
  ])
  const visual = pythonASTToVisual(tree, {
    codecs: loaded.codecs,
    officialModules: pythonOfficialModules(project, features),
  })
  expect(visual.body[2]).toMatchObject({ codecId: 'sz_py_rl2d_close_window' })
  expect(ids(visual.body).some((id) => id.startsWith('sz_py_rl2d_pinta_scene_'))).toBe(false)
  expect(pythonSemanticTree(pythonVisualToAST(visual, loaded.codecs))).toEqual(
    pythonSemanticTree(tree),
  )
})

test('with pinta imported, a scene method name stored on another object drops only the scene blocks', async () => {
  const sceneIds = suffixes.map((suffix) => `sz_py_rl2d_pinta_scene_${suffix}`)
  const { project, loaded } = await load(
    RAYLIB_2D_EXTENSION.id,
    RAYLIB_2D_EXTENSION.version,
    [...PYTHON_RAYLIB_2D_CODECS.map(({ id }) => id), ...sceneIds],
    true,
  )
  const field = (receiver: string) =>
    node('Assign', {
      targets: [withTargetContext(attribute(name(receiver), 'descartar'), 'Store')],
      value: name('terminou'),
      type_comment: null,
    })
  const tree = moduleNode([
    node('Import', { names: [node('alias', { name: 'pyray', asname: 'ray' })] }),
    importar,
    assignment('lugar', officialLoad),
    assignment('outro', officialLoad),
    // `outro` reaches a function of the program, so `laser` may be that very scene.
    expression(call(name('guardar'), [name('outro')])),
    node('FunctionDef', {
      name: 'apagar',
      args: node('arguments', {
        posonlyargs: [],
        args: [node('arg', { arg: 'laser', annotation: null, type_comment: null })],
        vararg: null,
        kwonlyargs: [],
        kw_defaults: [],
        kwarg: null,
        defaults: [],
      }),
      body: [field('laser')],
      decorator_list: [],
      returns: null,
      type_comment: null,
      type_params: [],
    }),
    field('outro'),
    expression(call(attribute(name('ray'), 'close_window'))),
    paint('lugar', []),
    paint('outro', []),
  ])
  const visual = pythonASTToVisual(tree, {
    codecs: loaded.codecs,
    officialModules: pythonOfficialModules(project, features),
  })
  expect(ids([visual.body[2]!])).toContain('sz_py_rl2d_pinta_scene_load')
  expect(ids([visual.body[3]!])).toContain('sz_py_rl2d_pinta_scene_load')
  expect(visual.body[7]).toMatchObject({ codecId: 'sz_py_rl2d_close_window' })
  // Any scene may be the object written (even through its class): no scene method is proven.
  for (const line of visual.body.slice(8))
    expect(ids([line]).some((id) => id.startsWith('sz_py_rl2d_pinta_scene_'))).toBe(false)
  expect(pythonSemanticTree(pythonVisualToAST(visual, loaded.codecs))).toEqual(
    pythonSemanticTree(tree),
  )
})
