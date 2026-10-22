import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Module specifiers loaded at runtime: value `import`/`export ... from` and side-effect imports.
// `import type`/`export type` are erased. `[^'"]*?` stops at the first string literal, so a
// statement without `from` cannot borrow the next statement's specifier.
const runtimeSpecifiers = (source: string) =>
  [
    ...source.matchAll(/^(?:import|export)\s+(?!type\s)[^'"]*?\bfrom\s+['"]([^'"]+)['"]/gm),
    ...source.matchAll(/^import\s+['"]([^'"]+)['"]/gm),
  ].map((match) => match[1] ?? '')
const valueImports = (file: string) =>
  runtimeSpecifiers(readFileSync(join(import.meta.dir, file), 'utf8'))

test('the specifier scan sees value, re-export and side-effect imports but not type-only ones', () => {
  const sample = [
    "import type { A } from './a'",
    "import './b'",
    "export * from './c'",
    "export { d } from './d'",
    'import {',
    '  e,',
    "} from './e'",
    "export type { F } from './f'",
  ].join('\n')
  expect(runtimeSpecifiers(sample).sort()).toEqual(['./b', './c', './d', './e'])
})

test('the play page does not load the Python code-analysis client', () => {
  expect(valueImports('publicEnvironment.ts')).not.toContain('./contextEnvironment')
  for (const file of ['publicEnvironment.ts', 'contextEnvironmentCore.ts'])
    expect(valueImports(file).filter((path) => path.includes('python/language'))).toEqual([])
})

test('editor hosts keep receiving analysis through the contextual environment', () => {
  expect(valueImports('contextEnvironment.ts')).toContain('../python/language/contextProvider')
})
