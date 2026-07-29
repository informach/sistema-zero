import { describe, expect, it } from 'bun:test'
import ts from 'typescript'
import { gameKit3DExtension } from '../index'
import { gameKit3DRuntime } from '../runtime'

function importMapResolves(specifier: string, imports: Record<string, string>): boolean {
  return Object.keys(imports).some(
    (key) => key === specifier || (key.endsWith('/') && specifier.startsWith(key)),
  )
}

function collectModuleSpecifiers(source: string): string[] {
  const sourceFile = ts.createSourceFile(
    'game-3d-advanced-runtime.js',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  )
  const specifiers: string[] = []
  const visit = (node: ts.Node) => {
    const dynamicSpecifier = ts.isCallExpression(node) ? node.arguments[0] : undefined
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text)
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      dynamicSpecifier !== undefined &&
      ts.isStringLiteralLike(dynamicSpecifier)
    ) {
      specifiers.push(dynamicSpecifier.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return specifiers
}

describe('Jogo 3D Avançado — imports do runtime', () => {
  it('o coletor cobre imports estáticos e dinâmicos com ambas as aspas', () => {
    expect(
      collectModuleSpecifiers(
        `import x from 'estatico'; import("dinamico-duplo"); import('dinamico-simples');`,
      ),
    ).toEqual(['estatico', 'dinamico-duplo', 'dinamico-simples'])
  })

  it('todo import estático ou dinâmico do bootstrap é resolvido pelo importmap', () => {
    const imports = gameKit3DExtension.runtime.esmImports ?? {}
    const moduleSpecifiers = collectModuleSpecifiers(gameKit3DRuntime)

    expect(moduleSpecifiers).not.toHaveLength(0)
    expect(moduleSpecifiers.filter((specifier) => !importMapResolves(specifier, imports))).toEqual(
      [],
    )
    expect(imports['three/addons/loaders/HDRLoader.js']).toContain(
      '/examples/jsm/loaders/HDRLoader.js',
    )
  })
})
