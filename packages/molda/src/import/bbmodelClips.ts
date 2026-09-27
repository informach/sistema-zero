import { type BbmodelClipContext, planBbmodelClips } from './bbmodelClipPlan'
import type { BbmodelClipOptions } from './bbmodelClipPlanTypes'
import { convertBbmodelPreparedClips } from './bbmodelNativeClips'
import { BbmodelReportBudget } from './bbmodelReportLimits'

/** Source compatibility + native sampling, without document/worker adoption or world bounds. */
export function convertBbmodelClips(context: BbmodelClipContext, options: BbmodelClipOptions = {}) {
  const planned = planBbmodelClips(context, options),
    { adaptation, discontinuities, zeroScale } = planned.policy,
    native = convertBbmodelPreparedClips(planned.drafts, {
      adaptation,
      discontinuities,
      zeroScale,
    }),
    report = {
      source: planned.reports,
      conversions: native.reports,
      policy: planned.policy,
      counts: native.counts,
      sourceCounts: planned.sourceCounts,
      keyCounts: planned.keyCounts,
      bindingCounts: planned.bindingCounts,
    }
  // This is the report only, not the animated document. Its entire shape counts as text.
  // The final import collector must also count it with all other import stages.
  new BbmodelReportBudget().addText(report)
  return { animations: native.animations, report }
}
