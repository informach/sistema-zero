import { expect, test } from 'bun:test'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { readMtlDocument } from './mtlDocument'
import { MTL_INPUT_LIMITS as limits } from './mtlInput'
import type { MtlProperty } from './mtlTypes'
import { OBJ_INPUT_LIMITS, ObjInputError } from './objInput'

const bytes = (text: string) => new TextEncoder().encode(text),
  read = (text: string) => readMtlDocument(bytes(text)),
  properties = (text: string) => read(`newmtl Test\n${text}`).materials[0]!.properties
function failure(run: () => unknown, reason: ObjInputError['reason'], path?: string) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ObjInputError)
    if (!(error instanceof ObjInputError)) throw error
    expect(error.reason).toBe(reason)
    if (path) expect(error.path).toBe(path)
    return
  }
  throw new Error(`Expected ${reason}`)
}
function texture(text: string) {
  const entry = properties(`${text}\n`)[0]!
  if (entry.kind !== 'map') throw new Error('Expected texture source')
  return entry.value
}

test('MTL keeps repeated material identities and properties, absent values and opacity conflicts without defaults or clamping', () => {
  const input = bytes(
      'newmtl Azul  céu\nKd -.25 .12345678912345678 2\nKd .7\nd -halo .2\nTr .9\nd 1\nnewmtl Azul  céu\nnewmtl __proto__\nKa 0\nnewmtl constructor\n',
    ),
    before = input.slice(),
    source = readMtlDocument(input)
  expect(source.materials.map(({ line, name }) => [line, name])).toEqual([
    [1, 'Azul  céu'],
    [7, 'Azul  céu'],
    [8, '__proto__'],
    [10, 'constructor'],
  ])
  expect(source.materials[0]!.properties).toEqual([
    {
      line: 2,
      kind: 'color',
      keyword: 'Kd',
      value: { space: 'rgb', value: [-0.25, 0.12345678912345678, 2] },
    },
    { line: 3, kind: 'color', keyword: 'Kd', value: { space: 'rgb', value: [0.7, 0.7, 0.7] } },
    { line: 4, kind: 'dissolve', keyword: 'd', value: 0.2, halo: true },
    { line: 5, kind: 'scalar', keyword: 'Tr', value: 0.9 },
    { line: 6, kind: 'dissolve', keyword: 'd', value: 1, halo: false },
  ])
  expect(source.materials[1]!.properties).toEqual([])
  expect(source.materials[3]!.properties).toEqual([])
  expect(source.costs).toEqual({ materials: 4, properties: 6, options: 0 })
  expect(input).toEqual(before)
  source.materials[0]!.properties.length = 0
  expect(readMtlDocument(input).materials[0]!.properties.length).toBe(5)
  input.fill(0)
  expect(source.materials[0]!.name).toBe('Azul  céu')
})

test('MTL distinguishes RGB, XYZ and spectral curves without interpreting them as native colors', () => {
  const result = properties(
    'Ka xyz .1\nKd xyz -0 4 -3e-8\nKs spectral metal.rfl\nTf spectral ./curves/red.rfl -2\nKe 2 3 4\nNs 1200\nNi .0001\nsharpness 101\n',
  )
  expect(result.slice(0, 5).map((entry) => entry.value)).toEqual([
    { space: 'xyz', value: [0.1, 0.1, 0.1] },
    { space: 'xyz', value: [-0, 4, -3e-8] },
    { space: 'spectral', filename: 'metal.rfl', factor: 1 },
    { space: 'spectral', filename: './curves/red.rfl', factor: -2 },
    { space: 'rgb', value: [2, 3, 4] },
  ])
  // These are finite source parameters, not approval of ranges or a Phong-to-PBR conversion.
  expect(result.slice(5).map((entry) => entry.value)).toEqual([1200, 0.0001, 101])
  for (let model = 0; model <= 10; model++)
    expect(properties(`illum +${model}\n`)[0]!.value).toBe(model)
  expect(properties('map_aat on\nmap_aat off\n').map((entry) => entry.value)).toEqual([true, false])
})

test('MTL texture options retain order, repeated options, vector arity, finite negatives and exact literal filenames', () => {
  expect(
    texture(
      'map_Kd -o -1 -2.5 -3e2 -s .5 -t -0 2 -mm -2 +3 -clamp on -cc off -blendu off -blendv on -boost 2 -texres 2048 -clamp off folder/azul  claro.png',
    ),
  ).toEqual({
    filename: 'folder/azul  claro.png',
    options: [
      { key: 'o', value: [-1, -2.5, -300] },
      { key: 's', value: [0.5] },
      { key: 't', value: [-0, 2] },
      { key: 'mm', value: [-2, 3] },
      { key: 'clamp', value: true },
      { key: 'cc', value: false },
      { key: 'blendu', value: false },
      { key: 'blendv', value: true },
      { key: 'boost', value: 2 },
      { key: 'texres', value: 2048 },
      { key: 'clamp', value: false },
    ],
  })
  expect(texture('map_Kd image.png')).toEqual({ filename: 'image.png', options: [] })
  expect(texture('map_Kd -s 1 2 3 ./4')).toEqual({
    filename: './4',
    options: [{ key: 's', value: [1, 2, 3] }],
  })
  expect(texture('map_Kd -o 1 ./2').filename).toBe('./2')
  expect(texture('map_Kd ./-o.png').filename).toBe('./-o.png')
  expect(texture('map_Kd -s 1 2 3 4').filename).toBe('4')
  // Options must precede the filename. The tail is literal, not reparsed as more options.
  expect(texture('map_Kd folder/file -s name.png').filename).toBe('folder/file -s name.png')
  for (const path of [
    '../f.png',
    'C:\\maps\\red.png',
    'a%20b.png',
    'https://invalid.example/image.png',
    'proc.cxc',
    'a$(whoami).png',
    'A\t B.png',
  ])
    expect(texture(`map_Kd ${path}`).filename).toBe(path)
})

test('MTL texture kinds and scalar channels stay distinct, including cube sides and extended normal/PBR maps', () => {
  for (const keyword of [
    'map_Ns',
    'map_d',
    'map_Tr',
    'map_Pr',
    'map_Pm',
    'map_Ps',
    'decal',
    'disp',
    'map_disp',
    'map_Disp',
    'bump',
    'map_Bump',
    'map_bump',
  ])
    for (const channel of ['r', 'g', 'b', 'm', 'l', 'z'] as const)
      expect(texture(`${keyword} -imfchan ${channel} input.png`).options).toEqual([
        { key: 'imfchan', value: channel },
      ])
  for (const keyword of ['map_Ka', 'map_Kd', 'map_Ks', 'map_Ke'])
    expect(texture(`${keyword} -cc on color.png`).options).toEqual([{ key: 'cc', value: true }])
  for (const type of [
    'sphere',
    'cube_top',
    'cube_bottom',
    'cube_front',
    'cube_back',
    'cube_left',
    'cube_right',
  ] as const)
    expect(texture(`refl -type ${type} -cc off environment.png`).options).toEqual([
      { key: 'type', value: type },
      { key: 'cc', value: false },
    ])
  for (const keyword of ['bump', 'map_Bump', 'map_bump'])
    expect(properties(`${keyword} -bm -2 height.png\n`)[0]).toMatchObject({
      kind: 'map',
      keyword,
      value: { options: [{ key: 'bm', value: -2 }] },
    })
  expect(properties('norm -colorspace linear normal.png\n')[0]).toMatchObject({
    kind: 'map',
    keyword: 'norm',
    value: { options: [{ key: 'colorspace', value: 'linear' }] },
  })
  expect(texture('map_Kd -colorspace custom-gamut albedo.png').options).toEqual([
    { key: 'colorspace', value: 'custom-gamut' },
  ])
  for (const keyword of ['Pr', 'Pm', 'Ps', 'Pc', 'Pcr', 'aniso', 'anisor', 'Tr'])
    expect(properties(`${keyword} .125\n`)[0]).toMatchObject({
      kind: 'scalar',
      keyword,
      value: 0.125,
    })
})

test('MTL malformed known statements and numbers fail instead of returning partial/default materials', () => {
  for (const line of [
    'Ka',
    'Kd 1 2',
    'Ks 1 2 3 4',
    'Tf xyz',
    'Ka xyz 1 2',
    'Kd spectral',
    'Kd spectral a.rfl 1 2',
    'Ke rgb 1 2 3',
    'Ns',
    'Ns 1 2',
    'd',
    'd -halo',
    'd -halo .2 .3',
    'Tr 0 1',
    'map_aat true',
    'illum -1',
    'illum 1.0',
    'illum 9007199254740992',
    'map_Kd',
    'map_Kd -o',
    'map_Kd -o 1 2',
    'map_Kd -o 1 2 3',
    'map_Kd -s -clamp on a.png',
    'map_Kd -clamp',
    'map_Kd -clamp yes x.png',
    'map_Kd -mm 1 x.png',
    'map_Kd -texres .5 a.png',
    'map_Kd -texres 0 a.png',
    'map_Kd -texres 9007199254740992 a.png',
    'map_Kd -boost -1 a.png',
    'map_d -imfchan alpha a.png',
    'refl a.png',
    'refl -type hemisphere a.png',
  ])
    failure(() => properties(`${line}\n`), 'invalid', 'lines[2]')
  for (const value of ['NaN', 'Infinity', '-Infinity', '0x10', '1e309', '.', '2junk', '1e', '+'])
    for (const line of [
      `Kd ${value}`,
      `Ns ${value}`,
      `d -halo ${value}`,
      `map_Kd -o ${value} a.png`,
      `map_Kd -mm 0 ${value} a.png`,
    ])
      failure(() => properties(`${line}\n`), 'invalid', 'lines[2]')
  failure(() => read('newmtl\n'), 'invalid', 'lines[1].name')
  failure(() => read('Kd 1\nnewmtl Late\n'), 'invalid', 'lines[1]')
})

test('MTL unsupported instructions/options and incompatible roles are explicit; no shell/includes/quote guessing', () => {
  for (const line of [
    'call other.mtl',
    'csh echo unsafe',
    'unknown value',
    'map_unknown file.png',
    'illum 11',
    'map_Kd -mystery 1 a.png',
    'map_Kd -bm 1 a.png',
    'map_Kd -imfchan r a.png',
    'map_d -cc on a.png',
    'norm -bm 1 a.png',
    'norm -imfchan r a.png',
    'map_Kd -type sphere a.png',
    'map_Kd -file.png',
  ])
    failure(() => properties(`${line}\n`), 'unsupported', 'lines[2]')
  for (const line of ['map_Kd "space name.png"', 'Kd spectral "curve.rfl"'])
    failure(() => properties(`${line}\n`), 'unsupported', 'lines[2].filename')
  failure(
    () => read('newmtl First\nKd 1\nnewmtl Second\nnew_unsupported value\n'),
    'unsupported',
    'lines[4]',
  )
})

test('MTL missing colorspace does not consume the next option as a color-space name', () => {
  failure(() => texture('map_Kd -colorspace -clamp on image.png'), 'invalid', 'lines[2]')
})

test('MTL shares bounded UTF-8/line/comment/continuation semantics, preserves selected intervals and owns its values', () => {
  const text =
      '\uFEFF# comentário\r\nnewmtl Azul\rKd 1 \\\r\n# skipped\n 2 \\\n\n 3 # after\nmap_Kd -o .1 \\\n .2 folder/tecido  azul.png\n',
    encoded = bytes(text),
    storage = new Uint8Array(encoded.length + 8)
  storage.fill(255)
  storage.set(encoded, 4)
  const source = readMtlDocument(storage.subarray(4, 4 + encoded.length))
  expect(source.materials[0]!.line).toBe(2)
  expect(source.materials[0]!.properties).toEqual([
    { line: 3, kind: 'color', keyword: 'Kd', value: { space: 'rgb', value: [1, 2, 3] } },
    {
      line: 8,
      kind: 'map',
      keyword: 'map_Kd',
      value: { filename: 'folder/tecido  azul.png', options: [{ key: 'o', value: [0.1, 0.2] }] },
    },
  ])
  expect(storage.subarray(4, 4 + encoded.length)).toEqual(encoded)
  const copied = structuredClone(source)
  const entry = source.materials[0]!.properties[0]!
  if (entry.kind !== 'color' || entry.value.space === 'spectral')
    throw new Error('Expected source RGB')
  entry.value.value[0] = 88
  expect(readMtlDocument(encoded)).toEqual(copied)
  expect(read('# only comment\n')).toEqual({
    materials: [],
    costs: { materials: 0, properties: 0, options: 0 },
  })
  for (const text of ['newmtl X\nKd 1 \\', '# bad\0\n', 'newmtl A\n# bad\x7f\n'])
    failure(() => read(text), 'invalid')
  failure(() => readMtlDocument(new Uint8Array([0xc3, 0x28])), 'invalid', 'file')
  failure(() => readMtlDocument(new Uint8Array(new SharedArrayBuffer(8))), 'unsupported', 'file')
  failure(() => readMtlDocument(new Uint8Array(OBJ_INPUT_LIMITS.fileBytes + 1)), 'budget', 'file')
  failure(() => read(`#${'a'.repeat(OBJ_INPUT_LIMITS.lineChars)}\n`), 'budget', 'lines[1]')
})

test('MTL names, declarations, properties and local/aggregate map options obey exact preflight limits', () => {
  const name = 'a'.repeat(limits.nameChars)
  expect(read(`newmtl ${name}\n`).materials[0]!.name).toBe(name)
  expect(texture(`map_Kd ${name}`).filename).toBe(name)
  failure(() => read(`newmtl ${name}a\n`), 'budget', 'lines[1].name')
  failure(() => texture(`map_Kd ${name}a`), 'budget', 'lines[2].filename')
  failure(() => texture(`map_Kd -colorspace ${name}a a.png`), 'budget', 'lines[2]')
  const manyMaterials = 'newmtl Empty\n'.repeat(limits.materials)
  expect(read(manyMaterials).costs.materials).toBe(limits.materials)
  failure(() => read(`${manyMaterials}newmtl Extra\n`), 'budget', `lines[${limits.materials + 1}]`)
  const manyProperties = `newmtl X\n${'Ns 1\n'.repeat(limits.properties)}`
  expect(read(manyProperties).costs.properties).toBe(limits.properties)
  failure(() => read(`${manyProperties}Kd NaN\n`), 'budget', 'properties')
  const options = '-o 0 '.repeat(limits.optionsPerMap),
    map = `map_Kd ${options}a.png\n`
  expect(texture(map).options.length).toBe(limits.optionsPerMap)
  failure(() => texture(`map_Kd ${options}-unknown a.png`), 'budget', 'lines[2]')
  const manyOptions = `newmtl X\n${map.repeat(limits.options / limits.optionsPerMap)}`
  expect(read(manyOptions).costs.options).toBe(limits.options)
  failure(() => read(`${manyOptions}map_Kd -unknown a.png\n`), 'budget', 'options')
}, 30_000)

test('MTL compatible source color/scalar/map parameters agree with independent Three reader without loading textures', () => {
  const text =
      'newmtl Common\nKa .1 .2 .3\nKd .25 .5 .75\nKs 1 1 1\nKe 2 3 4\nNs 321.5\nNi 1.5\nd .8\nillum 2\nmap_Kd -s 2 3 1 -o .1 .2 0 folder/tex.png\nbump -bm .7 height.png\n',
    source = read(text),
    oracle = new MTLLoader().parse(text, ''),
    info = oracle.materialsInfo.Common!
  for (const property of source.materials[0]!.properties) {
    const key = property.keyword.toLowerCase()
    if (property.kind === 'color' && property.value.space === 'rgb')
      expect(property.value.value).toEqual(Reflect.get(info, key))
    else if (
      property.kind === 'scalar' ||
      property.kind === 'dissolve' ||
      property.kind === 'illumination'
    )
      expect(property.value).toBe(Number(Reflect.get(info, key)))
  }
  const nativeMap = source.materials[0]!.properties.find(
    (entry): entry is MtlProperty & { kind: 'map' } =>
      entry.kind === 'map' && entry.keyword === 'map_Kd',
  )!
  const params = oracle.getTextureParams(String(info.map_kd), {})
  expect(nativeMap.value.filename).toBe(params.url)
  expect(nativeMap.value.options).toEqual([
    { key: 's', value: [params.scale.x, params.scale.y, 1] },
    { key: 'o', value: [params.offset.x, params.offset.y, 0] },
  ])
  expect(Object.keys(oracle.materials).length).toBe(0)
})
