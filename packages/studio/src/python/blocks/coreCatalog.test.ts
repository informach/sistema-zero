import { expect, test } from 'bun:test'
import { PYTHON_PROGRAMMING_CODECS as codecs } from './catalog'
import { integer, name, node, pythonSemanticTree, text } from './nodes'

test('every advertised foundation block has a lossless default codec and one stable identity', () => {
  expect(new Set(codecs.map((codec) => codec.id)).size).toBe(codecs.length)
  for (const codec of codecs) {
    const original = codec.defaultNode()
    const shape = codec.decode(original)
    expect(shape, codec.id).toBeDefined()
    expect(pythonSemanticTree(codec.encode(shape!)), codec.id).toEqual(pythonSemanticTree(original))
    expect(codec.help.length).toBeGreaterThan(10)
  }
})
test('integer fields retain Python precision and text keeps exact Unicode', () => {
  const number = codecs.find((codec) => codec.id === 'sz_py_integer')!
  const big = integer('90071992547409931234567890')
  expect(number.encode(number.decode(big)!)).toEqual(big)
  const string = codecs.find((codec) => codec.id === 'sz_py_text')!
  const original = text('🐢\n"ação"\u2028')
  expect(string.encode(string.decode(original)!)).toEqual(original)
})
test('assignment context follows the target without mutating the connected source node', () => {
  const assignment = codecs.find((codec) => codec.id === 'sz_py_assign')!
  const shape = assignment.decode(assignment.defaultNode())!
  const target = name('pontos')
  shape.inputs[0]!.nodes = [target]
  expect(assignment.encode(shape).fields.targets).toEqual([name('pontos', 'Store')])
  expect(target).toEqual(name('pontos'))
  shape.inputs[0]!.nodes = [integer('3')]
  expect(() => assignment.encode(shape)).toThrow('receber o valor')
})
test('unsupported syntax stays outside the codec instead of losing information', () => {
  const assignment = codecs.find((codec) => codec.id === 'sz_py_assign')!
  expect(
    assignment.decode(
      node('Assign', {
        targets: [name('a', 'Store'), name('b', 'Store')],
        value: integer('1'),
        type_comment: null,
      }),
    ),
  ).toBeUndefined()
  expect(
    assignment.decode(
      node('Assign', { targets: [name('a', 'Store')], value: integer('1'), type_comment: 'int' }),
    ),
  ).toBeUndefined()
  const arithmetic = codecs.find((codec) => codec.id === 'sz_py_arithmetic')!
  expect(
    arithmetic.decode(node('BinOp', { left: name('a'), op: node('MatMult'), right: name('b') })),
  ).toBeUndefined()
})
