import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

test('o source map depende do parser CSS concreto, não do barrel que reexporta geradores', () => {
  const source = readFileSync(join(import.meta.dir, '../sourceMap.ts'), 'utf8')

  expect(source).not.toMatch(/from ['"]#parsers['"]/)
  expect(source).toMatch(/from ['"]\.\.\/parsers\/css['"]/)
})

test('o codec de programação recebe o compilador de expressões sem criar ciclo em runtime', () => {
  const source = readFileSync(join(import.meta.dir, '../../codecs/programming/irToCode.ts'), 'utf8')

  expect(source).not.toMatch(/import\s*\{[^}]*\}\s*from ['"]\.\.\/\.\.\/generators\/expr['"]/s)
})

test('o Studio não mantém o wrapper react-blockly sem consumidores', () => {
  const packageJson = readFileSync(join(import.meta.dir, '../../../package.json'), 'utf8')
  const viteConfig = readFileSync(
    join(import.meta.dir, '../../../playground/vite.config.ts'),
    'utf8',
  )

  expect(packageJson).not.toContain('react-blockly')
  expect(viteConfig).not.toContain("'react-blockly'")
})

test('a IR dos exemplos 3D tem gerador reproduzível em vez de manutenção manual', () => {
  const packageJson = JSON.parse(
    readFileSync(join(import.meta.dir, '../../../package.json'), 'utf8'),
  ) as { scripts?: Record<string, string> }

  expect(packageJson.scripts?.['gen:game-3d-examples']).toBe('bun scripts/gen-game-3d-examples.ts')
  expect(packageJson.scripts?.['check:game-3d-examples']).toBe(
    'bun scripts/gen-game-3d-examples.ts --check',
  )
})

test('fachadas históricas concentradas não podem crescer', () => {
  const budgets = new Map([
    ['../../parsers/js.ts', 14_100],
    ['../../ir/schema.ts', 12_800],
    ['../../blockly/buildIR.ts', 9_400],
  ])

  for (const [relativePath, maxLines] of budgets) {
    const source = readFileSync(join(import.meta.dir, relativePath), 'utf8')
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(maxLines)
  }
})
