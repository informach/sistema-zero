import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

test('o source map depende do parser CSS concreto, não do barrel que reexporta geradores', () => {
  const source = readFileSync(join(import.meta.dir, '../sourceMap.ts'), 'utf8')

  expect(source).not.toMatch(/from ['"]#parsers['"]/)
  expect(source).toMatch(/from ['"]\.\.\/parsers\/css['"]/)
})
