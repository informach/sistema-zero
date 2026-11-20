import { expect, it } from 'bun:test'
import { hasDuplicateCSSDeclarations } from '#ir'
import { cssSourceCompatible } from './cssSourceCompatibility'

it('recognizes CSS property duplicates across letter case but preserves custom-property case', () => {
  expect(hasDuplicateCSSDeclarations({ color: 'red', COLOR: 'blue' })).toBe(true)
  expect(hasDuplicateCSSDeclarations({ '--Tone': 'red', '--tone': 'blue' })).toBe(false)
})

it('recognizes reordered independent declarations without changing saved CSS', () => {
  expect(
    cssSourceCompatible(
      'body { margin: 0; background: #123018; }',
      'body { background: #123018; margin: 0; }',
    ),
  ).toBe(true)
})
it('does not equate changed values, selectors, rule order or missing properties', () => {
  for (const candidate of ['body { color: blue; }', '.other { color: red; }', 'body {}'])
    expect(cssSourceCompatible('body { color: red; }', candidate)).toBe(false)
  expect(
    cssSourceCompatible('body{color:red} body{color:blue}', 'body{color:blue} body{color:red}'),
  ).toBe(false)
})
it('preserves cascade order for shorthands, duplicate and case-insensitive property names', () => {
  for (const [a, b] of [
    ['margin: 0; margin-left: 1px;', 'margin-left: 1px; margin: 0;'],
    ['color: red; color: blue;', 'color: blue; color: red;'],
    ['color: red; COLOR: blue;', 'COLOR: blue; color: red;'],
    ['all: unset; color: red;', 'color: red; all: unset;'],
    ['font: 12px Arial; line-height: 2;', 'line-height: 2; font: 12px Arial;'],
    [
      'word-wrap: normal; overflow-wrap: break-word;',
      'overflow-wrap: break-word; word-wrap: normal;',
    ],
    ['margin-left: 1px; margin-inline-start: 2px;', 'margin-inline-start: 2px; margin-left: 1px;'],
  ])
    expect(cssSourceCompatible(`body{${a}}`, `body{${b}}`)).toBe(false)
})
it('does not claim equivalence for unqualified at-rules or distinct raw syntax', () => {
  expect(
    cssSourceCompatible(
      '@media (width > 1px){body{color:red;background:blue}}',
      '@media (width > 1px){body{background:blue;color:red}}',
    ),
  ).toBe(false)
  expect(cssSourceCompatible('@unknown a;', '@unknown b;')).toBe(false)
})
