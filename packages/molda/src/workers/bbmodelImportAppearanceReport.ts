import type { BbmodelImageIssue } from '../import/bbmodelImages'
import { BBMODEL_INPUT_LIMITS } from '../import/bbmodelInput'
import type { BbmodelNodeMaterialIssue } from '../import/bbmodelNodeMaterials'
import type { BbmodelTextureResourceBinding } from '../import/bbmodelResources'
import type { BbmodelTextureLayoutIssue } from '../import/bbmodelTextureLayouts'
import type { BbmodelTextureMaterialIssue } from '../import/bbmodelTextureMaterials'
import { bbmodelNumber, bbmodelVec4 } from '../import/bbmodelValues'
import { SCENE_FLIPBOOK_LIMITS } from '../scene/imageFlipbook'
import * as v from '../scene/validation'
import {
  type BbmodelReportContext,
  bbmodelReportChoice,
  bbmodelReportCount,
  bbmodelReportNode,
  bbmodelReportPath,
  bbmodelReportTexture,
} from './bbmodelImportReportValues'
import { readNativeImportReportCode as codeOf } from './nativeImportReport'

function materialTarget(raw: unknown, expectedId: string, context: BbmodelReportContext) {
  const targetId = v.id(raw, 'issue.targetId'),
    material = context.materials.get(targetId)
  v.requireScene(
    targetId === expectedId && material !== undefined,
    'issue.targetId',
    'O material não corresponde à origem relatada.',
  )
  return material
}

export function readBbmodelNodeMaterialIssue(
  raw: unknown,
  context: BbmodelReportContext,
): BbmodelNodeMaterialIssue {
  const row = v.record(raw, 'issue.detail'),
    code = codeOf(row.code, {
      'name-generated': true,
      'name-shortened': true,
      'untextured-appearance-adapted': true,
    } satisfies Record<BbmodelNodeMaterialIssue['code'], true>),
    node = bbmodelReportNode(row.node, context),
    material = materialTarget(row.targetId, `bbmodel_node_material_${node}`, context),
    base = { node, targetId: material.id, path: bbmodelReportPath(row.path) },
    target = context.nodes.get(`bbmodel_node_${node}`)!
  v.requireScene(
    target.kind === 'mesh' && target.materialId === material.id,
    'issue.targetId',
    'O material padrão não pertence a esta peça.',
  )
  if (code !== 'untextured-appearance-adapted') {
    v.record(row, 'issue.detail', ['code', 'node', 'targetId', 'path'])
    return { ...base, code }
  }
  v.record(row, 'issue.detail', [
    'code',
    'node',
    'targetId',
    'path',
    'count',
    'markerColor',
    'color',
    'doubleSided',
  ])
  bbmodelReportChoice(context.options.nodeMaterials.untextured === 'uniform')
  const color = bbmodelVec4(row.color, 'issue.color'),
    doubleSided = v.boolean(row.doubleSided, 'issue.doubleSided'),
    native = material.baseColor,
    chosen = context.options.nodeMaterials
  v.requireScene(native.kind === 'rgba', 'issue.targetId', 'Material RGBA esperado.')
  for (let axis = 0; axis < 4; axis++)
    v.requireScene(
      color[axis]! >= 0 &&
        color[axis]! <= 1 &&
        color[axis] === chosen.color[axis] &&
        color[axis] === native.value[axis],
      'issue.color',
      'A cor não corresponde à escolha e ao material recebido.',
    )
  v.requireScene(
    doubleSided === chosen.doubleSided && doubleSided === material.doubleSided,
    'issue.doubleSided',
    'Os lados do material não correspondem à escolha.',
  )
  return {
    ...base,
    code,
    color,
    doubleSided,
    // Metadata numbers keep signed zero; this is not native authorial coordinate canonicalization.
    markerColor:
      row.markerColor === null ? null : bbmodelNumber(row.markerColor, 'issue.markerColor'),
    count: bbmodelReportCount(row.count, context.faceCounts.get(target.geometryId)!),
  }
}

export function readBbmodelTextureMaterialIssue(
  raw: unknown,
  context: BbmodelReportContext,
): BbmodelTextureMaterialIssue {
  const row = v.record(raw, 'issue.detail'),
    code = codeOf(row.code, {
      'texture-lighting-adapted': true,
      'name-generated': true,
      'name-shortened': true,
      'texture-sidedness-assumed': true,
      'texture-repeat-clamped': true,
      'texture-render-mode-adapted': true,
      'pbr-group-texture-only': true,
      'pbr-channel-used-as-color': true,
    } satisfies Record<BbmodelTextureMaterialIssue['code'], true>),
    texture = bbmodelReportTexture(row.texture, context),
    material = materialTarget(row.targetId, `bbmodel_material_${texture}`, context),
    base = { texture, targetId: material.id, path: bbmodelReportPath(row.path) },
    fields = ['code', 'texture', 'targetId', 'path'],
    choices = context.options.textureMaterials
  v.requireScene(
    material.colorImageId === `bbmodel_image_${texture}`,
    'issue.targetId',
    'A textura de cor do material não corresponde ao relatório.',
  )
  switch (code) {
    case 'name-generated':
    case 'name-shortened':
      v.record(row, 'issue.detail', fields)
      return { ...base, code }
    case 'texture-lighting-adapted':
      v.record(row, 'issue.detail', fields)
      bbmodelReportChoice(choices.lighting === 'molda-standard')
      return { ...base, code }
    case 'texture-repeat-clamped':
      v.record(row, 'issue.detail', fields)
      bbmodelReportChoice(choices.repeatWrap === 'clamp')
      return { ...base, code }
    case 'texture-sidedness-assumed': {
      v.record(row, 'issue.detail', [...fields, 'doubleSided'])
      const doubleSided = v.boolean(row.doubleSided, 'issue.doubleSided')
      bbmodelReportChoice(
        choices.autoSides !== 'reject' && doubleSided === (choices.autoSides === 'double'),
      )
      v.requireScene(
        doubleSided === material.doubleSided,
        'issue.doubleSided',
        'Lados de material inconsistentes.',
      )
      return { ...base, code, doubleSided }
    }
    case 'texture-render-mode-adapted':
      v.record(row, 'issue.detail', [...fields, 'source'])
      bbmodelReportChoice(choices.renderModes === 'standard')
      return {
        ...base,
        code,
        source: v.choice(row.source, ['emissive', 'additive', 'layered'], 'issue.source'),
      }
    case 'pbr-group-texture-only':
      v.record(row, 'issue.detail', [...fields, 'group'])
      bbmodelReportChoice(choices.pbrGroups === 'texture-only')
      return {
        ...base,
        code,
        group: v.number(row.group, 'issue.group', 0, context.source.textureGroups - 1, true),
      }
    case 'pbr-channel-used-as-color':
      v.record(row, 'issue.detail', [...fields, 'source'])
      return {
        ...base,
        code,
        source: v.choice(row.source, ['normal', 'height', 'mer'], 'issue.source'),
      }
  }
}

export function readBbmodelImageIssue(
  raw: unknown,
  context: BbmodelReportContext,
): BbmodelImageIssue {
  const row = v.record(raw, 'issue.detail'),
    code = codeOf(row.code, {
      'rgba16-to-rgba8': true,
      'name-generated': true,
      'name-shortened': true,
      'inactive-texture-layers-omitted': true,
    } satisfies Record<BbmodelImageIssue['code'], true>),
    texture = bbmodelReportTexture(row.texture, context),
    targetId = v.id(row.targetId, 'issue.targetId')
  v.requireScene(
    targetId === `bbmodel_image_${texture}`,
    'issue.targetId',
    'A imagem não corresponde à origem.',
  )
  const base = { code, texture, targetId, path: bbmodelReportPath(row.path) }
  v.record(
    row,
    'issue.detail',
    code === 'inactive-texture-layers-omitted'
      ? ['code', 'texture', 'targetId', 'path', 'count']
      : ['code', 'texture', 'targetId', 'path'],
  )
  if (code === 'rgba16-to-rgba8')
    bbmodelReportChoice(context.options.images.rgba16 === 'round-to-rgba8')
  return code === 'inactive-texture-layers-omitted'
    ? { ...base, count: bbmodelReportCount(row.count, BBMODEL_INPUT_LIMITS.textureLayers) }
    : base
}

export function readBbmodelLayoutIssue(
  raw: unknown,
  context: BbmodelReportContext,
): BbmodelTextureLayoutIssue {
  const row = v.record(raw, 'issue.detail'),
    code = codeOf(row.code, {
      'declared-pixel-size-differs': true,
      'texture-flipbook-materialized': true,
      'texture-fps-floor': true,
      'frame-indices-wrapped': true,
    } satisfies Record<BbmodelTextureLayoutIssue['code'], true>),
    texture = bbmodelReportTexture(row.texture, context),
    path = bbmodelReportPath(row.path),
    base = { texture, path },
    image = context.images.get(`bbmodel_image_${texture}`)!,
    fields = ['code', 'texture', 'path']
  if (code === 'declared-pixel-size-differs') {
    v.record(row, 'issue.detail', [...fields, 'declared', 'actual'])
    const declaredRaw = v.list(row.declared, 'issue.declared', 2),
      actual = v.tuple(row.actual, 2, 'issue.actual')
    v.requireScene(declaredRaw.length === 2, 'issue.declared', 'Duas dimensões esperadas.')
    const dimension = (value: unknown) =>
        value === null ? null : v.number(value, 'issue.declared', 0, Number.MAX_SAFE_INTEGER, true),
      declared: [number | null, number | null] = [
        dimension(declaredRaw[0]),
        dimension(declaredRaw[1]),
      ]
    v.requireScene(
      actual[0] === image.width &&
        actual[1] === image.height &&
        declared.some((size, axis) => size !== null && size > 0 && size !== actual[axis]),
      'issue.actual',
      'As dimensões relatadas não correspondem à imagem recebida.',
    )
    return { ...base, code, declared, actual: [actual[0]!, actual[1]!] }
  }
  const flipbook = image.flipbook
  v.requireScene(
    flipbook !== undefined,
    'issue.texture',
    'Esta adaptação precisa de uma imagem animada.',
  )
  switch (code) {
    case 'texture-flipbook-materialized': {
      v.record(row, 'issue.detail', [...fields, 'frames'])
      const frames = v.number(row.frames, 'issue.frames', 2, SCENE_FLIPBOOK_LIMITS.cells, true)
      v.requireScene(
        frames === (image.width / flipbook.frameWidth) * (image.height / flipbook.frameHeight),
        'issue.frames',
        'A quantidade de células não corresponde à imagem recebida.',
      )
      return { ...base, code, frames }
    }
    case 'texture-fps-floor': {
      v.record(row, 'issue.detail', [...fields, 'source', 'target'])
      const source = bbmodelNumber(row.source, 'issue.source')
      v.requireScene(
        source < 1 && row.target === 1 && flipbook.fps === 1,
        'issue.source',
        'A velocidade relatada não corresponde à imagem recebida.',
      )
      return { ...base, code, source, target: 1 }
    }
    case 'frame-indices-wrapped':
      v.record(row, 'issue.detail', [...fields, 'count'])
      return { ...base, code, count: bbmodelReportCount(row.count, flipbook.frames.length) }
  }
}

export function readBbmodelResourceIssue(
  raw: unknown,
  context: BbmodelReportContext,
): BbmodelTextureResourceBinding & { code: 'texture-resource-selected'; path: string } {
  const row = v.record(raw, 'issue.detail', [
      'code',
      'path',
      'texture',
      'resource',
      'source',
      'alternateAvailable',
      'pathFieldIgnored',
    ]),
    texture = bbmodelReportTexture(row.texture, context)
  return {
    code: v.choice(row.code, ['texture-resource-selected'], 'issue.code'),
    path: bbmodelReportPath(row.path),
    texture,
    resource: v.number(
      row.resource,
      'issue.resource',
      0,
      Math.min(context.images.size, BBMODEL_INPUT_LIMITS.resources) - 1,
      true,
    ),
    source: v.choice(row.source, ['embedded', 'file'], 'issue.source'),
    alternateAvailable: v.boolean(row.alternateAvailable, 'issue.alternateAvailable'),
    pathFieldIgnored: v.boolean(row.pathFieldIgnored, 'issue.pathFieldIgnored'),
  }
}
