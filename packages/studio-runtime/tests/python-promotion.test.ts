import { afterEach, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { gzipSync } from 'node:zlib'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import type { StudioPythonRuntimeFeature } from '@sistemazero/core/studio/python-runtime-features'
import {
  createStudioRuntimeRelease,
  StudioRuntimeReleaseSchema,
} from '@sistemazero/core/studio/runtime-catalog'
import { runPythonPromotionCommand } from '../scripts/promote-python-runtime'
import {
  type PythonPromotionInput,
  preparePythonPromotion,
  verifyPythonPromotionPlan,
} from '../scripts/python-promotion-plan'
import { uploadPythonPromotion } from '../scripts/python-promotion-r2'
import { sha256 } from '../src/artifacts'
import { pythonDistributionFixture } from './python-distribution-fixture'

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) {
    if (!resolve(directory).startsWith(`${resolve(tmpdir())}${sep}sz-python-promotion-`))
      throw new Error('Unsafe test cleanup')
    await rm(directory, { recursive: true, force: true })
  }
})

async function fixture(
  environment: 'staging' | 'production' = 'staging',
  features: readonly StudioPythonRuntimeFeature[] = ['turtle-compound-shapes'],
) {
  const bucketName: PythonPromotionInput['target']['bucketName'] =
    environment === 'staging'
      ? 'sistemazero-studio-artifacts-staging'
      : 'sistemazero-studio-artifacts'
  const storage = await pythonDistributionFixture({
    compressed: true,
    standalone: true,
    boot: true,
    playtest: true,
  })
  const directory = await mkdtemp(join(tmpdir(), 'sz-python-promotion-'))
  directories.push(directory)
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
    storage.contents.set(path, new TextEncoder().encode(`fixture:${path}`))
  const distribution = {
    ...storage.deployment.distribution,
    features,
    files: await Promise.all(
      [...storage.contents].map(async ([path, bytes]) => ({
        path,
        bytes: bytes.byteLength,
        sha256: await sha256(bytes),
      })),
    ),
  }
  for (const [path, bytes] of storage.contents) {
    await mkdir(dirname(join(directory, path)), { recursive: true })
    await writeFile(join(directory, path), bytes)
  }
  await writeFile(join(directory, 'distribution.json'), JSON.stringify(distribution))
  const input = {
    version: 1,
    environment,
    target: {
      accountId: '1'.repeat(32),
      bucketName,
      runtimeOrigin: `https://python.${environment}.example`,
      parentOrigins: [
        `https://admin.${environment}.example`,
        `https://adult.${environment}.example`,
        `https://kids.${environment}.example`,
      ],
    },
    distribution: { directory, sha256: await sha256Hex(canonicalJson(distribution)) },
    release: {
      profileId: 'python-browser',
      releaseId: '2026-10-19-1',
      capabilities: ['edit', 'execute', 'export-source', 'python-repl', 'pause'],
    },
    baseline: {
      worker: null,
      members: null,
      hosts: [],
      previewOrigin: null,
      frameOrigins: { admin: [], community: [], 'community-kids': [] },
    },
  }
  return { input, distribution, directory, storage }
}

test('offline plan is deterministic, binds distinct hashes and registers real Python categories', async () => {
  const f = await fixture()
  const first = await preparePythonPromotion(f.input)
  const second = await preparePythonPromotion(f.input)
  expect(second).toEqual(first)
  expect(first.deployment.release.manifestSha256).not.toBe(f.input.distribution.sha256)
  expect(first.configuration.members.catalog.releases[0]?.manifestSha256).toBe(
    first.deployment.release.manifestSha256,
  )
  expect(first.configuration.members.releases[0]?.blockIds).toContain('sz_py_print')
  expect(first.configuration.members.releases[0]?.categoryIds).toContain('Entrada e saída')
  expect(first.configuration.members.releases[0]?.categoryIds).not.toContain('python-basics')
  expect(first.configuration.members.releases[0]?.proTemplateIds).toEqual(['python-blank'])
  expect(first.configuration.frameOrigins.admin).toEqual([f.input.target.runtimeOrigin])
  expect(first.defaults).toEqual({ programmingLanguage: 'javascript', installedExtensions: [] })
  expect(first.workerCatalog.sha256).toBe(
    await sha256Hex(canonicalJson(first.configuration.worker)),
  )
  expect(first.workerCatalog.key).toBe(`runtime-configs/${first.workerCatalog.sha256}.json`)
  expect(first.workerBindings).toEqual({
    STUDIO_PYTHON_DISTRIBUTIONS_SHA256: first.workerCatalog.sha256,
    STUDIO_PYTHON_PREVIEW_ORIGIN: f.input.target.runtimeOrigin,
  })
  expect(
    Object.values(first.workerBindings).every((value) => Buffer.byteLength(value) <= 5000),
  ).toBe(true)
  expect(await verifyPythonPromotionPlan(first, first.planSha256)).toEqual(first)
})

test('promotion selects APIs from an explicit current-format implementation feature array', async () => {
  for (const features of [[], ['turtle-compound-shapes']] as const) {
    const f = await fixture('staging', features)
    const plan = await preparePythonPromotion(f.input)
    const blockIds = plan.configuration.members.releases[0]!.blockIds
    for (const id of ['sz_py_turtle_new_shape', 'sz_py_turtle_shape_addcomponent'])
      expect(blockIds.includes(id)).toBe(
        features.some((feature) => feature === 'turtle-compound-shapes'),
      )
    expect(plan.deployment.distribution.features).toEqual([...features])
    expect(plan.deployment.release.manifest.python?.features).toEqual([...features])
    expect(await verifyPythonPromotionPlan(plan, plan.planSha256)).toEqual(plan)
  }
})

test('repeating the current deployment preserves its exact approved policy and plan identity', async () => {
  const f = await fixture()
  const previous = await preparePythonPromotion(f.input)
  const policy = previous.configuration.members.releases[0]!
  // One block per Turtle concept since the 2026-10 palette review (aliases and spellings share it).
  expect(policy.blockIds.filter((id) => id.startsWith('sz_py_turtle_'))).toHaveLength(84)
  const baseline = structuredClone(previous.configuration)
  const next = await preparePythonPromotion({ ...f.input, baseline })
  expect(next.configuration.members.releases).toEqual(baseline.members.releases)
  expect(next.configuration.worker.deployments).toEqual(baseline.worker.deployments)
  expect(next.deployment).toEqual(previous.deployment)
  expect(await verifyPythonPromotionPlan(next, next.planSha256)).toEqual(next)
})

test('production reuses immutable release bytes with its own origins and catalog', async () => {
  const f = await fixture()
  const staging = await preparePythonPromotion(f.input)
  const production = await preparePythonPromotion({
    ...f.input,
    environment: 'production',
    target: {
      ...f.input.target,
      bucketName: 'sistemazero-studio-artifacts',
      runtimeOrigin: 'https://python.production.example',
      parentOrigins: ['https://admin.production.example'],
    },
  })
  expect(production.deployment).toEqual(staging.deployment)
  expect(production.prefix).toBe(staging.prefix)
  expect(production.markerSha256).toBe(staging.markerSha256)
  expect(production.planSha256).not.toBe(staging.planSha256)
  expect(production.workerCatalog.sha256).not.toBe(staging.workerCatalog.sha256)
  expect(production.configuration.worker.parentOrigins).toEqual([
    'https://admin.production.example',
  ])
  expect(production.configuration.hosts[0]?.origin).toBe('https://python.production.example')
  expect(production.configuration.frameOrigins.admin).toEqual(['https://python.production.example'])
  expect(JSON.stringify(production.configuration)).not.toContain('staging.example')
  expect(production.defaults).toEqual(staging.defaults)
  expect(await verifyPythonPromotionPlan(production, production.planSha256)).toEqual(production)
  expect(await verifyPythonPromotionPlan(staging, staging.planSha256)).toEqual(staging)
})

test.each([
  'staging',
  'production',
] as const)('existing JS and current-format Python statuses and origins survive merge in %s', async (environment) => {
  const f = await fixture(environment)
  const first = await preparePythonPromotion(f.input)
  first.configuration.worker.deployments[0]!.status = 'retired'
  first.configuration.members.releases[0]!.status = 'retired'
  const javascript = await createStudioRuntimeRelease({
    ...first.deployment.release.manifest,
    profileId: 'javascript-browser',
    releaseId: 'legacy-1',
    programmingLanguage: 'javascript',
    python: undefined,
    extensions: [],
  })
  first.configuration.members.catalog.profiles.unshift({
    id: javascript.profileId,
    languages: ['javascript'],
    kinds: ['classic', 'pro'],
    modes: ['blocks', 'bridge', 'code'],
    levels: ['existing'],
    releases: [{ id: javascript.releaseId, manifestSha256: javascript.manifestSha256 }],
  })
  first.configuration.members.catalog.releases.unshift(StudioRuntimeReleaseSchema.parse(javascript))
  first.configuration.members.releases.unshift({
    runtime: {
      profileId: javascript.profileId,
      releaseId: javascript.releaseId,
      manifestSha256: javascript.manifestSha256,
    },
    status: 'active',
    proTemplateIds: ['vanilla-js'],
    blockIds: ['old-js-block'],
    categoryIds: ['old-js-category'],
  })
  const next = await preparePythonPromotion({
    ...f.input,
    baseline: {
      ...first.configuration,
      frameOrigins: {
        ...first.configuration.frameOrigins,
        admin: ['https://previous-runtime.example'],
      },
    },
  })
  expect(next.configuration.members.catalog.releases).toEqual(
    first.configuration.members.catalog.releases,
  )
  expect(next.configuration.members.releases).toEqual(first.configuration.members.releases)
  expect(next.configuration.worker.deployments[0]?.status).toBe('retired')
  expect(next.configuration.frameOrigins.admin).toEqual([
    'https://previous-runtime.example',
    f.input.target.runtimeOrigin,
  ])
})

test.each([
  'staging',
  'production',
] as const)('permanent identity, HTTPS origins and immutable collision are enforced in %s', async (environment) => {
  const f = await fixture(environment)
  for (const invalid of [
    { ...f.input, target: { ...f.input.target, runtimeOrigin: 'http://127.0.0.1:5297' } },
    { ...f.input, target: { ...f.input.target, runtimeOrigin: f.input.target.parentOrigins[0] } },
    {
      ...f.input,
      baseline: { ...f.input.baseline, previewOrigin: 'https://previous-runtime.example' },
    },
    { ...f.input, release: { ...f.input.release, profileId: 'python-probe' } },
    { ...f.input, release: { ...f.input.release, capabilities: ['edit', 'execute', 'terminal'] } },
  ])
    await expect(preparePythonPromotion(invalid)).rejects.toThrow()
  const first = await preparePythonPromotion(f.input)
  await expect(
    preparePythonPromotion({
      ...f.input,
      baseline: first.configuration,
      release: { ...f.input.release, capabilities: ['edit', 'execute', 'export-source'] },
    }),
  ).rejects.toThrow('identidade')
})

test('environment and bucket crossings fail before the upload connector', async () => {
  const f = await fixture()
  const plan = await preparePythonPromotion(f.input)
  let connections = 0
  const connect = async () => {
    connections++
    throw new Error('must never connect')
  }
  for (const invalid of [
    { ...f.input, environment: 'production' },
    { ...f.input, target: { ...f.input.target, bucketName: 'sistemazero-studio-artifacts' } },
    { ...f.input, environment: 'preview' },
    { ...f.input, target: { ...f.input.target, bucketName: 'another-bucket' } },
  ]) {
    await expect(preparePythonPromotion(invalid)).rejects.toThrow()
    await expect(
      uploadPythonPromotion({ ...plan, input: invalid }, plan.planSha256, connect),
    ).rejects.toThrow()
  }
  expect(connections).toBe(0)
})

test.each([
  'staging',
  'production',
] as const)('adding a release preserves revoked releases, parents and state consistency in %s', async (environment) => {
  const f = await fixture(environment)
  const first = await preparePythonPromotion(f.input)
  first.configuration.worker.deployments[0]!.status = 'revoked'
  first.configuration.members.releases[0]!.status = 'revoked'
  first.configuration.worker.parentOrigins.push('https://previous-app.example')
  const input = {
    ...f.input,
    baseline: first.configuration,
    release: { ...f.input.release, releaseId: '2026-10-20-1' },
  }
  const next = await preparePythonPromotion(input)
  expect(next.configuration.worker.deployments.map(({ status }) => status)).toEqual([
    'revoked',
    'active',
  ])
  expect(next.configuration.members.releases.map(({ status }) => status)).toEqual([
    'revoked',
    'active',
  ])
  expect(next.configuration.worker.parentOrigins).toContain('https://previous-app.example')
  expect(next.configuration.members.catalog.profiles[0]?.releases).toHaveLength(2)
  expect(next.configuration.hosts).toHaveLength(2)
  first.configuration.members.releases[0]!.status = 'active'
  await expect(preparePythonPromotion(input)).rejects.toThrow('estados')
})

test.each([
  'staging',
  'production',
] as const)('CLI prepare creates an immutable pinned plan in %s', async (environment) => {
  const f = await fixture(environment)
  const inputPath = join(f.directory, 'promotion-input.json')
  const outputPath = join(f.directory, 'promotion-plan.json')
  await writeFile(
    inputPath,
    JSON.stringify({ ...f.input, distribution: { ...f.input.distribution, directory: '.' } }),
  )
  const args = ['prepare', '--input', inputPath, '--out', outputPath]
  const receipt = await runPythonPromotionCommand(args)
  expect(await runPythonPromotionCommand(args)).toEqual(receipt)
  const plan = JSON.parse(await readFile(outputPath, 'utf8'))
  expect(receipt.planSha256).toBe(plan.planSha256)
  await writeFile(outputPath, '{"previous":"must survive"}')
  await expect(runPythonPromotionCommand(args)).rejects.toThrow('outro plano')
  expect(await readFile(outputPath, 'utf8')).toBe('{"previous":"must survive"}')
  await expect(
    runPythonPromotionCommand(['prepare', '--input', inputPath, '--input', inputPath]),
  ).rejects.toThrow('repetidos')
  await expect(runPythonPromotionCommand(['upload', '--plan', outputPath])).rejects.toThrow(
    'Use prepare',
  )
})

test('proxy setup failure removes only its temporary configuration and never touches storage', async () => {
  const f = await fixture()
  const plan = await preparePythonPromotion(f.input)
  let configPath = ''
  await expect(
    uploadPythonPromotion(plan, plan.planSha256, async (path) => {
      configPath = path
      throw new Error('controlled connection failure')
    }),
  ).rejects.toThrow('connection failure')
  expect(configPath).not.toBe('')
  await expect(readFile(configPath)).rejects.toThrow()
  expect(f.storage.objects.size).toBe(0)
})

test.each([
  { name: 'upload error', uploadFails: true, disposeFails: false, primary: new Error('upload') },
  { name: 'undefined rejection', uploadFails: true, disposeFails: false, primary: undefined },
  { name: 'disposal error', uploadFails: false, disposeFails: true, primary: undefined },
  { name: 'both errors', uploadFails: true, disposeFails: true, primary: new Error('upload') },
  {
    name: 'undefined primary and disposal error',
    uploadFails: true,
    disposeFails: true,
    primary: undefined,
  },
])('upload preserves failure identities and cleans its config: $name', async (scenario) => {
  const f = await fixture()
  const plan = await preparePythonPromotion(f.input)
  const cleanup = new Error('dispose')
  let disposed = 0
  let configPath = ''
  let rejected = false
  let failure: unknown
  try {
    await uploadPythonPromotion(plan, plan.planSha256, async (path) => {
      configPath = path
      return {
        env: {
          PYTHON_RUNTIME: {
            ...f.storage.bucket,
            async put(...args: Parameters<typeof f.storage.bucket.put>) {
              if (scenario.uploadFails) throw scenario.primary
              return f.storage.bucket.put(...args)
            },
          },
        },
        async dispose() {
          disposed++
          if (scenario.disposeFails) throw cleanup
        },
      }
    })
  } catch (error) {
    rejected = true
    failure = error
  }
  expect(rejected).toBe(true)
  expect(disposed).toBe(1)
  expect(configPath).not.toBe('')
  await expect(readFile(configPath)).rejects.toThrow()
  if (scenario.uploadFails && scenario.disposeFails) {
    expect(failure).toBeInstanceOf(AggregateError)
    if (!(failure instanceof AggregateError)) throw new Error('Expected aggregate failure')
    expect(failure.errors).toHaveLength(2)
    expect(failure.errors[0]).toBe(scenario.primary)
    expect(failure.errors[1]).toBe(cleanup)
    expect(failure.cause).toBe(scenario.primary)
  } else {
    expect(failure).toBe(scenario.uploadFails ? scenario.primary : cleanup)
  }
  expect(f.storage.objects.has(`${plan.prefix}complete.json`)).toBe(!scenario.uploadFails)
  expect(f.storage.objects.has(plan.workerCatalog.key)).toBe(!scenario.uploadFails)
})

test.each([
  'connect',
  'upload',
  'dispose',
  'success',
])('directory removal failure preserves every failure after %s', async (mode) => {
  const f = await fixture()
  const plan = await preparePythonPromotion(f.input)
  const child = Bun.spawn(
    [process.execPath, join(import.meta.dir, 'fixtures/python-promotion-cleanup.ts'), mode],
    { stdin: new TextEncoder().encode(JSON.stringify(plan)), stdout: 'pipe', stderr: 'pipe' },
  )
  const [exit, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  expect({ exit, stderr }).toEqual({ exit: 0, stderr: '' })
  expect(JSON.parse(stdout)).toEqual({
    mode,
    removalAttempts: 1,
    disposals: mode === 'connect' ? 0 : 1,
    failures: mode === 'upload' ? 3 : mode === 'success' ? 1 : 2,
  })
})

test('manifest mismatch, path escape, gzip mismatch and bytes drift fail offline', async () => {
  const f = await fixture()
  await expect(
    preparePythonPromotion({
      ...f.input,
      distribution: { ...f.input.distribution, sha256: '0'.repeat(64) },
    }),
  ).rejects.toThrow('SHA')
  const escaped = structuredClone(f.distribution)
  escaped.files[0]!.path = '../outside.py'
  await writeFile(join(f.directory, 'distribution.json'), JSON.stringify(escaped))
  await expect(preparePythonPromotion(f.input)).rejects.toThrow()
  await writeFile(join(f.directory, 'distribution.json'), JSON.stringify(f.distribution))
  const plan = await preparePythonPromotion(f.input)
  await writeFile(join(f.directory, 'frame.mjs'), 'changed')
  await expect(verifyPythonPromotionPlan(plan, plan.planSha256)).rejects.toThrow('Integridade')
  const bad = new TextEncoder().encode('not gzip')
  const representation = f.distribution.httpRepresentations![0]!
  const artifact = f.distribution.files.find((file) => file.path === representation.artifactPath)!
  artifact.sha256 = await sha256(bad)
  artifact.path = `_http/gzip/${artifact.sha256}.gz`
  artifact.bytes = bad.byteLength
  representation.artifactPath = artifact.path
  await writeFile(join(f.directory, 'frame.mjs'), f.storage.contents.get('frame.mjs')!)
  await writeFile(join(f.directory, artifact.path), bad)
  await writeFile(join(f.directory, 'distribution.json'), JSON.stringify(f.distribution))
  await expect(
    preparePythonPromotion({
      ...f.input,
      distribution: {
        ...f.input.distribution,
        sha256: await sha256Hex(canonicalJson(f.distribution)),
      },
    }),
  ).rejects.toThrow('gzip')
})

test('directory symlinks/junctions are rejected even when their bytes are valid', async () => {
  const f = await fixture()
  const alias = `${f.directory}-alias`
  directories.push(alias)
  await symlink(f.directory, alias, process.platform === 'win32' ? 'junction' : 'dir')
  await expect(
    preparePythonPromotion({
      ...f.input,
      distribution: { ...f.input.distribution, directory: alias },
    }),
  ).rejects.toThrow('simbólico')
})

test('valid gzip with matching artifact hashes must still reproduce every logical byte and its length', async () => {
  for (const variant of ['different-byte', 'shorter', 'larger']) {
    const f = await fixture()
    const representation = f.distribution.httpRepresentations![0]!
    const logical = f.storage.contents.get(representation.path)!
    const changed =
      variant === 'shorter'
        ? logical.slice(0, -1)
        : new Uint8Array(logical.byteLength + (variant === 'larger' ? 1 : 0))
    if (variant !== 'shorter') changed.set(logical)
    if (variant === 'different-byte') changed[0] ^= 1
    const compressed = new Uint8Array(gzipSync(changed))
    const artifact = f.distribution.files.find((file) => file.path === representation.artifactPath)!
    artifact.sha256 = await sha256(compressed)
    artifact.path = `_http/gzip/${artifact.sha256}.gz`
    artifact.bytes = compressed.byteLength
    representation.artifactPath = artifact.path
    await writeFile(join(f.directory, artifact.path), compressed)
    await writeFile(join(f.directory, 'distribution.json'), JSON.stringify(f.distribution))
    await expect(
      preparePythonPromotion({
        ...f.input,
        distribution: {
          ...f.input.distribution,
          sha256: await sha256Hex(canonicalJson(f.distribution)),
        },
      }),
    ).rejects.toThrow('Representação gzip inválida')
  }
})

test.each([
  'staging',
  'production',
] as const)('upload uses conditional storage, marker then catalog, idempotence and disposal in %s', async (environment) => {
  const f = await fixture(environment)
  const plan = await preparePythonPromotion(f.input)
  let disposed = 0
  const connect = async (configPath: string) => {
    const config = JSON.parse(await readFile(configPath, 'utf8'))
    expect(config.name).toBe(`sistemazero-python-runtime-promotion-${environment}`)
    expect(config.account_id).toBe(f.input.target.accountId)
    expect(config.r2_buckets).toEqual([
      { binding: 'PYTHON_RUNTIME', bucket_name: f.input.target.bucketName, remote: true },
    ])
    expect(config.vars).toBeUndefined()
    return {
      env: { PYTHON_RUNTIME: f.storage.bucket },
      dispose: async () => {
        disposed++
      },
    }
  }
  const receipt = await uploadPythonPromotion(plan, plan.planSha256, connect)
  const prefix = `runtimes/${plan.deployment.release.manifestSha256}/`
  expect([...f.storage.objects.keys()].slice(-2)).toEqual([
    `${prefix}complete.json`,
    plan.workerCatalog.key,
  ])
  expect(f.storage.objects.size).toBe(f.distribution.files.length + 2)
  expect(receipt.workerCatalog).toEqual(plan.workerCatalog)
  expect(receipt.environment).toBe(environment)
  expect(receipt.bucketName).toBe(f.input.target.bucketName)
  expect(receipt.distributionSha256).toBe(f.input.distribution.sha256)
  expect(JSON.stringify(receipt)).not.toContain(f.input.target.accountId)
  const count = f.storage.counts().puts
  expect(await uploadPythonPromotion(plan, plan.planSha256, connect)).toEqual(receipt)
  expect(f.storage.counts().puts).toBe(count)
  const first = f.storage.objects.get(`${prefix}files/frame.html`)!
  first.hash = new ArrayBuffer(32)
  await expect(uploadPythonPromotion(plan, plan.planSha256, connect)).rejects.toThrow('diferente')
  expect(disposed).toBe(3)
})

test('tampered plans and drift never connect; upload failure cannot create a completion marker', async () => {
  const f = await fixture()
  const plan = await preparePythonPromotion(f.input)
  let connections = 0
  let disposed = 0
  const connect = async () => {
    connections++
    return {
      env: {
        PYTHON_RUNTIME: {
          ...f.storage.bucket,
          put: async () => {
            throw new Error('controlled storage failure')
          },
        },
      },
      dispose: async () => {
        disposed++
      },
    }
  }
  await expect(
    uploadPythonPromotion({ ...plan, prefix: 'other/' }, plan.planSha256, connect),
  ).rejects.toThrow('plano')
  await expect(uploadPythonPromotion(plan, '0'.repeat(64), connect)).rejects.toThrow('plano')
  expect(connections).toBe(0)
  await expect(
    uploadPythonPromotion(
      { ...plan, workerCatalog: { ...plan.workerCatalog, key: 'other.json' } },
      plan.planSha256,
      connect,
    ),
  ).rejects.toThrow('plano')
  expect(connections).toBe(0)
  await expect(uploadPythonPromotion(plan, plan.planSha256, connect)).rejects.toThrow(
    'storage failure',
  )
  expect(disposed).toBe(1)
  expect(f.storage.objects.size).toBe(0)
  await writeFile(join(f.directory, 'worker.mjs'), 'changed')
  await expect(uploadPythonPromotion(plan, plan.planSha256, connect)).rejects.toThrow('Integridade')
  expect(connections).toBe(1)
})

test('a catalog upload failure preserves complete runtime objects and retry publishes only the catalog', async () => {
  const f = await fixture()
  const plan = await preparePythonPromotion(f.input)
  let failCatalog = true,
    disposed = 0
  const connect = async () => ({
    env: {
      PYTHON_RUNTIME: {
        ...f.storage.bucket,
        async put(...args: Parameters<typeof f.storage.bucket.put>) {
          if (failCatalog && args[0] === plan.workerCatalog.key)
            throw new Error('catalog unavailable')
          return f.storage.bucket.put(...args)
        },
      },
    },
    async dispose() {
      disposed++
    },
  })
  await expect(uploadPythonPromotion(plan, plan.planSha256, connect)).rejects.toThrow(
    'catalog unavailable',
  )
  expect(f.storage.objects.has(`${plan.prefix}complete.json`)).toBe(true)
  expect(f.storage.objects.has(plan.workerCatalog.key)).toBe(false)
  const puts = f.storage.counts().puts
  failCatalog = false
  await uploadPythonPromotion(plan, plan.planSha256, connect)
  expect(f.storage.counts().puts).toBe(puts + 1)
  expect(f.storage.objects.has(plan.workerCatalog.key)).toBe(true)
  expect(disposed).toBe(2)
})
