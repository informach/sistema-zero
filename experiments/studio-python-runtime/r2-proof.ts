import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import {
  StudioPythonDistributionSchema,
  studioPythonRuntimePrefix,
  studioPythonRuntimeRoute,
} from '../../packages/core/src/studio/python-runtime-distribution'
import { createStudioRuntimeRelease } from '../../packages/core/src/studio/runtime-catalog'
import {
  createPythonDistributionServer,
  type RuntimeDistributionBucket,
  storePythonRuntimeDistribution,
} from '../../packages/studio-runtime/src/python-distributions'

// Bundle with Bun, execute with Node. Wrangler's public API creates only ephemeral local bindings.
const repository = resolve(process.argv[2]!)
const directory = resolve(process.argv[3]!)
const require = createRequire(resolve(repository, 'packages/studio-runtime/package.json'))
const { getPlatformProxy } = require('wrangler')
const output = resolve(repository, '.cache/studio-python-runtime', `r2-${randomUUID()}`)
await mkdir(output, { recursive: true })
const configPath = resolve(output, 'wrangler.json')
await writeFile(
  configPath,
  JSON.stringify({
    name: 'studio-python-local-proof',
    compatibility_date: '2026-08-04',
    r2_buckets: [{ binding: 'ARTIFACTS', bucket_name: 'studio-python-local-proof' }],
    send_metrics: false,
  }),
)
const evidence: Record<string, unknown> = {
  createdAt: new Date().toISOString(),
  scope: 'Wrangler local R2 binding, not remote Cloudflare deployment',
}
let proxy: { env: { ARTIFACTS: RuntimeDistributionBucket }; dispose(): Promise<void> } | undefined
try {
  const distribution = StudioPythonDistributionSchema.parse(
    JSON.parse(await readFile(resolve(directory, 'distribution.json'), 'utf8')),
  )
  const release = await createStudioRuntimeRelease({
    manifestVersion: 1,
    profileId: 'python-r2-proof',
    releaseId: 'proof-1',
    programmingLanguage: 'python',
    kinds: ['pro'],
    modes: ['code'],
    capabilities: ['execute'],
    extensions: [],
    sourceTargets: ['browser', 'desktop'],
    requiredBrowserFeatures: ['wasm', 'worker', 'jspi', 'trusted-types'],
    artifacts: distribution.files.map(({ path, sha256 }) => ({ path, sha256 })),
    python: {
      version: distribution.pythonVersion,
      packages: [],
      providedModules: distribution.providedModules,
      features: distribution.features,
    },
  })
  const deployment = { release, distribution }
  evidence.deployment = deployment
  proxy = await getPlatformProxy({ configPath, persist: false, envFiles: [] })
  assert.ok(proxy)
  const bucket = proxy.env.ARTIFACTS
  const read = async (path: string) => new Uint8Array(await readFile(resolve(directory, path)))
  await storePythonRuntimeDistribution({ bucket, deployment, read })
  await Promise.all([
    storePythonRuntimeDistribution({ bucket, deployment, read }),
    storePythonRuntimeDistribution({ bucket, deployment, read }),
  ])
  const prefix = studioPythonRuntimePrefix(release.manifestSha256)
  const route = `https://runtime.example${studioPythonRuntimeRoute(release.manifestSha256)}`
  const serve = await createPythonDistributionServer({
    approvedDeployments: [deployment],
    parentOrigins: ['https://app.example'],
    status: () => 'active',
  })
  const files: Record<string, unknown>[] = []
  evidence.files = files
  for (const file of distribution.files) {
    const response = await serve(new Request(`${route}${file.path}`), bucket)
    assert.equal(response.status, 200, file.path)
    const bytes = new Uint8Array(await response.arrayBuffer())
    assert.equal(bytes.byteLength, file.bytes)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256)
    const conditional = await serve(
      new Request(`${route}${file.path}`, {
        headers: { 'If-None-Match': response.headers.get('ETag')! },
      }),
      bucket,
    )
    assert.equal(conditional.status, 304)
    files.push({
      path: file.path,
      bytes: bytes.byteLength,
      sha256: file.sha256,
      conditional: conditional.status,
    })
  }
  // Wrong hash must be rejected by the actual binding, not only our uploader.
  let checksumRejected = false
  try {
    await bucket.put(`${prefix}invalid`, new Uint8Array([1]), {
      sha256: '0'.repeat(64),
      onlyIf: { etagDoesNotMatch: '*' },
    })
  } catch {
    checksumRejected = true
  }
  assert.equal(checksumRejected, true)
  const replacement = await bucket.put(`${prefix}files/frame.html`, new Uint8Array([1]), {
    sha256: createHash('sha256')
      .update(new Uint8Array([1]))
      .digest('hex'),
    onlyIf: { etagDoesNotMatch: '*' },
  })
  assert.equal(replacement, null)
  evidence.checksumRejected = checksumRejected
  evidence.overwriteRejected = true
  evidence.qualification = 'local-r2-distribution-passed'
} catch (error) {
  evidence.failure = String(error)
  evidence.stack = error instanceof Error ? error.stack : undefined
  process.exitCode = 1
} finally {
  try {
    await proxy?.dispose()
  } catch (error) {
    evidence.cleanupFailure = String(error)
    process.exitCode = 1
  }
  if (process.exitCode) delete evidence.qualification
  await writeFile(resolve(output, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(
    JSON.stringify({
      output,
      qualification: evidence.qualification,
      failure: evidence.failure,
      cleanupFailure: evidence.cleanupFailure,
    }),
  )
}
