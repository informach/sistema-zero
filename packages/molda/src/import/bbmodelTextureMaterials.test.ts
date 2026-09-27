import { expect, test } from 'bun:test'
import sharp from 'sharp'
import { DataTexture, DoubleSide, Mesh, MeshStandardMaterial, SRGBColorSpace } from 'three'
import { encodePng } from '../export/png'
import { encodeSceneGlb } from '../export/sceneGlb'
import type { MoldaSceneDocument } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneDocument } from '../scene/readDocument'
import { readGlb, readImage } from '../testing/glbRead'
import { expectValidGlb } from '../testing/gltfValidation'
import { SceneRenderResource } from '../viewport/sceneRenderResource'
import { readBbmodelAppearance } from './bbmodelAppearance'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { convertBbmodelFaceUvs } from './bbmodelFaceUvs'
import { convertBbmodelGeometries } from './bbmodelGeometries'
import { readBbmodelGeometry } from './bbmodelGeometry'
import { readBbmodelGraph } from './bbmodelGraph'
import { convertBbmodelImages } from './bbmodelImages'
import { BBMODEL_INPUT_LIMITS, BbmodelInputError } from './bbmodelInput'
import { planBbmodelNativeGeometry } from './bbmodelNativeGeometryPlan'
import { convertBbmodelNativeUvs } from './bbmodelNativeUvs'
import { readBbmodelNodeMetadata } from './bbmodelNodeMetadata'
import { convertBbmodelPositions } from './bbmodelPositions'
import { decodeBbmodelRasters } from './bbmodelRasters'
import { readBbmodelResources } from './bbmodelResources'
import { planBbmodelSelection } from './bbmodelSelection'
import { bindBbmodelTextures } from './bbmodelTextureBinding'
import { planBbmodelTextureLayouts } from './bbmodelTextureLayouts'
import {
  type BbmodelTextureMaterialOptions,
  materializeBbmodelTextureMaterials,
  planBbmodelTextureMaterials,
  readBbmodelTextureMaterialOptions,
} from './bbmodelTextureMaterials'
import { readBbmodelTransforms } from './bbmodelTransforms'
import { importDocumentBase } from './importDocumentBase'

const topDown = Uint8Array.of(0, 0, 0, 0, 20, 30, 40, 128, 255, 0, 3, 255, 4, 250, 8, 1)
const png = encodePng(topDown, 2, 2)
const adapted = { lighting: 'molda-standard' } as const
function fixture(
  textures: Record<string, unknown>[] = [{}],
  groups: Record<string, unknown>[] = [],
  version: BbmodelVersion = '5.0',
) {
  const bytes = new TextEncoder().encode(
      JSON.stringify({
        meta: { format_version: version, model_format: 'free' },
        resolution: { width: 2, height: 2 },
        textures: textures.map((row, i) => ({
          uuid: `texture-${i}`,
          name: `Pintura ${i}`,
          render_sides: 'front',
          source: `data:image/png;base64,${Buffer.from(png).toString('base64')}`,
          ...row,
        })),
        texture_groups: groups,
        elements: [
          {
            uuid: 'piece',
            type: 'mesh',
            name: 'Peça',
            origin: [0, 0, 0],
            vertices: { a: [0, 0, 0], b: [2, 0, 0], c: [0, 2, 0] },
            faces: {
              face: {
                vertices: ['a', 'b', 'c'],
                texture: 0,
                uv: { a: [0.5, 0.5], b: [1.5, 0.5], c: [0.5, 1.5] },
              },
            },
          },
        ],
        outliner: ['piece'],
      }),
    ),
    envelope = readBbmodelEnvelope(bytes),
    appearance = readBbmodelAppearance(envelope)
  return { bytes, envelope, appearance }
}
function failure(run: () => unknown, reason: BbmodelInputError['reason'], path: string) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(BbmodelInputError)
  expect((error as BbmodelInputError).reason).toBe(reason)
  expect((error as BbmodelInputError).path).toBe(path)
}
function poison(target: object, key: string) {
  Object.defineProperty(target, key, {
    get() {
      throw new Error(`Unexpected read: ${key}`)
    },
  })
}

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s binds actual geometry and bitmap to the native material, renderer and independently decoded GLB', async (version) => {
  const f = fixture([{ render_sides: 'double' }], [], version),
    before = structuredClone(f),
    planned = planBbmodelTextureMaterials(f.appearance, [0], adapted)
  expect(planned.issues).toEqual([
    {
      code: 'texture-lighting-adapted',
      texture: 0,
      path: 'textures[0]',
      targetId: 'bbmodel_material_0',
    },
  ])
  const graph = readBbmodelGraph(f.envelope),
    metadata = readBbmodelNodeMetadata(f.envelope, graph),
    source = readBbmodelGeometry(graph),
    selection = planBbmodelSelection(f.envelope, graph),
    plans = planBbmodelNativeGeometry(source, selection).plans,
    transforms = readBbmodelTransforms(graph, selection),
    positions = convertBbmodelPositions(source, plans, transforms).geometries,
    authorial = convertBbmodelFaceUvs(source, plans, f.appearance).geometries,
    uvs = convertBbmodelNativeUvs(
      source,
      plans,
      authorial,
      bindBbmodelTextures(source, f.appearance),
      f.appearance,
    ).geometries,
    resources = readBbmodelResources({
      bytes: f.bytes,
      entryPath: 'model.bbmodel',
      version,
      appearance: f.appearance,
      textureIndices: [0],
      files: [],
      sourcePreference: 'prefer-embedded',
    })
  if (resources.status !== 'ready') throw new Error('Embedded fixture expected')
  const decoded = decodeBbmodelRasters(resources),
    layout = planBbmodelTextureLayouts(f.appearance, decoded, [0]),
    images = convertBbmodelImages(f.appearance, decoded, layout.textures),
    materials = materializeBbmodelTextureMaterials(planned.materials, images.byTexture),
    geometry = convertBbmodelGeometries(plans, positions, uvs, materials.byTexture),
    document: MoldaSceneDocument = {
      ...importDocumentBase({
        id: 'texture-material',
        name: 'Pintura',
        createdAt: 1,
        updatedAt: 2,
      }),
      images: images.images,
      materials: materials.materials,
      geometries: geometry.geometries,
      nodes: [
        {
          id: 'piece',
          name: 'Peça',
          parentId: null,
          kind: 'mesh',
          geometryId: plans[0]!.geometryId,
          materialId: materials.byTexture.get(0)!,
          transform: transforms.get(0)!.local,
          hidden: false,
          locked: false,
        },
      ],
    }
  expect(metadata[0]!.kind).toBe('mesh')
  expect(readSceneDocument(document).status).toBe('valid')
  expect(document.materials[0]).toEqual({
    id: 'bbmodel_material_0',
    name: 'Pintura 0',
    doubleSided: true,
    baseColor: { kind: 'rgba', value: [0, 0, 0, 0] },
    colorImageId: 'bbmodel_image_0',
    roughness: 1,
    metalness: 0,
  })
  const documentBefore = structuredClone(document),
    resource = new SceneRenderResource()
  try {
    resource.update(document)
    const mesh = resource.root.children.find((row) => row instanceof Mesh)
    if (!(mesh instanceof Mesh)) throw new Error('Native draw mesh expected')
    const material = (Array.isArray(mesh.material) ? mesh.material : [mesh.material])[0]
    if (!(material instanceof MeshStandardMaterial) || !(material.map instanceof DataTexture))
      throw new Error('Native painted material expected')
    expect(material.side).toBe(DoubleSide)
    expect(material.transparent).toBe(true)
    expect(material.depthWrite).toBe(false)
    expect(material.alphaTest).toBe(0)
    expect(material.map.colorSpace).toBe(SRGBColorSpace)
    expect(material.map.flipY).toBe(false)
    const pixels = material.map.image.data
    if (!(pixels instanceof Uint8Array)) throw new Error('Native RGBA8 texture expected')
    expect(pixels).toEqual(Uint8Array.of(255, 0, 3, 255, 4, 250, 8, 1, 0, 0, 0, 0, 20, 30, 40, 128))
  } finally {
    resource.dispose()
  }
  const glbBytes = encodeSceneGlb(document).bytes
  await expectValidGlb(glbBytes)
  const glb = readGlb(glbBytes),
    image = await sharp(readImage(glb, 0)).ensureAlpha().raw().toBuffer()
  expect(new Uint8Array(image)).toEqual(topDown)
  expect((glb.json.materials as Array<{ alphaMode: string }>)[0]!.alphaMode).toBe('BLEND')
  expect(document).toEqual(documentBefore)
  expect(f).toEqual(before)
})

test('bbmodel texture lighting, auto-sidedness and repeat wrapping require separate explicit choices', () => {
  const { appearance } = fixture([{ render_sides: 'auto', wrap_mode: 'repeat' }])
  failure(() => planBbmodelTextureMaterials(appearance, [0]), 'unsupported', 'options.lighting')
  failure(
    () => planBbmodelTextureMaterials(appearance, [0], adapted),
    'unsupported',
    'textures[0].wrap_mode',
  )
  failure(
    () => planBbmodelTextureMaterials(appearance, [0], { ...adapted, repeatWrap: 'clamp' }),
    'unsupported',
    'textures[0].render_sides',
  )
  for (const autoSides of ['front', 'double'] as const) {
    const plan = planBbmodelTextureMaterials(appearance, [0], {
      ...adapted,
      autoSides,
      repeatWrap: 'clamp',
    })
    expect(plan.materials[0]!.doubleSided).toBe(autoSides === 'double')
    expect(plan.issues.map((issue) => issue.code)).toEqual([
      'texture-lighting-adapted',
      'texture-repeat-clamped',
      'texture-sidedness-assumed',
    ])
    expect(plan.issues[2]).toEqual({
      code: 'texture-sidedness-assumed',
      texture: 0,
      path: 'textures[0].render_sides',
      targetId: 'bbmodel_material_0',
      doubleSided: autoSides === 'double',
    })
  }
})

test('bbmodel authored sidedness overrides the session choice and limited/clamp keep native clamping', () => {
  for (const render_sides of ['front', 'double'])
    for (const wrap_mode of [undefined, 'limited', 'clamp']) {
      const { appearance } = fixture([{ render_sides, wrap_mode }]),
        plan = planBbmodelTextureMaterials(appearance, [0], {
          ...adapted,
          autoSides: render_sides === 'front' ? 'double' : 'front',
        })
      expect(plan.materials[0]!.doubleSided).toBe(render_sides === 'double')
      expect(plan.issues.map((issue) => issue.code)).toEqual(['texture-lighting-adapted'])
    }
})

test('bbmodel special texture rendering is never silently flattened and unknown modes remain unsupported', () => {
  for (const render_mode of ['emissive', 'additive', 'layered'] as const) {
    const { appearance } = fixture([{ render_mode }])
    failure(
      () => planBbmodelTextureMaterials(appearance, [0], adapted),
      'unsupported',
      'textures[0].render_mode',
    )
    const plan = planBbmodelTextureMaterials(appearance, [0], {
      ...adapted,
      renderModes: 'standard',
    })
    expect(plan.issues[1]).toEqual({
      code: 'texture-render-mode-adapted',
      texture: 0,
      path: 'textures[0].render_mode',
      targetId: 'bbmodel_material_0',
      source: render_mode,
    })
  }
  for (const field of ['render_mode', 'render_sides', 'wrap_mode', 'pbr_channel']) {
    const { appearance } = fixture([{ [field]: 'plugin-mode' }])
    failure(
      () =>
        planBbmodelTextureMaterials(appearance, [0], {
          ...adapted,
          renderModes: 'standard',
          repeatWrap: 'clamp',
          pbrGroups: 'texture-only',
          autoSides: 'double',
        }),
      'unsupported',
      `textures[0].${field}`,
    )
  }
})

test('bbmodel PBR groups need a texture-only choice and data maps are not mislabeled as native normal/roughness maps', () => {
  for (const pbr_channel of ['color', 'normal', 'height', 'mer'] as const) {
    const { appearance } = fixture(
      [{ group: 'material', pbr_channel }],
      [
        {
          uuid: 'material',
          is_material: true,
          material_config: { expression: 'never()' },
        },
      ],
    )
    poison(appearance.groups[0]!, 'materialConfig')
    failure(
      () => planBbmodelTextureMaterials(appearance, [0], adapted),
      'unsupported',
      'textures[0].group',
    )
    const plan = planBbmodelTextureMaterials(appearance, [0], {
        ...adapted,
        pbrGroups: 'texture-only',
      }),
      material = materializeBbmodelTextureMaterials(plan.materials, new Map([[0, 'image']]))
        .materials[0]!
    expect(plan.issues[1]).toEqual({
      code: 'pbr-group-texture-only',
      texture: 0,
      path: 'textures[0].group',
      targetId: 'bbmodel_material_0',
      group: 0,
    })
    expect(plan.issues.filter((issue) => issue.code === 'pbr-channel-used-as-color')).toEqual(
      pbr_channel === 'color'
        ? []
        : [
            {
              code: 'pbr-channel-used-as-color',
              texture: 0,
              path: 'textures[0].pbr_channel',
              targetId: 'bbmodel_material_0',
              source: pbr_channel,
            },
          ],
    )
    expect(material.colorImageId).toBe('image')
    expect(Object.hasOwn(material, 'normalImageId')).toBe(false)
    expect(Object.hasOwn(material, 'roughnessImageId')).toBe(false)
    expect(Object.hasOwn(material, 'metalnessImageId')).toBe(false)
  }
  const { appearance } = fixture([{ group: 'folder', pbr_channel: 'normal' }], [{ uuid: 'folder' }])
  poison(appearance.groups[0]!, 'materialConfig')
  const plan = planBbmodelTextureMaterials(appearance, [0], adapted)
  expect(plan.issues.map((issue) => issue.code)).toEqual([
    'texture-lighting-adapted',
    'pbr-channel-used-as-color',
  ])
})

test('bbmodel texture material selection is ordered, deduplicated and metadata-only with owned native materials', () => {
  const { appearance } = fixture([
    { render_mode: 'plugin' },
    { name: '' },
    { name: '   ' },
    { name: `${'a'.repeat(127)}🎨tail` },
    { name: 'e\u0301' },
  ])
  for (const texture of appearance.textures)
    for (const key of [
      'embedded',
      'relativePath',
      'layers',
      'source',
      'width',
      'height',
      'uvWidth',
      'uvHeight',
      'fps',
    ])
      poison(texture, key)
  const planned = planBbmodelTextureMaterials(appearance, [3, 1, 4, 2, 3, 1], adapted),
    before = structuredClone(planned),
    links = new Map([
      [3, 'image3'],
      [1, 'image1'],
      [4, 'image4'],
      [2, 'image2'],
    ]),
    result = materializeBbmodelTextureMaterials(planned.materials, links)
  expect(planned.materials.map((row) => [row.texture, row.name])).toEqual([
    [3, 'a'.repeat(127)],
    [1, 'Material 2'],
    [4, 'e\u0301'],
    [2, '   '],
  ])
  expect(
    planned.issues
      .filter((issue) => issue.code.startsWith('name-'))
      .map((issue) => [issue.code, issue.path]),
  ).toEqual([
    ['name-shortened', 'textures[3].name'],
    ['name-generated', 'textures[1].name'],
  ])
  expect([...result.byTexture]).toEqual([
    [3, 'bbmodel_material_3'],
    [1, 'bbmodel_material_1'],
    [4, 'bbmodel_material_4'],
    [2, 'bbmodel_material_2'],
  ])
  expect(result.materials.map((row) => row.colorImageId)).toEqual([
    'image3',
    'image1',
    'image4',
    'image2',
  ])
  result.materials[0]!.name = 'Edited'
  const base = result.materials[0]!.baseColor
  if (base.kind !== 'rgba') throw new Error('RGBA expected')
  base.value[0] = 1
  expect(result.materials[1]!.baseColor).toEqual({ kind: 'rgba', value: [0, 0, 0, 0] })
  expect(planned).toEqual(before)
  links.delete(2)
  expect(() => materializeBbmodelTextureMaterials(planned.materials, links)).toThrow(
    'Missing bbmodel converted texture image',
  )
})

test('bbmodel texture material budgets precede descriptor access and preserve the exact material-plan limit', () => {
  const { appearance } = fixture(Array.from({ length: SCENE_LIMITS.materials }, () => ({}))),
    indices = appearance.textures.map((_, i) => i),
    planned = planBbmodelTextureMaterials(appearance, indices, adapted)
  expect(planned.materials).toHaveLength(SCENE_LIMITS.materials)
  expect(planned.materials.at(-1)!.texture).toBe(SCENE_LIMITS.materials - 1)
  poison(appearance.textures, '0')
  failure(
    () => planBbmodelTextureMaterials(appearance, [...indices, indices.length], adapted),
    'budget',
    'textures',
  )
  failure(
    () =>
      planBbmodelTextureMaterials(
        appearance,
        Array(BBMODEL_INPUT_LIMITS.textures + 1).fill(0),
        adapted,
      ),
    'budget',
    'textures',
  )
  failure(
    () =>
      materializeBbmodelTextureMaterials([...planned.materials, planned.materials[0]!], new Map()),
    'budget',
    'textures',
  )
})

test('bbmodel texture material choices and selection indices are strict; unknown formats are not guessed', () => {
  expect(readBbmodelTextureMaterialOptions({})).toEqual({
    lighting: 'reject',
    autoSides: 'reject',
    repeatWrap: 'reject',
    renderModes: 'reject',
    pbrGroups: 'reject',
  })
  for (const value of [null, [], 'standard', true]) {
    failure(
      () => readBbmodelTextureMaterialOptions(value as BbmodelTextureMaterialOptions),
      'invalid',
      'options',
    )
  }
  for (const key of ['lighting', 'autoSides', 'repeatWrap', 'renderModes', 'pbrGroups']) {
    for (const value of [null, true, 'unknown']) {
      failure(
        () => readBbmodelTextureMaterialOptions({ [key]: value }),
        'invalid',
        `options.${key}`,
      )
    }
  }
  failure(
    () => readBbmodelTextureMaterialOptions({ unexpected: true } as BbmodelTextureMaterialOptions),
    'invalid',
    'options.unexpected',
  )
  const { appearance } = fixture()
  for (const index of [-1, 0.5, NaN, Infinity, 1])
    failure(() => planBbmodelTextureMaterials(appearance, [index], adapted), 'invalid', 'textures')
  appearance.modelFormat = 'plugin'
  failure(
    () => planBbmodelTextureMaterials(appearance, [0], adapted),
    'unsupported',
    'meta.model_format',
  )
  appearance.modelFormat = 'free'
  poison(appearance.textures, '0')
  expect(planBbmodelTextureMaterials(appearance, [])).toEqual({ materials: [], issues: [] })
})
