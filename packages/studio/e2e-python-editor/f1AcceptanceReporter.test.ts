import { expect, test } from 'bun:test'
import { mkdtemp, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import type { TestCase, TestResult } from '@playwright/test/reporter'
import F1AcceptanceReporter, {
  f1OutputDirectory,
  f1SeriesFromEvidence,
} from './f1AcceptanceReporter'

const candidate = JSON.parse(
  await readFile(
    resolve(
      import.meta.dir,
      '../../../docs/superpowers/plans/2026-10-22-python-current-candidate/canonical-plan.json',
    ),
    'utf8',
  ),
)
const fixture = () => ({
  browser: '155.0.8059.85',
  kind: 'classic',
  workload: 'F1: 2 turtles, 200 movement calls, no external assets',
  repetition: 0,
  cpuProfiling: false,
  distribution: {
    hash: candidate.input.distribution.sha256,
    manifest: structuredClone(candidate.deployment.distribution),
    release: structuredClone(candidate.deployment.release),
  },
  httpCacheReset: true,
  coldCacheReset: {
    name: `sz-python-boot-v1:encoded-directory:${candidate.deployment.release.manifestSha256}`,
    existed: false,
    removed: false,
  },
  samples: ['cold', 'cached', 'edited'].map((phase) => ({
    phase,
    milliseconds: 100,
    network: null,
  })),
})

test('F1 adapter verifies the pinned full deployment and records unshaped network explicitly', async () => {
  const result = await f1SeriesFromEvidence(fixture(), 'chrome', 'passed')
  expect(result.identity.distribution).toBe(candidate.input.distribution.sha256)
  expect(result.identity.release).toBe(candidate.deployment.release.manifestSha256)
  expect(result.identity.network).toBe('null')
  expect(result.coldResetVerified).toBe(true)
  expect(result.failed).toBe(false)
})

for (const kind of [
  'hash-label',
  'manifest-bytes',
  'release',
  'http-cache',
  'generation',
  'network-missing',
  'network-profile',
  'profiled',
] as const)
  test(`F1 adapter refuses ${kind}`, async () => {
    const value = fixture()
    if (kind === 'hash-label') value.distribution.hash = 'a'.repeat(64)
    if (kind === 'manifest-bytes') value.distribution.manifest.files[0].sha256 = 'a'.repeat(64)
    if (kind === 'release') value.distribution.release.manifestSha256 = 'a'.repeat(64)
    if (kind === 'http-cache') value.httpCacheReset = false
    if (kind === 'profiled') value.cpuProfiling = true
    if (kind === 'generation')
      value.coldCacheReset.name = `sz-python-boot-v1:other:${'a'.repeat(64)}`
    if (kind === 'network-missing') Reflect.deleteProperty(value.samples[0]!, 'network')
    if (kind === 'network-profile')
      Object.assign(value.samples[0]!, { network: { bytesPerSecond: -1, responseDelayMs: 0 } })
    await expect(f1SeriesFromEvidence(value, 'chrome', 'passed')).rejects.toThrow()
  })

test('F1 receipts use config-relative paths independently of invocation cwd', () => {
  expect(f1OutputDirectory('qa-output')).toBe(resolve(import.meta.dir, '../qa-output'))
  expect(f1OutputDirectory('../../.cache/studio-python-live-results')).toBe(
    resolve(import.meta.dir, '../../../.cache/studio-python-live-results'),
  )
  const absolute = resolve(tmpdir(), 'sz-f1-explicit')
  expect(f1OutputDirectory(absolute)).toBe(absolute)
})

test('F1 preserves failed runner, cache mismatch and phase network changes as failed samples', async () => {
  expect((await f1SeriesFromEvidence(fixture(), 'chrome', 'failed')).failed).toBe(true)
  const reset = fixture()
  reset.coldCacheReset.existed = true
  expect((await f1SeriesFromEvidence(reset, 'chrome', 'passed')).coldResetVerified).toBe(false)
  const network = fixture()
  Object.assign(network.samples[0]!, {
    network: { bytesPerSecond: 2_500_000, responseDelayMs: 80 },
  })
  expect((await f1SeriesFromEvidence(network, 'chrome', 'passed')).failed).toBe(true)
})

test('F1 adapter enforces an explicitly selected release pin', async () => {
  await expect(
    f1SeriesFromEvidence(fixture(), 'chrome', 'passed', {
      distribution: candidate.input.distribution.sha256,
      release: 'a'.repeat(64),
    }),
  ).rejects.toThrow('release differs')
})

for (const scenario of ['p95-exceeded', 'isolated-slow', 'invalid-evidence'] as const)
  test(`real F1 reporter persists ${scenario} before deciding runner status`, async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'sz-f1-reporter-'))
    const previous = process.env.PYTHON_LIVE_OUTPUT_DIR
    const distributionPin = process.env.PYTHON_PROBE_DISTRIBUTION_SHA256
    const releasePin = process.env.PYTHON_PROBE_RELEASE_MANIFEST_SHA256
    process.env.PYTHON_LIVE_OUTPUT_DIR = directory
    process.env.PYTHON_PROBE_DISTRIBUTION_SHA256 = candidate.input.distribution.sha256
    process.env.PYTHON_PROBE_RELEASE_MANIFEST_SHA256 = candidate.deployment.release.manifestSha256
    try {
      const reporter = new F1AcceptanceReporter()
      // This fixture models the public Playwright reporter boundary; no browser is launched.
      const selected = {
        title:
          'diagnostic live classic: execute cold, cached and after editing to presented drawing',
        parent: { project: () => ({ name: 'chrome' }) },
      } as unknown as TestCase
      for (let repetition = 0; repetition < 30; repetition++) {
        const value = fixture()
        value.repetition = repetition
        if (scenario === 'p95-exceeded' && repetition < 2) value.samples[2]!.milliseconds = 1501
        if (scenario === 'isolated-slow' && repetition === 0) value.samples[2]!.milliseconds = 9000
        if (scenario === 'invalid-evidence' && repetition === 0)
          value.distribution.hash = 'a'.repeat(64)
        reporter.onTestEnd(selected, {
          status: 'passed',
          attachments: [
            {
              name: 'live-startup-diagnostic',
              contentType: 'application/json',
              body: Buffer.from(JSON.stringify(value)),
            },
          ],
        } as TestResult)
      }
      const result = await reporter.onEnd({ status: 'passed', startTime: new Date(), duration: 1 })
      const [name] = await readdir(directory)
      const saved = JSON.parse(await readFile(resolve(directory, name!), 'utf8'))
      expect(result.status).toBe(scenario === 'isolated-slow' ? 'passed' : 'failed')
      expect(saved.noReferenceAcceptance).toBe(true)
      if (scenario === 'invalid-evidence') {
        expect(saved.invalidEvidence).toHaveLength(1)
        expect(saved.invalidEvidence[0].evidence.samples).toHaveLength(3)
        expect(saved.reasons).toContain('invalid-or-missing-evidence')
      } else {
        expect(saved.series).toHaveLength(30)
        expect(saved.summaries[0].phases[2].p95).toBe(scenario === 'p95-exceeded' ? 1501 : 100)
      }
    } finally {
      for (const [name, value] of Object.entries({
        PYTHON_LIVE_OUTPUT_DIR: previous,
        PYTHON_PROBE_DISTRIBUTION_SHA256: distributionPin,
        PYTHON_PROBE_RELEASE_MANIFEST_SHA256: releasePin,
      })) {
        if (value === undefined) Reflect.deleteProperty(process.env, name)
        else process.env[name] = value
      }
    }
  })
