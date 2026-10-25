import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { canonicalJson } from '../../packages/core/src/creations/content-fingerprint'
import {
  StudioPythonDistributionSchema,
  studioPythonRuntimePrefix,
  studioPythonRuntimeRoute,
  verifyStudioPythonDeployment,
} from '../../packages/core/src/studio/python-runtime-distribution'
import { createStudioRuntimeRelease } from '../../packages/core/src/studio/runtime-catalog'
import { buildPythonRuntimeDistribution } from '../../packages/studio/scripts/build-python-runtime'
import { pythonFrameContentSecurityPolicy } from '../../packages/studio/src/runtime/python/framePolicy'
import { PGZERO_EXTENSION } from '../../packages/studio/src/runtime/python/pgzero/contract'
import { PYGAME_EXTENSION } from '../../packages/studio/src/runtime/python/pygame/contract'
import {
  RAYLIB_2D_EXTENSION,
  RAYLIB_3D_EXTENSION,
} from '../../packages/studio/src/runtime/python/raylib/contract'
import { preparePythonExecutionSnapshot } from '../../packages/studio/src/runtime/python/snapshot'
import {
  createPythonDistributionServer,
  type RuntimeDistributionBucket,
  storePythonRuntimeDistribution,
} from '../../packages/studio-runtime/src/python-distributions'
import { runtimeFixtureProject } from './fixtures'
import { createPythonInspectionProbe } from './inspectionFixtures'
import { createRuntimeNetworkProfile } from './network'
import { TURTLE_EXTENSION } from './turtleFixtures'

// Bun1.3 Windows leaks server sockets into child_process children (oven-sh/bun#36938).
// Fail before building/listening instead of producing unreliable qualification results.
if (process.platform === 'win32' && !Bun.semver.satisfies(Bun.version, '>=1.4.0'))
  throw new Error('O servidor de provas Python no Windows exige Bun 1.4 ou superior; use 1.4.3.')

async function prepareDistribution() {
  const directory = process.env.PYTHON_PROBE_DISTRIBUTION_DIRECTORY
  const expectedHash = process.env.PYTHON_PROBE_DISTRIBUTION_SHA256
  const recipe = process.env.PYTHON_PROBE_STDLIB_RECIPE
  if (directory === undefined && expectedHash === undefined) {
    const standardLibrary = recipe === undefined ? undefined : await Bun.file(recipe).json()
    return buildPythonRuntimeDistribution({ standardLibrary })
  }
  if (!directory || !expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash) || recipe !== undefined)
    throw new Error('A distribuição pré-compilada exige diretório e SHA-256, sem outra receita.')
  const manifest = StudioPythonDistributionSchema.parse(
    await Bun.file(resolve(directory, 'distribution.json')).json(),
  )
  const hash = createHash('sha256').update(canonicalJson(manifest)).digest('hex')
  if (hash !== expectedHash) throw new Error('SHA-256 da distribuição pré-compilada diferente.')
  // storePythonRuntimeDistribution verifies every file and gzip representation before serving.
  // These are host-only qualification inputs; projects and HTTP cannot select a directory.
  return { directory: resolve(directory), hash, manifest }
}
const releaseFile = process.env.PYTHON_PROBE_RELEASE_FILE
const expectedRelease = process.env.PYTHON_PROBE_RELEASE_MANIFEST_SHA256
if (releaseFile !== undefined || expectedRelease !== undefined) {
  if (
    !releaseFile ||
    !isAbsolute(releaseFile) ||
    !expectedRelease ||
    !/^[a-f0-9]{64}$/.test(expectedRelease) ||
    !process.env.PYTHON_PROBE_DISTRIBUTION_DIRECTORY ||
    !process.env.PYTHON_PROBE_DISTRIBUTION_SHA256
  )
    throw new Error('A release explícita exige arquivo absoluto, SHA e distribuição pré-compilada.')
}
const distribution = await prepareDistribution()
const hostPort = Number(process.env.PYTHON_PROBE_PORT ?? '5297')
const extraParentsRaw = JSON.parse(process.env.PYTHON_PROBE_PARENT_ORIGINS_JSON ?? '[]') as unknown
if (
  !Array.isArray(extraParentsRaw) ||
  extraParentsRaw.length > 4 ||
  extraParentsRaw.some((value) => {
    if (typeof value !== 'string') return true
    const origin = URL.parse(value)
    if (!origin) return true
    return (
      origin.href !== `${origin.origin}/` ||
      origin.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname)
    )
  })
)
  throw new Error('Origens adicionais da prova Python precisam ser loopback e exatas.')
const extraParentOrigins = extraParentsRaw as string[]
// Real build bytes, test-only approval. Product catalog activation remains a separate gate.
async function prepareRelease() {
  // Host-only input; an explicit candidate never falls back to the legacy release.
  // Its approval and catalog activation remain separate from this integrity check.
  if (releaseFile !== undefined && expectedRelease !== undefined) {
    const info = await stat(releaseFile)
    if (!info.isFile() || info.size > 2_000_000)
      throw new Error('O arquivo de release QA excede o contrato de metadados.')
    const bytes = await readFile(releaseFile)
    if (bytes.byteLength > 2_000_000)
      throw new Error('O arquivo de release QA cresceu durante a leitura.')
    const verified = await verifyStudioPythonDeployment({
      release: JSON.parse(bytes.toString('utf8')),
      distribution: distribution.manifest,
    })
    if (verified.release.manifestSha256 !== expectedRelease)
      throw new Error('A release QA não corresponde ao SHA explícito.')
    return verified.release
  }
  return createStudioRuntimeRelease({
    manifestVersion: 1,
    profileId: 'python-probe',
    releaseId: 'probe-1',
    programmingLanguage: 'python',
    kinds: ['classic', 'pro'],
    modes: ['blocks', 'bridge', 'code'],
    // Mirrors the publish+assist candidate (python-browser/2026-10-21-audio-2): the editor,
    // public-play and Zappy proofs exercise publication and assistance, which now require
    // the release to declare them.
    capabilities: ['edit', 'export-source', 'execute', 'python-repl', 'publish', 'assist'],
    extensions: [
      { id: TURTLE_EXTENSION.id, versions: [TURTLE_EXTENSION.version] },
      { id: PGZERO_EXTENSION.id, versions: [PGZERO_EXTENSION.version] },
      { id: PYGAME_EXTENSION.id, versions: [PYGAME_EXTENSION.version] },
      { id: RAYLIB_2D_EXTENSION.id, versions: [RAYLIB_2D_EXTENSION.version] },
      { id: RAYLIB_3D_EXTENSION.id, versions: [RAYLIB_3D_EXTENSION.version] },
    ],
    sourceTargets: ['browser', 'desktop'],
    requiredBrowserFeatures: ['wasm', 'worker', 'jspi', 'trusted-types'],
    artifacts: distribution.manifest.files.map(({ path, sha256 }) => ({ path, sha256 })),
    python: {
      version: distribution.manifest.pythonVersion,
      packages: [],
      providedModules: distribution.manifest.providedModules,
      features: distribution.manifest.features,
    },
  })
}
const release = await prepareRelease()
const deployment = { release, distribution: distribution.manifest }
async function qualifiedProject(name: string) {
  const project = await runtimeFixtureProject(name)
  project.runtime = {
    profileId: release.profileId,
    releaseId: release.releaseId,
    manifestSha256: release.manifestSha256,
  }
  project.python.dependencyLock.runtimeManifestSha256 = release.manifestSha256
  return project
}
async function qualifiedFixture(name: string) {
  const snapshot = await preparePythonExecutionSnapshot(await qualifiedProject(name))
  return {
    ...snapshot,
    files: snapshot.files.map(({ bytes, ...file }) => ({ ...file, bytes: [...bytes] })),
  }
}
const stored = new Map<string, { bytes: Uint8Array<ArrayBuffer>; hash: ArrayBuffer }>()
const bucket: RuntimeDistributionBucket = {
  async put(key, input, options) {
    if (options.onlyIf.etagDoesNotMatch === '*' && stored.has(key)) return null
    const bytes = new Uint8Array(input)
    const hash = await crypto.subtle.digest('SHA-256', bytes)
    if (createHash('sha256').update(bytes).digest('hex') !== options.sha256)
      throw new Error('Storage checksum mismatch')
    stored.set(key, { bytes, hash })
    return { etag: options.sha256 }
  },
  async get(key) {
    const object = stored.get(key)
    return object
      ? {
          body: new Blob([object.bytes]).stream(),
          size: object.bytes.length,
          checksums: { sha256: object.hash },
        }
      : null
  },
}
await storePythonRuntimeDistribution({
  bucket,
  deployment,
  read: async (path) =>
    new Uint8Array(await Bun.file(resolve(distribution.directory, path)).arrayBuffer()),
})
const serveDistribution = await createPythonDistributionServer({
  approvedDeployments: [deployment],
  parentOrigins: [
    `http://127.0.0.1:${hostPort}`,
    ...(process.env.PYTHON_PROBE_EDITOR === '1' ? ['http://127.0.0.1:5298'] : []),
    ...extraParentOrigins,
  ],
  status: () => 'active',
})
const frame = await Bun.build({
  entrypoints: [resolve(import.meta.dirname, 'frame.ts')],
  target: 'browser',
  format: 'esm',
})
if (!frame.success || frame.outputs.length !== 1)
  throw new AggregateError(frame.logs, 'Probe build failed')
const frameSource = await frame.outputs[0]!.text()
const hostBuild = await Bun.build({
  entrypoints: [resolve(import.meta.dirname, 'host.ts')],
  target: 'browser',
  format: 'esm',
})
if (!hostBuild.success || hostBuild.outputs.length !== 1)
  throw new AggregateError(hostBuild.logs, 'Host probe build failed')
const hostSource = await hostBuild.outputs[0]!.text()
const rawHostBuild = await Bun.build({
  entrypoints: [resolve(import.meta.dirname, 'rawHost.ts')],
  target: 'browser',
  format: 'esm',
})
if (!rawHostBuild.success || rawHostBuild.outputs.length !== 1)
  throw new AggregateError(rawHostBuild.logs, 'Raw host probe build failed')
const rawHostSource = await rawHostBuild.outputs[0]!.text()
const providerHostBuild = await Bun.build({
  entrypoints: [resolve(import.meta.dirname, 'providerHost.ts')],
  target: 'browser',
  format: 'esm',
})
if (!providerHostBuild.success || providerHostBuild.outputs.length !== 1)
  throw new AggregateError(providerHostBuild.logs, 'Provider host probe build failed')
const providerHostSource = await providerHostBuild.outputs[0]!.text()
const analysisBuild = await Bun.build({
  entrypoints: [resolve(import.meta.dirname, 'analysisHost.ts')],
  target: 'browser',
  format: 'esm',
})
if (!analysisBuild.success || analysisBuild.outputs.length !== 1)
  throw new AggregateError(analysisBuild.logs, 'Analysis host build failed')
const analysisHostSource = await analysisBuild.outputs[0]!.text()
const lessonBuild = await Bun.build({
  entrypoints: [
    resolve(import.meta.dirname, '../../packages/studio/e2e-runtime/fixtures/lessonHost.tsx'),
  ],
  target: 'browser',
  format: 'esm',
})
if (!lessonBuild.success || lessonBuild.outputs.length !== 1)
  throw new AggregateError(lessonBuild.logs, 'Lesson host build failed')
const lessonHostSource = await lessonBuild.outputs[0]!.text()
const artifactPaths = new Set(distribution.manifest.files.map((file) => file.path))
const bootRequests = new Map(
  ['pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'].map((name) => [name, 0]),
)
const network =
  process.env.PYTHON_PROBE_NETWORK === 'reference' ? createRuntimeNetworkProfile() : undefined
// Qualification evidence records only cookie presence, never cookie values or project bytes.
const runtimePrivacy: { path: string; hasCookie: boolean }[] = []
let runtimePrivacyOverflow = false
const runtime = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const url = new URL(request.url)
    if (runtimePrivacy.length < 4096)
      runtimePrivacy.push({ path: url.pathname, hasCookie: request.headers.has('cookie') })
    else runtimePrivacyOverflow = true
    if (
      url.pathname.startsWith('/v1/runtimes/') ||
      url.pathname.startsWith('/v1/runtime-deployments/')
    ) {
      const name = url.pathname.slice(studioPythonRuntimeRoute(release.manifestSha256).length)
      if (
        request.method === 'GET' &&
        url.pathname.startsWith(studioPythonRuntimeRoute(release.manifestSha256)) &&
        bootRequests.has(name)
      )
        bootRequests.set(name, (bootRequests.get(name) ?? 0) + 1)
      const response = await serveDistribution(request, bucket)
      return network ? network.shape(response) : response
    }
    const base = `${url.origin}/runtime/`
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    }
    if (url.pathname === '/frame')
      return new Response(
        '<!doctype html><meta charset="utf-8"><title>Python worker integration probe</title><script type="module" src="/runtime/probe.mjs"></script>',
        {
          headers: {
            ...headers,
            'Content-Type': 'text/html',
            'Content-Security-Policy': [
              "default-src 'none'",
              'sandbox allow-scripts',
              "base-uri 'none'",
              "object-src 'none'",
              "form-action 'none'",
              `script-src 'wasm-unsafe-eval' ${base}`,
              `connect-src data: blob: ${base} ${url.origin}/fixture/`,
              `worker-src blob: ${base}`,
              "require-trusted-types-for 'script'",
              'trusted-types sz-python-bootstrap',
            ].join('; '),
          },
        },
      )
    if (url.pathname.startsWith('/fixture/')) {
      try {
        return Response.json(await qualifiedFixture(url.pathname.slice('/fixture/'.length)), {
          headers,
        })
      } catch {
        return new Response('Unknown fixture', { status: 404, headers })
      }
    }
    if (url.pathname === '/runtime/probe.mjs')
      return new Response(frameSource, {
        headers: { ...headers, 'Content-Type': 'text/javascript' },
      })
    const path = url.pathname.slice('/runtime/'.length)
    if (!url.pathname.startsWith('/runtime/') || !artifactPaths.has(path))
      return new Response('Not found', { status: 404 })
    const type = path.endsWith('.mjs')
      ? 'text/javascript'
      : path.endsWith('.wasm')
        ? 'application/wasm'
        : path.endsWith('.json')
          ? 'application/json'
          : path.endsWith('.html')
            ? 'text/html'
            : 'application/octet-stream'
    const artifact = stored.get(`${studioPythonRuntimePrefix(release.manifestSha256)}files/${path}`)
    if (!artifact) return new Response('Not found', { status: 404 })
    return new Response(new Uint8Array(artifact.bytes), {
      headers: {
        ...headers,
        'Content-Type': type,
        ...(path === 'frame.html'
          ? { 'Content-Security-Policy': pythonFrameContentSecurityPolicy(base) }
          : {}),
      },
    })
  },
})
const languageProbe =
  process.env.PYTHON_PROBE_EDITOR === '1'
    ? (await import('./languageService')).createEditorLanguageProbe()
    : undefined
const lessonProbe = await (await import('./lessonService')).createLessonRuntimeProbe(
  release,
  runtime.url.origin,
)
const publicProbe =
  process.env.PYTHON_PROBE_EDITOR === '1'
    ? await (await import('./publicService')).createPublicRuntimeProbe(
        release,
        runtime.url.origin,
        `http://127.0.0.1:${hostPort}`,
      )
    : undefined
const inspectionProbe = await createPythonInspectionProbe(release, runtime.url.origin)
const host = Bun.serve({
  hostname: '127.0.0.1',
  port: hostPort,
  async fetch(request) {
    if (new URL(request.url).pathname.startsWith('/inspection-probe/'))
      return inspectionProbe(request)
    const path = new URL(request.url).pathname
    if (
      publicProbe &&
      (path.startsWith('/public-probe/') ||
        path === '/v1/publications' ||
        path === '/api/studio/public-runtime' ||
        path === '/api/studio/publish-standalone' ||
        path === '/api/studio/publication' ||
        path.startsWith('/api/studio/play/'))
    ) {
      const response = await publicProbe.fetch(request)
      if (response) return response
    }
    if (
      path.startsWith('/free-probe/') ||
      path === '/api/studio/free-options' ||
      path === '/api/studio/free-runtime'
    ) {
      const response = await lessonProbe.free.fetch(request)
      if (response) return response
    }
    if (
      path.startsWith('/live-probe/') ||
      path.startsWith('/api/live/') ||
      path.startsWith('/api/admin/live/')
    ) {
      const response = await lessonProbe.live.fetch(request)
      if (response) return response
    }
    if (path.startsWith('/authoring-probe/') || path === '/api/members/studio/authoring-runtime') {
      const response = await lessonProbe.authoring.fetch(request)
      if (response) return response
    }
    if (path.startsWith('/lesson-probe/') || path.startsWith('/api/members/lessons/')) {
      const response = await lessonProbe.fetch(request)
      if (response) return response
    }
    if (path === '/lesson-host.mjs')
      return new Response(lessonHostSource, { headers: { 'Content-Type': 'text/javascript' } })
    if (path === '/lesson-probe')
      return new Response(
        '<!doctype html><meta charset="utf-8"><title>Lesson runtime probe</title><body><script type="module" src="/lesson-host.mjs"></script>',
        { headers: { 'Content-Type': 'text/html' } },
      )
    if (languageProbe && path.startsWith('/api/studio/python-language'))
      return languageProbe.fetch(request)
    if (path === '/network') return Response.json(network?.snapshot() ?? null)
    if (path === '/runtime-privacy') {
      if (request.method === 'POST') {
        runtimePrivacy.length = 0
        runtimePrivacyOverflow = false
      }
      return Response.json({ requests: runtimePrivacy, overflow: runtimePrivacyOverflow })
    }
    if (path === '/boot-resources') return Response.json(Object.fromEntries(bootRequests))
    if (path === '/distribution')
      return Response.json({
        hash: distribution.hash,
        manifest: distribution.manifest,
        release,
        providerHostSha256: createHash('sha256').update(providerHostSource).digest('hex'),
        storagePrefix: studioPythonRuntimePrefix(release.manifestSha256),
      })
    if (path === '/configuration')
      return Response.json({
        frameURL: `${runtime.url.origin}/runtime/frame.html`,
        rawFrameURL: `${runtime.url.origin}/frame`,
        providerFrameURL: `${runtime.url.origin}${studioPythonRuntimeRoute(release.manifestSha256)}frame.html`,
        runtime: {
          profileId: release.profileId,
          releaseId: release.releaseId,
          manifestSha256: release.manifestSha256,
        },
      })
    if (path === '/host.mjs')
      return new Response(hostSource, { headers: { 'Content-Type': 'text/javascript' } })
    if (path === '/raw-host.mjs')
      return new Response(rawHostSource, { headers: { 'Content-Type': 'text/javascript' } })
    if (path === '/provider-host.mjs')
      return new Response(providerHostSource, { headers: { 'Content-Type': 'text/javascript' } })
    if (path === '/analysis-host.mjs')
      return new Response(analysisHostSource, { headers: { 'Content-Type': 'text/javascript' } })
    if (path === '/analysis')
      return new Response(
        '<!doctype html><meta charset="utf-8"><title>Python analysis probe</title><body><script type="module" src="/analysis-host.mjs"></script>',
        { headers: { 'Content-Type': 'text/html' } },
      )
    if (path.startsWith('/project/')) {
      try {
        return Response.json(await qualifiedProject(path.slice('/project/'.length)))
      } catch {
        return new Response('Unknown fixture', { status: 404 })
      }
    }
    if (path === '/provider')
      return new Response(
        '<!doctype html><meta charset="utf-8"><title>Python provider probe</title><body><script type="module" src="/provider-host.mjs"></script>',
        { headers: { 'Content-Type': 'text/html' } },
      )
    if (path.startsWith('/fixture/')) {
      try {
        return Response.json(await qualifiedFixture(path.slice('/fixture/'.length)))
      } catch {
        return new Response('Unknown fixture', { status: 404 })
      }
    }
    if (path === '/supervisor')
      return new Response(
        '<!doctype html><meta charset="utf-8"><title>Python supervisor probe</title><body><script type="module" src="/host.mjs"></script>',
        { headers: { 'Content-Type': 'text/html' } },
      )
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Python integration probe</title><script type="module" src="/raw-host.mjs"></script>',
      { headers: { 'Content-Type': 'text/html' } },
    )
  },
})
console.log(JSON.stringify({ url: host.url.origin, distribution: distribution.hash }))
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    languageProbe?.dispose()
    host.stop(true)
    runtime.stop(true)
    process.exit(0)
  })
