import { createHash } from 'node:crypto'
import { lstat, mkdir, readdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { StudioPythonDistributionSchema } from '@sistemazero/core/studio/python-runtime-distribution'
import {
  captureOperationalPlan,
  encodePromotionFrame,
  OperationalApprovalSchema,
  promotionFrameBytes,
} from '../promotion-worker/protocol'
import {
  PythonPromotionInputSchema,
  readPromotionFile,
  verifyPythonPromotionPlan,
} from './python-promotion-plan'

const project = resolve(import.meta.dirname, '../../..')
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const historicalDistribution = '996e6097c599d21c5d92fc7e9f03145f155d080a2d83f6d4aaa6a25785c0afd7'

async function sourcePins() {
  const paths = [
    resolve(project, 'bun.lock'),
    resolve(project, 'packages/core/package.json'),
    resolve(project, 'packages/studio-runtime/package.json'),
    resolve(import.meta.dirname, 'python-promotion-plan.ts'),
    resolve(import.meta.dirname, 'promote-python-runtime-worker.ts'),
  ]
  const walk = async (directory: string) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name)
      if (entry.isSymbolicLink()) throw new Error('Promotion source link refused.')
      if (entry.isDirectory()) await walk(path)
      else if (entry.isFile() && entry.name.endsWith('.ts')) paths.push(path)
    }
  }
  for (const directory of [
    'packages/core/src',
    'packages/studio-runtime/src',
    'packages/studio-runtime/promotion-worker',
  ])
    await walk(resolve(project, directory))
  return Promise.all(
    paths.sort().map(async (path) => ({ path, sha256: digest(await readFile(path)) })),
  )
}

/** Offline only. No Wrangler import, credential acquisition, fetch or deployment path. */
export async function prepareOperationalPromotion(options: {
  plan: unknown
  expectedPlanSha256: string
  approval: unknown
  expectedApprovalSha256: string
  output: string
  now?: number
}) {
  const approval = OperationalApprovalSchema.parse(options.approval)
  if (
    !/^[a-f0-9]{64}$/.test(options.expectedApprovalSha256) ||
    (await sha256Hex(canonicalJson(approval))) !== options.expectedApprovalSha256 ||
    approval.planSha256 !== options.expectedPlanSha256 ||
    approval.expiresAt <= (options.now ?? Date.now())
  )
    throw new Error('Explicit operational approval required.')
  // Reject impossible operational frames before the canonical factory retains payloads.
  // This metadata preflight does not replace the full canonical verification below.
  const selectedPlan = options.plan
  if (typeof selectedPlan !== 'object' || selectedPlan === null || !('input' in selectedPlan))
    throw new Error('Operational plan input required.')
  const input = PythonPromotionInputSchema.parse(selectedPlan.input)
  const manifest = StudioPythonDistributionSchema.parse(
    JSON.parse(
      new TextDecoder().decode(
        await readPromotionFile(input.distribution.directory, 'distribution.json', 2_000_000),
      ),
    ),
  )
  if ((await sha256Hex(canonicalJson(manifest))) !== input.distribution.sha256)
    throw new Error('Operational manifest differs from qualified distribution.')
  promotionFrameBytes(manifest.files)
  const before = await sourcePins()
  const canonical = await verifyPythonPromotionPlan(options.plan, options.expectedPlanSha256)
  if (canonical.input.distribution.sha256 === historicalDistribution)
    throw new Error('Historical diagnostic distribution cannot become the final promotion.')
  if (canonical.input.distribution.sha256 !== approval.distributionSha256)
    throw new Error('Qualified distribution differs from approval.')
  const contents = new Map<string, Uint8Array<ArrayBuffer>>()
  for (const file of canonical.deployment.distribution.files) {
    const bytes = await readPromotionFile(
      canonical.input.distribution.directory,
      file.path,
      file.bytes,
    )
    if (digest(bytes) !== file.sha256) throw new Error('Promotion file changed after verification.')
    contents.set(file.path, bytes)
  }
  const frame = encodePromotionFrame(canonical.deployment.distribution.files, contents)
  const body = {
    version: 1,
    kind: 'studio.python.operational-promotion',
    approval,
    environment: canonical.input.environment,
    accountId: canonical.input.target.accountId,
    bucketName: canonical.input.target.bucketName,
    deployment: canonical.deployment,
    configuration: canonical.configuration.worker,
    frameSha256: digest(frame),
    frameBytes: frame.byteLength,
  }
  const generated = { ...body, operationalSha256: await sha256Hex(canonicalJson(body)) }
  await captureOperationalPlan(generated)
  if (canonicalJson(before) !== canonicalJson(await sourcePins()))
    throw new Error('Promotion source changed during preparation.')
  const output = resolve(options.output),
    parent = dirname(output)
  if ((await realpath(parent)) !== parent) throw new Error('Promotion output parent link refused.')
  await mkdir(output) // Exclusive: never overwrite an earlier plan, evidence or operator.
  if ((await realpath(output)) !== output) throw new Error('Promotion output link refused.')
  const put = (name: string, bytes: string | Uint8Array) =>
    writeFile(resolve(output, name), bytes, { flag: 'wx' })
  const handlerImport = relative(
    output,
    resolve(project, 'packages/studio-runtime/promotion-worker/handler'),
  ).replaceAll('\\', '/')
  await put(
    'plan.generated.ts',
    `export const approvedPromotionPlan = ${canonicalJson(generated)} as const\n`,
  )
  await put(
    'index.ts',
    `import {createPromotionHandler} from ${JSON.stringify(handlerImport.startsWith('.') ? handlerImport : `./${handlerImport}`)}\nimport {approvedPromotionPlan} from './plan.generated'\nexport default {fetch:createPromotionHandler(approvedPromotionPlan)}\n`,
  )
  await put('frame.bin', frame)
  await put(
    'wrangler.jsonc',
    `${JSON.stringify(
      {
        name: approval.workerName,
        account_id: canonical.input.target.accountId,
        main: 'index.ts',
        compatibility_date: '2026-10-20',
        compatibility_flags: ['nodejs_compat'],
        workers_dev: true,
        preview_urls: false,
        routes: [],
        observability: { enabled: false },
        limits: { cpu_ms: 30000 },
        version_metadata: { binding: 'CF_VERSION_METADATA' },
        r2_buckets: [{ binding: 'PYTHON_RUNTIME', bucket_name: canonical.input.target.bucketName }],
      },
      null,
      2,
    )}\n`,
  )
  const files = await Promise.all(
    ['index.ts', 'plan.generated.ts', 'frame.bin', 'wrangler.jsonc'].map(async (name) => {
      const bytes = await readFile(resolve(output, name))
      return { name, bytes: bytes.byteLength, sha256: digest(bytes) }
    }),
  )
  const artifact = {
    version: 1,
    state: 'offline-prepared-not-built-or-deployed',
    planSha256: canonical.planSha256,
    operationalSha256: generated.operationalSha256,
    approvalSha256: options.expectedApprovalSha256,
    qualificationSha256: approval.qualificationSha256,
    files,
    sourcePins: before,
    memoryQualification128MiB: false,
    authExecuted: false,
    activationPerformed: false,
  }
  if (canonicalJson(before) !== canonicalJson(await sourcePins()))
    throw new Error('Promotion source changed before readiness marker.')
  const bytes = `${canonicalJson(artifact)}\n`
  await put('artifact.json', bytes) // Readiness marker last; partial output remains unqualified.
  return {
    output,
    artifactSha256: digest(new TextEncoder().encode(bytes)),
    operationalSha256: generated.operationalSha256,
  }
}

/** Recheck exact artifact and sources before any separate build/deploy operator may use it. */
export async function verifyOperationalArtifact(output: string, expectedSha256: string) {
  const directory = resolve(output)
  if ((await realpath(directory)) !== directory || !/^[a-f0-9]{64}$/.test(expectedSha256))
    throw new Error('Operational artifact path/digest refused.')
  const bytes = await readFile(resolve(directory, 'artifact.json'))
  if (bytes.byteLength > 2_000_000 || digest(bytes) !== expectedSha256)
    throw new Error('Operational artifact changed.')
  const artifact = JSON.parse(new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes))
  if (
    artifact.state !== 'offline-prepared-not-built-or-deployed' ||
    canonicalJson(artifact.sourcePins) !== canonicalJson(await sourcePins()) ||
    canonicalJson(artifact.files.map((file: { name: string }) => file.name)) !==
      canonicalJson(['index.ts', 'plan.generated.ts', 'frame.bin', 'wrangler.jsonc'])
  )
    throw new Error('Operational artifact/source inventory changed.')
  for (const file of artifact.files) {
    const path = resolve(directory, file.name),
      info = await lstat(path)
    if (!info.isFile() || info.isSymbolicLink() || (await realpath(path)) !== path)
      throw new Error('Operational artifact file link refused.')
    const content = await readFile(path)
    if (content.byteLength !== file.bytes || digest(content) !== file.sha256)
      throw new Error('Operational artifact file changed.')
  }
  return artifact
}

export async function runOperationalPromotionCommand(args: readonly string[]) {
  if (args[0] !== 'prepare' || args.length !== 11)
    throw new Error('Only explicit offline prepare is supported.')
  const flags = new Map<string, string>(),
    allowed = ['--plan', '--expect-plan-sha256', '--approval', '--expect-approval-sha256', '--out']
  for (let index = 1; index < args.length; index += 2) {
    const key = args[index]!,
      value = args[index + 1]!
    if (!allowed.includes(key) || flags.has(key) || !value || value.startsWith('--'))
      throw new Error('Operational promotion arguments refused.')
    flags.set(key, value)
  }
  const json = async (path: string) => {
    const info = await lstat(path)
    if (!info.isFile() || info.isSymbolicLink() || info.size > 12_000_000)
      throw new Error('Operational JSON input refused.')
    const bytes = await readFile(path)
    if (bytes.byteLength > 12_000_000) throw new Error('Operational JSON grew during read.')
    return JSON.parse(new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes))
  }
  return prepareOperationalPromotion({
    plan: await json(resolve(flags.get('--plan')!)),
    expectedPlanSha256: flags.get('--expect-plan-sha256')!,
    approval: await json(resolve(flags.get('--approval')!)),
    expectedApprovalSha256: flags.get('--expect-approval-sha256')!,
    output: flags.get('--out')!,
  })
}
if (import.meta.main) {
  try {
    console.log(JSON.stringify(await runOperationalPromotionCommand(process.argv.slice(2))))
  } catch {
    console.error('Offline operational promotion preparation failed.')
    process.exitCode = 1
  }
}
