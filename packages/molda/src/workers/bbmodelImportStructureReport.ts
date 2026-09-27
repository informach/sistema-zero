import type { BbmodelFaceUvIssue } from '../import/bbmodelFaceUvs'
import type { BbmodelGeometryIssue } from '../import/bbmodelGeometries'
import type { BbmodelHierarchyIssue } from '../import/bbmodelHierarchy'
import { BBMODEL_INPUT_LIMITS } from '../import/bbmodelInput'
import type { BbmodelTopologyIssue } from '../import/bbmodelNativeGeometryPlan'
import type { BbmodelNormalizedUvIssue } from '../import/bbmodelNativeUvs'
import type { BbmodelPositionIssue } from '../import/bbmodelPositions'
import type { BbmodelRemainderIssue } from '../import/bbmodelRemainder'
import type { BbmodelSelectionIssue } from '../import/bbmodelSelection'
import type { BbmodelSurfaceIssue } from '../import/bbmodelSurfaces'
import { SCENE_LIMITS } from '../scene/limits'
import * as v from '../scene/validation'
import {
  type BbmodelReportContext,
  bbmodelReportChoice,
  bbmodelReportCount,
  bbmodelReportNode,
  bbmodelReportNodeCount,
  bbmodelReportPath,
} from './bbmodelImportReportValues'
import { readNativeImportReportCode as codeOf } from './nativeImportReport'

export function readBbmodelSelectionIssue(
  raw: unknown,
  context: BbmodelReportContext,
): BbmodelSelectionIssue {
  const row = v.record(raw, 'issue.detail'),
    code = codeOf(row.code, {
      'unlisted-nodes-appended': true,
      'unlisted-nodes-omitted': true,
      'unsupported-subtree-omitted': true,
    } satisfies Record<BbmodelSelectionIssue['code'], true>)
  if (code !== 'unsupported-subtree-omitted') {
    v.record(row, 'issue.detail', ['code', 'path', 'count'])
    bbmodelReportChoice(
      context.options.selection.unlisted ===
        (code === 'unlisted-nodes-appended' ? 'append' : 'omit'),
    )
    return {
      code,
      path: v.choice(row.path, ['outliner'], 'issue.path'),
      count: bbmodelReportCount(
        row.count,
        code === 'unlisted-nodes-omitted' ? context.source.omittedNodes : context.source.nodes,
      ),
    }
  }
  v.record(row, 'issue.detail', ['code', 'path', 'node', 'type', 'reason', 'count'])
  const node = bbmodelReportNode(row.node, context, false)
  v.requireScene(
    !context.nodes.has(`bbmodel_node_${node}`),
    'issue.node',
    'A peça omitida ainda aparece no documento.',
  )
  bbmodelReportChoice(context.options.selection.unsupportedNodes === 'omit-subtree')
  return {
    code,
    node,
    path: bbmodelReportPath(row.path),
    type:
      row.type === null
        ? null
        : v.text(row.type, 'issue.type', BBMODEL_INPUT_LIMITS.identifierChars),
    reason: v.choice(row.reason, ['element-type', 'element-children'], 'issue.reason'),
    count: bbmodelReportCount(row.count, context.source.omittedNodes),
  }
}

export function readBbmodelRemainderIssue(
  raw: unknown,
  context: BbmodelReportContext,
): BbmodelRemainderIssue {
  const row = v.record(raw, 'issue.detail'),
    code = codeOf(row.code, {
      'unmapped-field-discarded': true,
      'animations-omitted': true,
      'animation-controllers-omitted': true,
    } satisfies Record<BbmodelRemainderIssue['code'], true>)
  v.record(
    row,
    'issue.detail',
    code === 'unmapped-field-discarded' ? ['code', 'path'] : ['code', 'path', 'count'],
  )
  if (code === 'unmapped-field-discarded') {
    bbmodelReportChoice(context.options.remainder.unmapped === 'discard')
    return { code, path: bbmodelReportPath(row.path) }
  }
  bbmodelReportChoice(
    (code === 'animations-omitted'
      ? context.options.remainder.animations
      : context.options.remainder.controllers) === 'omit',
  )
  return {
    code,
    path: v.choice(
      row.path,
      [code === 'animations-omitted' ? 'animations' : 'animation_controllers'],
      'issue.path',
    ),
    count: bbmodelReportCount(row.count, BBMODEL_INPUT_LIMITS.jsonStructure),
  }
}

export function readBbmodelTopologyIssue(
  raw: unknown,
  context: BbmodelReportContext,
): BbmodelTopologyIssue {
  const result = bbmodelReportNodeCount(
    raw,
    {
      'disabled-faces': true,
      'construction-faces': true,
      'duplicate-construction-edges': true,
      'unsupported-faces-omitted': true,
      'quads-to-source-triangles': true,
      'editable-quad-adaptation': true,
    } satisfies Record<BbmodelTopologyIssue['code'], true>,
    context,
    BBMODEL_INPUT_LIMITS.geometryFaces,
  )
  if (result.code === 'unsupported-faces-omitted')
    bbmodelReportChoice(context.options.geometry.unsupportedFaces === 'omit')
  if (result.code === 'quads-to-source-triangles')
    bbmodelReportChoice(context.options.geometry.quads === 'source-triangles')
  if (result.code === 'editable-quad-adaptation')
    bbmodelReportChoice(context.options.geometry.quads === 'editable-quads')
  return result
}

export function readBbmodelPositionIssue(
  raw: unknown,
  context: BbmodelReportContext,
): BbmodelPositionIssue {
  const result = bbmodelReportNodeCount(
    raw,
    {
      'zero-cube-extents': true,
      'inverted-cube-extents': true,
      'sub-float32-local-points': true,
      'sub-float32-world-points': true,
    } satisfies Record<BbmodelPositionIssue['code'], true>,
    context,
    SCENE_LIMITS.vertices,
  )
  if (result.code === 'zero-cube-extents' || result.code === 'inverted-cube-extents') {
    bbmodelReportChoice(context.options.positions.nonPositiveCubes === 'preserve')
    v.requireScene(result.count <= 3, 'issue.count', 'Um cubo tem somente três eixos.')
  }
  return result
}
export function readBbmodelAuthorialUvIssue(
  raw: unknown,
  context: BbmodelReportContext,
): BbmodelFaceUvIssue {
  const result = bbmodelReportNodeCount(
    raw,
    {
      'box-uv-materialized': true,
      'missing-mesh-uv-filled': true,
      'surplus-mesh-uv-omitted': true,
    } satisfies Record<BbmodelFaceUvIssue['code'], true>,
    context,
    BBMODEL_INPUT_LIMITS.geometryUvPoints,
  )
  if (result.code === 'missing-mesh-uv-filled')
    bbmodelReportChoice(context.options.uvs.missingMeshUvs === 'zero')
  return result
}
export function readBbmodelNormalizedUvIssue(
  raw: unknown,
  context: BbmodelReportContext,
): BbmodelNormalizedUvIssue {
  return bbmodelReportNodeCount(
    raw,
    {
      'outside-frame-uv': true,
      'uv-arithmetic-collapse': true,
      'sub-float32-uv': true,
    } satisfies Record<BbmodelNormalizedUvIssue['code'], true>,
    context,
    BBMODEL_INPUT_LIMITS.geometryCorners,
  )
}

export function readBbmodelHierarchyIssue(
  raw: unknown,
  context: BbmodelReportContext,
): BbmodelHierarchyIssue {
  const row = v.record(raw, 'issue.detail', ['code', 'path', 'node', 'nodeId']),
    code = codeOf(row.code, {
      'name-generated': true,
      'name-shortened': true,
      'group-visibility-inherited': true,
      'group-lock-inherited': true,
      'export-flag-discarded': true,
    } satisfies Record<BbmodelHierarchyIssue['code'], true>),
    node = bbmodelReportNode(row.node, context),
    nodeId = v.id(row.nodeId, 'issue.nodeId')
  v.requireScene(
    nodeId === `bbmodel_node_${node}`,
    'issue.nodeId',
    'Identidade de peça inconsistente.',
  )
  const target = context.nodes.get(nodeId)!
  if (code === 'export-flag-discarded')
    bbmodelReportChoice(context.options.hierarchy.exportFlags === 'discard')
  if (code === 'group-visibility-inherited' || code === 'group-lock-inherited') {
    bbmodelReportChoice(context.options.hierarchy.groupFlags === 'inherit')
    v.requireScene(
      target.kind === 'group' &&
        (code === 'group-visibility-inherited' ? target.hidden : target.locked),
      'issue.nodeId',
      'O estado do grupo não corresponde ao relatório.',
    )
  }
  return { code, node, nodeId, path: bbmodelReportPath(row.path) }
}

export function readBbmodelGeometryIssue(
  raw: unknown,
  context: BbmodelReportContext,
): BbmodelGeometryIssue {
  const row = v.record(raw, 'issue.detail', ['code', 'path', 'node', 'geometryId', 'count']),
    code = codeOf(row.code, {
      'undrawn-degenerate-faces': true,
      'undrawn-self-intersection-faces': true,
      'undrawn-precision-faces': true,
    } satisfies Record<BbmodelGeometryIssue['code'], true>),
    node = bbmodelReportNode(row.node, context),
    geometryId = v.id(row.geometryId, 'issue.geometryId'),
    geometry = context.geometries.get(geometryId),
    target = context.nodes.get(`bbmodel_node_${node}`)!
  v.requireScene(
    geometryId === `bbmodel_geometry_${node}` &&
      geometry?.kind === 'mesh' &&
      target.kind === 'mesh' &&
      target.geometryId === geometryId,
    'issue.geometryId',
    'A geometria não corresponde à peça relatada.',
  )
  return {
    code,
    node,
    geometryId,
    path: bbmodelReportPath(row.path),
    count: bbmodelReportCount(row.count, context.faceCounts.get(geometryId)!),
  }
}

export function readBbmodelSurfaceIssue(
  raw: unknown,
  context: BbmodelReportContext,
): BbmodelSurfaceIssue {
  const row = v.record(raw, 'issue.detail'),
    code = codeOf(row.code, {
      'native-flat-normals': true,
      'render-order-discarded': true,
      'seam-labels-discarded': true,
      'cube-shade-discarded': true,
      'outside-frame-uv-clamped': true,
    } satisfies Record<BbmodelSurfaceIssue['code'], true>),
    node = bbmodelReportNode(row.node, context),
    path = bbmodelReportPath(row.path),
    base = { node, path },
    target = context.nodes.get(`bbmodel_node_${node}`)!
  v.requireScene(
    target.kind === 'mesh',
    'issue.node',
    'A superfície precisa pertencer a uma peça de geometria.',
  )
  switch (code) {
    case 'native-flat-normals': {
      v.record(row, 'issue.detail', ['code', 'node', 'path', 'count', 'source'])
      bbmodelReportChoice(context.options.surfaces.normals === 'molda-flat')
      const geometry = context.geometries.get(target.geometryId)
      v.requireScene(geometry?.kind === 'mesh', 'issue.node', 'Malha nativa esperada.')
      const source = v.choice(row.source, ['cube', 'flat', 'smooth'], 'issue.source'),
        faces = context.faceCounts.get(target.geometryId)!,
        count = bbmodelReportCount(row.count, faces, 0)
      v.requireScene(
        count > 0 || (source === 'smooth' && faces === 0),
        'issue.count',
        'A configuração vazia relatada não corresponde à superfície.',
      )
      return { ...base, code, source, count }
    }
    case 'render-order-discarded':
      v.record(row, 'issue.detail', ['code', 'node', 'path', 'source'])
      bbmodelReportChoice(context.options.surfaces.renderOrder === 'discard')
      return { ...base, code, source: v.choice(row.source, ['behind', 'in_front'], 'issue.source') }
    case 'cube-shade-discarded':
      v.record(row, 'issue.detail', ['code', 'node', 'path', 'source'])
      bbmodelReportChoice(context.options.surfaces.cubeShade === 'discard')
      v.requireScene(row.source === false, 'issue.source', 'Marca de cubo incorreta.')
      return { ...base, code, source: false }
    case 'seam-labels-discarded':
      v.record(row, 'issue.detail', ['code', 'node', 'path', 'count'])
      bbmodelReportChoice(context.options.surfaces.seamLabels === 'discard')
      return {
        ...base,
        code,
        count: bbmodelReportCount(row.count, BBMODEL_INPUT_LIMITS.geometrySeams),
      }
    case 'outside-frame-uv-clamped':
      v.record(row, 'issue.detail', ['code', 'node', 'path', 'count'])
      bbmodelReportChoice(context.options.surfaces.outsideFrameUvs === 'clamp')
      return {
        ...base,
        code,
        count: bbmodelReportCount(row.count, BBMODEL_INPUT_LIMITS.geometryCorners),
      }
  }
}
