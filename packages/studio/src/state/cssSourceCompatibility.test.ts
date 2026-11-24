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
it('commutes any two distinct properties that do not overlap (the "na mão" examples)', () => {
  // Revisão da missão: só margin/padding/background/color comutavam. Os exemplos "na mão" com
  // display, overflow, min-height ou os alinhamentos eram regravados ao abrir (abrir = editar).
  for (const [a, b] of [
    [
      'margin: 0; overflow: hidden; background: #102d46; display: grid; place-items: center;',
      'background: #102d46; overflow: hidden; margin: 0; display: grid; place-items: center;',
    ],
    [
      'margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;',
      'justify-content: center; align-items: center; margin: 0; min-height: 100vh; display: flex;',
    ],
    [
      'border: 5px solid black; position: absolute; top: 50%; translate: -50% -50%;',
      'position: absolute; top: 50%; border: 5px solid black; translate: -50% -50%;',
    ],
    ['--tom: red; color: var(--tom); width: 1px;', 'width: 1px; color: var(--tom); --tom: red;'],
  ])
    expect(cssSourceCompatible(`body{${a}}`, `body{${b}}`)).toBe(true)
})

it('keeps the order of properties that overlap through shorthands, aliases or logical sides', () => {
  for (const [a, b] of [
    ['overflow: hidden; overflow-x: auto;', 'overflow-x: auto; overflow: hidden;'],
    ['place-items: center; align-items: start;', 'align-items: start; place-items: center;'],
    [
      'place-content: center; justify-content: end;',
      'justify-content: end; place-content: center;',
    ],
    ['inset: 0; top: 1px;', 'top: 1px; inset: 0;'],
    ['inset-inline-start: 0; left: 1px;', 'left: 1px; inset-inline-start: 0;'],
    ['width: 1px; inline-size: 2px;', 'inline-size: 2px; width: 1px;'],
    ['min-height: 1px; min-block-size: 2px;', 'min-block-size: 2px; min-height: 1px;'],
    ['gap: 1px; row-gap: 2px;', 'row-gap: 2px; gap: 1px;'],
    ['columns: 2; column-count: 3;', 'column-count: 3; columns: 2;'],
    [
      '-webkit-transform: none; transform: scale(2);',
      'transform: scale(2); -webkit-transform: none;',
    ],
    ['border: 0; border-left-color: red;', 'border-left-color: red; border: 0;'],
  ])
    expect(cssSourceCompatible(`body{${a}}`, `body{${b}}`)).toBe(false)
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
