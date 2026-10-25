import { expect, test } from 'bun:test'
import pinned from '../../src/runtime/python/pygame/approved-js-snippets.json'
import { applyApprovedEval } from './approved-eval'

// The two linker call sites and the end of the factory, as in Pyodide's pyodide.asm.mjs.
const FAKE_LOADER =
  'function _createPyodideModule(){var ASM_CONSTS={},moduleExports={};' +
  'var moduleRtn={link(start,name,func){ASM_CONSTS[start]=eval(func);' +
  'moduleExports[name]=eval(func);return [ASM_CONSTS[start],moduleExports[name]]}}' +
  ';return moduleRtn}export default _createPyodideModule;'

type Linker = { link(start: number, name: string, func: string): [unknown, unknown] }

/** Runs the derived loader the way the worker would and returns its linker. */
function load(snippets?: readonly string[]): Linker {
  const derived = applyApprovedEval(FAKE_LOADER, snippets)
  const body = derived.replace(
    'export default _createPyodideModule;',
    'return _createPyodideModule',
  )
  return new Function(body)()()
}

test('a pinned snippet links as the same code, compiled; any other string is an EvalError', () => {
  const snippet = '($0) => { return $0 + 1; };'
  const linker = load([snippet])
  const [constant, exported] = linker.link(7, 'soma', snippet)
  expect((constant as (value: number) => number)(1)).toBe(2)
  expect((exported as (value: number) => number)(41)).toBe(42)
  // Valid JavaScript, but not in the table: never evaluated.
  for (const unknown of ['1 + 1', '($0) => { return $0 + 2; };', "window.prompt('oi')", ''])
    expect(() => linker.link(0, 'outro', unknown)).toThrow(
      new EvalError('Código JavaScript de módulo nativo não aprovado.'),
    )
})

test('every recorded pygame-ce snippet compiles and is found by its exact text', () => {
  const linker = load()
  for (const snippet of pinned.snippets)
    expect(typeof linker.link(0, 'trecho', snippet)[0]).toBe('function')
  expect(() => linker.link(0, 'trecho', `${pinned.snippets[0]} `)).toThrow(EvalError)
})

test('a loader whose eval sites changed, or a snippet of another shape, is refused', () => {
  expect(() => applyApprovedEval(FAKE_LOADER.replace('ASM_CONSTS[start]=eval(func)', ''))).toThrow(
    'ponto de eval',
  )
  expect(() => applyApprovedEval(FAKE_LOADER, ['alert(1)'])).toThrow('fora do formato')
})
