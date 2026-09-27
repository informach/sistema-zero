import type { BbmodelAnimationBinding } from '../import/bbmodelAnimationBindingTypes'
import type { BbmodelAnimationTrackIssue } from '../import/bbmodelAnimationTrackTypes'
import type { BbmodelClipProblem } from '../import/bbmodelClipPlanTypes'
import { BBMODEL_INPUT_LIMITS as limits } from '../import/bbmodelInput'
import type { BbmodelReportBudget } from '../import/bbmodelReportLimits'
import * as v from '../scene/validation'
import type { BbmodelReportContext } from './bbmodelImportReportValues'
import { readNativeImportReportCode as codeOf } from './nativeImportReport'

/** Closed diagnostic readers; never traverse/copy an unknown source payload. */
export function bbmodelAnimationReportReader(
  context: BbmodelReportContext,
  budget: BbmodelReportBudget,
) {
  const at = 'report.animations',
    count = (raw: unknown, maximum: number, minimum = 0) =>
      v.number(raw, at, minimum, maximum, true),
    text = (raw: unknown, maximum: number = limits.identifierChars, empty = false) => {
      const result = v.text(raw, at, maximum, empty)
      budget.addText(result)
      return result
    },
    path = (raw: unknown) => text(raw, 65536),
    node = (raw: unknown) => count(raw, context.source.nodes - 1),
    key = (raw: unknown) => count(raw, limits.animationKeys - 1),
    point = (raw: unknown) => count(raw, limits.animationPointsPerKey - 1),
    // Reports describe source values too: preserve the sign of zero, unlike native authoring values.
    number = (raw: unknown) => {
      v.requireScene(typeof raw === 'number' && Number.isFinite(raw), at, 'Número finito esperado.')
      return raw
    }
  function binding(raw: unknown): BbmodelAnimationBinding {
    const row = v.record(raw, at),
      kind = v.choice(row.kind, ['bound', 'conflict', 'unresolved'], at),
      base = {
        animator: count(row.animator, limits.animationAnimators - 1),
        path: path(row.path),
        reference: text(row.reference),
      },
      fields = ['animator', 'path', 'reference', 'kind']
    if (kind !== 'unresolved') {
      v.record(row, at, [
        ...fields,
        'node',
        'selected',
        'via',
        ...(kind === 'conflict' ? ['count'] : []),
      ])
      const result = {
        ...base,
        node: node(row.node),
        selected: v.boolean(row.selected, at),
        via: v.choice(row.via, ['uuid', 'key-name', 'declared-name'], at),
      }
      v.requireScene(
        result.selected === context.nodes.has(`bbmodel_node_${result.node}`),
        at,
        'Seleção do vínculo inconsistente.',
      )
      v.requireScene(
        kind !== 'bound' || !result.selected,
        at,
        'Um vínculo válido não é motivo de omissão.',
      )
      return kind === 'bound'
        ? { ...result, kind }
        : { ...result, kind, count: count(row.count, limits.animationAnimators, 2) }
    }
    v.record(row, at, [...fields, 'detail'])
    const detail = v.record(row.detail, at),
      code = codeOf(detail.code, {
        'animator-type': true,
        'missing-target': true,
        'target-type': true,
        'name-reference-rejected': true,
        'ambiguous-name': true,
      } satisfies Record<
        Extract<BbmodelAnimationBinding, { kind: 'unresolved' }>['detail']['code'],
        true
      >)
    switch (code) {
      case 'animator-type':
        v.record(detail, at, ['code', 'type'])
        return {
          ...base,
          kind,
          detail: { code, type: detail.type === null ? null : text(detail.type) },
        }
      case 'missing-target':
        v.record(detail, at, ['code'])
        return { ...base, kind, detail: { code } }
      case 'target-type':
        v.record(detail, at, ['code', 'node'])
        return { ...base, kind, detail: { code, node: node(detail.node) } }
      case 'name-reference-rejected':
      case 'ambiguous-name': {
        v.record(detail, at, ['code', 'via', ...(code === 'ambiguous-name' ? ['count'] : [])])
        const via = v.choice(detail.via, ['key-name', 'declared-name'], at)
        return {
          ...base,
          kind,
          detail:
            code === 'ambiguous-name'
              ? { code, via, count: count(detail.count, context.source.nodes, 2) }
              : { code, via },
        }
      }
    }
  }
  function track(raw: unknown): BbmodelAnimationTrackIssue {
    const row = v.record(raw, at),
      code = codeOf(row.code, {
        'unsupported-channel': true,
        interpolation: true,
        'point-count': true,
        'duplicate-time': true,
        'legacy-data-points': true,
        'legacy-bezier-pair': true,
        'legacy-literal-rewrite': true,
        'legacy-shadowed-value': true,
        constant: true,
      } satisfies Record<BbmodelAnimationTrackIssue['code'], true>),
      location = path(row.path)
    if (code === 'unsupported-channel') {
      v.record(row, at, ['code', 'path'])
      return { code, path: location }
    }
    const base = { code, path: location, key: key(row.key) },
      fields = ['code', 'path', 'key']
    switch (code) {
      case 'interpolation':
        v.record(row, at, [...fields, 'interpolation'])
        return { ...base, code, interpolation: text(row.interpolation) }
      case 'point-count':
        v.record(row, at, [...fields, 'count'])
        return { ...base, code, count: count(row.count, limits.animationPointsPerKey, 3) }
      case 'duplicate-time':
        v.record(row, at, [...fields, 'otherKey', 'time'])
        return { ...base, code, otherKey: key(row.otherKey), time: number(row.time) }
      case 'legacy-data-points':
      case 'legacy-bezier-pair':
        v.record(row, at, fields)
        return { ...base, code }
      case 'legacy-literal-rewrite':
      case 'legacy-shadowed-value':
        v.record(row, at, [...fields, 'point', 'axis'])
        return { ...base, code, point: point(row.point), axis: v.choice(row.axis, ['x', 'y'], at) }
      case 'constant': {
        v.record(row, at, [...fields, 'issues'])
        const issues = v.list(row.issues, at, 6).map((raw) => {
          const item = v.record(raw, at, ['code', 'path', 'point', 'axis'])
          return {
            code: v.choice(item.code, ['expression', 'literal-overflow', 'literal-underflow'], at),
            path: path(item.path),
            point: count(item.point, 1),
            axis: v.choice(item.axis, ['x', 'y', 'z'], at),
          }
        })
        v.requireScene(issues.length > 0, at, 'Falta o motivo da constante recusada.')
        return { ...base, code, issues }
      }
    }
  }
  function problem(raw: unknown): BbmodelClipProblem {
    const row = v.record(raw, at),
      code = codeOf(row.code, {
        binding: true,
        'animator-mode': true,
        channel: true,
        track: true,
        timing: true,
        weight: true,
        loop: true,
        duration: true,
        'pre-post': true,
        metadata: true,
        unmapped: true,
      } satisfies Record<BbmodelClipProblem['code'], true>),
      location = path(row.path),
      fields = ['code', 'path']
    switch (code) {
      case 'binding':
        v.record(row, at, [...fields, 'binding'])
        return { code, path: location, binding: binding(row.binding) }
      case 'animator-mode':
        v.record(row, at, [...fields, 'mode'])
        return {
          code,
          path: location,
          mode: v.choice(row.mode, ['global', 'quaternion', 'unsupported-type'], at),
        }
      case 'channel':
        v.record(row, at, [...fields, 'channel'])
        return { code, path: location, channel: text(row.channel) }
      case 'track':
        v.record(row, at, [...fields, 'issue'])
        return { code, path: location, issue: track(row.issue) }
      case 'weight':
        v.record(row, at, [...fields, 'reason'])
        return {
          code,
          path: location,
          reason: v.choice(row.reason, ['expression', 'overflow', 'underflow'], at),
        }
      case 'loop':
        v.record(row, at, [...fields, 'value'])
        return { code, path: location, value: text(row.value) }
      case 'duration':
        v.record(row, at, [...fields, 'value'])
        return { code, path: location, value: number(row.value) }
      case 'timing':
      case 'pre-post':
      case 'metadata':
      case 'unmapped':
        v.record(row, at, fields)
        return { code, path: location }
    }
  }
  return { count, text, path, number, problem }
}
