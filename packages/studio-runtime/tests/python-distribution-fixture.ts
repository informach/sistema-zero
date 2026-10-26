import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import {
  StudioPythonDistributionSchema,
  studioPythonRuntimePrefix,
  studioPythonRuntimeRoute,
} from '@sistemazero/core/studio/python-runtime-distribution'
import { PYTHON_PROJECT_MISSION_FEATURE } from '@sistemazero/core/studio/python-runtime-features'
import {
  createStudioRuntimeRelease,
  type StudioRuntimeReleaseStatus,
} from '@sistemazero/core/studio/runtime-catalog'
import { PYGAME_CE_WHEEL } from '../../studio/src/runtime/python/pygame/contract'
import { sha256 } from '../src/artifacts'
import {
  createPythonDistributionServer,
  type RuntimeDistributionBucket,
  storePythonRuntimeDistribution,
} from '../src/python-distributions'

/** The stand-in wheel the promotion fixtures write (`<prefix><name>`): its own size and sha. */
export function fixturePygameWheel(prefix = 'fixture:') {
  const bytes = new TextEncoder().encode(`${prefix}${PYGAME_CE_WHEEL.file}`)
  return { bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') }
}

export async function pythonDistributionFixture(
  options: {
    playtest?: boolean
    standalone?: boolean
    boot?: boolean
    compressed?: boolean
    missions?: boolean
  } = {},
) {
  const contents = new Map<string, Uint8Array<ArrayBuffer>>()
  for (const path of [
    'frame.html',
    'analysis.html',
    'inspect.mjs',
    ...(options.playtest ? ['playtest.mjs'] : []),
    ...(options.standalone ? ['standalone.mjs'] : []),
    ...(options.boot ? ['boot-reader.mjs'] : []),
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
  ])
    contents.set(path, new TextEncoder().encode(`fixture:${path}`))
  // Synthetic storage-contract fixture, never native launcher qualification.
  if (options.standalone)
    contents.set('standalone.mjs', new TextEncoder().encode('fixture:standalone:host-audio-v1'))
  const httpRepresentations: { path: string; encoding: 'gzip'; artifactPath: string }[] = []
  if (options.compressed) {
    const bytes = new Uint8Array(gzipSync(contents.get('frame.mjs')!))
    const artifactPath = `_http/gzip/${await sha256(bytes)}.gz`
    contents.set(artifactPath, bytes)
    httpRepresentations.push({ path: 'frame.mjs', encoding: 'gzip', artifactPath })
  }
  const distribution = StudioPythonDistributionSchema.parse({
    version: 1,
    pyodideVersion: '314.0.7',
    pythonVersion: '3.14.2',
    providedModules: [],
    features: options.missions === false ? [] : [PYTHON_PROJECT_MISSION_FEATURE],
    previewHostAudioVersion: 1,
    ...(httpRepresentations.length ? { httpRepresentations } : {}),
    files: await Promise.all(
      [...contents].map(async ([path, bytes]) => ({
        path,
        bytes: bytes.byteLength,
        sha256: await sha256(bytes),
      })),
    ),
  })
  const release = await createStudioRuntimeRelease({
    manifestVersion: 1,
    profileId: 'python-fixture',
    releaseId: 'fixture-1',
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
      providedModules: [],
      features: distribution.features,
    },
  })
  const deployment = { release, distribution }
  const objects = new Map<string, { bytes: Uint8Array<ArrayBuffer>; hash?: ArrayBuffer }>()
  let puts = 0
  let reads = 0
  let cancellations = 0
  const bucket: RuntimeDistributionBucket = {
    async get(key) {
      reads++
      const object = objects.get(key)
      if (!object) return null
      return {
        size: object.bytes.length,
        checksums: { sha256: object.hash },
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(object.bytes))
          },
          pull(controller) {
            controller.close()
          },
          cancel() {
            cancellations++
          },
        }),
      }
    },
    async put(key, bytes, options) {
      if (options.onlyIf.etagDoesNotMatch === '*' && objects.has(key)) return null
      const copy = new Uint8Array(bytes)
      if ((await sha256(copy)) !== options.sha256) throw new Error('Storage checksum mismatch')
      objects.set(key, { bytes: copy, hash: await crypto.subtle.digest('SHA-256', copy) })
      puts++
      return { etag: `object-${puts}` }
    },
  }
  let status: StudioRuntimeReleaseStatus | undefined = 'active'
  const serve = await createPythonDistributionServer({
    approvedDeployments: [deployment],
    parentOrigins: ['https://app.example', 'https://play.example'],
    status: () => status,
  })
  const prefix = studioPythonRuntimePrefix(release.manifestSha256)
  const url = `https://runtime.example${studioPythonRuntimeRoute(release.manifestSha256)}`
  const store = (read = async (path: string) => contents.get(path)!) =>
    storePythonRuntimeDistribution({ bucket, deployment, read })
  return {
    deployment,
    contents,
    objects,
    bucket,
    prefix,
    url,
    serve,
    store,
    status: (value: typeof status) => {
      status = value
    },
    counts: () => ({ puts, reads, cancellations }),
  }
}
