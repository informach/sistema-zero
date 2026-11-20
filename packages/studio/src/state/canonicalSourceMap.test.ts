import { expect, it } from 'bun:test'
import { generateProjectFilesWithMap } from '#generators'
import { normalizeSZIR } from '#ir'
import {
  getCanonicalSourceMap,
  getDisplayedSourceMap,
  primeCanonicalSourceMap,
} from './canonicalSourceMap'

it('maps retained CSS positions without changing the canonical map or reusing stale text', () => {
  const ir = normalizeSZIR({
    html: [],
    js: [],
    extensions: [],
    css: [
      {
        selector: 'body',
        declarations: { background: 'blue', margin: '0' },
        __id: 'rule',
        __declIds: { background: 'bg', margin: 'margin' },
      },
    ],
  })
  const generated = generateProjectFilesWithMap({ ir, projectName: 'Map' })
  primeCanonicalSourceMap(ir, 'Map', undefined, generated.sourceMap, generated.files['style.css'])
  const original = structuredClone(generated.sourceMap)
  const a = getDisplayedSourceMap(ir, 'Map', undefined, 'body {\nmargin: 0;\nbackground: blue;\n}')
  expect(a.margin?.startLine).toBe(2)
  expect(a.bg?.startLine).toBe(3)
  expect(
    getDisplayedSourceMap(ir, 'Map', undefined, 'body {\nmargin: 0;\nbackground: blue;\n}'),
  ).toBe(a)
  const b = getDisplayedSourceMap(
    ir,
    'Map',
    undefined,
    '\nbody {\nbackground: blue;\nmargin: 0;\n}',
  )
  expect(b.margin?.startLine).toBe(4)
  expect(getCanonicalSourceMap(ir, 'Map', undefined)).toBe(generated.sourceMap)
  expect(generated.sourceMap).toEqual(original)
  expect(getDisplayedSourceMap(ir, 'Map', undefined, generated.files['style.css'])).toBe(
    generated.sourceMap,
  )
})
