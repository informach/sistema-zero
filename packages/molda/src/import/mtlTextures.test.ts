import { expect, test } from 'bun:test'
import { Texture, Vector2 } from 'three'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { planMtlBase } from './mtlBase'
import { readMtlDocument } from './mtlDocument'
import type { MtlTexturePolicy } from './mtlTexturePlanTypes'
import { planMtlTextures } from './mtlTextures'
import { ObjInputError } from './objInput'
import { objNativeUv } from './objUvTransform'

const policy = { colorSpace: 'srgb', scalarSpace: 'linear' } as const,
  material = (text: string) =>
    readMtlDocument(new TextEncoder().encode(`newmtl Test\n${text}`)).materials[0]!,
  base = (source: ReturnType<typeof material>) =>
    planMtlBase(source, { rgbSpace: 'linear', repeatedProperties: 'last' }),
  plan = (text: string, options: Partial<MtlTexturePolicy> = {}, useUv = true) => {
    const source = material(text)
    return planMtlTextures(source, base(source), useUv, { ...policy, ...options })
  }
function failure(
  run: () => unknown,
  path?: string,
  reason: ObjInputError['reason'] = 'unsupported',
) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ObjInputError)
    if (!(error instanceof ObjInputError)) throw error
    expect(error.reason).toBe(reason)
    if (path) expect(error.path).toBe(path)
    return
  }
  throw new Error('Expected failure')
}

test('MTL selected surface maps have separate roles, channel/color contracts, owned plans and reported sampler adaptations', () => {
  const source = material(
      'map_Kd color%20 name.png\nmap_d -imfchan m alpha.png\nmap_Pr -imfchan g rough.png\nmap_Pm -imfchan b metal.png\nnorm normal.png\n',
    ),
    original = structuredClone(source),
    result = planMtlTextures(source, base(source), true, policy)
  expect(result.maps.map((map) => [map.property, map.role, map.sample])).toEqual([
    [0, 'color', { kind: 'color', rgbSpace: 'srgb' }],
    [1, 'opacity', { kind: 'scalar', channel: 'm', rgbSpace: 'linear', invert: false }],
    [2, 'roughness', { kind: 'scalar', channel: 'g', rgbSpace: 'linear', invert: false }],
    [3, 'metalness', { kind: 'scalar', channel: 'b', rgbSpace: 'linear', invert: false }],
    [4, 'normal', { kind: 'normal', strength: 1 }],
  ])
  expect(result.maps[0]!.filename).toBe('color%20 name.png')
  expect(result.uv).toEqual({ offset: [0, 0], scale: [1, 1] })
  expect(result.issues.filter((issue) => issue.code === 'sampler-wrap-clamp')).toEqual(
    result.maps.map((map) => ({
      code: 'sampler-wrap-clamp',
      property: map.property,
      line: map.line,
      source: 'repeat',
    })),
  )
  expect(result.issues.filter((issue) => issue.code === 'sampler-filter-nearest').length).toBe(5)
  result.uv!.scale[0] = 10
  result.maps[0]!.uv.scale[0] = 20
  result.maps[1]!.range[0] = 0.2
  expect(result.maps[1]!.uv.scale).toEqual([1, 1])
  expect(source).toEqual(original)
  expect(planMtlTextures(source, base(source), true, policy).maps[1]!.range).toEqual([0, 1])
})

test('MTL no-UV variants omit only surface maps without reading settings, while environment maps require their own omission choice', () => {
  const source = material(
      'map_Kd -t 1 broken.png\nbump -imfchan z height.png\nrefl -type sphere environment.png\n',
    ),
    scalar = base(source)
  for (const property of source.properties)
    Object.defineProperty(property, 'value', {
      get() {
        throw new Error('Must not inspect omitted settings')
      },
    })
  failure(() => planMtlTextures(source, scalar, false, policy), 'lines[4]')
  const result = planMtlTextures(source, scalar, false, { ...policy, unsupportedMaps: 'omit' })
  expect(result.maps).toEqual([])
  expect(result.uv).toBeNull()
  expect(result.issues).toEqual([
    { code: 'map-omitted', property: 0, line: 2, keyword: 'map_Kd', reason: 'no-uv' },
    { code: 'map-omitted', property: 1, line: 3, keyword: 'bump', reason: 'no-uv' },
    { code: 'map-omitted', property: 2, line: 4, keyword: 'refl', reason: 'unsupported-role' },
  ])
  for (const keyword of [
    'map_Ka',
    'map_Ks',
    'map_Ps',
    'map_Ke',
    'decal',
    'disp',
    'map_disp',
    'map_Disp',
  ]) {
    failure(() => plan(`${keyword} x.png`), 'lines[2]')
    expect(plan(`${keyword} -t 1 x.png`, { unsupportedMaps: 'omit' }).issues[0]).toMatchObject({
      reason: 'unsupported-role',
    })
  }
})

test('MTL effective properties and conflicts between map roles are separate, and discarded map settings are not evaluated', () => {
  expect(plan('map_Kd -cc on first.png\nmap_Kd second.png').maps[0]!.filename).toBe('second.png')
  failure(() => plan('map_d a.png\nmap_Tr b.png'), 'lines[3]')
  expect(plan('map_d a.png\nmap_Tr -t 1 b.png', { roleConflicts: 'first' }).maps[0]!.keyword).toBe(
    'map_d',
  )
  const last = plan('map_Ns -t 1 a.png\nmap_Kd c.png\nmap_Pr b.png', { roleConflicts: 'last' })
  expect(last.maps.map((map) => map.keyword)).toEqual(['map_Kd', 'map_Pr'])
  expect(last.issues[0]).toMatchObject({
    code: 'map-omitted',
    property: 0,
    reason: 'role-conflict',
  })
  failure(() => plan('norm a.png\nbump b.png'))
  expect(plan('norm a.png\nbump -t 1 b.png', { roleConflicts: 'first' }).maps[0]!.keyword).toBe(
    'norm',
  )
  expect(plan('bump -t 1 b.png\nnorm a.png', { roleConflicts: 'last' }).maps[0]!.keyword).toBe(
    'norm',
  )
})

test('MTL normal and specular names with exporter-dependent meaning require explicit interpretation', () => {
  for (const keyword of ['bump', 'map_Bump', 'map_bump']) {
    failure(() => plan(`${keyword} n.png`), 'lines[2]')
    const result = plan(`${keyword} -bm 4 n.png`, { bump: 'normal' })
    expect(result.maps[0]!.sample).toEqual({ kind: 'normal', strength: 4 })
    expect(result.issues[0]).toMatchObject({ code: 'map-interpreted', as: 'normal' })
    failure(() => plan(`${keyword} -bm -1 n.png`, { bump: 'normal' }))
    failure(() => plan(`${keyword} -bm 4.0001 n.png`, { bump: 'normal' }))
    failure(() => plan(`${keyword} -imfchan r n.png`, { bump: 'normal' }))
  }
  failure(() => plan('map_Ns r.png'))
  expect(plan('map_Ns r.png', { specularMap: 'roughness' }).issues[0]).toMatchObject({
    code: 'map-interpreted',
    as: 'roughness',
  })
  failure(() => plan('map_Tr a.png'))
  for (const interpretation of ['opacity', 'transparency'] as const) {
    const result = plan('map_Tr a.png', { transparencyMap: interpretation })
    expect(result.maps[0]!.sample).toEqual({
      kind: 'scalar',
      channel: 'l',
      rgbSpace: 'linear',
      invert: interpretation === 'transparency',
    })
    expect(result.issues[0]).toMatchObject({ code: 'map-interpreted', as: interpretation })
  }
})

test('MTL repeated options require a policy and preserve only the chosen full vector, not merged components', () => {
  failure(() => plan('map_Kd -o .1 .2 .3 -o .4 a.png'))
  const first = plan('map_Kd -o .1 .2 .3 -o .4 a.png', { repeatedOptions: 'first' }),
    last = plan('map_Kd -o .1 .2 .3 -o .4 a.png', { repeatedOptions: 'last' })
  expect(first.uv!.offset).toEqual([0.1, 0.2])
  expect(last.uv!.offset).toEqual([0.4, 0])
  expect(last.issues.filter((issue) => issue.code === 'option-redeclared')).toEqual([
    { code: 'option-redeclared', property: 0, line: 2, key: 'o', ignored: 1 },
  ])
  expect(last.issues.some((issue) => issue.code === 'third-texture-axis-omitted')).toBe(false)
  expect(first.issues.some((issue) => issue.code === 'third-texture-axis-omitted')).toBe(true)
  expect(plan('map_Kd -cc on -cc off a.png', { repeatedOptions: 'last' }).maps.length).toBe(1)
  failure(() => plan('map_Kd -cc on -cc off a.png', { repeatedOptions: 'first' }))
  expect(plan('map_Kd -s 2 a.png').uv!.scale).toEqual([2, 1])
})

test('MTL preserves color/data/matte distinctions and documents the luminance interpretation', () => {
  for (const channel of ['r', 'g', 'b', 'l', 'm'] as const) {
    const result = plan(`map_d -imfchan ${channel} -colorspace sRGB a.png`)
    expect(result.maps[0]!.sample).toEqual({
      kind: 'scalar',
      channel,
      rgbSpace: channel === 'm' ? 'linear' : 'srgb',
      invert: false,
    })
    expect(result.issues.some((issue) => issue.code === 'luminance-rec709')).toBe(channel === 'l')
  }
  const defaultChannel = plan('map_Pm m.png', { scalarSpace: 'srgb' })
  expect(defaultChannel.maps[0]!.sample).toEqual({
    kind: 'scalar',
    channel: 'l',
    rgbSpace: 'srgb',
    invert: false,
  })
  expect(plan('map_Kd -colorspace linear a.png').maps[0]!.sample).toEqual({
    kind: 'color',
    rgbSpace: 'linear',
  })
  failure(() => plan('map_Kd -colorspace ACEScg a.png'))
  failure(() => plan('map_d -imfchan z a.png'))
  failure(() => plan('norm -colorspace srgb a.png'))
  expect(plan('norm -colorspace linear a.png').maps[0]!.sample).toEqual({
    kind: 'normal',
    strength: 1,
  })
})

test('MTL range checks preserve inversion without silent clipping, and procedural/correction options are not approximated', () => {
  for (const range of [
    [0, 1],
    [1, -1],
    [0.2, 0.5],
    [0.2, -0.2],
    [1, 0],
    [0, 0],
  ] as const)
    expect(plan(`map_Kd -mm ${range.join(' ')} a.png`).maps[0]!.range).toEqual([range[0], range[1]])
  for (const range of ['-.1 1', '0 1.1', '1.1 0', '.1 -.2', '1e308 1e308'])
    failure(() => plan(`map_Kd -mm ${range} a.png`))
  failure(() => plan('norm -mm 1 -1 a.png'))
  failure(() => plan('norm -s 0 1 a.png'))
  expect(plan('map_Kd -s 0 1 a.png').uv!.scale).toEqual([0, 1])
  for (const value of ['1', '-1', '0 0 1']) failure(() => plan(`map_Kd -t ${value} a.png`))
  expect(plan('map_Kd -t 0 0 0 a.png').maps.length).toBe(1)
  failure(() => plan('map_Kd -cc on a.png'))
  const result = plan('map_Kd -cc off -clamp on -blendu off -blendv off -boost 2 -texres 32 a.png')
  expect(
    result.issues.filter((issue) => issue.code === 'option-omitted').map((issue) => issue.key),
  ).toEqual(['boost', 'texres'])
  expect(result.issues.find((issue) => issue.code === 'sampler-wrap-clamp')).toMatchObject({
    source: 'underlying-material',
  })
  expect(result.issues.find((issue) => issue.code === 'sampler-filter-nearest')).toMatchObject({
    blendu: false,
    blendv: false,
  })
})

test('MTL UV transform is shared across retained maps and keeps upward native V, verified against Three without texture loading', () => {
  const specification = '-s 2 3 1 -o .2 .1 0 pixels.png',
    result = plan(`map_Kd ${specification}\nmap_d ${specification}`),
    independent = new MTLLoader().parse('newmtl Test\n', '').getTextureParams(specification, {}),
    texture = new Texture()
  expect(result.uv).toEqual({
    offset: independent.offset.toArray(),
    scale: independent.scale.toArray(),
  })
  texture.offset.copy(independent.offset)
  texture.repeat.copy(independent.scale)
  // Native DataTexture pixels are already bottom-up; the CPU UV oracle must not flip them again.
  texture.flipY = false
  texture.updateMatrix()
  for (const [u, v] of [
    [0.1, 0.1],
    [0.15, 0.2],
    [0, 0],
  ] as const) {
    const three = texture.transformUv(new Vector2(u, v))
    expect(objNativeUv(u, v, result.uv!)).toEqual(three.toArray())
  }
  texture.dispose()
  expect(objNativeUv(2, -1, result.uv!)).toEqual([4.2, -2.9])
  expect(objNativeUv(0.123456789123, 0.25, { offset: [0, 0], scale: [1, 1] })).toEqual([
    0.123456789123, 0.25,
  ])
  failure(() => objNativeUv(1e308, 1, { offset: [0, 0], scale: [2, 1] }), 'uv')
  failure(() => plan('map_Kd -o .1 a.png\nmap_Pr -o .2 b.png'), 'lines[3]')
  failure(() => plan('map_Kd a.png\nnorm -s -1 1 b.png'), 'lines[3]')
  expect(plan('map_Kd -s 1 1 10 a.png\nmap_Pr -s 1 1 -8 b.png').maps.length).toBe(2)
})

test('MTL texture policy is strict before source metadata or values are inspected', () => {
  const source = material('map_Kd a.png'),
    scalar = base(source)
  Object.defineProperty(source, 'properties', {
    get() {
      throw new Error('Must reject options first')
    },
  })
  for (const value of [
    null,
    [],
    {},
    { ...policy, colorSpace: null },
    { ...policy, scalarSpace: 'raw' },
    { ...policy, unknown: true },
    ...[
      'repeatedOptions',
      'roleConflicts',
      'unsupportedMaps',
      'bump',
      'specularMap',
      'transparencyMap',
    ].map((key) => ({ ...policy, [key]: null })),
  ])
    failure(
      () => planMtlTextures(source, scalar, true, JSON.parse(JSON.stringify(value))),
      undefined,
      'invalid',
    )
  failure(
    () => planMtlTextures(source, scalar, JSON.parse('null'), policy),
    'useUvTextures',
    'invalid',
  )
})

test('MTL texture plans use source indices without sparse arrays or cached settings across calls', () => {
  const source = material(`${'map_Kd old.png\n'.repeat(65_535)}map_Kd -o .25 final.png`),
    scalar = base(source),
    result = planMtlTextures(source, scalar, true, policy)
  expect(result.maps.length).toBe(1)
  expect(result.maps[0]!.property).toBe(65_535)
  expect(result.maps[0]!.filename).toBe('final.png')
  expect(result.uv!.offset).toEqual([0.25, 0])
  const sourceMap = source.properties[65_535]!
  if (sourceMap.kind !== 'map') throw new Error('Fixture map missing')
  sourceMap.value.options = [{ key: 'o', value: [0.75] }]
  expect(planMtlTextures(source, scalar, true, policy).uv!.offset).toEqual([0.75, 0])
  expect(result.uv!.offset).toEqual([0.25, 0])
})
