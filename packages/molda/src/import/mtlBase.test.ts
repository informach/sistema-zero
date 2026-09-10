import { expect, test } from 'bun:test'
import { Color, SRGBColorSpace } from 'three'
import { linearUnitToSrgb } from '../core/colorTransfer'
import { planMtlBase } from './mtlBase'
import { readMtlDocument } from './mtlDocument'
import { selectMtlProperties } from './mtlEffectiveProperties'
import { ObjInputError } from './objInput'

const material = (text: string) =>
    readMtlDocument(new TextEncoder().encode(`newmtl Test\n${text}`)).materials[0]!,
  linear = { rgbSpace: 'linear' } as const
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

test('MTL effective properties retain chosen source order, consolidate only aliases, and keep environment statements separate', () => {
  const source = material(
    'Kd .1\nNs 100\nKd .9\nbump first.png\nmap_Bump second.png\nmap_disp first.png\ndisp second.png\nrefl -type cube_top top.png\nrefl -type cube_bottom bottom.png\n',
  )
  failure(() => selectMtlProperties(source), 'unsupported', 'lines[4]')
  const first = selectMtlProperties(source, 'first'),
    last = selectMtlProperties(source, 'last')
  expect(first.indices).toEqual([0, 1, 3, 5, 7, 8])
  expect(last.indices).toEqual([1, 2, 4, 6, 7, 8])
  expect(last.choices).toEqual([
    { slot: 'Kd', first: 0, last: 2, kept: 2, ignored: 1 },
    { slot: 'bump', first: 3, last: 4, kept: 4, ignored: 1 },
    { slot: 'disp', first: 5, last: 6, kept: 6, ignored: 1 },
  ])
  last.indices.fill(0)
  expect(source.properties.length).toBe(9)
})

test('MTL RGB interpretation is explicit, full precision, source-preserving and independent of future texture application', () => {
  const source = material(
      'Kd .123456789123 .5 .75\nd .4\nPr .25\nPm .7\nillum 2\nmap_Kd -o .1 .2 tex.png\n',
    ),
    original = structuredClone(source),
    srgb = planMtlBase(source, { rgbSpace: 'srgb' }),
    decoded = planMtlBase(source, linear),
    three = new Color().setRGB(0.123456789123, 0.5, 0.75, SRGBColorSpace)
  expect(srgb.baseColor).toEqual([0.123456789123, 0.5, 0.75, 0.4])
  // Three's rounded inverse coefficients differ from the exact preserved curve; see colorTransfer.test.
  expect(Math.abs(srgb.linearColor[0] - three.r)).toBeLessThan(1.1e-10)
  expect(Math.abs(srgb.linearColor[1] - three.g)).toBeLessThan(1.1e-10)
  expect(Math.abs(srgb.linearColor[2] - three.b)).toBeLessThan(1.1e-10)
  expect(srgb.linearColor[1]).toBe(0.21404114048223255)
  expect(srgb.linearColor[2]).toBe(0.5225215539683921)
  expect(decoded.baseColor).toEqual([
    linearUnitToSrgb(0.123456789123),
    linearUnitToSrgb(0.5),
    linearUnitToSrgb(0.75),
    0.4,
  ])
  expect(decoded.linearColor).toEqual([0.123456789123, 0.5, 0.75])
  expect(srgb.roughness).toBe(0.25)
  expect(srgb.metalness).toBe(0.7)
  expect(srgb.mapIndices).toEqual([5])
  expect(srgb.issues).toEqual([
    { code: 'rgb-interpreted', line: 2, space: 'srgb' },
    { code: 'illumination-adapted', line: 6, model: 2 },
  ])
  expect(source).toEqual(original)
  srgb.baseColor.fill(0)
  srgb.linearColor.fill(0)
  expect(source).toEqual(original)
  expect(planMtlBase(source, { rgbSpace: 'srgb' }).baseColor[0]).toBe(0.123456789123)
})

test('MTL absent scalar fields have reported assumptions and are not inferred from ambient/specular/refraction', () => {
  const result = planMtlBase(material('Ka .9\nKs .8\nNi 1.5\n'), linear)
  expect(result.baseColor).toEqual([1, 1, 1, 1])
  expect(result.roughness).toBe(1)
  expect(result.metalness).toBe(0)
  expect(
    result.issues.filter((issue) => issue.code === 'default-assumed').map((issue) => issue.field),
  ).toEqual(['diffuse', 'opacity', 'roughness', 'metalness', 'illumination'])
  expect(
    result.issues
      .filter((issue) => issue.code === 'parameter-omitted')
      .map((issue) => issue.keyword),
  ).toEqual(['Ka', 'Ks', 'Ni'])
  expect(planMtlBase(material(''), linear).propertyIndices).toEqual([])
})

test('MTL repeated scalar/colour values require policy, report it, and do not validate discarded values as native inputs', () => {
  const source = material('Kd spectral missing.rfl\nKd .5\nPr -5\nPr .2\n')
  failure(() => planMtlBase(source, linear), 'unsupported', 'lines[3]')
  failure(
    () => planMtlBase(source, { ...linear, repeatedProperties: 'first' }),
    'unsupported',
    'lines[2]',
  )
  const result = planMtlBase(source, { ...linear, repeatedProperties: 'last' })
  expect(result.roughness).toBe(0.2)
  expect(result.propertyIndices).toEqual([1, 3])
  expect(result.issues.slice(0, 2)).toEqual([
    { code: 'property-redeclared', line: 3, slot: 'Kd', ignored: 1 },
    { code: 'property-redeclared', line: 5, slot: 'Pr', ignored: 1 },
  ])
})

test('MTL d/Tr precedence is explicit, halo is not constant opacity, and unsupported ranges are never clamped', () => {
  const source = material('d .2\nTr .1\n')
  failure(() => planMtlBase(source, linear), 'unsupported', 'lines[3]')
  for (const [priority, opacity] of [
    ['d', 0.2],
    ['Tr', 0.9],
  ] as const) {
    const result = planMtlBase(source, { ...linear, opacityConflict: priority })
    expect(result.baseColor[3]).toBe(opacity)
    expect(result.issues.find((issue) => issue.code === 'opacity-priority')).toMatchObject({
      code: 'opacity-priority',
      selected: priority,
    })
  }
  expect(planMtlBase(material('Tr .7\n'), linear).baseColor[3]).toBe(1 - 0.7)
  failure(() => planMtlBase(material('d -halo .4\n'), linear), 'unsupported', 'lines[2]')
  const halo = planMtlBase(material('d -halo .4\nTr .2\n'), { ...linear, opacityConflict: 'Tr' })
  expect(halo.baseColor[3]).toBe(0.8)
  expect(
    halo.issues.some((issue) => issue.code === 'opacity-priority' && issue.omittedLine === 2),
  ).toBe(true)
  for (const text of [
    'Kd -1 0 0',
    'Kd 1 2 1',
    'Pr -1',
    'Pr 2',
    'Pm -1',
    'Pm 2',
    'd -1',
    'd 2',
    'Tr -1',
    'Tr 2',
  ])
    failure(() => planMtlBase(material(`${text}\n`), linear), 'unsupported', 'lines[2]')
  for (const text of ['Kd xyz .4', 'Kd spectral red.rfl'])
    failure(() => planMtlBase(material(`${text}\n`), linear), 'unsupported', 'lines[2]')
})

test('MTL explicit PBR roughness wins and empirical Blender Ns inverse requires opt-in and a valid domain', () => {
  failure(() => planMtlBase(material('Ns 250\n'), linear), 'unsupported', 'lines[2]')
  const result = planMtlBase(material('Ns 250\n'), { ...linear, phongRoughness: 'blender' })
  expect(result.roughness).toBe(0.5)
  expect(result.issues).toContainEqual({
    code: 'phong-roughness-approximated',
    line: 2,
    method: 'blender',
  })
  for (const roughness of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const exponent = (1 - roughness) ** 2 * 1000,
      decoded = planMtlBase(material(`Ns ${exponent}\n`), { ...linear, phongRoughness: 'blender' })
    expect(Math.abs(decoded.roughness - roughness)).toBeLessThan(2e-15)
  }
  for (const value of [-1, 1000.1, 1e308])
    failure(
      () => planMtlBase(material(`Ns ${value}\n`), { ...linear, phongRoughness: 'blender' }),
      'unsupported',
      'lines[2]',
    )
  const explicit = planMtlBase(material('Ns -1\nPr .7\n'), linear)
  expect(explicit.roughness).toBe(0.7)
  expect(explicit.issues).toContainEqual({ code: 'parameter-omitted', line: 2, keyword: 'Ns' })
  expect(explicit.issues.some((issue) => issue.code === 'phong-roughness-approximated')).toBe(false)
})

test('MTL special illumination requires a reported PBR adaptation and remaining physical parameters stay explicit omissions', () => {
  for (let illum = 0; illum <= 10; illum++) {
    const source = material(`illum ${illum}\n`)
    if (illum !== 1 && illum !== 2)
      failure(() => planMtlBase(source, linear), 'unsupported', 'lines[2]')
    expect(planMtlBase(source, { ...linear, illumination: 'pbr' }).issues).toContainEqual({
      code: 'illumination-adapted',
      line: 2,
      model: illum,
    })
  }
  const source = material(
    'Tf xyz 1\nKe 2\nsharpness 999\nPs .5\nPc 1\nPcr .8\naniso .2\nanisor .3\nmap_aat on\n',
  )
  expect(
    planMtlBase(source, linear)
      .issues.filter((issue) => issue.code === 'parameter-omitted')
      .map((issue) => issue.keyword),
  ).toEqual(['Tf', 'Ke', 'sharpness', 'Ps', 'Pc', 'Pcr', 'aniso', 'anisor', 'map_aat'])
})

test('MTL scalar stage retains map indices without interpreting options, paths or sampling UV variants', () => {
  const source = material(
      'Kd .5\nmap_Kd -o 2 3 albedo.png\nbump -bm -3 height.png\nnorm normal.png\nrefl -type sphere env.png\n',
    ),
    guarded = {
      ...source,
      properties: source.properties.map((property) =>
        property.kind === 'map'
          ? {
              ...property,
              get value(): never {
                throw new Error('Read texture options before their stage')
              },
            }
          : property,
      ),
    },
    result = planMtlBase(guarded, linear)
  expect(result.mapIndices).toEqual([1, 2, 3, 4])
  expect(result.baseColor[3]).toBe(1)
  expect(result.issues.some((issue) => issue.code === 'parameter-omitted')).toBe(false)
})

test('MTL appearance options reject unknown/missing/null choices before source properties are touched', () => {
  const source = material(''),
    guarded = {
      ...source,
      get properties(): never {
        throw new Error('Read source before options')
      },
    }
  for (const text of [
    'null',
    '[]',
    '{}',
    '{"rgbSpace":null}',
    '{"rgbSpace":"linear","unknown":true}',
    '{"rgbSpace":"linear","repeatedProperties":null}',
    '{"rgbSpace":"linear","opacityConflict":"guess"}',
    '{"rgbSpace":"srgb","phongRoughness":true}',
    '{"rgbSpace":"srgb","illumination":"auto"}',
  ])
    failure(() => planMtlBase(guarded, JSON.parse(text)), 'invalid')
})
