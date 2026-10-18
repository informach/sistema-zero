import { afterAll, afterEach, expect, spyOn, test } from 'bun:test'
import { verifyStudioPythonWebPayload } from '@sistemazero/core/studio/python-execution-content'
import {
  StudioPythonDistributionSchema,
  studioPythonDeploymentRoute,
  studioPythonRuntimeRoute,
} from '@sistemazero/core/studio/python-runtime-distribution'
import {
  createStudioRuntimeCatalog,
  createStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { unzipSync } from 'fflate'
import { pythonWebBytesSha256 } from '../../runtime/python/webFiles'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { exportProject } from '../exportProject'
import { buildPythonWebFiles } from '../pythonWeb'

const request = spyOn(globalThis, 'fetch')
const fetchImplementation = (
  implementation: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>,
) => Object.assign(implementation, { preconnect: globalThis.fetch.preconnect })
afterEach(() => request.mockReset())
afterAll(() => request.mockRestore())

async function fixture(kind: 'classic' | 'pro' = 'classic', launcher = true) {
  const { project, environment } = await pythonEnvironmentFixture(kind)
  const contents = new Map<string, Uint8Array<ArrayBuffer>>()
  for (const path of [
    'frame.html',
    'frame.mjs',
    'worker.mjs',
    'pyodide.mjs',
    'pyodide.asm.mjs',
    'pyodide.asm.wasm',
    'python_stdlib.zip',
    'pyodide-lock.json',
    'LICENSE-pyodide.txt',
    'LICENSE-python.txt',
    'SOURCES.txt',
    ...(launcher ? ['standalone.mjs'] : []),
  ])
    contents.set(path, new TextEncoder().encode(`inert:${path}`))
  const distribution = StudioPythonDistributionSchema.parse({
    version: 1,
    pyodideVersion: '314.0.7',
    pythonVersion: '3.14.2',
    files: await Promise.all(
      [...contents].map(async ([path, bytes]) => ({
        path,
        bytes: bytes.byteLength,
        sha256: await pythonWebBytesSha256(bytes),
      })),
    ),
  })
  const original = environment.catalog.releases[0]!
  const release = await createStudioRuntimeRelease({
    ...original.manifest,
    artifacts: distribution.files.map(({ path, sha256 }) => ({ path, sha256 })),
  })
  project.runtime = {
    profileId: release.profileId,
    releaseId: release.releaseId,
    manifestSha256: release.manifestSha256,
  }
  project.python.dependencyLock.runtimeManifestSha256 = release.manifestSha256
  environment.catalog = await createStudioRuntimeCatalog({
    releases: [release],
    profiles: environment.catalog.profiles.map((profile) => ({
      ...profile,
      releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
    })),
  })
  const host = {
    metadataURL: `https://runtime.test${studioPythonDeploymentRoute(release.manifestSha256)}`,
    directoryURL: `https://runtime.test${studioPythonRuntimeRoute(release.manifestSha256)}`,
  }
  let authorizations = 0
  const revisions: string[] = []
  environment.resolvePythonWebExport = async ({ revision, signal }) => {
    signal.throwIfAborted()
    authorizations++
    revisions.push(revision)
    return { ...host }
  }
  const seen: string[] = []
  request.mockImplementation(
    fetchImplementation(async (input) => {
      const url = String(input)
      seen.push(url)
      if (url === host.metadataURL) return Response.json({ release, distribution })
      const path = url.startsWith(host.directoryURL) ? url.slice(host.directoryURL.length) : ''
      const bytes = contents.get(path)
      return bytes ? new Response(bytes) : new Response('', { status: 404 })
    }),
  )
  return {
    project,
    environment,
    contents,
    distribution,
    release,
    seen,
    revisions,
    host,
    calls: () => authorizations,
  }
}

for (const kind of ['classic', 'pro'] as const)
  test(`Python ${kind}: ZIP preserves author paths and material attribution, with verified runtime and fresh delivery permission`, async () => {
    const f = await fixture(kind)
    if (f.project.kind === 'classic') f.project.files['index.html'] = 'author file'
    else f.project.tree['index.html'] = { kind: 'file', content: 'author file' }
    f.project.assets = [
      {
        id: 'hero',
        name: 'hero',
        kind: 'image',
        source: 'upload',
        proPath: 'hero.gif',
        dataUrl: 'data:image/gif;base64,AAEC/w==',
        license: { name: 'CC0', attribution: 'Aluno' },
      },
    ]
    const result = await exportProject(f.project, { runtimeEnvironment: f.environment })
    expect(result.filename).toEndWith('-web.zip')
    expect(result.kind).toBe(kind)
    const files = unzipSync(new Uint8Array(await result.blob.arrayBuffer()))
    expect(new TextDecoder().decode(files['project/index.html'])).toBe('author file')
    expect(new TextDecoder().decode(files['index.html'])).toContain('id="stage"')
    expect(files['project/hero.gif']).toEqual(new Uint8Array([0, 1, 2, 255]))
    const payload = await verifyStudioPythonWebPayload(
      JSON.parse(new TextDecoder().decode(files['payload.json'])),
    )
    expect(payload.snapshot.projectId).toBe(f.project.id)
    expect(payload.snapshot.configuration.runtime).toEqual(f.project.runtime)
    expect(f.revisions).toEqual([payload.snapshot.revision, payload.snapshot.revision])
    for (const [path, bytes] of f.contents)
      expect(files[`runtime/${f.release.manifestSha256}/${path}`]).toEqual(bytes)
    expect(new TextDecoder().decode(files['asset-attributions.json'])).toContain('CC0')
    expect(new TextDecoder().decode(files['serve.py'])).not.toContain('import turtle')
    expect(new TextDecoder().decode(files['LEIA-ME.txt'])).toContain('file://')
    expect(f.calls()).toBe(2)
  })

test('corrupt runtime bytes or a mismatched release cannot produce a web package', async () => {
  const f = await fixture()
  f.contents.set('frame.mjs', new TextEncoder().encode('corrupt'))
  await expect(
    buildPythonWebFiles(f.project, f.environment, new AbortController().signal),
  ).rejects.toThrow('Integridade')
  const second = await fixture()
  second.distribution.files[0]!.sha256 = 'f'.repeat(64)
  await expect(
    buildPythonWebFiles(second.project, second.environment, new AbortController().signal),
  ).rejects.toThrow('artefatos')
})

test('old runtime without launcher remains valid metadata but cannot pretend to support this export format', async () => {
  const f = await fixture('classic', false)
  await expect(
    buildPythonWebFiles(f.project, f.environment, new AbortController().signal),
  ).rejects.toThrow('não oferece exportação web')
  expect(f.seen).toEqual([f.host.metadataURL])
})

test('private path and known secret are refused before authorization or fetching, without modifying source', async () => {
  for (const [path, source] of [
    ['src/my-secrets.py', 'values = ["private"]'],
    ['safe.py', 'api_key = "sk-private-value-12345"'],
  ]) {
    const f = await fixture()
    if (f.project.kind !== 'classic') throw new Error('fixture')
    f.project.files[path!] = source!
    const before = JSON.stringify(f.project)
    await expect(
      buildPythonWebFiles(f.project, f.environment, new AbortController().signal),
    ).rejects.toThrow(path)
    expect(f.calls()).toBe(0)
    expect(f.seen).toEqual([])
    expect(JSON.stringify(f.project)).toBe(before)
  }
})

test('access revoked after collecting and zipping still prevents delivery', async () => {
  const f = await fixture()
  const resolve = f.environment.resolvePythonWebExport!
  f.environment.resolvePythonWebExport = (input) => {
    if (f.calls() > 0) throw new Error('revogado')
    return resolve(input)
  }
  await expect(exportProject(f.project, { runtimeEnvironment: f.environment })).rejects.toThrow(
    'revogado',
  )
})

test('a valid 200-character project name survives the real ZIP payload without truncation', async () => {
  const f = await fixture()
  f.project.name = 'x'.repeat(200)
  const result = await exportProject(f.project, { runtimeEnvironment: f.environment })
  const files = unzipSync(new Uint8Array(await result.blob.arrayBuffer()))
  const payload = await verifyStudioPythonWebPayload(
    JSON.parse(new TextDecoder().decode(files['payload.json'])),
  )
  expect(payload.name).toBe(f.project.name)
})

test('context cancellation during distribution fetch prevents any further file collection', async () => {
  const f = await fixture()
  const scope = new AbortController()
  const original = request.getMockImplementation()!
  request.mockImplementation(
    fetchImplementation(async (...args) => {
      const response = await original(...args)
      scope.abort(new Error('profile changed'))
      return response
    }),
  )
  await expect(buildPythonWebFiles(f.project, f.environment, scope.signal)).rejects.toThrow(
    'profile changed',
  )
  expect(f.seen).toEqual([f.host.metadataURL])
})
