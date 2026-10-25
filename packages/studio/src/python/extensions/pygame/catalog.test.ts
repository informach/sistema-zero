import { expect, test } from 'bun:test'
import { PYGAME_CE_VERSION, PYGAME_EXTENSION } from '../../../runtime/python/pygame/contract'
import { PYTHON_PROGRAMMING_CODECS } from '../../blocks/catalog'
import {
  attribute,
  call,
  expression,
  integer,
  moduleNode,
  name,
  node,
  text,
  withTargetContext,
} from '../../blocks/nodes'
import { type PythonVisualNode, pythonASTToVisual } from '../../blocks/projection'
import { attachPythonResolverOptions } from '../../blocks/resolverOptions'
import type { PythonNode } from '../../language/types'
import { PYTHON_EXTENSIONS } from '../catalog'
import { PYTHON_PYGAME_CODECS } from './catalog'

const codecs = attachPythonResolverOptions(
  [...PYTHON_PYGAME_CODECS, ...PYTHON_PROGRAMMING_CODECS],
  {},
)
const pygame = (...path: string[]) =>
  path.reduce<PythonNode>((value, attr) => attribute(value, attr), name('pygame'))
const assign = (target: PythonNode, value: PythonNode) =>
  node('Assign', { targets: [withTargetContext(target, 'Store')], value, type_comment: null })
const parameters = (...ids: string[]) =>
  node('arguments', {
    posonlyargs: [],
    args: ids.map((id) => node('arg', { arg: id, annotation: null, type_comment: null })),
    vararg: null,
    kwonlyargs: [],
    kw_defaults: [],
    kwarg: null,
    defaults: [],
  })
/** class Bola(pygame.sprite.Sprite): def __init__(self): self.<attr> = pygame.image.load('bola.png') */
const sprite = (store: PythonNode) =>
  node('ClassDef', {
    name: 'Bola',
    bases: [pygame('sprite', 'Sprite')],
    keywords: [],
    body: [
      node('FunctionDef', {
        name: '__init__',
        args: parameters('self'),
        body: [assign(store, call(pygame('image', 'load'), [text('bola.png')]))],
        decorator_list: [],
        returns: null,
        type_comment: null,
        type_params: [],
      }),
    ],
    decorator_list: [],
    type_params: [],
  })
const program = (...body: PythonNode[]) =>
  moduleNode([
    node('Import', { names: [node('alias', { name: 'pygame', asname: null })] }),
    ...body,
    expression(call(pygame('init'))),
    expression(
      call(pygame('display', 'set_mode'), [
        node('Tuple', { elts: [integer('640'), integer('480')], ctx: node('Load') }),
      ]),
    ),
  ])
function codecIds(tree: PythonNode) {
  const ids = new Set<string>()
  const visit = (nodes: PythonVisualNode[]) => {
    for (const item of nodes)
      if (item.kind !== 'source') {
        ids.add(item.codecId)
        for (const input of item.inputs) visit(input.nodes)
      }
  }
  visit(pythonASTToVisual(tree, { codecs, officialModules: new Set(['pygame']) }).body)
  return ids
}

test('self.image in a sprite is object state: the file keeps its pygame blocks', () => {
  const ids = codecIds(program(sprite(attribute(name('self'), 'image'))))
  expect([...ids].some((id) => id.startsWith('sz_py_pygame_'))).toBe(true)
})

test('replacing a module member through the module still gives up the pygame blocks', () => {
  const ids = codecIds(program(sprite(pygame('image'))))
  expect([...ids].some((id) => id.startsWith('sz_py_pygame_'))).toBe(false)
})

// --- Attribute writes: one rule (CLAUDE.md, "Pygame-ce no Estúdio") ---------------------------
const self = (attr: string) => attribute(name('self'), attr)
const zero = () => integer('0')
const def = (id: string, args: string[], body: PythonNode[], decorators: PythonNode[] = []) =>
  node('FunctionDef', {
    name: id,
    args: parameters(...args),
    body: body.length ? body : [node('Pass')],
    decorator_list: decorators,
    returns: null,
    type_comment: null,
    type_params: [],
  })
const classDef = (id: string, bases: PythonNode[], body: PythonNode[]) =>
  node('ClassDef', { name: id, bases, keywords: [], body, decorator_list: [], type_params: [] })
const spriteClass = (id: string, body: PythonNode[]) =>
  classDef(id, [pygame('sprite', 'Sprite')], body)
const command = (receiver: PythonNode, method: string, args: PythonNode[] = []) =>
  expression(call(attribute(receiver, method), args))
const flip = () => expression(call(pygame('display', 'flip')))
const hasPygameBlocks = (...body: PythonNode[]) =>
  [...codecIds(program(...body, flip()))].some((id) => id.startsWith('sz_py_pygame_'))
/** The codec of every statement and value, in source order (`source` for opaque ones). */
function codecsInOrder(tree: PythonNode) {
  const found: string[] = []
  const visit = (items: PythonVisualNode[]) => {
    for (const item of items) {
      found.push(item.kind === 'source' ? 'source' : item.codecId)
      if (item.kind !== 'source') for (const input of item.inputs) visit(input.nodes)
    }
  }
  visit(pythonASTToVisual(tree, { codecs, officialModules: new Set(['pygame', 'pinta']) }).body)
  return found
}
const imports = [
  node('Import', { names: [node('alias', { name: 'pygame', asname: null })] }),
  node('Import', { names: [node('alias', { name: 'pinta', asname: null })] }),
]

test('direct writes on self in an instance method are object state, whatever the name', () => {
  // fps, quadro and plataformas are pinta method names; image and rect are module members.
  for (const attr of ['fps', 'quadro', 'plataformas', 'image', 'rect', 'kill'])
    expect(
      hasPygameBlocks(
        spriteClass('Heroi', [def('__init__', ['self'], [assign(self(attr), zero())])]),
      ),
      attr,
    ).toBe(true)
  // Also from a nested function of the method, and as an augmented store.
  const step = node('AugAssign', {
    target: withTargetContext(self('quadro'), 'Store'),
    op: node('Add'),
    value: zero(),
  })
  expect(
    hasPygameBlocks(spriteClass('Heroi', [def('__init__', ['self'], [def('passo', [], [step])])])),
  ).toBe(true)
})

test('a write on an object proven to come from an official constructor is its state', () => {
  const jogador = () => name('jogador')
  expect(
    hasPygameBlocks(
      assign(jogador(), call(pygame('sprite', 'Sprite'))),
      assign(
        attribute(jogador(), 'image'),
        call(pygame('Surface'), [
          node('Tuple', { elts: [integer('50'), integer('50')], ctx: node('Load') }),
        ]),
      ),
    ),
  ).toBe(true)
})

test('writes that may reach a module still give up the file', () => {
  // self.mod holds pygame.display: self.mod.flip is a chain, not a direct write on self.
  expect(
    hasPygameBlocks(
      spriteClass('Bola', [
        def(
          '__init__',
          ['self'],
          [
            assign(self('mod'), pygame('display')),
            assign(
              attribute(self('mod'), 'flip'),
              node('Lambda', { args: parameters(), body: zero() }),
            ),
          ],
        ),
      ]),
    ),
  ).toBe(false)
  // The first parameter of a static or class method is not the object.
  for (const decorator of ['staticmethod', 'classmethod'])
    expect(
      hasPygameBlocks(
        spriteClass('Bola', [
          def('f', ['m'], [assign(attribute(name('m'), 'flip'), zero())], [name(decorator)]),
        ]),
      ),
      decorator,
    ).toBe(false)
  // A reassigned self proves nothing.
  expect(
    hasPygameBlocks(
      spriteClass('Bola', [
        def('f', ['self'], [assign(name('self'), pygame('display')), assign(self('flip'), zero())]),
      ]),
    ),
  ).toBe(false)
  // A parameter of unknown origin, a module alias, and the module itself.
  expect(hasPygameBlocks(def('f', ['m'], [assign(attribute(name('m'), 'flip'), zero())]))).toBe(
    false,
  )
  expect(
    hasPygameBlocks(
      assign(name('tela'), pygame('display')),
      assign(attribute(name('tela'), 'flip'), zero()),
    ),
  ).toBe(false)
  expect(hasPygameBlocks(assign(pygame('display', 'flip'), zero()))).toBe(false)
})

test('dunders stay guarded on self; private names only where the class may be official', () => {
  expect(
    hasPygameBlocks(spriteClass('Bola', [def('f', ['self'], [assign(self('__class__'), zero())])])),
  ).toBe(false)
  expect(
    hasPygameBlocks(spriteClass('Bola', [def('f', ['self'], [assign(self('_groups'), zero())])])),
  ).toBe(false)
  // A class of the child's own, with no official ancestor: its private state is its own.
  expect(
    hasPygameBlocks(
      classDef('Placar', [], [def('f', ['self'], [assign(self('_pontos'), zero())])]),
    ),
  ).toBe(true)
})

test('replacing an official method only drops the official block on that receiver', () => {
  const sprite = (id: string) => assign(name(id), call(pygame('sprite', 'Sprite')))
  const objects = codecsInOrder(
    moduleNode([
      ...imports,
      sprite('fantasma'),
      sprite('heroi'),
      assign(attribute(name('fantasma'), 'kill'), name('print')),
      command(name('fantasma'), 'kill'),
      command(name('heroi'), 'kill'),
      flip(),
    ]),
  )
  // fantasma.kill() is the replacement now; heroi.kill() and the rest of the file keep theirs.
  expect(objects.filter((id) => id === 'sz_py_pygame_kill')).toHaveLength(1)
  expect(objects).toContain('sz_py_pygame_flip')
  // `self.kill = f` in one sprite class: only that class's `self.kill()` loses the block.
  const classes = codecsInOrder(
    moduleNode([
      ...imports,
      spriteClass('Fantasma', [
        def('__init__', ['self'], [assign(self('kill'), name('print'))]),
        def('sumir', ['self'], [command(name('self'), 'kill')]),
      ]),
      spriteClass('Heroi', [def('sumir', ['self'], [command(name('self'), 'kill')])]),
      flip(),
    ]),
  )
  expect(classes.filter((id) => id === 'sz_py_pygame_kill')).toHaveLength(1)
  expect(classes).toContain('sz_py_pygame_flip')
})

test("a method the child's class defines is not the official block on self or its objects", () => {
  const tela = () => name('tela')
  const found = codecsInOrder(
    moduleNode([
      ...imports,
      classDef(
        'Bola',
        [],
        [
          def('desenhar', ['self', 'tela'], []),
          def('mostrar', ['self'], [command(name('self'), 'desenhar', [tela()])]),
        ],
      ),
      // A subclass inherits the child's method.
      classDef(
        'BolaGrande',
        [name('Bola')],
        [def('mostrar', ['self'], [command(name('self'), 'desenhar', [tela()])])],
      ),
      // Only a subclass defines it, and self may be one of its objects.
      classDef(
        'Base',
        [pygame('sprite', 'Sprite')],
        [def('mostrar', ['self'], [command(name('self'), 'desenhar', [tela()])])],
      ),
      classDef('Filha', [name('Base')], [def('desenhar', ['self', 'tela'], [])]),
      assign(name('j'), call(name('Bola'))),
      command(name('j'), 'desenhar', [tela()]),
      spriteClass('Inimigo', [
        def('kill', ['self'], []),
        def('sumir', ['self'], [command(name('self'), 'kill')]),
      ]),
    ]),
  )
  expect(found).not.toContain('sz_py_pygame_pinta_draw')
  expect(found).not.toContain('sz_py_pygame_kill')
})

test('official methods keep their blocks on official receivers', () => {
  const found = codecsInOrder(
    moduleNode([
      ...imports,
      // The child's `desenhar` and `fps` live elsewhere; this sprite class defines neither
      // kill, fill nor tick: self.kill(), self.image.fill(…), self.relogio.tick(60) are pygame's.
      classDef('Bola', [], [def('desenhar', ['self', 'tela'], [])]),
      spriteClass('Heroi', [
        def(
          '__init__',
          ['self'],
          [
            assign(self('relogio'), call(pygame('time', 'Clock'))),
            assign(self('fps'), integer('12')),
          ],
        ),
        def('sumir', ['self'], [command(name('self'), 'kill')]),
        def('pintar', ['self'], [command(self('image'), 'fill', [text('#000000')])]),
        def(
          'esperar',
          ['self'],
          [assign(name('dt'), call(attribute(self('relogio'), 'tick'), [integer('60')]))],
        ),
      ]),
      assign(name('mapa'), call(attribute(name('pinta'), 'carregar_mapa'), [text('fase')])),
      assign(name('camada'), call(attribute(name('mapa'), 'camada'), [text('Terreno')])),
      command(name('camada'), 'desenhar', [name('tela')]),
    ]),
  )
  for (const id of ['kill', 'fill', 'tick', 'pinta_draw', 'pinta_layer'])
    expect(found, id).toContain(`sz_py_pygame_${id}`)
})

test('the pygame help names the version the runtime pins', () => {
  const pygameExtension = PYTHON_EXTENSIONS.find((item) => item.id === PYGAME_EXTENSION.id)!
  expect(pygameExtension.help).toContain(`pygame-ce==${PYGAME_CE_VERSION}`)
})
