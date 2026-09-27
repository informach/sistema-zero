import { expect, test } from 'bun:test'
import { GltfInputError } from './gltfInput'
import { gltfLocalFilePath, gltfResourcePath } from './gltfResourcePath'
import { readMtlDocument } from './mtlDocument'
import { MTL_INPUT_LIMITS, type MtlReadLimits } from './mtlInput'
import { readObjBundle } from './objBundle'
import { OBJ_INPUT_LIMITS as limits, ObjInputError } from './objInput'
import type { ObjLocalFile } from './objLocalResources'
import { objLocalFilePath, objResourcePath } from './objResourcePath'

const bytes = (text: string) => new TextEncoder().encode(text),
  file = (path: string, text: string): ObjLocalFile => ({ path, bytes: bytes(text) }),
  mesh = 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n'
function failure(run: () => unknown, reason: ObjInputError['reason'], path?: string) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ObjInputError)
    if (!(error instanceof ObjInputError)) throw error
    expect(error.reason).toBe(reason)
    if (path) expect(error.path).toBe(path)
    return error
  }
  throw new Error(`Expected ${reason}`)
}

test('OBJ literal references and glTF URIs share containment but preserve their different filename semantics', () => {
  const entry = 'folder/model.obj'
  for (const [input, expected] of [
    ['./mats/../paint.png', 'folder/paint.png'],
    ['../paint.png', 'paint.png'],
    ['mats\\paint.png', 'folder/mats/paint.png'],
    ['..\\paint.png', 'paint.png'],
    ['paint%20blue.png', 'folder/paint%20blue.png'],
    ['%2e%2e/paint.png', 'folder/%2e%2e/paint.png'],
    ['paint%2fblue.png', 'folder/paint%2fblue.png'],
    ['paint%zz.png', 'folder/paint%zz.png'],
    ['paint?blue.png', 'folder/paint?blue.png'],
    ['a#b.png', 'folder/a#b.png'],
  ])
    expect(objResourcePath(input!, entry, 'ref')).toBe(expected!)
  expect(gltfResourcePath('paint%20blue.png', entry, 'ref')).toBe('folder/paint blue.png')
  expect(gltfResourcePath('%2e%2e/paint.png', entry, 'ref')).toBe('paint.png')
  for (const path of [
    'paint%2fblue.png',
    'paint%zz.png',
    'paint?blue.png',
    'a#b.png',
    'mats\\paint.png',
  ])
    expect(() => gltfResourcePath(path, entry, 'ref')).toThrow(GltfInputError)
  expect(objLocalFilePath('folder/./a%20b.png')).toBe(gltfLocalFilePath('folder/./a%20b.png'))
  for (const path of [
    '../../escape.png',
    '/absolute.png',
    '\\absolute.png',
    '//server/a.png',
    '\\\\server\\a.png',
    'C:\\a.png',
    'https://invalid.example/x.png',
    'data:image/png;base64,AA==',
  ])
    failure(() => objResourcePath(path, entry, 'ref'), 'unsupported', 'ref')
  for (const path of ['', '.', '..', 'folder/..', 'a/', 'a//b', 'a\0b', 'a\tb'])
    failure(() => objResourcePath(path, entry, 'ref'), 'invalid', 'ref')
  for (const path of ['C:/a.png', 'folder/../C:/a.png', '../a', '/a'])
    failure(() => objLocalFilePath(path), 'unsupported')
  failure(() => objLocalFilePath('folder\\a.png'), 'invalid', 'files.path')
  failure(() => objResourcePath('a'.repeat(4096), entry, 'ref'), 'budget', 'ref')
  failure(() => objResourcePath('dir/../C:/a.png', 'model.obj', 'ref'), 'unsupported', 'ref')
})

test('OBJ bundle resolves ordered MTL declarations and source dependencies relative to each library with owned bytes', () => {
  const input = bytes(`mtllib mats/a.mtl mats/b.mtl mats/./a.mtl\n${mesh}mtllib mats/b.mtl\n`),
    albedoStorage = new Uint8Array([99, 1, 2, 3, 98]),
    files = [
      file(
        'project/mats/a.mtl',
        'newmtl Same\nKd .5\nmap_Kd ../textures/blue%20sky.png\nKs spectral ../curves/metal.rfl\n',
      ),
      file(
        'project/mats/b.mtl',
        'newmtl Same\nnewmtl Same\nmap_Kd ..\\textures\\blue  sky.png\nnorm ../textures/blue%20sky.png\n',
      ),
      { path: 'project/textures/blue%20sky.png', bytes: albedoStorage.subarray(1, 4) },
      { path: 'project/textures/blue  sky.png', bytes: new Uint8Array([4, 5]) },
      file('project/curves/metal.rfl', 'inert source curve'),
      file('unreferenced.bin', 'unused'),
    ],
    snapshots = files.map(({ bytes }) => bytes.slice()),
    original = input.slice(),
    result = readObjBundle(input, files, 'project/model.obj')
  expect(result.status).toBe('ready')
  if (result.status !== 'ready') throw new Error('Expected complete source bundle')
  expect(result.librarySets).toEqual([[0, 1, 0], [1]])
  expect(result.libraries.map(({ path }) => path)).toEqual([
    'project/mats/a.mtl',
    'project/mats/b.mtl',
  ])
  expect(result.libraries[1]!.source.materials.map(({ name }) => name)).toEqual(['Same', 'Same'])
  expect(result.resources.size).toBe(5)
  expect(result.resourceBytes).toBe(
    files.slice(0, -1).reduce((sum, item) => sum + item.bytes.length, 0),
  )
  expect(result.resources.get('project/textures/blue%20sky.png')).toEqual(new Uint8Array([1, 2, 3]))
  expect(result.resources.get('project/textures/blue%20sky.png')!.buffer.byteLength).toBe(3)
  expect(result.source.elements.length).toBe(1)
  expect(input).toEqual(original)
  files.forEach((item, index) => {
    expect(item.bytes).toEqual(snapshots[index]!)
  })
  result.resources.get('project/textures/blue%20sky.png')!.fill(7)
  expect(albedoStorage).toEqual(new Uint8Array([99, 1, 2, 3, 98]))
  files[0]!.bytes.fill(0)
  expect(result.libraries[0]!.source.materials[0]!.name).toBe('Same')
  expect(new TextDecoder().decode(result.resources.get('project/mats/a.mtl'))).toStartWith(
    'newmtl Same',
  )
})

test('OBJ reports all currently discoverable missing paths, not a partial bundle or basename/case fallback', () => {
  const input = bytes('mtllib missing.mtl present.mtl missing.mtl\n'),
    selected = [
      file(
        'present.mtl',
        'newmtl X\nmap_Kd textures/A.png\nbump textures/B.png\nmap_Kd textures/A.png\n',
      ),
      file('A.png', 'wrong directory'),
      file('textures/a.png', 'wrong case'),
    ]
  expect(readObjBundle(input, selected)).toEqual({
    status: 'missing',
    paths: ['missing.mtl', 'textures/A.png', 'textures/B.png'],
  })
  expect(
    readObjBundle(input, [...selected, file('missing.mtl', 'newmtl Late\nmap_d late.png\n')]),
  ).toEqual({ status: 'missing', paths: ['late.png', 'textures/A.png', 'textures/B.png'] })
  const noLibraries = readObjBundle(bytes(mesh), [file('unused.mtl', 'invalid but unused source')])
  if (noLibraries.status !== 'ready') throw new Error('Unused companions should not be interpreted')
  expect(noLibraries.libraries).toEqual([])
  expect(noLibraries.resources.size).toBe(0)
  expect(noLibraries.resourceBytes).toBe(0)
})

test('OBJ library parse/resource errors retain file and source line, and never execute or recursively include resources', () => {
  const input = bytes('mtllib mats/a.mtl\n')
  const malformed = failure(
    () => readObjBundle(input, [file('mats/a.mtl', 'newmtl X\nKd NaN\n')]),
    'invalid',
    'files["mats/a.mtl"].lines[2]',
  )
  expect(malformed.cause).toBeInstanceOf(ObjInputError)
  failure(
    () => readObjBundle(input, [file('mats/a.mtl', 'newmtl X\nmap_Kd ../../outside.png\n')]),
    'unsupported',
    'files["mats/a.mtl"].lines[2].filename',
  )
  failure(
    () => readObjBundle(input, [file('mats/a.mtl', 'newmtl X\ncall other.mtl\n')]),
    'unsupported',
    'files["mats/a.mtl"].lines[2]',
  )
  failure(
    () =>
      readObjBundle(input, [
        file('mats/a.mtl', 'newmtl X\nmap_Kd https://invalid.example/x.png\n'),
      ]),
    'unsupported',
  )
  failure(() => readObjBundle(bytes('mtllib model.obj\n')), 'invalid', 'lines[1].mtllib')
  const procedural = readObjBundle(input, [
    file('mats/a.mtl', 'newmtl X\nmap_Kd proc.cxc\n'),
    file('mats/proc.cxc', 'call shell\nnot MTL\n'),
  ])
  expect(procedural.status).toBe('ready') // bytes only: no procedural or raster interpretation
})

test('OBJ selected-file metadata and byte budgets are checked before reading OBJ/MTL text', () => {
  const invalid = new Uint8Array([255])
  failure(() => readObjBundle(invalid, [file('a', ''), file('./a', '')]), 'invalid', 'files')
  failure(() => readObjBundle(invalid, [file('./model.obj', '')]), 'invalid', 'files')
  failure(
    () =>
      readObjBundle(invalid, [{ path: 'shared', bytes: new Uint8Array(new SharedArrayBuffer(1)) }]),
    'unsupported',
    'shared',
  )
  failure(
    () =>
      readObjBundle(invalid, [{ path: 'too-large', bytes: new Uint8Array(limits.fileBytes + 1) }]),
    'budget',
    'too-large',
  )
  const max = new Uint8Array(limits.fileBytes)
  failure(
    () =>
      readObjBundle(invalid, [
        { path: 'a', bytes: max },
        { path: 'b', bytes: max },
      ]),
    'budget',
    'files',
  )
  const exact = readObjBundle(new Uint8Array(), [
    { path: 'a', bytes: max },
    { path: 'b', bytes: max },
  ])
  expect(exact.status).toBe('ready') // exact 64 MiB selected, none referenced/decoded/copied
  const many = Array.from({ length: limits.resources }, (_, i) => file(`file_${i}`, ''))
  expect(readObjBundle(new Uint8Array(), many).status).toBe('ready')
  failure(() => readObjBundle(invalid, [...many, file('extra', '')]), 'budget', 'files')
})

test('OBJ resource count/bytes are joint across libraries and aliases only cost one referenced path', () => {
  const source = bytes('mtllib a.mtl\n'),
    library = bytes('newmtl A\nmap_Kd texture.bin\nmap_d ./texture.bin\n'),
    texture = new Uint8Array(limits.fileBytes - library.length),
    exact = readObjBundle(source, [
      { path: 'a.mtl', bytes: library },
      { path: 'texture.bin', bytes: texture },
    ])
  if (exact.status !== 'ready') throw new Error('Expected complete resource boundary')
  expect(exact.resourceBytes).toBe(limits.fileBytes)
  expect(exact.resources.size).toBe(2)
  failure(
    () =>
      readObjBundle(source, [
        { path: 'a.mtl', bytes: library },
        { path: 'texture.bin', bytes: new Uint8Array(texture.length + 1) },
      ]),
    'budget',
    'files["a.mtl"].resources',
  )
  const names = Array.from({ length: limits.resources }, (_, i) => `t_${i}`),
    atLimit = file(
      'a.mtl',
      `newmtl X\n${names
        .slice(0, -1)
        .map((name) => `map_Kd ${name}\n`)
        .join('')}`,
    )
  const missing = readObjBundle(source, [atLimit])
  expect(missing.status).toBe('missing')
  if (missing.status === 'missing') expect(missing.paths.length).toBe(limits.resources - 1)
  failure(
    () =>
      readObjBundle(source, [
        file('a.mtl', `newmtl X\n${names.map((name) => `map_Kd ${name}\n`).join('')}`),
      ]),
    'budget',
    'files["a.mtl"].resources',
  )
})

test('MTL lowered limits fail before the over-budget record or option is interpreted and cannot raise source ceilings', () => {
  const remaining: MtlReadLimits = { materials: 1, properties: 1, options: 1 },
    before = { ...remaining }
  expect(readMtlDocument(bytes('newmtl A\nmap_Kd -o 0 a.png\n'), remaining).costs).toEqual(
    remaining,
  )
  expect(remaining).toEqual(before)
  failure(() => readMtlDocument(bytes('newmtl A\nnewmtl\n'), remaining), 'budget', 'lines[2]')
  failure(
    () => readMtlDocument(bytes('newmtl A\nNs 1\nNs NaN\n'), remaining),
    'budget',
    'properties',
  )
  failure(
    () => readMtlDocument(bytes('newmtl A\nmap_Kd -o 0 -unknown a.png\n'), remaining),
    'budget',
    'options',
  )
  for (const key of ['materials', 'properties', 'options'] as const)
    for (const value of [-1, 0.5, NaN, Infinity, MTL_INPUT_LIMITS[key] + 1])
      failure(
        () => readMtlDocument(bytes('invalid text'), { ...remaining, [key]: value }),
        'invalid',
        `limits.${key}`,
      )
  expect(
    readMtlDocument(new Uint8Array(), { materials: 0, properties: 0, options: 0 }).materials,
  ).toEqual([])
})

test('OBJ enforces aggregate MTL material/property/option ceilings before parsing the next exceeding value', () => {
  const source = bytes('mtllib a.mtl a.mtl b.mtl\n')
  const mats = file('a.mtl', 'newmtl A\n'.repeat(MTL_INPUT_LIMITS.materials)),
    same = readObjBundle(bytes('mtllib a.mtl a.mtl\n'), [mats])
  if (same.status !== 'ready') throw new Error('Repeated library must be read once')
  expect(same.librarySets).toEqual([[0, 0]])
  failure(
    () => readObjBundle(source, [mats, file('b.mtl', 'newmtl\n')]),
    'budget',
    'files["b.mtl"].lines[1]',
  )
  failure(
    () =>
      readObjBundle(source, [
        file('a.mtl', `newmtl A\n${'Ns 1\n'.repeat(MTL_INPUT_LIMITS.properties)}`),
        file('b.mtl', 'newmtl B\nNs NaN\n'),
      ]),
    'budget',
    'files["b.mtl"].properties',
  )
  const map = `map_Kd ${'-o 0 '.repeat(MTL_INPUT_LIMITS.optionsPerMap)}t.png\n`,
    optionLimit = file(
      'a.mtl',
      `newmtl A\n${map.repeat(MTL_INPUT_LIMITS.options / MTL_INPUT_LIMITS.optionsPerMap)}`,
    )
  failure(
    () => readObjBundle(source, [optionLimit, file('b.mtl', 'newmtl B\nmap_Kd -unknown t.png\n')]),
    'budget',
    'files["b.mtl"].options',
  )
}, 30_000)
