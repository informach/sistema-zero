/** QA-only acceptance; clocks are measured in milliseconds within one generation. */
export const ACCEPTANCE_PLAY_MS = 600_000
export function performanceWindow(raw: string | undefined) {
  const milliseconds = raw === undefined ? ACCEPTANCE_PLAY_MS : Number(raw)
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 1000 || milliseconds > 3_600_000)
    throw new Error('Invalid performance window')
  return {
    milliseconds,
    qualification: milliseconds >= ACCEPTANCE_PLAY_MS ? 'acceptance' : 'diagnostic',
  }
}
export const p95 = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1]!
export interface CausalInput {
  id: number
  key: string
  at: number
}
export interface CausalPresentation extends CausalInput {
  observedAt: number
}
export function causalLatencies(inputs: CausalInput[], presentations: CausalPresentation[]) {
  if (!inputs.length || inputs.length > 30 || inputs.length !== presentations.length)
    throw new Error('Missing causal presentation')
  return inputs.map((input, index) => {
    const shown = presentations[index]!
    if (
      input.id !== index + 1 ||
      shown.id !== input.id ||
      shown.key !== input.key ||
      !['Left', 'Right', 'Up', 'click'].includes(input.key) ||
      !Number.isFinite(input.at) ||
      input.at < 0 ||
      !Number.isFinite(shown.observedAt) ||
      !Number.isFinite(shown.at) ||
      shown.observedAt < input.at ||
      shown.at < shown.observedAt ||
      (index > 0 &&
        (input.at <= inputs[index - 1]!.at || shown.observedAt < presentations[index - 1]!.at))
    )
      throw new Error('Invalid causal order or identity')
    return shown.at - input.at
  })
}
export interface F1Series {
  identity: {
    project: string
    browser: string
    kind: string
    distribution: string
    release?: string
    network: string
    workload: string
  }
  repetition: number
  coldResetVerified: boolean
  failed: boolean
  samples: { phase: string; milliseconds: number }[]
}
export function qualifyF1(series: F1Series[]) {
  const reasons: string[] = []
  const groups = new Map<string, F1Series[]>()
  for (const row of series) {
    const { project, browser, kind, distribution, network, workload } = row.identity
    if (
      !project ||
      !browser ||
      !['classic', 'pro'].includes(kind) ||
      !/^[a-f0-9]{64}$/.test(distribution) ||
      !network ||
      workload !== 'f1' ||
      !Number.isSafeInteger(row.repetition) ||
      row.repetition < 0
    ) {
      reasons.push('invalid-identity')
      continue
    }
    if (!row.coldResetVerified) reasons.push('cold-reset-unverified')
    if (row.failed) reasons.push('failed-sample')
    const key = JSON.stringify([project, kind])
    const rows = groups.get(key) ?? []
    rows.push(row)
    groups.set(key, rows)
  }
  const summaries = [...groups].map(([key, rows]) => {
    const identities = new Set(
      rows.map(({ identity }) =>
        JSON.stringify([
          identity.project,
          identity.browser,
          identity.kind,
          identity.distribution,
          identity.release ?? null,
          identity.network,
          identity.workload,
        ]),
      ),
    )
    if (identities.size !== 1) reasons.push('mixed-identity')
    const repetitions = new Set(rows.map((row) => row.repetition))
    if (repetitions.size !== rows.length) reasons.push('duplicate-repetition')
    const phases = Object.entries({ cold: 12000, cached: 3000, edited: 1500 }).map(
      ([phase, limit]) => {
        const values: number[] = []
        for (const row of rows) {
          const samples = row.samples.filter((sample) => sample.phase === phase)
          if (
            samples.length !== 1 ||
            !Number.isFinite(samples[0]?.milliseconds) ||
            samples[0]!.milliseconds < 0
          )
            reasons.push('invalid-phase')
          else values.push(samples[0]!.milliseconds)
          if (row.samples.length !== 3) reasons.push('invalid-phase-count')
        }
        const measured = values.length ? p95(values) : null
        if (values.length < 30) reasons.push('insufficient-samples')
        if (measured !== null && measured > limit) reasons.push('p95-exceeded')
        return { phase, count: values.length, p95: measured, limit }
      },
    )
    return { key, identity: rows[0]!.identity, phases }
  })
  if (!groups.size) reasons.push('missing-series')
  return {
    qualification: 'local-F1-budget-only',
    noReferenceAcceptance: true,
    passesBudget: reasons.length === 0,
    reasons: [...new Set(reasons)],
    summaries,
  }
}
