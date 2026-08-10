import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

test('galeria e store completa ficam fora do grafo estático da lista', () => {
  const source = readFileSync(join(import.meta.dir, '../ProjectList.tsx'), 'utf8')

  expect(source).not.toMatch(/import\s+.*from ['"]\.\/KitGallery['"]/)
  expect(source).not.toMatch(/import\s+.*from ['"]\.\.\/state\/projectStore['"]/)
  expect(source).toContain("import('./KitGallery')")
  expect(source).toContain("import('../state/projectStore')")
})

test('playground separa a listagem do host completo do editor', () => {
  const source = readFileSync(join(import.meta.dir, '../../../playground/LandingApp.tsx'), 'utf8')

  expect(source).toMatch(/import\s+.*from ['"]@sistemazero\/studio\/project-list['"]/)
  expect(source).toContain("import('./App')")
})
