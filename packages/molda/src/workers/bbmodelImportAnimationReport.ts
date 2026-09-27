import { assessBbmodelAnimationBounds } from '../import/bbmodelAnimationBounds'
import type { BbmodelClipPlanReport } from '../import/bbmodelClipPlanTypes'
import type { BbmodelConversionAnimations } from '../import/bbmodelConversionReport'
import { BBMODEL_INPUT_LIMITS as limits } from '../import/bbmodelInput'
import type { BbmodelNativeClipReport } from '../import/bbmodelNativeClipTypes'
import { BbmodelReportBudget } from '../import/bbmodelReportLimits'
import type { MoldaSceneDocument } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import * as v from '../scene/validation'
import { bbmodelAnimationReportReader } from './bbmodelImportAnimationProblems'
import type { BbmodelReportContext } from './bbmodelImportReportValues'

/** Validates transport, policies and native consistency, not equivalence to executing the source app. */
export function readBbmodelImportAnimations(
  raw: unknown,
  document: MoldaSceneDocument,
  context: BbmodelReportContext,
): BbmodelConversionAnimations | null {
  const at = 'report.animations',
    nativeClips = document.animations ?? [],
    require = (condition: unknown) =>
      v.requireScene(condition, at, 'Relatório de movimentos inconsistente.')
  if (context.options.remainder.animations !== 'convert') {
    require(raw === null && nativeClips.length === 0)
    return null
  }
  const row = v.record(raw, at, [
      'source',
      'conversions',
      'policy',
      'counts',
      'sourceCounts',
      'keyCounts',
      'bindingCounts',
      'bounds',
    ]),
    policy = { ...context.options.clips },
    rawPolicy = v.record(row.policy, at, Object.keys(policy)),
    budget = new BbmodelReportBudget(),
    { count, text, path, number, problem } = bbmodelAnimationReportReader(context, budget)
  for (const [key, value] of Object.entries(policy)) require(rawPolicy[key] === value)
  const sc = v.record(row.sourceCounts, at, [
      'clips',
      'animators',
      'keys',
      'dataPoints',
      'markers',
      'metadataChars',
    ]),
    sourceCounts = {
      clips: count(sc.clips, limits.animations),
      animators: count(sc.animators, limits.animationAnimators),
      keys: count(sc.keys, limits.animationKeys),
      dataPoints: count(sc.dataPoints, limits.animationDataPoints),
      markers: count(sc.markers, limits.animationMarkers),
      metadataChars: count(sc.metadataChars, limits.animationMetadataChars),
    },
    kc = v.record(row.keyCounts, at, [
      'transformAnimators',
      'unresolvedAnimators',
      'transformKeys',
      'unresolvedKeys',
      'points',
      'textChars',
    ]),
    keyCounts = {
      transformAnimators: count(kc.transformAnimators, sourceCounts.animators),
      unresolvedAnimators: count(kc.unresolvedAnimators, sourceCounts.animators),
      transformKeys: count(kc.transformKeys, sourceCounts.keys),
      unresolvedKeys: count(kc.unresolvedKeys, sourceCounts.keys),
      points: count(kc.points, sourceCounts.dataPoints),
      textChars: count(kc.textChars, limits.animationKeyTextChars),
    },
    bc = v.record(row.bindingCounts, at, ['bound', 'unresolved', 'conflicting', 'omittedTargets']),
    bindingCounts = {
      bound: count(bc.bound, sourceCounts.animators),
      unresolved: count(bc.unresolved, sourceCounts.animators),
      conflicting: count(bc.conflicting, sourceCounts.animators),
      omittedTargets: count(bc.omittedTargets, sourceCounts.animators),
    }
  require(keyCounts.transformAnimators + keyCounts.unresolvedAnimators === sourceCounts.animators)
  require(keyCounts.transformKeys + keyCounts.unresolvedKeys === sourceCounts.keys)
  require(
    bindingCounts.bound + bindingCounts.unresolved + bindingCounts.conflicting ===
      sourceCounts.animators,
  )
  require(bindingCounts.omittedTargets <= bindingCounts.bound + bindingCounts.conflicting)
  require(
    sourceCounts.dataPoints >= sourceCounts.keys && keyCounts.points >= keyCounts.transformKeys,
  )
  require(sourceCounts.clips === 0 || policy.adaptation === 'continuous-sampled')
  const uuids = new Set<string>(),
    source = v.list(row.source, at, sourceCounts.clips).map((raw, index): BbmodelClipPlanReport => {
      const item = v.record(raw, at),
        kind = v.choice(item.kind, ['prepared', 'omitted'], at),
        base = {
          clip: count(item.clip, sourceCounts.clips - 1),
          path: path(item.path),
          sourceUuid: text(item.sourceUuid),
          sourceName:
            item.sourceName === null ? null : text(item.sourceName, limits.identifierChars, true),
        },
        fields = ['clip', 'path', 'sourceUuid', 'sourceName', 'kind']
      require(
        base.clip === index && base.path === `animations[${index}]` && !uuids.has(base.sourceUuid),
      )
      uuids.add(base.sourceUuid)
      if (kind === 'omitted') {
        v.record(item, at, [...fields, 'problem'])
        require(policy.unresolved === 'omit-clip')
        const issue = problem(item.problem)
        require(
          issue.path === base.path ||
            issue.path.startsWith(`${base.path}.`) ||
            issue.path.startsWith(`${base.path}[`),
        )
        if (issue.code === 'metadata' || issue.code === 'unmapped')
          require(policy[issue.code] === 'reject')
        if (issue.code === 'pre-post') require(policy.discontinuities === 'reject')
        if (issue.code === 'duration') require(policy.duration === 'declared' && issue.value <= 0)
        return { ...base, kind, problem: issue }
      }
      v.record(item, at, [
        ...fields,
        'duration',
        'playback',
        'weight',
        'metadataFields',
        'unmappedFields',
        'firstMetadataPath',
        'firstUnmappedPath',
        'markers',
        'nameReferences',
        'emptyAnimators',
      ])
      const d = v.record(item.duration, at, ['mode', 'source', 'native']),
        p = v.record(item.playback, at, ['source', 'nativeLoop', 'standalone']),
        w = v.record(item.weight, at, ['value', 'defaulted', 'clamped']),
        duration = {
          mode: v.choice(d.mode, ['declared', 'fit-keys'], at),
          source: number(d.source),
          native: v.number(d.native, at, Number.MIN_VALUE, SCENE_LIMITS.animationSeconds),
        },
        playback = {
          source: v.choice(p.source, ['once', 'hold', 'loop'], at),
          nativeLoop: v.boolean(p.nativeLoop, at),
          standalone: true as const,
        },
        weight = {
          value: v.number(w.value, at, 0),
          defaulted: v.boolean(w.defaulted, at),
          clamped: v.boolean(w.clamped, at),
        },
        metadataFields = count(item.metadataFields, limits.jsonStructure),
        unmappedFields = count(item.unmappedFields, limits.jsonStructure),
        firstMetadataPath = item.firstMetadataPath === null ? null : path(item.firstMetadataPath),
        firstUnmappedPath = item.firstUnmappedPath === null ? null : path(item.firstUnmappedPath),
        markers = count(item.markers, sourceCounts.markers),
        nameReferences = count(item.nameReferences, sourceCounts.animators),
        emptyAnimators = count(item.emptyAnimators, sourceCounts.animators)
      require(
        duration.mode === policy.duration &&
          (duration.mode !== 'declared' || duration.source === duration.native),
      )
      require(p.standalone === true && playback.nativeLoop === (playback.source === 'loop'))
      require(!weight.defaulted || (weight.value === 1 && !weight.clamped))
      require(!weight.clamped || weight.value === 0)
      require(metadataFields === 0 || policy.metadata === 'discard')
      require(unmappedFields === 0 || policy.unmapped === 'discard')
      require(
        (metadataFields === 0) === (firstMetadataPath === null) &&
          (unmappedFields === 0) === (firstUnmappedPath === null),
      )
      for (const location of [firstMetadataPath, firstUnmappedPath])
        require(
          location === null ||
            location.startsWith(`${base.path}.`) ||
            location.startsWith(`${base.path}[`),
        )
      require(markers === 0 || metadataFields > 0)
      require(nameReferences === 0 || policy.nameReferences === 'unique-name')
      return {
        ...base,
        kind,
        duration,
        playback,
        weight,
        metadataFields,
        unmappedFields,
        firstMetadataPath,
        firstUnmappedPath,
        markers,
        nameReferences,
        emptyAnimators,
      }
    })
  require(source.length === sourceCounts.clips)
  const prepared = source.filter((item) => item.kind === 'prepared'),
    rawConversions = v.list(row.conversions, at, SCENE_LIMITS.animationClips)
  require(prepared.length === nativeClips.length && rawConversions.length === prepared.length)
  // Global header preflight before descending into any track report.
  let plannedTracks = 0
  for (const raw of rawConversions) {
    const item = v.record(raw, at)
    v.requireScene(Array.isArray(item.tracks), at, 'Lista de trilhas esperada.')
    plannedTracks += item.tracks.length
    require(plannedTracks <= SCENE_LIMITS.animationTracks)
  }
  let totalKeys = 0,
    totalSourceKeys = 0,
    totalPrePost = 0
  const conversions = rawConversions.map((raw, index): BbmodelNativeClipReport => {
    const item = v.record(raw, at, [
        'clip',
        'clipId',
        'path',
        'nameChange',
        'duration',
        'fps',
        'loop',
        'weight',
        'catmullLoopNeighbours',
        'tracks',
      ]),
      planned = prepared[index],
      native = nativeClips[index]
    if (!planned || !native) throw new Error('Missing checked animation correspondence')
    const clip = count(item.clip, sourceCounts.clips - 1),
      clipId = text(item.clipId),
      location = path(item.path),
      duration = v.number(item.duration, at, Number.MIN_VALUE, SCENE_LIMITS.animationSeconds),
      fps = count(item.fps, 120, 1),
      loop = v.boolean(item.loop, at),
      weight = v.number(item.weight, at, 0),
      catmullLoopNeighbours = v.boolean(item.catmullLoopNeighbours, at),
      nameChange =
        item.nameChange === null
          ? null
          : v.choice(item.nameChange, ['name-generated', 'name-shortened'], at)
    require(
      clip === planned.clip &&
        clipId === `bbmodel_clip_${clip}` &&
        native.id === clipId &&
        location === planned.path,
    )
    require(
      duration === native.duration &&
        duration === planned.duration.native &&
        fps === policy.fps &&
        native.fps === fps,
    )
    require(
      loop === native.loop &&
        loop === planned.playback.nativeLoop &&
        weight === planned.weight.value,
    )
    require(!catmullLoopNeighbours && native.space === 'local')
    const tracks = v.list(item.tracks, at, native.tracks.length).map((raw, trackIndex) => {
      const r = v.record(raw, at, [
          'path',
          'nodeId',
          'channel',
          'sampling',
          'sourceKeys',
          'keys',
          'prePostKeys',
          'reordered',
          'migration',
          'underflowComponents',
          'zeroScaleComponents',
        ]),
        track = native.tracks[trackIndex]
      if (!track) throw new Error('Missing checked native animation track')
      const channel = v.choice(r.channel, ['position', 'rotation', 'scale'], at),
        nodeId = text(r.nodeId),
        location = path(r.path),
        sampling = v.choice(r.sampling, ['authored', 'grid'], at),
        sourceKeys = count(r.sourceKeys, keyCounts.transformKeys, 1),
        keys = count(r.keys, SCENE_LIMITS.animationKeys, 1),
        prePostKeys = count(r.prePostKeys, sourceKeys),
        reordered = v.boolean(r.reordered, at),
        m = v.record(r.migration, at, ['pointAxes', 'bezierValueAxes']),
        migration = {
          pointAxes: count(m.pointAxes, sourceKeys * 4),
          bezierValueAxes: count(m.bezierValueAxes, sourceKeys * 4),
        },
        underflowComponents = count(r.underflowComponents, keys * (channel === 'rotation' ? 4 : 3)),
        zeroScaleComponents = count(r.zeroScaleComponents, channel === 'scale' ? keys * 3 : 0)
      require(track.nodeId === nodeId && context.nodes.get(nodeId)?.kind === 'group')
      require(track.channel === (channel === 'position' ? 'translation' : channel))
      require(location.startsWith(`${planned.path}.animators[`) && location.endsWith(`.${channel}`))
      require(keys === track.keys.length)
      require(prePostKeys === 0 || (policy.discontinuities === 'sample-pre' && sampling === 'grid'))
      require(zeroScaleComponents === 0 || policy.zeroScale !== 'reject')
      require(
        context.source.version !== '5.0' ||
          (migration.pointAxes === 0 && migration.bezierValueAxes === 0),
      )
      for (const key of track.keys) {
        require(key.interpolation === 'step' || key.interpolation === 'linear')
        for (const component of key.value) require(Number.isFinite(Math.fround(component)))
      }
      totalKeys += keys
      totalSourceKeys += sourceKeys
      totalPrePost += prePostKeys
      return {
        path: location,
        nodeId,
        channel,
        sampling,
        sourceKeys,
        keys,
        prePostKeys,
        reordered,
        migration,
        underflowComponents,
        zeroScaleComponents,
      }
    })
    require(tracks.length === native.tracks.length)
    return {
      clip,
      clipId,
      path: location,
      nameChange,
      duration,
      fps,
      loop,
      weight,
      catmullLoopNeighbours,
      tracks,
    }
  })
  require(
    totalSourceKeys <= keyCounts.transformKeys &&
      totalPrePost <= keyCounts.points - keyCounts.transformKeys,
  )
  const c = v.record(row.counts, at, ['clips', 'tracks', 'keys']),
    counts = {
      clips: count(c.clips, SCENE_LIMITS.animationClips),
      tracks: count(c.tracks, SCENE_LIMITS.animationTracks),
      keys: count(c.keys, SCENE_LIMITS.animationKeys),
    }
  require(
    counts.clips === conversions.length &&
      counts.tracks === plannedTracks &&
      counts.keys === totalKeys,
  )
  // Recompute on the validated native candidate, without sampling source curves or reading files.
  const calculated = assessBbmodelAnimationBounds(
      document.nodes,
      document.geometries.map((geometry) => {
        v.requireScene(geometry.kind === 'mesh', at, 'Malha esperada.')
        return geometry
      }),
      nativeClips,
    ),
    bounds = v.list(row.bounds, at, calculated.length).map((raw, index) => {
      const r = v.record(raw, at, [
          'clipId',
          'method',
          'nodes',
          'maximumScaleBound',
          'maximumTranslationBound',
          'maximumPointBound',
        ]),
        expected = calculated[index]
      if (!expected) throw new Error('Missing checked animation bounds')
      for (const [key, value] of Object.entries(expected)) require(r[key] === value)
      return { ...expected }
    })
  require(bounds.length === calculated.length)
  const result = {
    source,
    conversions,
    policy,
    counts,
    sourceCounts,
    keyCounts,
    bindingCounts,
    bounds,
  }
  new BbmodelReportBudget().addText(result)
  return result
}
