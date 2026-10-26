import { expect, test } from 'bun:test'
import { PGZERO_GAME_BLOCKS } from '../../../examples/python/pgzeroGames.blocks.generated'
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
} from '../../blocks/nodes'
import {
  type PythonVisualNode,
  pythonASTToVisual,
  pythonVisualToAST,
} from '../../blocks/projection'
import { attachPythonResolverOptions } from '../../blocks/resolverOptions'
import { describePythonCatalog, selectPythonPalette } from '../../blocks/selection'
import type { PythonNode } from '../../language/types'
import { PGZERO_RESOLVER_OPTIONS, PYTHON_PGZERO_CODECS } from './catalog'

const codecs = attachPythonResolverOptions(
  [...PYTHON_PGZERO_CODECS, ...PYTHON_PROGRAMMING_CODECS],
  PGZERO_RESOLVER_OPTIONS,
)
const catalog = describePythonCatalog(codecs)
const palette = (level: 1 | 2 | 3) =>
  new Set(
    selectPythonPalette({
      level,
      installedExtensions: new Set(['python-pgzero']),
      approvedBlockIds: new Set(catalog.map((entry) => entry.id)),
      catalog,
    }).entries.map((entry) => entry.id),
  )
const hidden = new Set(catalog.filter((entry) => entry.hidden).map((entry) => entry.id))
const types = (values: PythonVisualNode[]): string[] =>
  values.flatMap((value) =>
    value.kind === 'source'
      ? ['<source>']
      : [value.codecId, ...value.inputs.flatMap((input) => types(input.nodes))],
  )
const project = (body: PythonNode[]) => {
  const tree = moduleNode(body)
  const projection = pythonASTToVisual(tree, {
    codecs,
    officialModules: new Set(['pgzero', 'pgzrun', 'pygame']),
  })
  expect(pythonSemanticTree(pythonVisualToAST(projection, codecs))).toEqual(
    pythonSemanticTree(tree),
  )
  return types(projection.body)
}
const importPygame = node('Import', { names: [node('alias', { name: 'pygame', asname: null })] })
const surface = () => attribute(name('screen'), 'surface')

test('with the level 1 palette a child makes the whole "Olá, Pygame Zero"', () => {
  const first = palette(1)
  const missing = PGZERO_GAME_BLOCKS['ola-pgzero'].blockIds.filter(
    (id) => !first.has(id) && !hidden.has(id),
  )
  expect(missing).toEqual([])
  // What a first game needs and the review found missing.
  for (const id of [
    'sz_py_pgzero_title',
    'sz_py_pgzero_go',
    'sz_py_pgzero_actor_property',
    'sz_py_pgzero_keyboard',
    'sz_py_pgzero_on_key_down',
    'sz_py_pgzero_on_mouse_down',
    'sz_py_pgzero_sound_play',
    'sz_py_pgzero_collidepoint',
    'sz_py_global',
    'sz_py_negative',
  ])
    expect(first.has(id), id).toBe(true)
  // One "tocar o som": the game's own, not the generic one no example uses.
  expect(first.has('sz_py_audio_play')).toBe(false)
  // Each level adds: more games fit level 2, and all of them fit level 3.
  const fits = (level: 1 | 2 | 3) => {
    const offered = palette(level)
    return Object.values(PGZERO_GAME_BLOCKS).filter(({ blockIds }) =>
      blockIds.every((id) => offered.has(id) || hidden.has(id)),
    ).length
  }
  expect(fits(1)).toBeGreaterThanOrEqual(1)
  expect(fits(2)).toBeGreaterThan(fits(1))
  expect(fits(3)).toBe(Object.keys(PGZERO_GAME_BLOCKS).length)
})

test('without Pygame Zero the first palette keeps the generic "tocar o som"', () => {
  const programming = describePythonCatalog(PYTHON_PROGRAMMING_CODECS)
  const first = selectPythonPalette({
    level: 1,
    installedExtensions: new Set(),
    approvedBlockIds: new Set(programming.map((entry) => entry.id)),
    catalog: programming,
  })
  expect(first.entries.map((entry) => entry.id)).toContain('sz_py_audio_play')
})

test('notes, the color of a point on the screen and pygame.draw have their own blocks', () => {
  const ids = project([
    importPygame,
    expression(call(attribute(name('tone'), 'play'), [text('C4'), integer('1')])),
    node('Assign', {
      targets: [name('nota', 'Store')],
      value: call(attribute(name('tone'), 'create'), [text('A4'), integer('2')]),
      type_comment: null,
    }),
    node('Assign', {
      targets: [name('cor', 'Store')],
      value: call(attribute(surface(), 'get_at'), [
        node('Tuple', { elts: [integer('10'), integer('20')], ctx: node('Load') }),
      ]),
      type_comment: null,
    }),
    expression(
      call(attribute(attribute(name('pygame'), 'draw'), 'circle'), [
        surface(),
        text('red'),
        node('Tuple', { elts: [integer('50'), integer('50')], ctx: node('Load') }),
        integer('20'),
      ]),
    ),
    expression(
      call(attribute(attribute(name('pygame'), 'draw'), 'polygon'), [
        surface(),
        text('green'),
        node('List', {
          elts: [
            node('Tuple', { elts: [integer('0'), integer('0')], ctx: node('Load') }),
            node('Tuple', { elts: [integer('9'), integer('0')], ctx: node('Load') }),
            node('Tuple', { elts: [integer('5'), integer('9')], ctx: node('Load') }),
          ],
          ctx: node('Load'),
        }),
      ]),
    ),
  ])
  for (const id of [
    'sz_py_pgzero_tone_play',
    'sz_py_pgzero_tone_create',
    'sz_py_pgzero_screen_get_at',
    'sz_py_pgzero_pygame_circle',
    'sz_py_pgzero_pygame_polygon',
  ])
    expect(ids, id).toContain(id)
})

test('pygame.draw is the official block only after `import pygame`', () => {
  const circle = expression(
    call(attribute(attribute(name('pygame'), 'draw'), 'circle'), [
      surface(),
      text('red'),
      node('Tuple', { elts: [integer('50'), integer('50')], ctx: node('Load') }),
      integer('20'),
    ]),
  )
  expect(project([circle])).not.toContain('sz_py_pgzero_pygame_circle')
  const renamed = node('Import', { names: [node('alias', { name: 'pygame', asname: 'pg' })] })
  expect(project([renamed, circle])).not.toContain('sz_py_pgzero_pygame_circle')
  expect(project([importPygame, circle])).toContain('sz_py_pgzero_pygame_circle')
})

test('Actor accepts the position by name, pos=(x, y), in the same block', () => {
  const actor = (pos: 'positional' | 'keyword') => {
    const where = node('Tuple', { elts: [integer('100'), integer('200')], ctx: node('Load') })
    return node('Assign', {
      targets: [name('heroi', 'Store')],
      value: node('Call', {
        func: name('Actor'),
        args: pos === 'positional' ? [text('heroi'), where] : [text('heroi')],
        keywords: pos === 'keyword' ? [node('keyword', { arg: 'pos', value: where })] : [],
      }),
      type_comment: null,
    })
  }
  expect(project([actor('positional')])).toContain('sz_py_pgzero_actor')
  const keyword = project([actor('keyword')])
  expect(keyword).toContain('sz_py_pgzero_actor')
  expect(keyword).not.toContain('sz_py_run_value')
})
