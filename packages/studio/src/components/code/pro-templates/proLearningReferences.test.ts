import { describe, expect, test } from 'bun:test'
import {
  STUDIO_PRO_TEMPLATES,
  studioProGameGuide,
  studioProTaskGuides,
} from '@sistemazero/core/studio'
import ts from 'typescript'
import { createGameTree } from './games'

function exportedNames(path: string, content: string): Set<string> {
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true)
  const names = new Set<string>()
  for (const node of source.statements) {
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) names.add(element.name.text)
    }
    if (
      !ts.canHaveModifiers(node) ||
      !ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    )
      continue
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node)) &&
      node.name
    )
      names.add(node.name.text)
    if (ts.isVariableStatement(node))
      for (const declaration of node.declarationList.declarations)
        if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text)
  }
  return names
}

describe('referências didáticas conferidas nos templates reais', () => {
  for (const template of STUDIO_PRO_TEMPLATES.filter((item) => item.kitVersion))
    test(template.id, async () => {
      const tree = await createGameTree(template)
      const guides = studioProTaskGuides('', template.id, 'browse')
      expect(guides.length).toBeGreaterThanOrEqual(5)
      for (const guide of guides) {
        const recipe = guide.recipe
        if (!recipe) throw new Error(`Receita ausente: ${guide.id}`)
        expect(recipe.steps.length).toBeGreaterThan(0)
        expect(recipe.checks.length).toBeGreaterThan(0)
        for (const reference of recipe.references) {
          const node = tree[reference.path]
          if (node?.kind !== 'file')
            throw new Error(`${template.id}/${guide.id}: ${reference.path} ausente`)
          expect(exportedNames(reference.path, node.content).has(reference.exportName)).toBe(true)
          expect(reference.typeReference).toContain(reference.exportName)
        }
      }
      const selected = studioProTaskGuides('som e volume', template.id)
      expect(
        studioProGameGuide(template.id, 'som e volume')?.taskGuides.map((guide) => guide.id),
      ).toEqual(selected.map((guide) => guide.id))
    })

  test('IDs não reconhecidos ou templates sem kit não ganham receitas por manifesto editado', () => {
    expect(studioProTaskGuides('', 'importado', 'browse')).toEqual([])
    expect(studioProTaskGuides('', 'vanilla-vite', 'browse')).toEqual([])
    expect(studioProTaskGuides('personagem modelo', 'three-tactics')).toEqual([])
  })
})
