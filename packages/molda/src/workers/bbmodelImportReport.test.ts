import { expect, test } from 'bun:test'
import {
  type BbmodelConversionIssue,
  type BbmodelConversionReport,
  collectBbmodelConversionReport,
} from '../import/bbmodelConversionReport'
import { BBMODEL_INPUT_LIMITS } from '../import/bbmodelInput'
import { BBMODEL_REPORT_LIMITS } from '../import/bbmodelReportLimits'
import { bbmodelImportFixture, directBbmodelImport } from '../testing/bbmodelImportFixture'
import { readBbmodelImportReport } from './bbmodelImportReport'

type Stage = BbmodelConversionIssue['stage']
type Detail<S extends Stage> = Extract<BbmodelConversionIssue, { stage: S }>['detail']
type Catalog = { [S in Stage]: Record<Detail<S>['code'], Detail<S>> }

const node = { node: 1, path: 'elements[1]', count: 1 },
  cube = { node: 0, path: 'elements[0]', count: 1 },
  hierarchy = { node: 0, path: 'elements[0]', nodeId: 'bbmodel_node_0' },
  group = { node: 3, path: 'groups[0]', nodeId: 'bbmodel_node_3' },
  nodeMaterial = { node: 0, path: 'elements[0]', targetId: 'bbmodel_node_material_0' },
  texture = { texture: 0, path: 'textures[0]' },
  textureMaterial = { ...texture, targetId: 'bbmodel_material_0' },
  image = { ...texture, targetId: 'bbmodel_image_0' }

// Independent wire examples: completeness is checked against every producer stage/code.
// These test transport contracts, not whether fabricated diagnostics occurred in the source.
const catalog = {
  selection: {
    'unlisted-nodes-appended': { code: 'unlisted-nodes-appended', path: 'outliner', count: 1 },
    'unlisted-nodes-omitted': { code: 'unlisted-nodes-omitted', path: 'outliner', count: 1 },
    'unsupported-subtree-omitted': {
      code: 'unsupported-subtree-omitted',
      path: 'elements[2]',
      node: 2,
      type: 'plugin',
      reason: 'element-type',
      count: 1,
    },
  },
  remainder: {
    'unmapped-field-discarded': { code: 'unmapped-field-discarded', path: 'json["extra"]' },
    'animations-omitted': { code: 'animations-omitted', path: 'animations', count: 1 },
    'animation-controllers-omitted': {
      code: 'animation-controllers-omitted',
      path: 'animation_controllers',
      count: 1,
    },
  },
  topology: {
    'disabled-faces': { ...node, code: 'disabled-faces' },
    'construction-faces': { ...node, code: 'construction-faces' },
    'duplicate-construction-edges': { ...node, code: 'duplicate-construction-edges' },
    'unsupported-faces-omitted': { ...node, code: 'unsupported-faces-omitted' },
    'quads-to-source-triangles': { ...node, code: 'quads-to-source-triangles' },
    'editable-quad-adaptation': { ...node, code: 'editable-quad-adaptation' },
  },
  positions: {
    'zero-cube-extents': { ...cube, code: 'zero-cube-extents' },
    'inverted-cube-extents': { ...cube, code: 'inverted-cube-extents' },
    'sub-float32-local-points': { ...node, code: 'sub-float32-local-points' },
    'sub-float32-world-points': { ...node, code: 'sub-float32-world-points' },
  },
  'authorial-uv': {
    'box-uv-materialized': { ...cube, code: 'box-uv-materialized' },
    'missing-mesh-uv-filled': { ...node, code: 'missing-mesh-uv-filled' },
    'surplus-mesh-uv-omitted': { ...node, code: 'surplus-mesh-uv-omitted' },
  },
  'normalized-uv': {
    'outside-frame-uv': { ...node, code: 'outside-frame-uv' },
    'uv-arithmetic-collapse': { ...node, code: 'uv-arithmetic-collapse' },
    'sub-float32-uv': { ...node, code: 'sub-float32-uv' },
  },
  surfaces: {
    'native-flat-normals': { ...node, code: 'native-flat-normals', source: 'smooth' },
    'render-order-discarded': {
      node: 1,
      path: node.path,
      code: 'render-order-discarded',
      source: 'behind',
    },
    'seam-labels-discarded': { ...node, code: 'seam-labels-discarded' },
    'cube-shade-discarded': {
      node: 0,
      path: cube.path,
      code: 'cube-shade-discarded',
      source: false,
    },
    'outside-frame-uv-clamped': { ...node, code: 'outside-frame-uv-clamped' },
  },
  'node-materials': {
    'name-generated': { ...nodeMaterial, code: 'name-generated' },
    'name-shortened': { ...nodeMaterial, code: 'name-shortened' },
    'untextured-appearance-adapted': {
      ...nodeMaterial,
      code: 'untextured-appearance-adapted',
      count: 1,
      markerColor: -0,
      color: [0.5, 0.25, 0.75, 1],
      doubleSided: true,
    },
  },
  'texture-materials': {
    'texture-lighting-adapted': { ...textureMaterial, code: 'texture-lighting-adapted' },
    'name-generated': { ...textureMaterial, code: 'name-generated' },
    'name-shortened': { ...textureMaterial, code: 'name-shortened' },
    'texture-sidedness-assumed': {
      ...textureMaterial,
      code: 'texture-sidedness-assumed',
      doubleSided: true,
    },
    'texture-repeat-clamped': { ...textureMaterial, code: 'texture-repeat-clamped' },
    'texture-render-mode-adapted': {
      ...textureMaterial,
      code: 'texture-render-mode-adapted',
      source: 'additive',
    },
    'pbr-group-texture-only': { ...textureMaterial, code: 'pbr-group-texture-only', group: 0 },
    'pbr-channel-used-as-color': {
      ...textureMaterial,
      code: 'pbr-channel-used-as-color',
      source: 'height',
    },
  },
  hierarchy: {
    'name-generated': { ...hierarchy, code: 'name-generated' },
    'name-shortened': { ...hierarchy, code: 'name-shortened' },
    'group-visibility-inherited': { ...group, code: 'group-visibility-inherited' },
    'group-lock-inherited': { ...group, code: 'group-lock-inherited' },
    'export-flag-discarded': { ...hierarchy, code: 'export-flag-discarded' },
  },
  geometry: {
    'undrawn-degenerate-faces': {
      ...node,
      code: 'undrawn-degenerate-faces',
      geometryId: 'bbmodel_geometry_1',
    },
    'undrawn-self-intersection-faces': {
      ...node,
      code: 'undrawn-self-intersection-faces',
      geometryId: 'bbmodel_geometry_1',
    },
    'undrawn-precision-faces': {
      ...node,
      code: 'undrawn-precision-faces',
      geometryId: 'bbmodel_geometry_1',
    },
  },
  resources: {
    'texture-resource-selected': {
      ...texture,
      code: 'texture-resource-selected',
      resource: 0,
      source: 'embedded',
      alternateAvailable: true,
      pathFieldIgnored: true,
    },
  },
  layouts: {
    'declared-pixel-size-differs': {
      ...texture,
      code: 'declared-pixel-size-differs',
      declared: [null, 9],
      actual: [2, 4],
    },
    'texture-flipbook-materialized': {
      ...texture,
      code: 'texture-flipbook-materialized',
      frames: 2,
    },
    'texture-fps-floor': { ...texture, code: 'texture-fps-floor', source: -0, target: 1 },
    'frame-indices-wrapped': { ...texture, code: 'frame-indices-wrapped', count: 1 },
  },
  images: {
    'rgba16-to-rgba8': { ...image, code: 'rgba16-to-rgba8' },
    'name-generated': { ...image, code: 'name-generated' },
    'name-shortened': { ...image, code: 'name-shortened' },
    'inactive-texture-layers-omitted': {
      ...image,
      code: 'inactive-texture-layers-omitted',
      count: 1,
    },
  },
  'paint-layers': {
    'paint-layers-adapted': {
      ...image,
      path: 'textures[0].layers',
      code: 'paint-layers-adapted',
      rootBitmap: 'dimensions-only',
      composition: 'molda-source-over',
      layers: [
        {
          layer: 0,
          targetId: 'bbmodel_image_0_layer_0',
          sourceName: 'Imagem importada',
          nameChange: null,
          visible: true,
          sourceOpacity: 100,
          declared: [null, 0],
          actual: [2, 4],
          rgba16: false,
        },
      ],
    },
  },
} satisfies Catalog

function setup() {
  const input = bbmodelImportFixture(),
    ready = directBbmodelImport(input)
  const report = (issues: unknown[]) => ({
    ...ready.report,
    issues: [...ready.report.issues.filter((issue) => issue.stage === 'resources'), ...issues],
  })
  return {
    input,
    ready,
    report,
    read: (value: unknown) => readBbmodelImportReport(value, ready.document, input),
  }
}

test('bbmodel report owns all nested arrays and records, including signed source metadata', () => {
  const { input, ready, read } = setup(),
    before = structuredClone(ready),
    parsed = read(ready.report)
  expect(parsed).toEqual(ready.report)
  expect(parsed).not.toBe(ready.report)
  for (let i = 0; i < parsed.issues.length; i++) {
    expect(parsed.issues[i]).not.toBe(ready.report.issues[i])
    expect(parsed.issues[i]!.detail).not.toBe(ready.report.issues[i]!.detail)
    const detail = parsed.issues[i]!.detail
    if ('color' in detail) detail.color[0] = 1
    if ('declared' in detail) {
      detail.declared[0] = 99
      detail.actual[0] = 99
    }
  }
  parsed.source.entryPath = 'another.bbmodel'
  parsed.costs.nodes = 99
  parsed.issues.length = 0
  expect(ready).toEqual(before)
  expect(input.options.nodeMaterials!.color).toEqual([0.5, 0.25, 0.75, 1])
})

test('bbmodel report validates every producer code and rejects extra, missing and unknown fields per variant', () => {
  const { input, ready, read, report } = setup()
  for (const stage of Object.keys(catalog) as Stage[]) {
    if (stage === 'paint-layers') {
      input.options.images = { layers: 'molda-layers' }
      ready.document.images[0]!.layers[0]!.id = 'bbmodel_image_0_layer_0'
    }
    const variants: Record<string, Detail<Stage>> = catalog[stage]
    for (const detail of Object.values(variants)) {
      input.options.selection!.unlisted =
        detail.code === 'unlisted-nodes-appended' ? 'append' : 'omit'
      input.options.geometry!.quads =
        detail.code === 'editable-quad-adaptation' ? 'editable-quads' : 'source-triangles'
      const wire = { stage, detail },
        wrap = (issue: unknown) =>
          stage === 'resources' ? { ...report([]), issues: [issue] } : report([issue])
      expect(wire).toEqual(read(wrap(wire)).issues.at(-1)!)
      expect(() => read(wrap({ ...wire, extra: true }))).toThrow()
      expect(() => read(wrap({ ...wire, detail: { ...detail, extra: true } }))).toThrow()
      for (const key of Object.keys(detail)) {
        const missing: Record<string, unknown> = { ...detail }
        delete missing[key]
        expect(() => read(wrap({ ...wire, detail: missing }))).toThrow()
      }
      for (const code of ['unknown', '__proto__', 'constructor', null, 1])
        expect(() => read(wrap({ ...wire, detail: { ...detail, code } }))).toThrow()
      for (const path of ['', 1, null, 'x'.repeat(BBMODEL_REPORT_LIMITS.pathChars + 1)])
        expect(() => read(wrap({ ...wire, detail: { ...detail, path } }))).toThrow()
      if ('count' in detail)
        for (const count of [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])
          expect(() => read(wrap({ ...wire, detail: { ...detail, count } }))).toThrow()
      if ('node' in detail)
        for (const node of [-1, 0.5, BBMODEL_INPUT_LIMITS.nodes, 2 === detail.node ? 0 : 2])
          expect(() => read(wrap({ ...wire, detail: { ...detail, node } }))).toThrow()
      if ('texture' in detail)
        for (const texture of [-1, 0.5, 1, BBMODEL_INPUT_LIMITS.textures])
          expect(() => read(wrap({ ...wire, detail: { ...detail, texture } }))).toThrow()
      for (const key of ['targetId', 'geometryId', 'nodeId'])
        if (key in detail)
          expect(() => read(wrap({ ...wire, detail: { ...detail, [key]: 'foreign' } }))).toThrow()
    }
  }
  for (const stage of ['unknown', '__proto__', 'constructor', null, 1])
    expect(() =>
      read(report([{ stage, detail: catalog.remainder['unmapped-field-discarded'] }])),
    ).toThrow()
})

test('bbmodel report rejects costs, source counts, omitted required fields and automatic review approval', () => {
  const { ready, read } = setup()
  for (const [key, value] of Object.entries(ready.report.costs)) {
    expect(() =>
      read({ ...ready.report, costs: { ...ready.report.costs, [key]: value + 1 } }),
    ).toThrow()
    const missing: Record<string, unknown> = { ...ready.report.costs }
    delete missing[key]
    expect(() => read({ ...ready.report, costs: missing })).toThrow()
  }
  for (const key of Object.keys(ready.report.source)) {
    const missing: Record<string, unknown> = { ...ready.report.source }
    delete missing[key]
    expect(() => read({ ...ready.report, source: missing })).toThrow()
  }
  for (const changes of [
    { format: 'gltf' },
    { version: '5.1' },
    { modelFormat: 'minecraft' },
    { entryPath: 'other' },
    { nodes: 2 },
    { nodes: 65537 },
    { nodes: 4.5 },
    { omittedNodes: 0 },
    { textures: 0 },
    { textures: 65537 },
    { unusedTextures: 1 },
    { textureGroups: -1 },
    { textureGroups: 65537 },
    { selectedFileBytes: 0 },
    { originalFile: 'stored' },
    { auxiliaryMetadata: 'stored' },
    { extra: true },
  ])
    expect(() =>
      read({ ...ready.report, source: { ...ready.report.source, ...changes } }),
    ).toThrow()
  for (const changes of [
    { review: 'approved' },
    { review: undefined },
    { extra: true },
    { costs: { ...ready.report.costs, extra: 1 } },
    { issues: null },
  ])
    expect(() => read({ ...ready.report, ...changes })).toThrow()
})

test('bbmodel diagnostic adaptation claims require the exact requested choices', () => {
  const { input, read, report } = setup()
  // Strict defaults remove every discretionary adaptation. Unconditional diagnostics remain valid.
  input.options = { sourcePreference: 'prefer-embedded' }
  for (const [stage, detail] of [
    ['selection', catalog.selection['unlisted-nodes-appended']],
    ['selection', catalog.selection['unlisted-nodes-omitted']],
    ['selection', catalog.selection['unsupported-subtree-omitted']],
    ['remainder', catalog.remainder['animations-omitted']],
    ['remainder', catalog.remainder['animation-controllers-omitted']],
    ['remainder', catalog.remainder['unmapped-field-discarded']],
    ['topology', catalog.topology['unsupported-faces-omitted']],
    ['topology', catalog.topology['editable-quad-adaptation']],
    ['positions', catalog.positions['zero-cube-extents']],
    ['positions', catalog.positions['inverted-cube-extents']],
    ['authorial-uv', catalog['authorial-uv']['missing-mesh-uv-filled']],
    ...Object.values(catalog.surfaces).map((detail) => ['surfaces', detail]),
    ['node-materials', catalog['node-materials']['untextured-appearance-adapted']],
    ...Object.values(catalog['texture-materials'])
      .filter(
        (detail) =>
          !['name-generated', 'name-shortened', 'pbr-channel-used-as-color'].includes(detail.code),
      )
      .map((detail) => ['texture-materials', detail]),
    ['hierarchy', catalog.hierarchy['group-lock-inherited']],
    ['hierarchy', catalog.hierarchy['group-visibility-inherited']],
    ['hierarchy', catalog.hierarchy['export-flag-discarded']],
    ['images', catalog.images['rgba16-to-rgba8']],
  ])
    expect(() => read(report([{ stage, detail }]))).toThrow()
})

test('bbmodel report proves image origins, dimensions, cell count, material choices and bounded detail fields', () => {
  const { read, report } = setup()
  for (const [stage, detail, changes] of [
    ['surfaces', catalog.surfaces['native-flat-normals'], { source: 'custom' }],
    ['surfaces', catalog.surfaces['native-flat-normals'], { node: 3 }],
    ['surfaces', catalog.surfaces['render-order-discarded'], { source: 'default' }],
    ['surfaces', catalog.surfaces['cube-shade-discarded'], { source: true }],
    ['positions', catalog.positions['zero-cube-extents'], { count: 4 }],
    ['topology', catalog.topology['disabled-faces'], { node: 3 }],
    ['hierarchy', catalog.hierarchy['group-lock-inherited'], { node: 0, nodeId: 'bbmodel_node_0' }],
    [
      'node-materials',
      catalog['node-materials']['untextured-appearance-adapted'],
      { color: [1, 1, 1, 1] },
    ],
    [
      'node-materials',
      catalog['node-materials']['untextured-appearance-adapted'],
      { color: [0.5, 0.25, 0.75, 1, 1] },
    ],
    [
      'node-materials',
      catalog['node-materials']['untextured-appearance-adapted'],
      { markerColor: Infinity },
    ],
    [
      'node-materials',
      catalog['node-materials']['untextured-appearance-adapted'],
      { doubleSided: false },
    ],
    [
      'texture-materials',
      catalog['texture-materials']['texture-sidedness-assumed'],
      { doubleSided: false },
    ],
    [
      'texture-materials',
      catalog['texture-materials']['texture-render-mode-adapted'],
      { source: 'default' },
    ],
    ['texture-materials', catalog['texture-materials']['pbr-group-texture-only'], { group: 1 }],
    [
      'texture-materials',
      catalog['texture-materials']['pbr-channel-used-as-color'],
      { source: 'color' },
    ],
    ['layouts', catalog.layouts['texture-flipbook-materialized'], { frames: 3 }],
    ['layouts', catalog.layouts['declared-pixel-size-differs'], { declared: [0, null] }],
    ['layouts', catalog.layouts['declared-pixel-size-differs'], { declared: [2, 4] }],
    ['layouts', catalog.layouts['declared-pixel-size-differs'], { actual: [2, 2] }],
    ['layouts', catalog.layouts['declared-pixel-size-differs'], { declared: [0.5, 9] }],
    ['layouts', catalog.layouts['texture-fps-floor'], { source: 1 }],
    ['layouts', catalog.layouts['texture-fps-floor'], { target: 2 }],
    ['layouts', catalog.layouts['frame-indices-wrapped'], { count: 4 }],
    ['selection', catalog.selection['unsupported-subtree-omitted'], { type: '' }],
    ['selection', catalog.selection['unsupported-subtree-omitted'], { reason: 'other' }],
  ] as const)
    expect(() => read(report([{ stage, detail: { ...detail, ...changes } }]))).toThrow()
  const resource = catalog.resources['texture-resource-selected']
  for (const changes of [
    { resource: 1 },
    { resource: -1 },
    { resource: 0.5 },
    { source: 'network' },
    { alternateAvailable: 1 },
    { pathFieldIgnored: 'true' },
  ])
    expect(() =>
      read({
        ...report([]),
        issues: [{ stage: 'resources', detail: { ...resource, ...changes } }],
      }),
    ).toThrow()
  expect(() => read({ ...report([]), issues: [] })).toThrow()
  expect(() => read(report([{ stage: 'resources', detail: resource }]))).toThrow()
  for (const markerColor of [null, -0, -1e308, 0.5, 1e308]) {
    const detail = { ...catalog['node-materials']['untextured-appearance-adapted'], markerColor }
    expect(read(report([{ stage: 'node-materials', detail }])).issues.at(-1)!.detail).toEqual(
      detail,
    )
  }
  expect(
    read(report([{ stage: 'layouts', detail: catalog.layouts['texture-fps-floor'] }])).issues.at(
      -1,
    )!.detail,
  ).toEqual(catalog.layouts['texture-fps-floor'])
})

function textSize(value: unknown): number {
  if (typeof value === 'string') return value.length
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + textSize(item), 0)
  if (value && typeof value === 'object')
    return Object.entries(value).reduce((sum, [key, item]) => sum + key.length + textSize(item), 0)
  return 0
}

test('bbmodel producer and receiver accept the same exact aggregate text limit and reject its next character', () => {
  const { input, ready, read } = setup(),
    minimal: BbmodelConversionReport = {
      ...ready.report,
      issues: ready.report.issues.filter((issue) => issue.stage === 'resources'),
    },
    issue = (path: string): BbmodelConversionIssue => ({
      stage: 'remainder',
      detail: { code: 'unmapped-field-discarded', path },
    }),
    overhead = textSize(issue('')),
    perIssue = BBMODEL_REPORT_LIMITS.pathChars + overhead
  let remaining = BBMODEL_REPORT_LIMITS.textChars - textSize(minimal)
  while (remaining > perIssue) {
    minimal.issues.push(issue('x'.repeat(BBMODEL_REPORT_LIMITS.pathChars)))
    remaining -= perIssue
  }
  minimal.issues.push(issue('x'.repeat(remaining - overhead)))
  expect(textSize(minimal)).toBe(BBMODEL_REPORT_LIMITS.textChars)
  const collect = (report: BbmodelConversionReport) => {
    const collector = collectBbmodelConversionReport(report.source)
    for (const diagnostic of report.issues) collector.add(diagnostic)
    return collector.finish(ready.document)
  }
  expect(collect(minimal)).toEqual(minimal)
  expect(read(minimal)).toEqual(minimal)
  minimal.issues.at(-1)!.detail.path += 'x'
  expect(() => collect(minimal)).toThrow()
  expect(() => read(minimal)).toThrow()
  expect(input.options.remainder!.unmapped).toBe('discard')
})

test('bbmodel receiver accepts the exact issue count and rejects excess before reading issue details', () => {
  const { read, report } = setup(),
    detail = { ...catalog.remainder['unmapped-field-discarded'], path: 'x' },
    issues = Array.from({ length: BBMODEL_REPORT_LIMITS.issues - 1 }, () => ({
      stage: 'remainder',
      detail,
    })),
    exact = report(issues)
  expect(read(exact).issues).toHaveLength(BBMODEL_REPORT_LIMITS.issues)
  const excess = [
    ...exact.issues,
    {
      get stage() {
        throw new Error('Should not inspect excess')
      },
    },
  ]
  expect(() => read({ ...exact, issues: excess })).toThrow('Lista fora do orçamento.')
})
