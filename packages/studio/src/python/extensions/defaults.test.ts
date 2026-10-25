import { expect, test } from 'bun:test'
import { PYTHON_PROGRAMMING_CODECS } from '../blocks/catalog'
import { expression, moduleNode, node, pythonSemanticTree } from '../blocks/nodes'
import { pythonASTToVisual, pythonVisualToAST } from '../blocks/projection'
import { attachPythonResolverOptions } from '../blocks/resolverOptions'
import { PGZERO_RESOLVER_OPTIONS, PYTHON_PGZERO_CODECS } from './pgzero/catalog'
import { PYTHON_PYGAME_CODECS } from './pygame/catalog'
import { RAYLIB_RESOLVER_OPTIONS } from './raylib/commonCatalog'
import { PYTHON_RAYLIB_2D_CODECS } from './raylib2d/catalog'
import { PYTHON_RAYLIB_3D_CODECS } from './raylib3d/catalog'
import { PYTHON_TURTLE_CODECS, TURTLE_STAR_EXPORTS } from './turtle/catalog'

const families = [
  {
    name: 'Turtle',
    codecs: PYTHON_TURTLE_CODECS,
    options: { starExports: new Map([['turtle', TURTLE_STAR_EXPORTS]]) },
  },
  { name: 'Pygame Zero', codecs: PYTHON_PGZERO_CODECS, options: PGZERO_RESOLVER_OPTIONS },
  { name: 'Pygame-ce', codecs: PYTHON_PYGAME_CODECS, options: {} },
  { name: 'Raylib 2D', codecs: PYTHON_RAYLIB_2D_CODECS, options: RAYLIB_RESOLVER_OPTIONS },
  { name: 'Raylib 3D', codecs: PYTHON_RAYLIB_3D_CODECS, options: RAYLIB_RESOLVER_OPTIONS },
]

for (const family of families)
  test(`${family.name}: every palette default and optional socket generates editable Python`, () => {
    const codecs = attachPythonResolverOptions(
      [...family.codecs, ...PYTHON_PROGRAMMING_CODECS],
      family.options,
    )
    for (const codec of family.codecs) {
      const initial = codec.decode(codec.defaultNode())
      expect(initial, codec.id).toBeDefined()
      const shapes = [
        initial!,
        ...(codec.controls ?? [])
          .filter((control) => control.kind === 'optional')
          .map((control) => codec.reshape!(initial!, control.key, true)),
      ]
      for (const shape of shapes) {
        const value = codec.encode(shape)
        const tree = moduleNode([
          node('Import', {
            names: ['turtle', 'pygame', 'pinta'].map((name) =>
              node('alias', { name, asname: null }),
            ),
          }),
          node('ImportFrom', {
            module: 'pyray',
            level: { literal: 'int', value: '0' },
            names: [node('alias', { name: '*', asname: null })],
          }),
          codec.role === 'value' ? expression(value) : value,
        ])
        const visual = pythonASTToVisual(tree, {
          codecs,
          officialModules: new Set(['turtle', 'pygame', 'pinta', 'pgzero', 'pgzrun', 'pyray']),
        })
        expect(() => pythonVisualToAST(visual, codecs), codec.id).not.toThrow()
        expect(pythonSemanticTree(pythonVisualToAST(visual, codecs)), codec.id).toEqual(
          pythonSemanticTree(tree),
        )
      }
    }
  })
