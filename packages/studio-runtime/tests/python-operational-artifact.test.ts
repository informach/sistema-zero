import { afterEach, expect, test } from 'bun:test'
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { frameFiles } from '../promotion-worker/protocol'
import {
  prepareOperationalPromotion,
  verifyOperationalArtifact,
} from '../scripts/promote-python-runtime-worker'
import { preparePythonPromotion } from '../scripts/python-promotion-plan'
import { sha256 } from '../src/artifacts'
import { pythonDistributionFixture } from './python-distribution-fixture'

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) {
    if (
      !resolve(directory).startsWith(`${resolve(tmpdir())}${sep}sz-operational-artifact-`) ||
      (await realpath(directory)) !== directory ||
      !(await lstat(directory)).isDirectory()
    )
      throw new Error('Unsafe artifact test cleanup.')
    await rm(directory, { recursive: true, force: false })
  }
})
async function fixture() {
  const storage = await pythonDistributionFixture({
    compressed: true,
    standalone: true,
    boot: true,
    playtest: true,
  })
  const directory = await mkdtemp(join(tmpdir(), 'sz-operational-artifact-'))
  directories.push(directory)
  const distributionDirectory = join(directory, 'distribution')
  await mkdir(distributionDirectory)
  for (const path of [
    'analysis-worker.mjs',
    'analysis-frame.mjs',
    'turtle-renderer.mjs',
    'turtle-protocol.mjs',
    'turtle/turtle.py',
    'turtle/_sz_turtle_backend.py',
    'turtle/_sz_turtle_colors.py',
    'turtle/_sz_turtle_limits.py',
  ])
    storage.contents.set(path, new TextEncoder().encode(`synthetic-contract:${path}`))
  const distribution = {
    ...storage.deployment.distribution,
    files: await Promise.all(
      [...storage.contents].map(async ([path, bytes]) => ({
        path,
        bytes: bytes.byteLength,
        sha256: await sha256(bytes),
      })),
    ),
  }
  for (const [path, bytes] of storage.contents) {
    await mkdir(dirname(join(distributionDirectory, path)), { recursive: true })
    await writeFile(join(distributionDirectory, path), bytes)
  }
  await writeFile(join(distributionDirectory, 'distribution.json'), JSON.stringify(distribution))
  const plan = await preparePythonPromotion({
    version: 1,
    environment: 'staging',
    target: {
      accountId: '1'.repeat(32),
      bucketName: 'sistemazero-studio-artifacts-staging',
      runtimeOrigin: 'https://runtime.example',
      parentOrigins: ['https://app.example'],
    },
    distribution: {
      directory: distributionDirectory,
      sha256: await sha256Hex(canonicalJson(distribution)),
    },
    release: {
      profileId: 'python-browser',
      releaseId: '2026-10-20-1',
      capabilities: ['edit', 'execute', 'export-source'],
    },
    baseline: {
      worker: null,
      members: null,
      hosts: [],
      previewOrigin: null,
      frameOrigins: { admin: [], community: [], 'community-kids': [] },
    },
  })
  const now = Date.now()
  const approval = {
    version: 1,
    kind: 'studio.python.operational-promotion-approval',
    planSha256: plan.planSha256,
    distributionSha256: plan.input.distribution.sha256,
    qualificationSha256: 'b'.repeat(64),
    workerName: `sistemazero-python-promoter-staging-${plan.planSha256.slice(0, 12)}`,
    operatorOrigin: 'https://operator.example',
    notBefore: now - 1000,
    expiresAt: now + 60_000,
  }
  return {
    storage,
    directory,
    plan,
    approval,
    expectedApprovalSha256: await sha256Hex(canonicalJson(approval)),
    now,
  }
}

test('offline artifact uses canonical factory, explicit approval and exact frame/source pins', async () => {
  const f = await fixture(),
    output = join(f.directory, 'artifact')
  const prepared = await prepareOperationalPromotion({
    plan: f.plan,
    expectedPlanSha256: f.plan.planSha256,
    approval: f.approval,
    expectedApprovalSha256: f.expectedApprovalSha256,
    output,
  })
  const artifact = await verifyOperationalArtifact(output, prepared.artifactSha256)
  expect(artifact.state).toBe('offline-prepared-not-built-or-deployed')
  expect(artifact.memoryQualification128MiB).toBe(false)
  const frame = new Uint8Array(await readFile(join(output, 'frame.bin')))
  const views = frameFiles(frame, f.plan.deployment.distribution.files)
  for (const file of f.plan.deployment.distribution.files)
    expect(await sha256(views.get(file.path)!)).toBe(file.sha256)
  const config = JSON.parse(await readFile(join(output, 'wrangler.jsonc'), 'utf8'))
  expect(config.name).toBe(f.approval.workerName)
  expect(config.r2_buckets).toEqual([
    { binding: 'PYTHON_RUNTIME', bucket_name: 'sistemazero-studio-artifacts-staging' },
  ])
  expect(JSON.stringify(config)).not.toContain('OPERATOR_HMAC_KEY')
  // Synthetic canonical-plan fixture: not source/renderer/runtime or real deployment qualification.
})

test('missing/wrong approval is refused without creating output; output is exclusive and tamper detected', async () => {
  const f = await fixture(),
    output = join(f.directory, 'artifact')
  const options = {
    plan: f.plan,
    expectedPlanSha256: f.plan.planSha256,
    approval: f.approval,
    expectedApprovalSha256: f.expectedApprovalSha256,
    output,
  }
  await expect(prepareOperationalPromotion({ ...options, approval: null })).rejects.toThrow()
  await expect(
    prepareOperationalPromotion({ ...options, expectedApprovalSha256: '0'.repeat(64) }),
  ).rejects.toThrow()
  const prepared = await prepareOperationalPromotion(options)
  await expect(prepareOperationalPromotion(options)).rejects.toThrow()
  await writeFile(join(output, 'frame.bin'), 'changed')
  await expect(verifyOperationalArtifact(output, prepared.artifactSha256)).rejects.toThrow()
})

test('overbudget manifest is refused before reading missing payloads or creating output', async () => {
  const f = await fixture(),
    output = join(f.directory, 'overbudget-artifact')
  const distribution = structuredClone(f.plan.deployment.distribution)
  distribution.files[0]!.bytes = 33 * 1024 * 1024
  const distributionSha256 = await sha256Hex(canonicalJson(distribution))
  await writeFile(
    join(f.plan.input.distribution.directory, 'distribution.json'),
    JSON.stringify(distribution),
  )
  // Every payload is absent: reaching the canonical factory would fail with ENOENT,
  // rather than the operational budget error that must precede any payload read.
  for (const file of distribution.files)
    await rm(join(f.plan.input.distribution.directory, file.path))
  const plan = structuredClone(f.plan)
  plan.input.distribution.sha256 = distributionSha256
  plan.deployment.distribution = distribution
  const approval = { ...f.approval, distributionSha256 }
  await expect(
    prepareOperationalPromotion({
      plan,
      expectedPlanSha256: plan.planSha256,
      approval,
      expectedApprovalSha256: await sha256Hex(canonicalJson(approval)),
      output,
    }),
  ).rejects.toThrow('Promotion frame budget exceeded.')
  await expect(lstat(output)).rejects.toMatchObject({ code: 'ENOENT' })
})
