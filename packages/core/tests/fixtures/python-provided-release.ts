import { createHash } from 'node:crypto'
import { buildPythonProvidedModuleMetadata } from '../../src/studio/python-provided-modules-render'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from '../../src/studio/python-provided-modules-sz-audio'
import { StudioPythonDistributionSchema } from '../../src/studio/python-runtime-distribution'
import { createStudioRuntimeRelease } from '../../src/studio/runtime-catalog'

/** Synthetic current-format bytes for metadata tests; never executable runtime approval. */
export async function currentPythonDeployment() {
  const files = [
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
  ].map((path) => {
    const bytes = Buffer.from(`inert-current-python-fixture:${path}`)
    return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
  })
  const distribution = StudioPythonDistributionSchema.parse({
    version: 1,
    pyodideVersion: '314.0.7',
    pythonVersion: '3.14.2',
    providedModules: [],
    features: [],
    previewHostAudioVersion: 1,
    files,
  })
  const release = await createStudioRuntimeRelease({
    manifestVersion: 1,
    profileId: 'python-metadata-fixture',
    releaseId: 'current-inert',
    programmingLanguage: 'python',
    kinds: ['classic', 'pro'],
    modes: ['blocks', 'bridge', 'code'],
    capabilities: ['edit', 'execute', 'export-source', 'python-repl'],
    extensions: [{ id: 'python-turtle', versions: ['1.0.0'] }],
    sourceTargets: ['browser', 'desktop'],
    requiredBrowserFeatures: ['wasm', 'worker', 'jspi', 'trusted-types'],
    artifacts: files.map(({ path, sha256 }) => ({ path, sha256 })),
    python: {
      version: distribution.pythonVersion,
      packages: [],
      providedModules: [],
      features: [],
    },
  })
  return { release, distribution }
}

export async function currentPythonRelease() {
  return (await currentPythonDeployment()).release
}
export async function providedPythonRelease() {
  const original = await currentPythonRelease()
  const metadata = await buildPythonProvidedModuleMetadata(SZ_AUDIO_MODULE_DESCRIPTOR)
  const descriptorArtifact = {
    path: metadata.descriptorFile.path,
    sha256: metadata.descriptorFile.sha256,
  }
  const typingArtifact = { path: metadata.typingFile.path, sha256: metadata.typingFile.sha256 }
  return createStudioRuntimeRelease({
    ...original.manifest,
    releaseId: 'language-provided-test',
    artifacts: [...original.manifest.artifacts, descriptorArtifact, typingArtifact],
    python: {
      ...original.manifest.python!,
      providedModules: [
        {
          descriptor: metadata.descriptor,
          descriptorArtifact,
          typingArtifact,
          browserArtifacts: [
            original.manifest.artifacts.find((file) => file.path === 'worker.mjs')!,
          ],
        },
      ],
    },
  })
}
