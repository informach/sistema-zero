import assert from 'node:assert/strict'
import { mkdir, open, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { awaitWithSignal } from '@sistemazero/core/http'
import {
  judgePythonProjectExecution,
  preparePythonProjectExecution,
} from '@sistemazero/core/learning'
import { studioPythonExecutionRevision } from '@sistemazero/core/studio/python-execution-content'
import {
  pythonMissionRequest,
  pythonProjectStructureRecipe,
} from '@sistemazero/core/studio/python-mission-execution'
import { StudioPythonPlaytestRecipeSchema } from '@sistemazero/core/studio/python-playtest'
import { verifyStudioPythonDeployment } from '@sistemazero/core/studio/python-runtime-distribution'
import { createStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import { buildPythonRuntimeDistribution } from '../../studio/scripts/build-python-runtime'
import { sha256 } from '../src/artifacts'
import { describePythonRuntimeConfiguration } from '../src/python-configuration-storage'
import { preparePythonSdkLinux, stopPythonSdkLinux } from './fixtures/prepare-python-sdk-linux'

// Explicit integration command. Uses local workerd/R2/Docker and the SDK RPC transport;
// no remote bindings, provider configuration, deployment or account login.
const root = path.resolve(import.meta.dirname, '../../..')
const lifetime = AbortSignal.timeout(600_000)
const linuxDocker = process.argv.includes('--linux-docker')
const cancelDuringExec = process.argv.includes('--cancel-during-exec')
const restartBeforeCancel = process.argv.includes('--restart-before-cancel')
if (restartBeforeCancel && !cancelDuringExec)
  throw new Error('The restart proof requires --cancel-during-exec.')
const structure = process.argv.includes('--structure')
const turtle = process.argv.includes('--turtle')
const mission = process.argv.includes('--mission')
const health = process.argv.includes('--health')
if (
  health &&
  (mission ||
    turtle ||
    cancelDuringExec ||
    process.argv.includes('--preview') ||
    process.argv.includes('--builder'))
)
  throw new Error('Run structure health separately from other SDK proofs.')
if (
  mission &&
  (cancelDuringExec ||
    turtle ||
    process.argv.includes('--preview') ||
    process.argv.includes('--builder'))
)
  throw new Error(
    'Mission SDK qualification has its own fixed program and lifecycle; run other proofs separately.',
  )
const preview = process.argv.includes('--preview')
const builder = process.argv.includes('--builder')
const builderDatabaseUrl = process.env.STUDIO_BUILDER_TEST_DATABASE_URL
if (builder) {
  if (cancelDuringExec || restartBeforeCancel || structure)
    throw new Error(
      'Run builder, cancellation and structure proofs separately; their ownership contracts differ',
    )
  if (!linuxDocker || !preview || !builderDatabaseUrl)
    throw new Error(
      'The builder proof requires --linux-docker --preview and its disposable SQL target',
    )
  const target = new URL(builderDatabaseUrl)
  if (
    target.hostname !== '127.0.0.1' ||
    target.port !== '5434' ||
    !/^\/sz_gallery_qa_\d+$/.test(target.pathname)
  )
    throw new Error('Only the owned local full-schema builder QA database is allowed')
}
const validate = process.argv.includes('--validate') || turtle || preview || mission || health
const recipe = StudioPythonPlaytestRecipeSchema.parse(
  health
    ? pythonProjectStructureRecipe()
    : turtle
      ? {
          version: 1,
          stdin: ['Lia'],
          keys: ['Space'],
          clicks: [{ x: 0.25, y: 0.25 }],
          requireGraphics: true,
        }
      : { version: 1 },
)
if (process.platform === 'win32' && !linuxDocker)
  throw new Error(
    'Wrangler Containers requires Linux. Run this proof with --linux-docker on Windows.',
  )
const testCache = process.env.STUDIO_PYTHON_TEST_CACHE
const build = await buildPythonRuntimeDistribution(
  testCache
    ? {
        vendorDirectory: path.join(testCache, 'vendor'),
        outputDirectory: path.join(testCache, 'distributions'),
      }
    : undefined,
)
lifetime.throwIfAborted()
const release = await createStudioRuntimeRelease({
  manifestVersion: 1,
  profileId: 'python-sdk-verify',
  releaseId: 'verify-1',
  programmingLanguage: 'python',
  kinds: ['classic', 'pro'],
  modes: ['blocks', 'bridge', 'code'],
  capabilities: builder ? ['edit', 'execute', 'export-source', 'python-repl'] : ['execute'],
  extensions: turtle ? [{ id: 'python-turtle', versions: ['1.0.0'] }] : [],
  sourceTargets: ['browser', 'desktop'],
  requiredBrowserFeatures: ['wasm', 'worker', 'jspi', 'trusted-types'],
  artifacts: build.manifest.files.map(({ path, sha256 }) => ({ path, sha256 })),
  python: {
    version: build.manifest.pythonVersion,
    packages: [],
    providedModules: build.manifest.providedModules,
    features: build.manifest.features,
  },
})
const deployment = await verifyStudioPythonDeployment({ release, distribution: build.manifest })
const directory = path.join(root, '.cache/studio-python-l0/inspection-sdk', crypto.randomUUID())
await mkdir(directory, { recursive: true })
let builderHost: string | undefined
if (builder) {
  const compiled = await Bun.build({
    entrypoints: [path.join(root, 'packages/member-shell/qa/python-builder-sdk-host.ts')],
    target: 'node',
    format: 'esm',
    splitting: false,
    conditions: ['react-server'],
  })
  if (!compiled.success || compiled.outputs.length !== 1)
    throw new AggregateError(compiled.logs, 'Could not compile the local builder SDK host')
  builderHost = path.join(directory, 'builder-host.mjs')
  await writeFile(builderHost, new Uint8Array(await compiled.outputs[0]!.arrayBuffer()))
}
const worker = path.resolve(import.meta.dirname, 'fixtures/python-sdk-worker.ts')
const config = path.join(directory, 'wrangler.json')
const internalToken = crypto.randomUUID()
const proofToken = crypto.randomUUID()
const runtimeConfiguration = {
  version: 1,
  parentOrigins: ['https://kids.test'],
  deployments: [{ status: 'active', deployment: { release, distribution: build.manifest } }],
}
const runtimeCatalog = await describePythonRuntimeConfiguration(runtimeConfiguration)
await writeFile(
  config,
  JSON.stringify({
    name: 'studio-python-sdk-proof',
    main: worker,
    compatibility_date: '2026-07-01',
    compatibility_flags: ['nodejs_compat'],
    containers: [
      {
        class_name: 'ProBuildSandbox',
        image: path.join(root, 'packages/studio-runtime/Dockerfile'),
        image_build_context: path.join(root, 'packages/studio-runtime'),
        instance_type: 'standard-2',
        max_instances: 1,
      },
    ],
    durable_objects: {
      bindings: [
        { class_name: 'ProBuildSandbox', name: 'ProBuildSandbox' },
        { class_name: 'ProofPythonInspectionJob', name: 'PythonInspectionJobs' },
      ],
    },
    migrations: [
      { new_sqlite_classes: ['ProBuildSandbox', 'ProofPythonInspectionJob'], tag: 'proof-v1' },
    ],
    r2_buckets: [
      { binding: 'PRO_ARTIFACTS', bucket_name: 'python-sdk-runtime', remote: false },
      { binding: 'PYTHON_INPUTS', bucket_name: 'python-sdk-inputs', remote: false },
      { binding: 'PYTHON_PREVIEWS', bucket_name: 'python-sdk-previews', remote: false },
    ],
    vars: {
      INTERNAL_TOKEN: internalToken,
      PROOF_TOKEN: proofToken,
      PROOF_CANCEL: String(cancelDuringExec),
      PROOF_PREVIEW: String(preview),
      STUDIO_PYTHON_DISTRIBUTIONS_SHA256: runtimeCatalog.sha256,
    },
  }),
)
const files = [
  {
    path: 'main.py',
    bytes: new TextEncoder().encode(
      turtle
        ? [
            'import turtle',
            'screen = turtle.Screen()',
            'screen.setup(320, 240)',
            'actor = turtle.Turtle()',
            'actor.speed(0)',
            'screen.addshape("hero.png")',
            'actor.shape("hero.png")',
            'def key():',
            '    actor.forward(10)',
            '    print("key-fired")',
            'def click(x, y):',
            '    print("click-fired")',
            'screen.onkey(key, "space")',
            'screen.onclick(click)',
            'screen.listen()',
            'name = input("Nome?")',
            'print("ola " + name)',
            'screen.mainloop()',
            '',
          ].join('\n')
        : validate
          ? '\uFEFFfrom helper import message\nprint(message)\n'
          : '\uFEFFimport absent_student_package\nraise RuntimeError("Do not execute")\n',
    ),
  },
  { path: 'empty.py', bytes: new Uint8Array(0) },
  ...(validate
    ? [
        {
          path: 'helper.py',
          bytes: new TextEncoder().encode(
            'message = "sdk-validation-ação"\ndef somar(a, b):\n    return a + b\n',
          ),
        },
      ]
    : []),
  ...(turtle
    ? [
        {
          path: 'hero.png',
          bytes: Uint8Array.from(
            atob(
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
            ),
            (char) => char.charCodeAt(0),
          ),
        },
      ]
    : []),
  ...(structure
    ? [
        {
          path: 'bindings.py',
          bytes: new TextEncoder().encode(
            'import turtle as t\ndef jogar[T](valor: T):\n    return [p for p in range(3) if p]\nt.forward(1)\nfactory().method()\n',
          ),
        },
        {
          path: 'encoding.py',
          bytes: new Uint8Array(Buffer.from('# coding: latin-1\nação = "café"\n', 'latin1')),
        },
      ]
    : []),
]
const content = {
  version: 1 as const,
  configuration: {
    runtime: {
      profileId: release.profileId,
      releaseId: release.releaseId,
      manifestSha256: release.manifestSha256,
    },
    extensions: turtle ? [{ id: 'python-turtle', version: '1.0.0' }] : [],
    python: {
      entrypoint: 'main.py',
      dependencyLock: {
        lockVersion: 1 as const,
        target: 'browser' as const,
        pythonVersion: build.manifest.pythonVersion,
        runtimeManifestSha256: release.manifestSha256,
        requirementsSha256: await sha256(new Uint8Array(0)),
        packages: [],
      },
    },
  },
  directories: [],
  files: await Promise.all(
    files.map(async ({ path, bytes }) => ({
      path,
      kind: path.endsWith('.png') ? ('asset' as const) : ('source' as const),
      sha256: await sha256(bytes),
      byteLength: bytes.byteLength,
    })),
  ),
}
const seed = path.join(directory, 'seed.json')
const snapshot = {
  ...content,
  projectId: 'sdk-proof',
  revision: await studioPythonExecutionRevision(content),
}
const missionPlan = mission
  ? await preparePythonProjectExecution(
      {
        projectId: snapshot.projectId,
        revision: snapshot.revision,
        runtimeManifestSha256: release.manifestSha256,
        runId: crypto.randomUUID(),
      },
      [
        {
          id: 'output',
          rule: {
            type: 'behavior',
            steps: [],
            expect: {
              target: { kind: 'console' },
              compare: 'contains',
              value: 'sdk-validation-ação',
            },
          },
        },
        {
          id: 'function',
          rule: {
            type: 'functionReturns',
            module: 'helper.py',
            name: 'somar',
            cases: [
              { args: [2, 3], expected: 5 },
              { args: [-1, 1], expected: 0 },
            ],
          },
        },
      ],
    )
  : undefined
await writeFile(
  seed,
  JSON.stringify({
    runtimeDirectory: build.directory,
    runtimeFiles: build.manifest.files,
    runtimeConfiguration,
    marker: deployment.marker,
    internalToken,
    proofToken,
    cancelDuringExec,
    restartBeforeCancel,
    structure,
    validate,
    ...(missionPlan ? { mission: pythonMissionRequest(missionPlan) } : {}),
    turtle,
    preview,
    ...(builder
      ? {
          builder: {
            databaseUrl: builderDatabaseUrl,
            deployment: { release, distribution: build.manifest },
          },
        }
      : {}),
    recipe,
    request: {
      version: 1,
      owner: 'd'.repeat(64),
      requestId: crypto.randomUUID(),
      executionId: `python-sdk-${crypto.randomUUID().replaceAll('-', '')}`,
      snapshot: {
        ...content,
        projectId: 'sdk-proof',
        revision: await studioPythonExecutionRevision(content),
      },
    },
    files: files.map(({ path, bytes }) => ({ path, bytes: [...bytes] })),
  }),
)
const linux = linuxDocker
  ? await preparePythonSdkLinux({
      root,
      evidence: directory,
      runtimeDirectory: build.directory,
      config,
      seed,
      signal: lifetime,
      ...(builderHost ? { builderHost } : {}),
    })
  : undefined
lifetime.throwIfAborted()
const child = Bun.spawn(
  linux?.command ?? [
    process.env.STUDIO_PYTHON_TEST_NODE ?? 'node',
    path.resolve(import.meta.dirname, 'fixtures/python-sdk-workerd.cjs'),
    worker,
    seed,
    config,
  ],
  {
    cwd: path.resolve(import.meta.dirname, '..'),
    windowsHide: true,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: 'false',
      WRANGLER_LOG_PATH: path.join(directory, 'wrangler.log'),
    },
  },
)
const abortChild = () => child.kill()
lifetime.addEventListener('abort', abortChild, { once: true })
if (lifetime.aborted) abortChild()
async function drain(stream: ReadableStream<Uint8Array>, name: string) {
  const output = await open(path.join(directory, name), 'w')
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let tail = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return tail + decoder.decode()
      let offset = 0
      while (offset < value.byteLength) {
        const written = await output.write(value, offset, value.byteLength - offset)
        if (!written.bytesWritten) throw new Error('Could not persist SDK proof output')
        offset += written.bytesWritten
      }
      tail = (tail + decoder.decode(value, { stream: true })).slice(-20_000)
    }
  } finally {
    reader.releaseLock()
    await output.close()
  }
}
try {
  const [exit, stdout, stderr] = await awaitWithSignal(
    () =>
      Promise.all([
        child.exited,
        drain(child.stdout, 'stdout.log'),
        drain(child.stderr, 'stderr.log'),
      ]),
    lifetime,
  )
  await writeFile(path.join(directory, 'result.json'), JSON.stringify({ exit, stdout, stderr }))
  console.log(JSON.stringify({ evidence: directory, exit, stdout, stderr: stderr.slice(-12_000) }))
  assert.equal(exit, 0, 'Native SDK inspection proof failed')
  if (missionPlan) {
    const proof = stdout
      .split('\n')
      .flatMap((line) => {
        try {
          return [JSON.parse(line)]
        } catch {
          return []
        }
      })
      .find((value) => value?.missionValidated === true)
    assert.ok(proof, 'SDK did not return its actual mission observations')
    const results = judgePythonProjectExecution(missionPlan, proof.report.mission)
    assert.ok(
      results.every((result) => result.passed),
      JSON.stringify(results),
    )
    await writeFile(path.join(directory, 'mission-judge.json'), JSON.stringify({ results }))
  }
} finally {
  lifetime.removeEventListener('abort', abortChild)
  if (child.exitCode === null) child.kill()
  if (linux) {
    await stopPythonSdkLinux({
      ...linux,
      evidence: directory,
      requireCompilerStopped: child.exitCode === 0,
    })
  }
}
