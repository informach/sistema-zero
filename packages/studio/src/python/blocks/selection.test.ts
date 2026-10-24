import { expect, test } from 'bun:test'
import {
  describePythonCatalog,
  PYTHON_STARTER_BLOCK_IDS,
  searchPythonPalette,
  selectPythonPalette,
} from './selection'

const catalog = describePythonCatalog()
const approvedBlockIds = new Set(catalog.map((entry) => entry.id))
const installedExtensions = new Set<string>()

test('category curation expands the level but never overrides an explicit block list', () => {
  const category = catalog.find((entry) => entry.id === 'sz_py_class')!.path[1]!
  expect(
    selectPythonPalette({
      level: 1,
      allowCategories: [category],
      installedExtensions,
      approvedBlockIds,
    }).entries.some((entry) => entry.id === 'sz_py_class'),
  ).toBe(true)
  expect(
    selectPythonPalette({
      level: 1,
      allowCategories: [category],
      allowBlocks: ['sz_py_print'],
      installedExtensions,
      approvedBlockIds,
    }).entries.some((entry) => entry.id === 'sz_py_class'),
  ).toBe(false)
})

test('the starter palette has a bounded real dependency closure, with no empty category or Turtle', () => {
  const selection = selectPythonPalette({ level: 1, installedExtensions, approvedBlockIds })
  // The first palette covers variables, decisions, loops, functions, lists and sound.
  expect(selection.entries.length).toBeLessThanOrEqual(36)
  expect(selection.explicitIds).toHaveLength(PYTHON_STARTER_BLOCK_IDS.length)
  expect(selection.entries.every((entry) => entry.owner === 'programming')).toBe(true)
  expect(selection.entries.some((entry) => entry.id === 'sz_py_variable')).toBe(true)
  expect(selection.entries.some((entry) => entry.id === 'sz_py_text')).toBe(true)
  for (const entry of selection.entries)
    for (const id of entry.dependencies)
      expect(selection.entries.some((entry) => entry.id === id)).toBe(true)
})
test('admin selection includes the needed parameters and return without opening all advanced blocks', () => {
  const selection = selectPythonPalette({
    level: 1,
    allowBlocks: ['sz_py_function'],
    installedExtensions,
    approvedBlockIds,
  })
  expect(selection.entries.some((entry) => entry.id === 'sz_py_parameter')).toBe(true)
  expect(selection.entries.some((entry) => entry.id === 'sz_py_parameters')).toBe(true)
  expect(selection.entries.some((entry) => entry.id === 'sz_py_return')).toBe(true)
  expect(selection.entries.some((entry) => entry.id === 'sz_py_class')).toBe(false)
  expect(searchPythonPalette(selection, 'devolver resultado').map((entry) => entry.id)).toContain(
    'sz_py_return',
  )
})
test('unavailable, unknown and unapproved dependencies fail explicitly instead of widening authorization', () => {
  expect(() =>
    selectPythonPalette({
      level: 1,
      allowBlocks: ['sz_js_print'],
      installedExtensions,
      approvedBlockIds,
    }),
  ).toThrow('desconhecido')
  expect(() =>
    selectPythonPalette({
      level: 1,
      allowBlocks: ['sz_py_function'],
      installedExtensions,
      approvedBlockIds: new Set(['sz_py_function']),
    }),
  ).toThrow('indisponível')
  const extended = [
    ...catalog,
    { ...catalog[0]!, id: 'test_turtle', owner: 'python-turtle' as const, dependencies: [] },
  ]
  expect(() =>
    selectPythonPalette({
      level: 1,
      allowBlocks: ['test_turtle'],
      catalog: extended,
      installedExtensions,
      approvedBlockIds: new Set([...approvedBlockIds, 'test_turtle']),
    }),
  ).toThrow('indisponível')
  expect(
    selectPythonPalette({ level: 1, installedExtensions, approvedBlockIds: new Set() }).entries,
  ).toEqual([])
})
test('an empty admin selection uses the level policy and search cannot expose hidden blocks', () => {
  const empty = selectPythonPalette({
    level: 3,
    allowBlocks: [],
    installedExtensions,
    approvedBlockIds,
  })
  expect(empty).toEqual(selectPythonPalette({ level: 3, installedExtensions, approvedBlockIds }))
  const limited = selectPythonPalette({
    level: 1,
    allowBlocks: ['sz_py_print'],
    installedExtensions,
    approvedBlockIds,
  })
  expect(searchPythonPalette(limited, 'classe')).toEqual([])
  expect(searchPythonPalette(limited, 'saida').map((entry) => entry.id)).toContain('sz_py_print')
})

test('curated operations include the building blocks needed to create their receivers and context', () => {
  for (const [chosen, required] of [
    ['sz_py_list_append', ['sz_py_list', 'sz_py_assign']],
    ['sz_py_dict_keys', ['sz_py_dictionary', 'sz_py_assign']],
    ['sz_py_set_add', ['sz_py_set_create', 'sz_py_set', 'sz_py_assign']],
    ['sz_py_return', ['sz_py_function', 'sz_py_parameters', 'sz_py_parameter']],
    ['sz_py_break', ['sz_py_for', 'sz_py_range']],
    ['sz_py_len', ['sz_py_list']],
  ] as const) {
    const selection = selectPythonPalette({
      level: 1,
      allowBlocks: [chosen],
      installedExtensions,
      approvedBlockIds,
    })
    const ids = new Set(selection.entries.map((entry) => entry.id))
    for (const id of required) expect(ids.has(id), `${chosen} needs ${id}`).toBe(true)
    for (const entry of selection.entries)
      for (const id of entry.dependencies) expect(ids.has(id)).toBe(true)
  }
})
