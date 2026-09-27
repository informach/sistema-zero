import { expect, test } from 'bun:test'
import type { MtlBaseIssue } from '../import/mtlBase'
import type { MtlTextureIssue } from '../import/mtlTexturePlanTypes'
import type { ObjConversionIssue, ObjConversionReport } from '../import/objConversionReport'
import type { ObjGeometryIssue } from '../import/objGeometries'
import type { ObjHierarchyIssue } from '../import/objHierarchy'
import type { ObjMaterialIssue } from '../import/objMaterialConversionTypes'
import type { ObjMaterialSelectionIssue } from '../import/objMaterialSelection'
import { OBJ_CONVERSION_REPORT_LIMITS } from '../import/objReportLimits'
import { directObjImport, objImportFixture } from '../testing/objImportFixture'
import { objImportReply, readObjImportReply } from './objImportProtocol'
import { readObjImportReport } from './objImportReport'

test('OBJ report reader owns valid output and rejects altered identity, costs, source claims and unknown fields', () => {
  const input = objImportFixture(),
    ready = directObjImport(input),
    result = readObjImportReply(objImportReply(input, ready), input)
  expect(result).toEqual({ type: 'result', result: ready })
  if (result.type !== 'result' || result.result.status !== 'ready')
    throw new Error('Expected review')
  result.result.document.images[0]!.layers[0]!.pixels.fill(0)
  result.result.report.source.libraries.length = 0
  result.result.report.issues.length = 0
  expect(ready).toEqual(directObjImport(input))
  for (const key of Object.keys(ready.report.costs)) {
    const costs = { ...ready.report.costs, [key]: -1 }
    expect(() => readObjImportReport({ ...ready.report, costs }, ready.document, input)).toThrow()
    const missing: Record<string, unknown> = { ...ready.report.costs }
    delete missing[key]
    expect(() =>
      readObjImportReport({ ...ready.report, costs: missing }, ready.document, input),
    ).toThrow()
  }
  for (const changes of [
    { format: 'gltf' },
    { entryPath: 'another.obj' },
    { libraries: ['project/foreign.mtl'] },
    { libraries: ['project/m/a.mtl', 'project/m/a.mtl'] },
    { libraries: ['project/m/./a.mtl'] },
    { materialDeclarations: 0 },
    { materialDeclarations: 65_537 },
    { usedMaterialDeclarations: 0 },
    { unusedMaterialDeclarations: 0 },
    { materialVariants: 0 },
    { materialVariants: 3.5 },
    { companionFiles: 1 },
    { companionFiles: input.files.length + 1 },
    { companionBytes: 0 },
    { companionBytes: 32 * 1024 * 1024 + 1 },
    { originalFile: 'archived' },
    { auxiliaryMetadata: 'stored' },
    { approved: true },
  ])
    expect(() =>
      readObjImportReport(
        { ...ready.report, source: { ...ready.report.source, ...changes } },
        ready.document,
        input,
      ),
    ).toThrow()
  for (const changes of [
    { review: 'approved' },
    { extra: true },
    { costs: { ...ready.report.costs, fake: 1 } },
  ])
    expect(() =>
      readObjImportReport({ ...ready.report, ...changes }, ready.document, input),
    ).toThrow()
  for (const changes of [
    { id: 'other' },
    { name: 'Other' },
    { createdAt: 3 },
    { updatedAt: 3 },
    { thumb: 'data:image/png;base64,old' },
    { nodes: [] },
  ])
    expect(() =>
      readObjImportReply(
        objImportReply(input, { ...ready, document: { ...ready.document, ...changes } }),
        input,
      ),
    ).toThrow()
})

test('OBJ report decodes every current issue code and rejects extra/missing detail fields in every variant', () => {
  const input = objImportFixture(),
    ready = directObjImport(input),
    materialId = ready.document.materials[0]!.id,
    imageId = ready.document.images[0]!.id,
    nodeId = ready.document.nodes[0]!.id,
    geometryId = ready.document.geometries[0]!.id,
    origin = { library: 0, material: 0, targetId: materialId },
    base = { line: 1 },
    texture = { line: 1, property: 0 },
    material = { path: 'file', targetId: materialId },
    bases: Record<MtlBaseIssue['code'], MtlBaseIssue> = {
      'rgb-interpreted': { ...base, code: 'rgb-interpreted', space: 'linear' },
      'property-redeclared': { ...base, code: 'property-redeclared', slot: 'bump', ignored: 1 },
      'opacity-priority': { ...base, code: 'opacity-priority', selected: 'Tr', omittedLine: 2 },
      'phong-roughness-approximated': {
        ...base,
        code: 'phong-roughness-approximated',
        method: 'blender',
      },
      'illumination-adapted': { ...base, code: 'illumination-adapted', model: 10 },
      'parameter-omitted': { ...base, code: 'parameter-omitted', keyword: 'map_Disp' },
      'default-assumed': { ...base, code: 'default-assumed', field: 'illumination' },
    },
    textures: Record<MtlTextureIssue['code'], MtlTextureIssue> = {
      'map-omitted': {
        ...texture,
        code: 'map-omitted',
        keyword: 'map_Bump',
        reason: 'role-conflict',
      },
      'map-interpreted': { ...texture, code: 'map-interpreted', as: 'normal' },
      'option-redeclared': { ...texture, code: 'option-redeclared', key: 'mm', ignored: 63 },
      'option-omitted': { ...texture, code: 'option-omitted', key: 'texres' },
      'third-texture-axis-omitted': { ...texture, code: 'third-texture-axis-omitted', key: 's' },
      'sampler-filter-nearest': {
        ...texture,
        code: 'sampler-filter-nearest',
        blendu: true,
        blendv: false,
      },
      'sampler-wrap-clamp': {
        ...texture,
        code: 'sampler-wrap-clamp',
        source: 'underlying-material',
      },
      'texture-rgb-interpreted': {
        ...texture,
        code: 'texture-rgb-interpreted',
        space: 'srgb',
        origin: 'colorspace',
      },
      'luminance-rec709': { ...texture, code: 'luminance-rec709' },
      'matte-linear': { ...texture, code: 'matte-linear' },
    },
    hierarchies: Record<ObjHierarchyIssue['code'], ObjHierarchyIssue> = {
      'name-generated': { code: 'name-generated', path: 'objects', nodeId },
      'name-shortened': { code: 'name-shortened', path: 'objects', nodeId },
      'empty-object-preserved': { code: 'empty-object-preserved', path: 'objects', nodeId },
      'empty-objects-omitted': { code: 'empty-objects-omitted', path: 'objects', count: 1 },
      'group-memberships-omitted': {
        code: 'group-memberships-omitted',
        path: 'groups',
        sets: 2,
        names: 3,
        elements: 5,
        memberships: 12,
      },
    },
    geometries: Record<ObjGeometryIssue['code'], true> = {
      'closing-corners-removed': true,
      'construction-points': true,
      'construction-lines': true,
      'repeated-line-indices-omitted': true,
      'line-uv-omitted': true,
      'construction-material-omitted': true,
      'flat-normals': true,
      'smoothing-groups-omitted': true,
      'third-uv-coordinate-omitted': true,
      'rational-weight-omitted': true,
      'unreferenced-vertices': true,
      'undrawn-degenerate-faces': true,
      'undrawn-self-intersection-faces': true,
      'undrawn-precision-faces': true,
    },
    materials: Record<ObjMaterialIssue['code'], ObjMaterialIssue> = {
      'name-generated': { ...material, code: 'name-generated' },
      'name-shortened': { ...material, code: 'name-shortened', targetId: imageId },
      'rgba16-to-rgba8': { ...material, code: 'rgba16-to-rgba8', targetId: imageId },
      'color-factor-baked': { ...material, code: 'color-factor-baked' },
      'color-alpha-interpreted': { ...material, code: 'color-alpha-interpreted', mode: 'multiply' },
      'normal-y-interpreted': {
        ...material,
        code: 'normal-y-interpreted',
        source: 'positive',
        flipY: false,
      },
      'surface-sidedness-assumed': {
        ...material,
        code: 'surface-sidedness-assumed',
        doubleSided: false,
      },
      'opacity-resampled-nearest': {
        ...material,
        code: 'opacity-resampled-nearest',
        source: [1024, 1],
        target: [1, 1],
      },
    },
    selections: Record<ObjMaterialSelectionIssue['code'], ObjMaterialSelectionIssue> = {
      'library-scope-selected': { code: 'library-scope-selected', policy: 'declaration' },
      'duplicate-material-selected': {
        code: 'duplicate-material-selected',
        library: 0,
        material: 0,
        name: 'A',
        policy: 'last',
        ignored: 1,
      },
      'missing-material-default': {
        code: 'missing-material-default',
        name: 'Missing',
        scope: { kind: 'declaration', index: 0 },
        faces: 1,
      },
    },
    issues: ObjConversionIssue[] = [
      ...Object.values(bases).map((detail) => ({ stage: 'base' as const, ...origin, detail })),
      ...Object.values(textures).map((detail) => ({
        stage: 'textures' as const,
        ...origin,
        detail,
      })),
      ...Object.values(hierarchies).map((detail) => ({ stage: 'hierarchy' as const, detail })),
      ...Object.keys(geometries).map((code) => ({
        stage: 'geometry' as const,
        detail: { code: code as ObjGeometryIssue['code'], geometryId, path: 'objects', count: 1 },
      })),
      ...Object.values(materials).map((detail) => ({ stage: 'materials' as const, detail })),
      ...Object.values(selections).map((detail) => ({ stage: 'selection' as const, detail })),
    ]
  const read = (issues: unknown[]) =>
    readObjImportReport({ ...ready.report, issues }, ready.document, input)
  expect(read(issues).issues).toEqual(issues)
  for (const issue of issues) {
    expect(() => read([{ ...issue, extra: true }])).toThrow()
    expect(() => read([{ ...issue, detail: { ...issue.detail, extra: true } }])).toThrow()
    expect(() => read([{ ...issue, detail: { ...issue.detail, code: 'future' } }])).toThrow()
    for (const key of Object.keys(issue.detail)) {
      const detail: Record<string, unknown> = { ...issue.detail }
      delete detail[key]
      expect(() => read([{ ...issue, detail }])).toThrow()
    }
  }
})

test('OBJ review validates stage origins, target categories, bounds, normal orientation and nested scalar dimensions', () => {
  const input = objImportFixture(),
    ready = directObjImport(input),
    nodeId = ready.document.nodes[0]!.id,
    materialId = ready.document.materials[0]!.id,
    imageId = ready.document.images[0]!.id,
    geometryId = ready.document.geometries[0]!.id,
    base = {
      stage: 'base',
      library: 0,
      material: 0,
      targetId: materialId,
      detail: { code: 'rgb-interpreted', line: 1, space: 'srgb' },
    },
    normal = {
      stage: 'materials',
      detail: {
        code: 'normal-y-interpreted',
        path: 'file',
        targetId: materialId,
        source: 'positive',
        flipY: false,
      },
    },
    invalid: unknown[] = [
      { stage: 'future', detail: {} },
      { ...base, library: 2 },
      { ...base, library: 1 },
      { ...base, material: 1 },
      { ...base, material: 2 },
      { ...base, targetId: imageId },
      { ...base, detail: { ...base.detail, line: 0 } },
      { ...base, detail: { ...base.detail, line: 1.5 } },
      { ...base, detail: { ...base.detail, space: 'automatic' } },
      { ...normal, detail: { ...normal.detail, flipY: true } },
      { ...normal, detail: { ...normal.detail, source: 'negative', flipY: true } },
      {
        stage: 'materials',
        detail: {
          code: 'surface-sidedness-assumed',
          path: 'file',
          targetId: materialId,
          doubleSided: true,
        },
      },
      {
        stage: 'materials',
        detail: {
          code: 'color-alpha-interpreted',
          path: 'file',
          targetId: materialId,
          mode: 'ignore',
        },
      },
      {
        stage: 'materials',
        detail: {
          code: 'opacity-resampled-nearest',
          path: 'file',
          targetId: materialId,
          source: [2, 1],
          target: [1, 2],
        },
      },
      { ...normal, detail: { ...normal.detail, targetId: imageId } },
      { ...normal, detail: { ...normal.detail, flipY: 'true' } },
      {
        stage: 'materials',
        detail: { code: 'rgba16-to-rgba8', path: 'file', targetId: materialId },
      },
      {
        stage: 'materials',
        detail: {
          code: 'opacity-resampled-nearest',
          path: 'file',
          targetId: materialId,
          source: [1, 1],
          target: [1, 1],
        },
      },
      {
        stage: 'materials',
        detail: {
          code: 'opacity-resampled-nearest',
          path: 'file',
          targetId: materialId,
          source: [1.5, 1],
          target: [2, 1],
        },
      },
      {
        stage: 'materials',
        detail: {
          code: 'opacity-resampled-nearest',
          path: 'file',
          targetId: materialId,
          source: [1, 1, 1],
          target: [2, 1],
        },
      },
      {
        stage: 'hierarchy',
        detail: { code: 'name-generated', path: 'objects', nodeId: materialId },
      },
      {
        stage: 'hierarchy',
        detail: {
          code: 'group-memberships-omitted',
          path: 'groups',
          sets: 3,
          names: 2,
          elements: 2,
          memberships: 4,
        },
      },
      {
        stage: 'hierarchy',
        detail: {
          code: 'group-memberships-omitted',
          path: 'groups',
          sets: 1,
          names: 2,
          elements: 2,
          memberships: 5,
        },
      },
      {
        stage: 'geometry',
        detail: { code: 'flat-normals', path: 'objects', geometryId: nodeId, count: 1 },
      },
      {
        stage: 'geometry',
        detail: { code: 'flat-normals', path: 'objects', geometryId, count: 0 },
      },
      {
        stage: 'geometry',
        detail: { code: 'flat-normals', path: 'x'.repeat(8321), geometryId, count: 1 },
      },
      {
        stage: 'selection',
        detail: {
          code: 'missing-material-default',
          name: 'A',
          faces: 1,
          scope: { kind: 'all', index: 0 },
        },
      },
      {
        stage: 'selection',
        detail: {
          code: 'missing-material-default',
          name: 'A',
          faces: 1,
          scope: { kind: 'declaration', index: -1 },
        },
      },
    ]
  for (const issue of invalid)
    expect(() =>
      readObjImportReport({ ...ready.report, issues: [issue] }, ready.document, input),
    ).toThrow()
})

test('OBJ report enforces exact aggregate UTF-16 text and issue ceilings, without accepting truncated reviews', () => {
  const input = objImportFixture(),
    ready = directObjImport(input),
    empty: ObjConversionReport = { ...ready.report, issues: [] }
  // Independent count of the wire's textual values + non-array field names, not serialized byte length.
  function characters(value: unknown): number {
    if (typeof value === 'string') return value.length
    if (Array.isArray(value)) return value.reduce((sum, item) => sum + characters(item), 0)
    if (value && typeof value === 'object')
      return Object.entries(value).reduce(
        (sum, [key, item]) => sum + key.length + characters(item),
        0,
      )
    return 0
  }
  const detail = {
      code: 'flat-normals' as const,
      geometryId: ready.document.geometries[0]!.id,
      count: 1,
      path: '',
    },
    template = { stage: 'geometry' as const, detail },
    overhead = characters(template)
  let remaining = OBJ_CONVERSION_REPORT_LIMITS.textChars - characters(empty)
  const issues: ObjConversionIssue[] = []
  while (remaining > overhead) {
    const size = Math.min(8000, remaining - overhead)
    issues.push({ ...template, detail: { ...detail, path: 'x'.repeat(size) } })
    remaining -= overhead + size
  }
  const last = issues.at(-1)!
  if (last.stage !== 'geometry') throw new Error('Expected geometry issue')
  last.detail.path += 'x'.repeat(remaining)
  expect(characters({ ...empty, issues })).toBe(OBJ_CONVERSION_REPORT_LIMITS.textChars)
  expect(readObjImportReport({ ...empty, issues }, ready.document, input).issues).toEqual(issues)
  last.detail.path += 'x'
  expect(() => readObjImportReport({ ...empty, issues }, ready.document, input)).toThrow(
    'textos demais',
  )
  const repeated = Array.from({ length: OBJ_CONVERSION_REPORT_LIMITS.issues }, () => ({
    stage: 'selection',
    detail: { code: 'library-scope-selected', policy: 'all' },
  }))
  expect(
    readObjImportReport({ ...empty, issues: repeated }, ready.document, input).issues,
  ).toHaveLength(65_536)
  repeated.push(repeated[0]!)
  expect(() => readObjImportReport({ ...empty, issues: repeated }, ready.document, input)).toThrow()
})

test('OBJ missing/error protocol rejects foreign, noncanonical, selected or empty paths and partial results', () => {
  const input = objImportFixture(),
    ready = directObjImport(input),
    reply = (result: unknown) => ({
      documentId: input.documentId,
      revision: input.revision,
      requestId: input.requestId,
      type: 'result',
      result,
    })
  for (const paths of [
    [],
    ['a', 'a'],
    ['../a'],
    ['./a'],
    ['https:a'],
    [input.entryPath],
    [input.files[0]!.path],
    [''],
  ])
    expect(() => readObjImportReply(reply({ status: 'missing', paths }), input)).toThrow()
  expect(() =>
    readObjImportReply(
      reply({ status: 'missing', paths: ['new.png'], document: ready.document }),
      input,
    ),
  ).toThrow()
  const result = readObjImportReply(
    reply({ status: 'missing', paths: ['literal%20name.png'] }),
    input,
  )
  expect(result).toEqual({
    type: 'result',
    result: { status: 'missing', paths: ['literal%20name.png'] },
  })
  const error = {
    documentId: input.documentId,
    revision: input.revision,
    requestId: input.requestId,
    type: 'error',
    reason: 'unsupported',
    path: 'file',
    message: 'Not supported',
  }
  expect(() => readObjImportReply(error, input)).toThrow('Not supported')
  for (const changes of [
    { extra: true },
    { reason: 'retry' },
    { path: '' },
    { message: 'x'.repeat(1025) },
  ])
    expect(() => readObjImportReply({ ...error, ...changes }, input)).toThrow()
})
