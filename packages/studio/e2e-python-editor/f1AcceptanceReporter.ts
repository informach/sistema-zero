import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter'
import { verifyStudioPythonDeployment } from '@sistemazero/core/studio/python-runtime-distribution'
import { z } from 'zod'
import { type F1Series, qualifyF1 } from '../e2e-runtime/performanceAcceptance'
import { PYTHON_BOOT_CACHE_PREFIX } from '../src/runtime/python/bootResourceManifest'

// Read the versioned candidate pin without importing Bun's build tooling into Node/Playwright.
const candidatePin = z
  .object({
    input: z.object({
      distribution: z.object({
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    }),
  })
  .parse(
    JSON.parse(
      readFileSync(
        new URL(
          '../../../docs/superpowers/plans/2026-10-22-python-current-candidate/canonical-plan.json',
          import.meta.url,
        ),
        'utf8',
      ),
    ),
  ).input.distribution.sha256

const Evidence = z.object({
  browser: z.string().min(1),
  kind: z.enum(['classic', 'pro']),
  workload: z.literal('F1: 2 turtles, 200 movement calls, no external assets'),
  repetition: z.number().int().nonnegative(),
  cpuProfiling: z.literal(false),
  failure: z.unknown().optional(),
  distribution: z.object({ hash: z.string(), release: z.unknown(), manifest: z.unknown() }),
  httpCacheReset: z.literal(true),
  coldCacheReset: z.object({ name: z.string().min(1), existed: z.boolean(), removed: z.boolean() }),
  samples: z
    .array(
      z.object({
        phase: z.string(),
        milliseconds: z.number(),
        network: z
          .object({ bytesPerSecond: z.literal(2_500_000), responseDelayMs: z.literal(80) })
          .nullable(),
        networkError: z.never().optional(),
      }),
    )
    .max(3),
})

/** Match Playwright's config-relative outputDir even when invoked from the repository root. */
export function f1OutputDirectory(value = process.env.PYTHON_LIVE_OUTPUT_DIR) {
  return resolve(
    fileURLToPath(new URL('../', import.meta.url)),
    value ?? '../../.cache/studio-python-live-results',
  )
}

/** Validates the actual pinned deployment and cache/network provenance, not just a SHA-shaped label. */
export async function f1SeriesFromEvidence(
  raw: unknown,
  project: string,
  status: TestResult['status'],
  pins: {
    distribution: string
    release?: string
  } = { distribution: candidatePin },
): Promise<F1Series> {
  const value = Evidence.parse(raw)
  const deployment = await verifyStudioPythonDeployment({
    release: value.distribution.release,
    distribution: value.distribution.manifest,
  })
  const expectedDistribution = pins.distribution
  if (
    !/^[a-f0-9]{64}$/.test(expectedDistribution) ||
    value.distribution.hash !== expectedDistribution ||
    deployment.distributionSha256 !== expectedDistribution
  )
    throw new Error('F1 distribution differs from the qualification pin.')
  const expectedRelease = pins.release
  if (expectedRelease !== undefined && deployment.release.manifestSha256 !== expectedRelease)
    throw new Error('F1 release differs from the qualification pin.')
  const cacheName = value.coldCacheReset.name
  if (
    !cacheName.startsWith(PYTHON_BOOT_CACHE_PREFIX) ||
    !cacheName.endsWith(`:${deployment.release.manifestSha256}`)
  )
    throw new Error('F1 reset names a different runtime generation.')
  const networks = value.samples.map((sample) => JSON.stringify(sample.network))
  return {
    identity: {
      project,
      browser: value.browser,
      kind: value.kind,
      distribution: deployment.distributionSha256,
      release: deployment.release.manifestSha256,
      network: networks[0] ?? 'missing',
      workload: 'f1',
    },
    repetition: value.repetition,
    coldResetVerified: value.coldCacheReset.existed === value.coldCacheReset.removed,
    failed: status !== 'passed' || value.failure !== undefined || new Set(networks).size !== 1,
    samples: value.samples,
  }
}

/** Enabled only for the F1 workload. Each selected project/kind needs its full series. */
export default class F1AcceptanceReporter implements Reporter {
  private readonly pending: Promise<void>[] = []
  private readonly series: F1Series[] = []
  private readonly pins = {
    distribution: process.env.PYTHON_PROBE_DISTRIBUTION_SHA256 ?? candidatePin,
    release: process.env.PYTHON_PROBE_RELEASE_MANIFEST_SHA256,
  }
  private readonly invalid: {
    title: string
    status: string
    reason: string
    evidence?: unknown
  }[] = []
  onTestEnd(test: TestCase, result: TestResult) {
    if (!test.title.startsWith('diagnostic live ')) return
    this.pending.push(this.collect(test, result))
  }
  private async collect(test: TestCase, result: TestResult) {
    let evidence: unknown
    try {
      const attachments = result.attachments.filter(
        (item) => item.name === 'live-startup-diagnostic',
      )
      if (attachments.length !== 1) throw new Error('Missing or duplicate F1 evidence')
      const attachment = attachments[0]!
      const raw = attachment.body ?? (attachment.path ? await readFile(attachment.path) : undefined)
      if (!raw) throw new Error('Missing F1 evidence bytes')
      evidence = JSON.parse(raw.toString('utf8'))
      this.series.push(
        await f1SeriesFromEvidence(evidence, test.parent.project()!.name, result.status, this.pins),
      )
    } catch (error) {
      this.invalid.push({
        title: test.title,
        status: result.status,
        reason: error instanceof Error ? error.message : 'Unknown invalid evidence',
        evidence,
      })
    }
  }
  async onEnd(result: FullResult) {
    await Promise.all(this.pending)
    const gate = qualifyF1(this.series)
    if (this.invalid.length) {
      gate.passesBudget = false
      gate.reasons.push('invalid-or-missing-evidence')
    }
    const directory = f1OutputDirectory()
    await mkdir(directory, { recursive: true })
    const payload = JSON.stringify(
      {
        ...gate,
        pins: this.pins,
        invalidEvidence: this.invalid,
        runnerStatus: result.status,
        series: this.series,
        seriesSha256: createHash('sha256').update(JSON.stringify(this.series)).digest('hex'),
      },
      null,
      2,
    )
    // Persist negative samples and reasons before setting the runner's final status.
    await writeFile(
      resolve(directory, `f1-local-budget-${process.pid}-${Date.now()}.json`),
      payload,
      { flag: 'wx' },
    )
    return {
      status:
        gate.passesBudget && result.status === 'passed' ? ('passed' as const) : ('failed' as const),
    }
  }
}
