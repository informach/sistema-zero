import type { GltfClipIssue } from '../import/gltfClipTypes'
import { gltfConversionCosts } from '../import/gltfConversionCosts'
import {
  GLTF_CONVERSION_REPORT_LIMITS,
  type GltfConversionIssue,
  type GltfConversionReport,
} from '../import/gltfConversionReport'
import type { GltfGeometryIssue } from '../import/gltfGeometries'
import type { GltfHierarchyIssue } from '../import/gltfHierarchy'
import { GLTF_INPUT_LIMITS } from '../import/gltfInput'
import type { GltfMaterialIssue } from '../import/gltfMaterialConversionTypes'
import type { GltfSkinBindingIssue } from '../import/gltfSkinBindings'
import type { MoldaSceneDocument } from '../scene/document'
import { SCENE_SKIN_LIMITS } from '../scene/skin'
import * as v from '../scene/validation'

// Exhaustive maps: adding a producer code requires an explicit transport decision.
const GEOMETRY: Record<GltfGeometryIssue['code'], true> = {
  'missing-position': true,
  'construction-points': true,
  'construction-lines': true,
  'repeated-indices-omitted': true,
  'morph-controls-baked': true,
  'flat-normals': true,
  'tangents-omitted': true,
  'colors-omitted': true,
  'extra-uv-sets-omitted': true,
  'custom-attributes-omitted': true,
  'undrawn-degenerate-faces': true,
  'undrawn-self-intersection-faces': true,
  'undrawn-precision-faces': true,
}
const MATERIAL: Record<GltfMaterialIssue['code'], true> = {
  'name-generated': true,
  'name-shortened': true,
  'base-color-factor-baked': true,
  'rgba16-to-rgba8': true,
  'image-alias-shared': true,
  'sampler-filter-nearest': true,
  'sampler-wrap-clamp': true,
  'occlusion-omitted': true,
  'emissive-omitted': true,
}
const HIERARCHY: Record<GltfHierarchyIssue['code'], true> = {
  'name-generated': true,
  'name-shortened': true,
  'joint-mesh-split': true,
  'camera-omitted': true,
}
const ANIMATION: Record<GltfClipIssue['code'], true> = {
  'name-generated': true,
  'name-shortened': true,
  'outside-scene-channel': true,
  'unresolved-channel-omitted': true,
  'morph-channel-omitted': true,
  'empty-clip-omitted': true,
  'zero-duration-expanded': true,
  'cubic-resampled': true,
  'rotation-keys-normalized': true,
}
const SKIN: Record<GltfSkinBindingIssue['code'], true> = {
  'name-generated': true,
  'name-shortened': true,
  'weights-normalized': true,
}
function isCode<T extends string>(value: unknown, codes: Record<T, true>): value is T {
  return typeof value === 'string' && Object.hasOwn(codes, value)
}
function code<T extends string>(value: unknown, codes: Record<T, true>): T {
  v.requireScene(isCode(value, codes), 'issue.code', 'Código de adaptação desconhecido.')
  return value
}
function readIssue(raw: unknown): GltfConversionIssue {
  const row = v.record(raw, 'issue', ['stage', 'detail']),
    stage = v.choice(
      row.stage,
      ['geometry', 'hierarchy', 'materials', 'skins', 'animations'],
      'issue.stage',
    ),
    detail = v.record(row.detail, 'issue.detail'),
    path = v.text(detail.path, 'issue.path', GLTF_CONVERSION_REPORT_LIMITS.pathChars)
  if (stage === 'geometry') {
    v.record(detail, 'issue.detail', ['code', 'path', 'geometryId', 'count'])
    return {
      stage,
      detail: {
        code: code(detail.code, GEOMETRY),
        path,
        geometryId: v.id(detail.geometryId, 'issue.geometryId'),
        count: v.number(detail.count, 'issue.count', 1, GLTF_INPUT_LIMITS.topologyIndices, true),
      },
    }
  }
  if (stage === 'hierarchy') {
    v.record(detail, 'issue.detail', ['code', 'path', 'nodeId'])
    return {
      stage,
      detail: {
        code: code(detail.code, HIERARCHY),
        path,
        nodeId: v.id(detail.nodeId, 'issue.nodeId'),
      },
    }
  }
  if (stage === 'materials') {
    v.record(detail, 'issue.detail', ['code', 'path', 'targetId'])
    return {
      stage,
      detail: {
        code: code(detail.code, MATERIAL),
        path,
        targetId: v.id(detail.targetId, 'issue.targetId'),
      },
    }
  }
  if (stage === 'skins') {
    const kind = code(detail.code, SKIN),
      bindingId = v.id(detail.bindingId, 'issue.bindingId')
    v.record(detail, 'issue.detail', [
      'code',
      'path',
      'bindingId',
      ...(kind === 'weights-normalized' ? ['vertices', 'maximumSumError'] : []),
    ])
    return {
      stage,
      detail:
        kind === 'weights-normalized'
          ? {
              code: kind,
              path,
              bindingId,
              vertices: v.number(
                detail.vertices,
                'issue.vertices',
                1,
                SCENE_SKIN_LIMITS.weightedVertices,
                true,
              ),
              maximumSumError: v.number(detail.maximumSumError, 'issue.maximumSumError', 0),
            }
          : { code: kind, path, bindingId },
    }
  }
  const kind = code(detail.code, ANIMATION),
    sampled = kind === 'zero-duration-expanded' || kind === 'cubic-resampled',
    normalized = kind === 'rotation-keys-normalized'
  v.record(detail, 'issue.detail', [
    'code',
    'path',
    'clipId',
    'count',
    ...(sampled ? ['fps'] : []),
    ...(normalized ? ['maximumNormError'] : []),
  ])
  return {
    stage,
    detail: {
      code: kind,
      path,
      clipId: v.id(detail.clipId, 'issue.clipId'),
      count: v.number(detail.count, 'issue.count', 1, GLTF_INPUT_LIMITS.animationChannels, true),
      ...(sampled ? { fps: v.number(detail.fps, 'issue.fps', 1, 120, true) } : {}),
      ...(normalized
        ? { maximumNormError: v.number(detail.maximumNormError, 'issue.maximumNormError', 0) }
        : {}),
    },
  }
}

export function readGltfImportReport(
  raw: unknown,
  document: MoldaSceneDocument,
  sceneIndex: number | null,
): GltfConversionReport {
  const row = v.record(raw, 'report', ['review', 'source', 'costs', 'issues']),
    source = v.record(row.source, 'report.source', [
      'format',
      'sceneIndex',
      'omittedScenes',
      'omittedNodes',
      'originalFile',
      'auxiliaryMetadata',
      'unhandledExtensions',
      'extensionOccurrences',
      'unknownChunkTypes',
    ]),
    costs = gltfConversionCosts(document),
    reported = v.record(row.costs, 'report.costs', Object.keys(costs))
  v.requireScene(
    row.review === 'required' &&
      source.sceneIndex === sceneIndex &&
      source.originalFile === 'not-retained' &&
      source.auxiliaryMetadata === 'not-stored',
    'report',
    'O relatório não pertence à escolha ou não exige revisão.',
  )
  for (const [key, value] of Object.entries(costs))
    v.requireScene(
      reported[key] === value,
      `report.costs.${key}`,
      'O custo anunciado não corresponde ao documento recebido.',
    )
  const extensions = v
      .list(source.unhandledExtensions, 'report.extensions', GLTF_INPUT_LIMITS.extensions)
      .map((name) => v.text(name, 'extension', GLTF_INPUT_LIMITS.pathLength, true)),
    names = new Set(extensions),
    occurrences = new Set<string>()
  v.requireScene(names.size === extensions.length, 'report.extensions', 'Extensão repetida.')
  const omittedNodes = v.number(
      source.omittedNodes,
      'report.omittedNodes',
      0,
      GLTF_INPUT_LIMITS.nodes,
      true,
    ),
    omittedScenes = v.number(
      source.omittedScenes,
      'report.omittedScenes',
      0,
      GLTF_INPUT_LIMITS.scenes - Number(sceneIndex !== null),
      true,
    )
  const targets = {
    hierarchy: new Set(document.nodes.map((node) => node.id)),
    geometry: new Set(document.geometries.map((geometry) => geometry.id)),
    materials: new Set([...document.materials, ...document.images].map((resource) => resource.id)),
    skins: new Set((document.skins ?? []).map((skin) => skin.id)),
    animations: new Set((document.animations ?? []).map((clip) => clip.id)),
  }
  const issues = v
    .list(row.issues, 'report.issues', GLTF_CONVERSION_REPORT_LIMITS.issues)
    .map((raw) => {
      const issue = readIssue(raw)
      let target: string | null
      switch (issue.stage) {
        case 'hierarchy':
          target = issue.detail.nodeId
          break
        case 'geometry':
          target = issue.detail.geometryId
          break
        case 'materials':
          target = issue.detail.targetId
          break
        case 'skins':
          target = issue.detail.bindingId
          break
        case 'animations':
          // Source channels/clips omitted by selection have prospective IDs, not native resources.
          target = [
            'outside-scene-channel',
            'unresolved-channel-omitted',
            'morph-channel-omitted',
            'empty-clip-omitted',
          ].includes(issue.detail.code)
            ? null
            : issue.detail.clipId
          break
      }
      v.requireScene(
        target === null || targets[issue.stage].has(target),
        'issue.target',
        'O aviso aponta para um recurso nativo ausente.',
      )
      return issue
    })
  return {
    review: 'required',
    costs,
    source: {
      format: v.choice(source.format, ['glb', 'gltf'], 'report.format'),
      sceneIndex,
      omittedNodes,
      omittedScenes,
      originalFile: 'not-retained',
      auxiliaryMetadata: 'not-stored',
      unhandledExtensions: extensions,
      extensionOccurrences: v
        .list(
          source.extensionOccurrences,
          'report.extensionOccurrences',
          GLTF_INPUT_LIMITS.extensionUses,
        )
        .map((raw) => {
          const entry = v.record(raw, 'extensionOccurrence', ['name', 'path']),
            name = v.text(
              entry.name,
              'extensionOccurrence.name',
              GLTF_INPUT_LIMITS.pathLength,
              true,
            ),
            path = v.text(
              entry.path,
              'extensionOccurrence.path',
              GLTF_CONVERSION_REPORT_LIMITS.pathChars,
            ),
            key = `${name.length}:${name}${path}`
          v.requireScene(
            names.has(name) && !occurrences.has(key),
            'extensionOccurrence',
            'Extensão ausente ou ocorrência repetida.',
          )
          occurrences.add(key)
          return { name, path }
        }),
      unknownChunkTypes: v
        .list(source.unknownChunkTypes, 'report.unknownChunkTypes', GLTF_INPUT_LIMITS.chunks)
        .map((kind) => v.number(kind, 'chunkType', 0, 0xffffffff, true)),
    },
    issues,
  }
}
