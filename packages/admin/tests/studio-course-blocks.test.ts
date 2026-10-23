import { expect, test } from 'bun:test'
import {
  PYTHON_COURSE_BLOCKS,
  pythonCourseBlockClosure,
  pythonCourseUnlockIssue,
} from '@sistemazero/studio/python-course-unlocks'
import { changeCourseBlocks, courseBlocksForLanguage } from '../src/lib/studio-course-blocks'

const catalog = PYTHON_COURSE_BLOCKS.map((entry) => ({
  type: entry.id,
  label: entry.title,
  category: entry.path.join(' / '),
}))

test('adicionar Python salva auxiliares explícitos sem alterar JavaScript', () => {
  const result = changeCourseBlocks({
    current: ['sz_js_repeat'],
    next: ['sz_py_print'],
    language: 'python',
    catalog,
    action: 'selection',
  })
  expect(result.blocks).toEqual(['sz_js_repeat', ...pythonCourseBlockClosure(['sz_py_print'])])
  expect(result.added.length).toBeGreaterThan(0)
  expect(pythonCourseUnlockIssue(result.blocks)).toBeNull()
})

test('remover auxiliar retira dependentes; importar a mesma raiz recompõe seus auxiliares', () => {
  const current = ['sz_js_repeat', ...pythonCourseBlockClosure(['sz_py_print'])]
  const companion = current.find((id) => id !== 'sz_py_print' && id.startsWith('sz_py_'))!
  const removed = changeCourseBlocks({
    current,
    next: current.filter((id) => id !== companion && id !== 'sz_js_repeat'),
    language: 'python',
    catalog,
    action: 'selection',
  })
  expect(removed.blocks).not.toContain('sz_py_print')
  expect(removed.blocks).toContain('sz_js_repeat')
  expect(removed.removed).toContain('sz_py_print')
  expect(pythonCourseUnlockIssue(removed.blocks)).toBeNull()
  const imported = changeCourseBlocks({
    current,
    next: ['sz_py_print'],
    language: 'python',
    catalog,
    action: 'import',
  })
  expect(imported.blocks).toEqual(current)
  expect(imported.added).toContain(companion)
})

test('catálogo parcial ou ID de outra linguagem não pode produzir uma nova seleção Python', () => {
  const current = ['sz_js_repeat']
  for (const next of [['sz_py_print'], ['sz_js_repeat'], ['sz_py_unknown']])
    expect(() =>
      changeCourseBlocks({
        current,
        next,
        language: 'python',
        catalog: catalog.filter((entry) => entry.type === 'sz_py_print'),
        action: 'import',
      }),
    ).toThrow()
  expect(current).toEqual(['sz_js_repeat'])
})

test('limpar e importar corrigem IDs Python desconhecidos e preservam a outra linguagem', () => {
  const current = ['sz_js_repeat', 'sz_py_unknown']
  expect(courseBlocksForLanguage(current, 'python')).toEqual(['sz_py_unknown'])
  const cleared = changeCourseBlocks({
    current,
    next: [],
    language: 'python',
    catalog,
    action: 'selection',
  })
  expect(cleared.blocks).toEqual(['sz_js_repeat'])
  const imported = changeCourseBlocks({
    current,
    next: ['sz_py_print'],
    language: 'python',
    catalog,
    action: 'import',
  })
  expect(imported.blocks).not.toContain('sz_py_unknown')
  expect(imported.blocks).toContain('sz_js_repeat')
  expect(pythonCourseUnlockIssue(imported.blocks)).toBeNull()
})
