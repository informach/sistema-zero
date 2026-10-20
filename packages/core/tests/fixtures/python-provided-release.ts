import { readFileSync } from 'node:fs'
import { buildPythonProvidedModuleMetadata } from '../../src/studio/python-provided-modules-render'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from '../../src/studio/python-provided-modules-sz-audio'
import { StudioPythonRuntimeConfigurationSchema } from '../../src/studio/python-runtime-distribution'
import { createStudioRuntimeRelease } from '../../src/studio/runtime-catalog'

export function legacyPythonRelease() {
  return StudioPythonRuntimeConfigurationSchema.parse(
    JSON.parse(
      readFileSync(new URL('./python-runtime-legacy-2026-10-19.json', import.meta.url), 'utf8'),
    ),
  ).deployments[0]!.deployment.release
}
export async function providedPythonRelease() {
  const original = legacyPythonRelease()
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
