import { expect, test } from 'bun:test'
import { Mesh } from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { readObjDocument } from './objDocument'
import { OBJ_INPUT_LIMITS as limits, ObjInputError } from './objInput'
import { objStatements } from './objText'

const bytes = (text: string) => new TextEncoder().encode(text)
const read = (text: string) => readObjDocument(bytes(text))
const points = 'v 0 0 0\nv 2 0 0\nv 0 3 0\n'
function failure(text: string, reason: ObjInputError['reason'], path?: string) {
  try {
    read(text)
  } catch (error) {
    expect(error).toBeInstanceOf(ObjInputError)
    if (!(error instanceof ObjInputError)) throw error
    expect(error.reason).toBe(reason)
    if (path) expect(error.path).toBe(path)
    return
  }
  throw new Error(`Expected ${reason} for ${text.slice(0, 80)}`)
}

test('OBJ source preserves independent absolute/relative references, winding, rational weights and unused values', () => {
  const source = read(
    'v 2 4 6 .5\nvt .2\nvn 0 0 2\nv 8 0 -0\nvt .4 .8 .3\nv 0 1 2\nf -1/-1/-1 +1/+1/+1 -2/1/1\nv 99 99 99\n',
  )
  expect(Array.from(source.positions)).toEqual([
    2, 4, 6, 0.5, 8, 0, -0, 1, 0, 1, 2, 1, 99, 99, 99, 1,
  ])
  expect(Array.from(source.texcoords)).toEqual([0.2, 0, 0, 0.4, 0.8, 0.3])
  expect(Array.from(source.normals)).toEqual([0, 0, 2])
  expect(Array.from(source.corners)).toEqual([2, 1, 0, 0, 0, 0, 1, 0, 0])
  expect(source.elements).toEqual([
    { kind: 'face', line: 7, state: 0, offset: 0, count: 3, hasUv: true, hasNormals: true },
  ])
  expect(source.states[0]).toEqual({
    object: null,
    objectLine: 0,
    groups: ['default'],
    material: null,
    smoothing: 0,
    library: null,
  })
})

test('OBJ object/group/material states are ordered, shared without inferred hierarchy and retain empty declarations', () => {
  const source = read(
      `${points}o Caixa  azul\ng frente equipe\ns on\nmtllib first.mtl second.mtl\nusemtl Azul  claro\nf 1 2 3\no Vazia\no Caixa  azul\ns 7\ng\nusemtl\np -1\nmtllib other.mtl\ns off\nl 1 2\n`,
    ),
    [face, point, line] = source.elements
  expect(source.states[face!.state]).toEqual({
    object: 'Caixa  azul',
    objectLine: 4,
    groups: ['frente', 'equipe'],
    smoothing: 1,
    material: 'Azul  claro',
    library: 0,
  })
  expect(source.states[point!.state]).toEqual({
    object: 'Caixa  azul',
    objectLine: 11,
    groups: ['default'],
    smoothing: 7,
    material: null,
    library: 0,
  })
  expect(source.states[line!.state]).toEqual({
    object: 'Caixa  azul',
    objectLine: 11,
    groups: ['default'],
    smoothing: 0,
    material: null,
    library: 1,
  })
  expect(source.states.some((state) => state.object === 'Vazia')).toBe(true)
  expect(source.states[2]!.groups).toBe(source.states[5]!.groups)
  expect(source.libraries).toEqual([
    { line: 7, names: ['first.mtl', 'second.mtl'] },
    { line: 16, names: ['other.mtl'] },
  ])
  expect(source.elements.map((element) => [element.offset, element.count])).toEqual([
    [0, 3],
    [3, 1],
    [4, 2],
  ])
})

test('OBJ points and polylines retain source order and per-corner optional texture references', () => {
  const source = read(`${points}vt .1 .2\np 3 1 1\nl 1/1 2 3/1\nvn 0 0 1\nf 1//1 2//1 3//1\n`)
  expect(Array.from(source.corners)).toEqual([
    2, -1, -1, 0, -1, -1, 0, -1, -1, 0, 0, -1, 1, -1, -1, 2, 0, -1, 0, -1, 0, 1, -1, 0, 2, -1, 0,
  ])
  expect(
    source.elements.map((element) => [element.kind, element.hasUv, element.hasNormals]),
  ).toEqual([
    ['points', false, false],
    ['line', true, false],
    ['face', false, true],
  ])
})

test('OBJ repeated object names retain declaration identity across group and material state changes', () => {
  const source = read(
    `o Same\n${points}s 1\nf 1 2 3\ns 1\nf 1 2 3\no Same\ng team\nf 1 2 3\ng team\nf 1 2 3\n`,
  )
  expect(source.elements.map((element) => source.states[element.state])).toMatchObject([
    { object: 'Same', objectLine: 1 },
    { object: 'Same', objectLine: 1 },
    { object: 'Same', objectLine: 9 },
    { object: 'Same', objectLine: 9 },
  ])
})

test('OBJ rejects missing, zero, unsafe, fractional, forward and inconsistent face references', () => {
  for (const face of [
    'f 0 2 3',
    'f -0 2 3',
    'f 1 2 4',
    'f -4 2 3',
    'f 1.0 2 3',
    'f 9007199254740992 2 3',
    'f 1e0 2 3',
    'f 1/1 2 3',
    'f 1//1 2//1 3//1',
    'f 1/ 2/ 3/',
    'f 1/1/ 2/1/ 3/1/',
    'f 1///1 2///1 3///1',
    'f /1 /1 /1',
    'f 1 2',
    'l 1',
    'p',
    'p 1/1',
    'l 1//1 2//1',
  ])
    failure(`${points}${face}\n`, 'invalid', 'lines[4]')
  failure(`f 1 2 3\n${points}`, 'invalid', 'lines[1]')
  failure(`${points}vt 0 0\nvn 0 0 1\nf 1/1/1 2/1/1 3//1\n`, 'invalid', 'lines[6]')
})

test('OBJ finite decimal syntax, defaults and unsupported statements do not silently produce partial models', () => {
  const valid = read('v +.5 -2. +3e-2 -1\nvt -.4\nvt 1 2\nvt 3 4 5\nvn 1e+2 0 -2\n')
  expect(Array.from(valid.positions)).toEqual([0.5, -2, 0.03, -1])
  expect(Array.from(valid.texcoords)).toEqual([-0.4, 0, 0, 1, 2, 0, 3, 4, 5])
  for (const statement of [
    'v 1 2',
    'v 0x1 0 0',
    'v Infinity 0 0',
    'v NaN 0 0',
    'v 1e999 0 0',
    'vt',
    'vt 1 2 3 4',
    'vn 1 2',
    'vn 1 2 3 4',
    's',
    's -1',
    's 1.5',
    's 1 2',
    's 9007199254740992',
    'mtllib',
  ])
    failure(statement, 'invalid')
  for (const statement of [
    'call child.obj $1',
    'csh echo never-run',
    'csh -echo never-run',
    'curv 0 1 1 2 3',
    'cstype bezier',
    'vp 0 0',
    'surf 0 1 0 1 1 2 3',
    'end',
    'invented whatever',
    'v 0 0 0 1 0 0',
    'mtllib "a b.mtl"',
  ])
    failure(`${points}${statement}`, 'unsupported', 'lines[4]')
})

test('OBJ lexer handles UTF-8/BOM, CRLF/CR/LF, comments, bounded continuations and exact error lines', () => {
  const source = read(
    `\ufeff# arquivo\r\no Pé  azul\rv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 \\\n 2 \\ # continua\n# comentário\n 3 # fim\n`,
  )
  expect(source.states[1]!.object).toBe('Pé  azul')
  expect(source.elements[0]!.line).toBe(6)
  expect(source.elements[0]!.count).toBe(3)
  failure('v 0 \\\n 0 NaN\n', 'invalid', 'lines[1]')
  failure('v 0 0 0 \\', 'invalid', 'lines[1]')
  for (const control of ['\0', '\x01', '\x7f'])
    failure(`# ignored? ${control}`, 'invalid', 'lines[1]')
  expect(() => readObjDocument(new Uint8Array([0xc3, 0x28]))).toThrow('UTF-8')
  expect(() => readObjDocument(new Uint8Array(new SharedArrayBuffer(2)))).toThrow(
    'memória compartilhada',
  )
  expect(read('# only comments\n').positions.length).toBe(0)
  const rows = [...objStatements(bytes(' o A  B\nf 1 2 3'))]
  expect(rows).toEqual([
    { line: 1, keyword: 'o', args: ['A', 'B'], rest: 'A  B' },
    { line: 2, keyword: 'f', args: ['1', '2', '3'], rest: '1 2 3' },
  ])
})

test('OBJ enforces source byte, line, name, state, group and library limits without clipping data', () => {
  expect(() => readObjDocument(new Uint8Array(limits.fileBytes + 1))).toThrow('limite')
  expect(read(`#${'x'.repeat(limits.lineChars - 1)}\n`).positions.length).toBe(0)
  failure(`#${'x'.repeat(limits.lineChars)}\n`, 'budget', 'lines[1]')
  failure(`o ${'x'.repeat(limits.nameChars + 1)}`, 'budget', 'lines[1]')
  expect(read(`o ${'x'.repeat(limits.nameChars)}`).states[1]!.object!.length).toBe(limits.nameChars)
  failure(`o ${'x'.repeat(40000)}\\\n${'x'.repeat(40000)}`, 'budget', 'lines[2]')
  expect(read('s 0\n'.repeat(limits.states - 1)).states.length).toBe(limits.states)
  failure('s 0\n'.repeat(limits.states), 'budget', `lines[${limits.states}]`)
  expect(read('g a\n'.repeat(limits.groupNames - 1)).states.length).toBe(limits.groupNames)
  failure('g a\n'.repeat(limits.groupNames), 'budget')
  expect(read('mtllib a.mtl\n'.repeat(limits.libraries)).libraries.length).toBe(limits.libraries)
  failure('mtllib a.mtl\n'.repeat(limits.libraries + 1), 'budget')
})

test('OBJ packed source owns its bytes and agrees with an independent Three loader on a supported polygon', () => {
  const text =
      'o Triangle\nv -.7 .2 1\nv 3 0 2\nv 0 4 0\nvt .1 .2\nvt .9 .3\nvt .4 .8\nvn 0 0 1\nf -2/-2/-1 -1/-1/-1 -3/-3/-1\n',
    input = bytes(text),
    before = input.slice(),
    source = readObjDocument(input),
    other = new OBJLoader().parse(text)
  try {
    const mesh = other.children[0]
    if (!(mesh instanceof Mesh)) throw new Error('Expected a mesh from the independent loader')
    const position: number[] = [],
      uv: number[] = [],
      normal: number[] = []
    for (let i = 0; i < source.corners.length; i += 3) {
      const p = source.corners[i]! * 4,
        t = source.corners[i + 1]! * 3,
        n = source.corners[i + 2]! * 3
      position.push(...source.positions.slice(p, p + 3))
      uv.push(...source.texcoords.slice(t, t + 2))
      normal.push(...source.normals.slice(n, n + 3))
    }
    expect(Array.from(mesh.geometry.getAttribute('position').array)).toEqual(
      position.map(Math.fround),
    )
    expect(Array.from(mesh.geometry.getAttribute('uv').array)).toEqual(uv.map(Math.fround))
    expect(Array.from(mesh.geometry.getAttribute('normal').array)).toEqual(normal.map(Math.fround))
    expect(input).toEqual(before)
    input.fill(0)
    expect(source.positions[0]).toBe(-0.7)
    source.positions.fill(99)
    expect(readObjDocument(before).positions[0]).toBe(-0.7)
    mesh.geometry.dispose()
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const material of materials) material.dispose()
  } finally {
    other.clear()
  }
})

test('OBJ packed chunks finish at their real length and preserve attributes across chunk boundaries', () => {
  const rows = Array.from({ length: 1_366 }, (_, i) => `v ${i} 0 0\nvt ${i} .5\nvn 0 ${i} 1\n`),
    source = read(`${rows.join('')}f -3/-3/-3 -2/-2/-2 -1/-1/-1\n`)
  expect(source.positions.length).toBe(1_366 * 4)
  expect(source.texcoords.length).toBe(1_366 * 3)
  expect(source.normals.length).toBe(1_366 * 3)
  for (let i = 0; i < 1_366; i++) {
    expect(source.positions[i * 4]).toBe(i)
    expect(source.texcoords[i * 3]).toBe(i)
    expect(source.normals[i * 3 + 1]).toBe(i)
  }
  expect(Array.from(source.positions.slice(-4))).toEqual([1_365, 0, 0, 1])
  expect(Array.from(source.texcoords.slice(-3))).toEqual([1_365, 0.5, 0])
  expect(Array.from(source.normals.slice(-3))).toEqual([0, 1_365, 1])
  expect(Array.from(source.corners)).toEqual([
    1_363, 1_363, 1_363, 1_364, 1_364, 1_364, 1_365, 1_365, 1_365,
  ])
})

test('OBJ lexer budgets physical lines and tokens, retaining control-error precedence at the boundary', () => {
  failure(`#${'x'.repeat(limits.lineChars - 1)}\0`, 'invalid', 'lines[1]')
  expect(read('\n'.repeat(limits.lines)).elements.length).toBe(0)
  failure('\n'.repeat(limits.lines + 1), 'budget', 'lines')
  const text = `p ${'1 '.repeat(8_191)}\n`.repeat(512)
  function count(input: string) {
    let total = 0
    for (const statement of objStatements(bytes(input))) total += statement.args.length + 1
    return total
  }
  expect(count(text)).toBe(limits.tokens)
  expect(() => count(`${text}p\n`)).toThrow('limite')
}, 30_000)

test('OBJ element and reference budgets include duplicate points and fail instead of clipping', () => {
  const elements = `v 0 0 0\n${'p 1\n'.repeat(limits.elements)}`
  expect(read(elements).elements.length).toBe(limits.elements)
  failure(`${elements}p 1\n`, 'budget', `lines[${limits.elements + 2}]`)
  const references = `v 0 0 0\n${(`p ${'1 '.repeat(8_192)}\n`).repeat(128)}`,
    result = read(references)
  expect(result.corners.length).toBe(limits.references * 3)
  expect(Array.from(result.corners.slice(-3))).toEqual([0, -1, -1])
  expect(result.elements.length).toBe(128)
  failure(`${references}p 1\n`, 'budget', 'lines[130]')
}, 30_000)
