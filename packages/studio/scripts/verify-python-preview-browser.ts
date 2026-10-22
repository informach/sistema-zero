import assert from 'node:assert/strict'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { studioPythonExecutionRevision } from '@sistemazero/core/studio/python-execution-content'
import { StudioPythonPlaytestRecipeSchema } from '@sistemazero/core/studio/python-playtest'
import { STUDIO_PYTHON_PREVIEW_SANDBOX } from '@sistemazero/core/studio/python-preview-bridge'
import { pythonFrameContentSecurityPolicy } from '@sistemazero/core/studio/python-runtime-policy'
import { verifyStudioPythonValidationReport } from '@sistemazero/core/studio/python-validation'
import { createStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import { sha256 } from '../../studio-runtime/src/artifacts'
import {
  createPythonDistributionRegistry,
  storePythonRuntimeDistribution,
} from '../../studio-runtime/src/python-distributions'
import { servePythonPreview, storePythonPreview } from '../../studio-runtime/src/python-previews'
import { pythonInputFixture } from '../../studio-runtime/tests/python-input-fixture'
import { buildPythonRuntimeDistribution } from './build-python-runtime'

// Real Node/Chromium CPython evidence + real HTTP/CSP in installed Chrome/Edge.
// In-memory storage/availability ports do not qualify the production DO, SDK or remote deployment.
const root = path.resolve(import.meta.dirname, '../../..')
const evidence = path.join(root, '.cache/studio-python-l0/preview-browser', crypto.randomUUID())
await mkdir(evidence, { recursive: true })
console.info('preview-browser evidence', evidence)
const build = await buildPythonRuntimeDistribution()
const release = await createStudioRuntimeRelease({
  manifestVersion: 1,
  profileId: 'python-preview-verify',
  releaseId: 'verify-1',
  programmingLanguage: 'python',
  kinds: ['classic', 'pro'],
  modes: ['blocks', 'bridge', 'code'],
  capabilities: ['execute'],
  extensions: [{ id: 'python-turtle', versions: ['1.0.0'] }],
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
const files = new Map<string, Uint8Array<ArrayBuffer>>([
  [
    'main.py',
    new TextEncoder().encode(
      [
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
      ].join('\n'),
    ),
  ],
  [
    'hero.png',
    Uint8Array.from(
      atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
      ),
      (char) => char.charCodeAt(0),
    ),
  ],
  [
    'injected.html',
    new TextEncoder().encode(
      '<script>parent.attacked=true;fetch("https://external.invalid/")</script>',
    ),
  ],
  [
    'injected.js',
    new TextEncoder().encode('globalThis.attacked = true; fetch("https://external.invalid/")'),
  ],
  [
    'injected.svg',
    new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="parent.attacked=true"></svg>',
    ),
  ],
])
const content = {
  version: 1,
  configuration: {
    runtime: {
      profileId: release.profileId,
      releaseId: release.releaseId,
      manifestSha256: release.manifestSha256,
    },
    extensions: [{ id: 'python-turtle', version: '1.0.0' }],
    python: {
      entrypoint: 'main.py',
      dependencyLock: {
        lockVersion: 1,
        target: 'browser',
        pythonVersion: build.manifest.pythonVersion,
        runtimeManifestSha256: release.manifestSha256,
        requirementsSha256: await sha256(new Uint8Array(0)),
        packages: [],
      },
    },
  },
  directories: [],
  files: await Promise.all(
    [...files].map(async ([filePath, bytes]) => ({
      path: filePath,
      kind: filePath.endsWith('.png') ? 'asset' : 'source',
      sha256: await sha256(bytes),
      byteLength: bytes.byteLength,
    })),
  ),
}
const snapshot = {
  ...content,
  projectId: 'preview-turtle',
  revision: await studioPythonExecutionRevision(content),
}
const recipe = StudioPythonPlaytestRecipeSchema.parse({
  version: 1,
  stdin: ['Lia'],
  keys: ['Space'],
  clicks: [{ x: 0.25, y: 0.25 }],
  requireGraphics: true,
})
await mkdir(path.join(evidence, 'runtime'), { recursive: true })
await mkdir(path.join(evidence, 'project'), { recursive: true })
for (const file of build.manifest.files) {
  const target = path.join(evidence, 'runtime', file.path)
  await mkdir(path.dirname(target), { recursive: true })
  await copyFile(path.join(build.directory, file.path), target)
}
for (const [file, bytes] of files) await writeFile(path.join(evidence, 'project', file), bytes)
const commonOptions = {
  version: 1,
  runtimeManifestSha256: release.manifestSha256,
  runtimeFiles: build.manifest.files,
  runtimeContentSecurityPolicy: pythonFrameContentSecurityPolicy(
    `https://studio-python-runtime.invalid/v1/runtimes/${release.manifestSha256}/`,
  ),
  payload: { version: 1, name: 'Preview Turtle', snapshot },
}
await writeFile(
  path.join(evidence, 'python-inspection-options.json'),
  JSON.stringify({ ...commonOptions, structure: true }),
)
await writeFile(
  path.join(evidence, 'python-playtest-options.json'),
  JSON.stringify({ ...commonOptions, recipe }),
)
for (const phase of ['inspect', 'playtest']) {
  console.info('preview-browser native phase', phase)
  const child = Bun.spawn(
    ['node', path.join(root, 'packages/studio-runtime/runtime', `python-${phase}.mjs`)],
    { cwd: evidence, windowsHide: true, stdout: 'pipe', stderr: 'pipe' },
  )
  const timer = setTimeout(() => child.kill(), 120_000)
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    await writeFile(
      path.join(evidence, `native-${phase}.json`),
      JSON.stringify({ exit, stdout, stderr }),
    )
    assert.equal(exit, 0, stdout + stderr)
  } finally {
    clearTimeout(timer)
    if (child.exitCode === null) child.kill()
  }
}
const report = await verifyStudioPythonValidationReport(
  {
    version: 1,
    projectId: snapshot.projectId,
    recipe,
    status: 'passed',
    inspection: JSON.parse(
      await readFile(path.join(evidence, 'python-inspection-result.json'), 'utf8'),
    ),
    execution: JSON.parse(
      await readFile(path.join(evidence, 'python-playtest-result.json'), 'utf8'),
    ),
  },
  snapshot,
  recipe,
  true,
)
assert.ok(report.execution?.capture)
const captureBytes = new Uint8Array(
  await readFile(path.join(evidence, report.execution.capture.path)),
)
const runtimeStore = await pythonInputFixture(),
  previewStore = await pythonInputFixture()
runtimeStore.setTime(Date.now())
const input = await runtimeStore.store.open(
  { ...runtimeStore.request, snapshot },
  runtimeStore.controller.signal,
)
let previewURL = '',
  available = false,
  serviceOrigin = ''
const app = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch(request) {
    const opaque = new URL(request.url).pathname === '/opaque'
    const session = crypto.randomUUID(),
      target = new URL(previewURL)
    target.hash = new URLSearchParams({ 'studio-preview-session': session }).toString()
    return new Response(
      `<html><body><iframe id="preview" style="width:100%;height:800px" sandbox="${opaque ? 'allow-scripts' : STUDIO_PYTHON_PREVIEW_SANDBOX}" src="${target.href}"></iframe><script>window.previewMessages=[];window.ignoredPreviewMessages=0;window.addEventListener('message',event=>{if(event.data?.type!=='studio-python-preview')return;if(event.source===document.querySelector('#preview').contentWindow&&event.origin===${JSON.stringify(serviceOrigin)})window.previewMessages.push(event.data);else window.ignoredPreviewMessages++})</script></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  },
})
const unknown = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch(request) {
    const nested = new URL(request.url).pathname === '/nested'
    return new Response(`<iframe src="${nested ? app.url.href : previewURL}"></iframe>`, {
      headers: { 'Content-Type': 'text/html' },
    })
  },
})
const registry = await createPythonDistributionRegistry({
  approvedDeployments: [{ release, distribution: build.manifest }],
  parentOrigins: [app.url.origin],
  status: () => 'active',
})
const runtimeBucket = {
  get: runtimeStore.bucket.get,
  put: (key: string, bytes: Uint8Array, options: { sha256: string }) =>
    runtimeStore.bucket.put(key, bytes, {
      sha256: options.sha256,
      onlyIf: { etagDoesNotMatch: '*' },
    }),
}
await storePythonRuntimeDistribution({
  bucket: runtimeBucket,
  deployment: { release, distribution: build.manifest },
  read: async (file) => new Uint8Array(await readFile(path.join(build.directory, file))),
})
const service = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request): Promise<Response> {
    if (new URL(request.url).pathname.startsWith('/v1/python-previews/'))
      return servePythonPreview(request, {
        bucket: previewStore.bucket,
        runtimeBucket,
        registry,
        serviceOrigin: service.url.origin,
        assertCurrent() {},
        async authorize() {
          return available
        },
      })
    return registry.serve(request, runtimeBucket)
  },
})
serviceOrigin = service.url.origin
try {
  const previewOptions = {
    bucket: previewStore.bucket,
    runtimeBucket,
    registry,
    serviceOrigin: service.url.origin,
    preview: { parentOrigin: app.url.origin },
    snapshot,
    input,
    report,
    captureBytes,
    validation: { profileVersion: 1 as const, runtimeFingerprint: 'e'.repeat(64) },
    signal: new AbortController().signal,
    assertCurrent() {},
    async readProject(file: string) {
      const bytes = files.get(file)
      if (!bytes) throw new Error('Missing project bytes')
      return new Blob([bytes]).stream()
    },
  }
  const ref = await storePythonPreview(previewOptions)
  // A second storage-only artifact makes the cross-prefix CSP test observable.
  // Production's immutable job admission does not execute or build a second preview.
  const other = await storePythonPreview(previewOptions)
  previewURL = ref.url
  assert.equal(
    (await fetch(previewURL)).status,
    404,
    'Storage completion must not grant availability',
  )
  available = true
  await writeFile(path.join(evidence, 'preview-reference.json'), JSON.stringify(ref))
  // Archive the actual producer output capture and all small preview bytes for independent hashing.
  for (const [key, object] of previewStore.objects) {
    const target = path.join(evidence, 'stored', key)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, object.bytes)
  }
  const configuration = path.join(evidence, 'browser-options.json')
  await writeFile(
    configuration,
    JSON.stringify({
      evidence,
      snapshot,
      runtime: release.manifestSha256,
      appOrigin: app.url.origin,
      serviceOrigin: service.url.origin,
      unknownOrigin: unknown.url.origin,
      previewURL: ref.url,
      otherPreviewURL: other.url,
    }),
  )
  const child = Bun.spawn(
    ['node', path.join(import.meta.dirname, 'python-preview-browser.mjs'), configuration],
    {
      cwd: root,
      windowsHide: true,
      stdout: 'inherit',
      stderr: 'inherit',
    },
  )
  const timer = setTimeout(() => child.kill(), 180_000)
  try {
    assert.equal(await child.exited, 0, 'Native browser proof failed')
  } finally {
    clearTimeout(timer)
    if (child.exitCode === null) child.kill()
  }
  available = false
  assert.equal((await fetch(ref.url)).status, 404)
} finally {
  app.stop(true)
  unknown.stop(true)
  service.stop(true)
}
