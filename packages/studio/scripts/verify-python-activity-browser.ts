import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pythonFrameContentSecurityPolicy } from '@sistemazero/core/studio/python-runtime-policy'
import { createStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import { buildPythonRuntimeDistribution } from './build-python-runtime'
import { createSectionBrowserAuthority } from './fixtures/python-section-authority'

// Real browser/runtime/frame/worker proof. This does not exercise Members authorization or SDK.
const root = path.resolve(import.meta.dirname, '../../..')
const sections = process.argv.includes('--sections')
const evidence = path.join(
  root,
  `.cache/studio-python-l0/${sections ? 'section' : 'activity'}-browser`,
  crypto.randomUUID(),
)
await mkdir(evidence, { recursive: true })
console.info('activity-browser evidence', evidence)
const build = await buildPythonRuntimeDistribution({
  standardLibrary: JSON.parse(
    await readFile(path.join(root, '.cache/studio-python-runtime/stdlib-recipe.json'), 'utf8'),
  ),
})
const release = await createStudioRuntimeRelease({
  manifestVersion: 1,
  profileId: 'python-activity-verify',
  releaseId: 'verify-1',
  programmingLanguage: 'python',
  kinds: ['classic', 'pro'],
  modes: ['blocks', 'bridge', 'code'],
  capabilities: ['edit', 'execute'],
  extensions: [{ id: 'python-turtle', versions: ['1.0.0'] }],
  sourceTargets: ['browser', 'desktop'],
  requiredBrowserFeatures: ['wasm', 'worker', 'jspi', 'trusted-types'],
  artifacts: build.manifest.files.map(({ path, sha256 }) => ({ path, sha256 })),
  python: {
    version: build.manifest.pythonVersion,
    packages: [],
    ...(build.manifest.providedModules === undefined
      ? {}
      : { providedModules: build.manifest.providedModules }),
  },
})
const bundle = await Bun.build({
  entrypoints: [
    path.join(
      import.meta.dirname,
      `fixtures/python-${sections ? 'section' : 'activity'}-browser.ts`,
    ),
  ],
  target: 'browser',
  format: 'esm',
  splitting: false,
})
assert.equal(bundle.success, true, String(bundle.logs))
assert.equal(bundle.outputs.length, 1)
const script = await bundle.outputs[0]!.text()
const assets = new Map<string, Uint8Array<ArrayBuffer>>()
for (const file of build.manifest.files)
  assets.set(file.path, new Uint8Array(await readFile(path.join(build.directory, file.path))))
const service = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request): Promise<Response> {
    const url = new URL(request.url)
    const prefix = `/v1/runtimes/${release.manifestSha256}/`
    if (!url.pathname.startsWith(prefix) || url.search || !['GET', 'HEAD'].includes(request.method))
      return new Response(null, { status: 404 })
    const file = url.pathname.slice(prefix.length)
    const bytes = assets.get(file)
    if (!bytes) return new Response(null, { status: 404 })
    const contentType = file.endsWith('.html')
      ? 'text/html'
      : file.endsWith('.mjs')
        ? 'text/javascript'
        : file.endsWith('.wasm')
          ? 'application/wasm'
          : 'application/octet-stream'
    const headers = new Headers({
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    })
    if (file === 'frame.html' || file === 'analysis.html')
      headers.set(
        'Content-Security-Policy',
        pythonFrameContentSecurityPolicy(new URL(prefix, service.url).href),
      )
    return new Response(request.method === 'HEAD' ? null : bytes, { headers })
  },
})
const sectionAuthority = sections
  ? await createSectionBrowserAuthority(release, service.url.origin)
  : undefined
const app = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const pathname = new URL(request.url).pathname
    if (pathname === '/')
      return new Response(
        '<!doctype html><html><body><script type="module" src="/proof.mjs"></script></body></html>',
        { headers: { 'Content-Type': 'text/html' } },
      )
    if (pathname === '/proof.mjs')
      return new Response(script, { headers: { 'Content-Type': 'text/javascript' } })
    if (sectionAuthority && pathname === '/api/members/studio/authoring-runtime')
      return sectionAuthority.handle(request)
    if (pathname === '/configuration.json')
      return Response.json({
        release,
        selection: {
          profileId: release.manifest.profileId,
          releaseId: release.manifest.releaseId,
          manifestSha256: release.manifestSha256,
        },
        frameURL: new URL(`/v1/runtimes/${release.manifestSha256}/frame.html`, service.url).href,
        ...(sectionAuthority ? { authoring: sectionAuthority.configuration } : {}),
      })
    return new Response(null, { status: 404 })
  },
})
try {
  await writeFile(path.join(evidence, 'runtime-release.json'), JSON.stringify(release))
  await writeFile(path.join(evidence, 'distribution-manifest.json'), JSON.stringify(build.manifest))
  const configuration = path.join(evidence, 'browser-options.json')
  await writeFile(
    configuration,
    JSON.stringify({ evidence, appOrigin: app.url.origin, serviceOrigin: service.url.origin }),
  )
  const child = Bun.spawn(
    [
      'node',
      path.join(import.meta.dirname, `python-${sections ? 'section' : 'activity'}-browser.mjs`),
      configuration,
    ],
    { cwd: root, windowsHide: true, stdout: 'inherit', stderr: 'inherit' },
  )
  const timer = setTimeout(() => child.kill(), 240_000)
  try {
    assert.equal(await child.exited, 0, 'Native browser activity proof failed')
  } finally {
    clearTimeout(timer)
    if (child.exitCode === null) child.kill()
  }
} finally {
  if (sectionAuthority)
    await writeFile(
      path.join(evidence, 'authoring-requests.json'),
      JSON.stringify(sectionAuthority.requests),
    )
  app.stop(true)
  service.stop(true)
}
