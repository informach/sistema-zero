import { expect, test } from 'bun:test'
import {
  isPythonCourseBlock,
  PYTHON_COURSE_BLOCKS,
  pythonCourseBlockClosure,
  pythonCourseExtensionsForBlocks,
  pythonCourseUnlockIssue,
  removePythonCourseBlocks,
} from './course-unlocks'

test('course metadata uses actual unique Python codec IDs without language equivalents', () => {
  const ids = PYTHON_COURSE_BLOCKS.map(({ id }) => id)
  expect(ids.length).toBeGreaterThan(0)
  expect(new Set(ids).size).toBe(ids.length)
  expect(Object.isFrozen(PYTHON_COURSE_BLOCKS)).toBe(true)
  expect(isPythonCourseBlock('sz_py_print')).toBe(true)
  for (const id of ['controls_if', 'py_print', 'sz_py_unknown', ''])
    expect(isPythonCourseBlock(id)).toBe(false)
  expect(pythonCourseExtensionsForBlocks(['controls_if', 'sz_py_print', 'sz_py_unknown'])).toEqual(
    [],
  )
  expect(pythonCourseExtensionsForBlocks(['sz_py_turtle_module_forward'])).toEqual([
    'python-turtle',
  ])
})

test('the Admin closure is explicit and handles recursive companions without granting all blocks', () => {
  const selected = pythonCourseBlockClosure(['sz_py_print'])
  expect(selected).toContain('sz_py_print')
  expect(selected.length).toBeGreaterThan(1)
  expect(selected.length).toBeLessThan(PYTHON_COURSE_BLOCKS.length)
  expect(pythonCourseUnlockIssue(selected)).toBeNull()
  expect(pythonCourseExtensionsForBlocks(selected)).toEqual([])
  expect(pythonCourseUnlockIssue(['sz_py_print'])).toContain('necessário')
  const recursive = pythonCourseBlockClosure(['sz_py_function'])
  expect(recursive).toContain('sz_py_return')
  expect(pythonCourseUnlockIssue(recursive)).toBeNull()
  expect(pythonCourseBlockClosure(PYTHON_COURSE_BLOCKS.map(({ id }) => id))).toHaveLength(
    PYTHON_COURSE_BLOCKS.length,
  )
})

test('unknown or duplicate Python rewards fail while mixed JavaScript rewards remain unchanged', () => {
  const valid = pythonCourseBlockClosure(['sz_py_print'])
  expect(pythonCourseUnlockIssue(['existing-js-block', ...valid])).toBeNull()
  expect(pythonCourseUnlockIssue([])).toBeNull()
  expect(pythonCourseUnlockIssue(['sz_py_unknown'])).toContain('catálogo')
  expect(pythonCourseUnlockIssue([...valid, 'sz_py_print'])).toContain('repetidos')
  expect(() => pythonCourseBlockClosure(['sz_py_unknown'])).toThrow('catálogo')
})

test('removing companions cascades only through their consumers and never grants anything', () => {
  const functionBlocks = pythonCourseBlockClosure(['sz_py_function'])
  const selected = pythonCourseBlockClosure(['sz_py_function', 'sz_py_print'])
  const result = removePythonCourseBlocks(selected, ['sz_py_function'])
  expect(result).not.toContain('sz_py_function')
  expect(result).not.toContain('sz_py_return')
  expect(result).toContain('sz_py_print')
  expect(result.every((id) => selected.includes(id))).toBe(true)
  expect(pythonCourseUnlockIssue(result)).toBeNull()
  expect(removePythonCourseBlocks(functionBlocks, [])).toEqual(functionBlocks)
  expect(() => removePythonCourseBlocks(selected, ['sz_py_unknown'])).toThrow('catálogo')
})
